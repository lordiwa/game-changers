/*
 * Plan 02-03 Task 2 — Weekly leaderboard digest via Cloud Scheduler.
 *
 * Architecture decision (documented in 02-03-SUMMARY.md):
 *   The bot process itself is kept simple — it only handles real-time Gateway events.
 *   Scheduled posts are done Function-side using the Discord REST API directly with
 *   the bot token read from GCP Secret Manager. This avoids the bot needing an
 *   inbound HTTP listener on the VM.
 *
 * Schedule: every Monday at 09:00 America/Guayaquil (UTC-5, so 14:00 UTC).
 * Region: southamerica-east1 (São Paulo — closest to Ecuador).
 *
 * Threats mitigated:
 *   T-02-03-08: Bot token stored in Secret Manager; never in repo or logs.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const BOT_TOKEN = defineSecret('DISCORD_BOT_TOKEN');
const WEEKLY_DIGEST_CHANNEL_ID = defineSecret('WEEKLY_DIGEST_CHANNEL_ID');

type LeaderboardEntry = {
  rank: number;
  displayName: string;
  xp: number;
  level: number;
};

type LeaderboardDoc = {
  period: string;
  updatedAt: unknown;
  entries: LeaderboardEntry[];
};

const MEDALS = ['🥇', '🥈', '🥉'];

export const botPostWeeklyDigest = onSchedule(
  {
    schedule: '0 9 * * MON',
    timeZone: 'America/Guayaquil',
    region: 'southamerica-east1',
    secrets: [BOT_TOKEN, WEEKLY_DIGEST_CHANNEL_ID],
  },
  async () => {
    const db = getFirestore();

    // 1. Read /leaderboards/weekly aggregate doc.
    const snap = await db.doc('leaderboards/weekly').get();
    if (!snap.exists) {
      console.warn('[botPostWeeklyDigest] leaderboards/weekly doc does not exist yet — skipping.');
      return;
    }

    const data = snap.data() as LeaderboardDoc;
    const entries = (data.entries ?? []).slice(0, 10);

    if (entries.length === 0) {
      console.warn('[botPostWeeklyDigest] leaderboard is empty — skipping digest.');
      return;
    }

    // 2. Build Discord embed.
    const lines = entries.map((e, i) => {
      const medal = MEDALS[i] ?? `${e.rank}.`;
      return `${medal} **${e.displayName}** — Nivel ${e.level} · ${e.xp.toLocaleString('es-EC')} XP`;
    });

    const embed = {
      title: 'Leaderboard Semanal — GameChangers',
      description: lines.join('\n'),
      color: 0xfee75c,
      footer: { text: 'Participá en eventos, completá challenges y subí de nivel esta semana!' },
      timestamp: new Date().toISOString(),
    };

    const channelId = WEEKLY_DIGEST_CHANNEL_ID.value();
    const botToken = BOT_TOKEN.value();

    if (!channelId || !botToken) {
      console.error('[botPostWeeklyDigest] Missing WEEKLY_DIGEST_CHANNEL_ID or DISCORD_BOT_TOKEN secret.');
      return;
    }

    // 3. POST to Discord REST API.
    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
      },
    );

    if (!discordRes.ok) {
      const errorText = await discordRes.text();
      console.error(`[botPostWeeklyDigest] Discord API error ${discordRes.status}: ${errorText}`);
      return;
    }

    // 4. Write audit entry.
    await db.collection('auditLog').doc().set({
      action: 'weekly_digest_posted',
      timestamp: FieldValue.serverTimestamp(),
      leaderboardSnapshot: {
        period: 'weekly',
        entryCount: entries.length,
        topEntry: entries[0] ?? null,
      },
    });

    console.log(`[botPostWeeklyDigest] Digest posted to channel ${channelId} with ${entries.length} entries.`);
  },
);
