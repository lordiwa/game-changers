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
// Boot.vue — default landing after anonymous sign-in (AUTH-01).
// Expanded in Plan 05 with the /me dashboard. For now, surfaces sign-up CTA.
</script>
