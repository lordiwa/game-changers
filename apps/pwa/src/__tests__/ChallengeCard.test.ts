/**
 * ChallengeCard.test.ts — Tests for ChallengeCard component.
 *
 * Tests:
 *   - Renders 'available' variant without enrollment
 *   - Renders 'enrolled' variant with enrollment (shows progress bar)
 *   - Renders 'completed' variant when completedAt is set
 *   - Bronce/Plata/Oro tier colors use correct CSS classes
 *   - CTA link goes to correct challenge route
 */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../firebase.js', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('vuefire', () => ({ useDocument: vi.fn(() => ({ value: null })), useCollection: vi.fn(() => ({ value: [] })) }));

import ChallengeCard from '../components/ChallengeCard.vue';
import type { Challenge, ChallengeEnrollment } from '@gamechangers/shared';

// ── Test setup ───────────────────────────────────────────────────────────────
const i18n = createI18n({
  locale: 'es',
  messages: {
    es: {
      challenges: {
        tier: { bronce: 'Bronce', plata: 'Plata', oro: 'Oro' },
        cta: { accept: 'Acepto el desafío', log: 'Registrar mi avance' },
      },
      me: { back: 'Volver' },
    },
  },
});

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/challenges/:id', component: { template: '<div/>' } },
  ],
});

const fakeChallenge: Challenge = {
  id: 'test-challenge-1',
  type: 'movement',
  name: { es: 'Desafío de Movimiento', en: 'Movement Challenge' },
  description: { es: 'Muévete más', en: 'Move more' },
  tier: {
    bronce: { target: 50000, reward: { xp: 200, badgeId: 'movement-bronce' } },
    plata: { target: 200000, reward: { xp: 600, badgeId: 'movement-plata' } },
    oro: { target: 500000, reward: { xp: 1500, badgeId: 'movement-oro' } },
  },
  metric: 'steps',
  unit: 'steps',
  startsAt: new Date().toISOString(),
  endsAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  season: '2026-q2',
  visibility: 'public',
  acceptablePhotoEvidence: true,
};

const fakeEnrollment: ChallengeEnrollment = {
  uid: 'user-123',
  challengeId: 'test-challenge-1',
  tier: 'bronce',
  enrolledAt: new Date().toISOString(),
  optInLeaderboard: false,
  anonymousLeaderboard: false,
  progress: 12500,
};

function mountCard(props: { challenge: Challenge; enrollment?: ChallengeEnrollment | null }) {
  return mount(ChallengeCard, {
    props,
    global: {
      plugins: [i18n, router],
      stubs: { ChallengeProgressBar: true },
    },
  });
}

describe('ChallengeCard — available variant (no enrollment)', () => {
  it('renders challenge name in the current locale', () => {
    const wrapper = mountCard({ challenge: fakeChallenge });
    expect(wrapper.text()).toContain('Desafío de Movimiento');
  });

  it('renders "Acepto el desafío" CTA', () => {
    const wrapper = mountCard({ challenge: fakeChallenge });
    expect(wrapper.text()).toContain('Acepto el desafío');
  });

  it('links to the correct challenge route', () => {
    const wrapper = mountCard({ challenge: fakeChallenge });
    const link = wrapper.find('a');
    expect(link.attributes('href')).toContain('/challenges/test-challenge-1');
  });

  it('does NOT render progress bar', () => {
    const wrapper = mountCard({ challenge: fakeChallenge });
    expect(wrapper.findComponent({ name: 'ChallengeProgressBar' }).exists()).toBe(false);
  });
});

describe('ChallengeCard — enrolled variant', () => {
  it('renders progress bar', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: fakeEnrollment });
    expect(wrapper.findComponent({ name: 'ChallengeProgressBar' }).exists()).toBe(true);
  });

  it('renders "Registrar mi avance" CTA', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: fakeEnrollment });
    expect(wrapper.text()).toContain('Registrar mi avance');
  });

  it('applies enrolled CSS class', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: fakeEnrollment });
    expect(wrapper.classes()).toContain('enrolled');
  });
});

describe('ChallengeCard — completed variant', () => {
  const completedEnrollment: ChallengeEnrollment = {
    ...fakeEnrollment,
    completedAt: new Date().toISOString(),
    progress: 50000,
  };

  it('applies completed CSS class', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: completedEnrollment });
    expect(wrapper.classes()).toContain('completed');
  });

  it('shows completion indicator', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: completedEnrollment });
    expect(wrapper.text()).toContain('Completado');
  });
});

describe('ChallengeCard — tier color tokens', () => {
  it('applies tier-bronce CSS class for Bronce enrollment', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: { ...fakeEnrollment, tier: 'bronce' } });
    expect(wrapper.find('.tier-badge').classes()).toContain('tier-bronce');
  });

  it('applies tier-plata CSS class for Plata enrollment', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: { ...fakeEnrollment, tier: 'plata' } });
    expect(wrapper.find('.tier-badge').classes()).toContain('tier-plata');
  });

  it('applies tier-oro CSS class for Oro enrollment', () => {
    const wrapper = mountCard({ challenge: fakeChallenge, enrollment: { ...fakeEnrollment, tier: 'oro' } });
    expect(wrapper.find('.tier-badge').classes()).toContain('tier-oro');
  });
});
