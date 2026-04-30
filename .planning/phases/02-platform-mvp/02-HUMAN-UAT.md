---
status: partial
phase: 02-platform-mvp
source: [02-VERIFICATION.md]
started: 2026-04-30T20:30:00Z
updated: 2026-04-30T20:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. End-to-end 90-second journey
expected: Discord member runs `/link` → opens app via deep link → completes Discord OAuth → grants Layer 1 consent → checks into a real event via QR scan → sees XP awarded — wall-clock under 90 seconds. PostHog funnel measures ≥ 60% Layer-1 grant rate AND median time-to-first-checkin < 90s.
result: [pending]

### 2. Community-scale platform success gate
expected: 1,500+ app users with active consent, 40%+ Discord-to-App conversion, 200+ challenge participants. Layer 1 grant rate stays above the 60% kill threshold across the cohort. Phase 2 success metrics met before Phase 3 begins.
result: [pending]

### 3. Open Wearables FastAPI hub deployed
expected: Hetzner CX22 VPS running Open Wearables 0.4.3 with HMAC secret shared via GCP Secret Manager + outgoing webhook pointed at southamerica-east1-<project>.cloudfunctions.net/wearables-openWearablesWebhook. Webhook receives a real Garmin/Fitbit/Polar/Whoop/Oura sample, HMAC validates, sample lands in `/users/{uid}/healthSamples/{yyyy-mm}/metrics/{id}`.
result: [pending]

### 4. GCP KMS keyring + Discord refresh-token round-trip
expected: KMS keyring `gc` with cryptoKey `discord-tokens` provisioned in `southamerica-east1`. Real Discord OAuth flow succeeds; encrypted refresh token persists at `/users/{uid}/private/discord`; KMS audit log shows the encryption operation.
result: [pending]

### 5. 5 Pub/Sub topics provisioned + level-up chain working
expected: `xp-events`, `level-up-events`, `consent-revoked`, `events-capacity-changed`, `crisis-alerts` all created in `southamerica-east1`. Subscription-side Functions deployed and consuming. `gcloud pubsub topics list` shows all 5. A level-up event published from `xpAward` arrives at `discordRoleSync` (validates the CR-02 fix end-to-end).
result: [pending]

### 6. BigQuery datasets + extension + Metabase IAM
expected: `gw_analytics` + `gw_b2b_views` datasets created. Firestore→BigQuery extension installed for the 8 consent-tagged collections (`healthSamples` NOT installed). `metabase-readonly` service account has SELECT on `gw_b2b_views` and ZERO access to `gw_analytics`. `bq ls` shows 8 `*_changelog` tables in `gw_analytics`; `bq ls gw_b2b_views` shows 5 segment views. Quarterly `bigquery-views-audit.yml` workflow passes against live datasets.
result: [pending]

### 7. DPO + legal counsel sign-off on ADR-010
expected: ADR-010 (Account Erasure vs. Audit-Log Retention) status updated from "Proposed" to "Accepted"; signed-off by named DPO and legal counsel before production deploy. This is a documented LOPDP compliance gate.
result: [pending]

### 8. Discord OAuth state binding (CR-06 follow-up)
expected: `discordExchange.ts` uses transaction-based state binding — mint a server-side `discordOauthState/{nonce}` doc on flow init, then assert `tx.delete()` of that doc in `discordExchange` (single-use proof). Current code only fixed the misleading comment; the underlying CSRF defense-in-depth gap remains a known follow-up.
result: [pending]

### 9. WR-06 historical counter backfill
expected: One-shot Firestore script initializes `eventAttendedTotal` + `contentCompletedTotal` on existing `/users/{uid}/profile/main` from historical auditLog data. Existing users see historical event/content counts in `recomputeStats` output, not just counts accumulated since the WR-06 fix deploy.
result: [pending]

### 10. WR-14 consentGate ageVerified performance impact
expected: High-throughput load test against a non-hot-path consentGate-protected Function. Confirm `getUser()` Auth call does not double Function p99 latency. p99 stays within budget after the WR-14 ageVerified assertion was added.
result: [pending]

### 11. Cloud Tasks 72h hard-delete SLA
expected: Replace the MVP `scheduledErasures` sweeper-doc pattern with `@google-cloud/tasks` deferred enqueue, OR confirm the daily sweeper actually fires and runs `performHardDelete` within 72h SLA. CNST-11 SLA met for a real soft-deleted user.
result: [pending]

### 12. Vite 8 deviation validation
expected: Source uses Vite 8.0.10 (not planned Vite 7.4.0). Confirm `vite-plugin-pwa@1.2.0`, `@vitejs/plugin-vue@6.0.6`, and the rest of the Vue ecosystem build green against Vite 8 in CI. PWA bundle ≤200KB gzipped on public routes. Service worker generates. A11Y-02 (<3s on 3G) holds against Vite 8 output.
result: [pending]

### 13. BOT_STATIC_IPS populated in production
expected: `BOT_STATIC_IPS` env var populated with the bot VM's static IP per `setup-vm.sh`. Bot calls hit Functions only from the bot VM's static IP; non-VM callers are rejected with HTTP 403 even with valid HMAC. (When `BOT_STATIC_IPS` is empty, the IP check is skipped — must NOT happen in production.)
result: [pending]

## Summary

total: 13
passed: 0
issues: 0
pending: 13
skipped: 0
blocked: 0

## Gaps
