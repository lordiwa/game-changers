/**
 * profile.ts — Pinia store for the current user's profile/main document.
 *
 * Hot-path: one getDoc per page load (NOT onSnapshot per ESLint rule).
 * HP/Stamina/Mente/Social are denormalized into profile/main by recomputeStats Function.
 *
 * Boot stats guaranteed by recomputeStats: { hp:1, stamina:1, mente:1, social:1 }
 * so CharacterSheet always renders full color per Pitfall #9 + PROF-12.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../firebase';
import type { ProfileMain } from '@gamechangers/shared';

const db = getFirestore(firebaseApp);

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<ProfileMain | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchProfile(uid: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const snap = await getDoc(doc(db, `users/${uid}/profile/main`));
      if (snap.exists()) {
        profile.value = snap.data() as ProfileMain;
      } else {
        // Bootstrap empty profile with minimum stats (Pitfall #9)
        profile.value = {
          displayName: '',
          city: 'other',
          favGames: [],
          gamingPlatforms: [],
          publicVisibility: false,
          theme: 'dark',
          locale: 'es',
          dataSaver: false,
          level: 1,
          xp: 0,
          stats: { hp: 1, stamina: 1, mente: 1, social: 1 },
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as ProfileMain;
      }
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(updates: Partial<ProfileMain>): Promise<void> {
    const uid = getAuth(firebaseApp).currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    await setDoc(
      doc(db, `users/${uid}/profile/main`),
      { ...updates, updatedAt: new Date() },
      { merge: true },
    );

    // Update local state
    if (profile.value) {
      profile.value = { ...profile.value, ...updates };
    }
  }

  // Convenience computed
  const stats = computed(() => profile.value?.stats ?? { hp: 1, stamina: 1, mente: 1, social: 1 });
  const displayName = computed(() => profile.value?.displayName ?? '');
  const level = computed(() => profile.value?.level ?? 1);
  const xp = computed(() => profile.value?.xp ?? 0);

  return { profile, loading, error, fetchProfile, updateProfile, stats, displayName, level, xp };
});
