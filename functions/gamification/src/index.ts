// TODO(Plan 02-05 PROF): XP awards, streak advance, level-up, Discord role sync.
// Subscribes to xp-events + level-up-events Pub/Sub topics.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
