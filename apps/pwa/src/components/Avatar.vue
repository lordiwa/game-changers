<script setup lang="ts">
/**
 * Avatar.vue — User avatar with initials fallback.
 *
 * UI-SPEC §11:
 *   - Rounded image with initials fallback
 *   - Optional DiscordBadge overlay if hasDiscord
 */

const props = withDefaults(
  defineProps<{
    imageUrl?: string;
    displayName?: string;
    size?: 'sm' | 'md' | 'lg';
    hasDiscord?: boolean;
  }>(),
  { size: 'md', hasDiscord: false },
);

const sizeClass = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl',
};

function initials(name: string | undefined): string {
  if (!name) return 'GG';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
</script>

<template>
  <div class="avatar relative inline-flex" :class="sizeClass[size]">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="displayName ?? 'Avatar'"
      class="w-full h-full rounded-full object-cover"
      loading="lazy"
    />
    <span
      v-else
      class="w-full h-full rounded-full flex items-center justify-center font-bold bg-accent-xp text-surface-1"
      aria-label="Avatar"
    >
      {{ initials(displayName) }}
    </span>

    <!-- Discord badge overlay -->
    <span
      v-if="hasDiscord"
      class="avatar__discord absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface-1 flex items-center justify-center"
      title="Discord vinculado"
      aria-label="Discord vinculado"
    >
      <span class="text-[10px]" aria-hidden="true">🎮</span>
    </span>
  </div>
</template>
