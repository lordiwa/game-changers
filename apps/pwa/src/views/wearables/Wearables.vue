<script setup lang="ts">
/**
 * Wearables.vue — /me/wearables route.
 *
 * Shows connected wearable devices. Gated by wearable_data consent (Layer 3).
 *
 * WEAR-12 anti-feature: NO medical alerts, NO warning banners on health values,
 * NO "concerning trend" copy. This view is calm and data-neutral.
 *
 * Empty state (Pitfall #9 — manual-first principle):
 *   "Aún sin dispositivo conectado"
 *   "Tu teléfono ya cuenta tus pasos. Si quieres, conecta una pulsera para ver
 *    más detalle — totalmente opcional."
 *
 * No onSnapshot — ESLint enforced.
 */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import WearableProviderCard from '../../components/WearableProviderCard.vue';
import { useWearables, type WearableProvider } from '../../composables/useWearables.js';

const { t } = useI18n();
const router = useRouter();

const {
  connectedDevices,
  hasConnectedDevices,
  loading,
  error,
  loadConnectedDevices,
  disconnect,
  SUPPORTED_PROVIDERS,
} = useWearables();

// Consent check: wearable_data claim ('w' bitmap)
const hasWearableConsent = ref(false);
const consentChecked = ref(false);

// Disconnect modal state
const disconnectModal = ref<{
  open: boolean;
  provider: WearableProvider | null;
  retainData: boolean;
}>({
  open: false,
  provider: null,
  retainData: true,
});

async function checkConsent(): Promise<void> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    hasWearableConsent.value = false;
    consentChecked.value = true;
    return;
  }
  try {
    // Check custom claim first (fast path)
    const idTokenResult = await user.getIdTokenResult();
    const consents = idTokenResult.claims['consents'] as Record<string, boolean> | undefined;
    if (consents?.['w'] === true) {
      hasWearableConsent.value = true;
      consentChecked.value = true;
      return;
    }
    // Fallback: check Firestore consent document
    const db = getFirestore();
    const consentDoc = await getDoc(doc(db, `users/${user.uid}/consents/wearable_data`));
    hasWearableConsent.value =
      consentDoc.exists() && consentDoc.data()?.['status'] === 'granted';
  } catch {
    hasWearableConsent.value = false;
  } finally {
    consentChecked.value = true;
  }
}

onMounted(async () => {
  await checkConsent();
  if (hasWearableConsent.value) {
    await loadConnectedDevices();
  }
});

function goToConsentLayer3() {
  router.push('/consent/layer-3');
}

function goToConnectDevice() {
  router.push('/me/wearables/connect');
}

function openDisconnectModal(provider: WearableProvider) {
  disconnectModal.value = { open: true, provider, retainData: true };
}

function closeDisconnectModal() {
  disconnectModal.value = { open: false, provider: null, retainData: true };
}

async function confirmDisconnect() {
  if (!disconnectModal.value.provider) return;
  try {
    await disconnect(disconnectModal.value.provider, disconnectModal.value.retainData);
    closeDisconnectModal();
  } catch {
    // error is set in useWearables; modal stays open for retry
  }
}
</script>

<template>
  <main class="wearables-view" aria-labelledby="wearables-heading">
    <!-- Header -->
    <div class="wearables-view__header">
      <h1 id="wearables-heading" class="wearables-view__title">
        {{ t('wearables.heading') }}
      </h1>
    </div>

    <!-- Loading state -->
    <div v-if="!consentChecked || loading" class="wearables-view__loading" aria-busy="true">
      <span class="sr-only">Cargando...</span>
    </div>

    <!-- Consent gate: user hasn't granted wearable_data -->
    <div v-else-if="!hasWearableConsent" class="wearables-view__consent-gate">
      <p class="wearables-view__consent-text">
        {{ t('wearables.consent_required') }}
      </p>
      <button
        type="button"
        class="btn btn--primary"
        @click="goToConsentLayer3"
      >
        {{ t('wearables.cta.enable_layer3') }}
      </button>
    </div>

    <!-- Main content: consent granted -->
    <template v-else>
      <!-- Error state -->
      <div v-if="error" role="alert" class="wearables-view__error">
        {{ t(error) }}
      </div>

      <!-- Empty state (Pitfall #9 — wearable is OPTIONAL) -->
      <div v-if="!hasConnectedDevices" class="wearables-view__empty">
        <h2 class="wearables-view__empty-heading">
          {{ t('wearables.empty.heading') }}
        </h2>
        <p class="wearables-view__empty-body">
          {{ t('wearables.empty.body') }}
        </p>
        <button
          type="button"
          class="btn btn--primary"
          @click="goToConnectDevice"
        >
          {{ t('wearables.cta.connect') }}
        </button>
      </div>

      <!-- Connected devices list -->
      <template v-else>
        <ul class="wearables-view__device-list" role="list">
          <li
            v-for="device in connectedDevices"
            :key="device.provider"
          >
            <WearableProviderCard
              :provider="device.provider"
              :connected="true"
              :last-sync-at="device.lastSyncAt"
              @disconnect="openDisconnectModal"
            />
          </li>
        </ul>

        <div class="wearables-view__add-more">
          <button
            type="button"
            class="btn btn--secondary"
            @click="goToConnectDevice"
          >
            {{ t('wearables.cta.connect') }}
          </button>
        </div>
      </template>
    </template>

    <!-- Disconnect confirmation modal (WEAR-10: retain vs delete option) -->
    <div
      v-if="disconnectModal.open"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`disconnect-modal-title-${disconnectModal.provider}`"
    >
      <div class="modal">
        <h2
          :id="`disconnect-modal-title-${disconnectModal.provider}`"
          class="modal__title"
        >
          {{
            t('wearables.disconnect.modal.title_template', {
              provider: disconnectModal.provider ?? '',
            })
          }}
        </h2>
        <p class="modal__body">{{ t('wearables.disconnect.modal.body') }}</p>

        <!-- Retain vs delete radio options (WEAR-10) -->
        <fieldset class="modal__options">
          <legend class="sr-only">{{ t('wearables.disconnect.modal.body') }}</legend>
          <label class="modal__radio-label">
            <input
              v-model="disconnectModal.retainData"
              type="radio"
              :value="true"
              name="retain-data"
            />
            {{ t('wearables.disconnect.option.retain') }}
          </label>
          <label class="modal__radio-label">
            <input
              v-model="disconnectModal.retainData"
              type="radio"
              :value="false"
              name="retain-data"
            />
            {{ t('wearables.disconnect.option.delete') }}
          </label>
        </fieldset>

        <div class="modal__actions">
          <button type="button" class="btn btn--ghost" @click="closeDisconnectModal">
            {{ t('consent.cta.skip') }}
          </button>
          <button
            type="button"
            class="btn btn--destructive"
            @click="confirmDisconnect"
          >
            {{ t('wearables.disconnect.cta') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.wearables-view {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.wearables-view__header {
  margin-bottom: 1.5rem;
}

.wearables-view__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary, #111827);
  margin: 0;
}

.wearables-view__loading {
  height: 6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wearables-view__consent-gate {
  padding: 2rem;
  background: var(--color-surface, #fff);
  border-radius: 1rem;
  border: 1px solid var(--color-border, #e5e7eb);
  text-align: center;
}

.wearables-view__consent-text {
  margin-bottom: 1rem;
  color: var(--color-text-secondary, #6b7280);
}

.wearables-view__error {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg, #fef2f2);
  color: var(--color-error, #dc2626);
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.wearables-view__empty {
  padding: 2rem;
  background: var(--color-surface, #fff);
  border-radius: 1rem;
  border: 1px dashed var(--color-border, #e5e7eb);
  text-align: center;
}

.wearables-view__empty-heading {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary, #111827);
  margin: 0 0 0.5rem;
}

.wearables-view__empty-body {
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 1.5rem;
  font-size: 0.9375rem;
}

.wearables-view__device-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wearables-view__add-more {
  margin-top: 1rem;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
}

.modal {
  background: var(--color-surface, #fff);
  border-radius: 1rem;
  padding: 1.5rem;
  max-width: 24rem;
  width: 100%;
}

.modal__title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  text-transform: capitalize;
}

.modal__body {
  color: var(--color-text-secondary, #6b7280);
  margin: 0 0 1rem;
  font-size: 0.9375rem;
}

.modal__options {
  border: none;
  padding: 0;
  margin: 0 0 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.modal__radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9375rem;
}

.modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn--ghost {
  background: transparent;
  color: var(--color-text-secondary, #6b7280);
  border: 1px solid var(--color-border, #e5e7eb);
}

.btn--secondary {
  background: var(--color-surface-alt, #f3f4f6);
  color: var(--color-text-primary, #111827);
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
