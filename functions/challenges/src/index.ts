// TODO(Plan 02-07 CHLG): Bronce/Plata/Oro tier challenges, manual + wearable progress entry.
import { initializeApp, getApps } from 'firebase-admin/app';
import { onRequest } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});

// Plan 02-03: bot-callable endpoint
export { botListEnrollments } from './botListEnrollments.js';
