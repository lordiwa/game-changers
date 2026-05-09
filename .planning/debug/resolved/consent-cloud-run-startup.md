---
slug: consent-cloud-run-startup
status: resolved
trigger: "consent codebase Cloud Run revisions fail Container Healthcheck on startup. Local node ./functions/consent/lib/index.js loads cleanly (per 260509-nmk SUMMARY); the issue is Cloud Run-environment-specific. 9 consent functions registered but failing — likely top-level await, missing env var at import-time, or import-time side effect."
created: 2026-05-09
updated: 2026-05-09
resolved: 2026-05-09
fix_commit: a9f0b4e
---

# Debug Session — consent Cloud Run Startup Failure

## Symptoms

- **Expected:** All 9 consent codebase functions deploy successfully and serve requests in `southamerica-east1`.
- **Actual:** All 9 functions register in Cloud Run but every revision fails Container Healthcheck on startup.
- **Error messages:** `Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@google-cloud/pubsub' imported from /workspace/lib/revoke.js` → container exits with code 1 → Cloud Run startup TCP probe fails on port 8080.
- **Reproduction:** `firebase deploy --only functions:consent --project gamechangers-prod` registers functions; Cloud Run startup probes fail on every revision.

## Root Cause

`functions/consent/src/revoke.ts` performs a top-level static ESM import of `@google-cloud/pubsub` (line 11), but the package was not declared in `functions/consent/package.json` `dependencies`. The deploy uses `firebase-tools-with-isolate` which uploads only declared deps, so `/workspace/node_modules/@google-cloud/pubsub` was absent on the Cloud Run instance. Because `revoke.ts` is re-exported from `index.ts`, the missing dep blocked startup of EVERY function in the codebase — not just `consentRevoke`. Locally pnpm's hoisting of the package (via sibling codebases events/challenges/trustsafety/gamification, which do declare it) silently masked the bug.

## Evidence

- timestamp: 2026-05-09T22:35:58Z
  source: firebase functions:log --only consentGrant --project gamechangers-prod
  detail: |
    consentgrant: Provided module can't be loaded.
    consentgrant: Detailed stack trace: Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@google-cloud/pubsub' imported from /workspace/lib/revoke.js
    consentgrant: Could not load the function, shutting down.
    consentgrant: Container called exit(1).

- timestamp: 2026-05-09 (static analysis)
  source: functions/consent/src/revoke.ts:11
  detail: |
    Line 11: `import { PubSub } from '@google-cloud/pubsub';` — top-level ESM static import, evaluated at module load.

- timestamp: 2026-05-09 (cross-codebase comparison)
  source: grep @google-cloud/pubsub functions/*/package.json
  detail: |
    4 healthy codebases (events, challenges, trustsafety, gamification) all list `@google-cloud/pubsub` as a dependency. Consent uses PubSub at runtime but did not declare it.

## Eliminated

- **Top-level await** — no top-level await in any consent file; the error is `ERR_MODULE_NOT_FOUND`, deterministic synchronous resolve failure.
- **Missing secret at import-time** — no `defineSecret(...)` calls evaluated at module init.
- **import-time side effect (initializeApp)** — wearables codebase also calls unconditional `initializeApp()` and is healthy.
- **Memory/CPU limits** — container exits before any allocation/healthcheck pressure.
- **archiver native-dep mismatch** — archiver was already a runtime dep before 260509-nmk; the typing change in cb47d8f did not affect runtime resolution. Cloud Run stack trace pointed at `revoke.js`, not `dsarExport.js`.

## Resolution

**Fix:** Added `"@google-cloud/pubsub": "^4.9.0"` to `functions/consent/package.json` dependencies (commit `a9f0b4e`). Pinned to `^4.9.0` to match the highest version used by sibling codebases.

**Secondary cleanup:** Deleted the orphan HTTPS-trigger `wearableRevokeHandler` registered in Cloud Run (the trigger-type change from HTTPS→PubSub in 260509-nmk left an HTTPS instance behind, which blocked deploys with "Changing from an HTTPS function to a background triggered function is not allowed"). Recreated cleanly as PubSub trigger by the same redeploy.

**Verified by deploy:**
- `node_modules/.bin/firebase deploy --only functions:consent --project gamechangers-prod` (using local `firebase-tools-with-isolate@15.16.0`)
- All 9 functions report `Default STARTUP TCP probe succeeded after 1 attempt for container "worker" on port 8080.` in Cloud Run logs.
- `firebase functions:list` confirms all 9 with correct trigger types (consentRevoke = callable, wearableRevokeHandler = pubsub topic, etc.).

**Important deploy note for future operators:** Always invoke deploys via `node_modules/.bin/firebase` (the local `firebase-tools-with-isolate` fork at 15.16.0) — not the global `firebase` CLI (14.24.0 in this environment), which lacks the isolate-package step and fails on `workspace:*` protocol.

## Reference

- Commit: `a9f0b4e` — fix(consent): add @google-cloud/pubsub to declared dependencies
- `.planning/quick/260509-nmk-fix-remaining-6-function-codebases-conse/260509-nmk-SUMMARY.md` — Followup #1 (now resolved)
- Cloud Run console: https://console.cloud.google.com/run?project=gamechangers-prod
