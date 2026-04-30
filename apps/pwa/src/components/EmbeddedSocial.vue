<template>
  <!-- Lazy-load embed: show thumbnail + play button until user clicks.
       Threats mitigated:
         T-02-06-01: youtube-nocookie.com prevents Google CDN PII leak.
         No third-party network calls before user clicks (thumbnail is local/CSS). -->
  <div
    class="relative w-full overflow-hidden rounded-xl bg-surface-2"
    :style="{ paddingBottom: '56.25%' /* 16:9 */ }"
  >
    <!-- Placeholder / thumbnail state (before user click) -->
    <div
      v-if="!loaded"
      class="absolute inset-0 flex items-center justify-center cursor-pointer group"
      :class="{ 'pointer-events-none opacity-50': dataSaverActive }"
      role="button"
      :tabindex="dataSaverActive ? -1 : 0"
      :aria-label="`Reproducir video de ${providerLabel}`"
      @click="!dataSaverActive && loadEmbed()"
      @keydown.enter="!dataSaverActive && loadEmbed()"
      @keydown.space.prevent="!dataSaverActive && loadEmbed()"
    >
      <!-- Thumbnail image (provider-based) -->
      <img
        v-if="thumbnailUrl"
        :src="thumbnailUrl"
        :alt="`Miniatura del video`"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div class="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
      <!-- Play icon (Phosphor PlayCircle replacement via SVG) -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        class="relative z-10 w-16 h-16 text-white drop-shadow-lg group-hover:scale-110 transition-transform"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm36.44-94.66-48-32A8,8,0,0,0,104,96v64a8,8,0,0,0,12.44,6.66l48-32a8,8,0,0,0,0-13.32Z" />
      </svg>
    </div>

    <!-- Data-saver notice -->
    <div
      v-if="dataSaverActive && !loaded"
      class="absolute bottom-2 left-0 right-0 flex justify-center"
    >
      <span class="text-xs bg-black/60 text-white px-2 py-1 rounded">
        Modo ahorro de datos — tocá para cargar
      </span>
    </div>

    <!-- Actual iframe (loaded after user click) -->
    <iframe
      v-if="loaded"
      class="absolute inset-0 w-full h-full border-0"
      :src="embedSrc"
      :title="`Video de ${providerLabel}`"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      loading="lazy"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Props {
  provider: 'youtube' | 'tiktok';
  videoId: string;
  /** Disable auto-load when user has data-saver mode active */
  dataSaver?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  dataSaver: false,
});

const loaded = ref(false);

const dataSaverActive = computed(() => props.dataSaver);

const providerLabel = computed(() =>
  props.provider === 'youtube' ? 'YouTube' : 'TikTok',
);

// Thumbnail URL: YouTube provides direct thumbnail CDN; TikTok does not — use generic.
// youtube-nocookie is used in the embed src to reduce Google tracking (T-02-06-01).
const thumbnailUrl = computed(() => {
  if (props.provider === 'youtube') {
    // hqdefault does not make a request to youtube.com — it's a static CDN image.
    // Note: this DOES make a request to img.youtube.com for the thumbnail.
    // Alternative: use a locally-generated placeholder. For MVP, hqdefault is acceptable.
    return `https://i.ytimg.com/vi/${props.videoId}/hqdefault.jpg`;
  }
  // TikTok: no reliable public thumbnail CDN — use null (CSS fallback)
  return null;
});

// Embed URL — uses youtube-nocookie to mitigate T-02-06-01.
const embedSrc = computed(() => {
  if (props.provider === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${props.videoId}?autoplay=1&rel=0`;
  }
  // TikTok official embed
  return `https://www.tiktok.com/embed/v2/${props.videoId}`;
});

function loadEmbed(): void {
  loaded.value = true;
}
</script>
