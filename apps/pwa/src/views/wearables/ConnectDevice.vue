<script setup lang="ts">
/**
 * ConnectDevice.vue — /me/wearables/connect route.
 *
 * Provider chooser grid for Phase 2 webhook-capable providers:
 *   Garmin, Fitbit, Polar, WHOOP, Oura
 *
 * D-11 DEFERRAL — EXPLICITLY EXCLUDED:
 *   Apple HealthKit and Android Health Connect are NOT listed here.
 *   Native OS health integrations are deferred to Phase 3 (Capacitor shell).
 *
 * WEAR-12 anti-feature: NO health value previews, NO "you'll see your HR" claims,
 * NO medical framing. Copy is calm, voluntary, gaming-flavored.
 *
 * No onSnapshot — ESLint enforced.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import WearableProviderCard from '../../components/WearableProviderCard.vue';
import { useWearables, SUPPORTED_PROVIDERS, type WearableProvider } from '../../composables/useWearables.js';

const { t } = useI18n();
const router = useRouter();

const { connect, isConnected, loading, error } = useWearables();

const connectingProvider = ref<WearableProvider | null>(null);

async function onConnect(provider: WearableProvider) {
  connectingProvider.value = provider;
  try {
    await connect(provider);
    // OAuth window opened; navigate back to wearables list
    router.push('/me/wearables');
  } catch {
    // error is set in useWearables composable; show inline
    connectingProvider.value = null;
  }
}

function goBack() {
  router.push('/me/wearables');
}
</script>

<template>
  <main class="connect-device-view" aria-labelledby="connect-heading">
    <!-- Header + back -->
    <div class="connect-device-view__header">
      <button
        type="button"
        class="connect-device-view__back"
        :aria-label="t('me.back')"
        @click="goBack"
      >
        ← {{ t('me.back') }}
      </button>
      <h1 id="connect-heading" class="connect-device-view__title">
        {{ t('wearables.connect.heading') }}
      </h1>
      <p class="connect-device-view__subtitle">
        {{ t('wearables.connect.subtitle') }}
      </p>
    </div>

    <!-- Error banner -->
    <div v-if="error" role="alert" class="connect-device-view__error">
      <strong>{{ t('wearables.error.oauth_failed') }}</strong>
      <p>{{ t('wearables.error.oauth_failed_body') }}</p>
    </div>

    <!-- Provider grid -->
    <!-- NOTE: Only webhook-capable providers listed per D-11.
         Apple HealthKit + Android Health Connect are NOT here. -->
    <ul class="connect-device-view__grid" role="list">
      <li v-for="provider in SUPPORTED_PROVIDERS" :key="provider">
        <WearableProviderCard
          :provider="provider"
          :connected="isConnected(provider)"
          :last-sync-at="null"
          @connect="onConnect"
          @disconnect="() => {}"
        />
      </li>
    </ul>

    <!-- D-11 deferral note (informational, not alarming) -->
    <p class="connect-device-view__deferred-note">
      {{ t('wearables.connect.native_sync_deferred') }}
    </p>

    <!-- Loading overlay when connecting -->
    <div v-if="loading" class="connect-device-view__loading" aria-busy="true" aria-live="polite">
      <span class="sr-only">Conectando {{ connectingProvider }}...</span>
    </div>
  </main>
</template>

<style scoped>
.connect-device-view {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.connect-device-view__header {
  margin-bottom: 1.5rem;
}

.connect-device-view__back {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.9375rem;
  padding: 0;
  margin-bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.connect-device-view__back:hover {
  color: var(--color-text-primary, #111827);
}

.connect-device-view__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0 0 0.5rem;
}

.connect-device-view__subtitle {
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
  font-size: 0.9375rem;
}

.connect-device-view__error {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg, #fef2f2);
  color: var(--color-error, #dc2626);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9375rem;
}

.connect-device-view__error p {
  margin: 0.25rem 0 0;
  font-weight: 400;
}

.connect-device-view__grid {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.connect-device-view__deferred-note {
  font-size: 0.8125rem;
  color: var(--color-text-muted, #9ca3af);
  text-align: center;
  margin: 0;
}

.connect-device-view__loading {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
