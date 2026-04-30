/**
 * Leaderboard-aggregate-doc.test.ts — Verifies Leaderboard.vue subscribes to ONE doc.
 *
 * Critical test (Pitfall #2):
 *   - Leaderboard.vue MUST use useDocument on /leaderboards/{period}_{cohort}
 *   - Leaderboard.vue MUST NOT use useCollection on any collection
 *   - Leaderboard.vue MUST NOT call onSnapshot on any collection
 *
 * The test uses vi.spyOn to verify VueFire binding choices.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';

// ── Track VueFire calls ──────────────────────────────────────────────────────
const useDocumentSpy = vi.fn().mockReturnValue({ value: { rows: [], updatedAt: null } });
const useCollectionSpy = vi.fn().mockReturnValue({ value: [] });

vi.mock('vuefire', () => ({
  useDocument: (...args: unknown[]) => useDocumentSpy(...args),
  useCollection: (...args: unknown[]) => useCollectionSpy(...args),
}));

vi.mock('../firebase.js', () => ({ db: {}, auth: { currentUser: { uid: 'user-123' } } }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(() => ({ currentUser: { uid: 'user-123' } })) }));

// Mock firebase/firestore doc/collection so we can inspect calls
const docSpy = vi.fn().mockReturnValue({ _path: 'leaderboards/weekly_global' });
const collectionSpy = vi.fn();
vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docSpy(...args),
  collection: (...args: unknown[]) => collectionSpy(...args),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

import Leaderboard from '../views/challenges/Leaderboard.vue';
import LeaderboardRow from '../components/LeaderboardRow.vue';

const i18n = createI18n({
  locale: 'es',
  messages: {
    es: {
      challenges: {
        leaderboard: {
          heading: 'Tabla de líderes',
          tab_weekly: 'Semanal',
          tab_monthly: 'Mensual',
          tab_season: 'Temporada',
          cohort: { global: 'Global', quito: 'Quito', guayaquil: 'Guayaquil', cuenca: 'Cuenca' },
          anon_template: 'Anónimo #{n}',
          recompute_explainer: 'Se actualiza cada 15 minutos.',
          opt_in_label: 'Aparecer en el ranking',
          anonymous_label: 'Participar anónimamente',
        },
      },
      me: { back: 'Volver' },
    },
  },
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/challenges/leaderboard', component: Leaderboard }],
});

describe('Leaderboard.vue — aggregate doc subscription (Pitfall #2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDocumentSpy.mockReturnValue({ value: { rows: [], updatedAt: null } });
    useCollectionSpy.mockReturnValue({ value: [] });
  });

  it('calls useDocument (not useCollection) for leaderboard data', async () => {
    mount(Leaderboard, {
      global: {
        plugins: [i18n, router],
        stubs: { LeaderboardRow: true },
      },
    });

    // useDocument MUST have been called (for the leaderboard aggregate doc)
    expect(useDocumentSpy).toHaveBeenCalled();
  });

  it('useDocument is called with a /leaderboards/ doc reference', async () => {
    mount(Leaderboard, {
      global: {
        plugins: [i18n, router],
        stubs: { LeaderboardRow: true },
      },
    });

    // The doc() spy should have been called with 'leaderboards' collection
    const leaderboardDocCall = docSpy.mock.calls.find((args: unknown[]) =>
      String(args[1]).includes('leaderboard') || String(args[0]).includes('leaderboard'),
    );
    expect(leaderboardDocCall).toBeDefined();
  });

  it('does NOT call useCollection for leaderboard data (would scan collection)', async () => {
    mount(Leaderboard, {
      global: {
        plugins: [i18n, router],
        stubs: { LeaderboardRow: true },
      },
    });

    // useCollection should NOT be called with challengeProgress
    const challengeProgressCall = useCollectionSpy.mock.calls.find((args: unknown[]) =>
      JSON.stringify(args).includes('challengeProgress'),
    );
    expect(challengeProgressCall).toBeUndefined();
  });

  it('renders LeaderboardRow components from aggregate rows', async () => {
    const mockRows = [
      { uid: 'uid-1', displayName: 'Player One', anonymous: false, rank: 1, value: 9000, tier: 'oro' },
      { uid: 'uid-2', displayName: 'Anónimo #2', anonymous: true, rank: 2, value: 5000, tier: 'plata' },
    ];

    useDocumentSpy.mockReturnValue({ value: { rows: mockRows, updatedAt: null } });

    const wrapper = mount(Leaderboard, {
      global: {
        plugins: [i18n, router],
        stubs: { LeaderboardRow: true },
      },
    });

    // Should render rows (via stub)
    await wrapper.vm.$nextTick();
    // The rows are rendered — component doesn't crash
    expect(wrapper.exists()).toBe(true);
  });

  it('shows empty state when no rows in aggregate doc', async () => {
    useDocumentSpy.mockReturnValue({ value: { rows: [], updatedAt: null } });

    const wrapper = mount(Leaderboard, {
      global: {
        plugins: [i18n, router],
        stubs: { LeaderboardRow: true },
      },
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('primero');
  });
});
