<template>
  <div class="challenge-detail">
    <router-link to="/challenges" class="back-link">← {{ t('me.back') }}</router-link>

    <div v-if="!challenge" class="loading" role="status" aria-live="polite">
      <span class="sr-only">Cargando desafío...</span>
    </div>

    <template v-else>
      <div class="challenge-header">
        <span class="tier-badge" :class="`tier-${enrollment?.tier ?? 'bronce'}`">
          {{ t(`challenges.tier.${enrollment?.tier ?? 'bronce'}`) }}
        </span>
        <h1 class="challenge-name">{{ (challenge.name as Record<string, string>)[locale] }}</h1>
        <p class="challenge-desc">{{ (challenge.description as Record<string, string>)[locale] }}</p>
      </div>

      <!-- Enrolled state: show progress -->
      <template v-if="enrollment">
        <ChallengeProgressBar
          :progress="enrollment.progress"
          :target="tierTarget"
          :tier="enrollment.tier"
        />

        <!-- Gaming narrative comparison -->
        <p v-if="narrative" class="narrative">{{ narrative }}</p>

        <!-- Recent progress (last 3 entries, no onSnapshot — one-shot getDoc via VueFire) -->
        <div class="progress-log" aria-label="Registros recientes">
          <!-- Progress log rendered from enrollment aggregate data -->
        </div>

        <button class="cta-btn" @click="showProgressModal = true">
          {{ t('challenges.cta.log') }}
        </button>

        <!-- Progress modal -->
        <ChallengeProgress
          v-if="showProgressModal"
          :challenge-id="route.params.id as string"
          :tier="enrollment.tier"
          @close="showProgressModal = false"
          @submitted="onProgressSubmitted"
        />
      </template>

      <!-- Not enrolled: show enrollment CTA -->
      <template v-else>
        <div class="enroll-panel">
          <p class="enroll-prompt">{{ (challenge.description as Record<string, string>)[locale] }}</p>

          <!-- Tier selector -->
          <div class="tier-selector" role="group" aria-label="Seleccionar nivel">
            <button
              v-for="tier in ['bronce', 'plata', 'oro'] as const"
              :key="tier"
              class="tier-btn"
              :class="{ selected: selectedTier === tier, [`tier-${tier}`]: true }"
              @click="selectedTier = tier"
            >
              {{ t(`challenges.tier.${tier}`) }}
              <span class="tier-target">{{ getTierTarget(tier) }} {{ challenge.unit }}</span>
            </button>
          </div>

          <!-- Leaderboard opt-in -->
          <div class="leaderboard-opts">
            <label class="toggle-label">
              <input v-model="optInLeaderboard" type="checkbox" />
              {{ t('challenges.leaderboard.opt_in_label') }}
            </label>
            <label v-if="optInLeaderboard" class="toggle-label">
              <input v-model="anonymousLeaderboard" type="checkbox" />
              {{ t('challenges.leaderboard.anonymous_label') }}
            </label>
          </div>

          <button
            class="cta-btn"
            :disabled="enrolling"
            @click="enroll"
          >
            {{ enrolling ? 'Inscribiendo...' : t('challenges.cta.accept') }}
          </button>

          <p v-if="enrollError" class="error-msg" role="alert">{{ enrollError }}</p>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useChallenge, useChallengeEnrollment } from '../../composables/useChallenges.js';
import { useChallengeNarrative } from '../../composables/useChallengeNarrative.js';
import ChallengeProgressBar from '../../components/ChallengeProgressBar.vue';
import ChallengeProgress from './ChallengeProgress.vue';
import type { ChallengeTier } from '@gamechangers/shared';

const { t, locale } = useI18n();
const route = useRoute();
const challengeId = route.params.id as string;

const { challenge } = useChallenge(challengeId);
const { enrollment } = useChallengeEnrollment(challengeId);
const { getNarrative } = useChallengeNarrative();

const showProgressModal = ref(false);
const selectedTier = ref<ChallengeTier>('bronce');
const optInLeaderboard = ref(false);
const anonymousLeaderboard = ref(false);
const enrolling = ref(false);
const enrollError = ref<string | null>(null);

const tierTarget = computed(() => {
  if (!challenge.value || !enrollment.value) return 0;
  const tier = enrollment.value.tier;
  const tierData = (challenge.value.tier as Record<string, { target: number }>)[tier];
  return tierData?.target ?? 0;
});

const narrative = computed(() => {
  if (!challenge.value || !enrollment.value) return null;
  return getNarrative({
    metric: challenge.value.metric as 'steps',
    value: enrollment.value.progress,
    cluster: challenge.value.cluster as 'lol' | undefined,
  });
});

function getTierTarget(tier: ChallengeTier): number {
  if (!challenge.value) return 0;
  return (challenge.value.tier as Record<string, { target: number }>)[tier]?.target ?? 0;
}

async function enroll() {
  if (!challenge.value) return;
  enrolling.value = true;
  enrollError.value = null;

  try {
    const functions = getFunctions(undefined, 'southamerica-east1');
    const enrollChallenge = httpsCallable(functions, 'enrollChallenge');
    await enrollChallenge({
      challengeId,
      tier: selectedTier.value,
      optInLeaderboard: optInLeaderboard.value,
      anonymousLeaderboard: anonymousLeaderboard.value,
    });
  } catch (err) {
    enrollError.value = err instanceof Error ? err.message : 'Error al inscribirte';
  } finally {
    enrolling.value = false;
  }
}

function onProgressSubmitted() {
  showProgressModal.value = false;
}
</script>

<style scoped>
.challenge-detail {
  padding: 1.5rem;
  max-width: 48rem;
  margin: 0 auto;
}

.back-link {
  display: inline-block;
  color: var(--color-text-muted, #9ca3af);
  text-decoration: none;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}

.challenge-header {
  margin-bottom: 1.5rem;
}

.challenge-name {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.challenge-desc {
  color: var(--color-text-muted, #9ca3af);
}

.tier-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tier-bronce { background: #92400e; color: #fbbf24; }
.tier-plata { background: #374151; color: #e5e7eb; }
.tier-oro { background: #78350f; color: #f59e0b; }

.narrative {
  font-style: italic;
  color: var(--color-accent-xp, #f59e0b);
  margin: 1rem 0;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--color-accent-xp, #f59e0b);
  background: rgba(245, 158, 11, 0.05);
  border-radius: 0 0.25rem 0.25rem 0;
}

.enroll-panel {
  background: var(--color-surface-2, #1f2937);
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.enroll-prompt {
  margin-bottom: 1.5rem;
  color: var(--color-text-muted, #9ca3af);
}

.tier-selector {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tier-btn {
  flex: 1;
  min-width: 80px;
  padding: 0.75rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  transition: border-color 0.15s;
}

.tier-btn.selected {
  border-color: var(--color-accent-xp, #f59e0b);
}

.tier-target {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--color-text-muted, #9ca3af);
}

.leaderboard-opts {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.cta-btn {
  width: 100%;
  padding: 0.875rem;
  background: var(--color-accent-xp, #f59e0b);
  color: #000;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: opacity 0.15s;
}

.cta-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-msg {
  color: #ef4444;
  margin-top: 0.75rem;
  font-size: 0.875rem;
}
</style>
