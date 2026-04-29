<template>
  <div class="progressive-consent-layer flex flex-col min-h-screen">
    <!-- Header -->
    <div class="px-4 pt-6 pb-4">
      <!-- Breadcrumb / layer indicator -->
      <p class="text-xs text-muted mb-2">
        {{ t('consent.layer.step', { current: props.layer + 1, total: 5 }) }}
      </p>

      <h1 class="text-xl font-bold text-text">{{ props.heading }}</h1>
    </div>

    <!-- Consent rows for this layer -->
    <div class="flex-1 px-4 overflow-y-auto">
      <ConsentRow
        v-for="category in layerCategories"
        :key="category"
        :category="category"
        :layer="props.layer"
        :is-minor="props.isMinor"
      />
    </div>

    <!-- Sticky bottom action bar -->
    <div class="sticky bottom-0 bg-surface-1 border-t border-surface-2 px-4 py-4 flex flex-col gap-2">
      <button
        data-testid="layer-cta"
        class="w-full py-3 px-6 rounded-xl font-semibold text-sm transition-colors
               bg-accent-xp text-white
               hover:brightness-110 active:brightness-90
               disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!hasAnyEnabled"
        @click="handleCta"
      >
        {{ t('consent.cta.accept') }}
      </button>

      <!-- Skip link (text-link styled) -->
      <button
        class="text-xs text-muted underline-offset-2 hover:underline text-center"
        @click="handleSkip"
      >
        {{ t('consent.cta.skip') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import ConsentRow from './ConsentRow.vue';
import { useConsent } from '../composables/useConsent';
import { LAYER_TO_CATEGORIES } from '@gamechangers/shared';
import type { ConsentCategory } from '@gamechangers/shared';

const props = defineProps<{
  layer: 0 | 1 | 2 | 3 | 4;
  heading: string;
  isMinor?: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  skip: [];
}>();

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { hasGranted } = useConsent();

const layerCategories = computed<ConsentCategory[]>(
  () => LAYER_TO_CATEGORIES[props.layer] as ConsentCategory[],
);

// CTA is enabled if at least one category in this layer has been granted
const hasAnyEnabled = computed(() =>
  layerCategories.value.some((cat) => hasGranted(cat).value),
);

function handleCta() {
  emit('complete');
  // Navigate to return URL if provided, else to /me
  const returnUrl = route.query['return'] as string | undefined;
  router.push(returnUrl ?? '/me');
}

function handleSkip() {
  emit('skip');
  const returnUrl = route.query['return'] as string | undefined;
  router.push(returnUrl ?? '/me');
}
</script>
