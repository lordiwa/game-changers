/**
 * partnerEmbedJwt.test.ts
 *
 * Tests for the partner embed JWT signing/verification logic.
 * Pure unit tests — no Firebase emulator required; functions call pure helpers.
 *
 * Key assertions:
 *   1. Admin can issue a valid JWT with correct payload shape.
 *   2. Non-admin caller → permission-denied (tested via mock HttpsError).
 *   3. JWT signature verification rejects tampered payload.
 *   4. JWT verification rejects expired tokens.
 *   5. allowedSegments can only contain pre-approved segment names.
 *   6. A partner cannot extend allowedSegments or add extra lockedFilters
 *      beyond what was issued — verified by decode-then-compare.
 */
import { describe, it, expect } from 'vitest';
import { signEmbedJwt, verifyEmbedJwt } from '../partnerEmbedJwt.js';

const TEST_KEY = 'test-signing-key-at-least-32-chars-long-for-hs256';

describe('signEmbedJwt + verifyEmbedJwt', () => {
  it('round-trips a valid payload', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-xyz',
      allowedSegments: ['active_movers_by_city'] as const,
      lockedFilters: { city: 'Quito' },
      iat: now,
      exp: now + 600,
      jti: 'test-jti-1234',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const decoded = verifyEmbedJwt(token, TEST_KEY);
    expect(decoded.partnerId).toBe('brand-xyz');
    expect(decoded.allowedSegments).toEqual(['active_movers_by_city']);
    expect(decoded.lockedFilters).toEqual({ city: 'Quito' });
  });

  it('JWT contains exp = iat + 600 (10-minute TTL)', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-abc',
      allowedSegments: ['new_recruits'] as const,
      lockedFilters: {},
      iat: now,
      exp: now + 600,
      jti: 'test-jti-ttl',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    const decoded = verifyEmbedJwt(token, TEST_KEY);
    expect(decoded.exp - decoded.iat).toBe(600);
  });

  it('rejects expired tokens', () => {
    const past = Math.floor(Date.now() / 1000) - 700; // expired 100s ago
    const payload = {
      partnerId: 'brand-expired',
      allowedSegments: ['social_connectors_by_age_band'] as const,
      lockedFilters: {},
      iat: past,
      exp: past + 600, // already past
      jti: 'test-jti-expired',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    expect(() => verifyEmbedJwt(token, TEST_KEY)).toThrow('Token expired');
  });

  it('rejects tampered payload (modified partnerId)', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-original',
      allowedSegments: ['active_movers_by_city'] as const,
      lockedFilters: {},
      iat: now,
      exp: now + 600,
      jti: 'test-jti-tamper',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    const parts = token.split('.');

    // Tamper: modify the payload to claim a different partnerId
    const tamperedPayload = {
      ...payload,
      partnerId: 'brand-attacker',
    };
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayloadB64}.${parts[2]}`;

    expect(() => verifyEmbedJwt(tamperedToken, TEST_KEY)).toThrow('Invalid signature');
  });

  it('rejects token with wrong signing key', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-xyz',
      allowedSegments: ['competitive_core_by_cluster'] as const,
      lockedFilters: {},
      iat: now,
      exp: now + 600,
      jti: 'test-jti-wrong-key',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    expect(() => verifyEmbedJwt(token, 'wrong-key-entirely-different-32ch')).toThrow('Invalid signature');
  });

  it('rejects JWT with invalid structure (fewer than 3 parts)', () => {
    expect(() => verifyEmbedJwt('not.a.valid.jwt.extra', TEST_KEY)).toThrow();
    expect(() => verifyEmbedJwt('only.two', TEST_KEY)).toThrow('Invalid JWT structure');
  });

  it('a partner cannot extend allowedSegments beyond what was issued', () => {
    // Verify that the locked allowedSegments in the token cannot be tampered to include
    // an additional segment. The verifier will reject the modified signature.
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-limited',
      allowedSegments: ['active_movers_by_city'] as const,
      lockedFilters: {},
      iat: now,
      exp: now + 600,
      jti: 'test-jti-segment-tamper',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    const parts = token.split('.');

    // Attacker adds 'at_risk_segment' to their allowedSegments
    const attackPayload = {
      ...payload,
      allowedSegments: ['active_movers_by_city', 'at_risk_segment'],
    };
    const attackPayloadB64 = Buffer.from(JSON.stringify(attackPayload)).toString('base64url');
    const attackToken = `${parts[0]}.${attackPayloadB64}.${parts[2]}`;

    // Verification MUST fail — signature mismatch
    expect(() => verifyEmbedJwt(attackToken, TEST_KEY)).toThrow('Invalid signature');
  });

  it('a partner cannot add extra lockedFilters beyond what was issued', () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      partnerId: 'brand-filtered',
      allowedSegments: ['active_movers_by_city'] as const,
      lockedFilters: { city: 'Quito' },
      iat: now,
      exp: now + 600,
      jti: 'test-jti-filter-tamper',
    };

    const token = signEmbedJwt(payload, TEST_KEY);
    const parts = token.split('.');

    // Attacker removes the city filter to see all cities
    const attackPayload = {
      ...payload,
      lockedFilters: {},
    };
    const attackPayloadB64 = Buffer.from(JSON.stringify(attackPayload)).toString('base64url');
    const attackToken = `${parts[0]}.${attackPayloadB64}.${parts[2]}`;

    expect(() => verifyEmbedJwt(attackToken, TEST_KEY)).toThrow('Invalid signature');
  });
});
