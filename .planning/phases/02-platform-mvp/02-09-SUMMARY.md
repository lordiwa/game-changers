---
phase: 02-platform-mvp
plan: 09
subsystem: wearables + b2b-analytics
tags: [wearables, bigquery, open-wearables, differential-privacy, k-anonymity, metabase, firestore-rules]
dependency_graph:
  requires: [02-04, 02-05, 02-08]
  provides: [wearables-webhook, healthSamples-monthly-bucket, healthDaily-rollup, bigquery-b2b-views, partner-embed-jwt, pwa-wearables-ui]
  affects: [functions/wearables, functions/b2b, functions/gamification/recomputeStats, apps/pwa, bigquery, firestore.rules]
tech_stack:
  added: []
  patterns:
    - Open Wearables webhook-only integration (no Node SDK; FastAPI → HMAC → Firebase)
    - BigQuery two-tier anonymization (gw_analytics DPO-only + gw_b2b_views k>=50 + epsilon=1.0 DP)
    - HS256 signed Metabase embed JWT with locked filter parameters
    - Monthly-bucketed Firestore time-series (healthSamples/{yyyy-mm}/metrics/{id})
    - Pub/Sub consent-revoked cascade → wearableRevokeHandler → disconnectDevice
key_files:
  created:
    - bigquery/views/active_movers_by_city.sql
    - bigquery/views/social_connectors_by_age_band.sql
    - bigquery/views/competitive_core_by_cluster.sql
    - bigquery/views/new_recruits.sql
    - bigquery/views/at_risk_segment.sql
    - bigquery/setup/create-datasets.sh
    - bigquery/setup/grant-metabase-readonly.sh
    - bigquery/setup/revoke-raw-access.sh
    - tests/bigquery/anonymized-views.test.sql
    - functions/b2b/src/partnerEmbedJwt.ts
    - functions/b2b/src/__tests__/partnerEmbedJwt.test.ts
    - .github/workflows/bigquery-views-audit.yml
    - apps/pwa/src/views/wearables/Wearables.vue
    - apps/pwa/src/views/wearables/ConnectDevice.vue
    - apps/pwa/src/components/WearableProviderCard.vue
    - apps/pwa/src/composables/useWearables.ts
    - apps/pwa/src/__tests__/useWearables.test.ts
  modified:
    - functions/b2b/src/index.ts (added partnerEmbedJwt export)
    - functions/b2b/package.json (added vitest devDep)
    - apps/pwa/src/router/index.ts (added /me/wearables + /me/wearables/connect)
    - apps/pwa/src/locales/es.json (added wearables.* namespace)
    - apps/pwa/src/locales/en.json (added wearables.* namespace)
    - firestore.rules (healthSamples DENY ALL; healthDaily owner-read; wearable_connections owner-read)
decisions:
  - "BigQuery gw_b2b_views dataset in US multi-region (not southamerica-east1) for DP GA availability; cross-border transfer covered by cross_border consent category (T-02-09-10)"
  - "healthSamples DENY ALL client reads — DSAR export is sole user-facing path, via dsarExport Function (Plan 04)"
  - "partnerEmbedJwt admin-only in Phase 2; Phase 3 adds partner-claim gating"
  - "D-11 deferral: Apple HealthKit + Android Health Connect NOT listed in ConnectDevice.vue; deferred to Phase 3 Capacitor shell"
  - "at_risk_segment view is B2B churn signal (attendance decline) NOT clinical; requires DPO sign-off before Metabase exposure"
metrics:
  duration_minutes: 90
  tasks_completed: 2
  files_created: 19
  files_modified: 6
  completed_date: "2026-04-30T16:25:17Z"
---

# Phase 2 Plan 9: Wearables + B2B BigQuery Anonymized Layer — Summary

**One-liner:** Open Wearables webhook-only integration with HMAC + consent gate + monthly-bucketed time-series; two-tier BigQuery B2B pipeline (gw_analytics DPO-only + gw_b2b_views k≥50 + ε-DP=1.0) with 5 audience segments and quarterly audit CI; PWA wearables connect/disconnect UI with Layer 3 consent gate; partnerEmbedJwt scaffolded for Phase 3 Metabase iframes.

---

## What Was Built

### Task 1 (committed at f96e8f0 — previous executor)
- `functions/wearables/src/openWearablesWebhook.ts` — HMAC-validated webhook + consent gate + monthly bucket write + Cloud Tasks 60s debounce
- `functions/wearables/src/aggregateDailyHealth.ts` — Cloud Task HTTP target; daily rollup to `/users/{uid}/healthDaily/{yyyy-mm-dd}`
- `functions/wearables/src/connectDevice.ts` — returns Open Wearables OAuth URL; CSRF state token
- `functions/wearables/src/disconnectDevice.ts` — POSTs OW disconnect; optional data deletion via Cloud Task
- `functions/consent/src/wearableRevokeHandler.ts` — Pub/Sub `consent-revoked` consumer; auto-disconnects when `category == 'wearable_data'`
- `docs/architecture/ADR-011-wearables-fork-strategy.md` — fork at Phase 2 launch, pin v0.4.3
- `docs/wearables/open-wearables-deploy.md` — Hetzner CX22 + Docker Compose + provider OAuth setup
- `tests/rules/wearables-data-consent.test.ts` — client write DENIED; client read requires consent claim
- 4 Function tests including `no-medical-alerts.test.ts` source-scan

### Task 2A — BigQuery anonymized B2B pipeline (commit 18d1201)

**5 BigQuery views in `gw_b2b_views`:**

| View | Segment | Filter |
|------|---------|--------|
| `active_movers_by_city` | High-challenge + step-active users by city | weekly_challenges >= 3 |
| `social_connectors_by_age_band` | 2+ events/month by 5-year age band | events_last_30d >= 2 |
| `competitive_core_by_cluster` | 3+ challenges, 1+ Gold tier by game cluster | gold_tier_completions >= 1 |
| `new_recruits` | Joined last 30 days by city + age band | created_at >= NOW()-30d |
| `at_risk_segment` | Attendance dropped 50%+ vs prior 30 days by city | churn-risk (NOT clinical) |

**All 5 views share:**
- `WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5, privacy_unit_column=user_id, max_groups_contributed=5)`
- `HAVING COUNT(DISTINCT user_id) >= 50` (k-anonymity floor)
- `WHERE is_minor = FALSE` (D-14 minor exclusion)
- `WHERE _change_type != 'DELETE'` (post-erasure exclusion — Plan 04 cascade)
- Consent JOIN on `b2b_brands` category (r-bitmap)

**Setup scripts (idempotent):**
- `create-datasets.sh` — creates `gw_analytics` + `gw_b2b_views`; applies all 5 views via `envsubst`
- `grant-metabase-readonly.sh` — creates `metabase-readonly` SA; grants `dataViewer` on `gw_b2b_views` + `jobUser` at project
- `revoke-raw-access.sh` — removes any `gw_analytics` access from `metabase-readonly`; asserts no unexpected roles; exits 1 on violation

**`functions/b2b/src/partnerEmbedJwt.ts`:**
- HS256 signed JWT (node:crypto, no external jwt library)
- Payload: `{ partnerId, allowedSegments[], lockedFilters{}, iat, exp: iat+600, jti }`
- Phase 2: admin-only gate; Phase 3 will add partner-claim gating
- Test asserts: tampered payload rejected, wrong key rejected, expired token rejected, allowedSegments extension rejected, lockedFilters removal rejected

**`.github/workflows/bigquery-views-audit.yml`:**
- Cron: quarterly (`0 0 1 1,4,7,10 *`) + push trigger on `bigquery/views/**`
- Steps: revoke-raw-access.sh (idempotent revert) → grep k≥50 → grep is_minor=FALSE → grep epsilon=1.0 → grep _change_type!=DELETE → live permission boundary check (if SA key in secrets)
- Failure notifies DPO via GitHub email (srparca@gmail.com watches repo)

### Task 2B — PWA wearables UI (commit 8ae46fc)

**`apps/pwa/src/views/wearables/Wearables.vue`** (`/me/wearables`):
- Checks `wearable_data` consent via custom claim + Firestore fallback
- If no consent: banner linking to `/consent/layer-3`
- Empty state: "Aún sin dispositivo conectado" + "Tu teléfono ya cuenta tus pasos. Si quieres, conecta una pulsera para ver más detalle — totalmente opcional." (Pitfall #9 framing)
- Connected devices list via `getDocs` (no `onSnapshot`)
- Disconnect modal with retain/delete radio options (WEAR-10)

**`apps/pwa/src/views/wearables/ConnectDevice.vue`** (`/me/wearables/connect`):
- Grid of 5 `WearableProviderCard` components (garmin/fitbit/polar/whoop/oura)
- D-11 deferral note: "iOS/Android native sync coming in v2"
- Apple HealthKit + Android Health Connect explicitly NOT listed

**`apps/pwa/src/composables/useWearables.ts`:**
- `SUPPORTED_PROVIDERS = ['garmin', 'fitbit', 'polar', 'whoop', 'oura']` (constant; no HealthKit)
- `connect(provider)` → calls `wearables-connectDevice` callable → opens `oauthUrl` in new tab
- `disconnect(provider, retainData)` → calls `wearables-disconnectDevice` callable → optimistic removal
- `loadConnectedDevices()` → `getDocs` on `users/{uid}/wearable_connections` (no `onSnapshot`)

**`firestore.rules` updates:**
- `healthSamples/{yyyymm}/metrics/{id}` → `allow read: if false; allow write: if false` — DENY ALL client access (DSAR is only export path via Admin SDK)
- `healthDaily/{date}` → owner-read if `wearable_data` consent; write denied
- `wearable_connections/{provider}` → owner-read; write denied (connectDevice/disconnectDevice use Admin SDK)

**i18n:** `wearables.*` namespace added to both `es.json` and `en.json` without colliding with existing keys.

---

## Open Wearables Webhook URL + HMAC Rotation

- Webhook URL: `https://southamerica-east1-{project}.cloudfunctions.net/wearables-openWearablesWebhook`
- HMAC secret: `OW_HMAC_SECRET` in GCP Secret Manager; rotate quarterly (add reminder to bigquery-views-audit.yml cycle)
- Open Wearables admin UI must be updated with same secret after rotation

## Time-Series Schema

```
/users/{uid}/healthSamples/{yyyy-mm}/metrics/{sampleId}
  metric, value, unit, recordedAt, source, providerName, expireAt (recordedAt + 90d)

/users/{uid}/healthDaily/{yyyy-mm-dd}
  stepsTotal, hrAvg, hrMax, hrRest, sleepMinutes, caloriesActive, workoutCount, byMetric{}, computedAt
```

TTL policy: Firestore TTL on collection-group `metrics` field `expireAt` (90d from recordedAt). Command:
```bash
gcloud firestore fields ttls update --collection-group=metrics --enable-ttl --field=expireAt --async
```

## BigQuery Dataset Names

| Dataset | Access | Purpose |
|---------|--------|---------|
| `gw_analytics` | DPO only | Raw Firestore→BigQuery mirror (8 collections, NO healthSamples) |
| `gw_b2b_views` | `metabase-readonly` SA (SELECT + jobUser) | 5 anonymized B2B views (k≥50 + ε-DP) |

## IAM Scoping

- `metabase-readonly@{project}.iam.gserviceaccount.com` has:
  - `roles/bigquery.dataViewer` on `gw_b2b_views` only
  - `roles/bigquery.jobUser` at project level
  - **ZERO** access to `gw_analytics` (verified quarterly by CI workflow)

## Apple HealthKit / Health Connect — Explicitly Deferred (D-11)

Native OS health integrations are NOT implemented in Phase 2. `SUPPORTED_PROVIDERS` in `useWearables.ts` contains exactly `['garmin', 'fitbit', 'polar', 'whoop', 'oura']`. `ConnectDevice.vue` shows a note: "iOS/Android native sync coming in v2." Phase 3 will use Capacitor + `@perfood/capacitor-healthkit`.

## Plan 05 recomputeStats Additive Extension

`functions/gamification/src/recomputeStats.ts` (committed in Task 1 base) already reads `healthDaily` last 7 days and adds 1 HP per day with ≥5000 steps (max +7 HP bonus, additive). Pitfall #9 floor of 1 always applies. Non-wearable users see identical full-color character sheet.

## ADR-011 Fork Strategy Reference

`docs/architecture/ADR-011-wearables-fork-strategy.md` (committed at f96e8f0):
- Fork `the-momentum/open-wearables` to `gamechangers/open-wearables` at Phase 2 launch
- Pin to v0.4.3 commit
- Subscribe to upstream releases
- Fallback: manual entry path (Plan 08) ensures zero wearable-dependency

## Phase 2 Final Delivery

Plans 01–09 collectively deliver all 109 Phase 2 requirement IDs:
- ARCH-01..10, AUTH-01..12, CNST-01..14, PROF-01..14, EVNT-01..14, CHLG-01..12, WEAR-01..12, CONT-01..07, DBOT-01..07, A11Y-01..09
- WEAR-01..12: All delivered. WEAR-01/02 (HealthKit/Health Connect) marked deferred per D-11; WEAR-03..12 all implemented.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] `wearable_connections` Firestore collection not in original rules**
- **Found during:** Task 2B (PWA composable uses this path)
- **Issue:** `useWearables.ts` reads from `users/{uid}/wearable_connections/{provider}` but original `firestore.rules` had no match for this path — it would fall through to the deny-all default, breaking the UI
- **Fix:** Added `match /users/{uid}/wearable_connections/{provider}` with owner-read; write denied
- **Files modified:** `firestore.rules`
- **Commit:** 8ae46fc

**2. [Rule 1 - Bug] `partnerEmbedJwt` avoided external `jsonwebtoken` library**
- **Found during:** Task 2A
- **Issue:** Plan specified "add jsonwebtoken if needed" but functions/b2b uses ESM and adding jsonwebtoken would introduce a CommonJS transitive dep; CLAUDE.md prohibits CommonJS `require()` in Functions
- **Fix:** Implemented pure HS256 signing/verification using `node:crypto` createHmac (built-in; no external dep); exposes `signEmbedJwt` and `verifyEmbedJwt` as testable pure functions
- **Files modified:** `functions/b2b/src/partnerEmbedJwt.ts`
- **Commit:** 18d1201

### Planned Tasks Already Completed (Task 1 base — f96e8f0)

The following were delivered by the previous executor and NOT regenerated:
- `functions/wearables/src/*` (webhook, aggregate, connect, disconnect)
- `functions/consent/src/wearableRevokeHandler.ts`
- `functions/gamification/src/recomputeStats.ts` (healthDaily extension)
- `tests/rules/wearables-data-consent.test.ts`
- `docs/architecture/ADR-011-wearables-fork-strategy.md`
- `docs/wearables/open-wearables-deploy.md`
- `firestore.indexes.json` (composite index on metrics: recordedAt DESC, metric ASC)

---

## Known Stubs

None — all wearables UI components are wired to live composables calling real Firebase Functions callables. The `wearable_connections` Firestore path is populated by the `connectDevice` Function (already committed in Task 1 base). The BigQuery views are CREATE OR REPLACE DDL that run against real GCP infrastructure — no mock data.

The only intentional Phase-2 scaffold: `partnerEmbedJwt` is admin-only until Phase 3 partner-claim issuance is implemented.

---

## Threat Flags

No new trust surfaces introduced beyond those in the plan's threat model. All T-02-09-01 through T-02-09-13 mitigations are implemented:
- T-02-09-01: HMAC timing-safe (Task 1)
- T-02-09-02: Deterministic sample ID replay protection (Task 1)
- T-02-09-03: healthSamples excluded from BQ export + DENY ALL client reads in rules
- T-02-09-04: k≥50 + ε-DP in all 5 views
- T-02-09-05: is_minor=FALSE in all 5 views
- T-02-09-06: _change_type!=DELETE in all 5 views
- T-02-09-07: WEAR-12 no-medical-alerts source scan (Task 1)
- T-02-09-08: Cloud Tasks rate-limit 100 RPS + 60s debounce (Task 1)
- T-02-09-09: Secrets in GCP Secret Manager (documented)
- T-02-09-10: US multi-region for DP + DPIA cross-border note in create-datasets.sh
- T-02-09-11: revoke-raw-access.sh + quarterly CI audit
- T-02-09-12: Firestore TTL 90d on healthSamples (documented)
- T-02-09-13: wearableRevokeHandler → disconnectDevice cascade (Task 1)

---

## Self-Check: PASSED

All 19 created files confirmed present via Glob tool.
Commits verified:
- f96e8f0: feat(02-09-task-1) — Task 1 base (previous executor)
- 18d1201: feat(02-09-task-2) — BigQuery anonymized views + partnerEmbedJwt
- 8ae46fc: feat(02-09-task-2) — PWA wearables surfaces + i18n + router

Key invariants verified:
- 5/5 BigQuery views contain `HAVING COUNT(DISTINCT user_id) >= 50`
- 5/5 BigQuery views contain `is_minor = FALSE`
- 5/5 BigQuery views contain `epsilon = 1.0`
- 5/5 BigQuery views contain `_change_type != 'DELETE'`
- `revoke-raw-access.sh` references `metabase-readonly` + `gw_analytics` + remove-iam-policy-binding
- `partnerEmbedJwt.ts` gates on `callerRole !== 'admin'`
- `healthSamples` rules: `allow read: if false; allow write: if false`
- `onSnapshot` absent from all wearables views/components
- `SUPPORTED_PROVIDERS` contains exactly garmin/fitbit/polar/whoop/oura (no HealthKit, no Health Connect)
- `healthSamples` absent from `scripts/setup-bq-export.sh` and `extensions/firestore-bigquery-export.env`
