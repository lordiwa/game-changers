/*
 * Plan 02-03 — /perfil slash command (ephemeral — personal data)
 *
 * Fetches the user's profile via gamification-botGetProfile Cloud Function.
 * If the Discord account is not linked, prompts them to use /link first.
 *
 * Ephemeral (flags: 64) — profile data is personal; never broadcast to channel.
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { callFunction } from '../lib/functionClient.js';

export const data = new SlashCommandBuilder()
  .setName('perfil')
  .setDescription('Muestra tu perfil y estadísticas de GameChangers (solo vos lo ves)');

type ProfileData = {
  displayName: string;
  level: number;
  xp: number;
  badges: string[];
  topStreakDays: number;
} | null;

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Ephemeral — profile is private.
  await interaction.deferReply({ flags: 64 });

  const result = await callFunction<ProfileData>(
    process.env['GAMIFICATION_BOT_GET_PROFILE_URL']!,
    { discordId: interaction.user.id },
  );

  if (!result.ok) {
    await interaction.editReply({
      content: 'No se pudo cargar tu perfil. Intentá de nuevo en unos minutos.',
    });
    return;
  }

  if (result.data === null) {
    await interaction.editReply({
      content: 'Aún no vinculaste tu cuenta — usá `/link` para empezar. Es solo 90 segundos!',
    });
    return;
  }

  const { displayName, level, xp, badges, topStreakDays } = result.data;
  const topBadges = badges.slice(0, 3);
  const badgeText = topBadges.length > 0 ? topBadges.join(' · ') : 'Sin badges aún — ¡sumalas participando!';

  const embed = new EmbedBuilder()
    .setTitle(`Perfil de ${displayName}`)
    .setColor(0x5865f2)
    .addFields(
      { name: 'Nivel', value: `${level}`, inline: true },
      { name: 'XP Total', value: `${xp.toLocaleString('es-EC')}`, inline: true },
      { name: 'Racha Máx.', value: `${topStreakDays} días`, inline: true },
      { name: 'Top Badges', value: badgeText },
    )
    .setFooter({ text: 'Participá en eventos y challenges para seguir subiendo de nivel!' });

  await interaction.editReply({ embeds: [embed] });
}
