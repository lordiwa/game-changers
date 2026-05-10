<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AppShell from './components/AppShell.vue';

// Routes that render their own full-bleed layout and should NOT be wrapped in AppShell:
// the Boot landing, auth screens, and progressive consent funnel layers.
const NO_SHELL_PREFIXES = ['/auth', '/consent/layer'];

const route = useRoute();
const useShell = computed(() => {
  if (route.path === '/') return false;
  return !NO_SHELL_PREFIXES.some((p) => route.path.startsWith(p));
});
</script>

<template>
  <AppShell v-if="useShell">
    <RouterView />
  </AppShell>
  <RouterView v-else />
</template>
