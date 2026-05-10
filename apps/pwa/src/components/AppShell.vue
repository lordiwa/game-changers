<script setup lang="ts">
/**
 * AppShell.vue — Authenticated app layout wrapper.
 *
 * UI-SPEC §1 Layout:
 *   Mobile (<768px):  sticky 56px header (wordmark + level pill) + scrollable body + 64px bottom-tab nav
 *   Desktop (≥768px): 240px sticky left rail (avatar + level + XP bar + nav) + main content area
 *
 * CrisisHelpButton is ALWAYS visible.
 * OfflineBanner is sticky-top when offline.
 *
 * ESLint: no onSnapshot — uses one-shot profile store.
 */
import { onMounted, computed } from 'vue';
import { useMediaQuery } from '@vueuse/core';
import { useRoute } from 'vue-router';
import { useCurrentUser } from 'vuefire';
import { useI18n } from 'vue-i18n';
import { useProfileStore } from '../stores/profile';
import { useXp } from '../composables/useXp';
import CrisisHelpButton from './CrisisHelpButton.vue';
import OfflineBanner from './OfflineBanner.vue';
import Avatar from './Avatar.vue';
import XpBar from './XpBar.vue';

const { t } = useI18n();
const route = useRoute();
const currentUser = useCurrentUser();
const profileStore = useProfileStore();
const isDesktop = useMediaQuery('(min-width: 768px)');

// One-shot profile load on mount
onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (uid && !profileStore.profile) {
    await profileStore.fetchProfile(uid);
  }
});

const profile = computed(() => profileStore.profile);
const { level, xpForNextLevel, xpInCurrentLevel } = useXp(profile);

// Bottom-tab navigation items
const navItems = [
  { to: '/me', icon: '🏠', labelKey: 'app.nav.home' },
  { to: '/events', icon: '🎮', labelKey: 'app.nav.events' },
  { to: '/challenges', icon: '⚔️', labelKey: 'app.nav.challenges' },
  { to: '/me/profile', icon: '👤', labelKey: 'app.nav.me' },
];

// Custom active matcher: /me must match EXACTLY (otherwise /me/profile would
// also activate Inicio). All other tabs match path prefix so /events/{id}
// keeps the Eventos tab highlighted.
function isNavActive(target: string): boolean {
  const path = route.path;
  if (target === '/me') return path === '/me';
  return path === target || path.startsWith(target + '/');
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--desktop': isDesktop, 'app-shell--mobile': !isDesktop }">
    <!-- Offline banner (sticky top) -->
    <OfflineBanner />

    <!-- MOBILE LAYOUT -->
    <template v-if="!isDesktop">
      <!-- Mobile header: wordmark + level pill -->
      <header class="app-shell__mobile-header">
        <span class="app-shell__wordmark font-bold text-accent-xp">GameChangers</span>
        <span class="app-shell__level-pill">Lv {{ level }}</span>
      </header>

      <!-- Scrollable body -->
      <main class="app-shell__body app-shell__body--mobile">
        <slot />
      </main>

      <!-- Bottom tab nav (64px) -->
      <nav class="app-shell__bottom-nav" aria-label="Navegación principal">
        <RouterLink
          v-for="item in navItems"
          :key="item.to + item.labelKey"
          :to="item.to"
          class="app-shell__tab"
          :class="{ 'app-shell__tab--active': isNavActive(item.to) }"
          active-class=""
        >
          <span class="app-shell__tab-icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="app-shell__tab-label">{{ t(item.labelKey) }}</span>
        </RouterLink>
      </nav>

      <!-- Crisis button: fixed bottom-right (above bottom nav) -->
      <div class="app-shell__crisis-mobile">
        <CrisisHelpButton />
      </div>
    </template>

    <!-- DESKTOP LAYOUT -->
    <template v-else>
      <div class="app-shell__desktop-wrapper">
        <!-- Left rail (240px) -->
        <aside class="app-shell__left-rail" aria-label="Panel lateral">
          <!-- Avatar + level + XP bar at top -->
          <div class="app-shell__rail-profile">
            <Avatar
              :image-url="profile?.avatar"
              :display-name="profile?.displayName"
              size="lg"
            />
            <div class="app-shell__rail-level mt-2 text-sm text-text-secondary">
              Nivel <strong class="text-text-primary">{{ level }}</strong>
            </div>
            <div class="w-full mt-1">
              <XpBar
                :xp="profile?.xp ?? 0"
                :xp-for-next-level="xpForNextLevel"
                :xp-in-current-level="xpInCurrentLevel"
                :level="level"
                variant="small"
              />
            </div>
          </div>

          <!-- Navigation items -->
          <nav class="app-shell__rail-nav" aria-label="Navegación principal">
            <RouterLink
              v-for="item in navItems"
              :key="item.to + item.labelKey"
              :to="item.to"
              class="app-shell__rail-item"
              :class="{ 'app-shell__rail-item--active': isNavActive(item.to) }"
              active-class=""
            >
              <span aria-hidden="true">{{ item.icon }}</span>
              <span>{{ t(item.labelKey) }}</span>
            </RouterLink>
          </nav>

          <!-- Crisis button at bottom of rail -->
          <div class="app-shell__crisis-desktop mt-auto pt-4">
            <CrisisHelpButton />
          </div>
        </aside>

        <!-- Main content area -->
        <main class="app-shell__main">
          <slot />
        </main>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* ── Shared ─────────────────────────────────────────────────────────────────── */
.app-shell {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface-1, #12121f);
  color: var(--color-text-primary, #e8e8f0);
}

/* ── Mobile ─────────────────────────────────────────────────────────────────── */
.app-shell__mobile-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  background-color: var(--color-surface-1, #12121f);
  border-bottom: 1px solid var(--color-surface-3, #2a2a3a);
}

.app-shell__wordmark {
  font-size: 1.125rem;
  color: var(--color-accent-xp, #f59e0b);
}

.app-shell__level-pill {
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-accent-xp, #f59e0b);
  color: var(--color-accent-xp, #f59e0b);
  border-radius: 9999px;
  padding: 0.2rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  font-family: var(--font-mono, monospace);
}

.app-shell__body--mobile {
  flex: 1;
  overflow-y: auto;
  padding-bottom: calc(64px + 80px); /* bottom-nav + crisis btn */
}

.app-shell__bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  z-index: 50;
  display: flex;
  align-items: stretch;
  background-color: var(--color-surface-2, #1e1e2e);
  border-top: 1px solid var(--color-surface-3, #2a2a3a);
}

.app-shell__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  text-decoration: none;
  color: var(--color-text-secondary, #a0a0b0);
  font-size: 0.65rem;
  transition: color 0.15s;
}

.app-shell__tab--active,
.app-shell__tab:hover {
  color: var(--color-accent-xp, #f59e0b);
}

.app-shell__tab-icon {
  font-size: 1.25rem;
}

.app-shell__crisis-mobile {
  position: fixed;
  bottom: calc(64px + 0.75rem); /* above bottom nav */
  right: 1rem;
  z-index: 60;
}

/* ── Desktop ─────────────────────────────────────────────────────────────────── */
.app-shell__desktop-wrapper {
  display: flex;
  flex: 1;
  min-height: 100dvh;
}

.app-shell__left-rail {
  width: 240px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  background-color: var(--color-surface-2, #1e1e2e);
  border-right: 1px solid var(--color-surface-3, #2a2a3a);
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
}

.app-shell__rail-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-surface-3, #2a2a3a);
  margin-bottom: 1rem;
}

.app-shell__rail-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.app-shell__rail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  text-decoration: none;
  color: var(--color-text-secondary, #a0a0b0);
  font-size: 0.9rem;
  transition: background 0.15s, color 0.15s;
}

.app-shell__rail-item:hover {
  background: var(--color-surface-3, #2a2a3a);
  color: var(--color-text-primary, #e8e8f0);
}

.app-shell__rail-item--active {
  background: var(--color-surface-3, #2a2a3a);
  color: var(--color-accent-xp, #f59e0b);
  font-weight: 600;
}

.app-shell__main {
  flex: 1;
  overflow-y: auto;
  max-width: 1024px;
  margin: 0 auto;
  padding: 1.5rem;
}
</style>
