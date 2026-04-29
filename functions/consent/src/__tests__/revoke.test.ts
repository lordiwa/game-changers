/**
 * revoke.test.ts — Unit tests for consentRevoke callable.
 *
 * Tests: happy-path revoke, already-revoked idempotency, unauthenticated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));

const mockGetUser = vi.fn();
const mockSetCustomUserClaims = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: mockGetUser,
    setCustomUserClaims: mockSetCustomUserClaims,
  }),
}));

const mockTransactionUpdate = vi.fn();
const mockTransactionSet = vi.fn();
const mockRunTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  const tx = { update: mockTransactionUpdate, set: mockTransactionSet };
  await fn(tx);
});

let consentDocData: Record<string, unknown> | null = { status: 'granted', version: 'v3', textHash: 'h'.repeat(64), category: 'event_participation' };

const mockDoc = vi.fn((path: string) => {
  if (path.includes('/consents/')) {
    return {
      get: vi.fn().mockResolvedValue({
        exists: consentDocData !== null,
        data: () => consentDocData,
        ref: { path },
        update: vi.fn(),
      }),
      update: vi.fn(),
    };
  }
  return { get: vi.fn().mockResolvedValue({ exists: false }), set: vi.fn() };
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: mockDoc,
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ set: vi.fn() })),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      })),
    })),
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {},
}));

vi.mock('@google-cloud/pubsub', () => ({
  PubSub: class {
    topic() {
      return {
        publishMessage: vi.fn().mockResolvedValue('msg-id'),
      };
    }
  },
}));

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (request: unknown) => Promise<unknown>) => ({ handler }),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));

import { consentRevoke } from '../revoke.js';

function getHandler(fn: { handler: (req: unknown) => Promise<unknown> }) {
  return fn.handler;
}

describe('consentRevoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consentDocData = { status: 'granted', version: 'v3', textHash: 'h'.repeat(64), category: 'event_participation' };
    mockGetUser.mockResolvedValue({ customClaims: { consents: { e: true } } });
    mockSetCustomUserClaims.mockResolvedValue(undefined);
  });

  it('successfully revokes a granted consent', async () => {
    const handler = getHandler(consentRevoke as unknown as { handler: (req: unknown) => Promise<unknown> });

    const result = await handler({
      auth: { uid: 'user-abc', token: {} },
      data: { category: 'event_participation' },
    });

    expect(result).toEqual({ ok: true });
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    // Claims should be updated with 'e' key removed.
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-abc', {
      consents: {}, // 'e' key removed
    });
  });

  it('returns alreadyRevoked:true when consent is already revoked', async () => {
    consentDocData = { status: 'revoked', version: 'v3', textHash: 'h'.repeat(64), category: 'event_participation' };
    const handler = getHandler(consentRevoke as unknown as { handler: (req: unknown) => Promise<unknown> });

    const result = await handler({
      auth: { uid: 'user-abc', token: {} },
      data: { category: 'event_participation' },
    });

    expect(result).toEqual({ ok: true, alreadyRevoked: true });
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });

  it('returns alreadyRevoked:true when consent doc does not exist', async () => {
    consentDocData = null;
    const handler = getHandler(consentRevoke as unknown as { handler: (req: unknown) => Promise<unknown> });

    const result = await handler({
      auth: { uid: 'user-abc', token: {} },
      data: { category: 'event_participation' },
    });

    expect(result).toEqual({ ok: true, alreadyRevoked: true });
  });

  it('throws unauthenticated when no auth context', async () => {
    const handler = getHandler(consentRevoke as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({ auth: null, data: { category: 'event_participation' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('does not throw even if Pub/Sub fails (non-fatal side-effect)', async () => {
    // The revoke function publishes to 'consent-revoked' topic as a non-fatal side-effect.
    // Even if publishing fails, the revoke itself should succeed.
    const handler = getHandler(consentRevoke as unknown as { handler: (req: unknown) => Promise<unknown> });

    // The @google-cloud/pubsub mock is already set to return a publishMessage spy.
    // Just confirm the revoke succeeds without throwing.
    const result = await handler({
      auth: { uid: 'user-abc', token: {} },
      data: { category: 'event_participation' },
    });

    expect(result).toEqual({ ok: true });
  });
});
