/**
 * no-medical-alerts.test.ts — WEAR-12 anti-feature enforcement.
 *
 * Scans the source files in functions/wearables/src/ for forbidden patterns
 * that would indicate automated medical alert generation.
 *
 * Forbidden patterns (outside test files):
 *   - medical_alert
 *   - health_alarm
 *   - cardiac
 *   - arrhythmia
 *   - clinical
 *   - medicalAlerts (collection name)
 *   - sendNotification with any health-derived condition keyword
 *
 * The test uses Node.js fs to grep source files — runs entirely in Node
 * environment without emulator.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, '..'); // functions/wearables/src/

const FORBIDDEN_PATTERNS = [
  /medical_alert/i,
  /health_alarm/i,
  /\bcardiac\b/i,
  /\barrhythmia\b/i,
  /\bclinical\b/i,
  /medicalAlerts/,
  /dangerously.*low|dangerously.*high/i,
];

function getSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__' && entry.name !== 'node_modules') {
      files.push(...getSourceFiles(full));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      if (!entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.js')) {
        files.push(full);
      }
    }
  }
  return files;
}

describe('WEAR-12: No automated medical alerts', () => {
  it('source files contain NO forbidden medical-alert patterns', () => {
    const sourceFiles = getSourceFiles(SRC_DIR);

    expect(sourceFiles.length).toBeGreaterThan(0);

    const violations: { file: string; pattern: string; line: string; lineNum: number }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comment-only lines (// lines are ok — they're just docs)
        const isCommentOnly = line.trimStart().startsWith('//') || line.trimStart().startsWith('*');
        if (isCommentOnly) continue;

        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: path.relative(SRC_DIR, filePath),
              pattern: pattern.toString(),
              line: line.trim(),
              lineNum: i + 1,
            });
          }
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map(v => `\n  ${v.file}:${v.lineNum} [${v.pattern}]\n    ${v.line}`)
        .join('');
      throw new Error(`WEAR-12 VIOLATION: Found ${violations.length} forbidden pattern(s):${msg}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('aggregateDailyHealth does NOT write to medicalAlerts collection', () => {
    const aggregateFile = path.join(SRC_DIR, 'aggregateDailyHealth.ts');
    expect(fs.existsSync(aggregateFile)).toBe(true);

    const content = fs.readFileSync(aggregateFile, 'utf8');

    // Must not reference any notification-sending mechanism
    expect(content).not.toMatch(/sendNotification|sendMessage|triggerAlert/i);
    // Must write to healthDaily (positive assertion)
    expect(content).toMatch(/healthDaily/);
  });

  it('openWearablesWebhook does NOT trigger any notification on outlier values', () => {
    const webhookFile = path.join(SRC_DIR, 'openWearablesWebhook.ts');
    expect(fs.existsSync(webhookFile)).toBe(true);

    const content = fs.readFileSync(webhookFile, 'utf8');

    // No notification triggers
    expect(content).not.toMatch(/sendNotification|sendPush|fcmSend|Messaging|sendToDevice/i);
    // No medical alert writes
    expect(content).not.toMatch(/medicalAlerts/);
  });

  it('source files scanned includes openWearablesWebhook and aggregateDailyHealth', () => {
    const files = getSourceFiles(SRC_DIR);
    const names = files.map(f => path.basename(f));
    expect(names).toContain('openWearablesWebhook.ts');
    expect(names).toContain('aggregateDailyHealth.ts');
  });
});
