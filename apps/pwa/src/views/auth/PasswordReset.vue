<template>
  <main class="flex flex-col min-h-screen bg-surface-0 px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">{{ $t('auth.password_reset.heading') }}</h1>
    <form class="flex flex-col gap-4 flex-1" @submit.prevent="onSubmit">
      <label class="flex flex-col gap-1">
        <span class="text-sm text-gray-400">{{ $t('auth.fields.email') }}</span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <p v-if="errorMsg" role="alert" class="text-red-400 text-sm">
        {{ $t('auth.password_reset.error.invalid') }}
      </p>
      <p v-if="successMsg" role="status" class="text-green-400 text-sm">{{ successMsg }}</p>
    </form>

    <div class="mt-6 sticky bottom-6">
      <button
        type="submit"
        :disabled="loading || sent"
        class="w-full min-h-11 flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        @click="onSubmit"
      >
        {{ $t('auth.password_reset.cta') }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '../../composables/useAuth';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { sendPasswordReset } = useAuth();

const email = ref('');
const loading = ref(false);
const sent = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

async function onSubmit() {
  errorMsg.value = '';
  successMsg.value = '';
  loading.value = true;
  try {
    await sendPasswordReset(email.value);
    sent.value = true;
    successMsg.value = t('auth.password_reset.success');
  } catch {
    errorMsg.value = t('auth.password_reset.error.invalid');
  } finally {
    loading.value = false;
  }
}
</script>
