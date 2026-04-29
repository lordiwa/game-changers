/**
 * xp.test.ts — Unit tests for shared XP math.
 *
 * Covers: xpForLevel, totalXpForLevel, levelForXp, levelTier, TIER_BOUNDARIES.
 * Critical: level 1-100 monotonic growth (logarithmic curve correctness).
 */
import { describe, it, expect } from 'vitest';
import {
  xpForLevel,
  totalXpForLevel,
  levelForXp,
  levelTier,
  TIER_BOUNDARIES,
} from '../xp.js';

describe('xpForLevel', () => {
  it('level 1 returns 100', () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it('level 2 returns 150 (floor(100 * 1.5^1))', () => {
    expect(xpForLevel(2)).toBe(150);
  });

  it('level 10 returns 3844 (floor(100 * 1.5^9))', () => {
    // 100 * 1.5^9 = 100 * 38.443... = 3844.xx
    expect(xpForLevel(10)).toBe(3844);
  });

  it('level 5 is floor(100 * 1.5^4) = 506', () => {
    // 1.5^4 = 5.0625, floor(100 * 5.0625) = 506
    expect(xpForLevel(5)).toBe(506);
  });

  it('is monotonically increasing for levels 1..100', () => {
    for (let n = 1; n < 100; n++) {
      expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    }
  });

  it('level 0 returns 0', () => {
    expect(xpForLevel(0)).toBe(0);
  });
});

describe('totalXpForLevel', () => {
  it('level 1 returns 0 (no XP needed to START at level 1)', () => {
    expect(totalXpForLevel(1)).toBe(0);
  });

  it('level 2 returns 100 (need xpForLevel(1) to advance to level 2)', () => {
    expect(totalXpForLevel(2)).toBe(100);
  });

  it('level 3 returns 250 (100 + 150)', () => {
    expect(totalXpForLevel(3)).toBe(250);
  });

  it('is monotonically increasing for levels 1..100', () => {
    for (let n = 1; n < 100; n++) {
      expect(totalXpForLevel(n + 1)).toBeGreaterThan(totalXpForLevel(n));
    }
  });
});

describe('levelForXp', () => {
  it('0 XP → level 1', () => {
    expect(levelForXp(0)).toBe(1);
  });

  it('99 XP → level 1 (not enough for level 2)', () => {
    expect(levelForXp(99)).toBe(1);
  });

  it('100 XP → level 2', () => {
    expect(levelForXp(100)).toBe(2);
  });

  it('249 XP → level 2', () => {
    expect(levelForXp(249)).toBe(2);
  });

  it('250 XP → level 3', () => {
    expect(levelForXp(250)).toBe(3);
  });

  it('is consistent with totalXpForLevel: levelForXp(totalXpForLevel(n)) === n', () => {
    for (let n = 1; n <= 20; n++) {
      expect(levelForXp(totalXpForLevel(n))).toBe(n);
    }
  });
});

describe('levelTier', () => {
  it('level 1 → Noob', () => expect(levelTier(1)).toBe('Noob'));
  it('level 10 → Noob', () => expect(levelTier(10)).toBe('Noob'));
  it('level 11 → Iniciado', () => expect(levelTier(11)).toBe('Iniciado'));
  it('level 20 → Iniciado', () => expect(levelTier(20)).toBe('Iniciado'));
  it('level 21 → Aventurero', () => expect(levelTier(21)).toBe('Aventurero'));
  it('level 30 → Aventurero', () => expect(levelTier(30)).toBe('Aventurero'));
  it('level 31 → Veterano', () => expect(levelTier(31)).toBe('Veterano'));
  it('level 40 → Veterano', () => expect(levelTier(40)).toBe('Veterano'));
  it('level 41 → Élite', () => expect(levelTier(41)).toBe('Élite'));
  it('level 50 → Élite', () => expect(levelTier(50)).toBe('Élite'));
  it('level 51 → Leyenda', () => expect(levelTier(51)).toBe('Leyenda'));
  it('level 60 → Leyenda', () => expect(levelTier(60)).toBe('Leyenda'));
  it('level 61 → Mítico', () => expect(levelTier(61)).toBe('Mítico'));
  it('level 100 → Mítico', () => expect(levelTier(100)).toBe('Mítico'));
});

describe('TIER_BOUNDARIES', () => {
  it('contains all 7 tiers', () => {
    const tiers = Object.keys(TIER_BOUNDARIES);
    expect(tiers).toContain('Noob');
    expect(tiers).toContain('Iniciado');
    expect(tiers).toContain('Aventurero');
    expect(tiers).toContain('Veterano');
    expect(tiers).toContain('Élite');
    expect(tiers).toContain('Leyenda');
    expect(tiers).toContain('Mítico');
  });

  it('Mítico upper bound is Infinity', () => {
    expect(TIER_BOUNDARIES['Mítico'][1]).toBe(Infinity);
  });
});
