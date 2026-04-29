/*
 * Plan 02-03 — Bot-callable auth endpoint: botGenerateLinkToken
 *
 * Called by the Discord bot's /link command to generate a one-time JWT link token.
 * The JWT drives the bot↔PWA handoff (Plan 02-02 DiscordInit.vue contract).
 *
 * Security model:
 *   - Authenticated via withBotAuth (HMAC-SHA256 + timestamp drift ≤300s + IP allow-list).
 *   - JWT signed with HS256 using LINK_TOKEN_SECRET (symmetric shared secret).
 *   - JWT payload: { discordId, exp: now+600s (10min), iat, jti (UUID v4 for uniqueness) }
 *   - The PWA's useDiscordLink.ts decodes + verifies the JWT signature + exp before
 *     storing pending_discord_id in sessionStorage.
 *   - After Discord OAuth completes, discordExchange Function asserts
 *     oauthUser.id === pendingDiscordId (DISCORD_ID_MISMATCH on attack — T-02-02-11).
 *
 * Signing choice: HS256 (symmetric) with LINK_TOKEN_SECRET.
 *   - Simpler than RS256 (no key publishing endpoint needed).
 *   - The secret is shared between this Function and the PWA (via Firebase Hosting env /
 *     Firebase App Check verified callable).
 *   - Documented in 02-03-SUMMARY.md for Plan 02 to consume.
 *
 * The full linkUrl shape: https://gamechangers.gg/auth/discord/init?t=<JWT>
 * NOTE: path is /auth/discord/init (NOT /auth/discord/callback — callback is reserved
 * for Discord OAuth's redirect_uri).
 */
import { onRequest } from 'firebase-functions/v2/https';
import { withBotAuth } from '@gamechangers/functions-shared/botAuth';
import * as crypto from 'node:crypto';

// A minimal HS256 JWT implementation — avoids adding jose/jsonwebtoken to auth deps.
// Shape: base64url(header).base64url(payload).base64url(signature)
function base64url(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function signHs256(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

export const botGenerateLinkToken = onRequest(
  {
    region: 'southamerica-east1',
    cors: false, // bot-only endpoint — no browser CORS needed
  },
  withBotAuth(async (_req, res, payload) => {
    const { discordId, discordUsername } = payload as {
      discordId?: string;
      discordUsername?: string;
    };

    if (!discordId || typeof discordId !== 'string') {
      res.status(400).json({ ok: false, error: 'MISSING_DISCORD_ID' });
      return;
    }

    const secret = process.env['LINK_TOKEN_SECRET'];
    if (!secret) {
      console.error('[botGenerateLinkToken] LINK_TOKEN_SECRET env var is not set');
      res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURATION' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 600; // 10 minutes per DBOT-04
    const jti = crypto.randomUUID();

    const jwtPayload = {
      discordId,
      discordUsername: discordUsername ?? null,
      exp,
      iat: now,
      jti,
    };

    const token = signHs256(jwtPayload, secret);
    const baseUrl = process.env['PWA_BASE_URL'] ?? 'https://gamechangers.gg';
    const linkUrl = `${baseUrl}/auth/discord/init?t=${token}`;

    res.status(200).json({
      ok: true,
      data: {
        linkUrl,
        expiresAt: exp,
      },
    });
  }),
);
