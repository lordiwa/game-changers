<template>
  <main class="min-h-screen bg-surface-1">
    <!-- Hero section -->
    <section class="px-4 py-10 max-w-4xl mx-auto text-center">
      <h1 class="text-3xl font-bold text-text-primary">
        {{ t('content.hub.heading') }}
      </h1>
      <p class="mt-3 text-text-secondary text-base">
        {{ t('content.hub.subheading') }}
      </p>
    </section>

    <!-- Pillar tabs -->
    <nav class="sticky top-0 z-10 bg-surface-1/90 backdrop-blur border-b border-surface-3 px-4">
      <div class="max-w-4xl mx-auto flex gap-2 overflow-x-auto py-3 scrollbar-none">
        <button
          type="button"
          class="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="activePillar === null
            ? 'bg-accent-xp text-surface-1'
            : 'bg-surface-2 text-text-secondary hover:bg-surface-3'"
          @click="selectPillar(null)"
        >
          Todos
        </button>
        <button
          v-for="pillar in PILLARS"
          :key="pillar"
          type="button"
          class="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
          :class="activePillar === pillar
            ? 'bg-accent-xp text-surface-1'
            : 'bg-surface-2 text-text-secondary hover:bg-surface-3'"
          @click="selectPillar(pillar)"
        >
          {{ t(`content.pillar.${pillar}`) }}
        </button>
      </div>
    </nav>

    <!-- Consent nudge for XP tracking (Layer 1) — non-blocking, soft prompt -->
    <div
      v-if="!hasGamingConsent && user"
      class="max-w-4xl mx-auto px-4 py-3"
    >
      <div class="rounded-lg bg-surface-2 border border-surface-3 px-4 py-3 flex items-center justify-between gap-4">
        <p class="text-sm text-text-secondary">
          {{ t('content.consent.required') }}
        </p>
        <router-link
          to="/consent/layer-1"
          class="shrink-0 text-xs font-medium text-accent-xp hover:underline"
        >
          Activar
        </router-link>
      </div>
    </div>

    <!-- Article grid -->
    <section class="max-w-4xl mx-auto px-4 py-6">
      <div
        v-if="articles.length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <ContentCard
          v-for="article in articles"
          :key="article.id"
          :article="article"
        />
      </div>
      <div
        v-else
        class="py-16 text-center text-text-muted"
      >
        <p>No hay artículos disponibles en este momento.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import { useCurrentUser } from 'vuefire';
import ContentCard from '../../components/ContentCard.vue';
import { useContent } from '../../composables/useContent';
import { useConsent } from '../../composables/useConsent';

const { t } = useI18n();
const user = useCurrentUser();
const { articles, activePillar, filterByPillar } = useContent();
const { hasGranted } = useConsent();

const hasGamingConsent = computed(() => hasGranted('gaming_habits').value);

const PILLARS = ['movimiento', 'mente', 'nutricion', 'comunidad', 'data'] as const;

function selectPillar(pillar: (typeof PILLARS)[number] | null): void {
  filterByPillar(pillar ?? null);
}
</script>
