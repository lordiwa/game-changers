<script setup lang="ts">
/**
 * Badge.vue — Individual badge display.
 *
 * UI-SPEC §12:
 *   - 64x64 image (or initials fallback for not-yet-earned)
 *   - label + tier indicator (Bronce muted-amber, Plata silver, Oro reward-amber)
 *   - Locked state: grays image + lock icon
 */

const props = withDefaults(
  defineProps<{
    badgeId: string;
    label: string;
    imageUrl?: string;
    tier?: 'bronce' | 'plata' | 'oro';
    earned?: boolean;
  }>(),
  { earned: false },
);

const tierColorClass = {
  bronce: 'badge__tier--bronce',
  plata: 'badge__tier--plata',
  oro: 'badge__tier--oro',
};

function initials(id: string): string {
  return id.slice(0, 2).toUpperCase();
}
</script>

<template>
  <div
    class="badge flex flex-col items-center gap-1"
    :class="{ 'badge--locked': !earned }"
    :data-badge-id="badgeId"
    :data-earned="earned"
  >
    <!-- Image or placeholder -->
    <div
      class="badge__image relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center"
      :class="earned ? 'badge__image--earned' : 'badge__image--locked'"
    >
      <img
        v-if="imageUrl && earned"
        :src="imageUrl"
        :alt="label"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <span
        v-else
        class="badge__initials font-mono font-bold text-xl"
        :class="earned ? 'text-text-primary' : 'text-text-secondary'"
        aria-hidden="true"
      >
        {{ initials(badgeId) }}
      </span>

      <!-- Lock icon for locked badges -->
      <span
        v-if="!earned"
        class="badge__lock absolute inset-0 flex items-center justify-center text-2xl"
        aria-hidden="true"
      >🔒</span>
    </div>

    <!-- Label -->
    <span
      class="badge__label text-xs text-center max-w-[72px] leading-tight"
      :class="earned ? 'text-text-primary' : 'text-text-secondary'"
    >
      {{ label }}
    </span>

    <!-- Tier indicator -->
    <span
      v-if="tier && earned"
      class="badge__tier text-xs font-medium px-1.5 py-0.5 rounded"
      :class="tier ? tierColorClass[tier] : ''"
    >
      {{ tier.charAt(0).toUpperCase() + tier.slice(1) }}
    </span>
  </div>
</template>

<style scoped>
.badge__image--earned {
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-accent-xp, #f59e0b);
}

.badge__image--locked {
  background-color: var(--color-surface-3, #2a2a3a);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  filter: grayscale(1) opacity(0.5);
}

.badge__tier--bronce {
  background-color: #92400e33;
  color: #b45309;
}

.badge__tier--plata {
  background-color: #71717a33;
  color: #a1a1aa;
}

.badge__tier--oro {
  background-color: #92400e55;
  color: #f59e0b;
}
</style>
