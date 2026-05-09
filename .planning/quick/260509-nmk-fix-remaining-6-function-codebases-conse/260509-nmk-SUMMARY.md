---
quick_id: 260509-nmk
description: Fix remaining 6 function codebases for full firebase deploy
date: 2026-05-09
status: complete
commits:
  - e8556ad
  - 475d84e
  - cb47d8f
  - 600734f
  - 605347f
---

# 260509-nmk-SUMMARY — 6-codebase deploy fix

## Outcome

All 6 plan-target codebases (consent, challenges, wearables, gamification, events, b2b) pass `pnpm typecheck` clean. **38 functions live** in `southamerica-east1` across 7 codebases (auth, trustsafety, events, challenges, wearables, gamification, b2b). 9 consent functions registered but Cloud Run revisions fail Container Healthcheck on startup — runtime issue out of plan scope, captured as Followup #1.

## Commits

| Commit | Task | Description |
|--------|------|-------------|
| `e8556ad` | 1 | Re-export `consentGate` from `functions/shared` root barrel (named imports avoid `ConsentCategory` collision) |
| `475d84e` | 2 | Remove `node-fetch` dynamic import; use Node 22 global `fetch` (consent + wearables) |
| `cb47d8f` | 3 | Resolve strict-null + archiver typing in `functions/consent` (extended scope: `dsarExport.ts` archiver ambient declaration, `erasure.ts` docs[0]! pattern) |
| `600734f` | 4 | Resolve TS errors in `functions/challenges` (Category D was actually in `createChallenge.ts`, not `logProgress.ts`; defensive guard added in `logProgress.ts`) |
| `605347f` | 5 | Align `lastDoc` null type in `recomputeStats.ts` |

## Deployed functions

**38 actively serving** across 7 codebases. **9 in failing state** (consent codebase).

Inventory (from `firebase functions:list --project gamechangers-prod`):
- `auth` — 5 functions (verifyAge, anonUpgrade, discordExchange, unlinkDiscord, botGenerateLinkToken)
- `trustsafety` — 1 function (reportUser)
- `events` — registered, healthy
- `challenges` — registered, healthy
- `wearables` — registered, healthy (incl. recreated `wearableRevokeHandler` after HTTPS→PubSub trigger-type migration)
- `gamification` — registered, healthy
- `b2b` — registered, healthy
- `consent` — 9 functions registered, **all failing Container Healthcheck on startup** (Followup #1)

## Secrets created

7 placeholder secrets in Secret Manager (5 more than the plan anticipated — surfaced during deploy when functions referenced them via `defineSecret`):

- `QR_SIGNING_KEY` (events — planned)
- `PARTNER_EMBED_SIGNING_KEY` (b2b — planned)
- `OW_HMAC_SECRET` (wearables — Open Wearables webhook auth)
- `BADGE_SIGNING_KEY` (gamification — badge provenance)
- `DISCORD_BOT_TOKEN` (gamification — Discord role sync)
- `DISCORD_GUILD_ID` (gamification — Discord role sync)
- `WEEKLY_DIGEST_CHANNEL_ID` (b2b/gamification — weekly digest target)

All 7 are placeholders — replace with real values before launching the relevant feature.

## Deviations applied (Rule 3 — blocking, auto-applied)

1. **Named re-exports instead of wildcard** in `functions/shared/index.ts` — wildcard caused `ConsentCategory` collision with `./types.js`.
2. **Extended Task 3** to fix `dsarExport.ts` (created ambient `archiver.d.ts`) and `erasure.ts` (same `docs[0]!` pattern) so consent typecheck passes — these were not surfaced in the original error scan.
3. **Category D was in `createChallenge.ts`**, not `logProgress.ts` as the plan suspected — fixed handler signature to `CallableRequest<unknown>`.
4. **Defensive undefined-guard** for `SOURCE_TO_CONSENT[parsed.source]` lookup in `logProgress.ts`.
5. **5 additional secrets** beyond the plan's 2 — surfaced during deploy.
6. **Deleted + recreated orphan `wearableRevokeHandler`** to fix HTTPS→PubSub trigger-type change.

## Followups

| # | Issue | Severity | Action |
|---|-------|----------|--------|
| 1 | `consent` Cloud Run revisions fail Container Healthcheck — local `node ./lib/index.js` loads cleanly, so the issue is Cloud Run-environment-specific (likely a top-level await, missing env, or import-time side effect) | HIGH | `/gsd-debug` session — inspect Cloud Run logs at https://console.cloud.google.com/run?project=gamechangers-prod |
| 2 | 7 placeholder secrets need real values before features launch | MEDIUM | Operator action — populate when each feature ships |
| 3 | Artifact registry has no cleanup policy — container images will accumulate | LOW | `firebase functions:artifacts:setpolicy` |
| 4 | `gcloud` auth in this environment expired; not strictly needed since `firebase` CLI handles project-level auth | LOW | `gcloud auth login` if direct gcloud calls become needed |

## Verify (manual)

```
firebase functions:list --project gamechangers-prod | grep -c "southamerica-east1"
# expected: ~47 lines (38 healthy + 9 in failing state)
```

Post-fix, all 6 documented categories (A-F) are resolved. Plan's primary success metric — workspace-protocol error eliminated AND 6 plan-target codebases typecheck clean — is met. Consent's Cloud Run failure is a separate runtime issue, not a workspace-protocol or TS issue.
