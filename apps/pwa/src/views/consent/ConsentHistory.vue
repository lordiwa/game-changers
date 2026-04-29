<template>
  <div class="consent-history px-4 py-6 max-w-lg mx-auto">
    <h1 class="text-xl font-bold text-text mb-4">{{ t('consent.history.heading') }}</h1>

    <!-- Loading state -->
    <div v-if="!ledgerEntries" class="text-sm text-muted">{{ t('common.loading') }}</div>

    <!-- Empty state -->
    <div v-else-if="ledgerEntries.length === 0" class="text-sm text-muted">
      {{ t('consent.history.empty') }}
    </div>

    <!-- Timeline of ledger entries -->
    <!-- NOTE: If a user accumulates >500 consentLedger entries, switch to paginated
         reads. For MVP this collection is small (≤20 entries per user per year). -->
    <ol v-else class="space-y-3">
      <li
        v-for="entry in ledgerEntries"
        :key="entry.id"
        class="flex gap-3 text-sm"
      >
        <div class="w-2 h-2 rounded-full mt-1.5 shrink-0"
             :class="{
               'bg-accent-xp': entry.action === 'grant',
               'bg-error': entry.action === 'revoke',
               'bg-muted': entry.action === 'expire',
             }"
        />
        <div>
          <p class="font-medium text-text">
            {{ t(`consent.${entry.category}.v3.label`) }}
            —
            <span :class="{
              'text-accent-xp': entry.action === 'grant',
              'text-error': entry.action === 'revoke',
              'text-muted': entry.action === 'expire',
            }">
              {{ t(`consent.action.${entry.action}`) }}
            </span>
          </p>
          <p class="text-xs text-muted">
            {{ entry.version }} · {{ formatDate(entry.timestamp) }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getFirestore, collection, query, where, orderBy } from 'firebase/firestore';
import { useCollection, useCurrentUser } from 'vuefire';
import { firebaseApp } from '../../firebase';

const { t } = useI18n();
const db = getFirestore(firebaseApp);
const currentUser = useCurrentUser();

const uid = computed(() => currentUser.value?.uid ?? null);

// VueFire subscription to consentLedger filtered by uid, newest first.
const ledgerCollection = useCollection(
  computed(() =>
    uid.value
      ? query(
          collection(db, 'consentLedger'),
          where('uid', '==', uid.value),
          orderBy('timestampMs', 'desc'),
        )
      : null,
  ),
);

const ledgerEntries = computed(() => ledgerCollection.value ?? []);

function formatDate(timestampMs: number | Date | null | undefined): string {
  if (!timestampMs) return '—';
  const ms = typeof timestampMs === 'number' ? timestampMs : (timestampMs as Date).getTime?.() ?? 0;
  return new Date(ms).toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
