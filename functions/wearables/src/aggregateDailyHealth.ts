/**
 * aggregateDailyHealth.ts — Cloud Task HTTP target for daily health rollup.
 *
 * This Function is invoked by Cloud Tasks scheduled in openWearablesWebhook.ts
 * with a 60-second delay for debounce. The delay absorbs Garmin sync bursts
 * (2K samples in 5s per RESEARCH §4) — T-02-09-08.
 *
 * Input: POST body { uid: string, day: 'yyyy-mm-dd' }
 *
 * Output: writes /users/{uid}/healthDaily/{yyyy-mm-dd} with aggregated stats.
 *
 * WEAR-12 anti-feature: NO automated medical alerts. Even if hr values are <30
 * or >220, this Function ONLY aggregates and stores — it does NOT send notifications,
 * trigger Discord DMs, or write to any medicalAlerts collection.
 *
 * Pitfall #9: healthDaily is an additive input to character stats, never required.
 */
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';

const InputSchema = z.object({
  uid: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // yyyy-mm-dd
});

export interface HealthDailyDoc {
  date: string;
  stepsTotal: number;
  hrAvg: number | null;
  hrMax: number | null;
  hrRest: number | null;
  sleepMinutes: number | null;
  caloriesActive: number | null;
  workoutCount: number;
  byMetric: Record<string, { sum: number; count: number; avg: number }>;
  computedAt: unknown; // Firestore Timestamp
  source: Array<'wearable' | 'manual' | 'pedometer'>;
}

function aggregateSamples(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Omit<HealthDailyDoc, 'date' | 'computedAt' | 'source'> {
  // Accumulate per-metric stats
  const byMetric: Record<string, { sum: number; count: number; min: number; max: number }> = {};

  for (const doc of docs) {
    const d = doc.data();
    const metric = d['metric'] as string;
    const value = d['value'] as number;

    if (!byMetric[metric]) {
      byMetric[metric] = { sum: 0, count: 0, min: Infinity, max: -Infinity };
    }
    byMetric[metric].sum += value;
    byMetric[metric].count += 1;
    if (value < byMetric[metric].min) byMetric[metric].min = value;
    if (value > byMetric[metric].max) byMetric[metric].max = value;
  }

  // Compute result metrics
  const steps = byMetric['steps'];
  const hr = byMetric['heart_rate'];
  const sleep = byMetric['sleep_minutes'];
  const calories = byMetric['calories'];
  const workout = byMetric['workout'];

  const result: Record<string, { sum: number; count: number; avg: number }> = {};
  for (const [k, v] of Object.entries(byMetric)) {
    result[k] = {
      sum: v.sum,
      count: v.count,
      avg: v.count > 0 ? v.sum / v.count : 0,
    };
  }

  return {
    stepsTotal: steps ? steps.sum : 0,
    hrAvg: hr && hr.count > 0 ? Math.round(hr.sum / hr.count) : null,
    hrMax: hr ? (hr.max === -Infinity ? null : hr.max) : null,
    hrRest: hr ? (hr.min === Infinity ? null : hr.min) : null,
    sleepMinutes: sleep ? sleep.sum : null,
    caloriesActive: calories ? calories.sum : null,
    workoutCount: workout ? workout.count : 0,
    byMetric: result,
  };
}

export const aggregateDailyHealth = onRequest(
  {
    region: 'southamerica-east1',
    // Cloud Tasks invokes this via HTTPS; authenticated via Cloud Tasks service account
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // Validate input
    const parseResult = InputSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input', details: parseResult.error.issues });
      return;
    }
    const { uid, day } = parseResult.data;
    const yyyymm = day.slice(0, 7); // 'yyyy-mm'

    const db = getFirestore();

    // Query samples for this user+day in the monthly bucket
    const dayStart = new Date(`${day}T00:00:00.000Z`);
    const dayEnd = new Date(`${day}T23:59:59.999Z`);

    const samplesRef = db.collection(`users/${uid}/healthSamples/${yyyymm}/metrics`);
    const snap = await samplesRef
      .where('recordedAt', '>=', Timestamp.fromDate(dayStart))
      .where('recordedAt', '<=', Timestamp.fromDate(dayEnd))
      .get();

    const aggregated = aggregateSamples(snap.docs);

    const healthDailyDoc: HealthDailyDoc = {
      date: day,
      ...aggregated,
      computedAt: FieldValue.serverTimestamp(),
      source: ['wearable'],
    };

    await db.doc(`users/${uid}/healthDaily/${day}`).set(healthDailyDoc, { merge: true });

    // Audit log
    await db.collection('auditLog').doc().set({
      action: 'health_daily_aggregated',
      uid,
      day,
      sampleCount: snap.size,
      timestamp: FieldValue.serverTimestamp(),
    });

    res.status(200).json({ ok: true, day, sampleCount: snap.size });
  },
);
