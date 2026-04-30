/**
 * partnerEmbedJwt.ts — Signed JWT for Metabase iframe embedding.
 *
 * Generates a short-lived HS256 JWT that Metabase verifies for per-partner
 * row-level filter enforcement. The JWT contains locked filter parameters so
 * a partner cannot see another partner's data or expand their allowed segments.
 *
 * Phase 2 status: scaffolding only. In Phase 2 only admin users can test-issue
 * tokens. No real partner is connected. Phase 3 will gate via partner consent
 * verification and partner-claim issuance.
 *
 * JWT payload:
 *   { partnerId, allowedSegments[], lockedFilters{}, exp, iat, jti }
 *
 * Security constraints:
 *   - Signing key: PARTNER_EMBED_SIGNING_KEY from Secret Manager (defineSecret).
 *   - Algorithm: HS256 only. No RS256 (eliminates key-confusion attacks).
 *   - TTL: 600 seconds (10 minutes). Metabase rejects expired tokens.
 *   - jti: random UUID prevents replay of identical payloads.
 *   - allowedSegments is LOCKED in the token — caller cannot extend it.
 *   - lockedFilters is LOCKED — caller cannot pass extra filters.
 *   - Only admin role can issue tokens in Phase 2 (gated by request.auth.token.role).
 *
 * T-02-09-04 mitigation: locked filters + short TTL limit information disclosure.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { z } from 'zod';
import { createHmac, randomUUID } from 'node:crypto';

const PARTNER_EMBED_SIGNING_KEY = defineSecret('PARTNER_EMBED_SIGNING_KEY');

// Allowed segment names (Phase 3 expands this list as segments are validated)
const ALLOWED_SEGMENT_VALUES = [
  'active_movers_by_city',
  'social_connectors_by_age_band',
  'competitive_core_by_cluster',
  'new_recruits',
  'at_risk_segment',
] as const;

type AllowedSegment = typeof ALLOWED_SEGMENT_VALUES[number];

const InputSchema = z.object({
  partnerId: z.string().min(1).max(64),
  allowedSegments: z.array(
    z.enum(ALLOWED_SEGMENT_VALUES)
  ).min(1).max(5),
  lockedFilters: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

type PartnerEmbedPayload = {
  partnerId: string;
  allowedSegments: AllowedSegment[];
  lockedFilters: Record<string, string | number | boolean>;
  iat: number;
  exp: number;
  jti: string;
};

/**
 * signEmbedJwt — pure function for testability.
 * Creates a HS256 JWT using node:crypto (no jwt library dependency).
 */
export function signEmbedJwt(
  payload: PartnerEmbedPayload,
  signingKey: string,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const b64url = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const signature = createHmac('sha256', signingKey)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
}

/**
 * verifyEmbedJwt — pure function for testability.
 * Returns the decoded payload if valid, throws if invalid.
 */
export function verifyEmbedJwt(
  token: string,
  signingKey: string,
): PartnerEmbedPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT structure');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const expectedSig = createHmac('sha256', signingKey)
    .update(signingInput)
    .digest('base64url');

  // Timing-safe comparison
  const expected = Buffer.from(expectedSig);
  const actual = Buffer.from(signatureB64 ?? '');
  if (
    expected.length !== actual.length ||
    !require('node:crypto').timingSafeEqual(expected, actual)
  ) {
    throw new Error('Invalid signature');
  }

  const decoded = JSON.parse(Buffer.from(payloadB64 ?? '', 'base64url').toString()) as PartnerEmbedPayload;

  // Check expiry
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (decoded.exp < nowSeconds) {
    throw new Error('Token expired');
  }

  return decoded;
}

/**
 * partnerEmbedJwt — HTTPS callable Cloud Function.
 *
 * Phase 2: only admin role can issue tokens.
 * Phase 3: add partner-claim gating + partner consent verification.
 */
export const partnerEmbedJwt = onCall(
  {
    region: 'southamerica-east1',
    secrets: [PARTNER_EMBED_SIGNING_KEY],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    // Phase 2: admin-only gate. Phase 3: add partner claim.
    const callerRole = request.auth.token['role'] as string | undefined;
    if (callerRole !== 'admin') {
      throw new HttpsError(
        'permission-denied',
        'Only admin role can issue partner embed tokens in Phase 2. Phase 3 will support partner-claim gating.',
      );
    }

    // Validate input
    const parseResult = InputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.issues);
    }
    const { partnerId, allowedSegments, lockedFilters } = parseResult.data;

    const signingKey = PARTNER_EMBED_SIGNING_KEY.value();
    if (!signingKey) {
      throw new HttpsError('internal', 'Signing key not configured');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload: PartnerEmbedPayload = {
      partnerId,
      allowedSegments: allowedSegments as AllowedSegment[],
      lockedFilters,
      iat: nowSeconds,
      exp: nowSeconds + 600, // 10-minute TTL
      jti: randomUUID(),
    };

    const token = signEmbedJwt(payload, signingKey);

    return { token, expiresAt: payload.exp };
  },
);
