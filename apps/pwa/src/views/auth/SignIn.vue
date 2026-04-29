<template>
  <main class="flex flex-col min-h-screen bg-surface-0 px-4 py-8">
    <h1 class="text-2xl font-bold text-white mb-6">{{ $t('auth.signin.heading') }}</h1>
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
          autocomplete="current-password"
          required
          class="rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 min-h-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </label>
      <p v-if="errorMsg" role="alert" class="text-red-400 text-sm">{{ errorMsg }}</p>
      <RouterLink to="/auth/reset" class="text-sm text-indigo-400 hover:text-indigo-300 self-start">
        {{ $t('auth.password_reset.link') }}
      </RouterLink>
    </form>

    <!-- Mobile bottom-anchored CTA; normal flow on desktop -->
    <div class="mt-6 sticky bottom-6">
      <button
        type="submit"
        :disabled="loading"
        class="w-full min-h-11 flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        @click="onSubmit"
      >
        {{ $t('auth.signin.cta') }}
      </button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../../composables/useAuth';

const router = useRouter();
const { signInWithEmail } = useAuth();

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

async function onSubmit() {
  errorMsg.value = '';
  loading.value = true;
  try {
    await signInWithEmail(email.value, password.value);
    await router.push('/');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMsg.value = msg.includes('invalid-credential') || msg.includes('wrong-password')
      ? 'Credenciales incorrectas. Verifica tu correo y contraseña.'
      : msg;
  } finally {
    loading.value = false;
  }
}
</script>
