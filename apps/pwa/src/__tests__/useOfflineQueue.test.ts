/*
 * Plan 02-07 — useOfflineQueue composable unit tests.
 *
 * Assertions (T-02-07-10):
 *  - enqueue adds an entry to the queue
 *  - dequeue removes an entry by timestamp
 *  - clearAll empties the queue
 *  - pendingCount is computed reactively from queue length
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// ─── @vueuse/integrations/useIDBKeyval mock ───────────────────────────────────
const mockData = ref<{ eventId: string; scannedJwt: string; timestamp: number }[]>([]);
const mockSet = vi.fn(async (val: typeof mockData.value) => {
  mockData.value = val;
});

vi.mock('@vueuse/integrations/useIDBKeyval', () => ({
  useIDBKeyval: (_key: string, _defaultVal: unknown) => ({
    data: mockData,
    set: mockSet,
  }),
}));

// ─── @vueuse/core mock ────────────────────────────────────────────────────────
const mockIsOnline = ref(true);
vi.mock('@vueuse/core', () => ({
  useOnline: () => mockIsOnline,
}));

import { useOfflineQueue } from '../composables/useOfflineQueue';

describe('useOfflineQueue', () => {
  beforeEach(() => {
    mockData.value = [];
    mockSet.mockClear();
    mockIsOnline.value = true;
  });

  it('starts with an empty queue', () => {
    const { pendingCount } = useOfflineQueue();
    expect(pendingCount.value).toBe(0);
  });

  it('enqueue adds an entry and increments pendingCount', async () => {
    const { enqueue, pendingCount } = useOfflineQueue();
    const entry = { eventId: 'evt-1', scannedJwt: 'jwt.payload', timestamp: 1000 };

    await enqueue(entry);

    expect(mockSet).toHaveBeenCalledWith([entry]);
    expect(pendingCount.value).toBe(1);
  });

  it('enqueue appends to existing entries', async () => {
    mockData.value = [{ eventId: 'evt-0', scannedJwt: 'jwt.0', timestamp: 500 }];
    const { enqueue } = useOfflineQueue();
    const entry = { eventId: 'evt-1', scannedJwt: 'jwt.1', timestamp: 1000 };

    await enqueue(entry);

    expect(mockSet).toHaveBeenCalledWith([
      { eventId: 'evt-0', scannedJwt: 'jwt.0', timestamp: 500 },
      { eventId: 'evt-1', scannedJwt: 'jwt.1', timestamp: 1000 },
    ]);
  });

  it('dequeue removes the entry with matching timestamp', async () => {
    mockData.value = [
      { eventId: 'evt-1', scannedJwt: 'jwt.1', timestamp: 1000 },
      { eventId: 'evt-2', scannedJwt: 'jwt.2', timestamp: 2000 },
    ];
    const { dequeue } = useOfflineQueue();

    await dequeue(1000);

    expect(mockSet).toHaveBeenCalledWith([
      { eventId: 'evt-2', scannedJwt: 'jwt.2', timestamp: 2000 },
    ]);
  });

  it('clearAll empties the queue', async () => {
    mockData.value = [
      { eventId: 'evt-1', scannedJwt: 'jwt.1', timestamp: 1000 },
      { eventId: 'evt-2', scannedJwt: 'jwt.2', timestamp: 2000 },
    ];
    const { clearAll, pendingCount } = useOfflineQueue();

    await clearAll();

    expect(mockSet).toHaveBeenCalledWith([]);
    expect(pendingCount.value).toBe(0);
  });

  it('isOnline reflects the VueFire useOnline ref', () => {
    const { isOnline } = useOfflineQueue();
    expect(isOnline.value).toBe(true);

    mockIsOnline.value = false;
    expect(isOnline.value).toBe(false);
  });
});
