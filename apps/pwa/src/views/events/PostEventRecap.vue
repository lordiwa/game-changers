<template>
  <!--
    Plan 02-07 — PostEventRecap view (route /events/:id/recap).
    Shows post-event feedback form (NPS + qualitative + optional wellness).
    Wellness gated by health_self_reports consent.
    Shows shareable card link (signed URL from postEventCard Function).
  -->
  <main id="main-content" class="post-event-recap" aria-labelledby="recap-heading">
    <h1 id="recap-heading">Recap del evento</h1>
    <p v-if="event" class="post-event-recap__event-name">{{ eventName }}</p>

    <!-- NPS survey -->
    <section class="post-event-recap__survey" aria-label="Encuesta post-evento">
      <h2>¿Cómo estuvo el evento?</h2>

      <fieldset class="post-event-recap__nps">
        <legend>Del 0 al 10, ¿qué tan probable es que lo recomiendes a un amigo?</legend>
        <div class="post-event-recap__nps-grid" role="radiogroup" aria-label="Puntaje NPS 0 a 10">
          <label
            v-for="n in 11"
            :key="n - 1"
            class="post-event-recap__nps-label"
          >
            <input
              type="radio"
              :value="n - 1"
              v-model="nps"
              :aria-label="`${n - 1} de 10`"
            />
            <span>{{ n - 1 }}</span>
          </label>
        </div>
      </fieldset>

      <label for="qualitative" class="post-event-recap__label">
        ¿Qué fue lo mejor? (opcional)
      </label>
      <textarea
        id="qualitative"
        v-model="qualitative"
        class="post-event-recap__textarea"
        rows="3"
        maxlength="1000"
        placeholder="Cuéntanos qué destacarías..."
      />

      <!-- Wellness opt-in (consent-gated) -->
      <div class="post-event-recap__wellness">
        <label class="post-event-recap__wellness-toggle">
          <input type="checkbox" v-model="includeWellness" />
          Incluir reporte de bienestar (opcional — requiere permiso)
        </label>
        <div v-if="includeWellness" class="post-event-recap__wellness-fields">
          <label>
            Nivel de estrés (1-10)
            <input type="range" v-model.number="stressLevel" min="1" max="10" />
            <span>{{ stressLevel }}</span>
          </label>
          <label>
            Nivel de conexión social (1-10)
            <input type="range" v-model.number="socialLevel" min="1" max="10" />
            <span>{{ socialLevel }}</span>
          </label>
        </div>
      </div>

      <button
        class="post-event-recap__submit"
        :disabled="nps === null || isSubmitting"
        @click="submitFeedback"
        aria-label="Enviar reseña del evento"
      >
        {{ isSubmitting ? 'Enviando...' : 'Enviar reseña' }}
      </button>

      <p v-if="submitted" class="post-event-recap__success" role="status">
        ¡Gracias! Tu reseña fue registrada. GG
      </p>
    </section>

    <!-- Shareable card -->
    <section v-if="cardUrl" class="post-event-recap__card" aria-label="Tu tarjeta del evento">
      <h2>Tu tarjeta del evento</h2>
      <img :src="cardUrl" alt="Tarjeta del evento GameChangers" class="post-event-recap__card-img" />
      <a
        :href="cardUrl"
        download="recap-gamechangers.png"
        class="post-event-recap__download"
        aria-label="Descargar tarjeta del evento"
      >
        Descargar tarjeta
      </a>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEvent } from '../../composables/useEvents';

const route = useRoute();
const { t } = useI18n();
const eventId = computed(() => route.params.id as string);
const { event } = useEvent(eventId.value);

const eventName = computed(() => {
  if (!event.value) return '';
  const name = event.value.name;
  return typeof name === 'object' ? (name as { es: string }).es : String(name);
});

const nps = ref<number | null>(null);
const qualitative = ref('');
const includeWellness = ref(false);
const stressLevel = ref(5);
const socialLevel = ref(5);
const isSubmitting = ref(false);
const submitted = ref(false);
const cardUrl = ref<string | null>(null);

async function submitFeedback() {
  if (nps.value === null) return;
  isSubmitting.value = true;

  try {
    const fns = getFunctions(undefined, 'southamerica-east1');
    const fn = httpsCallable(fns, 'postEventFeedback');
    await fn({
      eventId: eventId.value,
      nps: nps.value,
      qualitative: qualitative.value || undefined,
      wellness: includeWellness.value
        ? { stress: stressLevel.value, social: socialLevel.value }
        : undefined,
    });
    submitted.value = true;

    // Try to generate post-event card
    const cardFn = httpsCallable<{ eventId: string }, { ok: boolean; signedUrl?: string }>(
      fns, 'generatePostEventCard',
    );
    const cardResult = await cardFn({ eventId: eventId.value });
    if (cardResult.data.ok && cardResult.data.signedUrl) {
      cardUrl.value = cardResult.data.signedUrl;
    }
  } catch (err) {
    console.error('[PostEventRecap] submit error:', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.post-event-recap {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.post-event-recap__event-name {
  color: var(--color-text-muted, #a0a0b0);
  margin-bottom: 24px;
}

.post-event-recap__survey {
  margin-bottom: 32px;
}

.post-event-recap__nps {
  border: none;
  padding: 0;
  margin: 0 0 16px;
}

.post-event-recap__nps-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.post-event-recap__nps-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
}

.post-event-recap__nps-label input {
  margin-bottom: 4px;
}

.post-event-recap__label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 12px 0 4px;
}

.post-event-recap__textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #3a3a5e);
  border-radius: 8px;
  background: var(--color-surface-2, #1a1a2e);
  color: var(--color-text-primary, #fff);
  font-size: 1rem;
  resize: vertical;
  box-sizing: border-box;
}

.post-event-recap__wellness {
  margin: 16px 0;
  padding: 12px;
  background: var(--color-surface-2, #1a1a2e);
  border-radius: 8px;
}

.post-event-recap__submit {
  display: block;
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-top: 16px;
}

.post-event-recap__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.post-event-recap__submit:focus-visible {
  outline: 3px solid #51ff66;
  outline-offset: 2px;
}

.post-event-recap__success {
  color: #51ff66;
  font-weight: 600;
  margin-top: 12px;
  text-align: center;
}

.post-event-recap__card {
  text-align: center;
}

.post-event-recap__card-img {
  max-width: 300px;
  width: 100%;
  border-radius: 12px;
  margin: 16px auto;
  display: block;
}

.post-event-recap__download {
  display: inline-block;
  padding: 12px 24px;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  min-height: 44px;
}
</style>
