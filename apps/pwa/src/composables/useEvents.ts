/*
 * Plan 02-07 — useEvents composable.
 *
 * Provides event data access via VueFire useDocument/useCollection.
 * Follows the no-onSnapshot rule: all subscriptions via VueFire reactive bindings.
 * Does NOT use onSnapshot directly (ESLint rule from Plan 01).
 */
import { computed } from 'vue';
import { useCollection, useDocument } from 'vuefire';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  getFirestore,
  type Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface EventVenue {
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface EventData {
  id?: string;
  tier: 'meetup' | 'general' | 'club_session';
  name: { es: string; en: string };
  theme: string;
  startsAt: Timestamp | number;
  endsAt?: Timestamp | number;
  venue: EventVenue;
  mapsUrl?: string;
  capacity: number;
  rsvpCount: number;
  waitlistCount?: number;
  difficulty: 'chill' | 'activo' | 'intenso';
  whatToBring?: string[];
  safetyContactUid?: string;
  status: string;
}

/** Get upcoming events (public, paginated). */
export function useUpcomingEvents(maxEvents = 20) {
  const db = getFirestore();
  const now = Math.floor(Date.now() / 1000);

  const eventsQuery = query(
    collection(db, 'events'),
    where('status', '==', 'published'),
    where('startsAt', '>=', now),
    orderBy('startsAt', 'asc'),
    limit(maxEvents),
  );

  const { data: events, pending, error } = useCollection<EventData>(eventsQuery);
  return { events, pending, error };
}

/** Get a single event by ID. */
export function useEvent(eventId: string) {
  const db = getFirestore();
  const { data: event, pending, error } = useDocument<EventData>(doc(db, 'events', eventId));
  return { event, pending, error };
}

/** Get attendance for a specific event (organizer view). */
export function useEventAttendance(eventId: string) {
  const db = getFirestore();
  const now = Math.floor(Date.now() / 1000) - 3600; // last 1h

  const attendanceQuery = query(
    collection(db, `events/${eventId}/attendance`),
    where('status', '==', 'checked_in'),
    where('checkedInAt', '>=', now),
    orderBy('checkedInAt', 'desc'),
  );

  return useCollection(attendanceQuery);
}

/** Call the rsvp Cloud Function. */
export async function callRsvp(eventId: string) {
  const fns = getFunctions();
  const fn = httpsCallable<{ eventId: string }, { ok: boolean; status: string; qrPayload: string }>(fns, 'rsvp');
  return fn({ eventId });
}

/** Call the cancelRsvp Cloud Function. */
export async function callCancelRsvp(eventId: string) {
  const fns = getFunctions();
  const fn = httpsCallable<{ eventId: string }, { ok: boolean }>(fns, 'cancelRsvp');
  return fn({ eventId });
}

/** Call the reportUser Cloud Function. */
export async function callReportUser(data: {
  reportedUid: string;
  eventId?: string;
  reason: string;
  freeText: string;
}) {
  const fns = getFunctions();
  const fn = httpsCallable<typeof data, { ok: boolean; reportId: string }>(fns, 'reportUser');
  return fn(data);
}

/** Call the walkInCapture HTTP function. */
export async function callWalkInCapture(data: {
  eventId: string;
  name: string;
  phone: string;
}) {
  const response = await fetch('/api/events/walk-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Walk-in capture failed');
  return response.json() as Promise<{ ok: boolean; walkInId: string }>;
}

/** Format a startsAt value as a readable string. */
export function formatEventDate(startsAt: Timestamp | number | undefined): string {
  if (!startsAt) return '';
  const date = typeof startsAt === 'number'
    ? new Date(startsAt * 1000)
    : (startsAt as Timestamp).toDate();
  return date.toLocaleDateString('es-EC', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get computed difficulty label. */
export function useDifficultyLabel(difficulty: 'chill' | 'activo' | 'intenso') {
  return computed(() => {
    const map = { chill: 'Chill', activo: 'Activo', intenso: 'Intenso' };
    return map[difficulty] ?? difficulty;
  });
}
