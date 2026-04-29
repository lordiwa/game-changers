/*
 * Plan 02-03 — Intent allow-list (LOCKED per ADR-001 + LOPDP minimization).
 *
 * CRITICAL: GatewayIntentBits.MessageContent is NEVER allowed.
 * Rationale:
 *   - LOPDP minimization: we must not collect data (message content) we do not need.
 *   - Discord Developer Policy: MessageContent intent triggers app review for most bots and
 *     is explicitly prohibited for bots that monetize or aggregate API data.
 *   - ADR-001 architectural firewall: the bot is a read-only bridge — no message scanning.
 *
 * The quarterly TOS compliance audit (tos-compliance-audit.yml) greps this file and
 * asserts that MessageContent does NOT appear inside ALLOWED_INTENTS.
 * The intents.test.ts unit test also asserts this invariant on every CI run.
 */
import { GatewayIntentBits } from 'discord.js';

export const ALLOWED_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessageReactions,
] as const;

/**
 * Explicit deny-list of intents this bot must NEVER request.
 * Referenced by the TOS audit workflow and intents.test.ts.
 * - LOPDP: MessageContent = reading all message text = surveillance surface = violation.
 * - ADR-001: bot is read-only bridge, not a data collector.
 * - Discord verification gate: enabling MessageContent requires Discord app review.
 */
export const FORBIDDEN_INTENTS = [GatewayIntentBits.MessageContent] as const;
