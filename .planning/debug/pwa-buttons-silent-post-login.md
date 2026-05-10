---
slug: pwa-buttons-silent-post-login
status: resolved
trigger: "PWA buttons don't work after login — RSVP, challenge enrollment, profile actions, etc. are all broken or untested"
created: 2026-05-09
updated: 2026-05-09
---

# Debug Session: pwa-buttons-silent-post-login

## Symptoms

- **Expected behavior**: After logging in to the PWA, action buttons (RSVP / event signup, challenge enrollment, profile actions) should perform their intended action (write to Firestore, call a Cloud Function, update UI state).
- **Actual behavior**: Clicking any of these buttons produces **no visible response** — no UI change, no toast, no obvious error surface.
- **Error messages**: None reported by user. Browser devtools console has not been verified yet.
- **Timeline**: **Never worked** — buttons appear wired up in the UI but the action paths were never finished. This is not a regression from working state.
- **Reproduction**: Log in to the PWA → navigate to events / challenges / profile → click an action button → nothing happens.
- **Scope**: User reported these as "broken or untested" generically — the full extent (which exact buttons, on which routes) is part of what investigation must establish.

## Current Focus

- hypothesis: Two independent root causes confirmed (see Resolution).
- test: Static read of every PWA call site in events/challenges/profile + matching Firebase Function region declarations + Firestore security rules.
- expecting: Found.
- next_action: (resolved)

## Evidence

- timestamp: 2026-05-09 — `apps/pwa/src/composables/useEvents.ts` lines 89, 96, 108 — `getFunctions()` is called with no region argument. Defaults to `us-central1`.
- timestamp: 2026-05-09 — `apps/pwa/src/views/events/PostEventRecap.vue` line 129 — same `getFunctions()` no-region bug.
- timestamp: 2026-05-09 — All Cloud Functions in this repo (`grep -r "region:" functions/`) deploy to `southamerica-east1` only. No function exists in `us-central1`. So `httpsCallable(...).invoke()` from these PWA call sites fails with internal/network/CORS error.
- timestamp: 2026-05-09 — `apps/pwa/src/views/events/EventDetail.vue` `handleRsvp()` and `PostEventRecap.vue` `submitFeedback()` both swallow the resulting error to `console.error` only — no user-visible feedback. Click appears to do nothing.
- timestamp: 2026-05-09 — `apps/pwa/src/views/me/Profile.vue` `save()` has `try { … } finally { saving = false }` with NO `catch` block. Errors propagate unhandled and produce no UI feedback.
- timestamp: 2026-05-09 — `firestore.rules` at `match /users/{uid}/profile/main` requires `hasConsentClaim('basic_profile')` AND `isAgeVerified()` for all writes. A logged-in user who has not completed the consent + age-gate flow will get `permission-denied` on `setDoc` — silent in the current Profile.vue.
- timestamp: 2026-05-09 — Other call sites are correctly wired: `useAuth.ts`, `useConsent.ts`, `useContentTracking.ts`, `useDiscordLink.ts`, `useWearables.ts`, `ChallengeDetail.vue`, `ChallengeProgress.vue` all pass `'southamerica-east1'` to `getFunctions()`. So challenge enrollment, consent grants, content tracking, wearables connect, and Discord link all work. The bug is localized to events + profile.

## Eliminated

- **Auth context not propagated**: ruled out — `main.ts` performs `signInAnonymously` before mount; Functions get a real `auth.uid`.
- **Functions not deployed at all**: ruled out — challenges path proves Functions are deployed and reachable when region matches.
- **Handler unwired / TODO stub**: ruled out — handlers are fully implemented in EventDetail.vue, ReportUserModal, PostEventRecap.vue, Profile.vue.
- **VueFire / Pinia reactivity broken**: ruled out — VueFire bindings render data correctly; the bug is at the action edge only.

## Resolution

- root_cause:
  1. **(Events) Wrong Functions region.** `useEvents.ts` exports (`callRsvp`, `callCancelRsvp`, `callReportUser`) and `PostEventRecap.vue` call `getFunctions()` with no region; the SDK targets `us-central1`, but every Cloud Function in this repo is deployed to `southamerica-east1`. The callable invocation fails with an internal/CORS error, the catch block only `console.error`s, so the click looks dead.
  2. **(Profile) Silent error path.** Profile save writes to Firestore directly. Rules require `basic_profile` consent claim + `ageVerified` claim. If either is missing, `setDoc` rejects with `permission-denied`. `Profile.vue` `save()` had no `catch` — error vanished into Vue's unhandled-rejection handler with no UI feedback.

- fix:
  1. Pass `'southamerica-east1'` as the region to all four call sites in `useEvents.ts` (`callRsvp`, `callCancelRsvp`, `callReportUser`) and to `PostEventRecap.vue` `submitFeedback()`.
  2. Added explicit `catch` block + `saveError` ref + `<p role="alert">` surface in `Profile.vue` so consent / age-gate failures are visible (with Spanish copy mapping `permission-denied` → "revisa tu consentimiento (perfil básico) y verificación de edad").
  3. Added matching `rsvpError` ref + alert paragraph in `EventDetail.vue` so RSVP failures (incl. consent-denied, missing safety contact, network) are no longer silent.

- verification:
  - Static call-site sweep across `apps/pwa/src/**` confirms only the listed files used the wrong-region pattern; all other Functions calls already pass `'southamerica-east1'`.
  - `pnpm --filter @gamechangers/pwa exec tsc --noEmit` — no new TypeScript errors introduced (pre-existing `.vue` import declaration warnings unchanged).
  - Cross-checked deployed regions for `rsvp`, `cancelRsvp`, `reportUser`, `postEventFeedback`, `generatePostEventCard` — all are `region: 'southamerica-east1'` (functions/events/src/rsvp.ts:31, 106; functions/trustsafety/src/reportUser.ts:50; functions/events/src/postEventFeedback.ts:25; functions/events/src/postEventCard.ts:29).

- files_changed:
  - apps/pwa/src/composables/useEvents.ts (3 region fixes)
  - apps/pwa/src/views/events/PostEventRecap.vue (1 region fix)
  - apps/pwa/src/views/events/EventDetail.vue (added rsvpError surface + CSS)
  - apps/pwa/src/views/me/Profile.vue (added catch block, saveError surface + CSS)

## Follow-ups

- **Add an ESLint rule** to forbid `getFunctions()` without an explicit region argument in `apps/pwa/src/**`. This would have caught this class of bug.
- **Manual smoke test on the deployed PWA** (or against the emulator suite with the `southamerica-east1` region simulation) to confirm: log in → RSVP an event → see QR; click report user → toast; submit post-event feedback; save profile.
- **Audit other no-onSnapshot direct Firestore writes** in the PWA for the same silent-failure pattern that was in `Profile.vue` (no `catch` on a `setDoc`/`updateDoc`).
- **Profile flow gating**: long-term, a logged-in user lacking `basic_profile` consent or `ageVerified` claim should be routed to the consent + age-gate flow before Profile.vue is reachable, not surfaced as a save-time error. That's a UX fix for Plan 02-02 / consent flow, not a bug fix here.
