/**
 * streakAdvance.test.ts — Unit tests for streakAdvance Pub/Sub subscriber.
 *
 * Tests:
 *   1. New streak: streak initialized at currentDays=1.
 *   2. Same day event: no-op (streak not incremented).
 *   3. Yesterday event: currentDays++ (streak advances).
 *   4. 2-day gap with shield available: shield consumed, currentDays++.
 *   5. 2-day gap with no shield: streak reset to 1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin/app ─────────────────────────────────────────────────
vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn(), getApps: () => [] }));

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
const mockStreakGet = vi.fn();
const mockStreakRef = { set: vi.fn() };
const mockDoc = vi.fn(() => ({ get: vi.fn(), ...mockStreakRef }));
const mockCollection = vi.fn(() => ({ doc: mockCollectionDoc }));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    doc: mockDoc,
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  }),
  FieldValue: { serverTimestamp: () => 'SERVER_TIMESTAMP' },
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}));

// ── Mock firebase-functions/v2/pubsub ─────────────────────────────────────────
vi.mock('firebase-functions/v2/pubsub', () => ({
  onMessagePublished: (_opts: unknown, handler: (event: unknown) => Promise<void>) => ({
    handler,
  }),
}));

import { streakAdvance } from '../streakAdvance.js';

function makeEvent(json: unknown) {
  return { data: { message: { json } } };
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d;
}

describe('streakAdvance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('new streak: initializes currentDays=1', async () => {
    // No existing streak doc
    mockTransactionGet.mockResolvedValue({ exists: false });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc' }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ currentDays: 1, longestDays: 1, shieldsRemaining: 1 }),
    );
  });

  it('same day event: no-op (currentDays not incremented)', async () => {
    const today = new Date();
    today.setHours(8, 0, 0, 0);
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        trackId: 'social',
        currentDays: 3,
        longestDays: 3,
        shieldsRemaining: 1,
        lastEventAt: { toDate: () => today },
        windowStartedAt: { toDate: () => daysAgo(1) },
      }),
    });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc' }));

    // No set call for streak advancement
    expect(mockTransactionSet).not.toHaveBeenCalled();
  });

  it('yesterday event: currentDays increments to 4', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        trackId: 'social',
        currentDays: 3,
        longestDays: 3,
        shieldsRemaining: 1,
        lastEventAt: { toDate: () => daysAgo(1) },
        windowStartedAt: { toDate: () => daysAgo(1) },
      }),
    });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc' }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ currentDays: 4, longestDays: 4 }),
      { merge: true },
    );
  });

  it('2-day gap with shield available: shield consumed, currentDays++', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        trackId: 'social',
        currentDays: 3,
        longestDays: 3,
        shieldsRemaining: 1,
        lastEventAt: { toDate: () => daysAgo(2) },
        windowStartedAt: { toDate: () => daysAgo(2) },
      }),
    });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc' }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ currentDays: 4, shieldsRemaining: 0 }),
      { merge: true },
    );
    // Audit log: streak_shield_used
    expect(mockCollectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'streak_shield_used' }),
    );
  });

  it('2-day gap with no shield: streak resets to 1', async () => {
    mockTransactionGet.mockResolvedValue({
      exists: true,
      data: () => ({
        trackId: 'social',
        currentDays: 5,
        longestDays: 5,
        shieldsRemaining: 0,
        lastEventAt: { toDate: () => daysAgo(2) },
        windowStartedAt: { toDate: () => daysAgo(2) },
      }),
    });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({ type: 'event_attended', uid: 'user-abc' }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ currentDays: 1 }),
      { merge: true },
    );
    // Audit log: streak_reset
    expect(mockCollectionDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'streak_reset', previousDays: 5 }),
    );
  });

  it('challenge_progress with fitness metric maps to fitness track', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({
      type: 'challenge_progress',
      uid: 'user-abc',
      challengeId: 'ch-1',
      value: 5000,
      metric: 'steps',
    }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ trackId: 'fitness', currentDays: 1 }),
    );
  });

  it('content_completed maps to knowledge track', async () => {
    mockTransactionGet.mockResolvedValue({ exists: false });

    const handler = (streakAdvance as unknown as { handler: (e: unknown) => Promise<void> }).handler;
    await handler(makeEvent({
      type: 'content_completed',
      uid: 'user-abc',
      contentId: 'c-1',
      durationSec: 300,
    }));

    expect(mockTransactionSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ trackId: 'knowledge', currentDays: 1 }),
    );
  });
});
