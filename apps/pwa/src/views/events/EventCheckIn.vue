<template>
  <!--
    Plan 02-07 — EventCheckIn view (route /events/:id/checkin).
    Organizer view: QrScanner + live attendance + manual fallback.
    Attendee view: shows their own QR for the organizer to scan.

    WCAG 2.1 AA: landmarks, live regions for scanner status.
  -->
  <main id="main-content" class="event-checkin" aria-labelledby="checkin-heading">
    <h1 id="checkin-heading" class="event-checkin__heading">
      {{ t('events.checkin.heading') }}
    </h1>

    <p v-if="event" class="event-checkin__event-name">{{ eventName }}</p>

    <!-- Organizer view -->
    <template v-if="isOrganizer">
      <section aria-label="Escáner QR">
        <QrScanner
          :event-id="eventId"
          @manual-fallback="showManualSearch = true"
          @check-in-success="onCheckInSuccess"
        />
      </section>

      <!-- Manual search fallback -->
      <section v-if="showManualSearch" class="event-checkin__manual" aria-label="Búsqueda manual">
        <h2>{{ t('events.checkin.manual_cta') }}</h2>
        <label for="search-name" class="sr-only">Buscar asistente por nombre</label>
        <input
          id="search-name"
          v-model="searchQuery"
          type="search"
          class="event-checkin__search"
          placeholder="Buscar por nombre..."
          :aria-label="'Buscar asistente por nombre'"
        />
        <ul class="event-checkin__search-results" role="list" aria-live="polite">
          <li v-for="attendee in filteredAttendees" :key="attendee.id" role="listitem">
            <button
              class="event-checkin__attendee-btn"
              :aria-label="`Hacer check-in a ${attendee.uid}`"
              @click="manualCheckIn(attendee.id)"
            >
              {{ attendee.uid }} — {{ attendee.status }}
            </button>
          </li>
        </ul>
      </section>

      <!-- Live checked-in list (last 1h) -->
      <section class="event-checkin__log" aria-label="Asistentes confirmados" aria-live="polite">
        <h2>Asistentes confirmados ({{ recentAttendance?.length ?? 0 }})</h2>
        <ul role="list">
          <li
            v-for="entry in recentAttendance"
            :key="entry.id"
            role="listitem"
            class="event-checkin__log-entry"
          >
            ✓ {{ entry.uid }}
          </li>
        </ul>
      </section>
    </template>

    <!-- Attendee view: show their own QR -->
    <template v-else>
      <div class="event-checkin__attendee-qr" aria-label="Tu código QR">
        <h2>Tu código de acceso</h2>
        <canvas ref="qrCanvas" :aria-label="'Código QR para check-in'" />
        <p class="event-checkin__qr-hint">Muéstrale este código al organizador</p>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAuth } from 'firebase/auth';
import QrScanner from '../../components/QrScanner.vue';
import { useEvent, useEventAttendance } from '../../composables/useEvents';

const route = useRoute();
const { t } = useI18n();
const eventId = computed(() => route.params.id as string);
const { event } = useEvent(eventId.value);
const { data: recentAttendance } = useEventAttendance(eventId.value);

const auth = getAuth();
const currentUid = auth.currentUser?.uid ?? '';

const isOrganizer = computed(
  () =>
    event.value?.safetyContactUid === currentUid ||
    (auth.currentUser?.getIdTokenResult !== undefined &&
      (auth.currentUser as unknown as { customClaims?: Record<string, unknown> }).customClaims?.['role'] === 'organizer'),
);

const eventName = computed(() => {
  if (!event.value) return '';
  const name = event.value.name;
  return typeof name === 'object' ? (name as { es: string }).es : String(name);
});

const showManualSearch = ref(false);
const searchQuery = ref('');
const qrCanvas = ref<HTMLCanvasElement | null>(null);

const filteredAttendees = computed(() => {
  if (!recentAttendance.value || !searchQuery.value) return [];
  const q = searchQuery.value.toLowerCase();
  return recentAttendance.value.filter((a) =>
    String(a['uid'] ?? '').toLowerCase().includes(q),
  );
});

function onCheckInSuccess(_uid: string) {
  // Refresh is handled by VueFire reactive binding on recentAttendance
}

async function manualCheckIn(_attendanceId: string) {
  // Manual check-in by organizer — calls checkIn callable with no QR
  // Phase 2 stub: organizer manually marks as checked-in
  console.log('[EventCheckIn] Manual check-in:', _attendanceId);
}

onMounted(async () => {
  if (!isOrganizer.value && qrCanvas.value) {
    // Show attendee's own QR
    const storedQr = sessionStorage.getItem(`qr_${eventId.value}`);
    if (storedQr) {
      const { default: QRCode } = await import('qrcode');
      await QRCode.toCanvas(qrCanvas.value, storedQr);
    }
  }
});
</script>

<style scoped>
.event-checkin {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.event-checkin__heading {
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.event-checkin__event-name {
  color: var(--color-text-muted, #a0a0b0);
  margin-bottom: 24px;
}

.event-checkin__manual {
  margin-top: 24px;
}

.event-checkin__search {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #3a3a5e);
  border-radius: 8px;
  background: var(--color-surface-2, #1a1a2e);
  color: var(--color-text-primary, #fff);
  font-size: 1rem;
  margin-bottom: 12px;
}

.event-checkin__search:focus {
  outline: 3px solid #51ff66;
  outline-offset: 2px;
}

.event-checkin__attendee-btn {
  width: 100%;
  padding: 12px;
  background: var(--color-surface-2, #1a1a2e);
  border: 1px solid var(--color-border, #3a3a5e);
  border-radius: 8px;
  color: var(--color-text-primary, #fff);
  text-align: left;
  cursor: pointer;
  min-height: 44px;
}

.event-checkin__log {
  margin-top: 32px;
}

.event-checkin__log-entry {
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border, #3a3a5e);
  font-size: 0.875rem;
  color: var(--color-text-secondary, #c0c0d0);
  list-style: none;
}

.event-checkin__attendee-qr {
  text-align: center;
  padding: 24px;
}

.event-checkin__qr-hint {
  color: var(--color-text-muted, #a0a0b0);
  margin-top: 8px;
  font-size: 0.875rem;
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
</style>
