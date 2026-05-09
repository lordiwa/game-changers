---
status: diagnosed
phase: 02-platform-mvp
source: [02-VERIFICATION.md]
started: 2026-04-30T20:30:00Z
updated: 2026-05-09T23:30:00Z
---

## Current Test

[testing complete — diagnosed gaps below]

## Tests

### 1. End-to-end 90-second journey
expected: Discord member runs `/link` → opens app via deep link → completes Discord OAuth → grants Layer 1 consent → checks into a real event via QR scan → sees XP awarded — wall-clock under 90 seconds. PostHog funnel measures ≥ 60% Layer-1 grant rate AND median time-to-first-checkin < 90s.
result: partial
notes: Backend endpoints deployed (botGenerateLinkToken, discordExchange, verifyAge, postRecapToDiscord, etc. all live in southamerica-east1). Discord bot VM not provisioned (no GCE instance running) — `/link` cannot be initiated from Discord. Layer 1 grant rate cannot be measured without real users. Gap: bot VM provisioning + DISCORD_BOT_TOKEN real value + PostHog instrumentation in production.

### 2. Community-scale platform success gate
expected: 1,500+ app users with active consent, 40%+ Discord-to-App conversion, 200+ challenge participants. Layer 1 grant rate stays above the 60% kill threshold across the cohort. Phase 2 success metrics met before Phase 3 begins.
result: blocked
notes: Requires real platform launch. Cannot be tested in solo dev session — depends on Phase 1 (Community Foundation) hitting kill criterion (500+ Discord members) first.

### 3. Open Wearables FastAPI hub deployed
expected: Hetzner CX22 VPS running Open Wearables 0.4.3 with HMAC secret shared via GCP Secret Manager + outgoing webhook pointed at southamerica-east1-<project>.cloudfunctions.net/wearables-openWearablesWebhook. Webhook receives a real Garmin/Fitbit/Polar/Whoop/Oura sample, HMAC validates, sample lands in `/users/{uid}/healthSamples/{yyyy-mm}/metrics/{id}`.
result: blocked
notes: VPS not provisioned. `OW_HMAC_SECRET` exists as placeholder in Secret Manager (260509-nmk). The webhook handler is deployed and ready — `wearables-openWearablesWebhook` listed in functions:list. Gap: Hetzner CX22 + Open Wearables 0.4.3 install + HMAC sync + DNS pointing at the function URL.

### 4. GCP KMS keyring + Discord refresh-token round-trip
expected: KMS keyring `gc` with cryptoKey `discord-tokens` provisioned in `southamerica-east1`. Real Discord OAuth flow succeeds; encrypted refresh token persists at `/users/{uid}/private/discord`; KMS audit log shows the encryption operation.
result: failed
notes: `functions/shared/kms.ts:12` hardcodes key path `projects/${PROJECT_ID}/locations/southamerica-east1/keyRings/gc/cryptoKeys/discord-tokens`. KMS keyring `gc` and cryptoKey `discord-tokens` are NOT provisioned in GCP — confirmed via missing secret references and no provisioning script ran. Code expects the path to exist; encrypt/decrypt calls would fail at runtime when first Discord refresh token tries to persist. Gap: provision KMS keyring + cryptoKey + grant Cloud Functions service account `cloudkms.cryptoKeyEncrypterDecrypter` role.

### 5. 5 Pub/Sub topics provisioned + level-up chain working
expected: `xp-events`, `level-up-events`, `consent-revoked`, `events-capacity-changed`, `crisis-alerts` all created in `southamerica-east1`. Subscription-side Functions deployed and consuming. `gcloud pubsub topics list` shows all 5. A level-up event published from `xpAward` arrives at `discordRoleSync` (validates the CR-02 fix end-to-end).
result: partial
notes: Code references all 5 topics: `xp-events` (challenges/logProgress.ts:223, events/checkIn.ts:136, events/postEventFeedback.ts:55), `consent-revoked` (consent/revoke.ts:130, consent/wearableRevokeHandler.ts:74), `events-capacity-changed` (events/rsvp.ts:139, events/waitlistPromote.ts trigger). `discordRoleSync` deployed with `google.cloud.pubsub.topic.v1.messagePublished` trigger — at least one topic exists implicitly. End-to-end level-up chain (xpAward → level-up-events → discordRoleSync) cannot be validated without a real user signup + xp action. Gap: explicit provisioning + end-to-end test with real user.

### 6. BigQuery datasets + extension + Metabase IAM
expected: `gw_analytics` + `gw_b2b_views` datasets created. Firestore→BigQuery extension installed for the 8 consent-tagged collections (`healthSamples` NOT installed). `metabase-readonly` service account has SELECT on `gw_b2b_views` and ZERO access to `gw_analytics`. `bq ls` shows 8 `*_changelog` tables in `gw_analytics`; `bq ls gw_b2b_views` shows 5 segment views. Quarterly `bigquery-views-audit.yml` workflow passes against live datasets.
result: failed
notes: `firebase ext:list --project gamechangers-prod` returns "no extensions installed". `extensions/firestore-bigquery-export.env` exists as config template but the 8 consent-tagged collection extensions were never installed. BigQuery datasets `gw_analytics` and `gw_b2b_views` not created. Metabase IAM not configured. The two-tier B2B architecture promised in PROJECT.md §2 is NOT operational in production. Gap: install 8 extensions + create datasets + 5 anonymized views + Metabase service account with k≥50 enforcement.

### 7. DPO + legal counsel sign-off on ADR-010
expected: ADR-010 (Account Erasure vs. Audit-Log Retention) status updated from "Proposed" to "Accepted"; signed-off by named DPO and legal counsel before production deploy. This is a documented LOPDP compliance gate.
result: blocked
notes: Cross-phase dependency on Phase 0 (Legal Foundation). Phase 0 not yet started. DPO not yet contracted, legal counsel not yet engaged. ADR-010 remains in "Proposed" state. Gap: Phase 0 LEGAL-02 (DPO contracted) + LEGAL-03 (legal counsel engaged) before this can be signed.

### 8. Discord OAuth state binding (CR-06 follow-up)
expected: `discordExchange.ts` uses transaction-based state binding — mint a server-side `discordOauthState/{nonce}` doc on flow init, then assert `tx.delete()` of that doc in `discordExchange` (single-use proof). Current code only fixed the misleading comment; the underlying CSRF defense-in-depth gap remains a known follow-up.
result: passed
notes: Code review: `functions/auth/src/discordExchange.ts:82` confirms `discordOauthState/{nonce}` doc minted at flow initiation and asserted single-use here. The transaction-based binding is in place. CSRF defense-in-depth gap closed.

### 9. WR-06 historical counter backfill
expected: One-shot Firestore script initializes `eventAttendedTotal` + `contentCompletedTotal` on existing `/users/{uid}/profile/main` from historical auditLog data. Existing users see historical event/content counts in `recomputeStats` output, not just counts accumulated since the WR-06 fix deploy.
result: failed
notes: No backfill script found in `scripts/` or `functions/gamification/src/`. Existing users (when they exist) will have stale counters. Gap: write one-shot Node script that iterates auditLog, aggregates event/content counts per uid, writes to `/users/{uid}/profile/main`.

### 10. WR-14 consentGate ageVerified performance impact
expected: High-throughput load test against a non-hot-path consentGate-protected Function. Confirm `getUser()` Auth call does not double Function p99 latency. p99 stays within budget after the WR-14 ageVerified assertion was added.
result: blocked
notes: Requires load test infrastructure (k6, artillery, or equivalent) + real concurrency. Budget targets not yet defined. Gap: design load test scenario + run against staging deploy + measure p99.

### 11. Cloud Tasks 72h hard-delete SLA
expected: Replace the MVP `scheduledErasures` sweeper-doc pattern with `@google-cloud/tasks` deferred enqueue, OR confirm the daily sweeper actually fires and runs `performHardDelete` within 72h SLA. CNST-11 SLA met for a real soft-deleted user.
result: partial
notes: `functions/consent/src/erasure.ts:201-204` uses MVP sweeper-doc pattern: `db.collection('scheduledErasures').doc(uid).set({...})` with explicit comment "NOTE: In production, use @google-cloud/tasks to schedule erasureHardDelete". The fallback pattern is in place but production-grade Cloud Tasks integration is deferred. Sweeper function exists. Gap: either migrate to @google-cloud/tasks OR validate sweeper fires within 72h via integration test against soft-deleted user.

### 12. Vite 8 deviation validation
expected: Source uses Vite 8.0.10 (not planned Vite 7.4.0). Confirm `vite-plugin-pwa@1.2.0`, `@vitejs/plugin-vue@6.0.6`, and the rest of the Vue ecosystem build green against Vite 8 in CI. PWA bundle ≤200KB gzipped on public routes. Service worker generates. A11Y-02 (<3s on 3G) holds against Vite 8 output.
result: failed
notes: `apps/pwa/package.json` confirms `"vite": "8.0.10"` (deviation from CLAUDE.md tech stack pin to ^7.4). `pnpm --filter @gamechangers/pwa build` FAILS with TS errors unrelated to Vite — see specific failures: missing `@types/qrcode` (EventDetail.vue:264), DocumentData casting in EventList.vue:43, undefined string handling in Badges.vue (lines 67, 69 — 3 errors). Vite 8 itself may be fine but the PWA build doesn't pass. Cannot measure bundle size or 3G perf without a green build. Gap: install `@types/qrcode`, fix `EventList` typing, fix `Badges.vue` null guards. Then re-evaluate Vite 8 vs. CLAUDE.md guidance.

### 13. BOT_STATIC_IPS populated in production
expected: `BOT_STATIC_IPS` env var populated with the bot VM's static IP per `setup-vm.sh`. Bot calls hit Functions only from the bot VM's static IP; non-VM callers are rejected with HTTP 403 even with valid HMAC. (When `BOT_STATIC_IPS` is empty, the IP check is skipped — must NOT happen in production.)
result: partial
notes: Code in `functions/shared/botAuth.ts:70` correctly reads `process.env['BOT_STATIC_IPS']` and skips the IP check when empty. `apps/discord-bot/deploy/setup-vm.sh:6,50,208` documents the static IP provisioning and BOT_STATIC_IPS env wiring. Bot VM not yet provisioned, so `BOT_STATIC_IPS` is unset in production — meaning the IP allow-list is currently bypassed (HMAC alone is the gate). Security gap acknowledged. Gap: provision bot GCE VM + populate `BOT_STATIC_IPS` env var on the 4 bot-callable functions before launch.

## Summary

total: 13
passed: 1
issues: 8
pending: 0
skipped: 0
blocked: 4

## Gaps

### G1 — KMS keyring not provisioned (T4, severity HIGH)
Code references `keyRings/gc/cryptoKeys/discord-tokens` but the keyring + cryptoKey don't exist. Discord refresh-token encryption will fail at runtime on first OAuth completion.
Fix: provision KMS keyring + cryptoKey via `gcloud kms keyrings create` + `gcloud kms keys create` + IAM binding for Cloud Functions SA.

### G2 — BigQuery two-tier architecture not operational (T6, severity HIGH)
The k≥50 ε-DP B2B pipeline promised in PROJECT.md §2 has zero installed extensions and no datasets. This is a Phase 2 success-criterion blocker and a Phase 3 prerequisite per ROADMAP dependency `Phase 2 → Phase 3`.
Fix: install 8 firestore-bigquery-export extensions (one per consent-tagged collection, exclude healthSamples per ADR-009), create `gw_analytics` + `gw_b2b_views` datasets, build 5 anonymized segment views with k≥50 enforcement, configure `metabase-readonly` SA with restricted IAM.

### G3 — WR-06 historical counter backfill missing (T9, severity MEDIUM)
No backfill script for `eventAttendedTotal` + `contentCompletedTotal` initialization from historical auditLog. Existing users (once present) will have stale counters.
Fix: write one-shot Node script in `scripts/backfill-counters.ts`.

### G4 — Vite 8 deviation + PWA build broken (T12, severity MEDIUM)
Vite 8.0.10 is unpinned per CLAUDE.md guidance. PWA build fails on TS errors unrelated to Vite (qrcode types, EventList typing, Badges null guards).
Fix: install `@types/qrcode`, add `EventData` cast in EventList, add null guards in Badges.vue. Then evaluate whether to keep Vite 8 or downgrade to ^7.4 per CLAUDE.md.

### G5 — Cloud Tasks production migration deferred (T11, severity MEDIUM)
72h hard-delete SLA relies on a sweeper-doc pattern with explicit "NOTE: use @google-cloud/tasks in production" comments. Functional but not production-grade.
Fix: migrate `erasure.ts` and `dsarExport.ts` to `@google-cloud/tasks` deferred enqueue OR validate sweeper SLA via integration test.

### G6 — Pub/Sub topics not explicitly provisioned (T5, severity LOW)
5 topics referenced by code but no provisioning step ran. May or may not exist in GCP — implicit creation on first publish covers this in practice but should be explicit.
Fix: `gcloud pubsub topics create` for all 5 topics + verify subscription-side Function bindings.

### G7 — Bot VM unprovisioned (T1, T13, severity HIGH for production launch)
Discord bot frontend not running. T1 90s journey requires the bot. T13 IP allow-list bypassed because BOT_STATIC_IPS is empty without the VM.
Fix: provision GCE e2-micro per `apps/discord-bot/deploy/setup-vm.sh` + populate `BOT_STATIC_IPS` + DISCORD_BOT_TOKEN with real bot token.

### G8 — Open Wearables hub unprovisioned (T3, severity MEDIUM, blocked-deferred)
Hetzner CX22 VPS not provisioned. Webhook handler ready and waiting.
Fix: provision VPS + Open Wearables 0.4.3 + sync HMAC secret + point webhook URL.

### Cross-phase blockers (not gaps of Phase 02 work itself)

- **T2** (1,500 users): blocked by Phase 1 community kill-criterion not met
- **T7** (DPO sign-off): blocked by Phase 0 LEGAL-02 not started
- **T10** (load test): blocked by missing test infrastructure + budget targets

## Stats

- 1 passed (T8 — Discord OAuth state binding)
- 4 partial (T1, T5, T11, T13 — code present, runtime/provisioning incomplete)
- 4 failed (T4, T6, T9, T12 — code or infra missing)
- 4 blocked (T2, T3, T7, T10 — external dependencies)
