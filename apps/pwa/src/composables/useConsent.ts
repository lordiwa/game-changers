/**
 * useConsent.ts — Vue composable for LOPDP consent management.
 *
 * Wraps the consentGrant / consentRevoke / dsarExport / accountErasure callables
 * and provides reactive consent state via VueFire collection subscriptions.
 *
 * Key invariant: grant('basic_profile', 0) triggers usePosthog().optIn()
 * as per Pitfall #4 — PostHog must not fire before basic_profile consent.
 */
import { computed, type ComputedRef } from 'vue';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, doc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useCurrentUser } from 'vuefire';
import { firebaseApp } from '../firebase';
import { usePosthog } from './usePosthog';
import type { ConsentCategory, ConsentDoc } from '@gamechangers/shared';

/**
 * SHA-256 hex digest of a UTF-8 string using Web Crypto.
 * Matches functions/consent/src/grant.ts `sha256()` output so the server-side
 * textHash equality check passes (WR-07).
 */
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const functions = getFunctions(firebaseApp, 'southamerica-east1');
const db = getFirestore(firebaseApp);

// Callable function references (created once, lazily)
let _grantCallable: ReturnType<typeof httpsCallable> | null = null;
let _revokeCallable: ReturnType<typeof httpsCallable> | null = null;
let _dsarCallable: ReturnType<typeof httpsCallable> | null = null;
let _erasureCallable: ReturnType<typeof httpsCallable> | null = null;

function getGrantCallable() {
  if (!_grantCallable) _grantCallable = httpsCallable(functions, 'consentGrant');
  return _grantCallable;
}

function getRevokeCallable() {
  if (!_revokeCallable) _revokeCallable = httpsCallable(functions, 'consentRevoke');
  return _revokeCallable;
}

function getDsarCallable() {
  if (!_dsarCallable) _dsarCallable = httpsCallable(functions, 'dsarExport');
  return _dsarCallable;
}

function getErasureCallable() {
  if (!_erasureCallable) _erasureCallable = httpsCallable(functions, 'accountErasure');
  return _erasureCallable;
}

export function useConsent() {
  const currentUser = useCurrentUser();
  const posthog = usePosthog();

  const uid = computed(() => currentUser.value?.uid ?? null);

  // Reactive collection of /users/{uid}/consents — only live when uid is set.
  // VueFire's useCollection returns a reactive array; we reshape to a map keyed by category.
  const consentsCollection = useCollection(
    computed(() =>
      uid.value ? collection(db, `users/${uid.value}/consents`) : null,
    ),
  );

  const consents = computed<Record<string, ConsentDoc>>(() => {
    const result: Record<string, ConsentDoc> = {};
    if (consentsCollection.value) {
      for (const doc of consentsCollection.value) {
        const d = doc as unknown as ConsentDoc & { id: string };
        if (d.category) result[d.category] = d;
      }
    }
    return result;
  });

  function hasGranted(category: ConsentCategory): ComputedRef<boolean> {
    return computed(() => consents.value[category]?.status === 'granted');
  }

  /**
   * Grant consent for a category.
   * Reads the active version from Firestore (or uses 'v3' default for MVP),
   * calls consentGrant callable, then fires PostHog optIn if basic_profile.
   */
  async function grant(
    category: ConsentCategory,
    layer: 0 | 1 | 2 | 3 | 4,
    version = 'v3',
    textHash?: string,
  ): Promise<void> {
    // Compute the textHash from the canonical Spanish purpose text in
    // /consentTexts/{category}_{version}.es.purpose. Composite-key schema:
    // a 3-segment path is invalid in Firestore (doc paths require even segments),
    // so the version is concatenated into the doc ID with an underscore.
    let hash = textHash;
    if (!hash) {
      const textsRef = doc(db, 'consentTexts', `${category}_${version}`);
      const textsSnap = await getDoc(textsRef);
      const purpose = (
        textsSnap.data() as { es?: { purpose?: string } } | undefined
      )?.es?.purpose;
      if (!purpose) {
        throw new Error(
          `useConsent.grant: missing consentTexts/${category}_${version}.es.purpose; cannot compute textHash`,
        );
      }
      hash = await sha256Hex(purpose);
    }

    const callable = getGrantCallable();
    await callable({ category, version, textHash: hash, layer });

    // Force-refresh the ID token so the new `consents.<key>` custom claim
    // propagates to the client immediately. Without this, downstream Firestore
    // rules and consentGate() calls keep seeing the pre-grant token and
    // continue rejecting reads/writes with permission-denied — even though
    // the consents collection has been updated.
    const auth = getAuth(firebaseApp);
    if (auth.currentUser) {
      await auth.currentUser.getIdToken(true);
    }

    // PostHog opt-in gate: only enable tracking after basic_profile consent.
    if (category === 'basic_profile') {
      posthog.optIn();
    }
  }

  /**
   * Revoke consent for a category.
   */
  async function revoke(category: ConsentCategory, reason?: string): Promise<void> {
    const callable = getRevokeCallable();
    await callable({ category, reason });
  }

  /**
   * Request a DSAR (Data Subject Access Request) export.
   * Returns the requestId for status tracking.
   */
  async function requestExport(): Promise<{ requestId?: string }> {
    const callable = getDsarCallable();
    const result = await callable({});
    return (result.data as { requestId?: string }) ?? {};
  }

  /**
   * Request account erasure. Must pass 'ELIMINAR' as confirmation.
   * Soft-deletes immediately; 72h hard-delete is scheduled server-side.
   */
  async function requestErasure(confirmation: string): Promise<void> {
    const callable = getErasureCallable();
    await callable({ confirmation });
  }

  return {
    consents,
    hasGranted,
    grant,
    revoke,
    requestExport,
    requestErasure,
    uid,
  };
}
