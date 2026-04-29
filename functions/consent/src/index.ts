// TODO(Plan 02-04 CNST): grant(), revoke(), DSAR export, hash-chain ledger.
// Scaffolding only — Plan 04 wires runTransaction-backed grant/revoke.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
