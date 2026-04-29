/*
 * Plan 02-03 Task 1 — TDD RED: intents lock-down tests.
 *
 * CRITICAL compliance test: asserts ALLOWED_INTENTS is exactly 3 values
 * and NEVER includes GatewayIntentBits.MessageContent (ADR-001, LOPDP minimization).
 *
 * These tests gate the quarterly TOS compliance audit (tos-compliance-audit.yml).
 */
import { describe, it, expect } from 'vitest';
import { GatewayIntentBits } from 'discord.js';
import { ALLOWED_INTENTS, FORBIDDEN_INTENTS } from '../lib/intents.js';

describe('ALLOWED_INTENTS — intent lock-down (ADR-001 + LOPDP minimization)', () => {
  it('contains exactly 3 allowed intents', () => {
    expect(ALLOWED_INTENTS).toHaveLength(3);
  });

  it('contains Guilds', () => {
    expect(ALLOWED_INTENTS).toContain(GatewayIntentBits.Guilds);
  });

  it('contains GuildMembers', () => {
    expect(ALLOWED_INTENTS).toContain(GatewayIntentBits.GuildMembers);
  });

  it('contains GuildMessageReactions', () => {
    expect(ALLOWED_INTENTS).toContain(GatewayIntentBits.GuildMessageReactions);
  });

  it('NEVER contains MessageContent (LOPDP minimization + ADR-001 firewall)', () => {
    // This is the critical assertion — MessageContent in ALLOWED_INTENTS is a TOS violation.
    expect(ALLOWED_INTENTS).not.toContain(GatewayIntentBits.MessageContent);
  });

  it('does NOT contain any other intents beyond the 3 allowed', () => {
    const allowedSet = new Set(ALLOWED_INTENTS);
    const expectedSet = new Set([
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessageReactions,
    ]);
    expect(allowedSet).toEqual(expectedSet);
  });
});

describe('FORBIDDEN_INTENTS — explicit deny-list', () => {
  it('explicitly lists MessageContent as forbidden', () => {
    expect(FORBIDDEN_INTENTS).toContain(GatewayIntentBits.MessageContent);
  });
});
