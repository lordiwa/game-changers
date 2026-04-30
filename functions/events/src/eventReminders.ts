/*
 * Plan 02-07 — eventReminders Cloud Function.
 *
 * Runs every 15 minutes. Finds events starting in:
 *   - 24h window (±15min tolerance): sends "Mañana es tu evento" reminder
 *   - 2h window (±15min tolerance): sends "En 2 horas" reminder
 *
 * Sends Web Push notifications via FCM Admin SDK.
 * Idempotent via /events/{eventId}/reminders/{uid}/{stage} doc lock.
 *
 * Per CLAUDE.md (D-12): WhatsApp Business broadcast is manual (existing Phase 1 channel).
 * FCM Web Push is the automated channel here.
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const WINDOW_MIN = 15 * 60; // ±15 min tolerance in seconds

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

async function sendRemindersForStage(
  db: ReturnType<typeof getFirestore>,
  windowSec: number,
  stage: '24h' | '2h',
): Promise<void> {
  const now = nowSec();
  const low = now + windowSec - WINDOW_MIN;
  const high = now + windowSec + WINDOW_MIN;

  const eventsSnap = await db
    .collection('events')
    .where('status', '==', 'published')
    .where('startsAt', '>=', low)
    .where('startsAt', '<=', high)
    .get();

  if (eventsSnap.empty) return;

  for (const eventDoc of eventsSnap.docs) {
    const eventId = eventDoc.id;
    const eventName: string =
      (eventDoc.data()['name'] as { es: string })?.es ?? eventDoc.data()['name'] ?? 'Evento';

    // Get all RSVP'd attendees for this event
    const attendanceSnap = await db
      .collection(`events/${eventId}/attendance`)
      .where('status', '==', 'rsvp')
      .get();

    for (const attendeeDoc of attendanceSnap.docs) {
      const uid: string = attendeeDoc.data()['uid'] ?? attendeeDoc.id;

      // Idempotency lock
      const reminderRef = db.doc(`events/${eventId}/reminders/${uid}_${stage}`);
      const reminderSnap = await reminderRef.get();
      if (reminderSnap.exists) continue; // already sent

      // Get FCM tokens for this user
      const fcmSnap = await db.collection(`users/${uid}/fcmTokens`).limit(5).get();
      if (fcmSnap.empty) continue;

      const tokens = fcmSnap.docs.map((d) => d.id).filter(Boolean);
      if (tokens.length === 0) continue;

      const message =
        stage === '24h'
          ? `Mañana es ${eventName} — confirma que vas`
          : `En 2 horas: ${eventName} — ¡ya prepárate!`;

      try {
        await getMessaging().sendEachForMulticast({
          tokens,
          notification: {
            title: 'GameChangers',
            body: message,
          },
          data: { eventId, stage },
          webpush: {
            notification: {
              icon: '/icons/icon-192.png',
              badge: '/icons/badge-72.png',
            },
          },
        });
      } catch (err) {
        console.error(`[eventReminders] FCM send failed uid=${uid}:`, err);
      }

      // Write idempotency lock
      await reminderRef.set({
        sentAt: FieldValue.serverTimestamp(),
        stage,
        eventId,
        uid,
      });
    }
  }
}

export const eventReminders = onSchedule(
  {
    schedule: 'every 15 minutes',
    region: 'southamerica-east1',
    timeZone: 'America/Guayaquil',
  },
  async () => {
    const db = getFirestore();
    await Promise.all([
      sendRemindersForStage(db, 24 * 3600, '24h'),
      sendRemindersForStage(db, 2 * 3600, '2h'),
    ]);
  },
);
