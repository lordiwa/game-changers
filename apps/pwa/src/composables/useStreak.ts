/**
 * useStreak.ts — Composable for reactive streak data from Firestore.
 *
 * Reads /users/{uid}/streaks collection (one-shot getDocs, NOT onSnapshot per ESLint rule).
 * Returns streaks per track + days remaining in the shield window.
 */
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
import { useCurrentUser } from 'vuefire';
import { firebaseApp } from '../firebase';
import type { Streak } from '@gamechangers/shared';

type TrackId = 'fitness' | 'social' | 'knowledge' | 'leadership';

export interface StreakWithDaysRemaining extends Streak {
  daysRemainingInWindow: number;
}

export interface UseStreakReturn {
  streaks: Ref<Record<TrackId, StreakWithDaysRemaining | null>>;
  loading: Ref<boolean>;
  refresh: () => Promise<void>;
  longestStreak: ComputedRef<number>;
}

export function useStreak(): UseStreakReturn {
  const currentUser = useCurrentUser();
  const db = getFirestore(firebaseApp);

  const streaks = ref<Record<TrackId, StreakWithDaysRemaining | null>>({
    fitness: null,
    social: null,
    knowledge: null,
    leadership: null,
  });
  const loading = ref(false);

  function daysUntilMonday(from: Date): number {
    const day = from.getDay(); // 0=Sun, 1=Mon, ...
    if (day === 1) return 7; // Already Monday, next shield window is next Monday
    return (8 - day) % 7;
  }

  async function refresh(): Promise<void> {
    const uid = currentUser.value?.uid;
    if (!uid) return;

    loading.value = true;
    try {
      const snap = await getDocs(collection(db, `users/${uid}/streaks`));
      const result: Record<TrackId, StreakWithDaysRemaining | null> = {
        fitness: null,
        social: null,
        knowledge: null,
        leadership: null,
      };

      for (const doc of snap.docs) {
        const data = doc.data() as Streak;
        const trackId = doc.id as TrackId;
        if (['fitness', 'social', 'knowledge', 'leadership'].includes(trackId)) {
          result[trackId] = {
            ...data,
            daysRemainingInWindow: daysUntilMonday(new Date()),
          };
        }
      }
      streaks.value = result;
    } finally {
      loading.value = false;
    }
  }

  // Auto-refresh when user logs in
  watch(
    () => currentUser.value?.uid,
    (uid) => { if (uid) refresh(); },
    { immediate: true },
  );

  const longestStreak = computed<number>(() => {
    let max = 0;
    for (const s of Object.values(streaks.value)) {
      if (s && s.longestDays > max) max = s.longestDays;
    }
    return max;
  });

  return { streaks, loading, refresh, longestStreak };
}
