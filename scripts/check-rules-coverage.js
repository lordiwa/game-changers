#!/usr/bin/env node
/*
 * Rules-coverage gate (CI). Reads tests/rules/coverage/coverage-summary.json or
 * the Firestore emulator coverage endpoint and exits 1 if line coverage on
 * `firestore.rules` is below the 90% threshold required by 02-01-PLAN.md.
 *
 * Two coverage sources supported:
 *  1. Firestore emulator HTTP endpoint (canonical for rules coverage):
 *     http://127.0.0.1:8080/emulator/v1/projects/{project}:ruleCoverage.html
 *  2. c8 v8-coverage JSON (fallback if emulator is not running).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const THRESHOLD = 0.9;

function fail(msg) {
  console.error(`[check-rules-coverage] FAIL: ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`[check-rules-coverage] OK: ${msg}`);
  process.exit(0);
}

async function fromEmulator() {
  const url =
    'http://127.0.0.1:8080/emulator/v1/projects/gamechangers-rules-test:ruleCoverage.json';
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    // Parse the rules coverage report. The emulator returns expressions exercised.
    const total = j?.totalExpressions ?? j?.expressions?.length ?? 0;
    const covered = j?.coveredExpressions ?? 0;
    if (total === 0) return null;
    return covered / total;
  } catch {
    return null;
  }
}

function fromC8() {
  const summary = resolve(REPO_ROOT, 'tests/rules/coverage/coverage-summary.json');
  if (!existsSync(summary)) return null;
  const j = JSON.parse(readFileSync(summary, 'utf8'));
  const total = j?.total?.lines;
  if (!total || total.total === 0) return null;
  return total.covered / total.total;
}

const ratio = (await fromEmulator()) ?? fromC8();
if (ratio == null) {
  fail(
    'no coverage data found. Run `pnpm --filter @gamechangers/tests-rules test --coverage` first.',
  );
}
if (ratio < THRESHOLD) {
  fail(`rules line coverage ${(ratio * 100).toFixed(1)}% < ${THRESHOLD * 100}%`);
}
ok(`rules line coverage ${(ratio * 100).toFixed(1)}% >= ${THRESHOLD * 100}%`);
