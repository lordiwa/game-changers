---
plan: 02-11
status: blocked
date: 2026-05-09
commits: []
blocked_by: gcloud-auth + bq-cli-missing
---

# 02-11-SUMMARY — BigQuery Two-Tier Architecture (BLOCKED)

## Outcome

**BLOCKED at preflight.** No commits made; no mutations to project state. Execution halted before Task 0 region decision because the prerequisites (working gcloud auth + `bq` CLI) cannot be established in this environment.

## Commits

None.

## Preflight findings

| Check | Result |
|-------|--------|
| `pnpm exec firebase --version` | OK (14.24.0) |
| `pnpm exec firebase projects:list` | OK — `gamechangers-prod` is current |
| `pnpm exec firebase ext:list --project gamechangers-prod` | OK — confirms 0 extensions installed (G2 still open) |
| `gcloud auth list` | shows `srparca@gmail.com` ACTIVE, tokens stale |
| `gcloud projects describe gamechangers-prod` | **FAIL** — `invalid_grant: Bad Request` |
| `gcloud config get-value project` | **WRONG** — returns `remoosevue` |
| `which bq` / `bq version` | **MISSING** — gcloud SDK 432.0.0 too old to bundle bq by default |

## Why hard-blocked

Plan 02-11 requires live mutations against `gamechangers-prod`:

1. **Task 0** — `bq query --location=southamerica-east1 'SELECT 1'` probe to verify BigQuery DP availability informs `BQ_LOCATION`. Without `bq` and working auth, probe cannot run.
2. **Task 1** — `bigquery/setup/create-datasets.sh` calls `bq mk`; `pnpm exec firebase ext:install` needs project owner / extension-admin role on `gamechangers-prod` via active gcloud OAuth.
3. **Task 2** — `bigquery/setup/grant-metabase-readonly.sh` uses `gcloud iam service-accounts create`, `gcloud projects add-iam-policy-binding`, `bq update`. None can run without auth.

## To resume

User must complete in their shell:

```powershell
gcloud auth login srparca@gmail.com
gcloud auth application-default login
gcloud config set project gamechangers-prod
gcloud components install bq --quiet
gcloud components update --quiet
gcloud projects describe gamechangers-prod --format="value(projectId)"
bq --project_id=gamechangers-prod ls
```

Then re-spawn the executor for plan 02-11.

## Closes Gap (when resumed)

G2 from `02-HUMAN-UAT.md` — BigQuery two-tier architecture not operational.
