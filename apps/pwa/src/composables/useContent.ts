/**
 * useContent.ts — Vue composable for loading and filtering content articles.
 *
 * Uses VueFire useCollection to reactively load published articles from Firestore.
 * Client-side filtering by pillar and game cluster (avoids redundant Firestore indexes).
 *
 * Constraint: NO onSnapshot usage in components/views — this composable handles all
 * real-time binding via VueFire (ESLint-enforced at components/views layer).
 */
import { ref, computed, type Ref } from 'vue';
import { getFirestore, collection, query, where } from 'firebase/firestore';
import { useCollection } from 'vuefire';
import { firebaseApp } from '../firebase';
import type { ContentArticle } from '@gamechangers/shared';

const db = getFirestore(firebaseApp);

type Pillar = 'movimiento' | 'mente' | 'nutricion' | 'comunidad' | 'data';
type GameCluster = 'free-fire' | 'dota' | 'minecraft' | 'lol' | 'valorant' | 'general';

export function useContent() {
  const activePillar: Ref<Pillar | null> = ref(null);
  const activeCluster: Ref<GameCluster | null> = ref(null);

  // Load all published articles from Firestore via VueFire.
  // VueFire's useCollection sets up a real-time listener under the hood.
  const allArticles = useCollection<ContentArticle>(
    computed(() =>
      query(
        collection(db, 'content'),
        where('status', '==', 'published'),
      ),
    ),
  );

  // Client-side filter: derived from allArticles, activePillar, activeCluster.
  const articles = computed<ContentArticle[]>(() => {
    let result: ContentArticle[] = (allArticles.value as ContentArticle[]) ?? [];

    if (activePillar.value) {
      result = result.filter((a) => a.pillar === activePillar.value);
    }

    if (activeCluster.value) {
      const cluster = activeCluster.value;
      result = result.filter((a) => (a.gameClusters as string[]).includes(cluster));
    }

    return result;
  });

  function filterByPillar(pillar: Pillar | null): void {
    activePillar.value = pillar;
  }

  function filterByCluster(cluster: GameCluster | null): void {
    activeCluster.value = cluster;
  }

  function clearFilters(): void {
    activePillar.value = null;
    activeCluster.value = null;
  }

  return {
    articles,
    allArticles,
    activePillar,
    activeCluster,
    filterByPillar,
    filterByCluster,
    clearFilters,
  };
}
