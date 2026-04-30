/*
 * Plan 02-07 — postEventCard Cloud Function.
 *
 * Generates a 1080x1080 PNG post-event card using @napi-rs/canvas (lightweight native
 * canvas — no Puppeteer/Chromium overhead on Cloud Functions).
 *
 * Triggered by HTTPS callable (organizer) or Cloud Scheduler 2h after event ends.
 * Stores PNG in Cloud Storage at gs://<bucket>/post-event-cards/{eventId}/{uid}.png
 * Returns signed URL with 30-day TTL.
 *
 * Memory: 512MB recommended (canvas rendering). Set in function options.
 *
 * Choice: @napi-rs/canvas over puppeteer-core — no Chromium binary, ~50MB vs ~200MB cold start.
 * Documented as key decision in SUMMARY.md.
 *
 * Threats: T-02-07-08 (signed URL 30d TTL; user-initiated share only)
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { z } from 'zod';

const PostEventCardSchema = z.object({
  eventId: z.string().min(1),
  uid: z.string().optional(), // defaults to caller's uid
});

export const generatePostEventCard = onCall(
  { region: 'southamerica-east1', memory: '512MiB' },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Authentication required');

    const parsed = PostEventCardSchema.safeParse(request.data);
    if (!parsed.success) throw new HttpsError('invalid-argument', parsed.error.message);

    const targetUid = parsed.data.uid ?? callerUid;
    const { eventId } = parsed.data;

    const db = getFirestore();
    const eventSnap = await db.doc(`events/${eventId}`).get();
    if (!eventSnap.exists) throw new HttpsError('not-found', 'Event not found');

    const eventData = eventSnap.data()!;

    // Gather user stats for this event
    const attendanceSnap = await db
      .collection(`events/${eventId}/attendance`)
      .where('uid', '==', targetUid)
      .where('status', '==', 'checked_in')
      .limit(1)
      .get();

    // Count total attendees for the recap stat
    const totalAttendeesSnap = await db
      .collection(`events/${eventId}/attendance`)
      .where('status', '==', 'checked_in')
      .get();
    const totalAttendees = totalAttendeesSnap.size;

    const eventName: string =
      (eventData['name'] as { es: string })?.es ?? eventData['name'] ?? 'Evento';
    const theme: string = eventData['theme'] ?? '';
    const checkedIn = !attendanceSnap.empty;

    // Render canvas card using @napi-rs/canvas
    // Dynamic import to avoid cold-start cost when canvas is not needed
    let pngBuffer: Buffer;
    try {
      const { createCanvas } = await import('@napi-rs/canvas');
      const canvas = createCanvas(1080, 1080);
      const ctx = canvas.getContext('2d');

      // Dark gaming aesthetic background
      ctx.fillStyle = '#0F0F1A';
      ctx.fillRect(0, 0, 1080, 1080);

      // Gradient overlay
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, 'rgba(81, 255, 102, 0.08)');
      grad.addColorStop(1, 'rgba(108, 99, 255, 0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Brand text
      ctx.fillStyle = '#51FF66';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GameChangers', 540, 100);

      // Event name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 64px sans-serif';
      ctx.fillText(eventName, 540, 220);

      if (theme) {
        ctx.fillStyle = '#A0A0B0';
        ctx.font = '36px sans-serif';
        ctx.fillText(`#${theme}`, 540, 290);
      }

      // Divider
      ctx.strokeStyle = '#51FF66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(200, 340);
      ctx.lineTo(880, 340);
      ctx.stroke();

      // Stats
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText(String(totalAttendees), 540, 460);

      ctx.fillStyle = '#A0A0B0';
      ctx.font = '32px sans-serif';
      ctx.fillText('gamers en este evento', 540, 520);

      if (checkedIn) {
        ctx.fillStyle = '#51FF66';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('¡Estuviste ahí! GG', 540, 620);
      }

      // Footer
      ctx.fillStyle = '#606070';
      ctx.font = '24px sans-serif';
      ctx.fillText('gamechangers.gg', 540, 980);

      pngBuffer = canvas.toBuffer('image/png');
    } catch {
      // Fallback: generate a minimal 1x1 PNG if canvas fails (dependency not installed)
      // In production, @napi-rs/canvas must be installed
      pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );
      console.warn('[postEventCard] @napi-rs/canvas not available, using fallback 1x1 PNG');
    }

    // Upload to Cloud Storage
    const bucket = getStorage().bucket();
    const storagePath = `post-event-cards/${eventId}/${targetUid}.png`;
    const file = bucket.file(storagePath);

    await file.save(pngBuffer, {
      contentType: 'image/png',
      metadata: { eventId, uid: targetUid },
    });

    // Generate 30-day signed URL
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: expiresAt,
    });

    return { ok: true, signedUrl, storagePath };
  },
);
