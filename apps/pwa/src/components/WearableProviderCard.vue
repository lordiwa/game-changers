<script setup lang="ts">
/**
 * WearableProviderCard.vue — Card displaying a single wearable provider.
 *
 * WEAR-12 anti-feature: this component renders provider name, logo, and connection
 * status ONLY. No health values, no trend indicators, no alert banners.
 *
 * Props:
 *   provider — one of the 5 supported webhook-capable providers
 *   connected — whether this provider is currently connected
 *   lastSyncAt — optional ISO string of last data sync (null = never)
 *
 * Emits:
 *   connect(provider) — user clicked "Conectar"
 *   disconnect(provider) — user clicked "Desconectar" (parent shows modal)
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { WearableProvider } from '../composables/useWearables.js';

const props = defineProps<{
  provider: WearableProvider;
  connected: boolean;
  lastSyncAt?: string | null;
}>();

const emit = defineEmits<{
  connect: [provider: WearableProvider];
  disconnect: [provider: WearableProvider];
}>();

const { t } = useI18n();

// Provider display names — match i18n keys
const PROVIDER_DISPLAY: Record<WearableProvider, string> = {
  garmin: 'Garmin',
  fitbit: 'Fitbit',
  polar: 'Polar',
  whoop: 'WHOOP',
  oura: 'Oura',
};

// SVG placeholder colors for providers (branding approximations)
const PROVIDER_COLORS: Record<WearableProvider, string> = {
  garmin: '#007CC3',
  fitbit: '#00B0B9',
  polar: '#D5001C',
  whoop: '#000000',
  oura: '#1A1A2E',
};

const displayName = computed(() => PROVIDER_DISPLAY[props.provider]);
const brandColor = computed(() => PROVIDER_COLORS[props.provider]);

const formattedLastSync = computed(() => {
  if (!props.lastSyncAt) return null;
  try {
    const date = new Date(props.lastSyncAt);
    return date.toLocaleString('es-EC', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
});

function onConnect() {
  emit('connect', props.provider);
}

function onDisconnect() {
  emit('disconnect', props.provider);
}
</script>

<template>
  <div
    class="wearable-provider-card"
    :class="{ 'wearable-provider-card--connected': connected }"
    role="article"
    :aria-label="`${displayName} — ${connected ? t('wearables.status.connected') : t('wearables.status.not_connected')}`"
  >
    <!-- Provider logo placeholder (brand color circle + initials) -->
    <div
      class="wearable-provider-card__logo"
      :style="{ backgroundColor: brandColor }"
      aria-hidden="true"
    >
      <span class="wearable-provider-card__logo-initials">
        {{ displayName.slice(0, 2).toUpperCase() }}
      </span>
    </div>

    <!-- Provider info -->
    <div class="wearable-provider-card__info">
      <h3 class="wearable-provider-card__name">{{ displayName }}</h3>

      <template v-if="connected">
        <span class="wearable-provider-card__status wearable-provider-card__status--connected">
          {{ t('wearables.status.connected') }}
        </span>
        <p v-if="formattedLastSync" class="wearable-provider-card__last-sync">
          {{ t('wearables.last_sync_template', { timestamp: formattedLastSync }) }}
        </p>
      </template>
      <template v-else>
        <span class="wearable-provider-card__status wearable-provider-card__status--idle">
          {{ t('wearables.status.not_connected') }}
        </span>
      </template>
    </div>

    <!-- Action button -->
    <div class="wearable-provider-card__action">
      <button
        v-if="!connected"
        type="button"
        class="btn btn--primary btn--sm"
        @click="onConnect"
      >
        {{ t('wearables.cta.connect') }}
      </button>
      <button
        v-else
        type="button"
        class="btn btn--destructive btn--sm"
        @click="onDisconnect"
      >
        {{ t('wearables.disconnect.cta') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wearable-provider-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 0.75rem;
  background: var(--color-surface, #fff);
  transition: border-color 0.2s ease;
}

.wearable-provider-card--connected {
  border-color: var(--color-primary, #6366f1);
}

.wearable-provider-card__logo {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wearable-provider-card__logo-initials {
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
  letter-spacing: 0.05em;
}

.wearable-provider-card__info {
  flex: 1;
  min-width: 0;
}

.wearable-provider-card__name {
  font-weight: 600;
  font-size: 1rem;
  margin: 0 0 0.25rem;
  color: var(--color-text-primary, #111827);
}

.wearable-provider-card__status {
  font-size: 0.75rem;
  font-weight: 500;
}

.wearable-provider-card__status--connected {
  color: var(--color-success, #16a34a);
}

.wearable-provider-card__status--idle {
  color: var(--color-text-muted, #6b7280);
}

.wearable-provider-card__last-sync {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6b7280);
  margin: 0.25rem 0 0;
}

.wearable-provider-card__action {
  flex-shrink: 0;
}

/* Button styles — same utility classes as rest of PWA */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  border: none;
  transition: background 0.15s ease;
}

.btn--sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn--primary {
  background: var(--color-primary, #6366f1);
  color: #fff;
}

.btn--primary:hover {
  background: var(--color-primary-dark, #4f46e5);
}

.btn--destructive {
  background: transparent;
  color: var(--color-error, #dc2626);
  border: 1px solid var(--color-error, #dc2626);
}

.btn--destructive:hover {
  background: var(--color-error-bg, #fef2f2);
}
</style>
