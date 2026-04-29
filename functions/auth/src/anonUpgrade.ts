/*
 * Plan 02-02 Task 1 — anonymous → email/phone upgrade Cloud Function (server-side fallback).
 *
 * ADR-008: anonymous Firebase uid is canonical. Client SHOULD call
 * `auth.currentUser.linkWithCredential(emailCred)` directly — that path keeps the uid.
 * This Function is the server-side fallback for cases where the client cannot complete
 * the link (e.g., email-already-in-use conflict resolution flow).
 *
 * CRITICAL: NEVER call getAuth().createUser — that mints a new uid and DESTROYS the
 * anonymous uid's XP/attendance/badges. We use updateUser(uid, …) so the uid is preserved.
 *
 * Threats: T-02-02-09 (uid replacement / data loss).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { z } from 'zod';

const Body = z.object({
  method: z.enum(['email', 'phone']),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().min(8).optional(),
});

export const anonUpgrade = onCall(
  { region: 'southamerica-east1', cors: true },
  async (req) => {
    if (!req.auth) {
      throw new HttpsError('unauthenticated', 'AUTH_REQUIRED');
    }
    const uid = req.auth.uid;
    // Only anonymous users may upgrade through this Function.
    const isAnonymous = req.auth.token.firebase?.sign_in_provider === 'anonymous';
    if (!isAnonymous) {
      throw new HttpsError('failed-precondition', 'NOT_ANONYMOUS');
    }
    const body = Body.parse(req.data);

    if (body.method === 'email') {
      if (!body.email || !body.password) {
        throw new HttpsError('invalid-argument', 'EMAIL_PASSWORD_REQUIRED');
      }
      // ADR-008: updateUser keeps the same uid (does NOT call createUser).
      await getAuth().updateUser(uid, { email: body.email, password: body.password });
      return { uid, isAnonymous: false, email: body.email };
    }

    if (body.method === 'phone') {
      if (!body.phone) {
        throw new HttpsError('invalid-argument', 'PHONE_REQUIRED');
      }
      await getAuth().updateUser(uid, { phoneNumber: body.phone });
      return { uid, isAnonymous: false, phone: body.phone };
    }

    throw new HttpsError('invalid-argument', 'UNKNOWN_METHOD');
  },
);
