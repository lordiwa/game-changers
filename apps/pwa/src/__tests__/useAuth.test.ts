/*
 * Plan 02-02 Task 2 — useAuth composable unit tests.
 *
 * Asserts (ADR-008, T-02-02-09):
 *  - signUpWithEmail calls linkWithCredential when user is anonymous (uid preserved).
 *  - signUpWithEmail calls createUserWithEmailAndPassword when user is NOT anonymous.
 *  - uid before upgrade equals uid after upgrade (ADR-008 anonymous uid is canonical).
 *  - sendPasswordReset calls sendPasswordResetEmail.
 *  - signOut calls firebase signOut.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// ─── Firebase / VueFire mocks ─────────────────────────────────────────────────

const ANON_UID = 'anon-uid-stable-test';
const FULL_UID = 'full-uid-after-upgrade'; // would only appear if createUser was mistakenly called

const linkWithCredentialMock = vi.fn(async () => ({
  user: { uid: ANON_UID, isAnonymous: false, email: 'test@gc.gg', phoneNumber: null },
}));
const createUserWithEmailAndPasswordMock = vi.fn(async () => ({
  user: { uid: FULL_UID, isAnonymous: false, email: 'test@gc.gg', phoneNumber: null },
}));
const signInWithEmailAndPasswordMock = vi.fn(async () => ({
  user: { uid: ANON_UID, isAnonymous: false, email: 'test@gc.gg', phoneNumber: null },
}));
const sendPasswordResetEmailMock = vi.fn(async () => undefined);
const signOutMock = vi.fn(async () => undefined);
const getIdTokenMock = vi.fn(async () => 'id-token');

// Fake current user — anonymous by default; tests can override.
let fakeCurrentUser: { uid: string; isAnonymous: boolean; email: string | null; phoneNumber: string | null; getIdToken: () => Promise<string> } | null = {
  uid: ANON_UID,
  isAnonymous: true,
  email: null,
  phoneNumber: null,
  getIdToken: getIdTokenMock,
};

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    get currentUser() { return fakeCurrentUser; },
  }),
  signInWithEmailAndPassword: (_auth: unknown, email: string, pw: string) =>
    signInWithEmailAndPasswordMock(email, pw),
  createUserWithEmailAndPassword: (_auth: unknown, email: string, pw: string) =>
    createUserWithEmailAndPasswordMock(email, pw),
  linkWithCredential: (_user: unknown, _cred: unknown) => linkWithCredentialMock(),
  EmailAuthProvider: {
    credential: (email: string, pw: string) => ({ email, pw, _type: 'email-credential' }),
  },
  sendPasswordResetEmail: (_auth: unknown, email: string) => sendPasswordResetEmailMock(email),
  signInWithPhoneNumber: vi.fn(),
  signInWithCustomToken: vi.fn(),
  signOut: (_auth: unknown) => signOutMock(),
  RecaptchaVerifier: vi.fn(),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => async () => ({ data: { ageVerified: true, isMinor: false, parentalConsentRequired: false } }),
}));

vi.mock('../firebase', () => ({
  firebaseApp: {},
}));

vi.mock('vuefire', () => ({
  useCurrentUser: () => ref(fakeCurrentUser),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  beforeEach(() => {
    linkWithCredentialMock.mockClear();
    createUserWithEmailAndPasswordMock.mockClear();
    signInWithEmailAndPasswordMock.mockClear();
    sendPasswordResetEmailMock.mockClear();
    signOutMock.mockClear();
    // Reset to anonymous user by default.
    fakeCurrentUser = {
      uid: ANON_UID,
      isAnonymous: true,
      email: null,
      phoneNumber: null,
      getIdToken: getIdTokenMock,
    };
  });

  it('signUpWithEmail calls linkWithCredential (not createUser) when user is anonymous — preserves uid (ADR-008)', async () => {
    const { useAuth } = await import('../composables/useAuth');
    const { signUpWithEmail } = useAuth();

    const uidBefore = ANON_UID;
    const result = await signUpWithEmail('gg@example.com', 'password123');
    const uidAfterUpgrade = result.uid;

    // Critical ADR-008 assertion: uid is preserved.
    expect(uidAfterUpgrade).toBe(uidBefore);

    // linkWithCredential used (NOT createUserWithEmailAndPassword).
    expect(linkWithCredentialMock).toHaveBeenCalledOnce();
    expect(createUserWithEmailAndPasswordMock).not.toHaveBeenCalled();
  });

  it('signUpWithEmail calls createUserWithEmailAndPassword when user is NOT anonymous', async () => {
    // Override: non-anonymous user (e.g., signed out entirely or already has email).
    fakeCurrentUser = {
      uid: FULL_UID,
      isAnonymous: false,
      email: null,
      phoneNumber: null,
      getIdToken: getIdTokenMock,
    };

    const { useAuth } = await import('../composables/useAuth');
    const { signUpWithEmail } = useAuth();
    await signUpWithEmail('other@example.com', 'password123');

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledOnce();
    expect(linkWithCredentialMock).not.toHaveBeenCalled();
  });

  it('signUpWithEmail — null currentUser falls through to createUserWithEmailAndPassword', async () => {
    fakeCurrentUser = null;

    const { useAuth } = await import('../composables/useAuth');
    const { signUpWithEmail } = useAuth();
    await signUpWithEmail('new@example.com', 'password123');

    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledOnce();
  });

  it('sendPasswordReset calls sendPasswordResetEmail with the given address', async () => {
    const { useAuth } = await import('../composables/useAuth');
    const { sendPasswordReset } = useAuth();
    await sendPasswordReset('test@gc.gg');
    expect(sendPasswordResetEmailMock).toHaveBeenCalledWith('test@gc.gg');
  });

  it('signOut delegates to firebase signOut', async () => {
    const { useAuth } = await import('../composables/useAuth');
    const { signOut } = useAuth();
    await signOut();
    expect(signOutMock).toHaveBeenCalledOnce();
  });

  it('isAnonymous is true for anonymous user', async () => {
    const { useAuth } = await import('../composables/useAuth');
    const { isAnonymous } = useAuth();
    expect(isAnonymous.value).toBe(true);
  });

  it('isAnonymous is false for non-anonymous user', async () => {
    fakeCurrentUser = { uid: FULL_UID, isAnonymous: false, email: 'a@b.c', phoneNumber: null, getIdToken: getIdTokenMock };
    const { useAuth } = await import('../composables/useAuth');
    const { isAnonymous } = useAuth();
    expect(isAnonymous.value).toBe(false);
  });
});
