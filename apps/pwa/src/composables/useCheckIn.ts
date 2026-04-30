/*
 * Plan 02-07 — useCheckIn composable.
 *
 * Wraps the QR check-in POST + offline detection + UI state.
 * When offline, enqueues the scan in IDB for Workbox Background Sync replay.
 *
 * Returns: { checkIn, status, pendingScans }
 */
import { ref, computed } from 'vue';
import { useOnline } from '@vueuse/core';
import { useOfflineQueue } from './useOfflineQueue';
import { getCurrentPosition } from './useGeolocation';

export type CheckInStatus = 'idle' | 'scanning' | 'success' | 'error_expired' | 'error_venue' | 'error_offline' | 'error_generic';

export function useCheckIn(eventId: string) {
  const status = ref<CheckInStatus>('idle');
  const isOnline = useOnline();
  const { pendingCount, enqueue } = useOfflineQueue();

  const pendingScans = computed(() => pendingCount.value);

  async function checkIn(qrPayload: string): Promise<CheckInStatus> {
    status.value = 'scanning';

    // Get geo (non-blocking, 3s timeout)
    const geo = await getCurrentPosition();

    if (!isOnline.value) {
      // Queue for Background Sync replay
      await enqueue({
        eventId,
        scannedJwt: qrPayload,
        timestamp: Date.now(),
      });
      status.value = 'error_offline';
      return 'error_offline';
    }

    try {
      const body = JSON.stringify({
        qrPayload,
        geo: geo ? { lat: geo.lat, lng: geo.lng } : undefined,
      });

      // POST to /api/events/{id}/checkin — intercepted by Workbox SW
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        if (data.error === 'QR_EXPIRED') {
          status.value = 'error_expired';
          return 'error_expired';
        }
        if (data.error === 'OUT_OF_VENUE') {
          status.value = 'error_venue';
          return 'error_venue';
        }
        status.value = 'error_generic';
        return 'error_generic';
      }

      status.value = 'success';
      return 'success';
    } catch {
      // Network error — queue for Background Sync
      await enqueue({
        eventId,
        scannedJwt: qrPayload,
        timestamp: Date.now(),
      });
      status.value = 'error_offline';
      return 'error_offline';
    }
  }

  return {
    checkIn,
    status,
    pendingScans,
    isOnline,
  };
}
