/**
 * antiCheat-challenge.ts — Anti-cheat bounds for challenge-specific metrics.
 *
 * Re-exports the same bounds as gamification/src/antiCheat.ts but lives in
 * the challenges codebase to avoid a cross-codebase import at runtime.
 *
 * DC-06 thresholds:
 *   steps:     >100K  → CHEAT_REJECTED_STEPS (reject); 50K-100K → flag
 *   heartRate: <30    → reject; >220 → reject
 *   sleep:     >16h   → flag (960 min)
 */

export const ANTI_CHEAT_BOUNDS = {
  steps: {
    rejectAbove: 100_000,  // > 100K steps/day: physiologically impossible — REJECT (strict >)
    flagAbove: 50_000,     // >= 50K steps/day: suspicious — FLAG for mod review
  },
  heartRate: {
    rejectBelow: 30,  // < 30 BPM: sensor error or spoofing — REJECT
    rejectAbove: 220, // > 220 BPM: physiologically impossible — REJECT
  },
  sleep: {
    flagAboveMinutes: 960, // > 16h (960 min) sleep/night: suspicious — FLAG
  },
} as const;

export type AntiCheatStatus = 'ok' | 'flag' | 'reject';

export interface AntiCheatResult {
  status: AntiCheatStatus;
  reason?: string;
}

/**
 * withinAntiCheatBounds — checks if a challenge metric value is within acceptable bounds.
 *
 * @param metric - 'steps' | 'heartRate' | 'sleep' | 'sleep_hours' | 'minutes_meditated' | 'events_attended'
 * @param value  - raw numeric value
 */
export function withinAntiCheatBounds(metric: string, value: number): AntiCheatResult {
  switch (metric) {
    case 'steps': {
      if (value > ANTI_CHEAT_BOUNDS.steps.rejectAbove) {
        return {
          status: 'reject',
          reason: `CHEAT_REJECTED_STEPS: steps=${value} exceeds reject threshold of ${ANTI_CHEAT_BOUNDS.steps.rejectAbove}`,
        };
      }
      if (value >= ANTI_CHEAT_BOUNDS.steps.flagAbove) {
        return {
          status: 'flag',
          reason: `steps=${value} in suspicious range [${ANTI_CHEAT_BOUNDS.steps.flagAbove}, ${ANTI_CHEAT_BOUNDS.steps.rejectAbove}]`,
        };
      }
      return { status: 'ok' };
    }

    case 'heartRate': {
      if (value < ANTI_CHEAT_BOUNDS.heartRate.rejectBelow) {
        return {
          status: 'reject',
          reason: `heartRate=${value} below minimum of ${ANTI_CHEAT_BOUNDS.heartRate.rejectBelow} BPM`,
        };
      }
      if (value > ANTI_CHEAT_BOUNDS.heartRate.rejectAbove) {
        return {
          status: 'reject',
          reason: `heartRate=${value} exceeds maximum of ${ANTI_CHEAT_BOUNDS.heartRate.rejectAbove} BPM`,
        };
      }
      return { status: 'ok' };
    }

    case 'sleep':
    case 'sleep_hours': {
      // Accept hours or minutes based on scale
      const minutes = metric === 'sleep_hours' ? value * 60 : value;
      if (minutes > ANTI_CHEAT_BOUNDS.sleep.flagAboveMinutes) {
        return {
          status: 'flag',
          reason: `sleep=${minutes} minutes exceeds flag threshold of ${ANTI_CHEAT_BOUNDS.sleep.flagAboveMinutes} minutes (16h)`,
        };
      }
      return { status: 'ok' };
    }

    default:
      // Unknown or other metrics (minutes_meditated, events_attended, etc.) — accept as-is
      return { status: 'ok' };
  }
}
