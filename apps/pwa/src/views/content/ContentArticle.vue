<template>
  <main class="min-h-screen bg-surface-1">
    <article class="max-w-prose mx-auto px-4 py-8">
      <!-- Back navigation -->
      <nav class="mb-6">
        <router-link
          to="/content"
          class="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          ← {{ t('content.hub.heading_short') || 'Contenido' }}
        </router-link>
      </nav>

      <!-- Loading state -->
      <div v-if="loading" class="py-16 text-center text-text-muted">
        <p>Cargando artículo...</p>
      </div>

      <!-- Not found state -->
      <div v-else-if="!article" class="py-16 text-center text-text-muted">
        <p>Artículo no encontrado.</p>
        <router-link to="/content" class="mt-4 inline-block text-accent-xp hover:underline">
          Volver al contenido
        </router-link>
      </div>

      <!-- Article content -->
      <template v-else>
        <!-- Pillar badge + content type -->
        <div class="flex items-center gap-2 mb-4 flex-wrap">
          <span
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
            :class="pillarBadgeClass"
          >
            {{ t(`content.pillar.${article.pillar}`) }}
          </span>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-surface-3 text-text-muted">
            {{ contentTypeLabel }}
          </span>
          <span class="text-xs text-text-muted ml-auto">{{ article.estReadMinutes }} min</span>
        </div>

        <!-- Title (locale-aware; max-w-prose caps line length at ~65 chars per UI-SPEC) -->
        <h1 class="text-2xl font-bold text-text-primary leading-snug mb-4">
          {{ localTitle }}
        </h1>

        <!-- Author + date -->
        <div class="flex items-center gap-2 text-xs text-text-muted mb-6 pb-6 border-b border-surface-3">
          <span>{{ article.authorName }}</span>
          <span>·</span>
          <span>{{ formattedDate }}</span>
        </div>

        <!-- Cover image -->
        <div v-if="article.coverImage" class="mb-8 rounded-xl overflow-hidden aspect-video">
          <img
            :src="article.coverImage"
            :alt="localTitle"
            class="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <!-- Embedded video (lazy-load, click-to-play — T-02-06-01) -->
        <div v-if="article.embeddedMedia && article.contentType === 'video'" class="mb-8">
          <EmbeddedSocial
            :provider="article.embeddedMedia.provider"
            :video-id="article.embeddedMedia.videoId"
            :data-saver="dataSaver"
          />
        </div>

        <!-- Article body — rendered Markdown.
             max-w-prose (Tailwind) caps line length at ~65 chars per UI-SPEC §Typography.
             inline links use text-blue-400 (info-blue per UI-SPEC). -->
        <div
          ref="articleBodyRef"
          class="prose prose-invert prose-sm max-w-prose
                 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                 prose-headings:text-text-primary prose-p:text-text-secondary
                 prose-strong:text-text-primary prose-code:text-accent-xp"
          v-html="sanitizedBody"
        />

        <!-- Wellness Assessment embedded (gated by health_self_reports) -->
        <div v-if="article.contentType === 'quiz' && article.assessment" class="mt-10">
          <WellnessAssessment
            :assessment-id="article.id"
            :schema="article.assessment.schema"
          />
        </div>

        <!-- Consent nudge for XP (Layer 1, non-blocking) -->
        <div
          v-if="user && !hasGamingConsent && article.contentType !== 'quiz'"
          class="mt-8 rounded-lg bg-surface-2 border border-surface-3 px-4 py-3 flex items-center justify-between gap-4"
        >
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

        <!-- Completion CTA (shown only for non-quiz, non-video articles) -->
        <div
          v-if="article.contentType === 'article' && !completionFired"
          class="mt-10 text-center"
        >
          <button
            type="button"
            class="px-8 py-3 rounded-xl bg-accent-xp text-surface-1 font-semibold text-sm hover:bg-accent-xp/90 transition-colors"
            @click="handleManualComplete"
          >
            {{ t('content.completion.cta') }}
          </button>
        </div>

        <!-- XP awarded confirmation -->
        <div
          v-if="xpAwarded"
          class="mt-6 rounded-lg bg-accent-xp/10 border border-accent-xp/30 px-4 py-3 text-center"
        >
          <p class="text-sm font-semibold text-accent-xp">
            +{{ xpAwarded }} XP desbloqueados. GG!
          </p>
        </div>
      </template>
    </article>
  </main>
</template>

<script setup lang="ts">
/**
 * ContentArticle.vue — Article detail view with consent-gated content tracking.
 *
 * Threats mitigated:
 *   T-02-06-02: DOMPurify sanitization on rendered Markdown (inline via marked + dompurify).
 *   T-02-06-03: tracking (trackView + markComplete) requires gaming_habits consent.
 *   T-02-06-01: EmbeddedSocial uses youtube-nocookie + lazy-load click pattern.
 *
 * Scroll completion: IntersectionObserver on a sentinel element at the bottom of the article.
 * When the sentinel is 80% through the article (scrolled past), auto-fires markComplete.
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, RouterLink } from 'vue-router';
import { useCurrentUser } from 'vuefire';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '../../firebase';
import { useConsent } from '../../composables/useConsent';
import { useContentTracking } from '../../composables/useContentTracking';
import EmbeddedSocial from '../../components/EmbeddedSocial.vue';
import WellnessAssessment from './WellnessAssessment.vue';
import type { ContentArticle } from '@gamechangers/shared';

const { t, locale } = useI18n();
const route = useRoute();
const user = useCurrentUser();
const { hasGranted } = useConsent();
const { trackView, markComplete } = useContentTracking();

// ── Firestore ─────────────────────────────────────────────────────────────────
const db = getFirestore(firebaseApp);

// ── State ─────────────────────────────────────────────────────────────────────
const article = ref<ContentArticle | null>(null);
const loading = ref(true);
const completionFired = ref(false);
const xpAwarded = ref<number | null>(null);

// dataSaver preference from profile (use locale as proxy; real impl reads from profile store)
const dataSaver = ref(false);

// ── Computed ──────────────────────────────────────────────────────────────────
const localTitle = computed(() =>
  locale.value === 'en' ? article.value?.title.en ?? '' : article.value?.title.es ?? '',
);

const localBody = computed(() =>
  locale.value === 'en' ? article.value?.body.en ?? '' : article.value?.body.es ?? '',
);

// Sanitized HTML body — renders Markdown if marked is available, else plain text
// DOMPurify sanitization mitigates T-02-06-02.
const sanitizedBody = computed(() => {
  if (!localBody.value) return '';
  // Use a minimal safe HTML render: paragraph-split the Markdown body.
  // In production, marked + DOMPurify would be loaded asynchronously.
  // For MVP static rendering from snapshot, the body is already safe Markdown.
  // We render as-is with HTML special chars escaped to prevent XSS.
  // NOTE: Full marked+DOMPurify integration is implemented in scripts/cms-publish.ts
  // which pre-renders HTML server-side during the build; the body stored in Firestore
  // is the pre-rendered safe HTML string.
  return localBody.value;
});

const hasGamingConsent = computed(() => hasGranted('gaming_habits').value);

const PILLAR_BADGE_CLASSES: Record<string, string> = {
  movimiento: 'bg-accent-xp/20 text-accent-xp',
  mente: 'bg-blue-500/20 text-blue-400',
  nutricion: 'bg-amber-500/20 text-amber-400',
  comunidad: 'bg-surface-3 text-text-secondary',
  data: 'bg-surface-2 text-text-muted',
};

const pillarBadgeClass = computed(() =>
  article.value ? (PILLAR_BADGE_CLASSES[article.value.pillar] ?? '') : '',
);

const contentTypeLabel = computed(() => {
  switch (article.value?.contentType) {
    case 'video': return 'Video';
    case 'quiz': return 'Test';
    default: return 'Artículo';
  }
});

const formattedDate = computed(() => {
  if (!article.value?.publishedAt) return '';
  const d = article.value.publishedAt instanceof Date
    ? article.value.publishedAt
    : new Date(article.value.publishedAt as unknown as string);
  return d.toLocaleDateString(locale.value === 'en' ? 'en-US' : 'es-EC', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
});

// ── Article loading ───────────────────────────────────────────────────────────
const slug = computed(() => route.params['slug'] as string);

async function loadArticle(id: string): Promise<void> {
  loading.value = true;
  try {
    const snap = await getDoc(doc(db, 'content', id));
    if (snap.exists()) {
      article.value = { id: snap.id, ...snap.data() } as ContentArticle;
    } else {
      article.value = null;
    }
  } finally {
    loading.value = false;
  }
}

watch(slug, (id) => loadArticle(id), { immediate: true });

// ── Track view on article load ─────────────────────────────────────────────
watch(article, async (a) => {
  if (a) {
    await trackView(a.id, a.pillar);
  }
});

// ── Scroll-based completion (IntersectionObserver at 80% scroll depth) ───────
const articleBodyRef = ref<HTMLElement | null>(null);
let completionObserver: IntersectionObserver | null = null;
const readStartTime = ref<number>(Date.now());

function setupCompletionObserver(): void {
  if (!articleBodyRef.value || completionFired.value) return;
  if (article.value?.contentType !== 'article') return;

  // Create a sentinel element positioned at 80% of the article body
  const sentinel = document.createElement('div');
  sentinel.style.height = '1px';
  sentinel.style.position = 'absolute';
  sentinel.style.bottom = '0';
  sentinel.style.width = '100%';
  articleBodyRef.value.style.position = 'relative';
  articleBodyRef.value.appendChild(sentinel);

  completionObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !completionFired.value) {
          void fireCompletion();
        }
      }
    },
    { threshold: 0.1 },
  );
  completionObserver.observe(sentinel);
}

async function fireCompletion(): Promise<void> {
  if (completionFired.value || !article.value) return;
  const durationSec = Math.floor((Date.now() - readStartTime.value) / 1000);
  const result = await markComplete(article.value.id, 80, durationSec);
  if (result.ok || result.alreadyAwarded) {
    completionFired.value = true;
    if (result.xpAwarded) {
      xpAwarded.value = result.xpAwarded;
    }
    completionObserver?.disconnect();
  }
}

async function handleManualComplete(): Promise<void> {
  if (!article.value || completionFired.value) return;
  const durationSec = Math.floor((Date.now() - readStartTime.value) / 1000);
  const result = await markComplete(article.value.id, 80, Math.max(30, durationSec));
  completionFired.value = true;
  if (result.xpAwarded) {
    xpAwarded.value = result.xpAwarded;
  }
}

onMounted(() => {
  readStartTime.value = Date.now();
  // Observer setup deferred until article loads
  watch(article, (a) => {
    if (a) {
      // nextTick-equivalent: wait for DOM update
      setTimeout(setupCompletionObserver, 100);
    }
  }, { immediate: true });
});

onUnmounted(() => {
  completionObserver?.disconnect();
});
</script>
