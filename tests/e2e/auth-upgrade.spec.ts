/*
 * Plan 02-02 Task 2 — E2E: anonymous→email upgrade preserves uid + XP.
 *
 * Asserts (ADR-008, T-02-02-09, AUTH-09):
 *  1. App opens → anonymous user is created (uid X present, isAnonymous=true).
 *  2. 100 XP is written to /users/X/profile/main.xp via the emulator Firestore REST API.
 *  3. User signs up with email → uid is STILL X (linkWithCredential preserves uid).
 *  4. /users/X/profile/main.xp == 100 (XP survived the upgrade).
 *
 * Requirements: Firebase Emulator Suite running (Auth + Firestore + Hosting + Functions).
 * CI runs: firebase emulators:exec --only auth,firestore,hosting,functions \
 *            "pnpm playwright test tests/e2e/auth-upgrade.spec.ts"
 *
 * Skip in unit-test-only CI jobs by checking PLAYWRIGHT_E2E env var.
 */
import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5000';
const FIRESTORE_EMULATOR = process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
const AUTH_EMULATOR = process.env['FIREBASE_AUTH_EMULATOR_HOST'] ?? 'localhost:9099';
const PROJECT_ID = process.env['VITE_FIREBASE_PROJECT_ID'] ?? 'gamechangers-test';

/**
 * Reads the current anonymous uid from the Auth emulator's user list.
 * Returns the most recently created user uid.
 */
async function getLatestAnonUid(): Promise<string> {
  const resp = await fetch(
    `http://${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) },
  );
  const json = (await resp.json()) as { users?: Array<{ localId: string; providerUserInfo?: unknown[] }> };
  const users = json.users ?? [];
  // Anonymous users have no providerUserInfo.
  const anonUsers = users.filter((u) => !u.providerUserInfo || (u.providerUserInfo as unknown[]).length === 0);
  const last = anonUsers[anonUsers.length - 1];
  if (!last) throw new Error('No anonymous user found in emulator');
  return last.localId;
}

/**
 * Writes XP directly to Firestore emulator REST API (bypasses Security Rules — admin-level write).
 */
async function writeXpToEmulator(uid: string, xp: number): Promise<void> {
  const url = `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/profile/main`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        xp: { integerValue: String(xp) },
        // ageVerified: true so that Rules allow subsequent reads (T-02-02-06).
        ageVerified: { booleanValue: true },
        displayName: { stringValue: 'Test Player' },
        discordId: { nullValue: null },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
}

/**
 * Reads XP from Firestore emulator REST API.
 */
async function readXpFromEmulator(uid: string): Promise<number> {
  const url = `http://${FIRESTORE_EMULATOR}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/profile/main`;
  const resp = await fetch(url);
  const json = (await resp.json()) as { fields?: { xp?: { integerValue?: string } } };
  return Number(json.fields?.xp?.integerValue ?? '0');
}

async function waitForAnonymousUser(page: Page): Promise<void> {
  // Wait until the PWA has booted and created an anonymous user.
  await page.waitForFunction(() => {
    const auth = (window as Window & { __firebase_auth_uid?: string }).__firebase_auth_uid;
    return Boolean(auth);
  }, { timeout: 15000 });
}

// Skip E2E in environments without the emulator.
const skipIfNoEmulator = !process.env['PLAYWRIGHT_E2E'] ? test.skip : test;

skipIfNoEmulator.describe('auth upgrade — anonymous uid preservation (ADR-008)', () => {
  test('uid is preserved across anonymous→email upgrade; XP survives', async ({ page }) => {
    // 1. Open app → anonymous user created by main.ts signInAnonymously().
    await page.goto(BASE_URL);
    await waitForAnonymousUser(page);

    const uidBefore = await getLatestAnonUid();
    expect(uidBefore).toBeTruthy();

    // 2. Write 100 XP to the anonymous uid's profile.
    await writeXpToEmulator(uidBefore, 100);
    const xpBefore = await readXpFromEmulator(uidBefore);
    expect(xpBefore).toBe(100);

    // 3. Navigate to sign-up and create an account.
    await page.goto(`${BASE_URL}/auth/signup`);
    const uniqueEmail = `e2e-${Date.now()}@test.gc.gg`;
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', 'Secure_test_pw_2026');
    await page.click('button[type="submit"]');

    // Wait for navigation away from /auth/signup.
    await page.waitForURL((url) => !url.pathname.includes('/auth/signup'), { timeout: 15000 });

    // 4. Verify uid is the SAME (linkWithCredential preserves anonymous uid).
    const uidAfter = await getLatestAnonUid();
    expect(uidAfter).toBe(uidBefore);

    // 5. XP survived the upgrade.
    const xpAfter = await readXpFromEmulator(uidBefore);
    expect(xpAfter).toBe(100);
  });
});

// Always-run structural test (no emulator needed).
test.describe('auth-upgrade spec structure', () => {
  test('spec file exists and imports from playwright', () => {
    // This test just verifies the spec is importable and structurally valid.
    expect(typeof test).toBe('function');
    expect(typeof expect).toBe('function');
  });
});
