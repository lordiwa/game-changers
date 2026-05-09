/**
 * logProgress.ts — Single write path for ALL challenge progress sources.
 *
 * Sources: manual | pedometer | wearable | photo
 * Source → Consent matrix (RESEARCH §7):
 *   manual    → health_self_reports
 *   pedometer → health_self_reports
 *   wearable  → wearable_data
 *   photo     → event_participation
 *
 * Steps:
 *   1. Zod-validate.
 *   2. Resolve consent category from SOURCE_TO_CONSENT.
 *   3. consentGate(uid, requiredCategory).
 *   4. Anti-cheat per metric (DC-06).
 *   5. Evidence check for Plata/Oro + manual source.
 *   6. runTransaction: read enrollment + challenge → write progress doc → update enrollment.
 *   7. If completed: publish to xp-events Pub/Sub (challenge_completed message).
 *   8. Return { status, progress, completed }.
 *
 * Threats mitigated:
 *   T-02-08-01 (inflated steps): anti-cheat thresholds from DC-06
 *   T-02-08-06 (direct writes): Functions only path
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { consentGate, type ConsentCategory } from '@gamechangers/functions-shared';
import { withinAntiCheatBounds } from './antiCheat-challenge.js';

// ── Source → Consent mapping ─────────────────────────────────────────────────
export const SOURCE_TO_CONSENT: Record<string, ConsentCategory> = {
  manual: 'health_self_reports',
  pedometer: 'health_self_reports',
  wearable: 'wearable_data',
  photo: 'event_participation',
};

// ── Zod schema ───────────────────────────────────────────────────────────────
const LogProgressSchema = z.object({
  challengeId: z.string().min(1),
  source: z.enum(['manual', 'pedometer', 'wearable', 'photo']),
  value: z.number().positive(),
  unit: z.string().min(1),
  evidence: z.string().optional(),  // Storage path for photo evidence
});

export type LogProgressInput = z.infer<typeof LogProgressSchema>;

export type LogProgressResult = {
  status: 'ok' | 'flagged';
  progress: number;
  completed: boolean;
  progressId?: string;
};

export const logProgressHandler = async (
  request: { data: unknown; auth?: { uid?: string } },
  context?: unknown,
): Promise<LogProgressResult> => {
  const auth = (request as { auth?: { uid?: string } }).auth ??
    (context as { auth?: { uid?: string } } | undefined)?.auth;
  const uid = auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required');
  }

  // 1. Validate input
  let parsed: LogProgressInput;
  try {
    parsed = LogProgressSchema.parse(request.data);
  } catch (err) {
    throw new HttpsError('invalid-argument', `Invalid logProgress input: ${String(err)}`);
  }

  // 2. Consent gate (source-specific)
  const requiredConsent = SOURCE_TO_CONSENT[parsed.source];
  if (!requiredConsent) {
    throw new HttpsError('invalid-argument', `Unknown progress source: ${parsed.source}`);
  }
  await consentGate(uid, requiredConsent);

  // 3. Anti-cheat: quick rejection BEFORE Firestore reads (fail fast)
  //    Detect metric from challenge later; for steps, we can detect based on unit.
  //    Full per-metric check runs inside the transaction after reading the challenge.
  const isStepUnit = parsed.unit === 'steps';
  if (isStepUnit) {
    const check = withinAntiCheatBounds('steps', parsed.value);
    if (check.status === 'reject') {
      throw new HttpsError(
        'invalid-argument',
        `Progress rejected: ${check.reason ?? 'CHEAT_REJECTED_STEPS'}`,
      );
    }
  }

  const db = getFirestore();

  // 4. runTransaction: read enrollment + challenge → write progress → update enrollment
  const enrollmentRef = db.doc(`users/${uid}/challengeEnrollments/${parsed.challengeId}`);
  const challengeRef = db.doc(`challenges/${parsed.challengeId}`);

  let finalStatus: 'ok' | 'flagged' = 'ok';
  let finalProgress = 0;
  let completed = false;
  let progressDocId: string | undefined;

  await db.runTransaction(async (tx) => {
    const [enrollmentSnap, challengeSnap] = await Promise.all([
      tx.get(enrollmentRef),
      tx.get(challengeRef),
    ]);

    // 5. Check enrollment exists
    if (!enrollmentSnap.exists) {
      throw new HttpsError('not-found', `Not enrolled in challenge ${parsed.challengeId}`);
    }

    const enrollment = enrollmentSnap.data()!;
    const challenge = challengeSnap.data()!;
    const enrolledTier = enrollment['tier'] as 'bronce' | 'plata' | 'oro';
    const metric = (challenge['metric'] as string) ?? 'custom';

    // 6. Per-metric anti-cheat (post-context)
    const check = withinAntiCheatBounds(metric, parsed.value);
    if (check.status === 'reject') {
      throw new HttpsError(
        'invalid-argument',
        `Progress rejected: ${check.reason ?? 'CHEAT_REJECTED'}`,
      );
    }
    finalStatus = check.status === 'flag' ? 'flagged' : 'ok';

    // 7. Evidence requirement for Plata/Oro + manual source
    if ((enrolledTier === 'plata' || enrolledTier === 'oro') && parsed.source === 'manual') {
      if (!parsed.evidence || parsed.evidence.trim() === '') {
        throw new HttpsError(
          'failed-precondition',
          'EVIDENCE_REQUIRED: Photo evidence required for Plata and Oro tier manual entries',
        );
      }
    }

    // 8. Write progress doc
    const progressRef = db.collection(`users/${uid}/challengeProgress`).doc();
    progressDocId = progressRef.id;
    const progressData = {
      challengeId: parsed.challengeId,
      source: parsed.source,
      value: parsed.value,
      unit: parsed.unit,
      recordedAt: FieldValue.serverTimestamp(),
      status: finalStatus,
      ...(parsed.evidence ? { evidence: parsed.evidence } : {}),
    };
    tx.set(progressRef, progressData);

    // 9. Update enrollment progress (increment + check completion)
    const currentProgress = (enrollment['progress'] as number) ?? 0;
    const newProgress = currentProgress + parsed.value;
    finalProgress = newProgress;

    const tierConfig = (challenge['tier'] as Record<string, { target: number; reward: { xp: number; badgeId: string } }>)[enrolledTier];
    const target = tierConfig?.target ?? Infinity;

    if (newProgress >= target && !enrollment['completedAt']) {
      completed = true;
      tx.set(enrollmentRef, {
        progress: newProgress,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      tx.set(enrollmentRef, {
        progress: newProgress,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    // 10. Audit log
    const auditRef = db.collection('auditLog').doc();
    tx.set(auditRef, {
      action: 'challenge_progress_logged',
      uid,
      challengeId: parsed.challengeId,
      source: parsed.source,
      value: parsed.value,
      status: finalStatus,
      completed,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  // 11. If completed: publish challenge_completed event to xp-events Pub/Sub
  if (completed) {
    try {
      const { PubSub } = await import('@google-cloud/pubsub');
      const pubsub = new PubSub();

      // Read enrollment + challenge data outside transaction for Pub/Sub payload
      const [enrollSnap, chalSnap] = await Promise.all([
        db.doc(`users/${uid}/challengeEnrollments/${parsed.challengeId}`).get(),
        db.doc(`challenges/${parsed.challengeId}`).get(),
      ]);

      const enroll = enrollSnap.data() ?? {};
      const chal = chalSnap.data() ?? {};
      const tier = (enroll['tier'] as string) ?? 'bronce';
      const tierCfg = (chal['tier'] as Record<string, { reward: { xp: number; badgeId: string } }>)?.[tier];
      const xpReward = tierCfg?.reward?.xp ?? 0;
      const badgeId = tierCfg?.reward?.badgeId ?? '';

      const message = {
        type: 'challenge_completed',
        uid,
        challengeId: parsed.challengeId,
        tier,
        xpReward,
        badgeId,
      };

      await pubsub.topic('xp-events').publishMessage({
        json: message,
      });

      console.log(`[logProgress] Published challenge_completed for uid=${uid}, challengeId=${parsed.challengeId}`);
    } catch (pubsubErr) {
      // Non-fatal: Pub/Sub publish failure should not fail the progress log
      console.error('[logProgress] Pub/Sub publish failed (non-fatal):', pubsubErr);
    }
  }

  return {
    status: finalStatus,
    progress: finalProgress,
    completed,
    progressId: progressDocId,
  };
};

export const logProgress = onCall(
  { region: 'southamerica-east1' },
  logProgressHandler,
);
