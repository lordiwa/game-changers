import { describe, it, expect, vi } from 'vitest';

// Mock heavy dependencies that need a real browser/Firebase to instantiate.
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
}));
vi.mock('@sentry/vue', () => ({ init: vi.fn() }));
vi.mock('vuefire', () => ({
  VueFire: { install: vi.fn() },
  VueFireAuth: vi.fn(() => ({})),
}));
vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    has_opted_in_capturing: vi.fn(() => false),
    capture: vi.fn(),
  },
}));

describe('app boot', () => {
  it('imports main.ts without throwing', async () => {
    // jsdom provides document; the actual mount target #app may be missing
    // but we only assert the import resolves (proves all transitive imports are wired).
    const div = document.createElement('div');
    div.id = 'app';
    document.body.appendChild(div);

    // Test 1 per 02-01-PLAN.md Task 1 <behavior>: prove the app boots without throwing.
    // Vitest resolves bare specifiers; tsc strict mode rejects explicit .ts extensions
    // unless allowImportingTsExtensions is on.
    await expect(import('../main')).resolves.toBeDefined();
  });
});
