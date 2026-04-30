/*
 * Plan 02-03 — HMAC-signed HTTP client for bot→Function calls (ADR-001 §Security).
 *
 * Every call to a Cloud Function endpoint from the bot is signed with:
 *   Authorization: HMAC-SHA256 t=<unix_seconds> sig=<hmac_hex>
 *
 * The Function side uses withBotAuth (functions/shared/botAuth.ts) to verify:
 *   1. Header format matches /^HMAC-SHA256 t=\d+ sig=[a-f0-9]+$/
 *   2. Timestamp drift ≤ 300s (replay protection — T-02-03-04)
 *   3. HMAC-SHA256(body, BOT_TO_FUNCTION_HMAC) == sig (timing-safe — T-02-03-03)
 *   4. IP allow-list: request.ip in BOT_STATIC_IPS (defence-in-depth)
 *
 * The HMAC shared secret (BOT_TO_FUNCTION_HMAC) is:
 *   - Stored in /etc/gamechangers/bot.env (mode 0400) on the bot VM.
 *   - Stored as a Firebase Secret (GCP Secret Manager) on the Function side.
 *   - NEVER committed to the repository.
 */
import * as crypto from 'node:crypto';

// WR-13: validate the HMAC secret at module load. If it's missing the bot
// must fail fast at startup instead of TypeError'ing mid-command on the first
// signed call (which would clobber the catch path in callFunction).
const HMAC_SECRET = process.env['BOT_TO_FUNCTION_HMAC'];
if (!HMAC_SECRET) {
  throw new Error(
    '[functionClient] BOT_TO_FUNCTION_HMAC env var is not set. Configure it in /etc/gamechangers/bot.env (mode 0400) or your secret manager before starting the bot.',
  );
}

type FunctionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Call a bot-callable Cloud Function endpoint with HMAC-signed authentication.
 *
 * @param endpoint - Full HTTPS URL of the Cloud Function endpoint.
 * @param payload  - Request payload object (wrapped in { botTimestamp, payload }).
 * @returns        - Typed function result or error object.
 */
export async function callFunction<T = unknown>(
  endpoint: string,
  payload: unknown,
): Promise<FunctionResult<T>> {
  const ts = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ botTimestamp: ts, payload });

  const sig = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(body)
    .digest('hex');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Format: HMAC-SHA256 t=<unix_seconds> sig=<hex>
        Authorization: `HMAC-SHA256 t=${ts} sig=${sig}`,
      },
      body,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `NETWORK_ERROR: ${msg}` };
  }

  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}` };
  }

  return res.json() as Promise<FunctionResult<T>>;
}
