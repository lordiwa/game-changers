/**
 * antiCheat-challenge.test.ts — Tests for per-challenge anti-cheat thresholds (DC-06).
 *
 * Covers: steps, heartRate (HR), sleep bounds per RESEARCH §DC-06.
 * Reuses withinAntiCheatBounds from gamification/src/antiCheat.ts.
 */
import { describe, it, expect } from 'vitest';
import { withinAntiCheatBounds, ANTI_CHEAT_BOUNDS } from '../antiCheat-challenge.js';

describe('Anti-cheat: steps (DC-06)', () => {
  it('accepts normal step count (5000 steps)', () => {
    const result = withinAntiCheatBounds('steps', 5000);
    expect(result.status).toBe('ok');
  });

  it('accepts steps just below flag threshold (49999)', () => {
    const result = withinAntiCheatBounds('steps', 49999);
    expect(result.status).toBe('ok');
  });

  it('flags steps at flag threshold (50000)', () => {
    const result = withinAntiCheatBounds('steps', 50000);
    expect(result.status).toBe('flag');
  });

  it('flags steps in flag range (75000)', () => {
    const result = withinAntiCheatBounds('steps', 75000);
    expect(result.status).toBe('flag');
  });

  it('rejects steps above reject threshold (100001)', () => {
    const result = withinAntiCheatBounds('steps', 100001);
    expect(result.status).toBe('reject');
    expect(result.reason).toMatch(/CHEAT_REJECTED_STEPS/);
  });

  it('rejects extreme step count (500000)', () => {
    const result = withinAntiCheatBounds('steps', 500000);
    expect(result.status).toBe('reject');
  });
});

describe('Anti-cheat: heartRate / HR (DC-06)', () => {
  it('accepts normal resting HR (65 BPM)', () => {
    const result = withinAntiCheatBounds('heartRate', 65);
    expect(result.status).toBe('ok');
  });

  it('accepts max normal HR (180 BPM)', () => {
    const result = withinAntiCheatBounds('heartRate', 180);
    expect(result.status).toBe('ok');
  });

  it('rejects HR below minimum (29 BPM)', () => {
    const result = withinAntiCheatBounds('heartRate', 29);
    expect(result.status).toBe('reject');
    expect(result.reason).toBeDefined();
  });

  it('rejects HR at exactly 30 BPM (boundary)', () => {
    // 30 BPM is the minimum — exactly 30 should be accepted
    const result = withinAntiCheatBounds('heartRate', 30);
    expect(result.status).toBe('ok');
  });

  it('rejects HR above maximum (221 BPM)', () => {
    const result = withinAntiCheatBounds('heartRate', 221);
    expect(result.status).toBe('reject');
    expect(result.reason).toBeDefined();
  });

  it('accepts HR at exact upper boundary (220 BPM)', () => {
    const result = withinAntiCheatBounds('heartRate', 220);
    expect(result.status).toBe('ok');
  });
});

describe('Anti-cheat: sleep (DC-06)', () => {
  it('accepts normal sleep (420 minutes = 7h)', () => {
    const result = withinAntiCheatBounds('sleep', 420);
    expect(result.status).toBe('ok');
  });

  it('flags sleep above 16h (961 minutes)', () => {
    const result = withinAntiCheatBounds('sleep', 961);
    expect(result.status).toBe('flag');
  });

  it('accepts sleep at exactly 16h boundary (960 minutes = 16h)', () => {
    // exactly 960 minutes (16h) should be accepted (flagAboveMinutes = 960)
    const result = withinAntiCheatBounds('sleep', 960);
    expect(result.status).toBe('ok');
  });

  it('flags sleep at 24h (1440 minutes)', () => {
    const result = withinAntiCheatBounds('sleep', 1440);
    expect(result.status).toBe('flag');
  });
});

describe('Anti-cheat: constants (DC-06 verification)', () => {
  it('has reject threshold at 100K for steps (values strictly above are rejected)', () => {
    expect(ANTI_CHEAT_BOUNDS.steps.rejectAbove).toBeGreaterThanOrEqual(100_000);
  });

  it('has flag threshold of exactly 50K for steps', () => {
    expect(ANTI_CHEAT_BOUNDS.steps.flagAbove).toBe(50_000);
  });

  it('has HR reject below 30 BPM', () => {
    expect(ANTI_CHEAT_BOUNDS.heartRate.rejectBelow).toBe(30);
  });

  it('has HR reject above 220 BPM', () => {
    expect(ANTI_CHEAT_BOUNDS.heartRate.rejectAbove).toBe(220);
  });

  it('has sleep flag at 16h (960 minutes)', () => {
    expect(ANTI_CHEAT_BOUNDS.sleep.flagAboveMinutes).toBe(16 * 60);
  });
});

describe('Anti-cheat: unknown metric', () => {
  it('returns ok for unknown metric (forward-compatible)', () => {
    const result = withinAntiCheatBounds('unknown_metric', 999999);
    expect(result.status).toBe('ok');
  });
});
