/**
 * functions/challenges/src/index.ts — Challenge Cloud Functions entry point.
 *
 * Cloud Functions (Plan 02-08):
 *   - createChallenge:       Admin-only callable to create a challenge doc
 *   - enrollChallenge:       User callable to enroll in a challenge tier
 *   - logProgress:           Single write path for manual/pedometer/wearable/photo progress
 *   - recomputeLeaderboards: Scheduled every 15 min to build aggregate leaderboard docs
 *   - seasonRollover:        Quarterly cleanup + archive of completed season challenges
 *
 * Plan 02-03 (Discord bot read endpoints):
 *   - botListEnrollments:    Read-only endpoint for the Discord bot
 */
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

// Challenge CRUD + progress logging
export { createChallenge } from './createChallenge.js';
export { enrollChallenge } from './enrollChallenge.js';
export { logProgress } from './logProgress.js';

// Scheduled aggregation
export { recomputeLeaderboards } from './leaderboardCompute.js';
export { seasonRollover } from './seasonRollover.js';

// Discord bot read endpoint (Plan 02-03)
export { botListEnrollments } from './botListEnrollments.js';
