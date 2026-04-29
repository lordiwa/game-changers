/**
 * functions/consent/src/index.ts — LOPDP consent engine Cloud Functions.
 *
 * Exports: consentGrant, consentRevoke, consentExpirySweeper,
 *          dsarExport, dsarRunner, accountErasure, erasureHardDelete,
 *          seedConsentTexts.
 *
 * All functions run in southamerica-east1 (São Paulo — closest to Ecuador).
 * Two-layer enforcement: Firestore Rules (claim bitmap) + consentGate (doc fallback + audit).
 */
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin SDK once at module load.
initializeApp();

export { consentGrant } from './grant.js';
export { consentRevoke } from './revoke.js';
export { consentExpirySweeper } from './expirySweeper.js';
export { dsarExport, dsarRunner } from './dsarExport.js';
export { accountErasure, erasureHardDelete } from './erasure.js';
export { seedConsentTexts } from './seedConsentTexts.js';
