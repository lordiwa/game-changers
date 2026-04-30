/*
 * Plan 02-07 — rsvp + cancelRsvp Cloud Functions.
 *
 * rsvp: Authenticated callable. Consent-gated (event_participation).
 *   1. consentGate(uid, 'event_participation')
 *   2. If rsvpCount < capacity → status: 'rsvp'; else → status: 'waitlist'
 *   3. Generates signed JWT QR payload (jose HS256, exp = startsAt + 4h)
 *   4. Returns { ok, status, qrPayload }
 *
 * cancelRsvp: Authenticated callable.
 *   - Updates attendance to 'cancelled', decrements counts, publishes events-capacity-changed
 *
 * Threats mitigated:
 *   T-02-07-01: QR signed by server; verified server-side in checkIn.ts
 *   T-02-07-02: jti is attendance doc ID (used as idempotency key in checkIn)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { SignJWT } from 'jose';
import { PubSub } from '@google-cloud/pubsub';
import { consentGate } from '@gamechangers/functions-shared/ConsentEnforcement';
import { z } from 'zod';

const QR_SIGNING_KEY = defineSecret('QR_SIGNING_KEY');

const RsvpSchema = z.object({ eventId: z.string().min(1) });
const CancelSchema = z.object({ eventId: z.string().min(1) });

export const rsvp = onCall(
  { region: 'southamerica-east1', secrets: [QR_SIGNING_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');

    const parsed = RsvpSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { eventId } = parsed.data;

    // Consent gate — throws permission-denied if not granted
    await consentGate(uid, 'event_participation');

    const db = getFirestore();
    const eventRef = db.doc(`events/${eventId}`);
    const eventSnap = await eventRef.get();

    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found');

    const event = eventSnap.data()!;

    // Per-event safety contact is required; RSVP is blocked if missing
    if (!event['safetyContactUid']) {
      throw new HttpsError(
        'failed-precondition',
        'SAFETY_CONTACT_REQUIRED: Event has no safety contact assigned',
      );
    }

    const attendanceRef = db.doc(`events/${eventId}/attendance/${uid}`);
    const existingSnap = await attendanceRef.get();
    if (existingSnap.exists && existingSnap.data()?.['status'] === 'rsvp') {
      // Already RSVP'd — return existing QR
      return { ok: true, status: 'rsvp', qrPayload: existingSnap.data()?.['qrPayload'] ?? null };
    }

    const rsvpCount: number = event['rsvpCount'] ?? 0;
    const capacity: number = event['capacity'] ?? 0;
    const status = rsvpCount < capacity ? 'rsvp' : 'waitlist';

    // Generate QR JWT payload (jose HS256)
    const secret = new TextEncoder().encode(QR_SIGNING_KEY.value());
    const startsAtSec: number = typeof event['startsAt'] === 'number'
      ? event['startsAt']
      : Math.floor(Date.now() / 1000) + 3600;

    const jti = attendanceRef.id;
    const qrPayload = await new SignJWT({ eventId, uid, jti })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(startsAtSec + 4 * 3600) // exp = startsAt + 4h
      .setJti(jti)
      .sign(secret);

    const batch = db.batch();
    batch.set(attendanceRef, {
      uid,
      eventId,
      status,
      qrJti: jti,
      qrPayload,
      rsvpAt: FieldValue.serverTimestamp(),
    });
    if (status === 'rsvp') {
      batch.update(eventRef, { rsvpCount: FieldValue.increment(1) });
    } else {
      batch.update(eventRef, { waitlistCount: FieldValue.increment(1) });
    }
    await batch.commit();

    return { ok: true, status, qrPayload };
  },
);

export const cancelRsvp = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');

    const parsed = CancelSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { eventId } = parsed.data;

    const db = getFirestore();
    const attendanceRef = db.doc(`events/${eventId}/attendance/${uid}`);
    const attendanceSnap = await attendanceRef.get();

    if (!attendanceSnap.exists) throw new HttpsError('not-found', 'RSVP not found');

    const prevStatus: string = attendanceSnap.data()?.['status'] ?? '';
    if (prevStatus === 'cancelled') return { ok: true };

    const eventRef = db.doc(`events/${eventId}`);
    const batch = db.batch();
    batch.update(attendanceRef, { status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() });

    if (prevStatus === 'rsvp') {
      batch.update(eventRef, { rsvpCount: FieldValue.increment(-1) });
    } else if (prevStatus === 'waitlist') {
      batch.update(eventRef, { waitlistCount: FieldValue.increment(-1) });
    }
    await batch.commit();

    // Publish events-capacity-changed for waitlist promotion (Plan 01 owns topic)
    try {
      const pubsub = new PubSub();
      await pubsub.topic('events-capacity-changed').publishMessage({
        data: Buffer.from(JSON.stringify({ eventId })),
      });
    } catch (err) {
      console.error('[cancelRsvp] Pub/Sub publish failed (non-fatal):', err);
    }

    return { ok: true };
  },
);
