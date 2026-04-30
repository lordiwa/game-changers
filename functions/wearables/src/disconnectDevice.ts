/**
 * disconnectDevice.ts — User-initiated wearable disconnect.
 *
 * Also called server-side by wearableRevokeHandler (functions/consent) when
 * consent-revoked Pub/Sub fires for category=='wearable_data'.
 *
 * WEAR-10: User can disconnect wearable; data retained per consent or deleted
 * on explicit request.
 *
 * retainData=true (default): Stop OW stream, delete _lookup mapping, keep samples.
 * retainData=false: Schedule Cloud Task to recursively delete healthSamples + healthDaily.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

const OPEN_WEARABLES_BASE_URL = process.env['OPEN_WEARABLES_BASE_URL'] ?? '';

const InputSchema = z.object({
  provider: z.enum(['garmin', 'fitbit', 'polar', 'whoop', 'oura']),
  retainData: z.boolean().default(true),
});

/**
 * Core disconnect logic — exported for server-side use by wearableRevokeHandler.
 */
export async function disconnectDeviceCore(
  uid: string,
  provider: 'garmin' | 'fitbit' | 'polar' | 'whoop' | 'oura',
  retainData: boolean,
): Promise<void> {
  const db = getFirestore();

  // 1. POST to Open Wearables server to stop sample stream (idempotent)
  if (OPEN_WEARABLES_BASE_URL) {
    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(`${OPEN_WEARABLES_BASE_URL}/disconnect/${uid}/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // Non-fatal: OW server may be temporarily unavailable; consent gate will
      // reject any incoming samples since consent is revoked.
      console.warn('[disconnectDevice] OW disconnect call failed (non-fatal):', err);
    }
  }

  // 2. Delete _lookup mapping
  try {
    await db.doc(`users/_lookup/wearable/${provider}/${uid}`).delete();
  } catch (err) {
    // Non-fatal if document doesn't exist
    console.warn('[disconnectDevice] _lookup delete failed (non-fatal):', err);
  }

  // 3. Write disabled flag to stop webhook ingestion (belt-and-braces)
  await db.doc(`users/${uid}/private/wearable`).set(
    { disabled: true, disabledAt: FieldValue.serverTimestamp() },
    { merge: true },
  );

  // 4. If retainData=false, schedule data deletion via Cloud Tasks
  if (!retainData) {
    try {
      const { CloudTasksClient } = await import('@google-cloud/tasks');
      const client = new CloudTasksClient();
      const project = process.env['GCP_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
      const location = 'southamerica-east1';
      const queue = `projects/${project}/locations/${location}/queues/daily-health-rollup`;

      const functionUrl =
        `https://${location}-${project}.cloudfunctions.net/wearables-deleteUserWearableData`;

      // Schedule deletion 1 hour from now to allow any in-flight writes to complete
      await client.createTask({
        parent: queue,
        task: {
          scheduleTime: {
            seconds: Math.floor(Date.now() / 1000) + 3600,
          },
          httpRequest: {
            httpMethod: 'POST' as const,
            url: functionUrl,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from(JSON.stringify({ uid, deleteAll: true })).toString('base64'),
          },
        },
      });
    } catch (err) {
      console.warn('[disconnectDevice] delete task scheduling failed (non-fatal):', err);
    }
  }

  // 5. Audit log
  await db.collection('auditLog').doc().set({
    action: 'wearable_disconnected',
    uid,
    provider,
    retainData,
    timestamp: FieldValue.serverTimestamp(),
  });
}

export const disconnectDevice = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = request.auth.uid;

    const parseResult = InputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input');
    }
    const { provider, retainData } = parseResult.data;

    await disconnectDeviceCore(uid, provider, retainData);

    return { ok: true };
  },
);
