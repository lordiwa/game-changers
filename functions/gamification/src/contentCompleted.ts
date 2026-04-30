/**
 * contentCompleted.ts — HTTPS callable that validates content completion and publishes
 * to the xp-events Pub/Sub topic (consumed by xpAward, Plan 05).
 *
 * Architecture:
 *   Client (useContentTracking) → httpsCallable('contentCompleted')
 *     → consentGate('gaming_habits')
 *     → idempotency check (/users/{uid}/contentCompletions/{contentId})
 *     → anti-cheat duration check (durationSec >= estReadMinutes * 60 * 0.5)
 *     → write contentCompletion doc
 *     → publish to xp-events topic { type: 'content_completed', uid, contentId, durationSec }
 *     → return { ok: true, xpAwarded: <delta> }
 *
 * Threats mitigated:
 *   T-02-06-03 (consent before tracking): consentGate enforces gaming_habits at Function level
 *              (two-layer: client gate in useContentTracking + this server-side gate).
 *   T-02-06-04 (XP inflation): idempotent doc + anti-cheat duration check.
 *
 * XP delta formula (mirrors xpAward.ts computeXpDelta for content_completed):
 *   floor(durationSec / 10) XP, capped at 50.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { PubSub } from '@google-cloud/pubsub';
import { z } from 'zod';
import { consentGate } from '@gamechangers/functions-shared';

// ── Input validation ──────────────────────────────────────────────────────────
const ContentCompletedInputSchema = z.object({
  contentId: z.string().min(1).max(200),
  completionPercent: z.number().min(0).max(100),
  durationSec: z.number().int().min(1).max(86400),
});

type ContentCompletedInput = z.infer<typeof ContentCompletedInputSchema>;

// ── XP delta (mirrors xpAward.ts — content_completed formula) ─────────────────
function computeXpDelta(durationSec: number, estReadMinutes: number): number {
  const cappedByEstimate = Math.floor((estReadMinutes * 60) / 10);
  const raw = Math.floor(durationSec / 10);
  return Math.min(50, Math.min(raw, cappedByEstimate));
}

// ── Pub/Sub client (lazy singleton) ──────────────────────────────────────────
let _pubsub: PubSub | null = null;
function getPubSub(): PubSub {
  if (!_pubsub) {
    _pubsub = new PubSub();
  }
  return _pubsub;
}

// ── Cloud Function ─────────────────────────────────────────────────────────────
export const contentCompleted = onCall(
  {
    region: 'southamerica-east1',
    enforceAppCheck: false, // App Check deferred to Phase 3
  },
  async (request): Promise<{ ok: boolean; xpAwarded?: number; alreadyAwarded?: boolean }> => {
    // ── 1. Auth check ──────────────────────────────────────────────────────────
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = request.auth.uid;

    // ── 2. Input validation ────────────────────────────────────────────────────
    let input: ContentCompletedInput;
    try {
      input = ContentCompletedInputSchema.parse(request.data);
    } catch (err) {
      throw new HttpsError('invalid-argument', `Invalid input: ${String(err)}`);
    }

    const { contentId, completionPercent, durationSec } = input;

    // ── 3. Consent gate (gaming_habits) ───────────────────────────────────────
    // T-02-06-03: server-side enforcement (two-layer with client gate in useContentTracking)
    await consentGate(uid, 'gaming_habits');

    const db = getFirestore();

    // ── 4. Threshold check ─────────────────────────────────────────────────────
    if (completionPercent < 80) {
      throw new HttpsError(
        'failed-precondition',
        'Completion threshold not met (requires ≥80%)',
      );
    }

    // ── 5. Read article to get estReadMinutes for anti-cheat + XP cap ─────────
    const contentRef = db.doc(`content/${contentId}`);
    const contentSnap = await contentRef.get();

    if (!contentSnap.exists) {
      throw new HttpsError('not-found', `Content not found: ${contentId}`);
    }

    const contentData = contentSnap.data()!;
    const estReadMinutes: number = (contentData['estReadMinutes'] as number) ?? 5;

    // ── 6. Anti-cheat: reject if durationSec < estReadMinutes * 60 * 0.5 ──────
    // T-02-06-04: impossible to have read an article in less than half its estimated time
    const minAcceptableDuration = estReadMinutes * 60 * 0.5;
    if (durationSec < minAcceptableDuration) {
      // Log for moderation review
      await db.collection(`users/${uid}/private/flaggedRecords`).doc().set({
        uid,
        contentId,
        durationSec,
        estReadMinutes,
        minAcceptableDuration,
        reason: 'suspicious_duration',
        status: 'rejected',
        timestamp: FieldValue.serverTimestamp(),
      });
      throw new HttpsError(
        'failed-precondition',
        `Suspicious completion time: ${durationSec}s for ${estReadMinutes}-minute article`,
      );
    }

    // ── 7. Idempotency check ───────────────────────────────────────────────────
    const completionRef = db.doc(`users/${uid}/contentCompletions/${contentId}`);
    const completionSnap = await completionRef.get();

    if (completionSnap.exists) {
      const existing = completionSnap.data()!;
      if ((existing['completionPercent'] as number) >= 80) {
        return { ok: true, alreadyAwarded: true };
      }
    }

    // ── 8. Compute XP delta ────────────────────────────────────────────────────
    const xpDelta = computeXpDelta(durationSec, estReadMinutes);

    // ── 9. Write contentCompletion doc ────────────────────────────────────────
    await completionRef.set({
      uid,
      contentId,
      completionPercent,
      durationSec,
      xpDelta,
      completedAt: FieldValue.serverTimestamp(),
    });

    // ── 10. Publish to xp-events Pub/Sub topic ────────────────────────────────
    // xpAward (Plan 05) consumes this message and awards XP atomically.
    // We do NOT call xpAward directly — this is the single-publisher contract.
    const pubsub = getPubSub();
    const topicName = 'xp-events';
    const message = {
      type: 'content_completed' as const,
      uid,
      contentId,
      durationSec,
    };

    await pubsub.topic(topicName).publishMessage({
      json: message,
      attributes: {
        source: 'contentCompleted',
        uid,
      },
    });

    console.log(
      `[contentCompleted] uid=${uid} contentId=${contentId} durationSec=${durationSec} xpDelta=${xpDelta}`,
    );

    return { ok: true, xpAwarded: xpDelta };
  },
);
