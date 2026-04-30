<template>
  <div
    class="challenge-card"
    :class="{
      enrolled: variant === 'enrolled',
      completed: variant === 'completed',
    }"
  >
    <!-- Tier indicator (UI-SPEC §16 color tokens) -->
    <div class="tier-row">
      <span class="tier-badge" :class="`tier-${displayTier}`" :aria-label="`Nivel ${displayTier}`">
        {{ t(`challenges.tier.${displayTier}`) }}
      </span>
      <span class="type-icon" :aria-label="challenge.type">{{ typeIcon }}</span>
    </div>

    <!-- Challenge name (locale-aware) -->
    <h3 class="card-name">{{ (challenge.name as Record<string, string>)[locale] }}</h3>

    <!-- Target + unit -->
    <p class="card-meta">
      Meta: <strong>{{ displayTarget }} {{ challenge.unit }}</strong>
    </p>

    <!-- Progress bar (enrolled variant) -->
    <ChallengeProgressBar
      v-if="variant === 'enrolled' && enrollment"
      :progress="enrollment.progress"
      :target="displayTarget"
      :tier="enrollment.tier"
      compact
    />

    <!-- Badge earned (completed variant) -->
    <div v-if="variant === 'completed'" class="completed-badge">
      ✓ Completado
    </div>

    <!-- CTA -->
    <router-link
      :to="`/challenges/${challenge.id}`"
      class="card-cta"
      :aria-label="`${t('challenges.cta.accept')} — ${(challenge.name as Record<string, string>)[locale]}`"
    >
      {{ variant === 'enrolled' ? t('challenges.cta.log') : t('challenges.cta.accept') }}
    </router-link>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ChallengeProgressBar from './ChallengeProgressBar.vue';
import type { Challenge, ChallengeEnrollment, ChallengeTier } from '@gamechangers/shared';

const props = defineProps<{
  challenge: Challenge;
  enrollment?: ChallengeEnrollment | null;
}>();

const { t, locale } = useI18n();

const variant = computed(() => {
  if (!props.enrollment) return 'available';
  if (props.enrollment.completedAt) return 'completed';
  return 'enrolled';
});

const displayTier = computed((): ChallengeTier => {
  return (props.enrollment?.tier as ChallengeTier) ?? 'bronce';
});

const displayTarget = computed(() => {
  const tier = displayTier.value;
  return (props.challenge.tier as Record<string, { target: number }>)[tier]?.target ?? 0;
});

// Type icon mapping — gaming-friendly emoji
const TYPE_ICONS: Record<string, string> = {
  movement: '🏃',
  streak: '🔥',
  social: '🤝',
  mental: '🧠',
  hybrid: '⚡',
};

const typeIcon = computed(() => TYPE_ICONS[props.challenge.type] ?? '🎮');
</script>

<style scoped>
.challenge-card {
  background: var(--color-surface-2, #1f2937);
  border-radius: 0.75rem;
  padding: 1.25rem;
  border: 1px solid var(--color-border, #374151);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: border-color 0.15s;
}

.challenge-card:hover {
  border-color: var(--color-accent-xp, #f59e0b);
}

.challenge-card.enrolled {
  border-color: rgba(245, 158, 11, 0.4);
}

.challenge-card.completed {
  border-color: rgba(16, 185, 129, 0.4);
  opacity: 0.8;
}

.tier-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.tier-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Tier color tokens per UI-SPEC §16 */
.tier-bronce { background: #92400e; color: #fbbf24; }
.tier-plata  { background: #374151; color: #e5e7eb; }
.tier-oro    { background: #78350f; color: #f59e0b; }

.type-icon {
  font-size: 1.25rem;
}

.card-name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0;
}

.card-meta {
  font-size: 0.8rem;
  color: var(--color-text-muted, #9ca3af);
  margin: 0;
}

.completed-badge {
  color: #10b981;
  font-weight: 600;
  font-size: 0.875rem;
}

.card-cta {
  display: inline-block;
  padding: 0.625rem 1rem;
  background: var(--color-accent-xp, #f59e0b);
  color: #000;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  text-decoration: none;
  text-align: center;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
}

.card-cta:hover {
  opacity: 0.85;
}
</style>
