/*
 * Plan 02-03 — Bot-callable events endpoint: botListUpcoming
 *
 * Returns the next N upcoming events (default limit=5) ordered by startsAt ascending.
 * Called by the Discord bot's /eventos command.
 *
 * Authentication: withBotAuth (HMAC-SHA256 + timestamp drift + IP allow-list).
 *
 * Output projection (BotCallableOutput contract from Plan 02-03 interfaces):
 *   { ok: true, data: { events: Array<{ id, name, startsAt, location, capacity, rsvpCount }> } }
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { withBotAuth } from '@gamechangers/functions-shared/botAuth';

type EventProjection = {
  id: string;
  name: string;
  startsAt: number; // unix seconds
  location: string;
  capacity: number;
  rsvpCount: number;
};

export const botListUpcoming = onRequest(
  {
    region: 'southamerica-east1',
    cors: false,
  },
  withBotAuth(async (_req, res, payload) => {
    const limit = Math.min(
      typeof payload['limit'] === 'number' ? payload['limit'] : 5,
      10, // hard cap to prevent abuse
    );

    try {
      const db = getFirestore();
      const now = Math.floor(Date.now() / 1000);

      const snap = await db
        .collection('events')
        .where('startsAt', '>=', now)
        .where('status', '==', 'published')
        .orderBy('startsAt', 'asc')
        .limit(limit)
        .get();

      const events: EventProjection[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          name: (d['name'] as string) ?? '',
          startsAt: (d['startsAt'] as number) ?? 0,
          location: (d['location'] as string) ?? '',
          capacity: (d['capacity'] as number) ?? 0,
          rsvpCount: (d['rsvpCount'] as number) ?? 0,
        };
      });

      res.status(200).json({ ok: true, data: { events } });
    } catch (err) {
      console.error('[botListUpcoming] Firestore query failed:', err);
      res.status(500).json({ ok: false, error: 'QUERY_FAILED' });
    }
  }),
);
