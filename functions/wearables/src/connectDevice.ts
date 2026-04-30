/**
 * connectDevice.ts — HTTPS callable to initiate wearable OAuth via Open Wearables.
 *
 * Flow:
 *   1. Validate caller auth + consent (wearable_data — Layer 3).
 *   2. Generate a state token (CSRF protection for the OAuth callback).
 *   3. Return the Open Wearables OAuth URL; PWA opens it in a new tab.
 *   4. OW handles the provider OAuth dance; once connected, OW posts samples
 *      to our openWearablesWebhook endpoint.
 *
 * Providers supported: Garmin, Fitbit, Polar, Whoop, Oura.
 * Apple HealthKit + Android Health Connect are explicitly DEFERRED to Phase 3 (D-11).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'node:crypto';
import { z } from 'zod';
import { consentGate } from '@gamechangers/functions-shared/ConsentEnforcement';

const OPEN_WEARABLES_BASE_URL = process.env['OPEN_WEARABLES_BASE_URL'] ?? '';
const PWA_BASE_URL = process.env['PWA_BASE_URL'] ?? 'https://gamechangers.gg';

const InputSchema = z.object({
  provider: z.enum(['garmin', 'fitbit', 'polar', 'whoop', 'oura']),
});

export const connectDevice = onCall(
  { region: 'southamerica-east1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }
    const uid = request.auth.uid;

    // Validate input
    const parseResult = InputSchema.safeParse(request.data);
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid provider');
    }
    const { provider } = parseResult.data;

    // Consent gate: wearable_data (Layer 3)
    await consentGate(uid, 'wearable_data');

    // Generate CSRF state token
    const state = crypto.randomBytes(16).toString('hex');
    const db = getFirestore();

    // Store state token for CSRF validation (expires in 10 min)
    await db.doc(`users/${uid}/private/wearable_oauth_state`).set({
      state,
      provider,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Build the Open Wearables OAuth URL
    const callbackUrl = `${PWA_BASE_URL}/me/wearables/callback`;
    const oauthUrl = OPEN_WEARABLES_BASE_URL
      ? `${OPEN_WEARABLES_BASE_URL}/connect/${provider}?uid=${uid}&state=${state}&callback=${encodeURIComponent(callbackUrl)}`
      : `https://ow.gamechangers.gg/connect/${provider}?uid=${uid}&state=${state}&callback=${encodeURIComponent(callbackUrl)}`;

    await db.collection('auditLog').doc().set({
      action: 'wearable_connect_initiated',
      uid,
      provider,
      timestamp: FieldValue.serverTimestamp(),
    });

    return { ok: true, oauthUrl };
  },
);
