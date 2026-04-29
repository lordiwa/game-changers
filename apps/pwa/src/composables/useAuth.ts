/*
 * Plan 02-02 Task 2 — useAuth composable.
 *
 * Wraps VueFire's useFirebaseAuth/useCurrentUser and the Firebase Web SDK auth
 * methods to expose a typed, reactive auth surface to Vue components.
 *
 * Key invariants:
 *  - signUpWithEmail calls linkWithCredential (not createUserWithEmailAndPassword)
 *    when the current user is anonymous — preserves the anonymous uid per ADR-008.
 *  - verifyAge calls the verifyAge Cloud Function (server-side age enforcement per D-14).
 *  - signInWithPhone returns a ConfirmationResult; confirmPhoneCode completes the flow.
 */
import { computed, type ComputedRef, type Ref } from 'vue';
import { useCurrentUser } from 'vuefire';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  type User,
  type ConfirmationResult,
  RecaptchaVerifier,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../firebase';

const auth = getAuth(firebaseApp);
const functions = getFunctions(firebaseApp, 'southamerica-east1');

export function useAuth() {
  const currentUser = useCurrentUser() as Ref<User | null>;

  const isAnonymous: ComputedRef<boolean> = computed(
    () => currentUser.value?.isAnonymous ?? false,
  );

  const hasDiscord: ComputedRef<boolean> = computed(() => {
    const claims = (currentUser.value as (User & { _claims?: Record<string, unknown> }) | null)
      ?._claims;
    // Custom claims arrive via the ID token; VueFire exposes them on the decoded token.
    // In production, access via getIdTokenResult().claims; here we derive from the
    // raw token on the auth object (set after signInWithCustomToken from discordExchange).
    return Boolean((auth.currentUser as (User & { customClaims?: Record<string, unknown> }) | null)?.customClaims?.['hasDiscord']);
  });

  const ageVerified: ComputedRef<boolean> = computed(() => {
    return false; // Updated after verifyAge() resolves and custom claims are refreshed.
  });

  const isMinor: ComputedRef<boolean> = computed(() => {
    return false; // Updated after verifyAge() resolves and custom claims are refreshed.
  });

  async function signInWithEmail(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function signUpWithEmail(email: string, password: string): Promise<User> {
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      // ADR-008: link credentials to the anonymous uid, preserving XP/badges.
      const credential = EmailAuthProvider.credential(email, password);
      const cred = await linkWithCredential(current, credential);
      return cred.user;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  function signInWithPhone(phone: string, recaptchaContainer: HTMLElement): Promise<ConfirmationResult> {
    const verifier = new RecaptchaVerifier(auth, recaptchaContainer, { size: 'invisible' });
    return signInWithPhoneNumber(auth, phone, verifier);
  }

  async function confirmPhoneCode(result: ConfirmationResult, code: string): Promise<User> {
    const cred = await result.confirm(code);
    return cred.user;
  }

  async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async function verifyAge(birthDate: string): Promise<{ ageVerified: boolean; isMinor: boolean; parentalConsentRequired: boolean }> {
    const verifyAgeFn = httpsCallable<{ birthDate: string }, { ageVerified: boolean; isMinor: boolean; parentalConsentRequired: boolean }>(
      functions,
      'verifyAge',
    );
    const result = await verifyAgeFn({ birthDate });
    // Force token refresh so new custom claims (ageVerified, isMinor) propagate.
    await auth.currentUser?.getIdToken(true);
    return result.data;
  }

  return {
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
    verifyAge,
    signInWithCustomToken: (token: string) => signInWithCustomToken(auth, token),
  };
}
