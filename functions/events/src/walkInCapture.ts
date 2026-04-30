/*
 * Plan 02-07 — walkInCapture Cloud Function.
 *
 * HTTP onRequest (no auth required) for unauthenticated walk-ins.
 * Stores name + phone in /walkIns/{walkInId} with TTL = now + 90 days.
 *
 * LOPDP note: name + phone are voluntarily provided for event follow-up.
 * The data is NOT shared with B2B partners and is NOT exported to BigQuery.
 * Cleanup sweeper deletes after 90 days unless user converts to account.
 *
 * Threats:
 *   T-02-07-04: TTL 90d; /walkIns Rules deny client read
 *   T-02-07-07: Firebase App Check token required (deferred config); phone format validation
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const WalkInSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+\d{8,15}$/, 'Phone must be in E.164 format (+XXXXXXXXXXX)'),
});

export const walkInCapture = onRequest(
  { region: 'southamerica-east1', cors: false },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
      return;
    }

    const parsed = WalkInSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.message });
      return;
    }

    const { eventId, name, phone } = parsed.data;

    const db = getFirestore();

    // Verify event exists
    const eventSnap = await db.doc(`events/${eventId}`).get();
    if (!eventSnap.exists) {
      res.status(404).json({ ok: false, error: 'EVENT_NOT_FOUND' });
      return;
    }

    // TTL = now + 90 days (Firestore TTL field)
    const expireAt = Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));

    const walkInRef = db.collection('walkIns').doc();
    await walkInRef.set({
      walkInId: walkInRef.id,
      eventId,
      name,
      phone,
      capturedAt: FieldValue.serverTimestamp(),
      expireAt, // Firestore TTL field — auto-delete after 90 days
    });

    // Also write a record under the event for organizer reference
    await db.doc(`events/${eventId}/walkIns/${walkInRef.id}`).set({
      walkInId: walkInRef.id,
      name,
      capturedAt: FieldValue.serverTimestamp(),
      expireAt,
    });

    res.status(200).json({ ok: true, walkInId: walkInRef.id });
  },
);
