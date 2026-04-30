/**
 * enrollChallenge.ts — HTTPS callable to enroll a user in a challenge.
 *
 * Steps:
 *   1. Zod-validate input.
 *   2. consentGate(uid, 'event_participation') — challenge enrollment is a "social/event" act.
 *   3. Read challenge doc (verify it exists + is still open).
 *   4. Write /users/{uid}/challengeEnrollments/{challengeId}.
 *   5. Audit log.
 *
 * Firestore Security Rules: challengeEnrollments writes are server-controlled (Functions only).
 * Client cannot directly write tier/progress fields.
 *
 * Threat mitigated:
 *   T-02-08-06 (direct write to enrollments doc from client)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { consentGate } from '@gamechangers/functions-shared';

/**
 * Robustly coerce a Firestore-stored `endsAt` field into a JS Date.
 * Handles Timestamp instances, plain serialized timestamps ({seconds,nanoseconds}),
 * and ISO strings. Returns null if no valid date can be parsed — the caller is
 * expected to treat null as a hard error (WR-17).
 */
function coerceFirestoreDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      if (d instanceof Date && !isNaN(d.getTime())) return d;
    } catch {
      /* fall through */
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { seconds?: number }).seconds === 'number'
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const nanos = (value as { nanoseconds?: number }).nanoseconds ?? 0;
    return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const EnrollSchema = z.object({
  challengeId: z.string().min(1),
  tier: z.enum(['bronce', 'plata', 'oro']),
  optInLeaderboard: z.boolean(),
  anonymousLeaderboard: z.boolean(),
});

export type EnrollInput = z.infer<typeof EnrollSchema>;

export const enrollChallengeHandler = async (
  request: { data: unknown; auth?: { uid?: string; token?: Record<string, unknown> } },
  context?: unknown,
) => {
  // Support both callable context patterns
  const auth = (request as { auth?: { uid?: string } }).auth ??
    (context as { auth?: { uid?: string } } | undefined)?.auth;
  const uid = auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  // 1. Validate input
  let parsed: EnrollInput;
  try {
    parsed = EnrollSchema.parse(request.data);
  } catch (err) {
    throw new HttpsError('invalid-argument', `Invalid enrollment input: ${String(err)}`);
  }

  // 2. Consent gate
  await consentGate(uid, 'event_participation');

  const db = getFirestore();

  // 3. Read challenge + enrollment in transaction
  const challengeRef = db.doc(`challenges/${parsed.challengeId}`);
  const enrollmentRef = db.doc(`users/${uid}/challengeEnrollments/${parsed.challengeId}`);
  const auditRef = db.collection('auditLog').doc();

  await db.runTransaction(async (tx) => {
    const [challengeSnap] = await Promise.all([tx.get(challengeRef)]);

    if (!challengeSnap.exists) {
      throw new HttpsError('not-found', `Challenge ${parsed.challengeId} not found`);
    }

    const challenge = challengeSnap.data()!;
    const now = new Date();
    // WR-17: previous parsing fell through to `new Date({seconds,...})` which
    // produces Invalid Date — `Invalid Date < now` is `false`, so an expired
    // challenge would silently pass the gate. coerceFirestoreDate handles all
    // shapes Firestore may return and forces a clean error on garbage input.
    const endsAt = coerceFirestoreDate(challenge['endsAt']);
    if (!endsAt) {
      throw new HttpsError('internal', 'Challenge endsAt is invalid');
    }

    if (endsAt < now) {
      throw new HttpsError('failed-precondition', 'Challenge has already ended');
    }

    // 4. Write enrollment doc
    const enrollmentData = {
      uid,
      challengeId: parsed.challengeId,
      tier: parsed.tier,
      enrolledAt: FieldValue.serverTimestamp(),
      optInLeaderboard: parsed.optInLeaderboard,
      anonymousLeaderboard: parsed.anonymousLeaderboard,
      progress: 0,
      completedAt: null,
    };

    tx.set(enrollmentRef, enrollmentData);

    // 5. Audit log
    tx.set(auditRef, {
      action: 'challenge_enrolled',
      uid,
      challengeId: parsed.challengeId,
      tier: parsed.tier,
      optInLeaderboard: parsed.optInLeaderboard,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  return { enrolled: true, challengeId: parsed.challengeId, tier: parsed.tier };
};

export const enrollChallenge = onCall(
  { region: 'southamerica-east1' },
  enrollChallengeHandler,
);
