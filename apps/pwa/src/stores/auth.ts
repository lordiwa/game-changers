/*
 * Plan 02-02 Task 2 — Pinia auth store.
 *
 * Wraps useAuth composable and exposes a reactive AuthState object matching the
 * AuthState interface from packages/shared/src/types/index.ts.
 *
 * Downstream views import this store to read/mutate auth state without coupling
 * directly to the Firebase SDK or useAuth composable internals.
 */
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAuth } from '../composables/useAuth';
import type { AuthState } from '@gamechangers/shared';

export const useAuthStore = defineStore('auth', () => {
  const {
    currentUser,
    isAnonymous,
    hasDiscord,
    ageVerified,
    isMinor,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signInWithPhone,
    confirmPhoneCode,
    signOut,
    verifyAge: verifyAgeAction,
  } = useAuth();

  const authState = computed<AuthState>(() => ({
    uid: currentUser.value?.uid ?? '',
    isAnonymous: isAnonymous.value,
    email: currentUser.value?.email ?? undefined,
    phone: currentUser.value?.phoneNumber ?? undefined,
    hasDiscord: hasDiscord.value,
    ageVerified: ageVerified.value,
    isMinor: isMinor.value,
  }));

  return {
    // Reactive state
    currentUser,
    authState,
    isAnonymous,
    hasDiscord,
    ageVerified,
    isMinor,
    // Actions
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signInWithPhone,
    confirmPhoneCode,
    signOut,
    verifyAge: verifyAgeAction,
  };
});
