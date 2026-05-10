<script setup lang="ts">
/**
 * Me.vue — Default landing view after Layer 0 consent at /me.
 *
 * Renders: greeting + compact stats grid + recent badges + CTAs.
 * Uses profile store (one getDoc on mount, NOT onSnapshot — ESLint rule).
 */
import { computed, onMounted } from 'vue';
import { useCurrentUser } from 'vuefire';
import { useI18n } from 'vue-i18n';
import { useProfileStore } from '../../stores/profile';
import { useXp } from '../../composables/useXp';
import Avatar from '../../components/Avatar.vue';
import XpBar from '../../components/XpBar.vue';
import StatRow from '../../components/StatRow.vue';

const { t } = useI18n();
const currentUser = useCurrentUser();
const profileStore = useProfileStore();

onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (uid && !profileStore.profile) {
    await profileStore.fetchProfile(uid);
  }
});

const profile = computed(() => profileStore.profile);
const displayName = computed(() => profile.value?.displayName || 'GG');
const stats = computed(() => profile.value?.stats ?? { hp: 1, stamina: 1, mente: 1, social: 1 });
const { level, xpForNextLevel, xpInCurrentLevel } = useXp(profile);
</script>

<template>
  <div class="me-view p-4">
      <!-- Greeting -->
      <div class="me-view__greeting mb-4 flex items-center gap-3">
        <Avatar :display-name="displayName" size="md" />
        <div>
          <h1 class="text-xl font-bold text-text-primary">
            {{ t('me.greeting', { displayName }) }}
          </h1>
          <div class="text-sm text-text-secondary">Nivel {{ level }}</div>
        </div>
      </div>

      <!-- Compact XP bar -->
      <div class="mb-4">
        <XpBar
          :xp="profile?.xp ?? 0"
          :xp-for-next-level="xpForNextLevel"
          :xp-in-current-level="xpInCurrentLevel"
          :level="level"
          variant="small"
        />
      </div>

      <!-- Stats grid (2x2 mobile, 1x4 desktop) -->
      <section class="me-view__stats mb-4" aria-label="Estadísticas">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div class="stat-card">
            <StatRow stat-key="hp" :value="stats.hp" :label="t('stats.hp')" />
          </div>
          <div class="stat-card">
            <StatRow stat-key="stamina" :value="stats.stamina" :label="t('stats.stamina')" />
          </div>
          <div class="stat-card">
            <StatRow stat-key="mente" :value="stats.mente" :label="t('stats.mente')" />
          </div>
          <div class="stat-card">
            <StatRow stat-key="social" :value="stats.social" :label="t('stats.social')" />
          </div>
        </div>
      </section>

      <!-- Character sheet CTA -->
      <RouterLink to="/me/character" class="me-view__cta-link block mb-6">
        {{ t('me.character.cta') }} →
      </RouterLink>

      <!-- Quick CTAs -->
      <div class="me-view__quick-ctas flex gap-3">
        <RouterLink to="/events" class="quick-cta-btn">
          {{ t('events.detail.cta_rsvp') }}
        </RouterLink>
        <RouterLink to="/challenges" class="quick-cta-btn quick-cta-btn--secondary">
          {{ t('challenges.cta.accept') }}
        </RouterLink>
      </div>
    </div>
</template>

<style scoped>
.me-view {
  max-width: 600px;
  margin: 0 auto;
}

.stat-card {
  background-color: var(--color-surface-2, #1e1e2e);
  border-radius: 0.5rem;
  padding: 0.5rem;
}

.me-view__cta-link {
  color: var(--color-accent-xp, #f59e0b);
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
}

.me-view__cta-link:hover {
  text-decoration: underline;
}

.quick-cta-btn {
  flex: 1;
  text-align: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--color-accent-xp, #f59e0b);
  color: var(--color-surface-1, #12121f);
  font-weight: 700;
  text-decoration: none;
  font-size: 0.875rem;
}

.quick-cta-btn--secondary {
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-accent-xp, #f59e0b);
  color: var(--color-accent-xp, #f59e0b);
}
</style>
