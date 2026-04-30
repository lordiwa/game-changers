<template>
  <article
    class="group bg-surface-2 rounded-xl overflow-hidden cursor-pointer hover:bg-surface-3 transition-colors"
    @click="navigateToArticle"
  >
    <!-- Cover image (optional) -->
    <div v-if="article.coverImage" class="aspect-video overflow-hidden">
      <img
        :src="article.coverImage"
        :alt="localTitle"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    </div>
    <!-- Placeholder cover when no image -->
    <div
      v-else
      class="aspect-video flex items-center justify-center"
      :class="pillarBgClass"
    >
      <span class="text-4xl" :aria-hidden="true">{{ pillarEmoji }}</span>
    </div>

    <div class="p-4 space-y-3">
      <!-- Pillar badge + content type -->
      <div class="flex items-center gap-2 flex-wrap">
        <span
          data-pillar
          :data-pillar="article.pillar"
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          :class="pillarBadgeClass"
        >
          {{ t(`content.pillar.${article.pillar}`) }}
        </span>
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-surface-3 text-text-muted">
          {{ contentTypeLabel }}
        </span>
      </div>

      <!-- Title (locale-aware) -->
      <h3 class="text-base font-semibold text-text-primary leading-snug line-clamp-2">
        {{ localTitle }}
      </h3>

      <!-- Est read time + game cluster tags -->
      <div class="flex items-center justify-between text-xs text-text-muted">
        <span>{{ article.estReadMinutes }} min</span>
        <div class="flex gap-1 flex-wrap justify-end">
          <span
            v-for="cluster in article.gameClusters.slice(0, 2)"
            :key="cluster"
            class="px-1.5 py-0.5 bg-surface-1 rounded text-[10px]"
          >{{ cluster }}</span>
        </div>
      </div>

      <!-- CTA -->
      <button
        type="button"
        class="w-full mt-1 py-2 text-sm font-medium rounded-lg text-accent-xp border border-accent-xp/30 hover:bg-accent-xp/10 transition-colors"
        :aria-label="`${ctaLabel}: ${localTitle}`"
      >
        {{ ctaLabel }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import type { ContentArticle } from '@gamechangers/shared';

const props = defineProps<{
  article: ContentArticle;
}>();

const { t, locale } = useI18n();
const router = useRouter();

const localTitle = computed(() =>
  locale.value === 'en' ? props.article.title.en : props.article.title.es,
);

const localSlug = computed(() =>
  locale.value === 'en' ? props.article.slug.en : props.article.slug.es,
);

const ctaLabel = computed(() => {
  switch (props.article.contentType) {
    case 'video': return t('content.cta.watch');
    case 'quiz': return t('content.cta.quiz');
    default: return t('content.cta.read');
  }
});

const contentTypeLabel = computed(() => {
  switch (props.article.contentType) {
    case 'video': return 'Video';
    case 'quiz': return 'Test';
    default: return 'Artículo';
  }
});

// Pillar color mapping per UI-SPEC:
// movimiento → accent-xp (green)
// mente → info-blue
// nutricion → reward-amber
// comunidad → surface-3
// data → text-muted
const PILLAR_BADGE_CLASSES: Record<string, string> = {
  movimiento: 'bg-accent-xp/20 text-accent-xp',
  mente: 'bg-blue-500/20 text-blue-400',
  nutricion: 'bg-amber-500/20 text-amber-400',
  comunidad: 'bg-surface-3 text-text-secondary',
  data: 'bg-surface-2 text-text-muted',
};

const PILLAR_BG_CLASSES: Record<string, string> = {
  movimiento: 'bg-accent-xp/10',
  mente: 'bg-blue-500/10',
  nutricion: 'bg-amber-500/10',
  comunidad: 'bg-surface-3/50',
  data: 'bg-surface-2',
};

const PILLAR_EMOJIS: Record<string, string> = {
  movimiento: '🏃',
  mente: '🧠',
  nutricion: '🥗',
  comunidad: '🤝',
  data: '📊',
};

const pillarBadgeClass = computed(() => PILLAR_BADGE_CLASSES[props.article.pillar] ?? '');
const pillarBgClass = computed(() => PILLAR_BG_CLASSES[props.article.pillar] ?? '');
const pillarEmoji = computed(() => PILLAR_EMOJIS[props.article.pillar] ?? '');

function navigateToArticle(): void {
  router.push(`/content/article/${localSlug.value}`);
}
</script>
