<script setup lang="ts">
/**
 * ThemeSwitch.vue — Dark/light theme toggle.
 *
 * UI-SPEC §23: writes to /users/{uid}/profile/main.theme.
 * Applies via data-theme attribute on <html>.
 * NOT browser-detected — explicit user choice only.
 *
 * ESLint: no onSnapshot.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTheme } from '../composables/useTheme';

const { t } = useI18n();
const { theme, toggle } = useTheme();
</script>

<template>
  <div class="theme-switch flex items-center gap-2">
    <span class="theme-switch__label text-sm text-text-secondary">
      {{ theme === 'dark' ? t('theme.toggle.dark') : t('theme.toggle.light') }}
    </span>
    <button
      class="theme-switch__btn"
      :aria-label="theme === 'dark' ? t('theme.toggle.dark') : t('theme.toggle.light')"
      :aria-pressed="theme === 'dark'"
      role="switch"
      @click="toggle"
    >
      <span aria-hidden="true">{{ theme === 'dark' ? '🌙' : '☀️' }}</span>
    </button>
  </div>
</template>

<style scoped>
.theme-switch__btn {
  background: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-surface-3, #2a2a3a);
  border-radius: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-switch__btn:hover {
  border-color: var(--color-accent-xp, #f59e0b);
}
</style>
