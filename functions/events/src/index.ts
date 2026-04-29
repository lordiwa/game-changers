// TODO(Plan 02-06 EVNT): RSVP, QR check-in, waitlist promotion via events-capacity-changed Pub/Sub.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
