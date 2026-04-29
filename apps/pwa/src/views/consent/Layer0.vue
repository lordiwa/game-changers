<template>
  <ProgressiveConsentLayer
    :layer="0"
    :heading="t('consent.layer0.heading')"
    :is-minor="isMinor"
    @complete="onComplete"
    @skip="onSkip"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import ProgressiveConsentLayer from '../../components/ProgressiveConsentLayer.vue';
import { useAuth } from '../../composables/useAuth';

const { t } = useI18n();
const router = useRouter();
const { isMinor } = useAuth();

function onComplete() {
  router.push('/me');
}

function onSkip() {
  // Layer 0 (basic_profile) cannot be meaningfully skipped — profile won't exist.
  // We still allow skip but show a warning; the profile view will prompt again.
  router.push('/me');
}
</script>
