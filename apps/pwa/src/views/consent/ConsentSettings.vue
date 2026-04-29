<template>
  <div class="consent-settings px-4 py-6 max-w-lg mx-auto">
    <h1 class="text-xl font-bold text-text mb-1">{{ t('consent.settings.heading') }}</h1>
    <p class="text-sm text-muted mb-6">{{ t('consent.settings.body') }}</p>

    <!-- Group by layer -->
    <section v-for="(categories, layer) in LAYER_TO_CATEGORIES" :key="layer" class="mb-6">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
        {{ t(`consent.layer${layer}.heading`) }}
      </h2>

      <ConsentRow
        v-for="category in categories"
        :key="category"
        :category="category as ConsentCategory"
        :layer="(Number(layer) as 0 | 1 | 2 | 3 | 4)"
        :is-minor="isMinor"
      />
    </section>

    <!-- Links to history + DSAR -->
    <div class="mt-8 space-y-3 border-t border-surface-2 pt-6">
      <RouterLink
        to="/me/consent/history"
        class="flex items-center gap-2 text-sm text-accent-xp hover:underline"
      >
        {{ t('consent.history.heading') }}
      </RouterLink>
      <RouterLink
        to="/me/consent/dsar"
        class="flex items-center gap-2 text-sm text-accent-xp hover:underline"
      >
        {{ t('consent.dsar.cta') }}
      </RouterLink>
      <RouterLink
        to="/me/consent/erase"
        class="flex items-center gap-2 text-sm text-error hover:underline"
      >
        {{ t('consent.erase.cta') }}
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import ConsentRow from '../../components/ConsentRow.vue';
import { useAuth } from '../../composables/useAuth';
import { LAYER_TO_CATEGORIES } from '@gamechangers/shared';
import type { ConsentCategory } from '@gamechangers/shared';

const { t } = useI18n();
const { isMinor } = useAuth();
</script>
