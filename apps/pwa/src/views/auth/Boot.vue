<template>
  <main class="flex flex-col items-center justify-center min-h-screen bg-surface-0 px-4 py-8">
    <h1 class="text-3xl font-bold text-white mb-2">
      {{ $t('app.brand') }}
    </h1>
    <p class="text-gray-400 mb-8">{{ $t('app.tagline') }}</p>
    <RouterLink
      to="/auth/signup"
      class="min-h-11 min-w-11 inline-flex items-center justify-center px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
    >
      {{ $t('auth.cta.create_account') }}
    </RouterLink>
    <RouterLink to="/auth/signin" class="mt-4 text-sm text-gray-400 hover:text-white transition-colors">
      {{ $t('auth.signin.heading') }}
    </RouterLink>
  </main>
</template>

<script setup lang="ts">
// Boot.vue - default landing.
// - Unauthenticated or anonymous Firebase users: render brand + sign-up CTA (template).
// - Authenticated non-anonymous users: redirect to /me dashboard.
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const router = useRouter();

onMounted(() => {
  const auth = getAuth();
  // Use onAuthStateChanged (not just currentUser) because Firebase Auth may
  // still be hydrating from IndexedDB on first paint after a hard refresh.
  // We unsubscribe immediately after the first emission - single-shot check.
  const unsub = onAuthStateChanged(auth, (user) => {
    unsub();
    if (user && !user.isAnonymous) {
      router.replace('/me');
    }
    // else: stay on Boot - template renders brand + sign-up CTAs.
  });
});
</script>
