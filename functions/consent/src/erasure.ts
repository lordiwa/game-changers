/**
 * erasure.ts — Account erasure: soft-delete + 72h hard-delete.
 *
 * CNST-11: immediate soft-delete; 72h hard-delete; auditLog and consentLedger pseudonymized
 * (NOT deleted — LOPDP audit retention). See ADR-010.
 * Threat mitigated: T-02-04-08 (BQ deletion semantics), T-02-04-10 (LOPDP audit-retention).
 */
import crypto from 'node:crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { sha256, buildLedgerHash } from './grant.js';
import {
  CONSENT_CATEGORIES,
  CLAIM_BITMAP_KEYS,
  type ConsentCategory,
} from '@gamechangers/functions-shared/ConsentEnforcement';

const REGION = 'southamerica-east1';

// Pseudonymization salt from Secret Manager (documented in ADR-010 as immutable).
// Rotation requires DPO sign-off + re-pseudonymization migration.
function getPseudonymizationSalt(): string {
  const salt = process.env['PSEUDONYMIZATION_SALT'];
  if (!salt) {
    // In emulator/test mode, use a test salt.
    if (process.env['FUNCTIONS_EMULATOR'] === 'true' || process.env['NODE_ENV'] === 'test') {
      return 'test-pseudonymization-salt-CHANGE-IN-PRODUCTION';
    }
    throw new Error('PSEUDONYMIZATION_SALT environment variable is required');
  }
  return salt;
}

export function pseudonymizeUid(uid: string): string {
  const salt = getPseudonymizationSalt();
  return sha256(`${uid}${salt}`);
}

const ErasureInputSchema = z.object({
  confirmation: z.literal('ELIMINAR'),
});

/**
 * accountErasure — HTTPS callable. Immediately soft-deletes and schedules hard-delete in 72h.
 */
export const accountErasure = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = request.auth.uid;

  // Typed-confirm gate — must type 'ELIMINAR' exactly.
  const parsed = ErasureInputSchema.safeParse(request.data);
  if (!parsed.success) {
    throw new HttpsError(
      'invalid-argument',
      "Must confirm with 'ELIMINAR' to proceed with account deletion.",
    );
  }

  const db = getFirestore();
  const auth = getAuth();

  // Collect all consent docs to revoke.
  const consentsSnap = await db.collection(`users/${uid}/consents`).get();
  const ledgerQuery = await db
    .collection('consentLedger')
    .where('uid', '==', uid)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get();
  let prevHash = ledgerQuery.empty
    ? '0'.repeat(64)
    : (ledgerQuery.docs[0].data()['hash'] as string);

  const now = new Date();

  // Build ledger and audit entries for each consent revocation.
  const ledgerRefs: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];
  const auditRefs: Array<{ ref: FirebaseFirestore.DocumentReference; data: Record<string, unknown> }> = [];

  for (const consentDoc of consentsSnap.docs) {
    const data = consentDoc.data();
    if (data['status'] !== 'granted') continue;

    const category = data['category'] as ConsentCategory;
    const version = data['version'] as string;
    const textHash = data['textHash'] as string;
    const timestampMs = now.getTime();

    const payload = {
      uid,
      category,
      action: 'revoke',
      version,
      textHash,
      reason: 'account_erasure',
      timestampMs,
      source: 'erasure',
    };
    // Snapshot the chain head BEFORE advancing — this entry's prevHash must
    // point at the previous ledger entry (or genesis on the first iteration).
    const entryPrevHash = prevHash;
    const ledgerHash = buildLedgerHash(prevHash, payload, uid, timestampMs);
    prevHash = ledgerHash;

    ledgerRefs.push({
      ref: db.collection('consentLedger').doc(),
      data: {
        uid,
        category,
        action: 'revoke',
        version,
        textHash,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        prevHash: entryPrevHash,
        reason: 'account_erasure',
        source: 'erasure',
      },
    });

    auditRefs.push({
      ref: db.collection('auditLog').doc(),
      data: {
        uid,
        category,
        action: 'consent_revoke',
        version,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        source: 'erasure',
      },
    });
  }

  // Final audit entry for the erasure itself.
  const erasureAuditRef = db.collection('auditLog').doc();

  // Soft-delete in runTransaction: revoke all consents + mark profile deleted.
  await db.runTransaction(async (tx) => {
    // Mark profile as deleted.
    tx.set(
      db.doc(`users/${uid}/profile/main`),
      { deletedAt: FieldValue.serverTimestamp(), displayName: '[deleted]' },
      { merge: true },
    );

    // Revoke all granted consents.
    for (const consentDoc of consentsSnap.docs) {
      if (consentDoc.data()['status'] === 'granted') {
        tx.update(consentDoc.ref, {
          status: 'revoked',
          revokedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Write ledger + audit entries.
    for (const { ref, data } of ledgerRefs) {
      tx.set(ref, data);
    }
    for (const { ref, data } of auditRefs) {
      tx.set(ref, data);
    }

    // Erasure audit entry.
    tx.set(erasureAuditRef, {
      uid,
      action: 'account_erasure_soft_delete',
      timestamp: FieldValue.serverTimestamp(),
      source: 'erasure',
    });
  });

  // Delete the discordId → uid reverse-index lookup (WR-09): the reverse-index
  // would otherwise leak deletion timing to anyone who knew the discordId.
  try {
    const discordSnap = await db.doc(`users/${uid}/private/discord`).get();
    const discordId = discordSnap.data()?.['discordId'] as string | undefined;
    if (discordId) {
      await db.doc(`users/_lookup/discord/${discordId}`).delete();
    }
  } catch (err) {
    console.warn('[accountErasure] failed to clear discord reverse-index:', err);
  }

  // Revoke ALL Firebase Auth sessions immediately.
  await auth.revokeRefreshTokens(uid);

  // Set custom claims to mark account as deleted.
  await auth.setCustomUserClaims(uid, {
    accountDeleted: true,
    ageVerified: false,
    hasDiscord: false,
    consents: {},
  });

  // Schedule Cloud Task for hard-delete in 72h.
  // NOTE: In production, use @google-cloud/tasks to schedule erasureHardDelete.
  // For MVP: write a scheduled-erasure doc that the daily sweeper picks up.
  await db.collection('scheduledErasures').doc(uid).set({
    uid,
    softDeletedAt: FieldValue.serverTimestamp(),
    hardDeleteAfter: new Date(Date.now() + 72 * 60 * 60 * 1000),
    status: 'pending',
  });

  return { ok: true };
});

/**
 * erasureHardDelete — Cloud Task / HTTP target for 72h hard-delete.
 *
 * Deletes all user data subcollections EXCEPT auditLog and consentLedger
 * (which are pseudonymized for legal retention per ADR-010).
 * NOTE: auditLog and consentLedger are NOT deleted — pseudonymized uid is written instead.
 */
export const erasureHardDelete = onRequest({ region: REGION }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid } = req.body as { uid: string };
  if (!uid) {
    res.status(400).json({ ok: false, error: 'Missing uid' });
    return;
  }

  try {
    await performHardDelete(uid);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[erasureHardDelete] Error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Exported for testability.
 */
export async function performHardDelete(uid: string): Promise<void> {
  const db = getFirestore();
  const auth = getAuth();
  const pseudoUid = pseudonymizeUid(uid);

  // Defensive: ensure the discordId reverse-index is gone even if soft-delete
  // didn't clear it (WR-09).
  try {
    const discordSnap = await db.doc(`users/${uid}/private/discord`).get();
    const discordId = discordSnap.data()?.['discordId'] as string | undefined;
    if (discordId) {
      await db.doc(`users/_lookup/discord/${discordId}`).delete();
    }
  } catch (err) {
    console.warn('[performHardDelete] failed to clear discord reverse-index:', err);
  }

  // Collections to hard-delete under /users/{uid}/.
  const subcollections = [
    'profile',
    'badges',
    'streaks',
    'challengeEnrollments',
    'challengeProgress',
    'healthDaily',
    'healthSamples',
    'dsarRequests',
    'private',
    'notifications',
    'fcmTokens',
    'consents',
  ];

  // Batch-delete each subcollection (100 docs per batch).
  for (const sub of subcollections) {
    const colRef = db.collection(`users/${uid}/${sub}`);
    let snap = await colRef.limit(100).get();
    while (!snap.empty) {
      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      snap = await colRef.limit(100).get();
    }
  }

  // Pseudonymize uid in consentLedger entries (replace uid field with sha256(uid+salt)).
  // NOTE: We do NOT delete these entries — they are retained for LOPDP legal audit (ADR-010).
  // The pseudonymization preserves chain integrity while removing PII linkage.
  const ledgerQuery = await db.collection('consentLedger').where('uid', '==', uid).get();
  if (!ledgerQuery.empty) {
    const batch = db.batch();
    for (const doc of ledgerQuery.docs) {
      batch.update(doc.ref, { uid: pseudoUid });
    }
    await batch.commit();
  }

  // Pseudonymize uid in auditLog entries.
  // NOTE: We do NOT delete these entries — retained for LOPDP legal audit (ADR-010).
  const auditQuery = await db.collection('auditLog').where('uid', '==', uid).get();
  if (!auditQuery.empty) {
    const batch = db.batch();
    for (const doc of auditQuery.docs) {
      batch.update(doc.ref, { uid: pseudoUid });
    }
    await batch.commit();
  }

  // Delete the Firebase Auth user.
  await auth.deleteUser(uid);

  // Final audit entry (pseudonymized uid).
  await db.collection('auditLog').doc().set({
    uid: pseudoUid,
    action: 'account_erased_hard',
    pseudonymizedUid: pseudoUid,
    timestamp: FieldValue.serverTimestamp(),
    source: 'erasure',
  });

  // Mark scheduled erasure as complete.
  await db.collection('scheduledErasures').doc(uid).update({
    status: 'completed',
    hardDeletedAt: FieldValue.serverTimestamp(),
  });
}
