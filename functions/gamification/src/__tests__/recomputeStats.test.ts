/**
 * recomputeStats.test.ts — Unit tests for stat computation logic.
 *
 * Critical test (Pitfall #9 + PROF-12):
 *   A user with 0 events, 0 wearable data, 0 streaks MUST get stats
 *   { hp: 1, stamina: 1, mente: 1, social: 1 } — NEVER 0.
 *
 * Uses the exported pure function `computeStats` directly (no Firebase mocks needed).
 */
import { describe, it, expect } from 'vitest';
import { computeStats } from '../recomputeStats.js';

describe('computeStats — Pitfall #9 enforcement (stats NEVER 0)', () => {
  it('user with zero events, zero streaks, zero content → all stats = 1 (NEVER 0)', () => {
    const stats = computeStats({
      eventAttendedCount: 0,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    // Pitfall #9: EVERY stat must be at least 1 to show color on CharacterSheet
    expect(stats.hp).toBeGreaterThanOrEqual(1);
    expect(stats.stamina).toBeGreaterThanOrEqual(1);
    expect(stats.mente).toBeGreaterThanOrEqual(1);
    expect(stats.social).toBeGreaterThanOrEqual(1);

    // Specific expected values for empty-data user
    expect(stats.hp).toBe(1);
    expect(stats.stamina).toBe(1);
    expect(stats.mente).toBe(1);
    expect(stats.social).toBe(1);
  });

  it('user with 1 event → hp=5, social=4, others=1', () => {
    const stats = computeStats({
      eventAttendedCount: 1,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    expect(stats.hp).toBe(5);
    expect(stats.stamina).toBe(1); // 0 streak days → clamp to 1
    expect(stats.mente).toBe(1);   // 0 content → clamp to 1
    expect(stats.social).toBe(4);
  });

  it('user with 10 events → hp=50, social capped by formula', () => {
    const stats = computeStats({
      eventAttendedCount: 10,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    expect(stats.hp).toBe(50);
    expect(stats.social).toBe(40); // 10 * 4 = 40
  });

  it('user with 20 events → hp capped at 100', () => {
    const stats = computeStats({
      eventAttendedCount: 20,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    expect(stats.hp).toBe(100); // 20 * 5 = 100 (at cap)
  });

  it('user with 100 events → hp capped at 100 (not 500)', () => {
    const stats = computeStats({
      eventAttendedCount: 100,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    expect(stats.hp).toBe(100);
    expect(stats.social).toBe(100); // 100 * 4 = 400, capped at 100
  });

  it('user with 7-day streak → stamina = clamp(21, 1, 100) = 21', () => {
    const stats = computeStats({
      eventAttendedCount: 0,
      maxStreakDays: 7,
      socialStreakDays: 0,
      contentCompletedCount: 0,
    });

    expect(stats.stamina).toBe(21); // 7 * 3 = 21
    expect(stats.hp).toBe(1);       // 0 events → clamp to 1
  });

  it('user with 5 content completions → mente = 50', () => {
    const stats = computeStats({
      eventAttendedCount: 0,
      maxStreakDays: 0,
      socialStreakDays: 0,
      contentCompletedCount: 5,
    });

    expect(stats.mente).toBe(50); // 5 * 10 = 50
    expect(stats.hp).toBe(1);    // still 1 minimum
  });

  it('all stats are bounded [1, 100] for any input', () => {
    const inputs = [
      { eventAttendedCount: 0, maxStreakDays: 0, socialStreakDays: 0, contentCompletedCount: 0 },
      { eventAttendedCount: 1000, maxStreakDays: 1000, socialStreakDays: 1000, contentCompletedCount: 1000 },
      { eventAttendedCount: 5, maxStreakDays: 10, socialStreakDays: 3, contentCompletedCount: 2 },
    ];

    for (const input of inputs) {
      const stats = computeStats(input);
      expect(stats.hp).toBeGreaterThanOrEqual(1);
      expect(stats.hp).toBeLessThanOrEqual(100);
      expect(stats.stamina).toBeGreaterThanOrEqual(1);
      expect(stats.stamina).toBeLessThanOrEqual(100);
      expect(stats.mente).toBeGreaterThanOrEqual(1);
      expect(stats.mente).toBeLessThanOrEqual(100);
      expect(stats.social).toBeGreaterThanOrEqual(1);
      expect(stats.social).toBeLessThanOrEqual(100);
    }
  });
});
