/**
 * leaderboardCompute.ts — Scheduled function that computes leaderboards every 15 minutes.
 *
 * Architecture (CHLG-09, Pitfall #2):
 *   - Runs every 15 minutes via onSchedule.
 *   - For each (period × cohort) pair:
 *       1. Queries /users/<all>/challengeProgress collectionGroup.
 *       2. Aggregates top 100 opted-in users by total value.
 *       3. Renders anonymous users as "Anónimo #N".
 *       4. Writes ONE aggregate doc to /leaderboards/{period}_{cohort}.
 *   - Clients NEVER query /challengeProgress collectionGroup directly.
 *   - Clients subscribe to /leaderboards/{period}_{cohort} — ONE doc subscription.
 *
 * Cost mitigation:
 *   - This is the ONLY server-side scan of the challengeProgress collectionGroup.
 *   - At scale (>10K DAU), move to BigQuery aggregation (Phase 3 trigger).
 *
 * Threats mitigated:
 *   T-02-08-03 (DoS via client onSnapshot on collection)
 *   T-02-08-07 (DoS via millions of progress records per client)
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

const PERIODS = ['weekly', 'monthly', 'season'] as const;
const COHORTS = ['global', 'quito', 'guayaquil', 'cuenca'] as const;
const MAX_ROWS = 100;
const REGION = 'southamerica-east1';

type Period = typeof PERIODS[number];
type Cohort = typeof COHORTS[number];

function getPeriodStart(period: Period): Date {
  const now = new Date();
  switch (period) {
    case 'weekly': {
      const day = now.getUTCDay(); // 0=Sun, 1=Mon,...
      const monday = new Date(now);
      monday.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
      monday.setUTCHours(0, 0, 0, 0);
      return monday;
    }
    case 'monthly': {
      return new Date(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0);
    }
    case 'season': {
      // Q2 2026 season starts 2026-04-01
      return new Date('2026-04-01T00:00:00Z');
    }
  }
}

interface ProgressRow {
  uid: string;
  displayName: string;
  anonymousLeaderboard: boolean;
  optInLeaderboard: boolean;
  value: number;
  city: string;
}

interface LeaderboardRow {
  uid: string;
  displayName: string;
  anonymous: boolean;
  rank: number;
  value: number;
  tier: string;
}

async function computeLeaderboardForPeriodCohort(
  db: ReturnType<typeof getFirestore>,
  period: Period,
  cohort: Cohort,
): Promise<void> {
  const periodStart = getPeriodStart(period);
  const startTimestamp = Timestamp.fromDate(periodStart);

  // Query all opted-in progress docs within the period window
  // NOTE: This is the ONLY place that scans the challengeProgress collectionGroup.
  // Clients NEVER do this scan.
  const progressSnap = await db
    .collectionGroup('challengeProgress')
    .where('status', 'in', ['ok', 'flagged'])
    .where('recordedAt', '>=', startTimestamp)
    .orderBy('recordedAt', 'desc')
    .limit(5000)  // Reasonable cap; Phase 3 moves to BigQuery at >10K
    .get();

  // Aggregate by uid (sum values per user, city-filter for cohort)
  const userMap = new Map<string, ProgressRow>();

  for (const doc of progressSnap.docs) {
    const data = doc.data();
    if (!data['optInLeaderboard']) continue;  // Respect opt-out

    // Cohort filter: global includes all; city cohorts filter by city
    const city = (data['city'] as string) ?? 'other';
    if (cohort !== 'global' && city !== cohort) continue;

    const uid = data['uid'] as string;
    if (!uid) continue;

    const existing = userMap.get(uid);
    const value = (data['value'] as number) ?? 0;

    if (existing) {
      existing.value += value;
    } else {
      userMap.set(uid, {
        uid,
        displayName: (data['displayName'] as string) ?? `User ${uid.slice(0, 8)}`,
        anonymousLeaderboard: (data['anonymousLeaderboard'] as boolean) ?? false,
        optInLeaderboard: true,
        value,
        city,
      });
    }
  }

  // Sort by value descending, take top 100
  const sorted = Array.from(userMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, MAX_ROWS);

  // Build leaderboard rows with anonymous masking
  const rows: LeaderboardRow[] = sorted.map((user, index) => ({
    uid: user.uid,
    displayName: user.anonymousLeaderboard
      ? `Anónimo #${index + 1}`
      : user.displayName,
    anonymous: user.anonymousLeaderboard,
    rank: index + 1,
    value: user.value,
    tier: '', // Will be enriched in Phase 3 when enrollment data is joined
  }));

  // Write ONE aggregate doc
  const docId = `${period}_${cohort}`;
  const leaderboardRef = db.collection('leaderboards').doc(docId);

  await leaderboardRef.set({
    period,
    cohort,
    updatedAt: FieldValue.serverTimestamp(),
    rows,
    rowCount: rows.length,
    periodStartedAt: startTimestamp,
  });
}

export const recomputeLeaderboardsHandler = async (_event: unknown): Promise<void> => {
  const db = getFirestore();

  const tasks: Array<Promise<void>> = [];

  for (const period of PERIODS) {
    for (const cohort of COHORTS) {
      tasks.push(
        computeLeaderboardForPeriodCohort(db, period, cohort).catch((err: unknown) => {
          // Non-fatal per cohort: log but don't fail the whole run
          console.error(`[leaderboardCompute] Error computing ${period}_${cohort}:`, err);
        }),
      );
    }
  }

  await Promise.all(tasks);

  console.log(`[leaderboardCompute] Recomputed ${PERIODS.length * COHORTS.length} leaderboard docs`);
};

export const recomputeLeaderboards = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: REGION,
    timeZone: 'America/Guayaquil',
  },
  recomputeLeaderboardsHandler,
);
