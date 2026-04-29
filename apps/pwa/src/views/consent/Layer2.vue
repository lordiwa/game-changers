<template>
  <ProgressiveConsentLayer
    :layer="2"
    :heading="t('consent.layer2.heading')"
    :is-minor="isMinor"
    @complete="onComplete"
    @skip="onSkip"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';
import ProgressiveConsentLayer from '../../components/ProgressiveConsentLayer.vue';
import { useAuth } from '../../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { isMinor } = useAuth();

function onComplete() {
  const returnUrl = route.query['return'] as string | undefined;
  router.push(returnUrl ?? '/me');
}

function onSkip() {
  const returnUrl = route.query['return'] as string | undefined;
  router.push(returnUrl ?? '/me');
}
</script>
