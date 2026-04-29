// TODO(Phase 3 B2BD): partner-scoped queries, k≥50 anonymization gate, Metabase signed embedding.
// Phase 2 ships scaffolding only — no partner consumes this until Phase 3.
import { onRequest } from 'firebase-functions/v2/https';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
