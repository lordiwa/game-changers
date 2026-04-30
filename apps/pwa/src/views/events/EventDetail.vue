<template>
  <!--
    Plan 02-07 — EventDetail view (route /events/:id).
    Public route. RSVP gates auth + event_participation consent.
    Displays safety contact (required field — EVNT-14).
    Report-user button at bottom (subtle, not screaming).

    WCAG 2.1 AA: skip link, landmark regions, heading hierarchy.
  -->
  <main id="main-content" class="event-detail" v-if="event">
    <!-- Skip navigation -->
    <a href="#event-cta" class="skip-link">Ir al botón de inscripción</a>

    <!-- Event header -->
    <header class="event-detail__header">
      <p class="event-detail__tier">{{ tierLabel }}</p>
      <h1 class="event-detail__name">{{ eventName }}</h1>
      <p class="event-detail__theme" aria-label="Tema">#{{ event.theme }}</p>
    </header>

    <!-- Event info section -->
    <section class="event-detail__info" aria-label="Información del evento">
      <!-- Date & time -->
      <div class="event-detail__field">
        <span class="event-detail__field-label">Fecha y hora</span>
        <span class="event-detail__field-value">{{ formattedDate }}</span>
      </div>

      <!-- Location + Google Maps link -->
      <div class="event-detail__field" v-if="event.venue">
        <span class="event-detail__field-label">Lugar</span>
        <span class="event-detail__field-value">{{ event.venue.name }}</span>
        <span class="event-detail__field-value">{{ event.venue.address }}</span>
        <a
          v-if="event.mapsUrl"
          :href="event.mapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="event-detail__maps-link"
          :aria-label="`Ver ${event.venue.name} en Google Maps (abre en nueva pestaña)`"
        >
          Ver en Google Maps
        </a>
      </div>

      <!-- Capacity bar -->
      <div
        class="event-detail__capacity"
        :aria-label="`Capacidad: ${event.rsvpCount} de ${event.capacity} plazas`"
      >
        <div
          class="event-detail__capacity-bar"
          role="progressbar"
          :aria-valuenow="event.rsvpCount"
          :aria-valuemin="0"
          :aria-valuemax="event.capacity"
        >
          <div class="event-detail__capacity-fill" :style="{ width: `${capacityPercent}%` }" />
        </div>
        <span class="event-detail__capacity-text">
          {{ event.rsvpCount }} / {{ event.capacity }} plazas
        </span>
      </div>

      <!-- Difficulty -->
      <div class="event-detail__field">
        <span class="event-detail__field-label">Nivel</span>
        <span class="event-detail__difficulty" :class="`event-detail__difficulty--${event.difficulty}`">
          {{ difficultyLabel }}
        </span>
      </div>

      <!-- What to bring -->
      <div class="event-detail__field" v-if="event.whatToBring?.length">
        <span class="event-detail__field-label">{{ t('events.detail.what_to_bring') }}</span>
        <ul class="event-detail__what-to-bring">
          <li v-for="item in event.whatToBring" :key="item">{{ item }}</li>
        </ul>
      </div>

      <!-- Safety contact (required — EVNT-14) -->
      <div
        class="event-detail__safety"
        v-if="event.safetyContactUid"
        role="note"
        aria-label="Contacto de seguridad del evento"
      >
        <span class="event-detail__safety-icon" aria-hidden="true">🛡️</span>
        <span>Contacto de seguridad asignado</span>
      </div>
      <div v-else class="event-detail__safety-missing" role="alert">
        Este evento aún no tiene contacto de seguridad asignado.
        La inscripción estará disponible cuando se asigne uno.
      </div>
    </section>

    <!-- Post-RSVP QR section -->
    <section v-if="userQrPayload" class="event-detail__qr" aria-label="Tu código QR de check-in">
      <h2>Tu código de acceso</h2>
      <canvas ref="qrCanvas" class="event-detail__qr-canvas" aria-label="Código QR para check-in" />
      <p class="event-detail__qr-hint">Muéstralo al entrar al evento</p>
      <RouterLink
        :to="`/events/${event.id}/checkin`"
        class="event-detail__checkin-link"
      >
        Hacer check-in con cámara
      </RouterLink>
    </section>

    <!-- Report button (subtle) -->
    <div class="event-detail__report">
      <button
        class="event-detail__report-btn"
        :aria-label="t('events.report.cta')"
        @click="reportModal = true"
      >
        {{ t('events.report.cta') }}
      </button>
    </div>

    <!-- Bottom-anchored RSVP CTA -->
    <div class="event-detail__cta-bar" id="event-cta">
      <button
        v-if="!userQrPayload"
        class="event-detail__cta"
        :disabled="!event.safetyContactUid || isRsvping"
        :aria-label="ctaLabel"
        @click="handleRsvp"
      >
        {{ isRsvping ? 'Procesando...' : ctaLabel }}
      </button>
      <RouterLink
        v-else
        :to="`/events/${event.id}/checkin`"
        class="event-detail__cta event-detail__cta--checkin"
      >
        Hacer check-in
      </RouterLink>
    </div>
  </main>

  <!-- Loading -->
  <div v-else-if="pending" class="event-detail__loading" aria-busy="true" aria-label="Cargando evento..." />

  <!-- Walk-in modal for unauthenticated -->
  <Teleport to="body">
    <div v-if="walkInModal" class="walkin-modal-overlay" @click.self="walkInModal = false">
      <div class="walkin-modal" role="dialog" aria-label="Apuntarme al evento" aria-modal="true">
        <h2>{{ t('events.detail.cta_walkin') }}</h2>
        <p>Déjanos tu nombre y teléfono para anotarte al evento.</p>
        <form @submit.prevent="handleWalkIn" novalidate>
          <label>
            Nombre
            <input v-model="walkInName" type="text" minlength="2" required />
          </label>
          <label>
            WhatsApp (+593...)
            <input v-model="walkInPhone" type="tel" pattern="^\+\d{8,15}$" required />
          </label>
          <button type="submit" :disabled="walkInSubmitting">
            {{ walkInSubmitting ? 'Enviando...' : 'Apuntarme' }}
          </button>
        </form>
      </div>
    </div>
  </Teleport>

  <!-- Report user modal -->
  <ReportUserModal
    v-if="event"
    :is-open="reportModal"
    :reported-uid="event.safetyContactUid ?? ''"
    :display-name="'alguien en este evento'"
    :event-id="event.id"
    @close="reportModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useRoute, RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAuth } from 'firebase/auth';
import ReportUserModal from '../../components/ReportUserModal.vue';
import {
  useEvent,
  callRsvp,
  callWalkInCapture,
  formatEventDate,
} from '../../composables/useEvents';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const eventId = computed(() => route.params.id as string);
const { event, pending } = useEvent(eventId.value);

const reportModal = ref(false);
const walkInModal = ref(false);
const walkInName = ref('');
const walkInPhone = ref('');
const walkInSubmitting = ref(false);
const isRsvping = ref(false);
const userQrPayload = ref<string | null>(null);
const qrCanvas = ref<HTMLCanvasElement | null>(null);

const eventName = computed(() =>
  event.value
    ? typeof event.value.name === 'object'
      ? (event.value.name as { es: string }).es
      : String(event.value.name)
    : '',
);

const formattedDate = computed(() => formatEventDate(event.value?.startsAt));
const capacityPercent = computed(() =>
  event.value
    ? Math.min(100, Math.round((event.value.rsvpCount / event.value.capacity) * 100))
    : 0,
);

const isFull = computed(() =>
  event.value ? event.value.rsvpCount >= event.value.capacity : false,
);

const tierLabel = computed(() => {
  const map: Record<string, string> = { meetup: 'Meetup', general: 'Evento', club_session: 'Club' };
  return event.value ? (map[event.value.tier] ?? event.value.tier) : '';
});

const difficultyLabel = computed(() => {
  const map: Record<string, string> = { chill: 'Chill', activo: 'Activo', intenso: 'Intenso' };
  return event.value ? (map[event.value.difficulty] ?? '') : '';
});

const ctaLabel = computed(() => {
  if (!event.value?.safetyContactUid) return 'Inscripción no disponible';
  return isFull.value
    ? 'Unirme a la lista de espera'
    : t('events.detail.cta_rsvp');
});

async function handleRsvp() {
  const auth = getAuth();
  if (!auth.currentUser) {
    // Unauthenticated → walk-in modal
    walkInModal.value = true;
    return;
  }
  if (auth.currentUser.isAnonymous) {
    router.push({ path: '/auth/signup', query: { return: `/events/${eventId.value}` } });
    return;
  }

  isRsvping.value = true;
  try {
    const result = await callRsvp(eventId.value);
    if (result.data.qrPayload) {
      userQrPayload.value = result.data.qrPayload;
      // Render QR to canvas
      await nextTick();
      if (qrCanvas.value) {
        const { default: QRCode } = await import('qrcode');
        await QRCode.toCanvas(qrCanvas.value, result.data.qrPayload);
      }
    }
  } catch (err) {
    console.error('[EventDetail] RSVP failed:', err);
  } finally {
    isRsvping.value = false;
  }
}

async function handleWalkIn() {
  if (!walkInName.value || !walkInPhone.value) return;
  walkInSubmitting.value = true;
  try {
    await callWalkInCapture({
      eventId: eventId.value,
      name: walkInName.value,
      phone: walkInPhone.value,
    });
    walkInModal.value = false;
  } catch (err) {
    console.error('[EventDetail] Walk-in failed:', err);
  } finally {
    walkInSubmitting.value = false;
  }
}
</script>

<style scoped>
.event-detail {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 96px; /* space for fixed CTA bar */
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 16px;
  background: #51ff66;
  color: #0f0f1a;
  padding: 8px 16px;
  border-radius: 4px;
  z-index: 100;
  font-weight: 700;
}
.skip-link:focus { top: 16px; }

.event-detail__header {
  margin-bottom: 24px;
}
.event-detail__tier {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-accent-xp, #51ff66);
  margin: 0 0 4px;
}
.event-detail__name {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 4px;
}
.event-detail__theme {
  color: var(--color-text-muted, #a0a0b0);
  margin: 0;
}

.event-detail__info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}
.event-detail__field-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #a0a0b0);
  margin-bottom: 4px;
}
.event-detail__maps-link {
  color: var(--color-accent-xp, #51ff66);
  font-size: 0.875rem;
  display: block;
  margin-top: 4px;
}
.event-detail__capacity-bar {
  height: 8px;
  background: var(--color-surface-3, #2a2a3e);
  border-radius: 4px;
  overflow: hidden;
}
.event-detail__capacity-fill {
  height: 100%;
  background: var(--color-accent-xp, #51ff66);
  border-radius: 4px;
}
.event-detail__capacity-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #c0c0d0);
  display: block;
  margin-top: 4px;
}
.event-detail__difficulty {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 600;
  display: inline-block;
}
.event-detail__difficulty--chill { background: #1a3a2a; color: #51ff66; }
.event-detail__difficulty--activo { background: #1a2a3a; color: #51aaff; }
.event-detail__difficulty--intenso { background: #3a1a1a; color: #ff5151; }

.event-detail__what-to-bring {
  margin: 4px 0 0 16px;
  padding: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary, #c0c0d0);
}

.event-detail__safety {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #1a2a1a;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #51ff66;
  font-weight: 600;
}
.event-detail__safety-missing {
  padding: 12px;
  background: #3a1a1a;
  border-radius: 8px;
  color: #ff5151;
  font-size: 0.875rem;
}

.event-detail__qr {
  text-align: center;
  margin-bottom: 24px;
}
.event-detail__qr-canvas {
  max-width: 200px;
  width: 100%;
  border-radius: 8px;
}
.event-detail__qr-hint {
  color: var(--color-text-muted, #a0a0b0);
  font-size: 0.875rem;
}
.event-detail__checkin-link {
  display: inline-block;
  margin-top: 8px;
  color: var(--color-accent-xp, #51ff66);
  font-weight: 600;
}

.event-detail__report {
  margin: 24px 0;
  text-align: center;
}
.event-detail__report-btn {
  background: none;
  border: none;
  color: var(--color-text-muted, #a0a0b0);
  font-size: 0.875rem;
  cursor: pointer;
  min-height: 44px;
  padding: 8px 16px;
  text-decoration: underline;
}
.event-detail__report-btn:focus-visible {
  outline: 3px solid #51ff66;
  outline-offset: 2px;
  border-radius: 4px;
}

.event-detail__cta-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: var(--color-surface-1, #0f0f1a);
  border-top: 1px solid var(--color-border, #2a2a3e);
}
.event-detail__cta {
  display: block;
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: 10px;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.event-detail__cta:disabled { opacity: 0.5; cursor: not-allowed; }
.event-detail__cta:focus-visible { outline: 3px solid #51ff66; outline-offset: 2px; }
.event-detail__cta--checkin { display: block; text-align: center; text-decoration: none; line-height: 52px; }

.walkin-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.walkin-modal {
  background: #1a1a2e;
  border-radius: 16px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
}
</style>
