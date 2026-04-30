/*
 * Plan 02-02 Task 2 — useDiscordLink composable.
 *
 * Handles the full Discord OAuth client-side flow:
 *   1. decodeLinkToken — verifies the JWT from the bot's /link command (T-02-02-12).
 *   2. startDiscordLink — generates PKCE + state, redirects to Discord OAuth.
 *   3. handleDiscordCallback — exchanges code via discordExchange Cloud Function,
 *      then signs in with the returned custom token.
 *
 * Security:
 *   - PKCE: code_challenge = BASE64URL(SHA-256(code_verifier)) per RFC 7636.
 *   - state: 32-byte random hex; validated on return to prevent CSRF.
 *   - pendingDiscordId: stashed in sessionStorage; passed to discordExchange for
 *     server-side assertion (T-02-02-11 — handoff hijack mitigation).
 *   - JWT signature verification in decodeLinkToken against bot's public key
 *     (T-02-02-12 — forged linkToken mitigation).
 */
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { firebaseApp } from '../firebase';

const functions = getFunctions(firebaseApp, 'southamerica-east1');
const auth = getAuth(firebaseApp);

const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID as string;
const DISCORD_REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI as string;

// sessionStorage keys
const SS_STATE = 'discord_oauth_state';
const SS_PKCE_VERIFIER = 'discord_pkce_verifier';
const SS_PENDING_DISCORD_ID = 'pending_discord_id';

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

function generateVerifier(): string {
  // RFC 7636 §4.1: 43–128 chars, unreserved ASCII (A-Z / a-z / 0-9 / - . _ ~)
  const bytes = randomBytes(64);
  return base64url(bytes.buffer).slice(0, 128);
}

async function verifierToChallenge(verifier: string): Promise<string> {
  return base64url(await sha256(verifier));
}

// ─── JWT utilities (minimal — no external library) ────────────────────────────

interface LinkTokenPayload {
  discordId: string;
  exp: number;
}

/**
 * decodeLinkToken — verifies the signed linkToken JWT from the Discord bot's /link command.
 *
 * Expected format: <header_b64url>.<payload_b64url>.<signature_b64url>
 * Signature algorithm: RS256 (RSASSA-PKCS1-v1_5 + SHA-256).
 * Public key: fetched from /.well-known/bot-link-key.json (a JWKS endpoint seeded by Plan 03).
 *
 * T-02-02-12: throws on signature mismatch, expired token (exp > now+600s is rejected too —
 * the bot issues tokens for exactly 600s, so anything beyond that is replayed or forged).
 */
export async function decodeLinkToken(token: string): Promise<{ discordId: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('INVALID_LINK_TOKEN');

  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  // Decode payload (URL-safe base64 → JSON).
  const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  const payload = JSON.parse(payloadJson) as LinkTokenPayload;

  if (!payload.discordId || typeof payload.exp !== 'number') {
    throw new Error('INVALID_LINK_TOKEN_PAYLOAD');
  }

  // Expiry check: token must not be expired, and exp must be within now+600s
  // (prevents replay of a token issued for a different link session).
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('LINK_TOKEN_EXPIRED');
  if (payload.exp > now + 600) throw new Error('LINK_TOKEN_EXP_TOO_FAR');

  // Signature verification against bot public key.
  // The JWKS endpoint is served by the PWA's Hosting at /.well-known/bot-link-key.json
  // (seeded by Plan 03 which writes the bot service-account public key there).
  // WR-12: signature verification is mandatory in ALL environments. The previous
  // dev-mode bypass made forged tokens pass `decodeLinkToken` silently, which
  // could mask integration bugs and allowed dev machines to forge tokens that
  // hit live Functions.
  let publicKey: CryptoKey;
  try {
    const jwksResp = await fetch('/.well-known/bot-link-key.json');
    if (!jwksResp.ok) throw new Error('JWKS_FETCH_FAILED');
    const jwks = (await jwksResp.json()) as { keys?: JsonWebKey[] };
    const jwk = (jwks.keys?.[0] ?? jwks) as JsonWebKey;
    publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    throw new Error('JWKS_UNAVAILABLE');
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), (c) =>
    c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    publicKey,
    sigBytes,
    new TextEncoder().encode(signingInput),
  );
  if (!valid) throw new Error('LINK_TOKEN_SIGNATURE_INVALID');

  return { discordId: payload.discordId };
}

// ─── OAuth flow ───────────────────────────────────────────────────────────────

/**
 * startDiscordLinkFromBotToken — entry point for the /auth/discord/init route.
 * Decodes + verifies the linkToken JWT, stashes discordId in sessionStorage as
 * pending_discord_id, then proceeds to startDiscordLink().
 *
 * T-02-02-11 mitigation: pendingDiscordId is passed to discordExchange on callback;
 * the Function asserts oauthUser.id === pendingDiscordId.
 */
export async function startDiscordLinkFromBotToken(linkTokenJwt: string): Promise<void> {
  const { discordId } = await decodeLinkToken(linkTokenJwt);
  sessionStorage.setItem(SS_PENDING_DISCORD_ID, discordId);
  await startDiscordLink();
}

/**
 * startDiscordLink — generates PKCE verifier + state, stashes both in sessionStorage,
 * then redirects to Discord OAuth (same tab).
 */
export async function startDiscordLink(): Promise<void> {
  const verifier = generateVerifier();
  const challenge = await verifierToChallenge(verifier);
  const state = toHex(randomBytes(32));

  sessionStorage.setItem(SS_PKCE_VERIFIER, verifier);
  sessionStorage.setItem(SS_STATE, state);

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    scope: 'identify email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: DISCORD_REDIRECT_URI,
  });
  window.location.href = `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

/**
 * handleDiscordCallback — called by DiscordCallback.vue on OAuth return.
 *
 * Reads state + pkceVerifier from sessionStorage, verifies state matches, calls
 * the discordExchange Cloud Function with pendingDiscordId (if present), then
 * signs in with the returned custom token.
 *
 * T-02-02-11 mitigation: pendingDiscordId is forwarded to the Function for
 * server-side identity assertion; mismatch returns DISCORD_ID_MISMATCH error.
 */
export async function handleDiscordCallback({
  code,
  state,
}: {
  code: string;
  state: string;
}): Promise<void> {
  const storedState = sessionStorage.getItem(SS_STATE);
  const pkceVerifier = sessionStorage.getItem(SS_PKCE_VERIFIER);
  const pendingDiscordId = sessionStorage.getItem(SS_PENDING_DISCORD_ID) ?? undefined;

  // CSRF check.
  if (!storedState || state !== storedState) {
    throw new Error('OAUTH_STATE_MISMATCH');
  }
  if (!pkceVerifier) {
    throw new Error('PKCE_VERIFIER_MISSING');
  }

  // Get the current user's ID token (may be anonymous — passes uid for ADR-008 preservation).
  const firebaseIdToken = (await auth.currentUser?.getIdToken()) ?? undefined;

  const discordExchangeFn = httpsCallable<
    {
      code: string;
      state: string;
      pkceVerifier: string;
      firebaseIdToken?: string;
      pendingDiscordId?: string;
    },
    { customToken: string; isExistingUser: boolean }
  >(functions, 'discordExchange');

  const result = await discordExchangeFn({
    code,
    state,
    pkceVerifier,
    firebaseIdToken,
    pendingDiscordId,
  });

  // Sign in with the custom token returned by the Function.
  await signInWithCustomToken(auth, result.data.customToken);

  // Clear sessionStorage — the flow is complete.
  sessionStorage.removeItem(SS_STATE);
  sessionStorage.removeItem(SS_PKCE_VERIFIER);
  sessionStorage.removeItem(SS_PENDING_DISCORD_ID);
}

export { SS_PENDING_DISCORD_ID as PENDING_DISCORD_ID_KEY };
