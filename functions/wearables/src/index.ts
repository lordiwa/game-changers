// TODO(Plan 02-08 WEAR): Open Wearables HMAC webhook, healthSamples writer, daily aggregate.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
