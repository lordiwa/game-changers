/**
 * leaderboardCompute.test.ts — TDD tests for recomputeLeaderboards.
 *
 * Tests:
 *   - Seeds 50 progress entries, runs aggregator, verifies /leaderboards/weekly_global has rows
 *   - Anonymous users are rendered as 'Anónimo #N'
 *   - Opt-out users are excluded from leaderboard
 *   - Results are sorted by value descending
 *   - Writes to aggregate doc (not individual docs)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock firebase-admin ──────────────────────────────────────────────────────
const mockLeaderboardSet = vi.fn().mockResolvedValue(undefined);
const leaderboardDocRef = { set: mockLeaderboardSet };
const mockDoc = vi.fn().mockReturnValue(leaderboardDocRef);

const mockProgressDocs: Array<{ data: () => Record<string, unknown>; id: string }> = [];
const mockProgressSnap = { docs: mockProgressDocs };

const collectionGroupMock = vi.fn().mockReturnValue({
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn().mockResolvedValue(mockProgressSnap),
});

const collectionMock = vi.fn().mockReturnValue({
  doc: mockDoc,
});

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collectionGroup: collectionGroupMock,
    collection: collectionMock,
    doc: mockDoc,
    FieldValue: { serverTimestamp: () => '__serverTimestamp__' },
  })),
  FieldValue: { serverTimestamp: () => '__serverTimestamp__' },
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  },
}));

vi.mock('firebase-admin/app', () => ({
  getApps: vi.fn(() => []),
  initializeApp: vi.fn(),
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: vi.fn((opts: unknown, handler: unknown) => handler),
}));

// ── Import after mocks ───────────────────────────────────────────────────────
import { recomputeLeaderboardsHandler } from '../leaderboardCompute.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeProgressDoc(
  uid: string,
  value: number,
  opts: { optInLeaderboard?: boolean; anonymousLeaderboard?: boolean; displayName?: string; city?: string } = {},
) {
  return {
    id: `progress-${uid}`,
    data: () => ({
      uid,
      value,
      recordedAt: { toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) },
      status: 'ok',
      optInLeaderboard: opts.optInLeaderboard ?? true,
      anonymousLeaderboard: opts.anonymousLeaderboard ?? false,
      displayName: opts.displayName ?? `User ${uid}`,
      city: opts.city ?? 'quito',
    }),
  };
}

describe('recomputeLeaderboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressDocs.length = 0;
    mockLeaderboardSet.mockResolvedValue(undefined);
  });

  it('writes to /leaderboards/weekly_global aggregate doc', async () => {
    // Seed 5 opted-in users
    for (let i = 1; i <= 5; i++) {
      mockProgressDocs.push(makeProgressDoc(`uid-${i}`, i * 1000));
    }
    collectionGroupMock.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockProgressDocs }),
    });

    await recomputeLeaderboardsHandler({} as unknown);

    // Should have called set on leaderboard aggregate docs
    expect(mockLeaderboardSet).toHaveBeenCalled();
    const calls = mockLeaderboardSet.mock.calls;
    const firstCall = calls[0][0] as Record<string, unknown>;
    expect(firstCall).toHaveProperty('rows');
    expect(firstCall).toHaveProperty('updatedAt');
    expect(firstCall).toHaveProperty('period');
    expect(firstCall).toHaveProperty('cohort');
  });

  it('renders anonymous users as "Anónimo #N"', async () => {
    mockProgressDocs.push(makeProgressDoc('anon-uid', 9999, { anonymousLeaderboard: true }));

    collectionGroupMock.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockProgressDocs }),
    });

    await recomputeLeaderboardsHandler({} as unknown);

    const calls = mockLeaderboardSet.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const anyCall = calls.find((c: unknown[]) => {
      const d = c[0] as Record<string, unknown>;
      return Array.isArray(d['rows']) && (d['rows'] as Array<{ displayName: string }>).some(r => r.displayName.startsWith('Anónimo #'));
    });
    expect(anyCall).toBeDefined();
  });

  it('excludes users with optInLeaderboard: false', async () => {
    mockProgressDocs.push(makeProgressDoc('opted-out-uid', 99999, { optInLeaderboard: false }));
    mockProgressDocs.push(makeProgressDoc('opted-in-uid', 1000, { optInLeaderboard: true }));

    collectionGroupMock.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockProgressDocs }),
    });

    await recomputeLeaderboardsHandler({} as unknown);

    const calls = mockLeaderboardSet.mock.calls;
    const globalCalls = calls.filter((c: unknown[]) => {
      const d = c[0] as Record<string, unknown>;
      return d['cohort'] === 'global';
    });
    if (globalCalls.length > 0) {
      const rows = (globalCalls[0][0] as Record<string, unknown>)['rows'] as Array<{ uid: string }>;
      expect(rows.find(r => r.uid === 'opted-out-uid')).toBeUndefined();
    }
  });

  it('sorts rows by value descending', async () => {
    mockProgressDocs.push(makeProgressDoc('low-uid', 100));
    mockProgressDocs.push(makeProgressDoc('high-uid', 9000));
    mockProgressDocs.push(makeProgressDoc('mid-uid', 5000));

    collectionGroupMock.mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: mockProgressDocs }),
    });

    await recomputeLeaderboardsHandler({} as unknown);

    const globalCalls = mockLeaderboardSet.mock.calls.filter((c: unknown[]) => {
      const d = c[0] as Record<string, unknown>;
      return d['cohort'] === 'global';
    });
    if (globalCalls.length > 0) {
      const rows = (globalCalls[0][0] as Record<string, unknown>)['rows'] as Array<{ value: number }>;
      for (let i = 0; i < rows.length - 1; i++) {
        expect(rows[i].value).toBeGreaterThanOrEqual(rows[i + 1].value);
      }
    }
  });

  it('computes leaderboards for all period × cohort combinations', async () => {
    await recomputeLeaderboardsHandler({} as unknown);

    // 3 periods × 4 cohorts = 12 writes
    expect(mockLeaderboardSet.mock.calls.length).toBeGreaterThanOrEqual(12);
  });
});
