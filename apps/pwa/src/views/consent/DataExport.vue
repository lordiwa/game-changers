<template>
  <div class="data-export px-4 py-6 max-w-lg mx-auto">
    <h1 class="text-xl font-bold text-text mb-2">{{ t('consent.dsar.cta') }}</h1>
    <p class="text-sm text-muted mb-6">{{ t('consent.dsar.description') }}</p>

    <!-- No active request -->
    <div v-if="!activeRequest">
      <button
        class="w-full py-3 px-6 rounded-xl font-semibold text-sm bg-accent-xp text-white
               hover:brightness-110 active:brightness-90 transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="requesting"
        @click="handleExportRequest"
      >
        {{ requesting ? t('consent.dsar.requesting') : t('consent.dsar.cta') }}
      </button>
    </div>

    <!-- Queued / processing -->
    <div v-else-if="activeRequest.status === 'queued' || activeRequest.status === 'processing'"
         class="rounded-xl bg-surface-2 p-4 text-sm">
      <p class="font-medium text-text mb-1">{{ t('consent.dsar.processing_heading') }}</p>
      <p class="text-muted">{{ t('consent.dsar.processing') }}</p>
    </div>

    <!-- Ready — show download button -->
    <div v-else-if="activeRequest.status === 'ready'" class="rounded-xl bg-surface-2 p-4">
      <p class="font-medium text-text mb-1">{{ t('consent.dsar.ready') }}</p>
      <a
        :href="activeRequest.downloadUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block mt-3 py-2 px-4 rounded-lg bg-accent-xp text-white text-sm font-medium
               hover:brightness-110 transition-colors"
      >
        {{ t('consent.dsar.download') }}
      </a>
      <p class="text-xs text-muted mt-2">
        {{ t('consent.dsar.expires', { date: formatExpiry(activeRequest.expiresAt) }) }}
      </p>
    </div>

    <!-- Error -->
    <div v-else-if="activeRequest.status === 'error'" class="rounded-xl bg-error/10 p-4 text-sm">
      <p class="font-medium text-error">{{ t('consent.dsar.error') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { useCollection, useCurrentUser } from 'vuefire';
import { firebaseApp } from '../../firebase';
import { useConsent } from '../../composables/useConsent';

const { t } = useI18n();
const db = getFirestore(firebaseApp);
const currentUser = useCurrentUser();
const { requestExport } = useConsent();

const requesting = ref(false);
const uid = computed(() => currentUser.value?.uid ?? null);

// Subscribe to most recent DSAR request for this user
const dsarCollection = useCollection(
  computed(() =>
    uid.value
      ? query(
          collection(db, `users/${uid.value}/dsarRequests`),
          orderBy('requestedAt', 'desc'),
          limit(1),
        )
      : null,
  ),
);

const activeRequest = computed(() => {
  const docs = dsarCollection.value;
  if (!docs || docs.length === 0) return null;
  return docs[0] as unknown as {
    status: 'queued' | 'processing' | 'ready' | 'error';
    downloadUrl?: string;
    expiresAt?: Date;
  };
});

async function handleExportRequest() {
  requesting.value = true;
  try {
    await requestExport();
  } finally {
    requesting.value = false;
  }
}

function formatExpiry(date: Date | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
</script>
