/**
 * seedConsentTexts.ts — Admin-only idempotent HTTP function to seed consent text docs.
 *
 * Reads functions/consent/data/consentTexts/v3/{category}.json and writes each to
 * /consentTexts/{category}/v3 in Firestore if not already present.
 *
 * Security: HMAC + admin secret header gate. Run once after deploy.
 */
import { createRequire } from 'node:module';
import { createHmac, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { sha256 } from './grant.js';
import { CONSENT_CATEGORIES } from '@gamechangers/functions-shared/ConsentEnforcement';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ConsentTextJson {
  version: string;
  category: string;
  es: {
    purpose: string;
    scope: string;
    retention: string;
    share: string;
  };
  en: {
    purpose: string;
    scope: string;
    retention: string;
    share: string;
  };
  publishedAt: string;
}

export const seedConsentTexts = onRequest(
  { region: 'southamerica-east1' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // HMAC authentication gate. Fail closed if the admin secret is not configured —
    // do NOT fall back to a hardcoded dev secret in any environment (T-02-01-10).
    const adminSecret = process.env['SEED_ADMIN_SECRET'];
    if (!adminSecret) {
      console.error('[seedConsentTexts] SEED_ADMIN_SECRET is not set — refusing to run.');
      res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURATION' });
      return;
    }
    const providedHmac = (req.headers['x-admin-hmac'] as string | undefined) ?? '';
    const expectedHmacHex = createHmac('sha256', adminSecret)
      .update('seed-consent-texts')
      .digest('hex');
    const expectedBuf = Buffer.from(expectedHmacHex, 'utf8');
    const providedBuf = Buffer.from(providedHmac, 'utf8');
    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      res.status(403).json({ ok: false, error: 'Forbidden' });
      return;
    }

    const db = getFirestore();
    const seeded: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const category of CONSENT_CATEGORIES) {
      try {
        const jsonPath = path.resolve(
          __dirname,
          '../../data/consentTexts/v3',
          `${category}.json`,
        );
        const data: ConsentTextJson = require(jsonPath) as ConsentTextJson;

        // Compute textHash from the ES purpose text (canonical hash for grant verification).
        const textHash = sha256(data.es.purpose);

        const docRef = db.doc(`consentTexts/${category}/v3`);
        const existing = await docRef.get();

        if (existing.exists) {
          skipped.push(category);
          continue;
        }

        await docRef.set({
          version: data.version,
          category: data.category,
          es: data.es,
          en: data.en,
          textHash,
          publishedAt: new Date(data.publishedAt),
          seededAt: new Date(),
        });
        seeded.push(category);
      } catch (err) {
        errors.push(`${category}: ${String(err)}`);
      }
    }

    res.status(200).json({
      ok: true,
      seeded,
      skipped,
      errors,
    });
  },
);
