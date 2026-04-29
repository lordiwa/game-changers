/**
 * badgeAward.ts — HTTPS callable Cloud Function for awarding badges with provenance.
 *
 * Called by: event check-in, challenge completion, streak milestone functions.
 *
 * Badge integrity:
 *   signedClaim = HMAC-SHA256({ badgeId, uid, source, earnedAt }, BADGE_SIGNING_KEY)
 *   Stored in /users/{uid}/badges/{badgeId} — client cannot write (Rules deny).
 *
 * Threats mitigated:
 *   T-02-05-02 (badge forgery): HMAC-signed claim; client writes to badges/ are blocked by Rules.
 */
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createHmac } from 'node:crypto';
import { z } from 'zod';

const BADGE_SIGNING_KEY = defineSecret('BADGE_SIGNING_KEY');

const BadgeAwardRequestSchema = z.object({
  badgeId: z.string().min(1).max(100),
  source: z.string().min(1), // 'event:abc' | 'challenge:xyz' | 'streak:fitness:30'
  tier: z.enum(['bronce', 'plata', 'oro']).optional(),
});

export function computeBadgeHmac(
  badgeId: string,
  uid: string,
  source: string,
  earnedAtMs: number,
  key: string,
): string {
  const payload = JSON.stringify({ badgeId, uid, source, earnedAtMs });
  return createHmac('sha256', key).update(payload).digest('hex');
}

export const badgeAward = onCall(
  {
    region: 'southamerica-east1',
    secrets: [BADGE_SIGNING_KEY],
  },
  async (request) => {
    // ── 1. Auth check ───────────────────────────────────────────────────────
    if (!request.auth?.uid) {
      throw new Error('unauthenticated');
    }
    const uid = request.auth.uid;

    // ── 2. Validate input ───────────────────────────────────────────────────
    let params: z.infer<typeof BadgeAwardRequestSchema>;
    try {
      params = BadgeAwardRequestSchema.parse(request.data);
    } catch (err) {
      throw new Error(`invalid-argument: ${String(err)}`);
    }
    const { badgeId, source, tier } = params;

    const db = getFirestore();
    const badgeRef = db.doc(`users/${uid}/badges/${badgeId}`);

    // ── 3. Idempotency check ────────────────────────────────────────────────
    const existing = await badgeRef.get();
    if (existing.exists) {
      return { alreadyEarned: true, badgeId };
    }

    // ── 4. Compute HMAC-signed claim ────────────────────────────────────────
    const earnedAtMs = Date.now();
    const signingKey = BADGE_SIGNING_KEY.value();
    const signedClaim = computeBadgeHmac(badgeId, uid, source, earnedAtMs, signingKey);

    // ── 5. Write badge doc ──────────────────────────────────────────────────
    const badgeDoc = {
      badgeId,
      earnedAt: Timestamp.fromMillis(earnedAtMs),
      source,
      ...(tier ? { tier } : {}),
      signedClaim,
    };

    await badgeRef.set(badgeDoc);

    // ── 6. Audit log ────────────────────────────────────────────────────────
    await db.collection('auditLog').doc().set({
      action: 'badge_awarded',
      uid,
      badgeId,
      source,
      tier: tier ?? null,
      earnedAtMs,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[badgeAward] Badge ${badgeId} awarded to uid=${uid} (source=${source})`);
    return { alreadyEarned: false, badgeId, signedClaim };
  },
);
