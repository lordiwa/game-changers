/*
 * Plan 02-07 — waitlistPromote Cloud Function.
 *
 * Triggered by Pub/Sub topic 'events-capacity-changed' (published by cancelRsvp).
 * Idempotent: uses a Firestore transaction to pick the oldest waitlist entry by FIFO
 * (rsvpAt ascending) and promotes it to 'rsvp'. Publishes a notification.
 *
 * EVNT-04 GAP: Auto-promote from waitlist was missing; this Function closes that gap.
 *
 * Threats: T-02-07-02 (jti idempotency in checkIn) is complementary to this.
 */
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const waitlistPromote = onMessagePublished(
  { topic: 'events-capacity-changed', region: 'southamerica-east1' },
  async (event) => {
    let eventId: string;
    try {
      const data = Buffer.from(event.data.message.data, 'base64').toString('utf-8');
      ({ eventId } = JSON.parse(data) as { eventId: string });
    } catch {
      console.error('[waitlistPromote] Could not parse Pub/Sub message');
      return;
    }

    if (!eventId) {
      console.error('[waitlistPromote] Missing eventId in message');
      return;
    }

    const db = getFirestore();
    const eventRef = db.doc(`events/${eventId}`);

    await db.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists) return;

      const event = eventSnap.data()!;
      const rsvpCount: number = event['rsvpCount'] ?? 0;
      const capacity: number = event['capacity'] ?? 0;
      const waitlistCount: number = event['waitlistCount'] ?? 0;

      if (rsvpCount >= capacity || waitlistCount === 0) return;

      // Find oldest waitlist entry (FIFO by rsvpAt)
      const waitlistSnap = await db
        .collection(`events/${eventId}/attendance`)
        .where('status', '==', 'waitlist')
        .orderBy('rsvpAt', 'asc')
        .limit(1)
        .get();

      if (waitlistSnap.empty) return;

      const promoteeDoc = waitlistSnap.docs[0]!;
      const promoteeUid: string = promoteeDoc.data()['uid'] ?? promoteeDoc.id;

      tx.update(promoteeDoc.ref, {
        status: 'rsvp',
        promotedAt: FieldValue.serverTimestamp(),
      });
      tx.update(eventRef, {
        rsvpCount: FieldValue.increment(1),
        waitlistCount: FieldValue.increment(-1),
      });

      // Write a notification doc for the promoted user (FCM/Web Push picks it up)
      const notifRef = db.collection(`users/${promoteeUid}/notifications`).doc();
      tx.set(notifRef, {
        type: 'waitlist_promoted',
        eventId,
        message: 'Te promocionaron — entras al evento',
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  },
);
