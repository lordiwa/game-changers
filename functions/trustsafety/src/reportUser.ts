/*
 * Plan 02-07 — reportUser Cloud Function (trustsafety codebase).
 *
 * EVNT-13 GAP: Anonymous report-user flow. Caller's uid is stored in the report doc
 * under reporterUid (only accessible to moderators/DPO — not to the reportedUid).
 * The reported user NEVER receives a notification (anonymity to reported).
 *
 * Severity logic:
 *   self_harm → 'critical' (publish to crisis-alerts + Sentry + email founder)
 *   harassment → 'high'
 *   spam → 'low'
 *   other → 'medium'
 *
 * Rate limiting: 5 reports per day per uid (via counter doc).
 *
 * Threats:
 *   T-02-07-05: reportedUid NEVER gets /notifications write
 *   T-02-07-06: rate limit + basic_profile consent gate
 *   T-02-07-11: critical severity → crisis-alerts Pub/Sub + Sentry + email
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { PubSub } from '@google-cloud/pubsub';
import { consentGate } from '@gamechangers/functions-shared/ConsentEnforcement';
import { z } from 'zod';
import * as Sentry from '@sentry/node';

const ReportUserSchema = z.object({
  reportedUid: z.string().min(1),
  eventId: z.string().optional(),
  reason: z.enum(['harassment', 'spam', 'self_harm', 'other']),
  freeText: z.string().min(20).max(2000),
});

type Severity = 'critical' | 'high' | 'medium' | 'low';

function deriveSeverity(reason: string): Severity {
  switch (reason) {
    case 'self_harm': return 'critical';
    case 'harassment': return 'high';
    case 'other': return 'medium';
    case 'spam': return 'low';
    default: return 'medium';
  }
}

const RATE_LIMIT_PER_DAY = 5;

export const reportUser = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');

    // Must have an account to report (basic_profile consent)
    await consentGate(uid, 'basic_profile');

    const parsed = ReportUserSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { reportedUid, eventId, reason, freeText } = parsed.data;

    if (reportedUid === uid) {
      throw new HttpsError('invalid-argument', 'Cannot report yourself');
    }

    const db = getFirestore();

    // ── Rate limiting: 5 reports per day per reporter ─────────────────────────
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const rateLimitRef = db.doc(`users/${uid}/private/reportRateLimit`);
    const rateLimitSnap = await rateLimitRef.get();
    const rateLimitData = rateLimitSnap.data() ?? {};
    const todayCount: number = rateLimitData[today] ?? 0;

    if (todayCount >= RATE_LIMIT_PER_DAY) {
      throw new HttpsError(
        'resource-exhausted',
        'RATE_LIMIT_EXCEEDED: Maximum 5 reports per day',
      );
    }

    const severity = deriveSeverity(reason);

    // ── Write report doc ──────────────────────────────────────────────────────
    const reportRef = db.collection('reports').doc();
    await reportRef.set({
      reportId: reportRef.id,
      reporterUid: uid,          // only moderators/DPO can read this
      reportedUid,               // target of the report
      eventId: eventId ?? null,
      reason,
      freeText,
      severity,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await db.collection('auditLog').doc().set({
      action: 'report_user',
      actorUid: uid,
      targetUid: reportedUid,
      reportId: reportRef.id,
      severity,
      timestamp: FieldValue.serverTimestamp(),
    });

    // ── Update rate limit counter ─────────────────────────────────────────────
    await rateLimitRef.set(
      { [today]: FieldValue.increment(1) },
      { merge: true },
    );

    // ── Critical severity: escalation chain ──────────────────────────────────
    if (severity === 'critical') {
      // 1. Publish to crisis-alerts Pub/Sub (Phase 3 moderation dashboard)
      try {
        const pubsub = new PubSub();
        await pubsub.topic('crisis-alerts').publishMessage({
          data: Buffer.from(
            JSON.stringify({
              reportId: reportRef.id,
              severity,
              reason,
              eventId: eventId ?? null,
              createdAt: new Date().toISOString(),
              // NOTE: reporterUid and reportedUid intentionally NOT included
              // to protect both parties in the Pub/Sub message
            }),
          ),
        });
      } catch (err) {
        console.error('[reportUser] crisis-alerts publish failed:', err);
      }

      // 2. Sentry alert for immediate visibility
      Sentry.captureMessage(`CRITICAL REPORT: ${reason} — reportId=${reportRef.id}`, {
        level: 'fatal',
        tags: { reportId: reportRef.id, severity, reason },
      });

      // 3. Write a founder notification doc (no email SDK here — handled by Firestore trigger)
      await db.doc('system/crisisQueue').set(
        {
          pendingCrisisReports: FieldValue.arrayUnion(reportRef.id),
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    // IMPORTANT: reportedUid NEVER receives a notification — verified by test
    // We explicitly do NOT write to /users/{reportedUid}/notifications

    return { ok: true, reportId: reportRef.id };
  },
);
