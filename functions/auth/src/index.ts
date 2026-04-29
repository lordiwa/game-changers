/*
 * Plan 02-02 — auth codebase entry point.
 * Exports the four AUTH-* Cloud Functions deployed to southamerica-east1.
 *
 * passwordReset is the standard Firebase Auth flow (sendPasswordResetEmail) — handled
 * client-side via the PWA. No Function exists here for it; the action handler URL
 * is configured via Firebase Auth + Resend templates.
 */
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { discordExchange } from './discordExchange.js';
export { anonUpgrade } from './anonUpgrade.js';
export { verifyAge } from './ageGate.js';
export { unlinkDiscord } from './unlinkDiscord.js';
// Plan 02-03: bot-callable endpoint
export { botGenerateLinkToken } from './botEndpoints.js';
