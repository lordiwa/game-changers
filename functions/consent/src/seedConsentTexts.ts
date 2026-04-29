/**
 * seedConsentTexts.ts — Admin-only idempotent HTTP function to seed consent text docs.
 *
 * Reads functions/consent/data/consentTexts/v3/{category}.json and writes each to
 * /consentTexts/{category}/v3 in Firestore if not already present.
 *
 * Security: HMAC + admin secret header gate. Run once after deploy.
 */
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
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

    // HMAC authentication gate.
    const adminSecret = process.env['SEED_ADMIN_SECRET'] ?? 'dev-seed-secret';
    const providedHmac = req.headers['x-admin-hmac'] as string | undefined;
    const expectedHmac = createHmac('sha256', adminSecret).update('seed-consent-texts').digest('hex');
    if (!providedHmac || providedHmac !== expectedHmac) {
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
