<template>
  <div class="account-deletion px-4 py-6 max-w-lg mx-auto">
    <h1 class="text-xl font-bold text-error mb-2">{{ t('consent.erase.modal.title') }}</h1>
    <p class="text-sm text-muted mb-6">{{ t('consent.erase.modal.body') }}</p>

    <!-- Typed confirmation per UI-SPEC §Destructive confirmations -->
    <label class="block mb-4">
      <span class="text-sm font-medium text-text">{{ t('consent.erase.confirm.label') }}</span>
      <input
        v-model="confirmText"
        type="text"
        data-testid="erasure-confirm-input"
        :placeholder="t('consent.erase.confirm.placeholder')"
        class="mt-1 w-full px-3 py-2 rounded-lg border border-surface-3
               bg-surface-2 text-text text-sm
               focus:outline-none focus:ring-2 focus:ring-error"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
    </label>

    <!-- Submit button — only enables when typed exactly 'ELIMINAR' -->
    <button
      data-testid="erasure-submit"
      class="w-full py-3 px-6 rounded-xl font-semibold text-sm
             bg-error text-white transition-colors
             hover:brightness-110 active:brightness-90
             disabled:opacity-40 disabled:cursor-not-allowed"
      :disabled="confirmText !== 'ELIMINAR' || submitting"
      @click="handleErasure"
    >
      {{ submitting ? t('consent.erase.submitting') : t('consent.erase.submit') }}
    </button>

    <p class="text-xs text-muted mt-4">{{ t('consent.erase.legal_note') }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { getAuth } from 'firebase/auth';
import { firebaseApp } from '../../firebase';
import { useConsent } from '../../composables/useConsent';

const { t } = useI18n();
const router = useRouter();
const { requestErasure } = useConsent();

const confirmText = ref('');
const submitting = ref(false);

async function handleErasure() {
  if (confirmText.value !== 'ELIMINAR' || submitting.value) return;

  submitting.value = true;
  try {
    await requestErasure('ELIMINAR');

    // Sign out after erasure — session is already revoked server-side
    const auth = getAuth(firebaseApp);
    await auth.signOut();

    // Navigate to sign-in with a goodbye message
    router.replace({ path: '/auth/signin', query: { erased: '1' } });
  } catch (err) {
    // Show error — do not navigate
    submitting.value = false;
    throw err;
  }
}
</script>
