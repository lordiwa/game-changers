<script setup lang="ts">
/**
 * XpBar.vue — XP progress bar component.
 *
 * UI-SPEC §13:
 *   small variant: 4px tall, label below — for AppShell header.
 *   large variant: 12px tall, JetBrains Mono numerals — for CharacterSheet.
 *
 * Props:
 *   xp:            current total XP
 *   xpForLevel:    XP needed to go from current level to next
 *   xpInLevel:     XP accumulated within current level
 *   level:         current level number
 *   variant:       'small' | 'large' (default 'small')
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    xp: number;
    xpForNextLevel: number;
    xpInCurrentLevel: number;
    level: number;
    variant?: 'small' | 'large';
  }>(),
  { variant: 'small' },
);

const progressPercent = computed(() => {
  if (props.xpForNextLevel <= 0) return 100;
  return Math.min(100, Math.floor((props.xpInCurrentLevel / props.xpForNextLevel) * 100));
});
</script>

<template>
  <div
    class="xp-bar"
    :class="[`xp-bar--${variant}`]"
    role="progressbar"
    :aria-valuenow="xpInCurrentLevel"
    :aria-valuemax="xpForNextLevel"
    :aria-label="`XP: ${xpInCurrentLevel} de ${xpForNextLevel} para nivel ${level + 1}`"
  >
    <!-- Track -->
    <div class="xp-bar__track" :class="variant === 'large' ? 'h-3' : 'h-1'">
      <div
        class="xp-bar__fill bg-accent-xp rounded-full transition-all duration-500"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>

    <!-- Label (large variant only) -->
    <div v-if="variant === 'large'" class="xp-bar__label font-mono tabular-nums text-xs text-text-secondary mt-1">
      {{ xpInCurrentLevel.toLocaleString('es-EC') }} / {{ xpForNextLevel.toLocaleString('es-EC') }} XP
    </div>
  </div>
</template>

<style scoped>
.xp-bar__track {
  background-color: var(--color-surface-3, #2a2a3a);
  border-radius: 9999px;
  overflow: hidden;
  width: 100%;
}

.xp-bar__fill {
  height: 100%;
  min-width: 2px; /* Always show a sliver so the bar is visible */
}
</style>
