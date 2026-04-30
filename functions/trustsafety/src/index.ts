/*
 * Plan 02-07 — trustsafety codebase entry point.
 * 8th Cloud Function codebase (extends ARCH-02's original 7-codebase split).
 *
 * Hosts anonymous report-user flow and future moderation Functions.
 */
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

export { reportUser } from './reportUser.js';
