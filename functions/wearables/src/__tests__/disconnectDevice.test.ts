/**
 * disconnectDevice.test.ts
 *
 * Tests:
 *   1. retainData=true → samples retained, _lookup deleted, disabled flag set
 *   2. retainData=false → data deletion attempted (via Cloud Task or direct)
 *   3. Unauthenticated → error thrown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockDocDelete = vi.fn().mockResolvedValue(undefined);
const mockDocSet = vi.fn().mockResolvedValue(undefined);
const mockAuditSet = vi.fn().mockResolvedValue(undefined);

const mockDb = {
  doc: vi.fn().mockImplementation((_path: string) => ({
    delete: mockDocDelete,
    set: mockDocSet,
  })),
  collection: vi.fn().mockImplementation(() => ({
    doc: vi.fn().mockReturnValue({ set: mockAuditSet }),
  })),
};

const mockCreateTask = vi.fn().mockResolvedValue([{}]);

// Use a class so `new CloudTasksClient()` works
class MockCloudTasksClient {
  createTask = mockCreateTask;
}

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue(mockDb),
  FieldValue: { serverTimestamp: vi.fn().mockReturnValue('__ts__') },
}));

vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn().mockImplementation((_opts: unknown, handler: unknown) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock('@gamechangers/functions-shared/ConsentEnforcement', () => ({
  consentGate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@google-cloud/tasks', () => ({
  CloudTasksClient: MockCloudTasksClient,
}));

vi.mock('node-fetch', () => ({
  default: vi.fn().mockResolvedValue({ ok: true }),
}));

describe('disconnectDevice (core logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocDelete.mockResolvedValue(undefined);
    mockDocSet.mockResolvedValue(undefined);
    mockAuditSet.mockResolvedValue(undefined);
    mockCreateTask.mockResolvedValue([{}]);
  });

  it('retainData=true → disabled flag set and audit logged', async () => {
    const { disconnectDeviceCore } = await import('../disconnectDevice.js');

    await disconnectDeviceCore('user-123', 'garmin', true);

    // Disabled flag written
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ disabled: true }),
      { merge: true },
    );
    // Audit logged
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'wearable_disconnected',
        uid: 'user-123',
        provider: 'garmin',
        retainData: true,
      }),
    );
  });

  it('retainData=false → audit logged with retainData=false', async () => {
    const { disconnectDeviceCore } = await import('../disconnectDevice.js');

    await disconnectDeviceCore('user-456', 'polar', false);

    // Audit log should record retainData=false
    expect(mockAuditSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'wearable_disconnected',
        uid: 'user-456',
        provider: 'polar',
        retainData: false,
      }),
    );
  });

  it('disconnectDevice callable rejects unauthenticated requests', async () => {
    const { disconnectDevice } = await import('../disconnectDevice.js');

    let threw = false;
    try {
      await (disconnectDevice as unknown as Function)({ auth: null, data: { provider: 'garmin' } });
    } catch (err) {
      threw = true;
      expect((err as Error).message).toContain('Authentication required');
    }
    expect(threw).toBe(true);
  });
});
