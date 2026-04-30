/**
 * logProgress.test.ts — TDD tests for logProgress Cloud Function.
 *
 * Tests:
 *   - manual entry with small value → ok
 *   - steps > 100K → rejected (CHEAT_REJECTED_STEPS)
 *   - steps 50K-100K → flagged
 *   - Plata tier without evidence → EVIDENCE_REQUIRED
 *   - Plata tier with evidence → ok
 *   - Oro tier without evidence → EVIDENCE_REQUIRED
 *   - SOURCE_TO_CONSENT mapping: manual→health_self_reports, wearable→wearable_data
 *   - photo → event_participation consent required
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin ──────────────────────────────────────────────────────
const mockAuditSet = vi.fn().mockResolvedValue(undefined);
const mockProgressSet = vi.fn().mockResolvedValue(undefined);
const mockEnrollmentGet = vi.fn();
const mockChallengeGet = vi.fn();

const mockDocFn = vi.fn().mockImplementation((path: string) => {
  if (path.includes('challengeEnrollments')) return { get: mockEnrollmentGet };
  if (path.startsWith('challenges/')) return { get: mockChallengeGet };
  return { get: vi.fn(), set: mockAuditSet };
});

const mockCollectionFn = vi.fn().mockReturnValue({
  doc: vi.fn().mockReturnValue({ set: mockAuditSet }),
});

const mockTransaction = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
};

const mockRunTransaction = vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) =>
  fn(mockTransaction),
);

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: (...args: unknown[]) => mockDocFn(args[0] as string),
    collection: mockCollectionFn,
    runTransaction: mockRunTransaction,
    FieldValue: { serverTimestamp: () => '__serverTimestamp__', increment: (n: number) => n },
  })),
  FieldValue: {
    serverTimestamp: () => '__serverTimestamp__',
    increment: (n: number) => n,
  },
}));

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
}));

// ── Mock @google-cloud/pubsub ────────────────────────────────────────────────
const mockPublish = vi.fn().mockResolvedValue('msg-id');
vi.mock('@google-cloud/pubsub', () => ({
  PubSub: vi.fn().mockImplementation(() => ({
    topic: vi.fn().mockReturnValue({ publishMessage: mockPublish }),
  })),
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
import { logProgressHandler, SOURCE_TO_CONSENT } from '../logProgress.js';

const fakeContext = {
  auth: { uid: 'user-123', token: {} },
};

function makeEnrollmentSnap(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      challengeId: 'challenge-1',
      tier: 'bronce',
      progress: 0,
      optInLeaderboard: false,
      anonymousLeaderboard: false,
      ...overrides,
    }),
  };
}

function makeChallengeSnap(metric = 'steps') {
  return {
    exists: true,
    data: () => ({
      id: 'challenge-1',
      type: 'movement',
      metric,
      tier: {
        bronce: { target: 50000, reward: { xp: 200, badgeId: 'movement-bronce-7d' } },
        plata: { target: 200000, reward: { xp: 600, badgeId: 'movement-plata-14d' } },
        oro: { target: 500000, reward: { xp: 1500, badgeId: 'movement-oro-30d' } },
      },
    }),
  };
}

describe('SOURCE_TO_CONSENT mapping', () => {
  it('maps manual to health_self_reports', () => {
    expect(SOURCE_TO_CONSENT['manual']).toBe('health_self_reports');
  });
  it('maps pedometer to health_self_reports', () => {
    expect(SOURCE_TO_CONSENT['pedometer']).toBe('health_self_reports');
  });
  it('maps wearable to wearable_data', () => {
    expect(SOURCE_TO_CONSENT['wearable']).toBe('wearable_data');
  });
  it('maps photo to event_participation', () => {
    expect(SOURCE_TO_CONSENT['photo']).toBe('event_participation');
  });
});

describe('logProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsentGate.mockResolvedValue(undefined);

    mockTransaction.get.mockImplementation(async (ref: { _type?: string; _path?: string }) => {
      // Return enrollment for enrollment doc
      if (ref && (ref as Record<string, unknown>)['_isEnrollment']) return makeEnrollmentSnap();
      if (ref && (ref as Record<string, unknown>)['_isChallenge']) return makeChallengeSnap();
      return makeEnrollmentSnap();
    });
    mockTransaction.set.mockResolvedValue(undefined);
    mockTransaction.update.mockResolvedValue(undefined);
  });

  it('accepts small manual step entry', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap())   // enrollment
      .mockResolvedValueOnce(makeChallengeSnap());    // challenge

    const result = await logProgressHandler(
      { data: { challengeId: 'challenge-1', source: 'manual', value: 1000, unit: 'steps' } },
      fakeContext,
    );

    expect(mockConsentGate).toHaveBeenCalledWith('user-123', 'health_self_reports');
    expect(result).toMatchObject({ status: 'ok' });
  });

  it('rejects steps > 100K (CHEAT_REJECTED_STEPS)', async () => {
    await expect(
      logProgressHandler(
        { data: { challengeId: 'challenge-1', source: 'manual', value: 120000, unit: 'steps' } },
        fakeContext,
      ),
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('flags steps 50K-100K (returns flagged status)', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap())
      .mockResolvedValueOnce(makeChallengeSnap());

    const result = await logProgressHandler(
      { data: { challengeId: 'challenge-1', source: 'manual', value: 75000, unit: 'steps' } },
      fakeContext,
    );

    expect(result).toMatchObject({ status: 'flagged' });
  });

  it('requires evidence for Plata tier manual entry', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap({ tier: 'plata' }))
      .mockResolvedValueOnce(makeChallengeSnap());

    await expect(
      logProgressHandler(
        {
          data: {
            challengeId: 'challenge-1',
            source: 'manual',
            value: 1000,
            unit: 'steps',
            // no evidence field
          },
        },
        fakeContext,
      ),
    ).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('EVIDENCE_REQUIRED') });
  });

  it('accepts Plata tier manual entry with photo evidence', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap({ tier: 'plata' }))
      .mockResolvedValueOnce(makeChallengeSnap());

    const result = await logProgressHandler(
      {
        data: {
          challengeId: 'challenge-1',
          source: 'manual',
          value: 1000,
          unit: 'steps',
          evidence: 'challenge-evidence/user-123/photo.jpg',
        },
      },
      fakeContext,
    );

    expect(result).toMatchObject({ status: 'ok' });
  });

  it('uses wearable_data consent for wearable source', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap())
      .mockResolvedValueOnce(makeChallengeSnap());

    await logProgressHandler(
      { data: { challengeId: 'challenge-1', source: 'wearable', value: 5000, unit: 'steps' } },
      fakeContext,
    );

    expect(mockConsentGate).toHaveBeenCalledWith('user-123', 'wearable_data');
  });

  it('uses event_participation consent for photo source', async () => {
    mockTransaction.get
      .mockResolvedValueOnce(makeEnrollmentSnap())
      .mockResolvedValueOnce(makeChallengeSnap());

    await logProgressHandler(
      {
        data: {
          challengeId: 'challenge-1',
          source: 'photo',
          value: 1,
          unit: 'count',
          evidence: 'challenge-evidence/user-123/photo.jpg',
        },
      },
      fakeContext,
    );

    expect(mockConsentGate).toHaveBeenCalledWith('user-123', 'event_participation');
  });

  it('throws not-found when user is not enrolled', async () => {
    mockTransaction.get.mockResolvedValueOnce({ exists: false });

    await expect(
      logProgressHandler(
        { data: { challengeId: 'challenge-1', source: 'manual', value: 1000, unit: 'steps' } },
        fakeContext,
      ),
    ).rejects.toMatchObject({ code: 'not-found' });
  });
});
