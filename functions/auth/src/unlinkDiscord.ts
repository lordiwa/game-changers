/*
 * Plan 02-02 Task 1 — Unlink Discord Cloud Function (AUTH-08).
 *
 * Deletes /users/{uid}/private/discord, removes the discordId reverse-index entry,
 * removes hasDiscord:true from custom claims, and writes an auditLog entry.
 *
 * The encrypted refresh token is deleted with the doc; we cannot revoke at Discord's
 * side from a refresh token alone (Discord's revoke endpoint requires the access_token),
 * but deleting our copy is sufficient — the token can no longer be used by us.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const unlinkDiscord = onCall(
  { region: 'southamerica-east1', cors: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
    }
    const uid = req.auth.uid;
    const db = getFirestore();
    const ref = db.doc(`users/${uid}/private/discord`);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError('failed-precondition', 'NOT_LINKED');
    }
    const discordId = snap.data()?.['discordId'] as string | undefined;

    await ref.delete();
    if (discordId) {
      await db.doc(`users/_lookup/discord/${discordId}`).delete().catch(() => undefined);
    }

    // Remove hasDiscord from custom claims; preserve other claims (consents, ageVerified, isMinor).
    const user = await getAuth().getUser(uid);
    const existing = { ...(user.customClaims ?? {}) } as Record<string, unknown>;
    delete existing['hasDiscord'];
    await getAuth().setCustomUserClaims(uid, existing);

    await db.collection('auditLog').doc().set({
      uid,
      action: 'discord_unlinked',
      discordId: discordId ?? null,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { unlinked: true };
  },
);
