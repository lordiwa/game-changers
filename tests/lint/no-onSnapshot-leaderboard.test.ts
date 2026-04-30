/**
 * no-onSnapshot-leaderboard.test.ts — Pitfall #2 ESLint gate.
 *
 * Verifies that the Plan 01 ESLint rule blocks onSnapshot on collections
 * specifically inside apps/pwa/src/views/challenges/** (the leaderboard surface).
 *
 * Bad pattern (MUST be rejected):
 *   import { onSnapshot, collection } from 'firebase/firestore';
 *   const lb = onSnapshot(collection(db, 'challengeProgress'), callback);
 *
 * Clients MUST subscribe to the aggregate doc via useDocument, not scan
 * the entire challengeProgress collection with onSnapshot.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const BAD_FILE = join(REPO_ROOT, 'apps/pwa/src/views/challenges/__bad.ts');

describe('ESLint Pitfall #2 gate — onSnapshot in views/challenges is blocked', () => {
  afterEach(() => {
    if (existsSync(BAD_FILE)) unlinkSync(BAD_FILE);
  });

  it('blocks onSnapshot(collection(...)) inside apps/pwa/src/views/challenges/**', () => {
    mkdirSync(join(REPO_ROOT, 'apps/pwa/src/views/challenges'), { recursive: true });

    // Write the exact bad pattern from the plan spec:
    // leaderboard scanning the challengeProgress collection directly
    writeFileSync(
      BAD_FILE,
      [
        "import { onSnapshot, collection } from 'firebase/firestore';",
        "import { db } from '../../firebase.js';",
        "const lb = onSnapshot(collection(db, 'challengeProgress'), () => {});",
        'export { lb };',
      ].join('\n'),
    );

    let output = '';
    let exitCode = 0;
    try {
      execSync(`pnpm exec eslint "${BAD_FILE}"`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (e: unknown) {
      const err = e as { status: number; stdout?: string; stderr?: string };
      exitCode = err.status;
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }

    // ESLint must exit non-zero (rule violation)
    expect(exitCode).not.toBe(0);
    // Must surface the Plan 01 onSnapshot-collections restriction message
    expect(output).toContain('onSnapshot on collections is forbidden');
  });
});
