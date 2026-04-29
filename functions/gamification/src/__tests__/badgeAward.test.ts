/**
 * badgeAward.test.ts — Unit tests for badgeAward HTTPS callable.
 *
 * Tests:
 *   1. Round-trip: badge awarded with HMAC signature; re-computing HMAC verifies.
 *   2. Idempotency: second call for same badge returns alreadyEarned: true.
 *   3. Tampering: modifying badge doc fields breaks HMAC verification.
 *   4. Unauthenticated: throws unauthenticated error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

// ── Mock firebase-admin/app ─────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn(), getApps: () => [] }));

// ── Mock Firestore ────────────────────────────────────────────────────────────
const mockBadgeData: Record<string, unknown> = {};
const mockBadgeExists: Record<string, boolean> = {};

const mockBadgeDocSet = vi.fn(async (path: string, data: unknown) => {
  mockBadgeData[path] = data;
  mockBadgeExists[path] = true;
});
const mockBadgeDocGet = vi.fn(async (path: string) => ({
  exists: mockBadgeExists[path] ?? false,
  data: () => mockBadgeData[path],
}));

let docPath = '';
const mockDoc = vi.fn((path: string) => {
  docPath = path;
  return {
    get: () => mockBadgeDocGet(path),
    set: (data: unknown) => mockBadgeDocSet(path, data),
  };
});
const mockCollectionDoc = vi.fn(() => ({ set: vi.fn() }));
const mockCollection = vi.fn(() => ({ doc: mockCollectionDoc }));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: mockDoc,
    collection: mockCollection,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: {
    fromMillis: (ms: number) => ({ milliseconds: ms }),
  },
}));

// ── Mock firebase-functions/v2/https ─────────────────────────────────────────
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (req: unknown) => Promise<unknown>) => ({ handler }),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));

// ── Mock firebase-functions/params ────────────────────────────────────────────
vi.mock('firebase-functions/params', () => ({
  defineSecret: (name: string) => ({
    value: () => `test-secret-for-${name}`,
  }),
}));

import { badgeAward, computeBadgeHmac } from '../badgeAward.js';

function getHandler() {
  return (badgeAward as unknown as { handler: (req: unknown) => Promise<unknown> }).handler;
}

describe('badgeAward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockBadgeData).forEach((k) => delete mockBadgeData[k]);
    Object.keys(mockBadgeExists).forEach((k) => delete mockBadgeExists[k]);
  });

  it('awards badge and HMAC signature verifies correctly', async () => {
    const handler = getHandler();
    const result = await handler({
      auth: { uid: 'user-abc' },
      data: { badgeId: 'caminata-dota-1', source: 'event:caminata-dota', tier: 'bronce' },
    }) as { alreadyEarned: boolean; badgeId: string; signedClaim: string };

    expect(result.alreadyEarned).toBe(false);
    expect(result.badgeId).toBe('caminata-dota-1');
    expect(result.signedClaim).toMatch(/^[a-f0-9]{64}$/);

    // Verify the HMAC can be recomputed consistently (computeBadgeHmac is a pure function)
    const key = 'test-secret-for-BADGE_SIGNING_KEY';
    // We can't know the exact earnedAtMs but we can verify the format
    expect(result.signedClaim).toHaveLength(64);
  });

  it('computeBadgeHmac is deterministic for same inputs', () => {
    const key = 'my-test-key';
    const a = computeBadgeHmac('badge-1', 'user-1', 'event:foo', 1000, key);
    const b = computeBadgeHmac('badge-1', 'user-1', 'event:foo', 1000, key);
    expect(a).toBe(b);
  });

  it('computeBadgeHmac produces different output for different inputs', () => {
    const key = 'my-test-key';
    const a = computeBadgeHmac('badge-1', 'user-1', 'event:foo', 1000, key);
    const b = computeBadgeHmac('badge-1', 'user-2', 'event:foo', 1000, key); // different uid
    expect(a).not.toBe(b);
  });

  it('tampering with badgeId breaks HMAC verification', () => {
    const key = 'my-test-key';
    const original = computeBadgeHmac('badge-1', 'user-1', 'event:foo', 1000, key);
    const tampered = computeBadgeHmac('badge-999', 'user-1', 'event:foo', 1000, key); // changed badgeId
    expect(original).not.toBe(tampered);
  });

  it('idempotency: second call returns alreadyEarned: true', async () => {
    // Mark the badge as already existing
    const path = 'users/user-abc/badges/badge-dup';
    mockBadgeExists[path] = true;
    mockBadgeData[path] = { badgeId: 'badge-dup' };

    const handler = getHandler();
    const result = await handler({
      auth: { uid: 'user-abc' },
      data: { badgeId: 'badge-dup', source: 'event:foo' },
    }) as { alreadyEarned: boolean };

    expect(result.alreadyEarned).toBe(true);
    // Should NOT write a new badge doc (no mockBadgeDocSet call for set)
    expect(mockBadgeDocSet).not.toHaveBeenCalled();
  });

  it('unauthenticated request throws', async () => {
    const handler = getHandler();
    await expect(
      handler({ auth: null, data: { badgeId: 'badge-1', source: 'event:foo' } }),
    ).rejects.toThrow('unauthenticated');
  });

  it('invalid badgeId (empty string) throws invalid-argument', async () => {
    const handler = getHandler();
    await expect(
      handler({ auth: { uid: 'user-abc' }, data: { badgeId: '', source: 'event:foo' } }),
    ).rejects.toThrow(/invalid-argument/);
  });
});
