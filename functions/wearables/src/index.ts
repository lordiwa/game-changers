/**
 * functions/wearables/src/index.ts — Open Wearables integration Cloud Functions.
 *
 * Exports:
 *   openWearablesWebhook  — HMAC-validated HTTP webhook receiver
 *   aggregateDailyHealth  — Cloud Task target for daily health rollup
 *   connectDevice         — HTTPS callable to initiate wearable OAuth
 *   disconnectDevice      — HTTPS callable for user-initiated device disconnect
 *
 * Architecture constraints (ADR-009, ADR-011):
 *   - healthSamples NEVER exported to BigQuery (only healthDaily is exported)
 *   - Open Wearables 0.4.3 webhook-only in Phase 2; HealthKit/Health Connect DEFERRED (D-11)
 *   - WEAR-12 anti-feature: NO automated medical alerts from any Function here
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();

export { openWearablesWebhook } from './openWearablesWebhook.js';
export { aggregateDailyHealth } from './aggregateDailyHealth.js';
export { connectDevice } from './connectDevice.js';
export { disconnectDevice } from './disconnectDevice.js';
