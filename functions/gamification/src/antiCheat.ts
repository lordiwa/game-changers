/**
 * antiCheat.ts — Anti-cheat bounds checker for gamification data.
 *
 * Implements DC-06 starter set. Called by xpAward before awarding XP.
 * NOT a Cloud Function — imported as a helper module.
 *
 * Threat mitigated: T-02-05-04 (wearable spoofing via inflated metrics).
 * Flagged records go to /users/{uid}/private/flaggedRecords/{id}
 * (Firestore Rules deny user read on /users/{uid}/private/**).
 */

export const ANTI_CHEAT_BOUNDS = {
  steps: {
    rejectAbove: 100_000,  // > 100K steps/day: physiologically impossible — REJECT
    flagAbove: 50_000,     // 50K-100K steps/day: suspicious — FLAG for review
  },
  heartRate: {
    rejectBelow: 30,  // < 30 BPM: sensor error or spoofing — REJECT
    rejectAbove: 220, // > 220 BPM: physiologically impossible — REJECT
  },
  sleep: {
    flagAboveMinutes: 16 * 60, // > 16h sleep/night: suspicious — FLAG
  },
  calories: {
    rejectAbove: 15_000, // > 15K kcal burned/day: impossible — REJECT
  },
} as const;

export type AntiCheatStatus = 'ok' | 'flag' | 'reject';

export interface AntiCheatResult {
  status: AntiCheatStatus;
  reason?: string;
}

/**
 * withinAntiCheatBounds — checks if a metric value is within acceptable bounds.
 *
 * @param metric - one of 'steps' | 'heartRate' | 'sleep' | 'calories'
 * @param value  - the raw numeric value (steps/day, BPM, minutes/night, kcal)
 */
export function withinAntiCheatBounds(metric: string, value: number): AntiCheatResult {
  switch (metric) {
    case 'steps': {
      if (value > ANTI_CHEAT_BOUNDS.steps.rejectAbove) {
        return { status: 'reject', reason: `steps=${value} exceeds reject threshold of ${ANTI_CHEAT_BOUNDS.steps.rejectAbove}` };
      }
      if (value > ANTI_CHEAT_BOUNDS.steps.flagAbove) {
        return { status: 'flag', reason: `steps=${value} exceeds flag threshold of ${ANTI_CHEAT_BOUNDS.steps.flagAbove}` };
      }
      return { status: 'ok' };
    }

    case 'heartRate': {
      if (value < ANTI_CHEAT_BOUNDS.heartRate.rejectBelow) {
        return { status: 'reject', reason: `heartRate=${value} below minimum of ${ANTI_CHEAT_BOUNDS.heartRate.rejectBelow} BPM` };
      }
      if (value > ANTI_CHEAT_BOUNDS.heartRate.rejectAbove) {
        return { status: 'reject', reason: `heartRate=${value} exceeds maximum of ${ANTI_CHEAT_BOUNDS.heartRate.rejectAbove} BPM` };
      }
      return { status: 'ok' };
    }

    case 'sleep': {
      if (value > ANTI_CHEAT_BOUNDS.sleep.flagAboveMinutes) {
        return { status: 'flag', reason: `sleep=${value} minutes exceeds flag threshold of ${ANTI_CHEAT_BOUNDS.sleep.flagAboveMinutes} minutes` };
      }
      return { status: 'ok' };
    }

    case 'calories': {
      if (value > ANTI_CHEAT_BOUNDS.calories.rejectAbove) {
        return { status: 'reject', reason: `calories=${value} exceeds reject threshold of ${ANTI_CHEAT_BOUNDS.calories.rejectAbove}` };
      }
      return { status: 'ok' };
    }

    default:
      // Unknown metric — treat as ok (forward-compatible with new metrics)
      return { status: 'ok' };
  }
}
