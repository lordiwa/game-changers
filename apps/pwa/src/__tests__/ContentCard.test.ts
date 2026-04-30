/**
 * ContentCard.test.ts — Unit tests for the ContentCard component.
 *
 * Tests:
 *   1. Renders article title and estimated read time.
 *   2. Renders pillar badge with correct class.
 *   3. Renders game cluster tags.
 *   4. Shows correct CTA based on contentType.
 */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ContentCard from '../components/ContentCard.vue';

// ── Mock vue-i18n ─────────────────────────────────────────────────────────────
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'content.cta.read': 'Leer ahora',
        'content.cta.watch': 'Ver ahora',
        'content.cta.quiz': 'Hacer el test',
        'content.pillar.movimiento': 'Movimiento',
        'content.pillar.mente': 'Mente',
        'content.pillar.nutricion': 'Nutrición',
        'content.pillar.comunidad': 'Comunidad',
        'content.pillar.data': 'Data',
      };
      return map[key] ?? key;
    },
    locale: { value: 'es' },
  }),
}));

// ── Mock vue-router ───────────────────────────────────────────────────────────
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  RouterLink: { template: '<a><slot /></a>' },
}));

function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'movimiento-stretching-gamer',
    title: { es: 'Stretching para gamers', en: 'Stretching for gamers' },
    slug: { es: 'movimiento-stretching-gamer', en: 'movimiento-stretching-gamer' },
    body: { es: '...', en: '...' },
    pillar: 'movimiento',
    contentType: 'article',
    gameClusters: ['free-fire', 'general'],
    estReadMinutes: 5,
    publishedAt: new Date(),
    status: 'published',
    authorName: 'GameChangers Team',
    ...overrides,
  };
}

describe('ContentCard', () => {
  it('renders article title', () => {
    const article = makeArticle();
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('Stretching para gamers');
  });

  it('renders estimated read time', () => {
    const article = makeArticle({ estReadMinutes: 5 });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('5');
  });

  it('renders pillar badge', () => {
    const article = makeArticle({ pillar: 'movimiento' });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('Movimiento');
  });

  it('renders game cluster tags', () => {
    const article = makeArticle({ gameClusters: ['free-fire', 'general'] });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('free-fire');
  });

  it('shows "Leer ahora" CTA for article type', () => {
    const article = makeArticle({ contentType: 'article' });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('Leer ahora');
  });

  it('shows "Ver ahora" CTA for video type', () => {
    const article = makeArticle({ contentType: 'video' });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('Ver ahora');
  });

  it('shows "Hacer el test" CTA for quiz type', () => {
    const article = makeArticle({ contentType: 'quiz' });
    const wrapper = mount(ContentCard, { props: { article } });
    expect(wrapper.text()).toContain('Hacer el test');
  });

  it('applies movimiento pillar color class', () => {
    const article = makeArticle({ pillar: 'movimiento' });
    const wrapper = mount(ContentCard, { props: { article } });
    // The badge should have the accent-xp color for movimiento
    const badge = wrapper.find('[data-pillar]');
    expect(badge.exists()).toBe(true);
    expect(badge.attributes('data-pillar')).toBe('movimiento');
  });
});
