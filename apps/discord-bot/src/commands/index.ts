/*
 * Plan 02-03 — Slash command aggregation.
 * All 6 commands are registered here and loaded by src/index.ts.
 */
import type { SlashCommandBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';

import * as link from './link.js';
import * as eventos from './eventos.js';
import * as leaderboard from './leaderboard.js';
import * as perfil from './perfil.js';
import * as reto from './reto.js';
import * as ayuda from './ayuda.js';

export type Command = {
  data: SlashCommandBuilder;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
};

export const commands: Command[] = [
  link as Command,
  eventos as Command,
  leaderboard as Command,
  perfil as Command,
  reto as Command,
  ayuda as Command,
];
