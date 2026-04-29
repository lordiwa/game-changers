/*
 * Plan 02-03 — /reto slash command (ephemeral)
 *
 * Lists the user's active challenge enrollments via challenges-botListEnrollments.
 * Ephemeral — progress data is personal.
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { callFunction } from '../lib/functionClient.js';

export const data = new SlashCommandBuilder()
  .setName('reto')
  .setDescription('Muestra tus challenges activos en GameChangers (solo vos lo ves)');

type Enrollment = {
  challengeId: string;
  name: string;
  tier: 'bronce' | 'plata' | 'oro';
  progress: number;
  target: number;
};

type EnrollmentsData = {
  enrollments: Enrollment[];
};

const TIER_COLORS: Record<string, string> = {
  bronce: '🥉',
  plata: '🥈',
  oro: '🥇',
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Ephemeral — challenge progress is personal.
  await interaction.deferReply({ flags: 64 });

  const result = await callFunction<EnrollmentsData>(
    process.env['CHALLENGES_BOT_LIST_ENROLLMENTS_URL']!,
    { discordId: interaction.user.id },
  );

  if (!result.ok) {
    await interaction.editReply({
      content: 'No se pudieron cargar tus challenges. Intentá de nuevo en unos minutos.',
    });
    return;
  }

  const { enrollments } = result.data;

  if (enrollments.length === 0) {
    await interaction.editReply({
      content: 'No estás inscripto en ningún challenge activo. Entrá a la app y elegí uno!',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('Tus Challenges Activos')
    .setColor(0xeb459e)
    .setFooter({ text: 'Abrí la app para registrar tu progreso y completar tus challenges!' });

  for (const e of enrollments) {
    const tierEmoji = TIER_COLORS[e.tier] ?? '';
    const pct = e.target > 0 ? Math.round((e.progress / e.target) * 100) : 0;
    const bar = buildProgressBar(pct);
    embed.addFields({
      name: `${tierEmoji} ${e.name} (${e.tier})`,
      value: `${bar} ${e.progress}/${e.target} (${pct}%)`,
    });
  }

  await interaction.editReply({ embeds: [embed] });
}

function buildProgressBar(pct: number): string {
  const filled = Math.round(pct / 10);
  return '▓'.repeat(filled) + '░'.repeat(10 - filled);
}
