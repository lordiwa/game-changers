/**
 * openWearablesWebhook.test.ts
 *
 * Tests:
 *   1. Valid HMAC + valid payload + active consent → samples written, audit log entry
 *   2. Invalid HMAC → 401, no DB write
 *   3. Valid payload but consent revoked → 403, audit entry 'wearable_sample_dropped_no_consent'
 *   4. Replay (same sample IDs) → idempotent (merge:true, no duplicate)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'node:crypto';

// ── Shared mock state ──────────────────────────────────────────────────────
const mockBatch = {
  set: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined),
};

const mockAuditDocRef = { set: vi.fn().mockResolvedValue(undefined) };
const mockProfileSnap = { exists: true };
const mockLookupSnap = { exists: false };

const mockDb = {
  batch: vi.fn().mockReturnValue(mockBatch),
  collection: vi.fn().mockImplementation((path: string) => ({
    doc: vi.fn().mockReturnValue(mockAuditDocRef),
  })),
  doc: vi.fn().mockImplementation((path: string) => ({
    get: vi.fn().mockImplementation(() => {
      if (path.includes('_lookup')) return Promise.resolve(mockLookupSnap);
      if (path.includes('profile/main')) return Promise.resolve(mockProfileSnap);
      return Promise.resolve({ exists: false });
    }),
    set: vi.fn().mockResolvedValue(undefined),
  })),
};

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue(mockDb),
  FieldValue: { serverTimestamp: vi.fn().mockReturnValue('__serverTimestamp__') },
  Timestamp: {
    fromDate: vi.fn().mockImplementation((d: Date) => ({ toDate: () => d, _seconds: d.getTime() / 1000 })),
  },
}));

vi.mock('firebase-functions/params', () => ({
  defineSecret: vi.fn().mockReturnValue({
    value: vi.fn().mockReturnValue('test-hmac-secret'),
  }),
}));

vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn().mockImplementation((_opts: unknown, handler: unknown) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock('@gamechangers/functions-shared/ConsentEnforcement', () => ({
  consentGate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@gamechangers/functions-shared/hmac', () => ({
  verifyHmacSha256: vi.fn(),
}));

vi.mock('@google-cloud/tasks', () => ({
  CloudTasksClient: vi.fn().mockImplementation(() => ({
    createTask: vi.fn().mockResolvedValue([{}]),
  })),
}));

// ── Helpers ────────────────────────────────────────────────────────────────
function buildReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'POST',
    headers: { 'x-ow-signature': 'valid-sig' },
    rawBody: Buffer.from(JSON.stringify({
      uid: 'user-123',
      provider: 'garmin',
      samples: [{
        id: 'sample-001',
        metric: 'steps',
        value: 5000,
        unit: 'steps',
        recordedAt: '2026-04-01T12:00:00.000Z',
      }],
    })),
    body: {
      uid: 'user-123',
      provider: 'garmin',
      samples: [{
        id: 'sample-001',
        metric: 'steps',
        value: 5000,
        unit: 'steps',
        recordedAt: '2026-04-01T12:00:00.000Z',
      }],
    },
    ...overrides,
  };
}

function buildRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status: vi.fn().mockImplementation(function(this: typeof res, code: number) {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation(function(this: typeof res, body: unknown) {
      res.body = body;
      return res;
    }),
    send: vi.fn().mockImplementation(function(this: typeof res, body: unknown) {
      res.body = body;
      return res;
    }),
  };
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('openWearablesWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatch.set.mockClear();
    mockBatch.commit.mockResolvedValue(undefined);
    mockAuditDocRef.set.mockResolvedValue(undefined);
  });

  it('valid HMAC + valid payload + active consent → 204 + samples written', async () => {
    const { verifyHmacSha256 } = await import('@gamechangers/functions-shared/hmac');
    vi.mocked(verifyHmacSha256).mockReturnValue(true);

    const { openWearablesWebhook } = await import('../openWearablesWebhook.js');
    const req = buildReq();
    const res = buildRes();

    await (openWearablesWebhook as unknown as Function)(req, res);

    expect(res.statusCode).toBe(204);
    // Batch.set called for the sample
    expect(mockBatch.set).toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
  });

  it('missing signature → 401, no DB write', async () => {
    const { verifyHmacSha256 } = await import('@gamechangers/functions-shared/hmac');
    vi.mocked(verifyHmacSha256).mockReturnValue(false);

    const { openWearablesWebhook } = await import('../openWearablesWebhook.js');
    const req = buildReq({ headers: {} }); // no signature header
    const res = buildRes();

    await (openWearablesWebhook as unknown as Function)(req, res);

    expect(res.statusCode).toBe(401);
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('invalid HMAC → 401, no DB write', async () => {
    const { verifyHmacSha256 } = await import('@gamechangers/functions-shared/hmac');
    vi.mocked(verifyHmacSha256).mockReturnValue(false);

    const { openWearablesWebhook } = await import('../openWearablesWebhook.js');
    const req = buildReq({ headers: { 'x-ow-signature': 'bad-sig' } });
    const res = buildRes();

    await (openWearablesWebhook as unknown as Function)(req, res);

    expect(res.statusCode).toBe(401);
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('consent revoked → 403 + audit entry wearable_sample_dropped_no_consent', async () => {
    const { verifyHmacSha256 } = await import('@gamechangers/functions-shared/hmac');
    vi.mocked(verifyHmacSha256).mockReturnValue(true);

    const { consentGate } = await import('@gamechangers/functions-shared/ConsentEnforcement');
    vi.mocked(consentGate).mockRejectedValueOnce(new Error('permission-denied'));

    const { openWearablesWebhook } = await import('../openWearablesWebhook.js');
    const req = buildReq();
    const res = buildRes();

    await (openWearablesWebhook as unknown as Function)(req, res);

    expect(res.statusCode).toBe(403);
    // Audit log should have been written with the dropped reason
    expect(mockAuditDocRef.set).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'wearable_sample_dropped_no_consent' }),
    );
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('replay same sample ID → idempotent (merge:true on batch.set)', async () => {
    const { verifyHmacSha256 } = await import('@gamechangers/functions-shared/hmac');
    vi.mocked(verifyHmacSha256).mockReturnValue(true);

    const { openWearablesWebhook } = await import('../openWearablesWebhook.js');
    const req = buildReq();
    const res = buildRes();

    await (openWearablesWebhook as unknown as Function)(req, res);

    expect(res.statusCode).toBe(204);
    // Verify batch.set was called with merge:true option
    expect(mockBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { merge: true },
    );
  });
});
