/**
 * useXp.test.ts — Unit tests for the useXp composable.
 *
 * Tests:
 * 1. Given profile { level: 5, xp: 1000 }, xpToNextLevel = totalXpForLevel(6) - 1000.
 * 2. xpForNextLevel equals xpForLevel(level + 1).
 * 3. progressPercent is clamped 0-100.
 * 4. tier returns the correct TierName for a given level.
 * 5. Null profile returns defaults (level=1, xp=0).
 */
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useXp } from '../composables/useXp';
import { totalXpForLevel, xpForLevel, levelTier } from '@gamechangers/shared';
import type { ProfileMain } from '@gamechangers/shared';

function makeProfile(overrides: Partial<ProfileMain> = {}): ProfileMain {
  return {
    uid: 'test-uid',
    displayName: 'Tester',
    level: 1,
    xp: 0,
    stats: { hp: 1, stamina: 1, mente: 1, social: 1 },
    publicVisibility: false,
    ...overrides,
  } as unknown as ProfileMain;
}

describe('useXp', () => {
  it('xpToNextLevel equals totalXpForLevel(level+1) - xp for level 5 / xp 1000', () => {
    const profile = ref<ProfileMain | null>(makeProfile({ level: 5, xp: 1000 }));
    const { xpToNextLevel } = useXp(profile);

    const expected = totalXpForLevel(6) - 1000;
    expect(xpToNextLevel.value).toBe(expected);
  });

  it('xpForNextLevel equals xpForLevel(level + 1)', () => {
    const profile = ref<ProfileMain | null>(makeProfile({ level: 3, xp: 500 }));
    const { level, xpForNextLevel } = useXp(profile);

    expect(xpForNextLevel.value).toBe(xpForLevel(level.value + 1));
  });

  it('progressPercent is clamped to [0, 100]', () => {
    // Huge XP to overshoot level cap
    const profile = ref<ProfileMain | null>(makeProfile({ level: 5, xp: 999999 }));
    const { progressPercent } = useXp(profile);

    expect(progressPercent.value).toBeGreaterThanOrEqual(0);
    expect(progressPercent.value).toBeLessThanOrEqual(100);
  });

  it('tier reflects the correct tier name for a given level', () => {
    const profile = ref<ProfileMain | null>(makeProfile({ level: 15, xp: 5000 }));
    const { tier } = useXp(profile);

    expect(tier.value).toBe(levelTier(15));
  });

  it('null profile returns safe defaults: level=1, xp=0, tier=Noob', () => {
    const profile = ref<ProfileMain | null>(null);
    const { level, xp, tier, xpToNextLevel } = useXp(profile);

    expect(level.value).toBe(1);
    expect(xp.value).toBe(0);
    expect(tier.value).toBe(levelTier(1));
    // xpToNextLevel should be positive (path to level 2)
    expect(xpToNextLevel.value).toBeGreaterThan(0);
  });

  it('xpInCurrentLevel is 0 when xp matches exactly totalXpForLevel(current)', () => {
    const lvl = 4;
    const exactXp = totalXpForLevel(lvl);
    const profile = ref<ProfileMain | null>(makeProfile({ level: lvl, xp: exactXp }));
    const { xpInCurrentLevel } = useXp(profile);

    expect(xpInCurrentLevel.value).toBe(0);
  });
});
