/**
 * functions/gamification/src/index.ts — Gamification Cloud Functions.
 *
 * Pub/Sub subscribers (xp-events topic): xpAward, streakAdvance
 * Pub/Sub subscriber (level-up-events topic): discordRoleSync
 * HTTPS callable: badgeAward
 * Scheduled (every 6h): recomputeStats
 * Bot-callable HTTPS (Plan 02-03): botGetProfile, botPostWeeklyDigest
 */
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

// ── Plan 02-05: XP + streak + badge + Discord role sync + recomputeStats ───
export { xpAward } from './xpAward.js';
export { streakAdvance } from './streakAdvance.js';
export { badgeAward } from './badgeAward.js';
export { discordRoleSync } from './discordRoleSync.js';
export { recomputeStats } from './recomputeStats.js';

// ── Plan 02-03: bot-callable endpoints ────────────────────────────────────
export { botGetProfile } from './botGetProfile.js';
export { botPostWeeklyDigest } from './botPostWeeklyDigest.js';
