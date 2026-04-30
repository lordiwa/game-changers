<template>
  <!--
    Plan 02-07 — EventList view (route /events).
    Public route — visible to unauthenticated users (RSVP gates auth).
    Uses VueFire useCollection — no onSnapshot.

    WCAG 2.1 AA: landmark regions, heading hierarchy, focus management.
  -->
  <main id="main-content" class="event-list" aria-labelledby="events-heading">
    <header class="event-list__header">
      <h1 id="events-heading">{{ t('events.list.heading') }}</h1>
    </header>

    <!-- Loading state -->
    <div v-if="pending" class="event-list__loading" aria-busy="true" aria-label="Cargando eventos...">
      <div class="event-list__skeleton" v-for="i in 3" :key="i" aria-hidden="true" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="event-list__error" role="alert">
      No pudimos cargar los eventos. Intenta de nuevo.
    </div>

    <!-- Empty state -->
    <div v-else-if="!events?.length" class="event-list__empty">
      <h2>{{ t('events.empty.heading') }}</h2>
      <p>{{ t('events.empty.body') }}</p>
      <a
        href="https://discord.gg/gamechangers"
        class="event-list__empty-cta"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('events.empty.cta')"
      >
        {{ t('events.empty.cta') }}
      </a>
    </div>

    <!-- Events grid -->
    <ul v-else class="event-list__grid" role="list">
      <li v-for="event in events" :key="event.id" role="listitem">
        <RouterLink :to="`/events/${event.id}`" class="event-list__card-link">
          <EventCard :event="event" @rsvp="handleRsvp" />
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';
import EventCard from '../../components/EventCard.vue';
import { useUpcomingEvents } from '../../composables/useEvents';
import type { EventData } from '../../composables/useEvents';
import { getAuth } from 'firebase/auth';

const { t } = useI18n();
const router = useRouter();
const { events, pending, error } = useUpcomingEvents();

function handleRsvp(event: EventData) {
  const auth = getAuth();
  if (!auth.currentUser) {
    router.push({ path: '/auth/signup', query: { return: `/events/${event.id}` } });
    return;
  }
  router.push(`/events/${event.id}`);
}
</script>

<style scoped>
.event-list {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.event-list__header {
  margin-bottom: 24px;
}

.event-list__header h1 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-text-primary, #fff);
}

.event-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.event-list__card-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.event-list__skeleton {
  height: 320px;
  background: var(--color-surface-2, #1a1a2e);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}

.event-list__empty {
  text-align: center;
  padding: 48px 16px;
}

.event-list__empty h2 {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.event-list__empty p {
  color: var(--color-text-muted, #a0a0b0);
  margin-bottom: 24px;
}

.event-list__empty-cta {
  display: inline-block;
  padding: 12px 24px;
  background: var(--color-accent-xp, #51ff66);
  color: #0f0f1a;
  font-weight: 700;
  border-radius: 8px;
  text-decoration: none;
  min-height: 44px;
  line-height: 1.2;
}

.event-list__error {
  padding: 24px;
  background: #3a1a1a;
  border-radius: 8px;
  color: #ff5151;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Mobile floor: 360px */
@media (max-width: 360px) {
  .event-list__grid {
    grid-template-columns: 1fr;
  }
}
</style>
