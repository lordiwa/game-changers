<template>
  <main class="flex flex-col items-center justify-center min-h-screen bg-surface-0 px-4 py-8">
    <div v-if="loading" class="text-center">
      <p class="text-gray-400">{{ $t('auth.discord.callback.heading') }}</p>
    </div>

    <!-- ID mismatch — possible CSRF / handoff hijack -->
    <div v-else-if="idMismatch" role="alert" class="text-center max-w-sm">
      <p class="text-red-300 font-semibold mb-2">{{ $t('auth.discord.error.id_mismatch') }}</p>
      <RouterLink to="/auth/signin" class="text-indigo-400 hover:text-indigo-300 text-sm">
        {{ $t('auth.signin.heading') }}
      </RouterLink>
    </div>

    <!-- General error (declined / other) -->
    <div v-else-if="error" role="alert" class="text-center max-w-sm">
      <p class="text-red-300 font-semibold mb-2">{{ $t('auth.discord.error.declined') }}</p>
      <p class="text-gray-400 text-sm mb-4">{{ $t('auth.discord.error.declined_body') }}</p>
      <RouterLink to="/auth/signin" class="text-indigo-400 hover:text-indigo-300 text-sm">
        {{ $t('auth.signin.heading') }}
      </RouterLink>
    </div>
  </main>
</template>

<script setup lang="ts">
/*
 * DiscordCallback.vue — handles the OAuth callback from Discord.
 *
 * Route: /auth/discord/callback?code=...&state=...
 *
 * On mount:
 *   1. Reads `code` + `state` from route.query.
 *   2. Reads `pending_discord_id` from sessionStorage (set by DiscordInit.vue).
 *   3. Calls handleDiscordCallback({ code, state }) — the function reads pkceVerifier
 *      from sessionStorage, calls discordExchange Cloud Function, and signs in.
 *   4. On success: navigates to /me and clears sessionStorage (pending_discord_id removed
 *      inside handleDiscordCallback).
 *   5. On DISCORD_ID_MISMATCH: shows mismatch error, clears sessionStorage.
 *   6. On other error: shows declined copy, leaves auth intact.
 */
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { handleDiscordCallback } from '../../composables/useDiscordLink';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(false);
const idMismatch = ref(false);

onMounted(async () => {
  const code = route.query['code'] as string | undefined;
  const state = route.query['state'] as string | undefined;

  if (!code || !state) {
    loading.value = false;
    error.value = true;
    return;
  }

  try {
    await handleDiscordCallback({ code, state });
    // Success: handleDiscordCallback clears sessionStorage including pending_discord_id.
    await router.push('/me');
  } catch (err: unknown) {
    // Clear sessionStorage regardless of error to avoid stale state.
    sessionStorage.removeItem('pending_discord_id');
    sessionStorage.removeItem('discord_oauth_state');
    sessionStorage.removeItem('discord_pkce_verifier');

    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('DISCORD_ID_MISMATCH')) {
      idMismatch.value = true;
    } else {
      error.value = true;
    }
  } finally {
    loading.value = false;
  }
});
</script>
