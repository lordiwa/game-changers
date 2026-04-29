// TODO(Plan 02-02 AUTH): Discord OAuth bridge, account linking, anonymous→full upgrade.
// This codebase ships scaffolding only — Plan 02 wires the actual endpoints.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
