# Phase 02 — Deferred Items

Track out-of-scope discoveries from Phase 02 plan executions. Per GSD
scope-boundary rule: do NOT auto-fix issues unrelated to the current
task; log them here instead.

## From 02-13 (PWA build green)

### Pre-existing TypeScript errors in `apps/pwa` (35 errors)

Plan 02-13 closed the **6** type errors named in its must-haves
(`@types/qrcode` install, `EventList.vue:43` DocumentData cast,
`Badges.vue:67-69` null guards). At worktree base `7c435da` an
additional **35 pre-existing TypeScript errors** existed; they are
unrelated to G4 and are out of scope for Plan 02-13.

Categories (file → error count):

- **`@gamechangers/shared` module resolution failures** — multiple files
  in `__tests__/` and `composables/` import from `@gamechangers/shared`
  but vue-tsc -b composite project setup does not currently expose the
  shared package's `lib/` types to the PWA tsconfig. (~20 errors)
- **`Avatar.vue:30`** — `Object is possibly 'undefined'` (4 dup errors)
- **`EventCard.vue:21-22`** — `Property 'coverImage' does not exist on
  type 'EventData'` (2 errors). The `EventData` type does not declare
  `coverImage`, but the template reads it. Either add the field to
  `EventData` or stop rendering it.
- **`useDiscordLink.ts:59`** — `ArrayBufferLike` vs `ArrayBuffer`
  (TS-5.9 stricter `crypto.subtle.digest` signature; cast/copy needed).
- **`usePedometer.ts:29,99`** — `Accelerometer` global not available
  (need `tsconfig.json` lib `dom.iterable` plus `dom` Sensor APIs lib,
  or a project-local `*.d.ts` declaration).
- **`router/index.ts:253`** — Not all code paths return a value.
- **`ChallengeDetail.vue:121-131`** — `enrollment` is possibly null in
  4 spots (need `?.` guards).
- **`ChallengeList.vue:6`** — `pending` does not exist on the return
  type of `useChallenges()` (composable shape mismatch).
- **`__tests__/`** — many test-file errors (vitest globals, NodeJS
  namespace, type-narrowing in mocks).

**Recommended follow-up:** a dedicated "PWA TypeScript debt" plan in
Phase 02 cleanup or Phase 03 prep that:

1. Builds + exports types from `packages/shared` in a way the PWA's
   composite project sees them at `vue-tsc -b` time (likely a
   `tsconfig.json` `references` entry plus `paths` mapping).
2. Adds the missing `Sensor` API ambient declaration (or imports a
   `@types/w3c-generic-sensor` shim).
3. Resolves the 14 in-source nullability errors.
4. Decides whether `EventData.coverImage` should be added or
   `EventCard.vue` template lines should be removed.

### Bundle size exceeds A11Y-02 budget

Initial-route gzipped JS = **~321 KB** on `assets/index-*.js` alone
(plus 47 KB for jsQR, 17 KB for sub-chunks, 21 KB CSS). The A11Y-02
target is **≤200 KB gzipped on public routes**.

**Recommended follow-up:** "Bundle size A11Y-02" plan covering route-
level lazy loading (vue-router `() => import(...)`), Sentry lazy init,
jsQR dynamic-import only on `EventCheckIn`, and vendor chunk
splitting. None of these are blockers for Phase 02 sign-off but they
must be solved before A11Y-02 can be marked passed.
