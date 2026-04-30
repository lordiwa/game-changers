/**
 * useContent.test.ts — Unit tests for the useContent composable.
 *
 * Tests:
 *   1. Returns all published articles.
 *   2. Filters articles by pillar.
 *   3. Filters articles by game cluster.
 *   4. Filters can be combined.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// ── Mock vuefire ─────────────────────────────────────────────────────────────
vi.mock('vuefire', () => ({
  useCollection: vi.fn(),
}));

// ── Mock firebase/firestore ───────────────────────────────────────────────────
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

// ── Mock ../firebase ──────────────────────────────────────────────────────────
vi.mock('../firebase', () => ({ firebaseApp: {} }));

import { useContent } from '../composables/useContent';
import { useCollection } from 'vuefire';

// Helper: create a stub article
function makeArticle(overrides: Record<string, unknown> = {}) {
  return {
    id: 'article-1',
    title: { es: 'Artículo 1', en: 'Article 1' },
    slug: { es: 'articulo-1', en: 'article-1' },
    body: { es: '...', en: '...' },
    pillar: 'movimiento' as const,
    contentType: 'article' as const,
    gameClusters: ['general'] as const,
    estReadMinutes: 5,
    publishedAt: new Date(),
    status: 'published' as const,
    authorName: 'Test Author',
    ...overrides,
  };
}

describe('useContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all published articles from the collection', () => {
    const mockArticles = [
      makeArticle({ id: 'a1', pillar: 'movimiento' }),
      makeArticle({ id: 'a2', pillar: 'mente' }),
      makeArticle({ id: 'a3', pillar: 'nutricion' }),
    ];
    vi.mocked(useCollection).mockReturnValue(ref(mockArticles) as ReturnType<typeof useCollection>);

    const { articles } = useContent();
    expect(articles.value).toHaveLength(3);
  });

  it('filters articles by pillar', () => {
    const mockArticles = [
      makeArticle({ id: 'a1', pillar: 'movimiento' }),
      makeArticle({ id: 'a2', pillar: 'mente' }),
      makeArticle({ id: 'a3', pillar: 'movimiento' }),
    ];
    vi.mocked(useCollection).mockReturnValue(ref(mockArticles) as ReturnType<typeof useCollection>);

    const { articles, filterByPillar } = useContent();
    filterByPillar('movimiento');
    expect(articles.value).toHaveLength(2);
    expect(articles.value.every((a) => a.pillar === 'movimiento')).toBe(true);
  });

  it('filters articles by game cluster', () => {
    const mockArticles = [
      makeArticle({ id: 'a1', gameClusters: ['free-fire', 'general'] }),
      makeArticle({ id: 'a2', gameClusters: ['dota', 'general'] }),
      makeArticle({ id: 'a3', gameClusters: ['free-fire'] }),
    ];
    vi.mocked(useCollection).mockReturnValue(ref(mockArticles) as ReturnType<typeof useCollection>);

    const { articles, filterByCluster } = useContent();
    filterByCluster('free-fire');
    expect(articles.value).toHaveLength(2);
    expect(articles.value.every((a) => (a.gameClusters as string[]).includes('free-fire'))).toBe(true);
  });

  it('combines pillar and cluster filters', () => {
    const mockArticles = [
      makeArticle({ id: 'a1', pillar: 'movimiento', gameClusters: ['free-fire'] }),
      makeArticle({ id: 'a2', pillar: 'mente', gameClusters: ['free-fire'] }),
      makeArticle({ id: 'a3', pillar: 'movimiento', gameClusters: ['dota'] }),
    ];
    vi.mocked(useCollection).mockReturnValue(ref(mockArticles) as ReturnType<typeof useCollection>);

    const { articles, filterByPillar, filterByCluster } = useContent();
    filterByPillar('movimiento');
    filterByCluster('free-fire');
    expect(articles.value).toHaveLength(1);
    expect(articles.value[0].id).toBe('a1');
  });

  it('clears filters to show all articles', () => {
    const mockArticles = [
      makeArticle({ id: 'a1', pillar: 'movimiento' }),
      makeArticle({ id: 'a2', pillar: 'mente' }),
    ];
    vi.mocked(useCollection).mockReturnValue(ref(mockArticles) as ReturnType<typeof useCollection>);

    const { articles, filterByPillar, clearFilters } = useContent();
    filterByPillar('movimiento');
    expect(articles.value).toHaveLength(1);
    clearFilters();
    expect(articles.value).toHaveLength(2);
  });
});
