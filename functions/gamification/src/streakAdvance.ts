/**
 * streakAdvance.ts — Pub/Sub subscriber on xp-events that advances per-track streaks.
 *
 * Subscribed to the SAME xp-events topic as xpAward (Cloud Functions allows
 * multiple subscribers per topic via separate function names).
 *
 * Streak rules (DC-07):
 *   - Each user has up to 4 streak tracks: fitness, social, knowledge, leadership.
 *   - event_attended         → social track
 *   - challenge_progress     → fitness track (if metric is steps/hr/sleep) | knowledge track otherwise
 *   - content_completed      → knowledge track
 *   - wellness_survey_completed → knowledge track
 *   - club_leadership        → leadership track (Phase 3)
 *   - referral               → social track
 *
 * Shield logic (DC-07):
 *   - 1 grace per 7-day window (windowStartedAt rolls every Monday).
 *   - If lastEventAt was 2+ days ago and shieldsRemaining >= 1: consume shield, advance day.
 *   - If lastEventAt was 2+ days ago and shieldsRemaining === 0: reset to 1.
 *   - If lastEventAt was yesterday: advance day.
 *   - If lastEventAt was today: no-op.
 */
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

// ── Message schema (matches xpAward schema shape; only type + uid needed) ───
const StreakEventSchema = z.object({
  type: z.enum([
    'event_attended',
    'challenge_progress',
    'content_completed',
    'club_leadership',
    'referral',
    'wellness_survey_completed',
  ]),
  uid: z.string(),
  metric: z.string().optional(),
});

type StreakTrack = 'fitness' | 'social' | 'knowledge' | 'leadership';

function determineTrack(msg: z.infer<typeof StreakEventSchema>): StreakTrack {
  switch (msg.type) {
    case 'event_attended':
      return 'social';
    case 'challenge_progress':
      // Fitness metrics: steps, heartRate, sleep, calories
      if (msg.metric && ['steps', 'heartRate', 'sleep', 'calories'].includes(msg.metric)) {
        return 'fitness';
      }
      return 'knowledge';
    case 'content_completed':
      return 'knowledge';
    case 'wellness_survey_completed':
      return 'knowledge';
    case 'club_leadership':
      return 'leadership';
    case 'referral':
      return 'social';
  }
}

function isMonday(date: Date): boolean {
  return date.getDay() === 1;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysDiff(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / msPerDay);
}

export const streakAdvance = onMessagePublished(
  {
    topic: 'xp-events',
    region: 'southamerica-east1',
  },
  async (event) => {
    // ── 1. Parse message ────────────────────────────────────────────────────
    let msg: z.infer<typeof StreakEventSchema>;
    try {
      const raw = event.data.message.json as unknown;
      msg = StreakEventSchema.parse(raw);
    } catch {
      console.error('[streakAdvance] Invalid message shape — skipping');
      return;
    }

    const { uid } = msg;
    const track = determineTrack(msg);
    const now = new Date();
    const db = getFirestore();
    const streakRef = db.doc(`users/${uid}/streaks/${track}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(streakRef);

      if (!snap.exists) {
        // ── New streak: initialize ───────────────────────────────────────
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Most recent Monday
        startOfDay(monday);

        tx.set(streakRef, {
          trackId: track,
          currentDays: 1,
          longestDays: 1,
          lastEventAt: Timestamp.fromDate(now),
          shieldsRemaining: 1,
          windowStartedAt: Timestamp.fromDate(monday),
        });
        await db.collection('auditLog').doc().set({
          action: 'streak_started',
          uid,
          track,
          currentDays: 1,
          timestamp: FieldValue.serverTimestamp(),
        });
        return;
      }

      const d = snap.data()!;
      const lastEventAt: Date = (d['lastEventAt'] as Timestamp).toDate();
      const windowStartedAt: Date = (d['windowStartedAt'] as Timestamp).toDate();
      let currentDays: number = d['currentDays'] as number;
      let longestDays: number = d['longestDays'] as number;
      let shieldsRemaining: number = d['shieldsRemaining'] as number;
      const diff = daysDiff(now, lastEventAt);

      // ── Weekly shield reset (every Monday) ──────────────────────────────
      const daysSinceWindowStart = daysDiff(now, windowStartedAt);
      if (daysSinceWindowStart >= 7 && isMonday(now)) {
        shieldsRemaining = 1;
        const newWindowStart = new Date(now);
        newWindowStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        startOfDay(newWindowStart);
        tx.set(
          streakRef,
          { shieldsRemaining: 1, windowStartedAt: Timestamp.fromDate(newWindowStart) },
          { merge: true },
        );
      }

      if (diff === 0) {
        // ── Already advanced today — no-op ────────────────────────────────
        return;
      } else if (diff === 1) {
        // ── Yesterday's event — advance streak ────────────────────────────
        currentDays++;
        if (currentDays > longestDays) longestDays = currentDays;
        tx.set(
          streakRef,
          {
            currentDays,
            longestDays,
            lastEventAt: Timestamp.fromDate(now),
          },
          { merge: true },
        );
        await db.collection('auditLog').doc().set({
          action: 'streak_advanced',
          uid,
          track,
          currentDays,
          diff,
          timestamp: FieldValue.serverTimestamp(),
        });
      } else {
        // ── 2+ day gap — check shield ────────────────────────────────────
        if (shieldsRemaining >= 1) {
          // Shield absorbs the gap
          shieldsRemaining--;
          currentDays++;
          if (currentDays > longestDays) longestDays = currentDays;
          tx.set(
            streakRef,
            {
              currentDays,
              longestDays,
              lastEventAt: Timestamp.fromDate(now),
              shieldsRemaining,
            },
            { merge: true },
          );
          await db.collection('auditLog').doc().set({
            action: 'streak_shield_used',
            uid,
            track,
            currentDays,
            shieldsRemaining,
            diff,
            timestamp: FieldValue.serverTimestamp(),
          });
        } else {
          // No shield — reset streak
          tx.set(
            streakRef,
            {
              currentDays: 1,
              lastEventAt: Timestamp.fromDate(now),
            },
            { merge: true },
          );
          await db.collection('auditLog').doc().set({
            action: 'streak_reset',
            uid,
            track,
            previousDays: currentDays,
            diff,
            timestamp: FieldValue.serverTimestamp(),
          });
        }
      }
    });

    console.log(`[streakAdvance] uid=${uid}, track=${track} updated`);
  },
);
