<template>
  <!--
    Plan 02-07 — EventCard component.
    UI-SPEC §15: cover image, tier badge, theme tag, date, location, capacity bar,
    difficulty pill, RSVP CTA (bottom-anchored on mobile).

    WCAG 2.1 AA:
    - Capacity bar paired with text (not color-only) — T-02-07-12
    - 44×44 touch target on CTA
    - Alt text on cover image
    - Contrast: text on dark background meets 4.5:1
  -->
  <article
    class="gc-event-card"
    :aria-label="eventName"
    data-testid="event-card"
  >
    <!-- Cover image or placeholder -->
    <div class="gc-event-card__cover" aria-hidden="true">
      <img
        v-if="event.coverImage"
        :src="event.coverImage"
        :alt="eventName"
        class="gc-event-card__img"
        loading="lazy"
      />
      <div v-else class="gc-event-card__cover-placeholder">
        <span aria-hidden="true">🎮</span>
      </div>

      <!-- Tier badge -->
      <span
        class="gc-event-card__tier"
        :class="`gc-event-card__tier--${event.tier}`"
        :aria-label="`Tipo: ${tierLabel}`"
      >{{ tierLabel }}</span>
    </div>

    <div class="gc-event-card__body">
      <!-- Theme tag -->
      <p class="gc-event-card__theme" aria-label="Tema del evento">
        #{{ event.theme }}
      </p>

      <!-- Event name -->
      <h3 class="gc-event-card__name">{{ eventName }}</h3>

      <!-- Date & time -->
      <p class="gc-event-card__date">
        <time :datetime="isoDate" aria-label="Fecha y hora">{{ formattedDate }}</time>
      </p>

      <!-- Location -->
      <p v-if="event.venue" class="gc-event-card__location">
        {{ event.venue.name }}
      </p>

      <!-- Capacity bar — text + visual (T-02-07-12: not color-only) -->
      <div
        class="gc-event-card__capacity"
        :aria-label="`Capacidad: ${event.rsvpCount} de ${event.capacity} plazas`"
      >
        <div
          class="gc-event-card__capacity-bar"
          role="progressbar"
          :aria-valuenow="event.rsvpCount"
          :aria-valuemin="0"
          :aria-valuemax="event.capacity"
        >
          <div
            class="gc-event-card__capacity-fill"
            :style="{ width: `${capacityPercent}%` }"
          />
        </div>
        <span class="gc-event-card__capacity-text">
          {{ event.rsvpCount }} / {{ event.capacity }} plazas
        </span>
      </div>

      <!-- Difficulty pill -->
      <span
        class="gc-event-card__difficulty"
        :class="`gc-event-card__difficulty--${event.difficulty}`"
        :aria-label="`Nivel: ${difficultyLabel}`"
      >{{ difficultyLabel }}</span>
    </div>

    <!-- RSVP CTA — bottom-anchored, 44×44 touch target -->
    <div class="gc-event-card__footer">
      <button
        class="gc-event-card__cta"
        :aria-label="`${t('events.detail.cta_rsvp')} — ${eventName}`"
        :disabled="isFull"
        @click.prevent="$emit('rsvp', event)"
      >
        {{ isFull ? t('events.detail.cta_waitlist', 'Lista de espera') : t('events.detail.cta_rsvp') }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { formatEventDate } from '../composables/useEvents';
import type { EventData } from '../composables/useEvents';

const props = defineProps<{ event: EventData }>();
defineEmits<{ (e: 'rsvp', event: EventData): void }>();

const { t } = useI18n();

const eventName = computed(() =>
  typeof props.event.name === 'object' ? props.event.name.es : String(props.event.name),
);

const formattedDate = computed(() => formatEventDate(props.event.startsAt));

const isoDate = computed(() => {
  const ts = props.event.startsAt;
  if (!ts) return '';
  const date = typeof ts === 'number' ? new Date(ts * 1000) : (ts as { toDate(): Date }).toDate();
  return date.toISOString();
});

const capacityPercent = computed(() =>
  Math.min(100, Math.round((props.event.rsvpCount / props.event.capacity) * 100)),
);

const isFull = computed(() => props.event.rsvpCount >= props.event.capacity);

const tierLabel = computed(() => {
  const map: Record<string, string> = {
    meetup: 'Meetup',
    general: 'Evento',
    club_session: 'Club Session',
  };
  return map[props.event.tier] ?? props.event.tier;
});

const difficultyLabel = computed(() => {
  const map: Record<string, string> = {
    chill: 'Chill',
    activo: 'Activo',
    intenso: 'Intenso',
  };
  return map[props.event.difficulty] ?? props.event.difficulty;
});
</script>

<style scoped>
.gc-event-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface-2, #1a1a2e);
  border-radius: 12px;
  overflow: hidden;
  min-width: 0;
}

.gc-event-card__cover {
  position: relative;
  height: 160px;
  background: var(--color-surface-3, #2a2a3e);
}

.gc-event-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gc-event-card__cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 3rem;
}

.gc-event-card__tier {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
}

.gc-event-card__body {
  padding: 12px 16px;
  flex: 1;
}

.gc-event-card__theme {
  font-size: 0.75rem;
  color: var(--color-text-muted, #a0a0b0);
  margin: 0 0 4px;
}

.gc-event-card__name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--color-text-primary, #fff);
}

.gc-event-card__date,
.gc-event-card__location {
  font-size: 0.875rem;
  color: var(--color-text-secondary, #c0c0d0);
  margin: 0 0 4px;
}

.gc-event-card__capacity {
  margin: 8px 0;
}

.gc-event-card__capacity-bar {
  height: 6px;
  background: var(--color-surface-3, #2a2a3e);
  border-radius: 3px;
  overflow: hidden;
}

.gc-event-card__capacity-fill {
  height: 100%;
  background: var(--color-accent-xp, #51ff66);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.gc-event-card__capacity-text {
  font-size: 0.75rem;
  color: var(--color-text-muted, #a0a0b0);
  display: block;
  margin-top: 2px;
}

.gc-event-card__difficulty {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
}

.gc-event-card__difficulty--chill { background: #1a3a2a; color: #51ff66; }
.gc-event-card__difficulty--activo { background: #1a2a3a; color: #51aaff; }
.gc-event-card__difficulty--intenso { background: #3a1a1a; color: #ff5151; }

.gc-event-card__footer {
  padding: 12px 16px;
}

.gc-event-card__cta {
  display: block;
  width: 100%;
  min-height: 44px; /* 44px touch target */
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.gc-event-card__cta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gc-event-card__cta:focus-visible {
  outline: 3px solid var(--color-accent-xp, #51ff66);
  outline-offset: 2px;
}
</style>
