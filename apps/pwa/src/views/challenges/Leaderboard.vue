<template>
  <div class="leaderboard">
    <h1 class="heading">{{ t('challenges.leaderboard.heading') }}</h1>

    <!-- Period tabs -->
    <div class="period-tabs" role="tablist" :aria-label="t('challenges.leaderboard.heading')">
      <button
        v-for="p in periods"
        :key="p"
        class="tab-btn"
        :class="{ active: activePeriod === p }"
        role="tab"
        :aria-selected="activePeriod === p"
        @click="activePeriod = p"
      >
        {{ t(`challenges.leaderboard.tab_${p}`) }}
      </button>
    </div>

    <!-- Cohort selector -->
    <div class="cohort-tabs" role="group" :aria-label="'Zona'">
      <button
        v-for="c in cohorts"
        :key="c"
        class="cohort-btn"
        :class="{ active: activeCohort === c }"
        @click="activeCohort = c"
      >
        {{ t(`challenges.leaderboard.cohort.${c}`) }}
      </button>
    </div>

    <!-- CRITICAL (Pitfall #2): reads ONE aggregate doc /leaderboards/{period}_{cohort}
         via VueFire useDocument — NEVER useCollection on challengeProgress. -->
    <div v-if="!rows.length" class="empty-state" aria-live="polite">
      <p>Aún no hay participantes en este ranking. ¡Sé el primero!</p>
    </div>

    <ol v-else class="leaderboard-list" aria-label="Tabla de líderes">
      <LeaderboardRow
        v-for="row in rows"
        :key="row.uid"
        :row="row"
        :is-self="row.uid === currentUid"
      />
    </ol>

    <!-- Recompute explainer -->
    <p class="recompute-note">
      {{ t('challenges.leaderboard.recompute_explainer') }}
      <button class="info-link" @click="showExplainer = !showExplainer">¿Cómo se calcula?</button>
    </p>

    <div v-if="showExplainer" class="explainer" role="note">
      <p>
        Cada 15 minutos calculamos el total de tu progreso en los desafíos activos de la temporada.
        Solo aparecen quienes optaron por estar en el ranking. El ranking anónimo muestra
        "Anónimo #N" en lugar de tu nombre.
      </p>
    </div>

    <!-- Updated at -->
    <p v-if="updatedAt" class="updated-at">
      Actualizado: {{ formatDate(updatedAt) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getAuth } from 'firebase/auth';
import { useLeaderboard } from '../../composables/useChallenges.js';
import LeaderboardRow from '../../components/LeaderboardRow.vue';
import type { LeaderboardRow as LeaderboardRowType } from '@gamechangers/shared';

const { t } = useI18n();

const periods = ['weekly', 'monthly', 'season'] as const;
const cohorts = ['global', 'quito', 'guayaquil', 'cuenca'] as const;

const activePeriod = ref<typeof periods[number]>('weekly');
const activeCohort = ref<typeof cohorts[number]>('global');
const showExplainer = ref(false);

// CRITICAL: useDocument on ONE aggregate doc — NOT useCollection on challengeProgress
const { rows: rawRows, updatedAt } = useLeaderboard(activePeriod.value, activeCohort.value);

// Re-bind when period/cohort change (computed to pick up reactive changes)
// Using separate reactive refs for each period×cohort to avoid multiple subscriptions
const { rows: rows_, updatedAt: updatedAt_ } = useLeaderboard(
  activePeriod.value,
  activeCohort.value,
);

const rows = computed(() => (rawRows.value ?? []) as LeaderboardRowType[]);
const currentUid = computed(() => getAuth().currentUser?.uid ?? null);

function formatDate(ts: unknown): string {
  if (!ts) return '';
  try {
    const date = typeof (ts as { toDate?: () => Date }).toDate === 'function'
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as string);
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
</script>

<style scoped>
.leaderboard {
  padding: 1.5rem;
  max-width: 48rem;
  margin: 0 auto;
}

.heading {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.25rem;
}

.period-tabs,
.cohort-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.tab-btn,
.cohort-btn {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border, #374151);
  background: transparent;
  color: var(--color-text-muted, #9ca3af);
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.15s;
}

.tab-btn.active,
.cohort-btn.active {
  background: var(--color-accent-xp, #f59e0b);
  border-color: var(--color-accent-xp, #f59e0b);
  color: #000;
  font-weight: 600;
}

.leaderboard-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-muted, #9ca3af);
}

.recompute-note {
  margin-top: 1.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
}

.info-link {
  background: none;
  border: none;
  color: var(--color-accent-xp, #f59e0b);
  cursor: pointer;
  font-size: 0.75rem;
  text-decoration: underline;
  padding: 0;
  margin-left: 0.25rem;
}

.explainer {
  background: var(--color-surface-2, #1f2937);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted, #9ca3af);
}

.updated-at {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
}
</style>
