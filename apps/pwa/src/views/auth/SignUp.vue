<template>
  <main class="flex flex-col min-h-screen bg-surface-0 px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">{{ $t('auth.signup.heading') }}</h1>
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
      <label class="flex flex-col gap-1">
        <span class="text-sm text-gray-400">{{ $t('auth.fields.password') }}</span>
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          minlength="8"
          class="rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <p v-if="errorMsg" role="alert" class="text-red-400 text-sm">{{ errorMsg }}</p>
    </form>

    <div class="mt-6 sticky bottom-6">
      <button
        type="submit"
        :disabled="loading"
        class="w-full min-h-11 flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        @click="onSubmit"
      >
        {{ $t('auth.signup.cta') }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const router = useRouter();
const { signUpWithEmail } = useAuth();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function onSubmit() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await signUpWithEmail(email.value, password.value);
    // Redirect to age gate if not yet age-verified.
    await router.push('/auth/age-gate');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMsg.value = msg.includes('email-already-in-use')
      ? 'Ese correo ya tiene cuenta. ¿Querés iniciar sesión?'
      : msg;
  } finally {
    loading.value = false;
  }
}
</script>
