/**
 * createChallenge.ts — Admin-only HTTPS callable to create a challenge document.
 *
 * Phase 2 usage: called by scripts/seed-challenges.ts via Admin SDK.
 * Production usage: restricted to admin role (custom claim `admin: true`).
 *
 * Zod validates the full Challenge schema before writing.
 * Idempotent: if challengeId already exists, returns { created: false, id }.
 */
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const TierSchema = z.object({
  target: z.number().positive(),
  reward: z.object({
    xp: z.number().positive(),
    badgeId: z.string().min(1),
  }),
});

const ChallengeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['movement', 'streak', 'social', 'mental', 'hybrid']),
  name: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  description: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  tier: z.object({
    bronce: TierSchema,
    plata: TierSchema,
    oro: TierSchema,
  }),
  metric: z.enum(['steps', 'minutes_meditated', 'events_attended', 'sleep_hours', 'days_active', 'social_interactions', 'custom']),
  unit: z.string().min(1),
  startsAt: z.string().datetime().or(z.unknown()),
  endsAt: z.string().datetime().or(z.unknown()),
  season: z.string().min(1),
  visibility: z.enum(['public', 'club_only', 'sponsored']),
  cluster: z.enum(['free-fire', 'dota', 'minecraft', 'lol', 'general']).optional(),
  acceptablePhotoEvidence: z.boolean(),
});

export type ChallengeInput = z.infer<typeof ChallengeSchema>;

export const createChallengeHandler = async (
  request: CallableRequest<unknown>,
) => {
  // Admin-only gate — admin custom claim is set on the user record.
  const isAdmin =
    (request.auth?.token as Record<string, unknown> | undefined)?.['admin'] === true;
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin role required to create challenges');
  }

  let parsed: ChallengeInput;
  try {
    parsed = ChallengeSchema.parse(request.data);
  } catch (err) {
    throw new HttpsError('invalid-argument', `Invalid challenge schema: ${String(err)}`);
  }

  const db = getFirestore();
  const challengeRef = db.doc(`challenges/${parsed.id}`);

  // Idempotency: skip if already exists
  const existing = await challengeRef.get();
  if (existing.exists) {
    return { created: false, id: parsed.id };
  }

  await challengeRef.set({
    ...parsed,
    archived: false, // PWA list query filters archived == false (CR-08)
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { created: true, id: parsed.id };
};

export const createChallenge = onCall(
  { region: 'southamerica-east1' },
  createChallengeHandler,
);
