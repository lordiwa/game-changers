/*
 * Plan 02-03 — /leaderboard slash command
 *
 * Reads the /leaderboards/{period} aggregate document directly via the viewer-only
 * Firebase service account (no HMAC call needed — the bot SA has read access to this
 * aggregate doc per Plan 06's IAM setup).
 *
 * Period defaults to 'weekly'. Also supports 'monthly' and 'season'.
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { getReadOnlyDb } from '../lib/firebaseAdmin.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Muestra el leaderboard de GameChangers')
  .addStringOption((option) =>
    option
      .setName('periodo')
      .setDescription('Período del leaderboard')
      .setRequired(false)
      .addChoices(
        { name: 'Semanal', value: 'weekly' },
        { name: 'Mensual', value: 'monthly' },
        { name: 'Temporada', value: 'season' },
      ),
  );

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

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Semanal',
  monthly: 'Mensual',
  season: 'Temporada',
};

const MEDALS = ['🥇', '🥈', '🥉'];

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const period = (interaction.options.getString('periodo') ?? 'weekly') as string;
  const periodLabel = PERIOD_LABELS[period] ?? period;

  try {
    const db = getReadOnlyDb();
    const doc = await db.doc(`leaderboards/${period}`).get();

    if (!doc.exists) {
      await interaction.editReply({
        content: `El leaderboard ${periodLabel} todavía no tiene datos. Volvé a intentarlo más tarde!`,
      });
      return;
    }

    const data = doc.data() as LeaderboardDoc;
    const entries = (data.entries ?? []).slice(0, 10);

    if (entries.length === 0) {
      await interaction.editReply({
        content: `El leaderboard ${periodLabel} está vacío por ahora. Participá en eventos para sumar XP!`,
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Leaderboard ${periodLabel} — GameChangers`)
      .setColor(0xfee75c) // yellow/gold
      .setFooter({ text: 'Participá en eventos, completá challenges y subí de nivel!' });

    const lines = entries.map((e, i) => {
      const medal = MEDALS[i] ?? `${e.rank}.`;
      return `${medal} **${e.displayName}** — Nivel ${e.level} · ${e.xp.toLocaleString('es-EC')} XP`;
    });

    embed.setDescription(lines.join('\n'));

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[leaderboard] Firestore read failed:', err);
    await interaction.editReply({
      content: 'No se pudo cargar el leaderboard. Intentá de nuevo más tarde.',
    });
  }
}
