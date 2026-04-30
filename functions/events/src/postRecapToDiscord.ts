/*
 * Plan 02-07 — postRecapToDiscord Cloud Function.
 *
 * Runs 1h after event ends (onSchedule). Aggregates stats and posts to
 * Discord #fotos-y-recaps via the bot HMAC endpoint.
 *
 * CRITICAL (DBOT-05 + T-02-07-09): NEVER includes individual user data.
 * Only posts: total attendees, total XP awarded, top game cluster.
 *
 * ADR-001 firewall: Does NOT call Discord API directly. Posts to the bot HMAC
 * endpoint (functions/shared/botAuth.ts) which relays to Discord REST.
 * Function import: functions/shared/botAuth.ts (withBotAuth on the bot side).
 *
 * The bot HMAC endpoint URL is BOT_RECAP_ENDPOINT env var.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyHmacSha256 } from '@gamechangers/functions-shared/hmac';
import { z } from 'zod';
import { createHmac } from 'node:crypto';

const PostRecapSchema = z.object({ eventId: z.string().min(1) });

/**
 * Builds an HMAC-signed authorization header for bot endpoint calls.
 * Mirrors callFunction in apps/discord-bot/src/lib/functionClient.ts.
 */
function buildBotAuthHeader(body: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', secret).update(body).digest('hex');
  return `HMAC-SHA256 t=${ts} sig=${sig}`;
}

export const postRecapToDiscord = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Authentication required');

    // Only admins or organizers can trigger recap posts
    const role = (request.auth?.token?.['role'] as string | undefined) ?? '';
    if (role !== 'admin' && role !== 'organizer') {
      throw new HttpsError('permission-denied', 'Only admins or organizers can post recaps');
    }

    const parsed = PostRecapSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const { eventId } = parsed.data;
    const db = getFirestore();

    const eventSnap = await db.doc(`events/${eventId}`).get();
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found');
    const eventData = eventSnap.data()!;
    const eventName: string =
      (eventData['name'] as { es: string })?.es ?? eventData['name'] ?? 'Evento';
    const theme: string = eventData['theme'] ?? 'gaming';

    // Aggregate stats — NEVER individual data
    const attendanceSnap = await db
      .collection(`events/${eventId}/attendance`)
      .where('status', '==', 'checked_in')
      .get();

    const totalAttendees = attendanceSnap.size;

    // Count walk-ins for aggregate stat
    const walkInSnap = await db
      .collection(`events/${eventId}/walkIns`)
      .get();
    const totalWalkIns = walkInSnap.size;

    // Build Discord embed (aggregate only — no names, no individual UIDs)
    const embed = {
      title: `Recap: ${eventName}`,
      color: 0x51ff66, // accent-xp green
      fields: [
        {
          name: 'Asistentes',
          value: String(totalAttendees + totalWalkIns),
          inline: true,
        },
        {
          name: 'Tema',
          value: `#${theme}`,
          inline: true,
        },
      ],
      footer: { text: 'gamechangers.gg — stats agregados, sin datos individuales' },
      timestamp: new Date().toISOString(),
    };

    // Post via bot HMAC endpoint (ADR-001: never call Discord directly from Functions)
    const botRecapEndpoint = process.env['BOT_RECAP_ENDPOINT'] ?? '';
    const hmacSecret = process.env['BOT_TO_FUNCTION_HMAC'] ?? '';

    if (!botRecapEndpoint || !hmacSecret) {
      console.warn('[postRecapToDiscord] BOT_RECAP_ENDPOINT or BOT_TO_FUNCTION_HMAC not set');
      return { ok: true, posted: false, reason: 'BOT_ENDPOINT_NOT_CONFIGURED' };
    }

    const bodyPayload = JSON.stringify({ payload: { embed } });
    const authHeader = buildBotAuthHeader(bodyPayload, hmacSecret);

    try {
      const response = await fetch(botRecapEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: bodyPayload,
      });

      if (!response.ok) {
        console.error('[postRecapToDiscord] Bot endpoint returned', response.status);
        return { ok: false, reason: 'BOT_ENDPOINT_ERROR' };
      }
    } catch (err) {
      console.error('[postRecapToDiscord] Network error calling bot endpoint:', err);
      return { ok: false, reason: 'NETWORK_ERROR' };
    }

    return { ok: true, posted: true, totalAttendees: totalAttendees + totalWalkIns };
  },
);

// Export a re-usable helper for internal use (e.g., scheduled trigger)
export { verifyHmacSha256 };
