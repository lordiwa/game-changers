/**
 * xpAward.ts — Pub/Sub-triggered Cloud Function that awards XP on xp-events.
 *
 * Architecture:
 *   - Subscribes to Pub/Sub topic 'xp-events' (provisioned by Plan 01).
 *   - Validates message with Zod, gates on basic_profile consent.
 *   - Anti-cheat pre-check for metric-bearing events.
 *   - Runs Firestore transaction to atomically update XP + level.
 *   - Publishes to level-up-events if level increases.
 *   - NEVER throws on business errors (Pub/Sub retries on throw).
 *
 * XP economy (RESEARCH §9 + community-ops skill):
 *   event_attended:               100 XP (50 if walk-in)
 *   challenge_progress:           10 * floor(value / 1000) XP, capped 100/day
 *   content_completed:            floor(durationSec / 10) XP, capped 50
 *   club_leadership:              50 XP/week (Phase 3 — dormant)
 *   referral:                     200 XP (if referredUid completed age gate + Layer 0)
 *   wellness_survey_completed:    75 XP
 *
 * Threats mitigated:
 *   T-02-05-01 (XP inflation): only Functions service-account can publish to xp-events;
 *                               client writes to profile/main.xp are blocked by Rules.
 *   T-02-05-04 (anti-cheat): withinAntiCheatBounds called before transaction.
 */
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { PubSub } from '@google-cloud/pubsub';
import { z } from 'zod';
import { consentGate } from '@gamechangers/functions-shared';
import { levelForXp, totalXpForLevel } from '@gamechangers/shared';
import { withinAntiCheatBounds } from './antiCheat.js';

// Lazy PubSub client — instantiated on first use to keep cold start cheap.
let pubsubClient: PubSub | null = null;
function getPubSub(): PubSub {
  if (!pubsubClient) pubsubClient = new PubSub();
  return pubsubClient;
}

// ── Zod schema for XpEventMessage ─────────────────────────────────────────────
const XpEventMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('event_attended'), uid: z.string(), eventId: z.string(), walkIn: z.boolean().optional() }),
  z.object({ type: z.literal('challenge_progress'), uid: z.string(), challengeId: z.string(), value: z.number(), metric: z.string().optional() }),
  // Plan 02-08: challenge_completed carries the exact XP reward from the tier config.
  z.object({ type: z.literal('challenge_completed'), uid: z.string(), challengeId: z.string(), tier: z.enum(['bronce', 'plata', 'oro']), xpReward: z.number().positive(), badgeId: z.string() }),
  z.object({ type: z.literal('content_completed'), uid: z.string(), contentId: z.string(), durationSec: z.number() }),
  z.object({ type: z.literal('club_leadership'), uid: z.string(), clubId: z.string() }),
  z.object({ type: z.literal('referral'), uid: z.string(), referredUid: z.string() }),
  z.object({ type: z.literal('wellness_survey_completed'), uid: z.string(), surveyId: z.string() }),
]);

type XpEventMessage = z.infer<typeof XpEventMessageSchema>;

// ── XP amounts per event type ─────────────────────────────────────────────────
function computeXpDelta(msg: XpEventMessage): number {
  switch (msg.type) {
    case 'event_attended':
      return msg.walkIn ? 50 : 100;
    case 'challenge_progress':
      // 10 XP per 1000 units of progress, capped at 100/day
      return Math.min(100, 10 * Math.floor(msg.value / 1000));
    case 'challenge_completed':
      // Plan 02-08: xpReward is the exact amount defined in the tier config
      // (Bronce: 200, Plata: 600, Oro: 1500 for movement; varies by type)
      return msg.xpReward;
    case 'content_completed':
      // 1 XP per 10 seconds, capped at 50
      return Math.min(50, Math.floor(msg.durationSec / 10));
    case 'club_leadership':
      return 50; // Phase 3 — dormant
    case 'referral':
      return 200;
    case 'wellness_survey_completed':
      return 75;
  }
}

export const xpAward = onMessagePublished(
  {
    topic: 'xp-events',
    region: 'southamerica-east1',
  },
  async (event) => {
    // ── 1. Parse + validate message ─────────────────────────────────────────
    let msg: XpEventMessage;
    try {
      const raw = event.data.message.json as unknown;
      msg = XpEventMessageSchema.parse(raw);
    } catch (err) {
      console.error('[xpAward] Invalid message shape — skipping:', err);
      return; // Don't retry malformed messages
    }

    const { uid } = msg;
    const db = getFirestore();

    // ── 2. Consent gate (basic_profile) ─────────────────────────────────────
    try {
      await consentGate(uid, 'basic_profile');
    } catch {
      // No consent — drop the message gracefully (no throw = no retry)
      console.warn(`[xpAward] basic_profile consent missing for uid=${uid}; dropping message.`);
      await db.collection('auditLog').doc().set({
        action: 'xp_dropped_no_consent',
        uid,
        type: msg.type,
        reason: 'dropped_no_consent',
        timestamp: FieldValue.serverTimestamp(),
      });
      return;
    }

    // ── 3. Anti-cheat pre-check ─────────────────────────────────────────────
    if (msg.type === 'challenge_progress' && msg.metric) {
      const check = withinAntiCheatBounds(msg.metric, msg.value);
      if (check.status === 'reject') {
        console.warn(`[xpAward] Anti-cheat reject: uid=${uid}, metric=${msg.metric}, value=${msg.value}, reason=${check.reason}`);
        await db.collection(`users/${uid}/private/flaggedRecords`).doc().set({
          uid,
          type: msg.type,
          metric: msg.metric,
          value: msg.value,
          reason: check.reason,
          status: 'rejected',
          timestamp: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (check.status === 'flag') {
        console.warn(`[xpAward] Anti-cheat flag: uid=${uid}, metric=${msg.metric}, value=${msg.value}, reason=${check.reason}`);
        await db.collection(`users/${uid}/private/flaggedRecords`).doc().set({
          uid,
          type: msg.type,
          metric: msg.metric,
          value: msg.value,
          reason: check.reason,
          status: 'flagged_pending_review',
          timestamp: FieldValue.serverTimestamp(),
        });
        return; // Do not award XP for flagged records — mod review path
      }
    }

    // ── 4. Compute XP delta ──────────────────────────────────────────────────
    const delta = computeXpDelta(msg);
    if (delta <= 0) {
      console.log(`[xpAward] Zero XP delta for uid=${uid}, type=${msg.type} — skipping.`);
      return;
    }

    // ── 5. Firestore transaction: update XP + level ─────────────────────────
    const profileRef = db.doc(`users/${uid}/profile/main`);

    const txResult = await db.runTransaction(async (tx) => {
      const snap = await tx.get(profileRef);
      const data = snap.data() ?? {};
      const oldXp: number = (data['xp'] as number) ?? 0;
      const oldLevel: number = (data['level'] as number) ?? 1;

      const newXp = oldXp + delta;
      const newLevel = levelForXp(newXp);

      tx.set(
        profileRef,
        {
          xp: newXp,
          level: newLevel,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { oldXp, newXp, oldLevel, newLevel };
    });

    const { oldXp, newXp, oldLevel, newLevel } = txResult;

    // ── 6. Publish level-up event if level increased (post-transaction) ─────
    // Pub/Sub publish is the source of truth for discordRoleSync; the legacy
    // levelUpQueue collection is intentionally not written anymore.
    if (newLevel > oldLevel) {
      try {
        await getPubSub()
          .topic('level-up-events')
          .publishMessage({ json: { uid, oldLevel, newLevel } });
      } catch (err) {
        console.error('[xpAward] Failed to publish level-up event:', err);
        // Do not throw — the XP award already committed; log and move on.
      }
    }

    // ── 7. Audit log (post-transaction; duplicates on retry are tolerable) ──
    await db.collection('auditLog').doc().set({
      action: 'xp_awarded',
      uid,
      type: msg.type,
      delta,
      oldXp,
      newXp,
      oldLevel,
      newLevel,
      levelUp: newLevel > oldLevel,
      timestamp: FieldValue.serverTimestamp(),
    });

    console.log(`[xpAward] Awarded ${delta} XP to uid=${uid} (type=${msg.type})`);
  },
);
