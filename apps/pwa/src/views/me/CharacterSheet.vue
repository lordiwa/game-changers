<script setup lang="ts">
/**
 * CharacterSheet.vue — Full character sheet view at /me/character.
 *
 * CRITICAL (Pitfall #9 + PROF-12):
 *   Renders HP/Stamina/Mente/Social bars in FULL COLOR for ALL authenticated users.
 *   Wearable connection is NOT required to show color.
 *   Missing data = value=1 (minimum per recomputeStats), NEVER grayed-out.
 *
 * If user has NOT granted health_self_reports consent:
 *   Shows a banner at top: 'Conecta más datos para ver el detalle de tu salud'
 *   The 4 stat bars are STILL VISIBLE with full color.
 *
 * Uses one-shot profile store (NOT onSnapshot — ESLint enforced).
 */
import { computed, onMounted } from 'vue';
import { useCurrentUser } from 'vuefire';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useProfileStore } from '../../stores/profile';
import { useConsent } from '../../composables/useConsent';
import { useXp } from '../../composables/useXp';
import StatRow from '../../components/StatRow.vue';
import XpBar from '../../components/XpBar.vue';
import Badge from '../../components/Badge.vue';

const { t } = useI18n();
const currentUser = useCurrentUser();
const profileStore = useProfileStore();
const { hasGranted } = useConsent();

onMounted(async () => {
  const uid = currentUser.value?.uid;
  if (uid && !profileStore.profile) {
    await profileStore.fetchProfile(uid);
  }
});

const profile = computed(() => profileStore.profile);
const stats = computed(() => profile.value?.stats ?? { hp: 1, stamina: 1, mente: 1, social: 1 });
const { level, xpForNextLevel, xpInCurrentLevel, tier } = useXp(profile);

// Banner: shown when health_self_reports consent not granted
const hasHealthConsent = hasGranted('health_self_reports');
</script>

<template>
  <div class="character-sheet p-4">
    <!-- Level + tier header -->
    <div class="character-sheet__header mb-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xs text-text-secondary uppercase tracking-wider">{{ tier }}</div>
          <h1 class="text-2xl font-bold text-text-primary">{{ t('me.character.title', { level }) }}</h1>
        </div>
        <span class="text-4xl" aria-hidden="true">🧑‍🎮</span>
      </div>

      <!-- XP bar (large variant) -->
      <div class="mt-3">
        <XpBar
          :xp="profile?.xp ?? 0"
          :xp-for-next-level="xpForNextLevel"
          :xp-in-current-level="xpInCurrentLevel"
          :level="level"
          variant="large"
        />
      </div>
    </div>

    <!-- Connect-more-data banner (shown when health_self_reports not granted) -->
    <!-- CRITICAL: Banner does NOT hide the stat bars — bars always show color -->
    <div
      v-if="!hasHealthConsent"
      class="character-sheet__banner mb-4"
      role="status"
      data-testid="connect-more-banner"
    >
      <span aria-hidden="true">📊</span>
      <span>{{ t('me.character.banner.connect_more') }}</span>
      <RouterLink to="/consent/layer-2" class="character-sheet__banner-link">
        Conectar
      </RouterLink>
    </div>

    <!-- 4 Stat rows — ALWAYS full color regardless of wearable or consent state -->
    <!-- Per Pitfall #9 + PROF-12: these bars NEVER gray out -->
    <div class="character-sheet__stats" data-testid="stat-rows">
      <StatRow
        stat-key="hp"
        :value="stats.hp"
        :label="t('stats.hp')"
        data-testid="stat-hp"
      />
      <StatRow
        stat-key="stamina"
        :value="stats.stamina"
        :label="t('stats.stamina')"
        data-testid="stat-stamina"
      />
      <StatRow
        stat-key="mente"
        :value="stats.mente"
        :label="t('stats.mente')"
        data-testid="stat-mente"
      />
      <StatRow
        stat-key="social"
        :value="stats.social"
        :label="t('stats.social')"
        data-testid="stat-social"
      />
    </div>

    <!-- CTA link back to me -->
    <div class="mt-6 text-center">
      <RouterLink to="/me" class="text-sm text-accent-xp underline">
        ← {{ t('me.back') }}
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.character-sheet {
  max-width: 600px;
  margin: 0 auto;
}

.character-sheet__banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--color-surface-2, #1e1e2e);
  border: 1px solid var(--color-accent-xp, #f59e0b);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #a0a0b0);
}

.character-sheet__banner-link {
  margin-left: auto;
  color: var(--color-accent-xp, #f59e0b);
  text-decoration: underline;
  font-size: 0.8rem;
}

.character-sheet__stats {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background-color: var(--color-surface-2, #1e1e2e);
  border-radius: 0.75rem;
  padding: 0.75rem;
}
</style>
