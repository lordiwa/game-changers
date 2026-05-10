# Operator Runbook — Backfill Denormalized Counters (`backfill-counters.ts`)

**Owner:** Platform / Backend
**Plan:** 02-14 (Phase 02 G3 closure)
**Last reviewed:** 2026-05-09

## Purpose

One-shot Node script that initializes the WR-06 denormalized counters
(`eventAttendedTotal`, `contentCompletedTotal`) on `/users/{uid}/profile/main`
docs from historical `auditLog` data. Runs against a live Firestore project
or against the local emulator.

Without this backfill, users created **before** the WR-06 fix deploy have
stale `0` counters that cause `recomputeStats` to compute incorrect
HP/Mente/Social stats (showing greyed-out character sheets — see
PROF-12 / Pitfall #9).

## When to run

1. **Once on initial post-launch**, after WR-06 deploy, when historical
   users exist with auditLog `xp_awarded` entries that pre-date the
   counter denormalization.
2. **Any time** the auditLog action vocabulary expands and a new
   `event_attended`-class or `content_completed`-class action is
   introduced — re-run to recompute totals from the broader set.
3. **As a verification step** after a Firestore restore — counters are
   deterministic, so a re-run confirms the restored state matches.

## Prerequisites

| Requirement | Notes |
|---|---|
| Service-account JSON key | Role: `roles/datastore.user` on the target project. Store at `./sa.json` (gitignored) or any path; pass via `GOOGLE_APPLICATION_CREDENTIALS`. **Do NOT commit keys.** |
| `pnpm` + Node 22 | Repo standard. |
| `tsx` | Provided by `@gamechangers/scripts` devDeps; no separate install needed. |
| Firestore composite indexes | The script issues equality-only filter queries (`action`, `uid`, `type`) which Firestore handles with a single composite index. If missing, the first run prints an "index required" link — click it, wait ~2 min for the index to build, re-run. |

## Idempotency guarantee

The script COMPUTES totals from the auditLog (it sets the counter to the
absolute count, NOT `FieldValue.increment`). Re-running on the same data
produces the same target state — there is no rollback needed because
there is no destructive operation:

- Re-run after a partial failure: safe.
- Re-run after a full success: produces identical writes (same target).
- Re-run with a stale auditLog (no new entries since last run): zero diff.

The script test suite (`scripts/__tests__/backfill-counters.test.ts`)
proves idempotency by running twice and asserting no diff.

## Commands

### Dry-run first (REQUIRED safety step)

```bash
GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
  pnpm --filter @gamechangers/scripts exec tsx backfill-counters.ts \
    --project=gamechangers-prod \
    --dry-run \
  > backfill.preview.jsonl
```

Inspect `backfill.preview.jsonl`:

```bash
# Sanity-check the diffs for a sampled user:
grep '"uid":"<known-test-user>"' backfill.preview.jsonl
# Confirm summary at end:
tail -1 backfill.preview.jsonl
# Expected fields: usersScanned, usersUpdated=0 (dry-run), totalEventAttended,
# totalContentCompleted, errors, durationMs.
```

### Run for real

```bash
GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
  pnpm --filter @gamechangers/scripts exec tsx backfill-counters.ts \
    --project=gamechangers-prod \
  > backfill.run.jsonl
```

### Single-user mode (debugging / recovery)

```bash
GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
  pnpm --filter @gamechangers/scripts exec tsx backfill-counters.ts \
    --project=gamechangers-prod \
    --uid=<single-uid> \
  > backfill.user.jsonl
```

### Custom batch size

```bash
GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
  pnpm --filter @gamechangers/scripts exec tsx backfill-counters.ts \
    --project=gamechangers-prod \
    --batch-size=200 \
  > backfill.run.jsonl
```

## Expected runtime

| Users  | Wall-clock | Notes |
|---|---|---|
| 100    | < 30 sec | Local network, hot Firestore connection. |
| 1 000  | ~1 min   | Sequential per-user processing. |
| 10 000 | ~10 min  | Same model, paginated 500 per page. |
| 100 000| ~90 min  | Run during a low-traffic window — read-heavy, no write contention with live traffic. |

## Output schema (line-delimited JSON)

Per user:
```json
{
  "uid": "abc123",
  "current": { "eventAttendedTotal": 0, "contentCompletedTotal": 0 },
  "target":  { "eventAttendedTotal": 5, "contentCompletedTotal": 3 },
  "diff":    { "eventAttendedTotal": 5, "contentCompletedTotal": 3 }
}
```

Final summary (last line):
```json
{
  "summary": {
    "usersScanned": 1234,
    "usersUpdated": 1234,
    "totalEventAttended": 4321,
    "totalContentCompleted": 9876,
    "errors": 0,
    "durationMs": 67890
  }
}
```

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success (regardless of `errors` count — inspect summary). |
| `1` | Generic error (uncaught exception, malformed argv). |
| `2` | Missing/invalid credentials (`GOOGLE_APPLICATION_CREDENTIALS` unset or unreadable). |

## Rollback

**There is no rollback.** Counters are deterministic — a `--dry-run` is
the only safety check needed. If a bad run is suspected (e.g., truncated
auditLog), simply restore the auditLog (or wait for it to converge) and
re-run the backfill. Results are stable.

If you need to **revert** counter writes (e.g., script wrote to the
wrong project), re-run the script against the same project after
restoring the previous auditLog state — the counters will recompute to
match the restored history.

## Failure modes

| Failure | Symptom | Mitigation |
|---|---|---|
| Missing credentials | Exit code 2; "Could not load default credentials" | Set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON path. |
| Missing index | Per-user error line; "The query requires an index" | Click the URL in the error, wait ~2 min, re-run. |
| Firestore quota exceeded | Mid-run errors; "Quota exceeded" | Lower `--batch-size`, run in off-peak hours, or request a quota bump. |
| Partial run interrupted | Some users updated, some not | Re-run — idempotent; converges to correct state. |

## Threat-register references

- **T-02-14-01 (Tampering — wrong counter)** mitigated by emulator-backed
  unit test asserting hand-computed expected values for 10 users.
- **T-02-14-02 (Tampering — overwrite other fields)** mitigated by
  `set(target, { merge: true })` on a small allow-list of fields; test
  asserts `displayName` is preserved post-run.
- **T-02-14-03 (Information Disclosure — service-account key)**
  partially mitigated by this runbook. Operator MUST NOT commit keys;
  alternative: use `gcloud auth print-access-token` impersonation
  (`firebase auth:export` style) to avoid persistent JSON keys on disk.
- **T-02-14-04 (DoS — read fanout collides with live writes)** read-only
  workload; minimal write contention. Schedule for low-traffic window if
  user count exceeds 10K.

## Related

- `scripts/backfill-counters.ts` — the script itself.
- `scripts/__tests__/backfill-counters.test.ts` — emulator-backed test.
- `functions/gamification/src/xpAward.ts` — the writer of `xp_awarded`
  audit entries (lines ~166-180 maintain the live counters via
  `FieldValue.increment(1)`).
- `functions/gamification/src/recomputeStats.ts` — the consumer that
  reads the counters (lines ~64-91).
