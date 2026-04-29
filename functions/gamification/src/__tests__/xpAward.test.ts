/**
 * xpAward.test.ts — Unit tests for xpAward Pub/Sub Cloud Function.
 *
 * Tests:
 *   1. event_attended → XP increments by 100, level recomputed, transaction atomic.
 *   2. No basic_profile consent → message dropped, audit entry has dropped_no_consent.
 *   3. Anti-cheat flagged metric → XP not awarded, flaggedRecords written.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin/app ─────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn(), getApps: () => [] }));

// ── Mock firebase-admin/auth ─────────────────────────────────────────────────
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUser: vi.fn().mockResolvedValue({ customClaims: { consents: { b: true } } }) }),
}));

// ── Mock Firestore ────────────────────────────────────────────────────────────
const mockTransactionSet = vi.fn();
const mockTransactionGet = vi.fn();
const mockRunTransaction = vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
  const tx = {
    get: mockTransactionGet,
    set: mockTransactionSet,
    update: vi.fn(),
  };
  await fn(tx);
});

const mockCollectionDocSet = vi.fn();
const mockCollectionDoc = vi.fn(() => ({ set: mockCollectionDocSet }));
const mockCollection = vi.fn(() => ({ doc: mockCollectionDoc }));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: vi.fn(() => ({ set: vi.fn(), get: vi.fn() })),
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: class {
    static fromMillis() { return {}; }
    static fromDate() { return {}; }
  },
}));

// ── Mock firebase-functions/v2/pubsub ─────────────────────────────────────────
// NOTE: vi.mock is hoisted to the top of the file by vitest — the factory function
// must be self-contained (no references to variables declared outside it).
vi.mock('firebase-functions/v2/pubsub', () => ({
  onMessagePublished: (_opts: unknown, handler: (event: unknown) => Promise<void>) => ({
    handler,
  }),
}));

// ── Mock @gamechangers/functions-shared ──────────────────────────────────────
const mockConsentGate = vi.fn();
vi.mock('@gamechangers/functions-shared', () => ({
  consentGate: (...args: unknown[]) => mockConsentGate(...args),
}));

// ── Import module under test ──────────────────────────────────────────────────
import { xpAward } from '../xpAward.js';

function makeEvent(json: unknown) {
  return {
    data: {
      message: { json },
    },
  };
}

function getHandler() {
  return (xpAward as unknown as { handler: (e: unknown) => Promise<void> }).handler;
}

describe('xpAward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: consent granted
    mockConsentGate.mockResolvedValue(undefined);

    // Default: profile exists with level 1, xp 0
    mockTransactionGet.mockResolvedValue({
      data: () => ({ xp: 0, level: 1 }),
    });
  });

  it('event_attended awards 100 XP and writes updated profile in transaction', async () => {
    const handler = getHandler();
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc', eventId: 'evt-1' }));

    expect(mockConsentGate).toHaveBeenCalledWith('user-abc', 'basic_profile');
    expect(mockRunTransaction).toHaveBeenCalledOnce();

    // 100 XP from level 1 pushes user to level 2 (totalXpForLevel(2) = 100)
    // xp=100 is correct; level=2 is correct per xpForLevel formula
    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ xp: 100, level: 2 }),
      { merge: true },
    );
  });

  it('event_attended walk-in awards 50 XP', async () => {
    const handler = getHandler();
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc', eventId: 'evt-1', walkIn: true }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ xp: 50 }),
      { merge: true },
    );
  });

  it('no basic_profile consent: message dropped, audit entry has dropped_no_consent', async () => {
    mockConsentGate.mockRejectedValue(new Error('permission-denied'));

    const handler = getHandler();
    await handler(makeEvent({ type: 'event_attended', uid: 'no-consent-user', eventId: 'evt-2' }));

    // Transaction should NOT be called (no XP write)
    expect(mockRunTransaction).not.toHaveBeenCalled();

    // Audit entry written with dropped_no_consent reason
    expect(mockCollectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'xp_dropped_no_consent',
        uid: 'no-consent-user',
        reason: 'dropped_no_consent',
      }),
    );
  });

  it('challenge_progress with steps metric > 100K is rejected, no XP awarded', async () => {
    const handler = getHandler();
    await handler(makeEvent({
      type: 'challenge_progress',
      uid: 'cheat-user',
      challengeId: 'ch-1',
      value: 150000,
      metric: 'steps',
    }));

    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockCollectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'cheat-user',
        status: 'rejected',
      }),
    );
  });

  it('challenge_progress with steps 50K-100K is flagged, no XP awarded', async () => {
    const handler = getHandler();
    await handler(makeEvent({
      type: 'challenge_progress',
      uid: 'suspicious-user',
      challengeId: 'ch-1',
      value: 75000,
      metric: 'steps',
    }));

    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockCollectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'suspicious-user',
        status: 'flagged_pending_review',
      }),
    );
  });

  it('wellness_survey_completed awards 75 XP', async () => {
    const handler = getHandler();
    await handler(makeEvent({ type: 'wellness_survey_completed', uid: 'user-abc', surveyId: 's-1' }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ xp: 75 }),
      { merge: true },
    );
  });

  it('invalid message shape is silently dropped (no throw)', async () => {
    const handler = getHandler();
    // Should not throw
    await expect(handler(makeEvent({ type: 'unknown_type', uid: 'user' }))).resolves.toBeUndefined();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});
