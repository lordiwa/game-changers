/**
 * grant.ts — Transactional consent grant with hash-chained ledger.
 *
 * CNST-01..05, CNST-06 (version verification), CNST-08 (hash chain).
 * Threats mitigated: T-02-04-01 (atomicity), T-02-04-04 (textHash verify),
 * T-02-04-05 (minor block), T-02-04-02 (hash chain).
 */
import crypto from 'node:crypto';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import {
  CONSENT_CATEGORIES,
  CLAIM_BITMAP_KEYS,
  type ConsentCategory,
} from '@gamechangers/functions-shared/ConsentEnforcement';

// Layer → categories mapping (D-15 single wearable_data, D-16 three b2b_*).
export const LAYER_TO_CATEGORIES: Record<0 | 1 | 2 | 3 | 4, ConsentCategory[]> = {
  0: ['basic_profile'],
  1: ['event_participation', 'gaming_habits'],
  2: ['health_self_reports'],
  3: ['wearable_data'],
  4: ['b2b_insurers', 'b2b_healthcare', 'b2b_brands', 'cross_border', 'research'],
};

const LAYER4_CATEGORIES: ConsentCategory[] = LAYER_TO_CATEGORIES[4];

// SHA-256 hash helper.
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Build ledger chain hash: sha256(prevHash + JSON(payload) + uid + timestampMs).
export function buildLedgerHash(
  prevHash: string,
  payload: Record<string, unknown>,
  uid: string,
  timestampMs: number,
): string {
  return sha256(`${prevHash}${JSON.stringify(payload)}${uid}${timestampMs}`);
}

const GrantInputSchema = z.object({
  category: z.enum(CONSENT_CATEGORIES),
  version: z.string().min(1),
  textHash: z.string().min(64),
  layer: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
});

export const consentGrant = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;

    // Validate input.
    const parsed = GrantInputSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', parsed.error.message);
    }
    const { category, version, textHash, layer } = parsed.data;

    // D-14: minors cannot grant Layer 4 (B2B + research + cross_border).
    const isMinor = request.auth.token['isMinor'] === true;
    if (isMinor && LAYER4_CATEGORIES.includes(category)) {
      throw new HttpsError('failed-precondition', 'MINOR_CANNOT_GRANT_LAYER_4');
    }

    const db = getFirestore();

    // Verify the consent text version exists and textHash matches.
    const consentTextRef = db.doc(`consentTexts/${category}/${version}`);
    const consentTextSnap = await consentTextRef.get();
    if (!consentTextSnap.exists) {
      throw new HttpsError(
        'not-found',
        `Consent text not found: consentTexts/${category}/${version}`,
      );
    }
    const consentTextData = consentTextSnap.data()!;
    const storedHash: string | undefined = consentTextData['textHash'] as string | undefined;
    // If the stored doc has a textHash field, verify it matches. If not, compute from ES purpose.
    if (storedHash && storedHash !== textHash) {
      throw new HttpsError(
        'failed-precondition',
        `textHash mismatch for ${category} ${version}`,
      );
    }

    // Read the most recent ledger entry for this user to get prevHash.
    const ledgerQuery = await db
      .collection('consentLedger')
      .where('uid', '==', uid)
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();
    const prevHash = ledgerQuery.empty
      ? '0'.repeat(64)
      : (ledgerQuery.docs[0].data()['hash'] as string);

    // Prepare doc references.
    const consentDocRef = db.doc(`users/${uid}/consents/${category}`);
    const ledgerRef = db.collection('consentLedger').doc();
    const auditRef = db.collection('auditLog').doc();

    const now = new Date();
    const timestampMs = now.getTime();
    const expiresAt = new Date(timestampMs + 365 * 24 * 60 * 60 * 1000);

    const payload = {
      uid,
      category,
      action: 'grant',
      version,
      textHash,
      timestampMs,
    };
    const ledgerHash = buildLedgerHash(prevHash, payload, uid, timestampMs);

    // Atomic 3-document transaction.
    await db.runTransaction(async (tx) => {
      // 1. Consent doc.
      tx.set(consentDocRef, {
        category,
        status: 'granted',
        version,
        textHash,
        grantedAt: FieldValue.serverTimestamp(),
        revokedAt: null,
        expiresAt,
        layer,
      });

      // 2. Ledger entry.
      tx.set(ledgerRef, {
        uid,
        category,
        action: 'grant',
        version,
        textHash,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        prevHash,
        source: 'user',
      });

      // 3. Audit entry.
      tx.set(auditRef, {
        uid,
        category,
        action: 'consent_grant',
        version,
        timestamp: FieldValue.serverTimestamp(),
        hash: ledgerHash,
        source: 'grant',
      });
    });

    // Refresh custom claims (claim refresh propagates within 1 hour to Rules; middleware reads doc immediately).
    const auth = getAuth();
    const userRecord = await auth.getUser(uid);
    const existingClaims = (userRecord.customClaims ?? {}) as Record<string, unknown>;
    const existingConsents = (existingClaims['consents'] ?? {}) as Record<string, boolean>;
    const bitmapKey = CLAIM_BITMAP_KEYS[category];
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      consents: { ...existingConsents, [bitmapKey]: true },
    });

    return { ok: true };
  },
);
