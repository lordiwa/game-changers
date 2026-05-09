/**
 * dsarExport.ts — DSAR export with 30-day SLA.
 *
 * CNST-10: user requests export → async processing → ZIP to Cloud Storage → signed URL (7-day TTL).
 * Threat mitigated: T-02-04-03 (signed URL 7-day TTL, user-only inbox).
 */
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'node:crypto';
// archiver is typed via local ambient declaration in `./archiver.d.ts` to avoid
// pulling @types/archiver (which transitively pulls @types/node@25, breaking
// pnpm + vitest resolution on Windows: ERR_PACKAGE_IMPORT_NOT_DEFINED).
import archiver from 'archiver';
import { Writable } from 'node:stream';

const REGION = 'southamerica-east1';

/**
 * dsarExport — initiates an async DSAR export request.
 * Returns immediately with { ok: true, requestId } — actual processing is async.
 */
export const dsarExport = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const uid = request.auth.uid;
  const db = getFirestore();

  const requestId = crypto.randomUUID();
  const statusRef = db.doc(`users/${uid}/dsarRequests/${requestId}`);

  await statusRef.set({
    status: 'queued',
    requestedAt: FieldValue.serverTimestamp(),
    uid,
  });

  // In production: create a Cloud Task to call dsarRunner.
  // For MVP, trigger the runner synchronously in a background promise (fire-and-forget).
  // NOTE: In production, use @google-cloud/tasks to create a task targeting dsarRunner endpoint.
  // The Cloud Task approach is documented here but the background execution is the MVP fallback.
  setImmediate(() => {
    runDsarExport(uid, requestId).catch((err) => {
      console.error('[dsarExport] Runner failed:', err);
    });
  });

  return { ok: true, requestId };
});

/**
 * dsarRunner — HTTP onRequest target for Cloud Tasks.
 * Accepts POST with { uid, requestId } in the body.
 */
export const dsarRunner = onRequest({ region: REGION }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  const { uid, requestId } = req.body as { uid: string; requestId: string };
  if (!uid || !requestId) {
    res.status(400).send('Missing uid or requestId');
    return;
  }
  try {
    await runDsarExport(uid, requestId);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[dsarRunner] Error:', err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * Core DSAR export logic — collects user data, creates ZIP, uploads to Storage, generates signed URL.
 */
async function runDsarExport(uid: string, requestId: string): Promise<void> {
  const db = getFirestore();
  const storage = getStorage();
  const statusRef = db.doc(`users/${uid}/dsarRequests/${requestId}`);

  await statusRef.update({ status: 'processing', processingStartedAt: FieldValue.serverTimestamp() });

  // Collect user data scoped to /users/{uid}/...
  const [
    profileSnap,
    consentsSnap,
    badgesSnap,
    streaksSnap,
    enrollmentsSnap,
    progressSnap,
    healthDailySnap,
    ledgerSnap,
  ] = await Promise.all([
    db.doc(`users/${uid}/profile/main`).get(),
    db.collection(`users/${uid}/consents`).get(),
    db.collection(`users/${uid}/badges`).get(),
    db.collection(`users/${uid}/streaks`).get(),
    db.collection(`users/${uid}/challengeEnrollments`).get(),
    db.collection(`users/${uid}/challengeProgress`).get(),
    db.collection(`users/${uid}/healthDaily`).limit(365).get(), // last 365 daily summaries
    db.collection('consentLedger').where('uid', '==', uid).orderBy('timestamp', 'desc').get(),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    uid,
    requestId,
    profile: profileSnap.exists ? profileSnap.data() : null,
    consents: consentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    badges: badgesSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    streaks: streaksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    challengeEnrollments: enrollmentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    challengeProgress: progressSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    healthDaily: healthDailySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    consentLedger: ledgerSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };

  // Create ZIP archive.
  // Resolve projectId from env. Prefer the explicit GCLOUD_PROJECT (set by the
  // Cloud Functions runtime); fall back to FIREBASE_CONFIG.projectId, then to a
  // hardcoded default. NOTE: the previous expression had an operator-precedence
  // bug that resolved to `undefined.appspot.com` whenever GCLOUD_PROJECT was set
  // but FIREBASE_CONFIG was absent — silently breaking every DSAR upload.
  const fbConfigRaw = process.env['FIREBASE_CONFIG'];
  const fbConfig = fbConfigRaw
    ? (JSON.parse(fbConfigRaw) as { projectId?: string })
    : null;
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? fbConfig?.projectId ?? 'gamechangers-prod';

  const bucket = storage.bucket(`${projectId}.appspot.com`);
  const filePath = `dsar-exports/${uid}/${requestId}.zip`;
  const file = bucket.file(filePath);

  // Stream archiver directly into Cloud Storage upload stream.
  await new Promise<void>((resolve, reject) => {
    const uploadStream = file.createWriteStream({
      metadata: { contentType: 'application/zip' },
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', reject);
    uploadStream.on('error', reject);
    uploadStream.on('finish', resolve);

    archive.pipe(uploadStream as unknown as Writable);
    archive.append(JSON.stringify(exportData, null, 2), { name: 'data-export.json' });
    archive.finalize();
  });

  // Generate signed URL with 7-day TTL.
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: expiresAt,
  });

  // Send email via Resend REST API.
  const resendApiKey = process.env['RESEND_API_KEY'];
  if (resendApiKey) {
    const profileData = profileSnap.data();
    const userEmail = profileData?.['email'] as string | undefined;
    if (userEmail) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'GameChangers <noreply@gamechangers.gg>',
            to: [userEmail],
            subject: 'Tu exportación de datos está lista',
            html: `<p>Tu archivo de datos está listo. <a href="${downloadUrl}">Descargarlo aquí</a> (válido por 7 días).</p>`,
          }),
        });
      } catch (emailErr) {
        console.warn('[dsarRunner] Failed to send email — non-fatal:', emailErr);
      }
    }
  }

  // Update status doc.
  await statusRef.update({
    status: 'ready',
    readyAt: FieldValue.serverTimestamp(),
    downloadUrl,
    expiresAt,
  });
}
