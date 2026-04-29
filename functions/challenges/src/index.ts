// TODO(Plan 02-07 CHLG): Bronce/Plata/Oro tier challenges, manual + wearable progress entry.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
