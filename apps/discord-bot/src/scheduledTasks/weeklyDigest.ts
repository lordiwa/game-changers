/*
 * Plan 02-03 Task 2 — Weekly digest helper (unit-test-only reference).
 *
 * Architecture decision: The bot process itself does NOT handle scheduled posts.
 * Scheduled digests are handled by functions/gamification/src/botPostWeeklyDigest.ts
 * (Cloud Scheduler → Cloud Function → Discord REST API).
 *
 * This file is kept as a type reference for the leaderboard snapshot shape
 * that botPostWeeklyDigest.ts uses, and as documentation of the original
 * loopback-listener approach that was replaced by the Function-side pattern.
 *
 * Reason for change: The bot VM is not externally reachable (e2-micro in private subnet).
 * The Function-side pattern is simpler, more reliable, and keeps the bot process
 * focused on real-time Gateway events only.
 */

export type WeeklyDigestEntry = {
  rank: number;
  displayName: string;
  xp: number;
  level: number;
};

export type WeeklyDigestSnapshot = {
  period: 'weekly';
  entries: WeeklyDigestEntry[];
  generatedAt: number; // unix seconds
};

/**
 * Formats a leaderboard snapshot into a Discord embed description.
 * Shared utility used by tests to validate the digest format.
 */
export function formatDigestEmbed(snapshot: WeeklyDigestSnapshot): string {
  const medals = ['🥇', '🥈', '🥉'];
  return snapshot.entries
    .slice(0, 10)
    .map((e, i) => {
      const medal = medals[i] ?? `${e.rank}.`;
      return `${medal} **${e.displayName}** — Nivel ${e.level} · ${e.xp.toLocaleString('es-EC')} XP`;
    })
    .join('\n');
}
