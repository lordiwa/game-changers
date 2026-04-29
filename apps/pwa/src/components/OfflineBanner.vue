<script setup lang="ts">
/**
 * OfflineBanner.vue — Sticky-top banner shown when the user is offline.
 *
 * UI-SPEC §20: wraps useOnline() from @vueuse/core.
 * Hidden when online. Copy: 'offline.banner' i18n key.
 * ESLint: no onSnapshot — uses @vueuse/core reactive ref.
 */
import { useOnline } from '@vueuse/core';
import { useI18n } from 'vue-i18n';

const isOnline = useOnline();
const { t } = useI18n();
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="!isOnline"
      class="offline-banner"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true">📡</span>
      {{ t('offline.banner') }}
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: var(--color-surface-3, #2a2a3a);
  border-bottom: 2px solid #ff6b7a;
  color: var(--color-text-primary, #e8e8f0);
  text-align: center;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
