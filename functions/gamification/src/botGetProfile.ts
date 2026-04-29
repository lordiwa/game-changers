/*
 * Plan 02-03 — Bot-callable gamification endpoint: botGetProfile
 *
 * Resolves discordId → uid via /users/_lookup/discord/{discordId},
 * then returns a profile projection from /users/{uid}/profile/main.
 * Returns null data if the Discord account is not linked.
 *
 * Called by the Discord bot's /perfil command.
 *
 * Authentication: withBotAuth (HMAC-SHA256 + timestamp drift + IP allow-list).
 *
 * Output projection:
 *   { ok: true, data: { displayName, level, xp, badges, topStreakDays } | null }
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { withBotAuth } from '@gamechangers/functions-shared/botAuth';

type ProfileProjection = {
  displayName: string;
  level: number;
  xp: number;
  badges: string[];
  topStreakDays: number;
} | null;

export const botGetProfile = onRequest(
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

      // Resolve discordId → uid via the reverse-index written by discordExchange.
      const lookupSnap = await db.doc(`users/_lookup/discord/${discordId}`).get();
      if (!lookupSnap.exists) {
        // Discord account not linked — return null (bot displays "use /link" message).
        res.status(200).json({ ok: true, data: null });
        return;
      }

      const uid = (lookupSnap.data() as { uid: string })['uid'];

      // Read profile doc.
      const profileSnap = await db.doc(`users/${uid}/profile/main`).get();
      if (!profileSnap.exists) {
        res.status(200).json({ ok: true, data: null });
        return;
      }

      const d = profileSnap.data()!;
      const profile: ProfileProjection = {
        displayName: (d['displayName'] as string) ?? 'Gamer',
        level: (d['level'] as number) ?? 1,
        xp: (d['xp'] as number) ?? 0,
        badges: (d['badges'] as string[]) ?? [],
        topStreakDays: (d['topStreakDays'] as number) ?? 0,
      };

      res.status(200).json({ ok: true, data: profile });
    } catch (err) {
      console.error('[botGetProfile] Firestore query failed:', err);
      res.status(500).json({ ok: false, error: 'QUERY_FAILED' });
    }
  }),
);
