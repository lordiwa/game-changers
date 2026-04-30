// TODO(Phase 3 B2BD): partner-scoped queries, k≥50 anonymization gate, Metabase signed embedding.
// Phase 2 ships scaffolding only — no partner consumes this until Phase 3.
//
// Plan 02-09 Task 2: partnerEmbedJwt added — HS256 signed JWT for Metabase iframes.
// In Phase 2, only admin role can issue tokens (no real partner connected).
import { onRequest } from 'firebase-functions/v2/https';
export { partnerEmbedJwt } from './partnerEmbedJwt.js';

export const ping = onRequest({ region: 'southamerica-east1' }, (_req, res) => {
  res.status(200).send('ok');
});
