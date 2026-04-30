<template>
  <div class="progress-bar-wrapper" :class="{ compact }">
    <!-- Progress fraction with JetBrains Mono numerals -->
    <div class="progress-header">
      <span class="progress-fraction" aria-label="`${progress} de ${target}`">
        <span class="progress-value">{{ formattedProgress }}</span>
        <span class="progress-sep">/</span>
        <span class="progress-target">{{ formattedTarget }}</span>
      </span>
      <span class="tier-badge" :class="`tier-${tier}`" :aria-label="`Nivel ${tier}`">
        {{ tierLabel }}
      </span>
    </div>

    <!-- Progress bar fill with accent-xp color -->
    <div
      class="progress-track"
      role="progressbar"
      :aria-valuenow="progress"
      :aria-valuemin="0"
      :aria-valuemax="target"
      :aria-label="`${progressPct}% completado`"
    >
      <div
        class="progress-fill"
        :style="{ width: `${progressPct}%` }"
      />
    </div>

    <!-- Estimated completion date (not shown in compact mode) -->
    <p v-if="!compact && estimatedDate" class="estimated-date">
      Estimado: {{ estimatedDate }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ChallengeTier } from '@gamechangers/shared';

const props = defineProps<{
  progress: number;
  target: number;
  tier: ChallengeTier;
  compact?: boolean;
}>();

const { t } = useI18n();

const progressPct = computed(() =>
  props.target > 0 ? Math.min(100, Math.round((props.progress / props.target) * 100)) : 0,
);

const tierLabel = computed(() => t(`challenges.tier.${props.tier}`));

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const formattedProgress = computed(() => formatNumber(props.progress));
const formattedTarget = computed(() => formatNumber(props.target));

const estimatedDate = computed(() => {
  if (props.progress <= 0 || props.target <= 0) return null;
  // Simple linear estimate: days remaining = (target - progress) / (progress / daysElapsed)
  // For simplicity, show "en progreso" without a specific date
  return progressPct.value < 100 ? 'en progreso' : null;
});
</script>

<style scoped>
.progress-bar-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar-wrapper.compact {
  gap: 0.25rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-fraction {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.progress-value {
  color: var(--color-accent-xp, #f59e0b);
  font-weight: 700;
}

.progress-sep {
  color: var(--color-text-muted, #9ca3af);
  margin: 0 0.125rem;
}

.progress-target {
  color: var(--color-text-muted, #9ca3af);
}

.tier-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tier-bronce { background: #92400e; color: #fbbf24; }
.tier-plata  { background: #374151; color: #e5e7eb; }
.tier-oro    { background: #78350f; color: #f59e0b; }

.progress-track {
  width: 100%;
  height: 8px;
  background: var(--color-border, #374151);
  border-radius: 9999px;
  overflow: hidden;
}

.compact .progress-track {
  height: 4px;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent-xp, #f59e0b);
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.estimated-date {
  font-size: 0.75rem;
  color: var(--color-text-muted, #9ca3af);
  margin: 0;
}
</style>
