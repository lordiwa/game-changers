/**
 * revoke.ts — Transactional consent revoke with hash-chained ledger.
 *
 * CNST-05: revoke stops processing immediately (two-layer enforcement).
 * After commit, publishes to Pub/Sub topic 'consent-revoked' for side-effect cascade.
 * Threats mitigated: T-02-04-01 (atomicity), T-02-04-06 (two-layer revoke).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  CONSENT_CATEGORIES,
  CLAIM_BITMAP_KEYS,
  type ConsentCategory,
} from '@gamechangers/functions-shared/ConsentEnforcement';
import { buildLedgerHash } from './grant.js';

const RevokeInputSchema = z.object({
  category: z.enum(CONSENT_CATEGORIES),
  reason: z.string().optional(),
});

export const consentRevoke = onCall(
  { region: 'southamerica-east1', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;

    const parsed = RevokeInputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }
    const { category, reason } = parsed.data;

    const db = getFirestore();
    const consentDocRef = db.doc(`users/${uid}/consents/${category}`);
    const consentSnap = await consentDocRef.get();

    if (!consentSnap.exists || consentSnap.data()!['status'] !== 'granted') {
      return { ok: true, alreadyRevoked: true };
    }

    const existingData = consentSnap.data()!;
    const version = existingData['version'] as string;
    const textHash = existingData['textHash'] as string;

    // Read latest ledger entry for hash chain.
    const ledgerQuery = await db
      .collection('consentLedger')
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    const prevHash = ledgerQuery.empty
      ? '0'.repeat(64)
      : (ledgerQuery.docs[0]!.data()['hash'] as string);

    const ledgerRef = db.collection('consentLedger').doc();
    const auditRef = db.collection('auditLog').doc();

    const now = new Date();
    const timestampMs = now.getTime();

    const payload = {
      uid,
      category,
      action: 'revoke',
      version,
      textHash,
      reason: reason ?? null,
      timestampMs,
    };
    const ledgerHash = buildLedgerHash(prevHash, payload, uid, timestampMs);

    // Atomic 3-document transaction.
    await db.runTransaction(async (tx) => {
      // 1. Update consent doc.
      tx.update(consentDocRef, {
        status: 'revoked',
        revokedAt: FieldValue.serverTimestamp(),
      });

      // 2. Ledger entry.
      tx.set(ledgerRef, {
        uid,
        category,
        action: 'revoke',
        version,
        textHash,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        prevHash,
        reason: reason ?? null,
        source: 'user',
      });

      // 3. Audit entry.
      tx.set(auditRef, {
        uid,
        category,
        action: 'consent_revoke',
        version,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        source: 'revoke',
      });
    });

    // Refresh custom claims — remove the bitmap key immediately.
    const auth = getAuth();
    const userRecord = await auth.getUser(uid);
    const existingClaims = (userRecord.customClaims ?? {}) as Record<string, unknown>;
    const existingConsents = (existingClaims['consents'] ?? {}) as Record<string, boolean>;
    const bitmapKey = CLAIM_BITMAP_KEYS[category];
    const updatedConsents = { ...existingConsents };
    delete updatedConsents[bitmapKey];
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      consents: updatedConsents,
    });

    // Side-effect cascade publish — DEFERRED. Was Pub/Sub publish for Plan 09
    // subscribers (wearable disconnect, pending RSVP cleanup, BQ changelog flag).
    // Top-level `@google-cloud/pubsub` import broke the entire consent codebase
    // at runtime (Cannot find package), shutting down consentGrant alongside
    // consentRevoke. Subscribers don't exist in production yet — when Plan 09
    // ships them, re-introduce the publish here using a dynamic import so a
    // missing dep can never again brick sibling Functions:
    //   const { PubSub } = await import('@google-cloud/pubsub');
    //   try { ... } catch { /* non-fatal */ }

    return { ok: true };
  },
);
