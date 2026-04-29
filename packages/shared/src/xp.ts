/**
 * xp.ts — Shared XP math consumed by PWA and Cloud Functions.
 *
 * Formula: xpForLevel(n) = floor(100 * 1.5^(n-1))
 * This is the logarithmic (geometric) XP curve from RESEARCH §9.
 *
 * Level tiers (7 total):
 *   Noob: 1-10, Iniciado: 11-20, Aventurero: 21-30, Veterano: 31-40,
 *   Élite: 41-50, Leyenda: 51-60, Mítico: 61+
 */

export function xpForLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * totalXpForLevel — cumulative XP needed to REACH level n from 0.
 * A user is at level n when their total XP >= totalXpForLevel(n).
 */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 1; n < level; n++) {
    total += xpForLevel(n);
  }
  return total;
}

/**
 * levelForXp — given a total XP value, compute the current level.
 * Level 1 is the floor (no negative levels).
 */
export function levelForXp(totalXp: number): number {
  let level = 1;
  while (totalXp >= totalXpForLevel(level + 1)) {
    level++;
    // Safety cap at Mítico floor (level 61) — unlimited growth is valid
    // but we cap computation to prevent infinite loops in degenerate input.
    if (level >= 200) break;
  }
  return level;
}

export const TIER_BOUNDARIES: Record<string, [number, number]> = {
  Noob: [1, 10],
  Iniciado: [11, 20],
  Aventurero: [21, 30],
  Veterano: [31, 40],
  Élite: [41, 50],
  Leyenda: [51, 60],
  Mítico: [61, Infinity],
};

export type TierName = 'Noob' | 'Iniciado' | 'Aventurero' | 'Veterano' | 'Élite' | 'Leyenda' | 'Mítico';

export function levelTier(level: number): TierName {
  if (level <= 10) return 'Noob';
  if (level <= 20) return 'Iniciado';
  if (level <= 30) return 'Aventurero';
  if (level <= 40) return 'Veterano';
  if (level <= 50) return 'Élite';
  if (level <= 60) return 'Leyenda';
  return 'Mítico';
}
