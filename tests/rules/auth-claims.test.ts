/*
 * Plan 02-02 Task 2 — auth-claims Firestore Security Rules test.
 *
 * Asserts that writes to /users/{uid}/profile/main require `ageVerified == true`
 * in the caller's custom claims — ensuring the server-side age gate (verifyAge Cloud
 * Function) cannot be bypassed by a client that skips the AgeGate.vue flow.
 *
 * Complements the existing profile-main.test.ts (Plan 01) which tests consent claims;
 * this file focuses on the `ageVerified` custom claim gate specifically (T-02-02-04,
 * T-02-02-06).
 *
 * Note: These tests require the Firebase Emulator Suite (Java-based Firestore emulator).
 * CI runs them via `firebase emulators:exec`; local execution requires `firebase emulators:start`.
 * The test file is structurally complete; emulator-dependent assertions are guarded so the
 * file can be imported without throwing in environments without the emulator.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Emulator availability guard — skip if the emulator host env var is not set.
const EMULATOR_HOST = process.env['FIRESTORE_EMULATOR_HOST'];
const runIfEmulator = EMULATOR_HOST ? it : it.skip;

describe('auth-claims: profile/main write requires ageVerified claim', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let testEnv: any;

  beforeAll(async () => {
    if (!EMULATOR_HOST) return;
    const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing');
    testEnv = await initializeTestEnvironment({
      projectId: 'gamechangers-test',
      firestore: {
        host: EMULATOR_HOST.split(':')[0],
        port: Number(EMULATOR_HOST.split(':')[1] ?? 8080),
        rules: (await import('fs')).readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  runIfEmulator('denies write to profile/main when ageVerified claim is absent', async () => {
    const db = testEnv.authenticatedContext('uid-no-age', {
      // No ageVerified claim — simulates a user who skipped the age gate.
      firebase: { sign_in_provider: 'anonymous' },
    }).firestore();
    const ref = db.doc('users/uid-no-age/profile/main');
    await expect(ref.set({ displayName: 'tester' })).rejects.toThrow();
  });

  runIfEmulator('allows write to profile/main when ageVerified:true claim is present', async () => {
    const db = testEnv.authenticatedContext('uid-age-ok', {
      ageVerified: true,
      firebase: { sign_in_provider: 'password' },
    }).firestore();
    const ref = db.doc('users/uid-age-ok/profile/main');
    await expect(ref.set({ displayName: 'adult-tester' })).resolves.not.toThrow();
  });

  runIfEmulator('denies client write to /private/identity (server-side only per Plan 01 Rules)', async () => {
    const db = testEnv.authenticatedContext('uid-private', {
      ageVerified: true,
    }).firestore();
    const ref = db.doc('users/uid-private/private/identity');
    // Plan 01 Rules deny all client R/W on /private/** — only Functions (admin SDK) can write.
    await expect(ref.set({ birthDate: '2000-01-01' })).rejects.toThrow();
  });

  it('structural: firestore.rules file exists and contains ageVerified claim check', async () => {
    const fs = await import('fs');
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    // The rules must reference ageVerified in the context of profile/main writes.
    expect(rules).toContain('ageVerified');
    // Profile/main write path must be present.
    expect(rules).toContain('profile/main');
  });
});
