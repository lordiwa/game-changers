<template>
  <main class="min-h-screen bg-surface-1">
    <section class="max-w-4xl mx-auto px-4 py-8">
      <!-- Back to hub -->
      <router-link
        to="/content"
        class="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary mb-6"
      >
        ← Contenido
      </router-link>

      <h1 class="text-2xl font-bold text-text-primary mb-6">
        {{ t(`content.pillar.${pillar}`) }}
      </h1>

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
      <div v-else class="py-16 text-center text-text-muted">
        <p>No hay artículos en esta categoría aún.</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import ContentCard from '../../components/ContentCard.vue';
import { useContent } from '../../composables/useContent';

const { t } = useI18n();
const route = useRoute();
const { articles, filterByPillar } = useContent();

const pillar = route.params['pillar'] as string;

// Apply pillar filter immediately
filterByPillar(pillar as 'movimiento' | 'mente' | 'nutricion' | 'comunidad' | 'data');

// Re-apply when route changes (e.g. user navigates between pillars)
watch(() => route.params['pillar'], (newPillar) => {
  if (newPillar) {
    filterByPillar(newPillar as 'movimiento' | 'mente' | 'nutricion' | 'comunidad' | 'data');
  }
});
</script>
