/**
 * backfill-counters.test.ts — Emulator-backed test for the WR-06 historical backfill.
 *
 * Plan: 02-14 (G3). Closes the gap that existing users (pre-WR-06 deploy) lack
 * `eventAttendedTotal` / `contentCompletedTotal` denormalized counters on their
 * /users/{uid}/profile/main doc. This test pins the script's behaviour:
 *
 *   1. Aggregation correctness — counts of `event_attended` + `content_completed`
 *      auditLog `xp_awarded` entries must equal the values written to profile/main.
 *   2. Merge safety — pre-existing fields on profile/main (e.g. displayName) are
 *      preserved (T-02-14-02).
 *   3. Idempotency — re-running on the same dataset produces the same target
 *      doc state; no drift.
 *   4. Dry-run mode — produces NO Firestore writes.
 *   5. Single-user mode (`--uid=A`) — only the targeted profile is touched.
 *
 * The script under test computes totals from the auditLog as a SOURCE OF TRUTH
 * (using set, not increment), so re-runs converge to the same value — proven below.
 *
 * Emulator dependency:
 *   These tests require the Firebase Firestore emulator to be running. CI runs
 *   them via `firebase emulators:exec 'pnpm --filter @gamechangers/scripts test'`.
 *   Local execution: start `firebase emulators:start --only firestore` first, OR
 *   set `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` to point at an existing emulator.
 *
 * If the emulator host is unreachable, the suite is auto-skipped (consistent with
 * the existing tests/rules pattern in this repo).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Emulator availability guard ───────────────────────────────────────────────
const EMULATOR_HOST = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
const [emHost, emPortStr] = EMULATOR_HOST.split(':');
const emPort = Number(emPortStr ?? '8080');

// Probe: skip the suite if the emulator is unreachable. Using a TCP-ish probe
// via fetch on the emulator REST endpoint (returns 200 even without auth).
async function emulatorReachable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`http://${emHost}:${emPort}/`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.status === 200 || res.status === 404; // emulator answers either
  } catch {
    return false;
  }
}

describe('backfill-counters script', () => {
  let testEnv: RulesTestEnvironment | null = null;
  let skipAll = false;

  beforeAll(async () => {
    if (!(await emulatorReachable())) {
      // eslint-disable-next-line no-console
      console.warn(
        `[backfill-counters.test] Firestore emulator not reachable at ${EMULATOR_HOST} — skipping suite.`,
      );
      skipAll = true;
      return;
    }
    const rulesPath = resolve(__dirname, '..', '..', 'firestore.rules');
    testEnv = await initializeTestEnvironment({
      projectId: 'gamechangers-backfill-test',
      firestore: {
        rules: readFileSync(rulesPath, 'utf8'),
        host: emHost ?? '127.0.0.1',
        port: emPort,
      },
    });
    // Ensure backfill-counters.ts will hit the emulator, not prod.
    process.env['FIRESTORE_EMULATOR_HOST'] = `${emHost}:${emPort}`;
    process.env['GCLOUD_PROJECT'] = 'gamechangers-backfill-test';
  });

  beforeEach(async () => {
    if (skipAll || !testEnv) return;
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup();
  });

  // Test fixture: 10 users with varying audit-log counts, plus pre-existing
  // profile fields to verify merge safety.
  const SCENARIO: Array<{ uid: string; events: number; content: number }> = [
    { uid: 'user-A', events: 5, content: 3 },
    { uid: 'user-B', events: 0, content: 7 },
    { uid: 'user-C', events: 100, content: 0 }, // volume case
    { uid: 'user-D', events: 0, content: 0 }, // empty case
    { uid: 'user-E', events: 2, content: 1 },
    { uid: 'user-F', events: 1, content: 4 },
    { uid: 'user-G', events: 3, content: 2 },
    { uid: 'user-H', events: 8, content: 6 },
    { uid: 'user-I', events: 4, content: 0 },
    { uid: 'user-J', events: 0, content: 9 },
  ];

  async function seed(): Promise<void> {
    if (!testEnv) throw new Error('testEnv missing');
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      // Seed pre-existing profile docs (with OTHER fields to assert merge).
      for (const s of SCENARIO) {
        await db.doc(`users/${s.uid}/profile/main`).set({
          displayName: `Display ${s.uid}`,
          createdAt: new Date('2026-01-01').toISOString(),
        });
      }
      // Seed auditLog entries — schema mirrors xpAward.ts:
      //   { action: 'xp_awarded', uid, type: 'event_attended' | 'content_completed', ... }
      let n = 0;
      for (const s of SCENARIO) {
        for (let i = 0; i < s.events; i++) {
          await db.collection('auditLog').doc(`evt-${s.uid}-${i}`).set({
            action: 'xp_awarded',
            uid: s.uid,
            type: 'event_attended',
            delta: 100,
            timestamp: new Date(2026, 1, 1, 0, 0, n++).toISOString(),
          });
        }
        for (let i = 0; i < s.content; i++) {
          await db.collection('auditLog').doc(`con-${s.uid}-${i}`).set({
            action: 'xp_awarded',
            uid: s.uid,
            type: 'content_completed',
            delta: 30,
            timestamp: new Date(2026, 1, 1, 0, 0, n++).toISOString(),
          });
        }
      }
      // Add an unrelated auditLog entry that MUST NOT be counted.
      await db.collection('auditLog').doc('noise-1').set({
        action: 'xp_awarded',
        uid: 'user-A',
        type: 'challenge_progress',
        timestamp: new Date(2026, 1, 1, 0, 0, ++n).toISOString(),
      });
      await db.collection('auditLog').doc('noise-2').set({
        action: 'consent_granted', // wrong action — must be ignored
        uid: 'user-B',
        type: 'event_attended',
        timestamp: new Date(2026, 1, 1, 0, 0, ++n).toISOString(),
      });
    });
  }

  async function readProfile(uid: string): Promise<Record<string, unknown>> {
    if (!testEnv) throw new Error('testEnv missing');
    let out: Record<string, unknown> = {};
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const snap = await ctx.firestore().doc(`users/${uid}/profile/main`).get();
      out = (snap.data() ?? {}) as Record<string, unknown>;
    });
    return out;
  }

  async function importScript() {
    // Dynamic import so the test file still loads in the RED phase
    // (before scripts/backfill-counters.ts is authored).
    return await import('../backfill-counters.ts');
  }

  it('aggregates auditLog counts onto profile/main (real run)', async () => {
    if (skipAll) return;
    await seed();

    const mod = await importScript();
    const result = await mod.runBackfill({
      project: 'gamechangers-backfill-test',
      dryRun: false,
    });

    expect(result.usersScanned).toBeGreaterThanOrEqual(SCENARIO.length);
    expect(result.usersUpdated).toBeGreaterThanOrEqual(SCENARIO.length);

    for (const s of SCENARIO) {
      const profile = await readProfile(s.uid);
      expect(profile['eventAttendedTotal']).toBe(s.events);
      expect(profile['contentCompletedTotal']).toBe(s.content);
      // Merge safety: pre-existing fields preserved (T-02-14-02)
      expect(profile['displayName']).toBe(`Display ${s.uid}`);
      expect(profile['createdAt']).toBe(new Date('2026-01-01').toISOString());
    }
  });

  it('dry-run produces NO writes', async () => {
    if (skipAll) return;
    await seed();

    const mod = await importScript();
    const result = await mod.runBackfill({
      project: 'gamechangers-backfill-test',
      dryRun: true,
    });

    expect(result.usersScanned).toBeGreaterThanOrEqual(SCENARIO.length);
    expect(result.usersUpdated).toBe(0);

    // Profiles must NOT have the counters set (only the seeded fields).
    for (const s of SCENARIO) {
      const profile = await readProfile(s.uid);
      expect(profile['eventAttendedTotal']).toBeUndefined();
      expect(profile['contentCompletedTotal']).toBeUndefined();
      expect(profile['displayName']).toBe(`Display ${s.uid}`);
    }
  });

  it('is idempotent — second run produces no diff', async () => {
    if (skipAll) return;
    await seed();

    const mod = await importScript();
    await mod.runBackfill({ project: 'gamechangers-backfill-test', dryRun: false });

    // Snapshot all profiles after first run.
    const snapshot1: Record<string, Record<string, unknown>> = {};
    for (const s of SCENARIO) {
      snapshot1[s.uid] = await readProfile(s.uid);
    }

    // Second run — must produce the same target state.
    const result2 = await mod.runBackfill({
      project: 'gamechangers-backfill-test',
      dryRun: false,
    });
    expect(result2.usersScanned).toBeGreaterThanOrEqual(SCENARIO.length);

    for (const s of SCENARIO) {
      const after = await readProfile(s.uid);
      // Counters identical.
      expect(after['eventAttendedTotal']).toBe(snapshot1[s.uid]?.['eventAttendedTotal']);
      expect(after['contentCompletedTotal']).toBe(
        snapshot1[s.uid]?.['contentCompletedTotal'],
      );
      // Other fields untouched.
      expect(after['displayName']).toBe(snapshot1[s.uid]?.['displayName']);
    }
  });

  it('--uid mode targets only the named user', async () => {
    if (skipAll) return;
    await seed();

    const mod = await importScript();
    const result = await mod.runBackfill({
      project: 'gamechangers-backfill-test',
      dryRun: false,
      uid: 'user-A',
    });

    expect(result.usersScanned).toBe(1);
    expect(result.usersUpdated).toBe(1);

    // user-A updated...
    const a = await readProfile('user-A');
    expect(a['eventAttendedTotal']).toBe(5);
    expect(a['contentCompletedTotal']).toBe(3);

    // ...others untouched (no counters set).
    for (const s of SCENARIO) {
      if (s.uid === 'user-A') continue;
      const profile = await readProfile(s.uid);
      expect(profile['eventAttendedTotal']).toBeUndefined();
      expect(profile['contentCompletedTotal']).toBeUndefined();
    }
  });

  it('ignores unrelated auditLog entries (action != xp_awarded or type not in [event,content])', async () => {
    if (skipAll) return;
    await seed();

    const mod = await importScript();
    await mod.runBackfill({ project: 'gamechangers-backfill-test', dryRun: false });

    // user-A had a noise `challenge_progress` xp_awarded entry — must NOT count.
    const a = await readProfile('user-A');
    expect(a['eventAttendedTotal']).toBe(5); // not 6
    // user-B had a noise `consent_granted` action with type=event_attended — must NOT count.
    const b = await readProfile('user-B');
    expect(b['eventAttendedTotal']).toBe(0); // not 1
  });
});
