/**
 * useXp.ts — Composable for XP + level computed values from profile/main.
 *
 * Consumes xpForLevel + levelTier from packages/shared (same math as Functions).
 * No onSnapshot — uses profile store reactive ref (one read via useDocument).
 */
import { computed, type ComputedRef, type Ref } from 'vue';
import { xpForLevel, totalXpForLevel, levelTier, type TierName } from '@gamechangers/shared';
import type { ProfileMain } from '@gamechangers/shared';

export interface UseXpReturn {
  level: ComputedRef<number>;
  xp: ComputedRef<number>;
  xpToNextLevel: ComputedRef<number>;
  xpInCurrentLevel: ComputedRef<number>;
  progressPercent: ComputedRef<number>;
  tier: ComputedRef<TierName>;
  xpForNextLevel: ComputedRef<number>;
}

export function useXp(profile: Ref<ProfileMain | null | undefined>): UseXpReturn {
  const level = computed<number>(() => profile.value?.level ?? 1);
  const xp = computed<number>(() => profile.value?.xp ?? 0);

  // XP needed to go from current level to the next level
  const xpForNextLevel = computed<number>(() => xpForLevel(level.value + 1));

  // XP already accumulated within the current level
  const xpInCurrentLevel = computed<number>(() => {
    const totalToCurrentLevel = totalXpForLevel(level.value);
    return Math.max(0, xp.value - totalToCurrentLevel);
  });

  // XP still needed to advance to next level
  const xpToNextLevel = computed<number>(() => {
    const totalToNextLevel = totalXpForLevel(level.value + 1);
    return Math.max(0, totalToNextLevel - xp.value);
  });

  // Percentage progress within current level (0-100)
  const progressPercent = computed<number>(() => {
    const needed = xpForNextLevel.value;
    if (needed <= 0) return 100;
    return Math.min(100, Math.floor((xpInCurrentLevel.value / needed) * 100));
  });

  const tier = computed<TierName>(() => levelTier(level.value));

  return {
    level,
    xp,
    xpToNextLevel,
    xpInCurrentLevel,
    progressPercent,
    tier,
    xpForNextLevel,
  };
}
