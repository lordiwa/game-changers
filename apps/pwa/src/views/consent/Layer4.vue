<template>
  <!--
    Layer 4 — B2B categories: b2b_insurers, b2b_healthcare, b2b_brands, cross_border, research.
    Per D-14: minors (under-18) cannot grant Layer 4 at all — all toggles disabled.
    Layer 4 is NEVER auto-prompted — only reachable from /me/consent settings page.
  -->
  <ProgressiveConsentLayer
    :layer="4"
    :heading="t('consent.layer4.heading')"
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
  router.push('/me/consent');
}

function onSkip() {
  router.push('/me/consent');
}
</script>
