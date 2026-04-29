<script setup lang="ts">
/**
 * InstallNudge.vue — Soft PWA install prompt.
 *
 * Per D-13: ONLY in profile menu. NEVER as popup/banner.
 * SUPPRESSED on iOS Safari (detected via iPhone|iPad|iPod + NOT CriOS|FxiOS).
 *
 * Only renders when the browser fires beforeinstallprompt (Chrome/Edge/Firefox Android).
 */
import { useInstallPrompt } from '../composables/useInstallPrompt';
import { useI18n } from 'vue-i18n';

const { canInstall, prompt } = useInstallPrompt();
const { t } = useI18n();
</script>

<template>
  <div v-if="canInstall" class="install-nudge">
    <button class="install-nudge__btn" @click="prompt">
      <span aria-hidden="true">📱</span>
      {{ t('install.cta') }}
    </button>
  </div>
</template>

<style scoped>
.install-nudge {
  padding: 0.75rem 0;
}

.install-nudge__btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-accent-xp, #f59e0b);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: var(--color-text-primary, #e8e8f0);
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.install-nudge__btn:hover {
  background: var(--color-surface-3, #2a2a3a);
}
</style>
