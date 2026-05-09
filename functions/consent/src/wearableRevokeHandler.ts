/**
 * wearableRevokeHandler.ts — Pub/Sub subscriber for consent-revoked events.
 *
 * Listens to the `consent-revoked` topic (Plan 01 owns topic creation).
 * When category == 'wearable_data', automatically disconnects the user's
 * wearable device server-side (T-02-09-13).
 *
 * retainData defaults to true — user's historical samples are kept unless
 * they explicitly request hard-delete via the UI (WEAR-10).
 *
 * This is the consumer of the consent-revoked Pub/Sub topic for wearable cleanup.
 * The publisher is functions/consent/src/revoke.ts (Plan 04).
 */
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const OPEN_WEARABLES_BASE_URL = process.env['OPEN_WEARABLES_BASE_URL'] ?? '';

const ConsentRevokedMessageSchema = z.object({
  uid: z.string(),
  category: z.string(),
  timestamp: z.string().optional(),
});

// Supported wearable providers
const WEARABLE_PROVIDERS = ['garmin', 'fitbit', 'polar', 'whoop', 'oura'] as const;
type WearableProvider = typeof WEARABLE_PROVIDERS[number];

async function stopWearableIngestion(uid: string): Promise<void> {
  const db = getFirestore();

  // Write disabled flag to /users/{uid}/private/wearable — openWearablesWebhook
  // checks this flag on every request as a belt-and-braces consent gate.
  await db.doc(`users/${uid}/private/wearable`).set(
    {
      disabled: true,
      disabledAt: FieldValue.serverTimestamp(),
      disabledReason: 'consent_revoked',
    },
    { merge: true },
  );

  // Attempt to disconnect all providers via Open Wearables server
  if (OPEN_WEARABLES_BASE_URL) {
    for (const provider of WEARABLE_PROVIDERS) {
      try {
        await fetch(`${OPEN_WEARABLES_BASE_URL}/disconnect/${uid}/${provider}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err) {
        // Non-fatal: provider may not have been connected; log and continue
        console.warn(
          `[wearableRevokeHandler] disconnect ${provider} failed (non-fatal):`,
          err,
        );
      }
    }
  }

  // Delete all _lookup mappings for this user
  for (const provider of WEARABLE_PROVIDERS) {
    try {
      await db.doc(`users/_lookup/wearable/${provider}/${uid}`).delete();
    } catch {
      // Non-fatal
    }
  }
}

export const wearableRevokeHandler = onMessagePublished(
  {
    topic: 'consent-revoked',
    region: 'southamerica-east1',
  },
  async (event) => {
    // Decode Pub/Sub message
    let messageData: unknown;
    try {
      const raw = event.data.message.data;
      const decoded = Buffer.from(raw ?? '', 'base64').toString('utf8');
      messageData = JSON.parse(decoded);
    } catch (err) {
      console.error('[wearableRevokeHandler] Failed to decode message:', err);
      return; // Ack to avoid infinite retry on bad message
    }

    const parseResult = ConsentRevokedMessageSchema.safeParse(messageData);
    if (!parseResult.success) {
      console.error('[wearableRevokeHandler] Invalid message schema:', parseResult.error);
      return;
    }

    const { uid, category } = parseResult.data;

    // Only act on wearable_data revocations
    if (category !== 'wearable_data') {
      return; // Ignore other categories
    }

    console.log(`[wearableRevokeHandler] Processing wearable_data revoke for uid=${uid}`);

    try {
      await stopWearableIngestion(uid);

      const db = getFirestore();
      await db.collection('auditLog').doc().set({
        action: 'wearable_revoke_cascade',
        uid,
        category,
        retainData: true, // default: retain data; user can request hard-delete via UI
        timestamp: FieldValue.serverTimestamp(),
      });

      console.log(`[wearableRevokeHandler] Wearable disconnected for uid=${uid}`);
    } catch (err) {
      console.error(`[wearableRevokeHandler] Error processing revoke for uid=${uid}:`, err);
      throw err; // Re-throw to trigger Pub/Sub retry
    }
  },
);
