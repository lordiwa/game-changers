/*
 * Plan 02-02 Task 1 — Age verification Cloud Function (D-14 16+ floor per LOPDP Art. 24).
 *
 * Behavior:
 *   - <16  → reject (HttpsError failed-precondition AGE_UNDER_16) + auditLog `age_gate_rejected`.
 *   - 16-17 → set isMinor:true + parentalConsentRequired:true; ageVerified:true.
 *   - 18+  → ageVerified:true, isMinor:false.
 *
 * Birth date is sensitive PII. It is written ONLY to /users/{uid}/private/identity (Plan 01
 * Rules deny client R/W on /private/**). It NEVER goes to /users/{uid}/profile/main and is
 * NEVER exported to BigQuery (ADR-009). Only the derived `age_band` (5-year generalization)
 * may live in /profile/main and BigQuery.
 *
 * Threats: T-02-02-04 (claim spoofing — claims set server-side only),
 * T-02-02-05 (PII leak — birth date NEVER in /profile/main),
 * T-02-02-06 (under-16 elevation — server-side enforced),
 * T-02-02-07 (audit ledger).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { differenceInYears, parseISO, isValid } from 'date-fns';

const Body = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function ageBandFor(years: number): string {
  // 5-year generalization for B2B aggregates (BigQuery view safe).
  const band = Math.floor(years / 5) * 5;
  return `${band}-${band + 4}`;
}

export const verifyAge = onCall(
  { region: 'southamerica-east1', cors: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
    }
    const uid = req.auth.uid;
    const { birthDate } = Body.parse(req.data);
    const parsed = parseISO(birthDate);
    if (!isValid(parsed)) {
      throw new HttpsError('invalid-argument', 'BIRTHDATE_INVALID');
    }

    const age = differenceInYears(new Date(), parsed);
    const db = getFirestore();
    const auditRef = db.collection('auditLog').doc();

    if (age < 16) {
      await auditRef.set({
        uid,
        action: 'age_gate_rejected',
        ageAtCheck: age,
        timestamp: FieldValue.serverTimestamp(),
      });
      throw new HttpsError('failed-precondition', 'AGE_UNDER_16');
    }

    const isMinor = age < 18;
    const ageVerified = true;

    // Persist sensitive birth date in /private/identity (NEVER in /profile/main).
    await db.doc(`users/${uid}/private/identity`).set(
      {
        birthDate,
        ageVerified,
        isMinor,
        parentalConsentRequired: isMinor,
        ageBand: ageBandFor(age),
        verifiedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // Set custom claims server-side. Preserve any existing claims (e.g., consents bitmap).
    const user = await getAuth().getUser(uid);
    const existing = (user.customClaims ?? {}) as Record<string, unknown>;
    await getAuth().setCustomUserClaims(uid, {
      ...existing,
      ageVerified,
      isMinor,
    });

    await auditRef.set({
      uid,
      action: 'age_gate_passed',
      ageAtCheck: age,
      isMinor,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ageVerified, isMinor, parentalConsentRequired: isMinor };
  },
);
