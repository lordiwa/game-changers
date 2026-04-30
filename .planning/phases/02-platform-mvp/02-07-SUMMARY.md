---
phase: "02"
plan: "07"
subsystem: events
tags: [events, qr-checkin, background-sync, offline, trustsafety, wcag, axe, playwright]
dependency_graph:
  requires: [02-04, 02-05]
  provides: [events-crud, qr-checkin, offline-sync, post-event-card, report-user, wcag-aa]
  affects: [gamification, analytics, discord-bot]
tech_stack:
  added:
    - jose@^5 (HS256 QR JWT signing/verification in Cloud Functions)
    - "@napi-rs/canvas (server-side PNG post-event card rendering)"
    - "@google-cloud/pubsub (events-capacity-changed, xp-events, crisis-alerts topics)"
    - "@sentry/node@10.50.0 (reportUser critical severity alerts)"
    - jsqr (in-browser QR decode at 10fps via requestAnimationFrame)
    - "@axe-core/playwright (WCAG 2.1 AA automated audit in Playwright E2E)"
    - "@playwright/test@^1.59.1 (added to root package.json devDependencies)"
  patterns:
    - "Workbox Background Sync: checkin-queue with 24h maxRetentionTime"
    - "jti = attendanceRef.id for idempotent check-in (merge:true)"
    - "Haversine geofence in Cloud Function checkIn.ts"
    - "IDB offline queue (useIDBKeyval) for UI display; Workbox handles replay"
    - "ADR-001 firewall: postRecapToDiscord uses HMAC bot endpoint, not Discord API directly"
    - "Anonymous report-user: rate-limit 5/day, NEVER writes to reportedUid notifications"
    - "k-anonymity: postRecapToDiscord sends aggregate-only stats (totalAttendees, theme)"
key_files:
  created:
    - functions/events/src/checkIn.ts
    - functions/events/src/rsvp.ts
    - functions/events/src/waitlistPromote.ts
    - functions/events/src/postEventCard.ts
    - functions/events/src/postRecapToDiscord.ts
    - functions/events/src/__tests__/checkIn.test.ts
    - functions/events/src/__tests__/rsvp.test.ts
    - functions/events/src/__tests__/waitlistPromote.test.ts
    - functions/events/src/__tests__/postEventCard.test.ts
    - functions/trustsafety/src/reportUser.ts
    - functions/trustsafety/src/__tests__/reportUser.test.ts
    - functions/trustsafety/package.json
    - apps/pwa/src/views/events/EventList.vue
    - apps/pwa/src/views/events/EventDetail.vue
    - apps/pwa/src/views/events/EventCheckIn.vue
    - apps/pwa/src/views/events/PostEventRecap.vue
    - apps/pwa/src/components/EventCard.vue
    - apps/pwa/src/components/QrScanner.vue
    - apps/pwa/src/components/ReportUserModal.vue
    - apps/pwa/src/composables/useEvents.ts
    - apps/pwa/src/composables/useCheckIn.ts
    - apps/pwa/src/composables/useOfflineQueue.ts
    - apps/pwa/src/composables/useGeolocation.ts
    - apps/pwa/src/composables/usePushNotifications.ts
    - apps/pwa/src/__tests__/useOfflineQueue.test.ts
    - apps/pwa/src/__tests__/useCheckIn.test.ts
    - apps/pwa/src/__tests__/QrScanner.test.ts
    - tests/e2e/events-offline-checkin.spec.ts
    - tests/e2e/a11y-events.spec.ts
    - tests/a11y/axe-config.json
  modified:
    - firebase.json (8th codebase: trustsafety)
    - functions/events/package.json (jose, @napi-rs/canvas, @google-cloud/pubsub)
    - functions/events/src/index.ts (all event callable exports)
    - apps/pwa/src/router/index.ts (4 event routes)
    - apps/pwa/vite.config.ts (Workbox Background Sync, navigateFallback, StaleWhileRevalidate)
    - apps/pwa/src/locales/es.json (events.* namespace)
    - apps/pwa/src/locales/en.json (events.* namespace)
    - package.json (@playwright/test, @axe-core/playwright devDeps)
decisions:
  - "jti as Firestore attendance document ID: idempotent check-in without duplicate-read risk (merge:true)"
  - "Workbox Background Sync for check-in POST (not custom IDB replay): platform-native, SW-level reliability"
  - "@napi-rs/canvas for post-event card: no Chromium/Puppeteer cold-start, smaller Cloud Function image"
  - "reportUser NEVER writes to reportedUid/notifications: LOPDP minimization + prevents targeted harassment"
  - "postRecapToDiscord aggregate-only (totalAttendees, theme): DBOT-05 compliance, no individual data to bot"
  - "trustsafety as 8th separate codebase: isolates sensitive moderation logic, separate deploy surface"
metrics:
  duration_minutes: 120
  completed_date: "2026-04-29"
  tasks_total: 2
  tasks_completed: 2
  files_created: 30
  files_modified: 8
---

# Phase 02 Plan 07: Events + QR Check-In + Accessibility Summary

**One-liner:** Firebase events CRUD with HS256 QR check-in, Workbox Background Sync offline queuing, trust-safety reportUser (8th codebase), and axe-core WCAG 2.1 AA Playwright audits.

## Tasks Completed

| Task | Name | Commit | Key Deliverables |
|------|------|--------|-----------------|
| 1 | Cloud Functions — events + trustsafety | `8fe3646` | createEvent, rsvp, cancelRsvp, waitlistPromote, checkIn, walkInCapture, postEventFeedback, generatePostEventCard, eventReminders, postRecapToDiscord, reportUser; 26 Vitest tests |
| 2 | PWA events surfaces + tests | `0fa7834` | EventList/Detail/CheckIn/PostEventRecap views; EventCard/QrScanner/ReportUserModal components; 5 composables; 21 Vitest tests; 2 Playwright E2E specs; axe config |

## What Was Built

### Task 1 — Cloud Functions (functions/events + functions/trustsafety)

**checkIn.ts** — HS256 JWT verification via jose, haversine geofence check (venue.lat/lng/radiusMeters), idempotent write via `attendance/${claims.jti}` (merge:true), publishes to xp-events Pub/Sub topic on success.

**rsvp.ts** — consentGate(uid, 'event_participation') enforced before any write; safetyContactUid required (EVNT-14 compliance); SignJWT with exp = startsAt+4h, jti = attendanceRef.id; cancelRsvp publishes events-capacity-changed for FIFO waitlist promotion.

**waitlistPromote.ts** — onMessagePublished triggered by events-capacity-changed; Firestore transaction reads event capacity, finds oldest waitlist entry (orderBy rsvpAt asc limit 1), promotes to rsvp atomically.

**postEventCard.ts** — @napi-rs/canvas renders 1080×1080 PNG server-side; stores to `post-event-cards/{eventId}/{uid}.png`; returns 30-day signed URL.

**postRecapToDiscord.ts** — Sends aggregate-only stats (totalAttendees, theme) to bot HMAC endpoint. Individual user data never reaches Discord (DBOT-05 / ADR-001 compliance).

**reportUser.ts** — 8th codebase (trustsafety). consentGate(uid, 'basic_profile') required. Rate-limit: 5 reports/day via counter doc. NEVER writes to reportedUid/notifications. Critical severity (self_harm) triggers crisis-alerts Pub/Sub + Sentry.captureMessage. Pub/Sub message contains no reporter or reported UIDs.

**Test coverage:** 26 tests across 5 files — all passing.

### Task 2 — PWA Events Surfaces (apps/pwa)

**Views:** EventList (VueFire useCollection, capacity filter), EventDetail (RSVP + QR canvas, walk-in modal, ReportUserModal), EventCheckIn (organizer: QrScanner + manual search; attendee: QR canvas), PostEventRecap (NPS 0-10, qualitative text, optional wellness, shareable card).

**Components:**
- EventCard: capacity bar with aria-label (text not color-only, T-02-07-12), difficulty badge, RSVP CTA, 44×44 touch targets
- QrScanner: getUserMedia + jsqr decode at 10fps, aria-live polite for screen readers, offline badge when pendingScans > 0, manual fallback emit
- ReportUserModal: role=dialog + aria-modal + aria-labelledby + aria-describedby; min 20 chars free-text validation; callReportUser from useEvents

**Composables:**
- useEvents / useEvent / useEventAttendance: VueFire useCollection/useDocument (no onSnapshot in components per ESLint rule)
- useCheckIn: POST /api/events/{id}/checkin intercepted by Workbox SW; enqueues to IDB when offline; returns typed CheckInStatus
- useOfflineQueue: IDB-backed queue via useIDBKeyval; pendingCount reactive computed; Workbox handles replay
- useGeolocation: navigator.geolocation.getCurrentPosition with 3s timeout, graceful fallback
- usePushNotifications: FCM permission gated on event_participation consent; only requests after user opt-in

**PWA/Workbox:** Background Sync checkin-queue (maxRetentionTime 24*60 min), navigateFallback /index.html, StaleWhileRevalidate for /events/ and /content/.

**i18n:** Full events.* namespace in both es.json and en.json covering list, empty state, detail, checkin (scanner status, error states including offline_body), report modal.

**Tests:**
- useOfflineQueue.test.ts — 6 tests (enqueue, dequeue, clearAll, pendingCount reactivity, isOnline)
- useCheckIn.test.ts — 6 tests (success, QR_EXPIRED, OUT_OF_VENUE, offline, network error, idle default)
- QrScanner.test.ts — 9 tests (aria-live region, button labels, manual-fallback emit, offline badge, toast types)
- events-offline-checkin.spec.ts — Playwright E2E: offline queue behavior + attendee QR view
- a11y-events.spec.ts — Playwright + axe-core: wcag2a/wcag2aa/wcag21aa audit on events pages; capacity bar text assertion; 44×44 touch target check

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] HttpsError `.toThrow()` matching against .code not .message**
- **Found during:** Task 1 test verification
- **Issue:** `expect(fn).rejects.toThrow('permission-denied')` fails because Vitest's `.toThrow(string)` matches against `error.message`; HttpsError stores the error code in `.code`
- **Fix:** Changed to `.rejects.toMatchObject({ code: 'permission-denied' })` and `.toThrow(expect.objectContaining({ code: 'resource-exhausted' }))`
- **Files modified:** functions/events/src/__tests__/rsvp.test.ts, functions/trustsafety/src/__tests__/reportUser.test.ts
- **Commit:** 8fe3646

**2. [Rule 3 - Blocking] Missing Playwright + axe-core dev dependencies**
- **Found during:** Task 2 — creating E2E and a11y specs that import @playwright/test and @axe-core/playwright
- **Issue:** Neither @playwright/test nor @axe-core/playwright were in any workspace package.json
- **Fix:** Added both to root package.json devDependencies (@playwright/test@^1.59.1, @axe-core/playwright@^4.10.2)
- **Files modified:** package.json
- **Commit:** 0fa7834

## Known Stubs

None that affect plan goal delivery. The following items are intentional deferral stubs:

- `manualCheckIn()` in EventCheckIn.vue logs to console (Phase 2 stub, labeled in code) — organizer manual mark-as-checked-in via callable is deferred to when organizer role mgmt is fully wired
- `usePushNotifications` wraps FCM but push subscription is not triggered automatically — requires explicit user opt-in via consent gate (by design, not a stub)
- `postRecapToDiscord` HMAC endpoint URL (`BOT_RECAP_ENDPOINT` secret) is defined but the Discord bot endpoint is implemented in the bot codebase (plan 02-08 or later)

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new-callable | functions/events/src/rsvp.ts | rsvp callable is new public surface; protected by consentGate + safetyContactUid check |
| threat_flag: new-callable | functions/events/src/checkIn.ts | checkIn callable is new public surface; HS256 JWT required, geofence enforced |
| threat_flag: new-callable | functions/trustsafety/src/reportUser.ts | reportUser callable; rate-limited 5/day, requires basic_profile consent |
| threat_flag: file-access | functions/events/src/postEventCard.ts | Writes to Cloud Storage post-event-cards/{eventId}/{uid}.png; Storage rules must restrict reads to owner or signed URLs only |

## Self-Check: PASSED

- `8fe3646` exists in git log: FOUND
- `0fa7834` exists in git log: FOUND
- `functions/events/src/checkIn.ts` exists: FOUND
- `functions/trustsafety/src/reportUser.ts` exists: FOUND
- `apps/pwa/src/views/events/EventList.vue` exists: FOUND
- `apps/pwa/src/views/events/EventCheckIn.vue` exists: FOUND
- `apps/pwa/src/__tests__/useOfflineQueue.test.ts` exists: FOUND
- `apps/pwa/src/__tests__/useCheckIn.test.ts` exists: FOUND
- `apps/pwa/src/__tests__/QrScanner.test.ts` exists: FOUND
- `tests/e2e/events-offline-checkin.spec.ts` exists: FOUND
- `tests/e2e/a11y-events.spec.ts` exists: FOUND
- `tests/a11y/axe-config.json` exists: FOUND
- All 20 PWA Vitest test files pass (103 assertions): VERIFIED
- All 5 events function Vitest test files pass (26 assertions): VERIFIED (Task 1)
- All 1 trustsafety function Vitest test file passes (6 assertions): VERIFIED (Task 1)
