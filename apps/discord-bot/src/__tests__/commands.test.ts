/*
 * Plan 02-03 Task 1 — TDD: slash command structure tests.
 *
 * Asserts that each of the 6 command modules exports:
 *   - `data` (SlashCommandBuilder)
 *   - `execute` (async function)
 * And that the command names match the canonical list.
 *
 * firebase-admin is mocked so leaderboard.ts (which reads Firestore) can be imported
 * without a live Firebase project.
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Mock firebase-admin so leaderboard.ts (which calls getReadOnlyDb()) can be imported.
vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  cert: vi.fn((sa) => sa),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(async () => ({ exists: false, data: () => undefined })),
    })),
    collection: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn(async () => ({ docs: [] })),
    })),
  })),
}));

// Dynamic import each command module to verify their exports.
const EXPECTED_COMMANDS = ['link', 'eventos', 'leaderboard', 'perfil', 'reto', 'ayuda'] as const;

describe('slash commands — export contract', () => {
  for (const name of EXPECTED_COMMANDS) {
    it(`${name}.ts exports \`data\` (SlashCommandBuilder) and \`execute\` (function)`, async () => {
      const mod = await import(`../commands/${name}.js`);
      expect(mod.data, `${name}.ts: missing \`data\` export`).toBeDefined();
      expect(typeof mod.data.toJSON, `${name}.ts: \`data\` must be a SlashCommandBuilder (has toJSON)`).toBe('function');
      expect(typeof mod.execute, `${name}.ts: \`execute\` must be a function`).toBe('function');
    });
  }

  it('command names match the canonical list of 6', async () => {
    const names: string[] = [];
    for (const name of EXPECTED_COMMANDS) {
      const mod = await import(`../commands/${name}.js`);
      names.push(mod.data.name);
    }
    expect(names).toEqual(expect.arrayContaining(EXPECTED_COMMANDS as unknown as string[]));
    expect(names).toHaveLength(6);
  });

  it('/ayuda contains exact crisis resource strings', async () => {
    const { ayudaEmbed } = await import('../commands/ayuda.js');
    const json = JSON.stringify(ayudaEmbed.toJSON());
    expect(json).toContain('Línea 171');
    expect(json).toContain('Estás aquí, eso ya cuenta');
  });
});

describe('commands index — aggregates all 6 commands', () => {
  it('exports an array with all 6 commands', async () => {
    const { commands } = await import('../commands/index.js');
    expect(commands).toHaveLength(6);
    const names = commands.map((c: { data: { name: string } }) => c.data.name);
    expect(names).toEqual(expect.arrayContaining(EXPECTED_COMMANDS as unknown as string[]));
  });
});
