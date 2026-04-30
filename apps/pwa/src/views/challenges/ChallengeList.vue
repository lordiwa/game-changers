<template>
  <div class="challenge-list">
    <h1 class="heading">{{ t('challenges.list.heading') }}</h1>

    <!-- Loading state -->
    <div v-if="challenges.pending.value" class="loading" role="status" aria-live="polite">
      <span class="sr-only">Cargando desafíos...</span>
    </div>

    <!-- Empty state (Pitfall #9: clear call-to-action without device requirement) -->
    <div v-else-if="!challengeList.length" class="empty-state">
      <h2>{{ t('challenges.empty.heading') }}</h2>
      <p>{{ t('challenges.empty.body') }}</p>
      <router-link to="/challenges" class="cta-btn">{{ t('challenges.empty.cta') }}</router-link>
    </div>

    <!-- Challenge grid -->
    <div v-else class="challenge-grid" role="list">
      <ChallengeCard
        v-for="challenge in challengeList"
        :key="challenge.id"
        :challenge="challenge"
        :enrollment="enrollmentMap[challenge.id]"
        role="listitem"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useChallenges, useUserEnrollments } from '../../composables/useChallenges.js';
import ChallengeCard from '../../components/ChallengeCard.vue';
import type { Challenge, ChallengeEnrollment } from '@gamechangers/shared';

const { t } = useI18n();
const challenges = useChallenges();
const { enrollments } = useUserEnrollments();

const challengeList = computed(() => (challenges.challenges.value ?? []) as Challenge[]);

const enrollmentMap = computed(() => {
  const map: Record<string, ChallengeEnrollment> = {};
  for (const e of (enrollments?.value ?? []) as ChallengeEnrollment[]) {
    map[e.challengeId] = e;
  }
  return map;
});
</script>

<style scoped>
.challenge-list {
  padding: 1.5rem;
  max-width: 64rem;
  margin: 0 auto;
}

.heading {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.loading {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
}

.empty-state h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.empty-state p {
  color: var(--color-text-muted, #9ca3af);
  margin-bottom: 1.5rem;
}

.cta-btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: var(--color-accent-xp, #f59e0b);
  color: #000;
  border-radius: 0.5rem;
  font-weight: 600;
  text-decoration: none;
}

.challenge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}
</style>
