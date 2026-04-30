/*
 * Plan 02-07 — checkIn Cloud Function.
 *
 * QR check-in with JWT verification + optional geofence + jti idempotency.
 * Called from the PWA directly OR via Workbox Background Sync replay when offline.
 *
 * Flow:
 *   1. Validate { qrPayload: string, geo?: { lat, lng } }
 *   2. Verify HS256 JWT with QR_SIGNING_KEY; check exp; extract eventId, uid, jti
 *   3. Optional geofence: if geo provided, compute haversine distance vs venue.radiusMeters
 *   4. Idempotent write: doc ID = jti (same jti → merge no-op → no double-XP)
 *   5. Publish event_attended to xp-events Pub/Sub
 *
 * Threats:
 *   T-02-07-01: JWT signature verified server-side (forgery protection)
 *   T-02-07-02: jti as deterministic doc ID (replay / double-scan idempotency)
 *   T-02-07-03: haversine geofence check (geolocation spoof raises bar)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { jwtVerify } from 'jose';
import { PubSub } from '@google-cloud/pubsub';
import { z } from 'zod';

const QR_SIGNING_KEY = defineSecret('QR_SIGNING_KEY');

const CheckInSchema = z.object({
  qrPayload: z.string().min(1),
  geo: z
    .object({ lat: z.number(), lng: z.number() })
    .optional(),
});

/** Haversine distance in metres between two lat/lng pairs. */
function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const checkIn = onCall(
  { region: 'southamerica-east1', secrets: [QR_SIGNING_KEY] },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Authentication required');

    const parsed = CheckInSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { qrPayload, geo } = parsed.data;

    // ── 1. Verify JWT ──────────────────────────────────────────────────────────
    let claims: { eventId: string; uid: string; jti: string };
    try {
      const secret = new TextEncoder().encode(QR_SIGNING_KEY.value());
      const { payload } = await jwtVerify(qrPayload, secret, { algorithms: ['HS256'] });
      claims = {
        eventId: payload['eventId'] as string,
        uid: payload['uid'] as string,
        jti: payload['jti'] as string,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('expired') || msg.includes('exp')) {
        throw new HttpsError('failed-precondition', 'QR_EXPIRED');
      }
      throw new HttpsError('invalid-argument', 'QR_INVALID');
    }

    // Exp already checked by jose, but sanity-check required fields
    if (!claims.eventId || !claims.uid || !claims.jti) {
      throw new HttpsError('invalid-argument', 'QR_MISSING_CLAIMS');
    }

    // Identity-binding (T-02-07-01 hardening, WR-04): the QR is a bearer token
    // for the user it was issued to. Reject if a different authenticated caller
    // is presenting it; staff-assisted scanning should be gated by an explicit
    // organizer role check (not implemented in Phase 02).
    if (callerUid !== claims.uid) {
      throw new HttpsError('permission-denied', 'QR_UID_MISMATCH');
    }

    const db = getFirestore();
    const eventRef = db.doc(`events/${claims.eventId}`);
    const eventSnap = await eventRef.get();
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found');

    // ── 2. Geofence check (optional) ──────────────────────────────────────────
    if (geo) {
      const venue = eventSnap.data()?.['venue'] as
        | { lat: number; lng: number; radiusMeters: number }
        | undefined;
      if (venue) {
        const dist = haversineMetres(geo.lat, geo.lng, venue.lat, venue.lng);
        if (dist > venue.radiusMeters) {
          throw new HttpsError('failed-precondition', 'OUT_OF_VENUE');
        }
      }
    }

    // ── 3. Idempotent write (jti as doc ID prevents double-XP on replay) ──────
    const attendanceRef = db.doc(`events/${claims.eventId}/attendance/${claims.jti}`);
    await attendanceRef.set(
      {
        uid: claims.uid,
        eventId: claims.eventId,
        qrJti: claims.jti,
        status: 'checked_in',
        checkedInAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // ── 4. Publish to xp-events (consumed by gamification/xpAward) ────────────
    try {
      const pubsub = new PubSub();
      await pubsub.topic('xp-events').publishMessage({
        data: Buffer.from(
          JSON.stringify({
            type: 'event_attended',
            uid: claims.uid,
            eventId: claims.eventId,
          }),
        ),
      });
    } catch (err) {
      console.error('[checkIn] xp-events publish failed (non-fatal):', err);
    }

    return { ok: true };
  },
);
