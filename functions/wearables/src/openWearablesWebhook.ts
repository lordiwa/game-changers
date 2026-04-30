/**
 * openWearablesWebhook.ts — HMAC-validated Open Wearables webhook receiver.
 *
 * Security model (T-02-09-01, T-02-09-02):
 *   1. Validate X-OW-Signature header with timing-safe HMAC comparison (Plan 01 hmac.ts).
 *   2. Zod-validate payload shape.
 *   3. Resolve uid from /users/_lookup/wearable/{provider}/{providerId}.
 *   4. consentGate(uid, 'wearable_data') — 403 if missing/revoked.
 *   5. Write samples to monthly-bucketed path /users/{uid}/healthSamples/{yyyy-mm}/metrics/{id}.
 *   6. Schedule Cloud Task (60s delay, daily-health-rollup queue) for aggregateDailyHealth.
 *
 * Anti-features enforced:
 *   WEAR-12: NO automated medical alerts — abnormal HR/sleep values are stored only, never trigger
 *            notifications. See no-medical-alerts.test.ts for source-scan assertion.
 *
 * TTL policy: expireAt = recordedAt + 90 days (LOPDP minimization, T-02-09-12).
 * Idempotency: deterministic doc ID = s.id (provider's sample ID); replay-safe.
 */
import { onRequest, type Request } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { verifyHmacSha256 } from '@gamechangers/functions-shared/hmac';
import { consentGate } from '@gamechangers/functions-shared/ConsentEnforcement';

const OW_HMAC_SECRET = defineSecret('OW_HMAC_SECRET');
const OPEN_WEARABLES_BASE_URL = process.env['OPEN_WEARABLES_BASE_URL'] ?? '';
export { OPEN_WEARABLES_BASE_URL };

// ── Zod schemas ────────────────────────────────────────────────────────────────
const SampleSchema = z.object({
  id: z.string().min(1),
  metric: z.enum(['steps', 'heart_rate', 'sleep_minutes', 'calories', 'workout', 'distance']),
  value: z.number(),
  unit: z.string(),
  recordedAt: z.string(), // ISO 8601
});

const WebhookPayloadSchema = z.object({
  uid: z.string().min(1),
  provider: z.enum(['garmin', 'fitbit', 'polar', 'whoop', 'oura']),
  samples: z.array(SampleSchema).min(1).max(500),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ── Cloud Tasks queue config ────────────────────────────────────────────────
const TASKS_QUEUE = 'daily-health-rollup';
const DEBOUNCE_DELAY_SECONDS = 60;

async function scheduleAggregateTask(uid: string, day: string): Promise<void> {
  // Schedule a Cloud Task to aggregate health data for the given user+day.
  // We use a lightweight fire-and-forget approach: import @google-cloud/tasks only
  // at runtime to keep the cold-start payload small.
  try {
    const { CloudTasksClient } = await import('@google-cloud/tasks');
    const client = new CloudTasksClient();
    const project = process.env['GCP_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';
    const location = 'southamerica-east1';
    const queue = `projects/${project}/locations/${location}/queues/${TASKS_QUEUE}`;

    const functionUrl =
      `https://${location}-${project}.cloudfunctions.net/wearables-aggregateDailyHealth`;

    await client.createTask({
      parent: queue,
      task: {
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + DEBOUNCE_DELAY_SECONDS,
        },
        httpRequest: {
          httpMethod: 'POST' as const,
          url: functionUrl,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ uid, day })).toString('base64'),
        },
      },
    });
  } catch (err) {
    // Non-fatal: Cloud Tasks queue may not exist in emulator. Log and continue.
    console.warn('[openWearablesWebhook] scheduleAggregateTask failed (non-fatal):', err);
  }
}

async function writeSamples(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  payload: WebhookPayload,
): Promise<Set<string>> {
  const touchedDays = new Set<string>();
  const batch = db.batch();

  for (const s of payload.samples) {
    const recordedDate = new Date(s.recordedAt);
    const yyyymm = s.recordedAt.slice(0, 7); // 'yyyy-mm'
    const day = s.recordedAt.slice(0, 10);   // 'yyyy-mm-dd'
    const expireAt = new Date(recordedDate.getTime() + 90 * 24 * 60 * 60 * 1000);

    const sampleRef = db
      .collection(`users/${uid}/healthSamples/${yyyymm}/metrics`)
      .doc(s.id); // deterministic ID — replay-safe

    batch.set(sampleRef, {
      metric: s.metric,
      value: s.value,
      unit: s.unit,
      recordedAt: Timestamp.fromDate(recordedDate),
      source: 'open-wearables' as const,
      providerName: payload.provider,
      samplerVersion: '0.4.3',
      expireAt: Timestamp.fromDate(expireAt),
    }, { merge: true }); // merge:true for idempotent replay

    touchedDays.add(day);
  }

  await batch.commit();
  return touchedDays;
}

export const openWearablesWebhook = onRequest(
  {
    region: 'southamerica-east1',
    secrets: [OW_HMAC_SECRET],
    // rawBody is enabled by default in Cloud Functions v2 onRequest
  },
  async (req: Request, res) => {
    // ── 1. Method guard ─────────────────────────────────────────────────────
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── 2. HMAC verification (T-02-09-01 — timing-safe) ────────────────────
    const signature = req.headers['x-ow-signature'] as string | undefined;
    if (!signature) {
      res.status(401).json({ error: 'Missing X-OW-Signature header' });
      return;
    }

    const rawBody: Buffer = req.rawBody as unknown as Buffer;
    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw body' });
      return;
    }

    const hmacSecret = OW_HMAC_SECRET.value();
    const valid = verifyHmacSha256(rawBody, signature, hmacSecret);
    if (!valid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // ── 3. Zod-validate payload ─────────────────────────────────────────────
    const parseResult = WebhookPayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid payload', details: parseResult.error.issues });
      return;
    }
    const payload = parseResult.data;
    const { uid, provider } = payload;

    // ── 4. Resolve uid → _lookup (provider mapping set by connectDevice) ─────
    const db = getFirestore();

    // Check if user has a _lookup document for this provider
    // (The exact providerId is embedded in the payload uid mapping by OW server)
    const lookupSnap = await db.doc(`users/_lookup/wearable/${provider}/${uid}`).get();
    if (!lookupSnap.exists) {
      // Try the direct uid lookup (if uid is the Firebase uid directly)
      const directCheck = await db.doc(`users/${uid}/profile/main`).get();
      if (!directCheck.exists) {
        await db.collection('auditLog').doc().set({
          action: 'wearable_sample_dropped_unknown_uid',
          uid,
          provider,
          timestamp: FieldValue.serverTimestamp(),
        });
        res.status(404).json({ error: 'Unknown user for provider' });
        return;
      }
    }

    // ── 5. Consent gate (wearable_data = claim 'w') ──────────────────────────
    try {
      await consentGate(uid, 'wearable_data');
    } catch {
      // consentGate throws HttpsError; we map to 403 for HTTP context
      await db.collection('auditLog').doc().set({
        action: 'wearable_sample_dropped_no_consent',
        uid,
        provider,
        sampleCount: payload.samples.length,
        timestamp: FieldValue.serverTimestamp(),
      });
      res.status(403).json({ error: 'Consent not granted for wearable_data' });
      return;
    }

    // ── 6. Write samples to monthly bucket ──────────────────────────────────
    const touchedDays = await writeSamples(db, uid, payload);

    // ── 7. Schedule Cloud Tasks for daily rollup (60s debounce) ─────────────
    // Each touched day gets a Cloud Task scheduled 60s in the future.
    // Rate-limited via the daily-health-rollup queue (100 RPS) — T-02-09-08.
    const taskPromises: Promise<void>[] = [];
    for (const day of touchedDays) {
      taskPromises.push(scheduleAggregateTask(uid, day));
    }
    await Promise.allSettled(taskPromises); // non-fatal; don't block response

    // ── 8. Audit log ─────────────────────────────────────────────────────────
    await db.collection('auditLog').doc().set({
      action: 'wearable_samples_received',
      uid,
      provider,
      sampleCount: payload.samples.length,
      daysAffected: [...touchedDays],
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(204).send();
  },
);
