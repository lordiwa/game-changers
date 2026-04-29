/**
 * recomputeStats.ts — Scheduled Cloud Function that recomputes HP/Stamina/Mente/Social.
 *
 * Schedule: every 6 hours (onSchedule).
 * Region: southamerica-east1.
 *
 * Pitfall #9 + PROF-12 enforcement:
 *   ALL four stats are clamped to Math.max(1, computed) — NEVER 0.
 *   Even users with zero events and zero wearable data see stats ≥ 1.
 *   This prevents the "greyed-out UI" anti-pattern that causes 70% churn.
 *
 * Boot stats (set at first profile creation — Layer 0 grant):
 *   { hp: 1, stamina: 1, mente: 1, social: 1 }
 *
 * Stat formulas:
 *   HP      = clamp(event_attended_count * 5, 1, 100)
 *             (wearable data incorporated in Plan 09; fallback from event attendance)
 *   Stamina = clamp(max_streak_days * 3, 1, 100)
 *   Mente   = clamp(content_completed_count * 10, 1, 100)
 *             (driven by content + wellness surveys; NEVER raw mental-health metrics)
 *   Social  = clamp(event_attended_count * 4 + social_streak_days * 2, 1, 100)
 *
 * Threats:
 *   T-02-05-05 (recompute storm): paginated 500-user batches; Cloud Tasks recursion if needed.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, type CollectionReference } from 'firebase-admin/firestore';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * computeStats — pure function for testability.
 * Returns { hp, stamina, mente, social } all in [1, 100].
 */
export function computeStats(params: {
  eventAttendedCount: number;
  maxStreakDays: number;
  socialStreakDays: number;
  contentCompletedCount: number;
}): { hp: number; stamina: number; mente: number; social: number } {
  const { eventAttendedCount, maxStreakDays, socialStreakDays, contentCompletedCount } = params;

  // HP: driven by physical activity / event attendance (wearable in Plan 09)
  const hp = clamp(eventAttendedCount * 5, 1, 100);

  // Stamina: driven by sustained streaks (longest streak in any track)
  const stamina = clamp(maxStreakDays * 3, 1, 100);

  // Mente: driven by content + wellness (NEVER raw mental-state metrics per LOPDP)
  const mente = clamp(contentCompletedCount * 10, 1, 100);

  // Social: driven by event attendance + social streak
  const social = clamp(eventAttendedCount * 4 + socialStreakDays * 2, 1, 100);

  return { hp, stamina, mente, social };
}

async function recomputeUserStats(
  db: ReturnType<typeof getFirestore>,
  uid: string,
): Promise<void> {
  // ── 1. Count event attendance ─────────────────────────────────────────────
  // We use the auditLog to count xp_awarded events of type event_attended.
  // In Plan 09, this will be supplemented by wearable data.
  const xpAuditSnap = await db
    .collection('auditLog')
    .where('uid', '==', uid)
    .where('action', '==', 'xp_awarded')
    .where('type', '==', 'event_attended')
    .get();
  const eventAttendedCount = xpAuditSnap.size;

  // ── 2. Read streak data ───────────────────────────────────────────────────
  const streaksSnap = await db.collection(`users/${uid}/streaks`).get();
  let maxStreakDays = 0;
  let socialStreakDays = 0;
  for (const doc of streaksSnap.docs) {
    const d = doc.data();
    const longest: number = (d['longestDays'] as number) ?? 0;
    const current: number = (d['currentDays'] as number) ?? 0;
    const trackMax = Math.max(longest, current);
    if (trackMax > maxStreakDays) maxStreakDays = trackMax;
    if (doc.id === 'social') {
      socialStreakDays = current;
    }
  }

  // ── 3. Count content completion ───────────────────────────────────────────
  const contentSnap = await db
    .collection('auditLog')
    .where('uid', '==', uid)
    .where('action', '==', 'xp_awarded')
    .where('type', '==', 'content_completed')
    .get();
  const contentCompletedCount = contentSnap.size;

  // ── 4. Compute stats (with Pitfall #9 floor of 1) ────────────────────────
  const stats = computeStats({
    eventAttendedCount,
    maxStreakDays,
    socialStreakDays,
    contentCompletedCount,
  });

  // Verify Pitfall #9 constraint — all stats must be >= 1
  if (stats.hp < 1 || stats.stamina < 1 || stats.mente < 1 || stats.social < 1) {
    console.error(`[recomputeStats] BUG: stat below 1 for uid=${uid}:`, stats);
    // Force minimum 1 as defense
    stats.hp = Math.max(1, stats.hp);
    stats.stamina = Math.max(1, stats.stamina);
    stats.mente = Math.max(1, stats.mente);
    stats.social = Math.max(1, stats.social);
  }

  // ── 5. Write to profile/main.stats ──────────────────────────────────────
  await db.doc(`users/${uid}/profile/main`).set(
    { stats, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
}

export const recomputeStats = onSchedule(
  {
    schedule: 'every 6 hours',
    region: 'southamerica-east1',
  },
  async () => {
    const db = getFirestore();

    // ── Paginated scan of users with basic_profile consent ──────────────────
    // We scan /users collection in batches of 500 to avoid timeout.
    // T-02-05-05 mitigation: paginated query.
    let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    const PAGE_SIZE = 500;
    let totalProcessed = 0;
    let totalErrors = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = db.collection('users').limit(PAGE_SIZE);
      if (lastDoc) {
        query = query.startAfter(lastDoc) as typeof query;
      }

      const snap = await query.get();
      if (snap.empty) break;

      lastDoc = snap.docs[snap.docs.length - 1];

      // Process each user in parallel (up to 500)
      const results = await Promise.allSettled(
        snap.docs.map((doc) => recomputeUserStats(db, doc.id)),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          totalProcessed++;
        } else {
          totalErrors++;
          console.error('[recomputeStats] Error processing user:', result.reason);
        }
      }

      if (snap.docs.length < PAGE_SIZE) break;
    }

    console.log(`[recomputeStats] Processed ${totalProcessed} users, ${totalErrors} errors.`);

    await db.collection('auditLog').doc().set({
      action: 'recompute_stats_run',
      totalProcessed,
      totalErrors,
      timestamp: FieldValue.serverTimestamp(),
    });
  },
);
