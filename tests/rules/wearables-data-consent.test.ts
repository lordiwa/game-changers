/**
 * wearables-data-consent.test.ts — Firestore Security Rules for wearable data.
 *
 * Assertions:
 *   1. Client write to /users/{uid}/healthSamples ALWAYS DENIED (Functions service-account only).
 *   2. Client read to /users/{uid}/healthSamples requires wearable_data consent claim ('w').
 *   3. Client read without consent claim → denied.
 *   4. Client read to /users/{uid}/healthDaily requires wearable_data consent.
 *   5. Cross-user read of healthSamples ALWAYS DENIED.
 *
 * Runs against Firebase Emulator (rules-unit-testing).
 * CI: firebase emulators:exec 'pnpm --filter @gamechangers/tests-rules test'
 */

// NOTE: This test file requires the Firebase Emulator Suite to be running.
// Skip in unit-test-only CI runs; enable with FIREBASE_EMULATOR=1 env var.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const EMULATOR_ENABLED = process.env['FIREBASE_EMULATOR'] === '1';

// Conditional skip — these tests need the Firestore emulator (Java-based).
// They are validated in CI via firebase emulators:exec.
const describeOrSkip = EMULATOR_ENABLED ? describe : describe.skip;

describeOrSkip('Wearable data consent Rules (emulator required)', () => {
  let testEnv: {
    withSecurityRulesDisabled: (fn: (ctx: unknown) => Promise<void>) => Promise<void>;
    authenticatedContext: (uid: string, claims: Record<string, unknown>) => unknown;
    unauthenticatedContext: () => unknown;
    cleanup: () => Promise<void>;
  };

  beforeAll(async () => {
    const { initializeTestEnvironment } = await import('@firebase/rules-unit-testing');
    testEnv = (await initializeTestEnvironment({
      projectId: 'gamechangers-test',
      firestore: {
        rules: (await import('node:fs')).readFileSync(
          new URL('../../../../firestore.rules', import.meta.url),
          'utf8',
        ),
        host: 'localhost',
        port: 8080,
      },
    })) as typeof testEnv;
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  it('client write to healthSamples/{yyyymm}/metrics/{id} is ALWAYS DENIED', async () => {
    const ctx = (testEnv.authenticatedContext as Function)('user-123', {
      consents: { w: true }, // even with consent claim
    }) as { firestore: () => ReturnType<typeof import('@firebase/rules-unit-testing')['assertFails']> };

    const db = (ctx as any).firestore();
    const ref = db.doc('users/user-123/healthSamples/2026-04/metrics/sample-001');

    const { assertFails } = await import('@firebase/rules-unit-testing');
    await assertFails(ref.set({ metric: 'steps', value: 1000 }));
  });

  it('client read of healthSamples WITHOUT consent claim is DENIED', async () => {
    const ctx = (testEnv.authenticatedContext as Function)('user-123', {
      consents: {}, // no wearable_data claim
    }) as any;

    const db = ctx.firestore();
    const ref = db.doc('users/user-123/healthSamples/2026-04/metrics/sample-001');

    const { assertFails } = await import('@firebase/rules-unit-testing');
    await assertFails(ref.get());
  });

  it('client read of healthSamples WITH wearable_data claim (w=true) is ALLOWED', async () => {
    // First seed the doc (bypass rules)
    await testEnv.withSecurityRulesDisabled(async (ctx: any) => {
      await ctx
        .firestore()
        .doc('users/user-123/healthSamples/2026-04/metrics/sample-001')
        .set({ metric: 'steps', value: 5000 });
    });

    const ctx = (testEnv.authenticatedContext as Function)('user-123', {
      consents: { w: true },
      ageVerified: true,
    }) as any;

    const db = ctx.firestore();
    const ref = db.doc('users/user-123/healthSamples/2026-04/metrics/sample-001');

    const { assertSucceeds } = await import('@firebase/rules-unit-testing');
    await assertSucceeds(ref.get());
  });

  it('cross-user read of healthSamples is ALWAYS DENIED', async () => {
    const ctx = (testEnv.authenticatedContext as Function)('user-OTHER', {
      consents: { w: true },
      ageVerified: true,
    }) as any;

    const db = ctx.firestore();
    // user-OTHER trying to read user-123's samples
    const ref = db.doc('users/user-123/healthSamples/2026-04/metrics/sample-001');

    const { assertFails } = await import('@firebase/rules-unit-testing');
    await assertFails(ref.get());
  });

  it('client read of healthDaily WITHOUT consent is DENIED', async () => {
    const ctx = (testEnv.authenticatedContext as Function)('user-123', {
      consents: {}, // no wearable claim
    }) as any;

    const db = ctx.firestore();
    const ref = db.doc('users/user-123/healthDaily/2026-04-01');

    const { assertFails } = await import('@firebase/rules-unit-testing');
    await assertFails(ref.get());
  });

  it('client write to healthDaily is ALWAYS DENIED (Functions only)', async () => {
    const ctx = (testEnv.authenticatedContext as Function)('user-123', {
      consents: { w: true },
      ageVerified: true,
    }) as any;

    const db = ctx.firestore();
    const ref = db.doc('users/user-123/healthDaily/2026-04-01');

    const { assertFails } = await import('@firebase/rules-unit-testing');
    await assertFails(ref.set({ stepsTotal: 8000 }));
  });
});

// Always-run structural test (no emulator needed)
describe('Wearable rules structural assertions (no emulator)', () => {
  it('firestore.rules contains healthSamples allow-read with wearable_data consent', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { resolve, dirname } = await import('node:path');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rulesPath = resolve(__dirname, '../../firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');

    // healthSamples rule must check wearable_data consent claim
    expect(rules).toMatch(/healthSamples/);
    expect(rules).toMatch(/hasConsentClaim\('wearable_data'\)/);
  });

  it('firestore.rules healthSamples write is set to false (client writes denied)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { resolve, dirname } = await import('node:path');

    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rulesPath = resolve(__dirname, '../../firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');

    // The healthSamples block should deny writes
    const healthSamplesBlock = rules.substring(
      rules.indexOf('/users/{uid}/healthSamples'),
      rules.indexOf('/users/{uid}/healthSamples') + 300,
    );
    expect(healthSamplesBlock).toMatch(/allow write: if false/);
  });
});
