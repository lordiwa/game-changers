/*
 * Plan 02-03 — Bot authentication middleware for Cloud Function endpoints.
 *
 * Verifies incoming bot→Function HTTP requests using:
 *   1. Authorization header format: HMAC-SHA256 t=<unix_seconds> sig=<hex>
 *   2. Timestamp drift ≤ 300s (replay protection — T-02-03-04)
 *   3. HMAC-SHA256(body, BOT_TO_FUNCTION_HMAC) === sig (timing-safe — T-02-03-03)
 *   4. IP allow-list: request.ip in BOT_STATIC_IPS (comma-separated; defence-in-depth)
 *
 * All 4 bot-callable endpoints (botGenerateLinkToken, botListUpcoming,
 * botGetProfile, botListEnrollments) use this middleware.
 *
 * Usage:
 *   import { withBotAuth } from '@gamechangers/functions-shared/botAuth';
 *   export const myEndpoint = onRequest({ region: 'southamerica-east1' }, withBotAuth(async (req, res, payload) => {
 *     // payload = req.body.payload, authenticated
 *   }));
 */
import type { Request, Response } from 'firebase-functions/v2/https';
import { verifyHmacSha256 } from './hmac.js';

type BotPayload = Record<string, unknown>;
type BotHandler = (req: Request, res: Response, payload: BotPayload) => Promise<void>;

/**
 * Middleware that wraps a Cloud Function handler with bot HMAC + IP authentication.
 */
export function withBotAuth(handler: BotHandler) {
  return async (req: Request, res: Response): Promise<void> => {
    // ─── 1. Parse Authorization header ────────────────────────────────────────
    const auth = req.header('Authorization') ?? '';
    const m = /^HMAC-SHA256 t=(\d+) sig=([a-f0-9]+)$/.exec(auth);
    if (!m) {
      res.status(401).json({ ok: false, error: 'MISSING_OR_INVALID_AUTH_HEADER' });
      return;
    }
    const [, tsStr, sig] = m;
    const ts = parseInt(tsStr!, 10);

    // ─── 2. Timestamp drift check (replay protection) ──────────────────────────
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - ts) > 300) {
      res.status(401).json({ ok: false, error: 'TIMESTAMP_DRIFT_TOO_LARGE' });
      return;
    }

    // ─── 3. HMAC-SHA256 verification (timing-safe via crypto.timingSafeEqual) ──
    // WR-11: verify against the raw, exact bytes the client signed. Re-running
    // JSON.stringify(req.body) on the parsed body is fragile to key ordering,
    // body-parser quirks, and middleware mutation. Cloud Functions v2 always
    // exposes the raw bytes as req.rawBody.
    const secret = process.env['BOT_TO_FUNCTION_HMAC'];
    if (!secret) {
      console.error('[withBotAuth] BOT_TO_FUNCTION_HMAC env var is not set');
      res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURATION' });
      return;
    }
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      res.status(400).json({ ok: false, error: 'MISSING_RAW_BODY' });
      return;
    }
    if (!verifyHmacSha256(rawBody, sig!, secret)) {
      res.status(401).json({ ok: false, error: 'HMAC_VERIFICATION_FAILED' });
      return;
    }

    // ─── 4. IP allow-list (defence-in-depth) ──────────────────────────────────
    const allowedIps = (process.env['BOT_STATIC_IPS'] ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (allowedIps.length > 0) {
      const requestIp = req.ip ?? '';
      if (!allowedIps.includes(requestIp)) {
        res.status(403).json({ ok: false, error: 'IP_NOT_ALLOWED' });
        return;
      }
    }

    // ─── 5. Delegate to handler with authenticated payload ────────────────────
    const payload = (req.body.payload ?? {}) as BotPayload;
    await handler(req, res, payload);
  };
}
