<script setup lang="ts">
/**
 * Badges.vue — Grid of all earned + locked badges at /me/badges.
 *
 * Uses one-shot getDocs (NOT onSnapshot per ESLint rule).
 * Filterable by source type.
 */
import { ref, computed, onMounted } from 'vue';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useCurrentUser } from 'vuefire';
import { firebaseApp } from '../../firebase';
import Badge from '../../components/Badge.vue';

interface BadgeDoc {
  badgeId: string;
  source: string;
  tier?: 'bronce' | 'plata' | 'oro';
  earned: true;
}

const currentUser = useCurrentUser();
const db = getFirestore(firebaseApp);
const badges = ref<BadgeDoc[]>([]);
const loading = ref(false);
const filter = ref<string>('all');

onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (!uid) return;
  loading.value = true;
  try {
    const snap = await getDocs(collection(db, `users/${uid}/badges`));
    badges.value = snap.docs.map((d) => ({
      ...d.data(),
      badgeId: d.id,
      earned: true,
    })) as BadgeDoc[];
  } finally {
    loading.value = false;
  }
});

const sourceFilters = computed<string[]>(() => {
  // `b.source.split(':')[0]` is `string | undefined` under noUncheckedIndexedAccess;
  // filter to ensure `sourceFilters` exposes a defined-string list to the template.
  const prefixes = badges.value
    .map((b) => b.source.split(':')[0])
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  return Array.from(new Set(['all', ...prefixes]));
});

const filteredBadges = computed(() => {
  if (filter.value === 'all') return badges.value;
  return badges.value.filter((b) => b.source.startsWith(filter.value));
});
</script>

<template>
  <div class="badges-view p-4">
      <h1 class="text-xl font-bold text-text-primary mb-4">Mis Badges</h1>

      <!-- Filter tabs -->
      <div class="badges-filters flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          v-for="f in sourceFilters"
          :key="f"
          class="filter-btn"
          :class="{ 'filter-btn--active': filter === f }"
          @click="filter = f"
        >
          {{ f.charAt(0).toUpperCase() + f.slice(1) }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-text-secondary text-center py-8">Cargando...</div>

      <!-- Empty state -->
      <div v-else-if="filteredBadges.length === 0" class="text-text-secondary text-center py-8">
        Aún no tenés badges en esta categoría. ¡Participá en eventos!
      </div>

      <!-- Badge grid -->
      <div v-else class="badges-grid grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
        <Badge
          v-for="badge in filteredBadges"
          :key="badge.badgeId"
          :badge-id="badge.badgeId"
          :label="badge.badgeId.replace(/-/g, ' ')"
          :tier="badge.tier"
          :earned="badge.earned"
        />
      </div>
    </div>
</template>

<style scoped>
.filter-btn {
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  border: 1px solid var(--color-surface-3, #2a2a3a);
  background: var(--color-surface-2, #1e1e2e);
  color: var(--color-text-secondary, #a0a0b0);
  font-size: 0.8rem;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-btn--active {
  border-color: var(--color-accent-xp, #f59e0b);
  color: var(--color-accent-xp, #f59e0b);
}
</style>
