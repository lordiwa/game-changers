<template>
  <!--
    Plan 02-07 — QrScanner component.
    UI-SPEC §19: getUserMedia + jsqr decode at 10fps.
    Offline: Workbox Background Sync captures POST to /api/events/{id}/checkin.

    WCAG 2.1 AA:
    - Status messages via aria-live region
    - Camera video has aria-label
    - Buttons have descriptive labels
  -->
  <div class="qr-scanner" role="region" :aria-label="t('events.checkin.scan_cta')">
    <!-- Live status for screen readers -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ statusAnnouncement }}
    </div>

    <!-- Camera viewport -->
    <div class="qr-scanner__viewport" :class="{ 'qr-scanner__viewport--active': isScanning }">
      <video
        ref="videoEl"
        autoplay
        muted
        playsinline
        class="qr-scanner__video"
        :aria-label="t('events.checkin.scan_cta')"
      />
      <!-- Scan frame overlay -->
      <div class="qr-scanner__frame" aria-hidden="true" />
    </div>

    <!-- Status toast -->
    <Transition name="toast-fade">
      <div
        v-if="toastMessage"
        class="qr-scanner__toast"
        :class="`qr-scanner__toast--${toastType}`"
        role="status"
      >
        {{ toastMessage }}
        <p v-if="toastBody" class="qr-scanner__toast-body">{{ toastBody }}</p>
      </div>
    </Transition>

    <!-- Pending offline count indicator -->
    <div v-if="pendingScans > 0" class="qr-scanner__offline-badge" aria-live="polite">
      {{ pendingScans }} check-in(s) pendientes
    </div>

    <!-- Controls -->
    <div class="qr-scanner__controls">
      <button
        class="qr-scanner__btn"
        :disabled="isScanning"
        :aria-label="t('events.checkin.scan_cta')"
        @click="startScanning"
      >
        {{ isScanning ? 'Escaneando...' : t('events.checkin.scan_cta') }}
      </button>
      <button
        class="qr-scanner__btn qr-scanner__btn--secondary"
        :aria-label="t('events.checkin.manual_cta')"
        @click="$emit('manual-fallback')"
      >
        {{ t('events.checkin.manual_cta') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useCheckIn } from '../composables/useCheckIn';

const props = defineProps<{ eventId: string }>();
defineEmits<{
  (e: 'manual-fallback'): void;
  (e: 'check-in-success', uid: string): void;
}>();

const { t } = useI18n();
const { checkIn, status, pendingScans } = useCheckIn(props.eventId);

const videoEl = ref<HTMLVideoElement | null>(null);
const isScanning = ref(false);
let rafId: number | null = null;
let stream: MediaStream | null = null;

const toastMessage = computed(() => {
  switch (status.value) {
    case 'success': return t('events.checkin.success');
    case 'error_expired': return t('events.checkin.error.invalid');
    case 'error_venue': return t('events.checkin.error.invalid');
    case 'error_offline': return t('events.checkin.error.offline');
    default: return null;
  }
});

const toastBody = computed(() => {
  switch (status.value) {
    case 'error_expired': return t('events.checkin.error.invalid_body');
    case 'error_offline': return t('events.checkin.error.offline_body');
    default: return null;
  }
});

const toastType = computed(() => {
  switch (status.value) {
    case 'success': return 'success';
    case 'error_offline': return 'warning';
    default: return 'error';
  }
});

const statusAnnouncement = computed(() => toastMessage.value ?? '');

async function startScanning() {
  if (isScanning.value) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    });

    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      isScanning.value = true;
      scheduleFrame();
    }
  } catch {
    console.error('[QrScanner] Camera access denied');
  }
}

function scheduleFrame() {
  // Decode at ~10fps (every 100ms)
  rafId = requestAnimationFrame(() => {
    setTimeout(() => {
      decodeFrame();
      if (isScanning.value) scheduleFrame();
    }, 100);
  });
}

async function decodeFrame() {
  if (!videoEl.value || videoEl.value.readyState < 2) return;

  const canvas = document.createElement('canvas');
  canvas.width = videoEl.value.videoWidth;
  canvas.height = videoEl.value.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(videoEl.value, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  try {
    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      isScanning.value = false;
      stopCamera();
      await checkIn(code.data);
    }
  } catch {
    // jsqr decode errors are expected for non-QR frames
  }
}

function stopCamera() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (videoEl.value) {
    videoEl.value.srcObject = null;
  }
}

onUnmounted(stopCamera);
</script>

<style scoped>
.qr-scanner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.qr-scanner__viewport {
  position: relative;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
  aspect-ratio: 1;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
}

.qr-scanner__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-scanner__frame {
  position: absolute;
  inset: 20%;
  border: 3px solid #51ff66;
  border-radius: 8px;
}

.qr-scanner__toast {
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
}

.qr-scanner__toast--success { background: #1a3a2a; color: #51ff66; }
.qr-scanner__toast--warning { background: #3a2a1a; color: #ffaa51; }
.qr-scanner__toast--error { background: #3a1a1a; color: #ff5151; }

.qr-scanner__toast-body {
  font-weight: 400;
  font-size: 0.875rem;
  margin-top: 4px;
}

.qr-scanner__offline-badge {
  padding: 6px 12px;
  background: #3a2a1a;
  color: #ffaa51;
  border-radius: 4px;
  font-size: 0.875rem;
}

.qr-scanner__controls {
  display: flex;
  gap: 8px;
  flex-direction: column;
}

.qr-scanner__btn {
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: #51ff66;
  color: #0f0f1a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.qr-scanner__btn:disabled { opacity: 0.5; cursor: not-allowed; }
.qr-scanner__btn:focus-visible { outline: 3px solid #51ff66; outline-offset: 2px; }

.qr-scanner__btn--secondary {
  background: transparent;
  border: 2px solid #51ff66;
  color: #51ff66;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; }
</style>
