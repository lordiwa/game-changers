/**
 * seasonRollover.ts — Quarterly scheduled function for season transitions.
 *
 * Schedule: "0 0 1 1,4,7,10 *" (first day of Jan, Apr, Jul, Oct at 00:00 UTC)
 *
 * Steps:
 *   1. Mark current season enrollments as archived (season status field).
 *   2. Reset /leaderboards/season aggregate.
 *   3. Log the season rollover event for audit.
 *
 * Note: New challenges for the next season are created separately via
 * scripts/seed-challenges.ts using the next season's JSON file.
 * The seasonRollover function only performs the administrative cleanup.
 *
 * CHLG-12: Seasonal battle-pass progression resets at season boundaries.
 * Cosmetic rewards only — NEVER P2W advantages.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const REGION = 'southamerica-east1';

function getCurrentSeasonId(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3);
  return `${year}-q${quarter}`;
}

function getNextSeasonId(currentSeasonId: string): string {
  const [year, qPart] = currentSeasonId.split('-q');
  const q = parseInt(qPart, 10);
  if (q >= 4) {
    return `${parseInt(year, 10) + 1}-q1`;
  }
  return `${year}-q${q + 1}`;
}

export const seasonRolloverHandler = async (_event: unknown): Promise<void> => {
  const db = getFirestore();

  const currentSeasonId = getCurrentSeasonId();
  const nextSeasonId = getNextSeasonId(currentSeasonId);

  console.log(`[seasonRollover] Rolling over from ${currentSeasonId} to ${nextSeasonId}`);

  // 1. Archive current season: mark all enrollments from this season as archived
  // Use collectionGroup query scoped to the current season challenges
  const challengesSnap = await db
    .collection('challenges')
    .where('season', '==', currentSeasonId)
    .get();

  const archiveBatch = db.batch();
  let batchCount = 0;

  for (const challengeDoc of challengesSnap.docs) {
    // Mark challenge as archived
    archiveBatch.set(
      db.doc(`challenges/${challengeDoc.id}`),
      { archivedAt: FieldValue.serverTimestamp(), archived: true },
      { merge: true },
    );
    batchCount++;

    // Firestore batch limit: 500 ops
    if (batchCount >= 490) {
      await archiveBatch.commit();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await archiveBatch.commit();
  }

  // 2. Reset season leaderboard aggregate docs
  const leaderboardResets: Array<Promise<void>> = [];
  for (const cohort of ['global', 'quito', 'guayaquil', 'cuenca']) {
    const docId = `season_${cohort}`;
    leaderboardResets.push(
      db.collection('leaderboards').doc(docId).set({
        period: 'season',
        cohort,
        rows: [],
        rowCount: 0,
        seasonId: nextSeasonId,
        updatedAt: FieldValue.serverTimestamp(),
        resetReason: 'season_rollover',
        previousSeasonId: currentSeasonId,
      }),
    );
  }
  await Promise.all(leaderboardResets);

  // 3. Audit log
  await db.collection('auditLog').doc().set({
    action: 'season_rollover',
    previousSeasonId: currentSeasonId,
    newSeasonId: nextSeasonId,
    archivedChallenges: challengesSnap.size,
    timestamp: FieldValue.serverTimestamp(),
  });

  console.log(
    `[seasonRollover] Complete: archived ${challengesSnap.size} challenges, ` +
    `reset 4 season leaderboards. Next season: ${nextSeasonId}`,
  );
};

export const seasonRollover = onSchedule(
  {
    schedule: '0 0 1 1,4,7,10 *',
    region: REGION,
    timeZone: 'UTC',
  },
  seasonRolloverHandler,
);
