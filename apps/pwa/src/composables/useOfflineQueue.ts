/*
 * Plan 02-07 — useOfflineQueue composable.
 *
 * Wraps @vueuse/integrations/useIDBKeyval to expose a reactive offline check-in queue.
 * The Workbox Background Sync API (configured in vite.config.ts) handles the actual
 * replay when connectivity is restored. This composable is for UI display only
 * (pending count, manual flush trigger).
 *
 * Queue entry shape: { eventId, scannedJwt, timestamp }
 */
import { computed, watch } from 'vue';
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval';
import { useOnline } from '@vueuse/core';
import { update as idbUpdate } from 'idb-keyval';

export interface OfflineCheckInEntry {
  eventId: string;
  scannedJwt: string;
  timestamp: number;
}

const QUEUE_KEY = 'gc_offline_checkin_queue';

export function useOfflineQueue() {
  const { data: queue, set: setQueue } = useIDBKeyval<OfflineCheckInEntry[]>(QUEUE_KEY, []);
  const isOnline = useOnline();

  const pendingCount = computed(() => (queue.value ?? []).length);

  async function enqueue(entry: OfflineCheckInEntry): Promise<void> {
    // WR-16: idb-keyval's `update()` runs the mutator inside an IDB transaction
    // so concurrent enqueue() calls cannot race the read-modify-write. Without
    // this, two parallel enqueues both read the same `current` and one entry
    // is silently dropped — losing offline check-in scans.
    let next: OfflineCheckInEntry[] = [];
    await idbUpdate<OfflineCheckInEntry[]>(QUEUE_KEY, (current) => {
      next = [...(current ?? []), entry];
      return next;
    });
    // Sync the reactive ref so the UI's pendingCount updates immediately.
    await setQueue(next);
  }

  async function dequeue(timestamp: number): Promise<void> {
    let next: OfflineCheckInEntry[] = [];
    await idbUpdate<OfflineCheckInEntry[]>(QUEUE_KEY, (current) => {
      next = (current ?? []).filter((e) => e.timestamp !== timestamp);
      return next;
    });
    await setQueue(next);
  }

  async function clearAll(): Promise<void> {
    await setQueue([]);
  }

  // When online, Workbox Background Sync handles replay automatically.
  // This watch triggers a UI refresh so the pending count updates.
  watch(isOnline, (online) => {
    if (online) {
      // Workbox will replay the queue; we just need to poll for completion
      // In practice, Workbox clears the IDB queue after successful replay.
      // The UI will update reactively when queue.value changes.
    }
  });

  return {
    queue,
    pendingCount,
    isOnline,
    enqueue,
    dequeue,
    clearAll,
  };
}
