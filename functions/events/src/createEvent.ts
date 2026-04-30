/*
 * Plan 02-07 — createEvent Cloud Function.
 *
 * Admin/organizer-only callable that writes a new event to /events/{id}.
 * Custom claim gate: role === 'admin' OR role === 'organizer'.
 *
 * For Phase 2, events are primarily seeded via scripts/seed-events.ts by the founder.
 * This Function exists for future organizer dashboard use.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const VenueSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  radiusMeters: z.number().positive().default(200),
});

const CreateEventSchema = z.object({
  tier: z.enum(['meetup', 'general', 'club_session']),
  name: z.object({ es: z.string().min(1), en: z.string().min(1) }),
  theme: z.string().min(1),
  startsAt: z.number().int(), // unix seconds
  endsAt: z.number().int(),
  venue: VenueSchema,
  mapsUrl: z.string().url(),
  capacity: z.number().int().positive(),
  difficulty: z.enum(['chill', 'activo', 'intenso']),
  whatToBring: z.array(z.string()).default([]),
  safetyContactUid: z.string().min(1),
  postEventRecapEnabled: z.boolean().default(true),
});

export const createEvent = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Authentication required');

    const role = (request.auth?.token?.['role'] as string | undefined) ?? '';
    if (role !== 'admin' && role !== 'organizer') {
      throw new HttpsError('permission-denied', 'Only admins or organizers can create events');
    }

    const parsed = CreateEventSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }

    const data = parsed.data;
    const db = getFirestore();
    const ref = db.collection('events').doc();

    await ref.set({
      ...data,
      id: ref.id,
      rsvpCount: 0,
      waitlistCount: 0,
      status: 'published',
      publishedAt: FieldValue.serverTimestamp(),
      createdBy: uid,
    });

    return { ok: true, eventId: ref.id };
  },
);
