/*
 * Plan 02-02 — Playwright E2E test configuration.
 *
 * Targets: tests/e2e/*.spec.ts
 * Requirements: Firebase Emulator Suite running (PLAYWRIGHT_E2E=true)
 *               OR skip via skipIfNoEmulator guard in each spec.
 *
 * Run: pnpm playwright test tests/e2e/auth-upgrade.spec.ts
 * CI:  firebase emulators:exec --only auth,firestore,functions,hosting \
 *        "pnpm playwright test tests/e2e/"
 */
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:5000';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000, // DBOT-04: full Discord-link handoff must complete in <90s
  retries: process.env['CI'] ? 1 : 0,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer block — emulators are started separately by CI via firebase emulators:exec.
});
