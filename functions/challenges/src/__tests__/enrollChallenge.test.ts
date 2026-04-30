/**
 * enrollChallenge.test.ts — TDD tests for enrollChallenge Cloud Function.
 *
 * Tests:
 *   - with event_participation consent → enrollment succeeds
 *   - without event_participation consent → permission-denied HttpsError
 *   - opt-in leaderboard flag stored correctly
 *   - anonymous leaderboard flag stored correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin ──────────────────────────────────────────────────────
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn();
const mockDoc = vi.fn().mockReturnValue({ get: mockGet, set: mockSet });
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });
const mockRunTransaction = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
    runTransaction: mockRunTransaction,
    FieldValue: { serverTimestamp: () => '__serverTimestamp__' },
  })),
  FieldValue: { serverTimestamp: () => '__serverTimestamp__' },
  Timestamp: { now: () => ({ toDate: () => new Date() }) },
}));

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
}));

// ── Mock ConsentEnforcement ──────────────────────────────────────────────────
const mockConsentGate = vi.fn();
vi.mock('@gamechangers/functions-shared', () => ({
  consentGate: (...args: unknown[]) => mockConsentGate(...args),
}));

// ── Mock firebase-functions/v2/https ─────────────────────────────────────────
vi.mock('firebase-functions/v2/https', () => ({
  onCall: vi.fn((opts: unknown, handler: unknown) => handler),
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'HttpsError';
    }
  },
}));

// ── Import after mocks ───────────────────────────────────────────────────────
import { enrollChallengeHandler } from '../enrollChallenge.js';

const fakeContext = {
  auth: { uid: 'user-123', token: { consents: { e: true } } },
};

const validPayload = {
  challengeId: '2026-q2-movement-bronce-general',
  tier: 'bronce',
  optInLeaderboard: true,
  anonymousLeaderboard: false,
};

describe('enrollChallenge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            tier: { bronce: { target: 50000 }, plata: { target: 200000 }, oro: { target: 500000 } },
            endsAt: { toDate: () => new Date(Date.now() + 86400000) },
          }),
        }),
        set: vi.fn(),
      };
      return fn(tx);
    });
  });

  it('enrolls user successfully when event_participation consent granted', async () => {
    mockConsentGate.mockResolvedValue(undefined);

    const result = await enrollChallengeHandler({ data: validPayload }, fakeContext);

    expect(mockConsentGate).toHaveBeenCalledWith('user-123', 'event_participation');
    expect(result).toMatchObject({ enrolled: true });
  });

  it('throws permission-denied when event_participation consent missing', async () => {
    mockConsentGate.mockRejectedValue({ code: 'permission-denied', message: 'Consent not granted' });

    await expect(enrollChallengeHandler({ data: validPayload }, fakeContext)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('stores optInLeaderboard: true in enrollment doc', async () => {
    mockConsentGate.mockResolvedValue(undefined);
    const setCalls: unknown[] = [];

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            tier: { bronce: { target: 50000 } },
            endsAt: { toDate: () => new Date(Date.now() + 86400000) },
          }),
        }),
        set: vi.fn((_ref: unknown, data: unknown) => { setCalls.push(data); }),
      };
      return fn(tx);
    });

    await enrollChallengeHandler({ data: { ...validPayload, optInLeaderboard: true } }, fakeContext);
    // First set call is the enrollment doc; second is the audit log
    expect(setCalls[0]).toMatchObject({ optInLeaderboard: true });
  });

  it('stores anonymousLeaderboard: true in enrollment doc', async () => {
    mockConsentGate.mockResolvedValue(undefined);
    const setCalls: unknown[] = [];

    mockRunTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            tier: { bronce: { target: 50000 } },
            endsAt: { toDate: () => new Date(Date.now() + 86400000) },
          }),
        }),
        set: vi.fn((_ref: unknown, data: unknown) => { setCalls.push(data); }),
      };
      return fn(tx);
    });

    await enrollChallengeHandler({ data: { ...validPayload, anonymousLeaderboard: true } }, fakeContext);
    // First set call is the enrollment doc; second is the audit log
    expect(setCalls[0]).toMatchObject({ anonymousLeaderboard: true });
  });

  it('rejects invalid tier values', async () => {
    mockConsentGate.mockResolvedValue(undefined);

    await expect(
      enrollChallengeHandler({ data: { ...validPayload, tier: 'diamond' } }, fakeContext),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });
});
