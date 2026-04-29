/**
 * discordRoleSync.ts — Pub/Sub subscriber on level-up-events that syncs Discord roles.
 *
 * Architecture (ADR-001 firewall):
 *   - Cloud Function subscribes to level-up-events topic (provisioned by Plan 01).
 *   - Function calls Discord REST API directly with BOT_TOKEN from Secret Manager.
 *   - The Discord bot itself has NO write access (viewer SA only).
 *   - discordId resolved from /users/{uid}/private/discord (server-side only).
 *
 * Role mapping (tier boundaries from packages/shared/src/xp.ts):
 *   Level 11 → Iniciado role
 *   Level 21 → Aventurero role
 *   Level 31 → Veterano role
 *   Level 41 → Élite role
 *   Level 51 → Leyenda role
 *   Level 61 → Mítico role
 *
 * Threats mitigated:
 *   T-02-05-07 (uid mismatch): discordId read from server-side /private/discord only.
 *   T-02-03-08 (bot token): stored in Secret Manager; never in repo or logs.
 */
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { levelTier } from '@gamechangers/shared';

const DISCORD_BOT_TOKEN = defineSecret('DISCORD_BOT_TOKEN');
const DISCORD_GUILD_ID = defineSecret('DISCORD_GUILD_ID');

// Discord role IDs by tier name — populated from Secret Manager env or config.
// In production, these map to the actual Discord role IDs for the GameChangers server.
// Format: DISCORD_ROLE_{TIER_UPPER}
const TIER_ROLE_SECRET_MAP: Record<string, string> = {
  Iniciado: 'DISCORD_ROLE_INICIADO',
  Aventurero: 'DISCORD_ROLE_AVENTURERO',
  Veterano: 'DISCORD_ROLE_VETERANO',
  Élite: 'DISCORD_ROLE_ELITE',
  Leyenda: 'DISCORD_ROLE_LEYENDA',
  Mítico: 'DISCORD_ROLE_MITICO',
};

const LevelUpMessageSchema = z.object({
  uid: z.string(),
  oldLevel: z.number().int().min(1),
  newLevel: z.number().int().min(1),
});

export const discordRoleSync = onMessagePublished(
  {
    topic: 'level-up-events',
    region: 'southamerica-east1',
    secrets: [DISCORD_BOT_TOKEN, DISCORD_GUILD_ID],
  },
  async (event) => {
    // ── 1. Parse message ────────────────────────────────────────────────────
    let msg: z.infer<typeof LevelUpMessageSchema>;
    try {
      const raw = event.data.message.json as unknown;
      msg = LevelUpMessageSchema.parse(raw);
    } catch (err) {
      console.error('[discordRoleSync] Invalid message shape — skipping:', err);
      return;
    }

    const { uid, oldLevel, newLevel } = msg;
    const db = getFirestore();

    // ── 2. Determine if a tier boundary was crossed ─────────────────────────
    const oldTier = levelTier(oldLevel);
    const newTier = levelTier(newLevel);

    if (oldTier === newTier) {
      // No tier change — no Discord role update needed
      return;
    }

    // ── 3. Resolve discordId from /users/{uid}/private/discord ──────────────
    const discordSnap = await db.doc(`users/${uid}/private/discord`).get();
    if (!discordSnap.exists) {
      console.log(`[discordRoleSync] uid=${uid} has no linked Discord account — skipping.`);
      return;
    }
    const discordData = discordSnap.data()!;
    const discordId: string | undefined = discordData['discordId'] as string | undefined;
    if (!discordId) {
      console.warn(`[discordRoleSync] uid=${uid} has discord doc but no discordId field — skipping.`);
      return;
    }

    // ── 4. Determine the Discord role ID for the new tier ────────────────────
    // Role IDs must be configured as environment variables for the Function.
    // We look them up from process.env (set via `firebase functions:config:set` or Secret Manager env).
    const roleEnvKey = TIER_ROLE_SECRET_MAP[newTier];
    const roleId = roleEnvKey ? process.env[roleEnvKey] : undefined;

    if (!roleId) {
      console.warn(`[discordRoleSync] No Discord role ID configured for tier=${newTier} (env: ${roleEnvKey}) — skipping.`);
      // Audit this gap but don't fail
      await db.collection('auditLog').doc().set({
        action: 'discord_role_sync_skipped',
        uid,
        discordId,
        oldLevel,
        newLevel,
        oldTier,
        newTier,
        reason: `no_role_id_configured_for_${newTier}`,
        timestamp: FieldValue.serverTimestamp(),
      });
      return;
    }

    const guildId = DISCORD_GUILD_ID.value();
    const botToken = DISCORD_BOT_TOKEN.value();

    if (!guildId || !botToken) {
      console.error('[discordRoleSync] Missing DISCORD_GUILD_ID or DISCORD_BOT_TOKEN secrets.');
      return;
    }

    // ── 5. Call Discord REST API to grant the tier role ──────────────────────
    // PUT /guilds/{guildId}/members/{userId}/roles/{roleId}
    // Authorization: Bot ${BOT_TOKEN}
    const discordRes = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
          'X-Audit-Log-Reason': `GameChangers level-up: ${oldTier} → ${newTier} (level ${newLevel})`,
        },
      },
    );

    if (!discordRes.ok && discordRes.status !== 204) {
      const errorText = await discordRes.text();
      console.error(`[discordRoleSync] Discord API error ${discordRes.status}: ${errorText}`);
      await db.collection('auditLog').doc().set({
        action: 'discord_role_sync_failed',
        uid,
        discordId,
        oldLevel,
        newLevel,
        oldTier,
        newTier,
        roleId,
        httpStatus: discordRes.status,
        error: errorText,
        timestamp: FieldValue.serverTimestamp(),
      });
      return;
    }

    // ── 6. Audit log ────────────────────────────────────────────────────────
    await db.collection('auditLog').doc().set({
      action: 'discord_role_synced',
      uid,
      discordId,
      oldLevel,
      newLevel,
      oldTier,
      newTier,
      roleId,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[discordRoleSync] Role ${newTier} (${roleId}) granted to Discord user ${discordId} (uid=${uid}, level ${newLevel})`);
  },
);
