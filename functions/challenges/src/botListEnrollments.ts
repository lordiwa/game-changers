/*
 * Plan 02-03 — Bot-callable challenges endpoint: botListEnrollments
 *
 * Resolves discordId → uid, then returns the user's active challenge enrollments.
 * Called by the Discord bot's /reto command.
 *
 * Authentication: withBotAuth (HMAC-SHA256 + timestamp drift + IP allow-list).
 *
 * Output projection:
 *   { ok: true, data: { enrollments: Array<{ challengeId, name, tier, progress, target }> } }
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { withBotAuth } from '@gamechangers/functions-shared/botAuth';

type Enrollment = {
  challengeId: string;
  name: string;
  tier: 'bronce' | 'plata' | 'oro';
  progress: number;
  target: number;
};

export const botListEnrollments = onRequest(
  {
    region: 'southamerica-east1',
    cors: false,
  },
  withBotAuth(async (_req, res, payload) => {
    const { discordId } = payload as { discordId?: string };

    if (!discordId || typeof discordId !== 'string') {
      res.status(400).json({ ok: false, error: 'MISSING_DISCORD_ID' });
      return;
    }

    try {
      const db = getFirestore();

      // Resolve discordId → uid.
      const lookupSnap = await db.doc(`users/_lookup/discord/${discordId}`).get();
      if (!lookupSnap.exists) {
        // Not linked — empty enrollments.
        res.status(200).json({ ok: true, data: { enrollments: [] } });
        return;
      }

      const uid = (lookupSnap.data() as { uid: string })['uid'];

      // Read active challenge enrollments.
      const enrollSnap = await db
        .collection(`users/${uid}/challengeEnrollments`)
        .where('status', '==', 'active')
        .limit(10)
        .get();

      const enrollments: Enrollment[] = enrollSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          challengeId: doc.id,
          name: (d['name'] as string) ?? '',
          tier: (d['tier'] as 'bronce' | 'plata' | 'oro') ?? 'bronce',
          progress: (d['progress'] as number) ?? 0,
          target: (d['target'] as number) ?? 1,
        };
      });

      res.status(200).json({ ok: true, data: { enrollments } });
    } catch (err) {
      console.error('[botListEnrollments] Firestore query failed:', err);
      res.status(500).json({ ok: false, error: 'QUERY_FAILED' });
    }
  }),
);
