/**
 * grant.test.ts — Unit tests for consentGrant callable.
 *
 * Tests: happy-path grant, minor block (MINOR_CANNOT_GRANT_LAYER_4), invalid category.
 * Uses vi.mock to stub Firebase Admin SDK — no emulator required for unit tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin/app (initializeApp) ─────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));

// ── Mock firebase-admin/auth ─────────────────────────────────────────────────
const mockGetUser = vi.fn();
const mockSetCustomUserClaims = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    getUser: mockGetUser,
    setCustomUserClaims: mockSetCustomUserClaims,
  }),
}));

// ── Mock Firestore ───────────────────────────────────────────────────────────
const mockTransactionSet = vi.fn();
const mockRunTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  const tx = { set: mockTransactionSet, update: vi.fn() };
  await fn(tx);
});
const mockGet = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: vi.fn() }));
const mockCollection = vi.fn(() => ({
  doc: vi.fn(() => ({ get: mockGet, set: vi.fn() })),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn(() => ({ get: mockGet })),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: mockDoc,
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {},
}));

// ── Mock firebase-functions/v2/https ─────────────────────────────────────────
const registeredCallables: Record<string, (request: unknown) => Promise<unknown>> = {};
vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (request: unknown) => Promise<unknown>) => {
    // Return the handler so we can call it directly in tests.
    return { handler };
  },
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

// ── Import the module under test (after mocks are set up) ─────────────────────
import { consentGrant, sha256, LAYER_TO_CATEGORIES } from '../grant.js';

// Helper: extract the onCall handler.
function getHandler(fn: { handler: (req: unknown) => Promise<unknown> }) {
  return fn.handler;
}

describe('consentGrant', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: getUser returns a user with no custom claims.
    mockGetUser.mockResolvedValue({ customClaims: {} });
    mockSetCustomUserClaims.mockResolvedValue(undefined);

    // Default: consent text exists.
    mockDoc.mockImplementation((path: string) => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          textHash: sha256('Crear tu perfil con nombre, avatar, ciudad y juegos favoritos para que la comunidad te conozca.'),
        }),
      }),
      set: vi.fn(),
    }));

    // Default: empty ledger (genesis entry).
    mockCollection.mockImplementation(() => ({
      doc: vi.fn(() => ({ set: vi.fn() })),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      })),
    }));
  });

  it('successfully grants event_participation for a full-age user', async () => {
    const handler = getHandler(consentGrant as unknown as { handler: (req: unknown) => Promise<unknown> });

    const textHash = sha256('Confirmar tu asistencia a eventos, sumarte a desafíos y aparecer en las listas de participantes.');

    // Make consent text return with the right hash.
    mockDoc.mockImplementation(() => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ textHash }),
      }),
      set: vi.fn(),
    }));

    const result = await handler({
      auth: {
        uid: 'user-abc',
        token: { isMinor: false },
      },
      data: {
        category: 'event_participation',
        version: 'v3',
        textHash,
        layer: 1,
      },
    });

    expect(result).toEqual({ ok: true });
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    expect(mockSetCustomUserClaims).toHaveBeenCalledWith('user-abc', {
      consents: { e: true },
    });
  });

  it('throws MINOR_CANNOT_GRANT_LAYER_4 for minor trying to grant b2b_brands', async () => {
    const handler = getHandler(consentGrant as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({
        auth: {
          uid: 'minor-uid',
          token: { isMinor: true },
        },
        data: {
          category: 'b2b_brands',
          version: 'v3',
          textHash: 'some-hash'.padEnd(64, '0'),
          layer: 4,
        },
      }),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'MINOR_CANNOT_GRANT_LAYER_4',
    });

    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockSetCustomUserClaims).not.toHaveBeenCalled();
  });

  it('throws unauthenticated when no auth context', async () => {
    const handler = getHandler(consentGrant as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({
        auth: null,
        data: { category: 'basic_profile', version: 'v3', textHash: 'h'.repeat(64), layer: 0 },
      }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('throws invalid-argument for unknown category', async () => {
    const handler = getHandler(consentGrant as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({
        auth: { uid: 'user', token: {} },
        data: { category: 'unknown_category', version: 'v3', textHash: 'h'.repeat(64), layer: 0 },
      }),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('minor can still grant basic_profile (Layer 0, not Layer 4)', async () => {
    const handler = getHandler(consentGrant as unknown as { handler: (req: unknown) => Promise<unknown> });
    const textHash = sha256('Crear tu perfil con nombre, avatar, ciudad y juegos favoritos para que la comunidad te conozca.');

    mockDoc.mockImplementation(() => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({ textHash }),
      }),
      set: vi.fn(),
    }));

    const result = await handler({
      auth: { uid: 'minor-uid', token: { isMinor: true } },
      data: { category: 'basic_profile', version: 'v3', textHash, layer: 0 },
    });

    expect(result).toEqual({ ok: true });
    expect(mockRunTransaction).toHaveBeenCalledOnce();
  });

  it('LAYER_TO_CATEGORIES[4] contains all 5 B2B/research categories', () => {
    expect(LAYER_TO_CATEGORIES[4]).toEqual([
      'b2b_insurers',
      'b2b_healthcare',
      'b2b_brands',
      'cross_border',
      'research',
    ]);
  });
});
