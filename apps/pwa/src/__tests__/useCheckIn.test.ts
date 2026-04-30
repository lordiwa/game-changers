/*
 * Plan 02-07 — useCheckIn composable unit tests.
 *
 * Assertions (T-02-07-07, T-02-07-10):
 *  - Online happy path: POST returns 200 → status 'success'
 *  - QR_EXPIRED error → status 'error_expired'
 *  - OUT_OF_VENUE error → status 'error_venue'
 *  - Offline: enqueues to IDB and returns 'error_offline'
 *  - Network fetch throws: enqueues to IDB and returns 'error_offline'
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// ─── @vueuse/core mock ────────────────────────────────────────────────────────
const mockIsOnline = ref(true);
vi.mock('@vueuse/core', () => ({
  useOnline: () => mockIsOnline,
}));

// ─── useOfflineQueue mock ─────────────────────────────────────────────────────
const enqueueMock = vi.fn(async () => undefined);
const pendingCount = ref(0);
vi.mock('../composables/useOfflineQueue', () => ({
  useOfflineQueue: () => ({
    enqueue: enqueueMock,
    pendingCount,
    queue: ref([]),
    isOnline: mockIsOnline,
    dequeue: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

// ─── useGeolocation mock ──────────────────────────────────────────────────────
vi.mock('../composables/useGeolocation', () => ({
  getCurrentPosition: vi.fn(async () => ({ lat: -0.18, lng: -78.47 })),
}));

// ─── fetch mock ───────────────────────────────────────────────────────────────
const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

import { useCheckIn } from '../composables/useCheckIn';

describe('useCheckIn', () => {
  beforeEach(() => {
    mockIsOnline.value = true;
    enqueueMock.mockClear();
    fetchMock.mockClear();
  });

  it('returns "success" when POST responds 200', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { checkIn, status } = useCheckIn('evt-1');

    const result = await checkIn('jwt.payload');

    expect(result).toBe('success');
    expect(status.value).toBe('success');
    expect(fetchMock).toHaveBeenCalledWith('/api/events/evt-1/checkin', expect.objectContaining({ method: 'POST' }));
    expect(enqueueMock).not.toHaveBeenCalled();
  });

  it('returns "error_expired" when server returns QR_EXPIRED', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'QR_EXPIRED' }), { status: 400 }),
    );
    const { checkIn, status } = useCheckIn('evt-1');

    const result = await checkIn('jwt.expired');

    expect(result).toBe('error_expired');
    expect(status.value).toBe('error_expired');
  });

  it('returns "error_venue" when server returns OUT_OF_VENUE', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'OUT_OF_VENUE' }), { status: 400 }),
    );
    const { checkIn, status } = useCheckIn('evt-1');

    const result = await checkIn('jwt.valid');

    expect(result).toBe('error_venue');
    expect(status.value).toBe('error_venue');
  });

  it('enqueues and returns "error_offline" when device is offline', async () => {
    mockIsOnline.value = false;
    const { checkIn, status } = useCheckIn('evt-1');

    const result = await checkIn('jwt.payload');

    expect(result).toBe('error_offline');
    expect(status.value).toBe('error_offline');
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-1', scannedJwt: 'jwt.payload' }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enqueues and returns "error_offline" when fetch throws a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { checkIn, status } = useCheckIn('evt-1');

    const result = await checkIn('jwt.payload');

    expect(result).toBe('error_offline');
    expect(status.value).toBe('error_offline');
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: 'evt-1', scannedJwt: 'jwt.payload' }),
    );
  });

  it('starts with status "idle"', () => {
    const { status } = useCheckIn('evt-1');
    expect(status.value).toBe('idle');
  });
});
