/*
 * ConsentEnforcement.ts — Single source of truth for consent gating.
 *
 * Used by Cloud Functions (server side, Admin SDK). Firestore Security Rules read the SAME
 * category names + claim keys from this module's exports (mirror in firestore.rules).
 *
 * Pattern (RESEARCH §1, PITFALLS #1):
 *   1. HOT_PATH categories check the user's custom-claim bitmap first (zero Firestore reads).
 *   2. Cold-path or claim miss → read /users/{uid}/consents/{category} document.
 *   3. Every gate invocation writes one auditLog entry (granted OR denied) — append-only.
 *
 * Threats mitigated: T-02-01-04 (claim spoofing — claims are server-set only),
 * T-02-01-05 (audit ledger writes), T-02-01-09 (transactional grant in Plan 04).
 */
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export const CONSENT_CATEGORIES = [
  'basic_profile',
  'event_participation',
  'health_self_reports',
  'wearable_data',
  'gaming_habits',
  'b2b_insurers',
  'b2b_healthcare',
  'b2b_brands',
  'cross_border',
  'research',
] as const;

export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

// Single-letter custom-claim bitmap keys. Total claims payload stays well under the 1000-byte
// custom-claim limit. Mirror in firestore.rules hasConsentClaim ternary.
export const CLAIM_BITMAP_KEYS: Record<ConsentCategory, string> = {
  basic_profile: 'b',
  event_participation: 'e',
  health_self_reports: 'h',
  wearable_data: 'w',
  gaming_habits: 'g',
  b2b_insurers: 'i',
  b2b_healthcare: 'c',
  b2b_brands: 'r',
  cross_border: 'x',
  research: 's',
};

// Categories that ride on the custom-claim hot path (re-set in Plan 04 grant() / revoke()).
export const HOT_PATH_CATEGORIES: ConsentCategory[] = [
  'basic_profile',
  'event_participation',
  'wearable_data',
  'health_self_reports',
];

export async function consentGate(uid: string, category: ConsentCategory): Promise<void> {
  const db = getFirestore();
  const auditRef = db.collection('auditLog').doc();
  let allowed = false;
  let source: 'claim' | 'doc' | 'none' = 'none';
  let denyReason: string | null = null;

  try {
    if (HOT_PATH_CATEGORIES.includes(category)) {
      const user = await getAuth().getUser(uid);
      const consents = (user.customClaims?.['consents'] ?? {}) as Record<string, boolean>;
      const key = CLAIM_BITMAP_KEYS[category];
      if (consents[key] === true) {
        allowed = true;
        source = 'claim';
      }
    }
    if (!allowed) {
      const snap = await db.doc(`users/${uid}/consents/${category}`).get();
      const data = snap.data();
      if (
        data &&
        data['status'] === 'granted' &&
        data['expiresAt'] &&
        (data['expiresAt'] as Timestamp).toDate() > new Date()
      ) {
        allowed = true;
        source = 'doc';
      } else if (!data) {
        denyReason = 'no-consent-doc';
      } else if (data['status'] !== 'granted') {
        denyReason = `status=${String(data['status'])}`;
      } else {
        denyReason = 'expired';
      }
    }
  } finally {
    await auditRef.set({
      uid,
      category,
      action: 'access',
      allowed,
      source,
      denyReason,
      timestamp: FieldValue.serverTimestamp(),
    });
  }

  if (!allowed) {
    throw new HttpsError('permission-denied', `Consent not granted for ${category}`);
  }
}
