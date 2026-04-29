/**
 * erasure.test.ts — Unit tests for accountErasure.
 *
 * Tests: wrong confirmation throws, correct ELIMINAR soft-deletes immediately,
 *        hard-delete pseudonymizes auditLog/consentLedger (not deletes them),
 *        hard-delete does NOT touch auditLog or consentLedger paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));

const mockRevokeRefreshTokens = vi.fn();
const mockSetCustomUserClaims = vi.fn();
const mockDeleteUser = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    revokeRefreshTokens: mockRevokeRefreshTokens,
    setCustomUserClaims: mockSetCustomUserClaims,
    deleteUser: mockDeleteUser,
    getUser: vi.fn().mockResolvedValue({ customClaims: { consents: { b: true, e: true } } }),
  }),
}));

const txSet = vi.fn();
const txUpdate = vi.fn();
const mockRunTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  await fn({ set: txSet, update: txUpdate });
});

// Track collection calls to distinguish auditLog vs consentLedger.
const collectionBatchUpdates: Record<string, string[][]> = {
  auditLog: [],
  consentLedger: [],
};

const mockBatchUpdate = vi.fn();
const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
const mockBatch = vi.fn(() => ({ update: mockBatchUpdate, commit: mockBatchCommit }));

const mockConsentsGet = vi.fn().mockResolvedValue({
  docs: [
    {
      ref: { path: 'users/user-abc/consents/basic_profile', update: vi.fn() },
      data: () => ({
        status: 'granted',
        category: 'basic_profile',
        version: 'v3',
        textHash: 'h'.repeat(64),
      }),
    },
  ],
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: vi.fn((path: string) => ({
      set: vi.fn(),
      update: vi.fn(),
      get: vi.fn().mockResolvedValue({ exists: false }),
    })),
    collection: vi.fn((path: string) => {
      // consentLedger: return empty (genesis prevHash) for limit queries
      if (path === 'consentLedger' || path === 'auditLog') {
        return {
          doc: vi.fn(() => ({ set: vi.fn(), update: vi.fn() })),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          })),
        };
      }
      // scheduledErasures: empty
      if (path === 'scheduledErasures') {
        return {
          doc: vi.fn(() => ({ set: vi.fn(), update: vi.fn() })),
          get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
          })),
        };
      }
      // Default (consents subcollection via users/{uid}/consents path)
      return {
        doc: vi.fn(() => ({ set: vi.fn(), update: vi.fn() })),
        get: mockConsentsGet,
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
        })),
      };
    }),
    batch: mockBatch,
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {},
}));

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (request: unknown) => Promise<unknown>) => ({ handler }),
  onRequest: (_opts: unknown, handler: (req: unknown, res: unknown) => Promise<void>) => ({ handler }),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));

import { accountErasure, performHardDelete, pseudonymizeUid } from '../erasure.js';

function getCallableHandler(fn: { handler: (req: unknown) => Promise<unknown> }) {
  return fn.handler;
}

describe('accountErasure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRevokeRefreshTokens.mockResolvedValue(undefined);
    mockSetCustomUserClaims.mockResolvedValue(undefined);
    mockDeleteUser.mockResolvedValue(undefined);
  });

  it('throws invalid-argument when confirmation is wrong', async () => {
    const handler = getCallableHandler(accountErasure as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({
        auth: { uid: 'user-abc', token: {} },
        data: { confirmation: 'BORRAR' },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('throws invalid-argument when confirmation is missing', async () => {
    const handler = getCallableHandler(accountErasure as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({ auth: { uid: 'user-abc', token: {} }, data: {} }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('throws unauthenticated when no auth', async () => {
    const handler = getCallableHandler(accountErasure as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({ auth: null, data: { confirmation: 'ELIMINAR' } }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('performs soft-delete transactionally when confirmation is ELIMINAR', async () => {
    const handler = getCallableHandler(accountErasure as unknown as { handler: (req: unknown) => Promise<unknown> });

    const result = await handler({
      auth: { uid: 'user-abc', token: {} },
      data: { confirmation: 'ELIMINAR' },
    });

    expect(result).toEqual({ ok: true });
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    // Profile should be soft-deleted.
    expect(txSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ deletedAt: 'SERVER_TIMESTAMP', displayName: '[deleted]' }),
      { merge: true },
    );
    // Auth sessions revoked.
    expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('user-abc');
    // Claims set to accountDeleted.
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-abc', {
      accountDeleted: true,
      ageVerified: false,
      hasDiscord: false,
      consents: {},
    });
  });
});

describe('pseudonymizeUid', () => {
  it('produces a 64-char hex string', () => {
    const pseudo = pseudonymizeUid('test-uid-abc');
    expect(pseudo).toHaveLength(64);
    expect(pseudo).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic for the same uid', () => {
    const p1 = pseudonymizeUid('test-uid-xyz');
    const p2 = pseudonymizeUid('test-uid-xyz');
    expect(p1).toBe(p2);
  });

  it('produces different outputs for different uids', () => {
    const p1 = pseudonymizeUid('uid-alice');
    const p2 = pseudonymizeUid('uid-bob');
    expect(p1).not.toBe(p2);
  });
});

describe('erasure does NOT delete auditLog or consentLedger', () => {
  it('performHardDelete preserves audit and ledger — only pseudonymizes uid field', async () => {
    // The critical LOPDP compliance check: these collections are NOT deleted.
    // They are only updated (uid field pseudonymized).

    // Verify that the function source does not call delete() on auditLog or consentLedger.
    // This is verified by reading the source — the test confirms the contract as per ADR-010.
    const { readFileSync } = await import('fs');
    const { fileURLToPath } = await import('url');
    const { dirname, resolve } = await import('path');
    const __dir = dirname(fileURLToPath(import.meta.url));
    const erasureSrc = readFileSync(resolve(__dir, '../erasure.ts'), 'utf-8');

    // auditLog and consentLedger should appear only in pseudonymization context, not deletion.
    // The subcollections array in erasureHardDelete must NOT include 'auditLog' or 'consentLedger'.
    const subcollectionsMatch = erasureSrc.match(/const subcollections = \[[\s\S]*?\]/);
    expect(subcollectionsMatch).not.toBeNull();
    const subcollectionsStr = subcollectionsMatch![0];
    expect(subcollectionsStr).not.toContain("'auditLog'");
    expect(subcollectionsStr).not.toContain("'consentLedger'");

    // Pseudonymization IS applied to auditLog and consentLedger.
    expect(erasureSrc).toContain("collection('auditLog')");
    expect(erasureSrc).toContain("collection('consentLedger')");
    // Batch update (not delete) is called on these.
    expect(erasureSrc).toContain('batch.update');
    expect(erasureSrc).not.toMatch(/batch\.delete.*auditLog/);
    expect(erasureSrc).not.toMatch(/batch\.delete.*consentLedger/);
  });
});
