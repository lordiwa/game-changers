/*
 * Plan 02-07 — postEventFeedback Cloud Function.
 *
 * NPS + qualitative + optional wellness self-report post-event feedback.
 * Wellness portion gated by health_self_reports consent (Layer 2).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { consentGate } from '@gamechangers/functions-shared/ConsentEnforcement';
import { z } from 'zod';

const FeedbackSchema = z.object({
  eventId: z.string().min(1),
  nps: z.number().int().min(0).max(10),
  qualitative: z.string().max(1000).optional(),
  wellness: z
    .object({
      stress: z.number().min(1).max(10),
      social: z.number().min(1).max(10),
    })
    .optional(),
});

export const postEventFeedback = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');

    const parsed = FeedbackSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { eventId, nps, qualitative, wellness } = parsed.data;

    // Wellness self-report requires health_self_reports consent
    if (wellness !== undefined) {
      await consentGate(uid, 'health_self_reports');
    }

    const db = getFirestore();
    await db.doc(`events/${eventId}/feedback/${uid}`).set({
      uid,
      eventId,
      nps,
      qualitative: qualitative ?? null,
      wellness: wellness ?? null,
      submittedAt: FieldValue.serverTimestamp(),
    });

    // Publish wellness_survey_completed to xp-events if wellness provided
    if (wellness !== undefined) {
      try {
        const { PubSub } = await import('@google-cloud/pubsub');
        const pubsub = new PubSub();
        await pubsub.topic('xp-events').publishMessage({
          data: Buffer.from(
            JSON.stringify({
              type: 'wellness_survey_completed',
              uid,
              surveyId: `event_feedback_${eventId}`,
            }),
          ),
        });
      } catch (err) {
        console.error('[postEventFeedback] xp-events publish failed (non-fatal):', err);
      }
    }

    return { ok: true };
  },
);
