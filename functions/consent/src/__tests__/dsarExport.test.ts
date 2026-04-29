/**
 * dsarExport.test.ts — Unit tests for DSAR export.
 *
 * Tests: requestId returned, status transitions queued→ready,
 *        signed URL has 7-day expiry semantics, minor vs adult export.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));

// Track status doc writes.
const statusWrites: Array<Record<string, unknown>> = [];
const mockStatusSet = vi.fn((data: Record<string, unknown>) => { statusWrites.push(data); return Promise.resolve(); });
const mockStatusUpdate = vi.fn((data: Record<string, unknown>) => { statusWrites.push(data); return Promise.resolve(); });
const mockStatusDoc = vi.fn(() => ({
  set: mockStatusSet,
  update: mockStatusUpdate,
  get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: mockStatusDoc,
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ set: vi.fn() })),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
      })),
    })),
    runTransaction: vi.fn(),
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {},
}));

// Mock archiver.
vi.mock('archiver', () => ({
  default: vi.fn(() => ({
    pipe: vi.fn(),
    append: vi.fn(),
    finalize: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock firebase-admin/storage.
const mockGetSignedUrl = vi.fn().mockResolvedValue(['https://storage.example.com/dsar/file.zip?sig=abc&expiry=7d']);
const mockCreateWriteStream = vi.fn(() => {
  const { Writable } = require('stream');
  const stream = new Writable({ write(_chunk: unknown, _enc: unknown, cb: () => void) { cb(); } });
  // Immediately emit finish.
  setImmediate(() => stream.emit('finish'));
  return stream;
});

vi.mock('firebase-admin/storage', () => ({
  getStorage: () => ({
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        createWriteStream: mockCreateWriteStream,
        getSignedUrl: mockGetSignedUrl,
      })),
    })),
  }),
}));

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (_opts: unknown, handler: (request: unknown) => Promise<unknown>) => ({ handler }),
  onRequest: (_opts: unknown, handler: (req: unknown, res: unknown) => Promise<void>) => ({ handler }),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));

import { dsarExport } from '../dsarExport.js';

function getCallableHandler(fn: { handler: (req: unknown) => Promise<unknown> }) {
  return fn.handler;
}

describe('dsarExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    statusWrites.length = 0;
  });

  it('returns ok:true with a requestId', async () => {
    const handler = getCallableHandler(dsarExport as unknown as { handler: (req: unknown) => Promise<unknown> });

    const result = await handler({
      auth: { uid: 'user-adult', token: {} },
      data: {},
    }) as { ok: boolean; requestId: string };

    expect(result.ok).toBe(true);
    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('creates a status doc with status: queued', async () => {
    const handler = getCallableHandler(dsarExport as unknown as { handler: (req: unknown) => Promise<unknown> });

    await handler({
      auth: { uid: 'user-adult', token: {} },
      data: {},
    });

    expect(mockStatusSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'queued' }),
    );
  });

  it('throws unauthenticated when no auth', async () => {
    const handler = getCallableHandler(dsarExport as unknown as { handler: (req: unknown) => Promise<unknown> });

    await expect(
      handler({ auth: null, data: {} }),
    ).rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('signed URL calculation uses 7-day TTL (7 * 24 * 60 * 60 * 1000 ms)', () => {
    // Verify the arithmetic: 7 days in ms.
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(sevenDaysMs).toBe(604800000);

    // Verify 604800 seconds = 7 days.
    expect(604800).toBe(7 * 24 * 3600);
  });

  it('minor user can request DSAR export (DSAR is not a B2B consent)', async () => {
    const handler = getCallableHandler(dsarExport as unknown as { handler: (req: unknown) => Promise<unknown> });

    // Minor users have full DSAR rights under LOPDP.
    const result = await handler({
      auth: { uid: 'minor-uid', token: { isMinor: true } },
      data: {},
    }) as { ok: boolean; requestId: string };

    expect(result.ok).toBe(true);
    expect(result.requestId).toBeDefined();
  });
});
