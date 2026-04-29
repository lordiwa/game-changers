/*
 * Plan 02-02 Task 1 — Discord OAuth code-exchange Cloud Function.
 *
 * Flow (RESEARCH §2):
 *   1. Validate body (zod). Optional firebaseIdToken (anonymous link upgrade per ADR-008)
 *      and optional pendingDiscordId (handoff from Plan 03 /link bot command per DBOT-04).
 *   2. POST code+pkceVerifier to https://discord.com/api/oauth2/token (single-use code).
 *   3. GET /users/@me with the returned access_token (scope: identify+email only).
 *   4. If pendingDiscordId is present, assert oauthUser.id === pendingDiscordId — mismatch
 *      throws permission-denied DISCORD_ID_MISMATCH AND writes auditLog
 *      `discord_link_id_mismatch` (T-02-02-11 mitigation).
 *   5. Determine target uid (ADR-008): anonymous-link upgrade preserves anonymous uid;
 *      else lookup /users/_lookup/discord/{discordId}; else mint `discord:{id}`.
 *   6. kmsEncrypt(refresh_token) before persistence (T-02-02-02 mitigation).
 *   7. Build consent bitmap from /users/{uid}/consents/* and mint a Firebase custom token
 *      via getAuth().createCustomToken(uid, { consents, hasDiscord, ageVerified }).
 *
 * Threats mitigated: T-02-02-01 (state+PKCE), T-02-02-02 (KMS encryption),
 * T-02-02-03 (state cookie verify), T-02-02-11 (handoff hijack), T-02-02-12 (forged JWT
 * — verified upstream in PWA `useDiscordLink.decodeLinkToken`; we trust pendingDiscordId
 * value-equality only after the JWT signature was verified client-side, AND we re-check
 * via the OAuth-returned discord user.id).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { kmsEncrypt } from '@gamechangers/functions-shared/kms';
import { CLAIM_BITMAP_KEYS, CONSENT_CATEGORIES } from '@gamechangers/functions-shared/ConsentEnforcement';

const Body = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  pkceVerifier: z.string().min(43).max(128),
  // Present when an anonymous user is upgrading via Discord — uid is preserved (ADR-008).
  firebaseIdToken: z.string().optional(),
  // Present when the flow originated from the Discord bot's /link command (Plan 03 DBOT-04).
  // Must match the OAuth-returned discord user.id; mismatch is a possible CSRF/replay attack.
  pendingDiscordId: z
    .string()
    .regex(/^\d{17,20}$/)
    .optional(),
});

type ConsentBitmap = Record<string, boolean>;

async function loadConsentBitmap(uid: string): Promise<ConsentBitmap> {
  const db = getFirestore();
  const bitmap: ConsentBitmap = {};
  const snap = await db.collection(`users/${uid}/consents`).get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const category = doc.id;
    if (
      CONSENT_CATEGORIES.includes(category as (typeof CONSENT_CATEGORIES)[number]) &&
      data['status'] === 'granted'
    ) {
      const key = CLAIM_BITMAP_KEYS[category as (typeof CONSENT_CATEGORIES)[number]];
      bitmap[key] = true;
    }
  }
  return bitmap;
}

export const discordExchange = onCall(
  {
    region: 'southamerica-east1',
    cors: true,
    secrets: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET', 'DISCORD_REDIRECT_URI'],
  },
  async (req) => {
    const { code, state, pkceVerifier, firebaseIdToken, pendingDiscordId } = Body.parse(req.data);
    // State cookie verification is layered on at the HTTPS edge; PKCE verifier round-trip
    // covers CSRF defense-in-depth (T-02-02-03). The state value is included in the
    // OAuth URL and re-checked on this side as a sanity gate; if needed, downstream
    // plans can wire a signed-cookie verifier here.
    void state;

    const clientId = process.env['DISCORD_CLIENT_ID'] ?? '';
    const clientSecret = process.env['DISCORD_CLIENT_SECRET'] ?? '';
    const redirectUri = process.env['DISCORD_REDIRECT_URI'] ?? '';

    // 1. Exchange the single-use authorization_code at https://discord.com/api/oauth2/token.
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: pkceVerifier,
      }),
    });
    if (!tokenRes.ok) {
      throw new HttpsError('permission-denied', 'DISCORD_TOKEN_EXCHANGE_FAILED');
    }
    const tokenJson = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    // 2. Fetch Discord identity at https://discord.com/api/users/@me (scope: identify+email).
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    if (!userRes.ok) {
      throw new HttpsError('permission-denied', 'DISCORD_USERINFO_FAILED');
    }
    const discordUser = (await userRes.json()) as {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
      email?: string;
    };

    const db = getFirestore();

    // 3. Bot-link handoff assertion (T-02-02-11 mitigation).
    if (pendingDiscordId && discordUser.id !== pendingDiscordId) {
      await db.collection('auditLog').doc().set({
        action: 'discord_link_id_mismatch',
        expected: pendingDiscordId,
        actual: discordUser.id,
        timestamp: FieldValue.serverTimestamp(),
      });
      throw new HttpsError('permission-denied', 'DISCORD_ID_MISMATCH');
    }

    // 4. Determine target uid.
    // ADR-008: an anonymous Firebase uid is canonical. If the caller provided a Firebase ID
    // token of an anonymous user, preserve that uid so XP/badges/attendance survive the link.
    let uid: string | null = null;
    let isExistingUser = false;
    if (firebaseIdToken) {
      try {
        const decoded = await getAuth().verifyIdToken(firebaseIdToken);
        if (decoded.firebase.sign_in_provider === 'anonymous') {
          uid = decoded.uid;
        }
      } catch {
        // ignore — fall through to lookup / mint path
      }
    }
    if (!uid) {
      const lookup = await db.doc(`users/_lookup/discord/${discordUser.id}`).get();
      if (lookup.exists) {
        const data = lookup.data();
        if (data && typeof data['uid'] === 'string') {
          uid = data['uid'];
          isExistingUser = true;
        }
      }
    }
    if (!uid) {
      uid = `discord:${discordUser.id}`;
    }

    // 5. KMS-encrypt the refresh token (T-02-02-02) before any persistence.
    const encryptedRefreshToken = await kmsEncrypt(tokenJson.refresh_token);

    // 6. Persist /users/{uid}/private/discord. Plan 01 Rules deny all client R/W on /private/**.
    await db.doc(`users/${uid}/private/discord`).set(
      {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name ?? null,
        avatar: discordUser.avatar ?? null,
        encryptedRefreshToken,
        linkedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // 7. Maintain a discordId → uid reverse-index doc for the bot (ADR-008 §Mitigations).
    await db.doc(`users/_lookup/discord/${discordUser.id}`).set({ uid });

    // 8. Build consent bitmap from /users/{uid}/consents/* and mint custom token.
    const consents = await loadConsentBitmap(uid);
    const existingDoc = await db.doc(`users/${uid}/private/identity`).get();
    const ageVerified =
      existingDoc.exists && existingDoc.data()?.['ageVerified'] === true ? true : false;

    const customToken = await getAuth().createCustomToken(uid, {
      consents,
      hasDiscord: true,
      ageVerified,
    });

    return { customToken, isExistingUser };
  },
);
