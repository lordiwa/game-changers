/*
 * Plan 02-03 — /ayuda slash command
 *
 * Static embed with Ecuador crisis resources (24/7).
 * Content is EXACTLY per plan spec (acceptance criterion).
 *
 * This is NOT logged with PII (T-02-03-09: accept — user invokes explicitly; static content only).
 * Content: Línea 171 (free, 24h), backup hotline, and community message.
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

/**
 * Crisis resources embed — exported so commands.test.ts can inspect the exact strings
 * without needing to instantiate a mock interaction.
 */
export const ayudaEmbed = new EmbedBuilder()
  .setTitle('Necesitas ayuda?')
  .setDescription(
    'Estás en crisis o conoces a alguien que lo está? Estos son contactos confiables en Ecuador, 24/7:',
  )
  .addFields(
    { name: '🆘 Línea 171 (gratuita, 24h)', value: 'Llamá al 171 desde cualquier teléfono en Ecuador.' },
    {
      name: '🌐 Backup: Línea de Apoyo Emocional',
      value: '<PHASE_0_BACKUP_HOTLINE> — se define con el DPO y socio de salud mental en Fase 0 (LEGAL-10).',
    },
    {
      name: 'Estás aquí, eso ya cuenta. — Equipo GameChangers',
      value: 'No estás solo/a. La comunidad está con vos.',
    },
  )
  .setColor(0xed4245) // red — urgency signal
  .setFooter({ text: 'Si estás en peligro inmediato, llamá al 911.' });

export const data = new SlashCommandBuilder()
  .setName('ayuda')
  .setDescription('Recursos de crisis y apoyo emocional disponibles 24/7 en Ecuador');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Public response — crisis resources should be visible so others can see them too.
  await interaction.reply({ embeds: [ayudaEmbed] });
}
