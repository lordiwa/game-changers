import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const TMP_FILE = join(REPO_ROOT, 'apps/pwa/src/components/__tmp_lint_check.ts');

describe('eslint no-restricted-imports rule', () => {
  afterEach(() => {
    if (existsSync(TMP_FILE)) unlinkSync(TMP_FILE);
  });

  it('blocks onSnapshot from firebase/firestore inside apps/pwa/src/components/**', () => {
    mkdirSync(join(REPO_ROOT, 'apps/pwa/src/components'), { recursive: true });
    writeFileSync(
      TMP_FILE,
      `import { onSnapshot } from 'firebase/firestore';\nexport const x = onSnapshot;\n`,
    );

    let output = '';
    let exitCode = 0;
    try {
      execSync(`pnpm exec eslint "${TMP_FILE}"`, {
        cwd: REPO_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (e: unknown) {
      const err = e as { status: number; stdout?: string; stderr?: string };
      exitCode = err.status;
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }

    expect(exitCode).not.toBe(0);
    expect(output).toContain('onSnapshot on collections is forbidden');
  });
});
