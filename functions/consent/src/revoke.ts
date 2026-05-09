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
import { PubSub } from '@google-cloud/pubsub';
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
  { region: 'southamerica-east1' },
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

    // Publish side-effect cascade to Pub/Sub topic 'consent-revoked'.
    // Subscribers (Plan 09): wearable disconnect, pending RSVP cleanup, BQ changelog flag.
    try {
      const pubsub = new PubSub();
      const topic = pubsub.topic('consent-revoked');
      const messageData = Buffer.from(
        JSON.stringify({ uid, category, revokedAt: now.toISOString() }),
      );
      await topic.publishMessage({ data: messageData });
    } catch {
      // Non-fatal: the consent is already revoked transactionally.
      // Side-effects are best-effort; if Pub/Sub fails, the next cleanup sweep will catch it.
      console.warn('[consent-revoke] Failed to publish consent-revoked event — non-fatal.');
    }

    return { ok: true };
  },
);
