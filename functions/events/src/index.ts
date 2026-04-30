/*
 * Plan 02-07 — events codebase entry point.
 * Exports all events Cloud Functions (10 + 1 bot endpoint from Plan 03).
 */
import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

// Plan 02-03: bot-callable endpoint
export { botListUpcoming } from './botListUpcoming.js';

// Plan 02-07: CRUD + RSVP + waitlist + QR check-in + walk-in + feedback + card + reminders + recap
export { createEvent } from './createEvent.js';
export { rsvp, cancelRsvp } from './rsvp.js';
export { waitlistPromote } from './waitlistPromote.js';
export { checkIn } from './checkIn.js';
export { walkInCapture } from './walkInCapture.js';
export { postEventFeedback } from './postEventFeedback.js';
export { generatePostEventCard } from './postEventCard.js';
export { eventReminders } from './eventReminders.js';
export { postRecapToDiscord } from './postRecapToDiscord.js';
