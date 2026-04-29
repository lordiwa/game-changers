/**
 * useStreak.test.ts — Unit tests for the useStreak composable.
 *
 * The composable has a watch({ immediate: true }) that calls refresh() when mounted.
 * We mock getDocs to return empty docs by default (safe), then call refresh()
 * explicitly with the desired mock data for each test.
 *
 * Tests:
 * 1. Setup a 3-day fitness streak -> asserts currentDays=3 after refresh().
 * 2. No user authenticated -> streaks stay null.
 * 3. longestStreak returns the maximum longestDays across all tracks.
 * 4. loading is false after a completed fetch.
 * 5. Tracks not in Firestore are null in the result.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Helpers to build mock Firestore docs
function makeStreakDoc(id: string, currentDays: number, longestDays: number) {
  return {
    id,
    data: () => ({
      currentDays,
      longestDays,
      lastActivityAt: new Date().toISOString(),
      shieldsRemaining: 1,
      windowStartedAt: new Date().toISOString(),
    }),
  };
}

// Controllable mockGetDocs — defined before vi.mock to avoid hoisting issues
const mockGetDocs = vi.fn().mockResolvedValue({ docs: [] });

// Controllable currentUser uid
let mockUid: string | null = 'test-uid-streak';

// --- Firebase mocks ---
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  collection: vi.fn((_db: unknown, path: string) => ({ path })),
}));

vi.mock('../firebase', () => ({
  firebaseApp: {},
}));

vi.mock('vuefire', () => ({
  useCurrentUser: () => ({ value: mockUid ? { uid: mockUid } : null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUid = 'test-uid-streak';
  // Default: return empty docs so the immediate watch does not fail
  mockGetDocs.mockResolvedValue({ docs: [] });
});

describe('useStreak', () => {
  it('refresh() sets fitness currentDays=3 when Firestore returns 3-day streak', async () => {
    const { useStreak } = await import('../composables/useStreak');
    const { streaks, refresh } = useStreak();

    mockGetDocs.mockResolvedValueOnce({
      docs: [makeStreakDoc('fitness', 3, 7)],
    });
    await refresh();

    expect(streaks.value.fitness?.currentDays).toBe(3);
    expect(streaks.value.social).toBeNull();
    expect(streaks.value.knowledge).toBeNull();
    expect(streaks.value.leadership).toBeNull();
  });

  it('returns null streaks when no user is authenticated', async () => {
    mockUid = null;

    const { useStreak } = await import('../composables/useStreak');
    const { streaks } = useStreak();

    expect(streaks.value.fitness).toBeNull();
    expect(streaks.value.social).toBeNull();
  });

  it('longestStreak returns the maximum longestDays across all tracks', async () => {
    const { useStreak } = await import('../composables/useStreak');
    const { longestStreak, refresh } = useStreak();

    mockGetDocs.mockResolvedValueOnce({
      docs: [
        makeStreakDoc('fitness', 5, 10),
        makeStreakDoc('social', 12, 20),
        makeStreakDoc('knowledge', 2, 5),
      ],
    });
    await refresh();

    // longestStreak uses longestDays field: max(10, 20, 5) = 20
    expect(longestStreak.value).toBe(20);
  });

  it('loading is false after a completed fetch', async () => {
    const { useStreak } = await import('../composables/useStreak');
    const { loading, refresh } = useStreak();

    mockGetDocs.mockResolvedValueOnce({ docs: [] });
    await refresh();

    expect(loading.value).toBe(false);
  });

  it('tracks absent from Firestore remain null in the result', async () => {
    const { useStreak } = await import('../composables/useStreak');
    const { streaks, refresh } = useStreak();

    // Only social returned
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeStreakDoc('social', 4, 8)],
    });
    await refresh();

    expect(streaks.value.social?.currentDays).toBe(4);
    expect(streaks.value.fitness).toBeNull();
    expect(streaks.value.knowledge).toBeNull();
    expect(streaks.value.leadership).toBeNull();
  });
});
