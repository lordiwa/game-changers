/*
 * Plan 02-03 — Discord bot entrypoint (discord.js v14.26.3)
 *
 * Architecture:
 *   - Deployed on Compute Engine e2-micro in southamerica-east1-a via systemd (NOT Cloud Functions).
 *   - Gateway intents: ALLOWED_INTENTS only (Guilds | GuildMembers | GuildMessageReactions).
 *   - MessageContent intent is FORBIDDEN per ADR-001 + LOPDP minimization.
 *   - All writes flow PWA → Functions; bot is read-only.
 *
 * Security: see apps/discord-bot/src/lib/intents.ts for the intent lock-down rationale.
 */
import 'dotenv/config';
import { Client, Collection } from 'discord.js';
import { ALLOWED_INTENTS } from './lib/intents.js';
import { commands } from './commands/index.js';
import type { Command } from './commands/index.js';
import * as Sentry from '@sentry/node';

// ─── Sentry initialization ────────────────────────────────────────────────────
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'production',
    beforeSend(event) {
      // Scrub PII fields matching the shared scrubber pattern (T-02-03-05).
      // Mirror of apps/pwa/src/composables/useSentryScrub.ts.
      const scrubPattern = /discord_?id|username|token/i;
      if (event.user) {
        event.user = { id: '[scrubbed]' };
      }
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        for (const key of Object.keys(data)) {
          if (scrubPattern.test(key)) data[key] = '[scrubbed]';
        }
      }
      return event;
    },
  });
}

// ─── Discord client ───────────────────────────────────────────────────────────
// intents is LOCKED to ALLOWED_INTENTS — never GatewayIntentBits.MessageContent.
const client = new Client({ intents: [...ALLOWED_INTENTS] });

// Augment Client to hold the command collection.
const clientCommands = new Collection<string, Command>();
commands.forEach((cmd) => clientCommands.set(cmd.data.name, cmd));

// ─── Event handlers ───────────────────────────────────────────────────────────
client.on('ready', (c) => {
  console.log(`[bot] Ready as ${c.user.tag} — intents: Guilds|GuildMembers|GuildMessageReactions`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = clientCommands.get(interaction.commandName);
  if (!command) {
    console.warn(`[bot] Unknown command: ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (err) {
    Sentry.captureException(err);
    console.error(`[bot] Error executing /${interaction.commandName}:`, err);
    const errorMsg = { content: 'Hubo un error ejecutando este comando. Por favor intentá de nuevo.', flags: 64 };
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    } catch {
      // Ignore secondary errors.
    }
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────
const token = process.env['DISCORD_BOT_TOKEN'];
if (!token) {
  throw new Error('[bot] DISCORD_BOT_TOKEN is not set. Check /etc/gamechangers/bot.env');
}

client.login(token).catch((err) => {
  Sentry.captureException(err);
  console.error('[bot] Login failed:', err);
  process.exit(1);
});
