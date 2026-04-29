<script setup lang="ts">
/**
 * StatRow.vue — Single stat row for HP/Stamina/Mente/Social.
 *
 * UI-SPEC §14:
 *   - Phosphor icon + ES label
 *   - Horizontal bar: fill 'accent-xp' (HP/Stamina/Social) or 'info-blue' (Mente)
 *   - Numeric value in JetBrains Mono
 *   - Optional trend indicator (with-trend variant)
 *
 * CRITICAL per Pitfall #9 + PROF-12:
 *   Bar is ALWAYS full-color regardless of wearable state.
 *   Never grayed-out. Even value=1 shows color.
 */

const props = withDefaults(
  defineProps<{
    statKey: 'hp' | 'stamina' | 'mente' | 'social';
    value: number;       // 0..100 (min 1 per recomputeStats)
    label: string;       // i18n translated label
    trend?: 'up' | 'down' | 'neutral';
    withTrend?: boolean;
  }>(),
  {
    trend: 'neutral',
    withTrend: false,
  },
);

// Mente uses info-blue fill; others use accent-xp
const fillClass = props.statKey === 'mente' ? 'stat-fill--mente' : 'stat-fill--xp';
</script>

<template>
  <div class="stat-row flex items-center gap-3 py-2" :data-stat="statKey">
    <!-- Icon placeholder (Phosphor icons — using emoji fallbacks for now) -->
    <span class="stat-row__icon text-lg w-6 text-center" aria-hidden="true">
      <template v-if="statKey === 'hp'">❤️</template>
      <template v-else-if="statKey === 'stamina'">⚡</template>
      <template v-else-if="statKey === 'mente'">🧠</template>
      <template v-else-if="statKey === 'social'">🤝</template>
    </span>

    <!-- Label -->
    <span class="stat-row__label text-sm text-text-secondary flex-shrink-0 w-24">
      {{ label }}
    </span>

    <!-- Bar track -->
    <div
      class="stat-row__track flex-1 rounded-full overflow-hidden"
      style="height: 8px; background-color: var(--color-surface-3, #2a2a3a);"
      role="progressbar"
      :aria-valuenow="value"
      :aria-valuemax="100"
      :aria-label="`${label}: ${value}/100`"
    >
      <div
        class="stat-row__fill rounded-full transition-all duration-700"
        :class="fillClass"
        :style="{ width: `${value}%`, minWidth: '4px' }"
        style="height: 100%;"
      />
    </div>

    <!-- Numeric value -->
    <span class="stat-row__value font-mono tabular-nums text-sm text-text-primary w-14 text-right flex-shrink-0">
      {{ value }}<span class="text-text-secondary">/100</span>
    </span>

    <!-- Trend indicator (optional) -->
    <span
      v-if="withTrend && trend !== 'neutral'"
      class="stat-row__trend flex-shrink-0"
      :class="trend === 'up' ? 'text-green-400' : 'text-red-400'"
      aria-hidden="true"
    >
      {{ trend === 'up' ? '▲' : '▼' }}
    </span>
  </div>
</template>

<style scoped>
.stat-fill--xp {
  background-color: var(--color-accent-xp, #f59e0b);
}

.stat-fill--mente {
  background-color: var(--color-info-blue, #3b82f6);
}
</style>
