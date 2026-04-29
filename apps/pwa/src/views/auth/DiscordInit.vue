<template>
  <main class="flex flex-col items-center justify-center min-h-screen bg-surface-0 px-4 py-8">
    <!-- Loading state while decoding the link token and redirecting -->
    <div v-if="loading" class="text-center">
      <p class="text-gray-400">{{ $t('auth.discord.callback.heading') }}</p>
    </div>

    <!-- Error state — expired / invalid link token -->
    <div v-else-if="error" role="alert" class="text-center max-w-sm">
      <p class="text-red-300 font-semibold mb-2">{{ $t('auth.discord.link_expired') }}</p>
      <p class="text-gray-400 text-sm">{{ $t('auth.discord.link_expired_body') }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
/*
 * DiscordInit.vue — entry point for the Discord bot's /link command handoff.
 *
 * Route: /auth/discord/init?t=<linkToken>
 *
 * On mount:
 *   1. Reads `t` query param (the signed JWT from the bot /link command).
 *   2. Calls useDiscordLink().decodeLinkToken(t) — verifies JWT signature + exp.
 *   3. Stashes discordId in sessionStorage as `pending_discord_id` (T-02-02-11).
 *   4. Calls startDiscordLink() to redirect to Discord OAuth.
 *
 * On decode failure (expired / invalid JWT): renders the `auth.discord.link_expired`
 * error with a CTA to retry from the bot.
 *
 * Acceptance criterion: router/index.ts contains path '/auth/discord/init';
 * this component uses decodeLinkToken, sets sessionStorage pending_discord_id,
 * and calls startDiscordLink.
 */
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { decodeLinkToken, startDiscordLink } from '../../composables/useDiscordLink';

const route = useRoute();
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  const t = route.query['t'] as string | undefined;
  if (!t) {
    loading.value = false;
    error.value = true;
    return;
  }
  try {
    const { discordId } = await decodeLinkToken(t);
    sessionStorage.setItem('pending_discord_id', discordId);
    await startDiscordLink();
    // startDiscordLink() redirects away — if we're still here, something failed.
  } catch {
    loading.value = false;
    error.value = true;
  }
});
</script>
