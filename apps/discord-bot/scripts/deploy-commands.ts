/*
 * Plan 02-03 — Slash command registration script.
 *
 * Registers all 6 slash commands as guild commands against the configured GUILD_ID.
 * Guild commands deploy instantly (vs. global commands which take up to 1h).
 *
 * Run via CI after bot-deploy.yml build step:
 *   node dist/scripts/deploy-commands.js
 *
 * Required env vars (read from /etc/gamechangers/bot.env or GitHub Actions secrets):
 *   DISCORD_BOT_TOKEN — bot token
 *   CLIENT_ID         — Discord application ID
 *   GUILD_ID          — Target guild (server) ID
 */
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from '../src/commands/index.js';

const token = process.env['DISCORD_BOT_TOKEN'];
const clientId = process.env['CLIENT_ID'];
const guildId = process.env['GUILD_ID'];

if (!token || !clientId || !guildId) {
  console.error(
    '[deploy-commands] Missing required env vars: DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID',
  );
  process.exit(1);
}

const commandsJson = commands.map((cmd) => cmd.data.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

console.log(`[deploy-commands] Registering ${commandsJson.length} commands to guild ${guildId}...`);

try {
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsJson });
  console.log('[deploy-commands] Commands registered successfully.');
} catch (err) {
  console.error('[deploy-commands] Failed to register commands:', err);
  process.exit(1);
}
