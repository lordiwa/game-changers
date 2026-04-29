// TODO(Plan 02-05 PROF): XP awards, streak advance, level-up, Discord role sync.
// Subscribes to xp-events + level-up-events Pub/Sub topics.
import { initializeApp, getApps } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});

// Plan 02-03: bot-callable endpoints
export { botGetProfile } from './botGetProfile.js';
export { botPostWeeklyDigest } from './botPostWeeklyDigest.js';
