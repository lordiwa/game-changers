/*
 * Plan 02-03 — /link slash command
 *
 * Generates a one-time link token via auth-botGenerateLinkToken Cloud Function
 * and returns a private (ephemeral) embed with the link URL to the user.
 *
 * Bot↔PWA handoff contract (consumed by Plan 02-02 DiscordInit.vue):
 *   URL: https://gamechangers.gg/auth/discord/init?t=<JWT>
 *   JWT payload: { discordId, exp: now+600s (10min), iat, jti }
 *   Signing: HS256 with LINK_TOKEN_SECRET (symmetric, shared between botEndpoints.ts + PWA)
 *   Plan 02: DiscordInit.vue decodes/verifies → stashes pending_discord_id → kicks Discord OAuth.
 *   After OAuth: DiscordCallback.vue → discordExchange Function → asserts pendingDiscordId ===
 *     OAuth user.id (DISCORD_ID_MISMATCH on attack).
 *   Target: <90 seconds end-to-end per DBOT-04.
 *
 * Ephemeral (flags: 64) to avoid leaking the link URL to other channel members.
 */
import { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import { callFunction } from '../lib/functionClient.js';

export const data = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Vincula tu cuenta de Discord con GameChangers (expira en 10 minutos)');

type LinkTokenData = {
  linkUrl: string;
  expiresAt: number;
};

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  // Defer ephemeral — shows "thinking" only to the user who ran the command.
  await interaction.deferReply({ flags: 64 }); // 64 = MessageFlags.Ephemeral

  const result = await callFunction<LinkTokenData>(
    process.env['AUTH_BOT_GENERATE_LINK_TOKEN_URL']!,
    {
      discordId: interaction.user.id,
      discordUsername: interaction.user.username,
    },
  );

  if (!result.ok) {
    await interaction.editReply({
      content: 'Hubo un error generando tu link. Por favor intentá de nuevo en unos minutos.',
    });
    return;
  }

  await interaction.editReply({
    embeds: [
      {
        title: 'Vincula tu cuenta GameChangers',
        description:
          `Abre este enlace para conectar tu Discord con GameChangers (válido por 10 minutos):\n\n` +
          `**[Ir a GameChangers](${result.data.linkUrl})**\n\n` +
          `Este link es personal y de un solo uso. No lo compartas.`,
        color: 0x5865f2, // Discord blurple
        footer: {
          text: 'El link expira en 10 minutos. Necesitás abrir el enlace antes de que venza.',
        },
      },
    ],
  });
}
