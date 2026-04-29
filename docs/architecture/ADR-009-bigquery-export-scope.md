# ADR-009: BigQuery Export Scope

**Status:** Accepted (2026-04-28)
**Plan:** 02-01 (Phase 2 Step 0 architecture lockdown)

## Context

The Firestore→BigQuery extension (`firebase/firestore-bigquery-export`) streams Firestore
writes into BigQuery `*_changelog` tables for analytics. Phase 3 builds Metabase dashboards
on top of these tables for B2B partners (with k≥50 anonymization at the SQL view layer).

Phase 2 must lock which collections are exported and which are NEVER exported, BEFORE any
B2B partner connects in Phase 3. Retrofitting is a Pitfall #6 hazard — once raw data lands
in BigQuery, the LOPDP exposure surface grows and revoking is costly.

## Decision

**Eight collections are exported to BigQuery dataset `gw_analytics` in `southamerica-east1`:**

| # | Collection path | Table ID | Why |
|---|-----------------|----------|-----|
| 1 | `users/{uid}/profile` | `profiles` | partner-relevant cohort dimensions (anonymized at view) |
| 2 | `users/{uid}/consents` | `consents` | consent state — required to enforce per-partner gating in BigQuery views |
| 3 | `users/{uid}/healthDaily` | `healthDaily` | aggregated wearable data; never raw samples |
| 4 | `events` | `events` | event metadata (city, tier, capacity) |
| 5 | `events/{eventId}/attendance` | `attendance` | RSVP + check-in counts (collection-group export) |
| 6 | `challenges` | `challenges` | challenge metadata + completion stats |
| 7 | `auditLog` | `auditLog` | required for LOPDP audit reporting (DPO access only) |
| 8 | `consentLedger` | `consentLedger` | append-only consent grant/revoke timeline |

**Never exported.** healthSamples is NEVER exported to BigQuery — this is a hard architectural
boundary. The complete exclusion list:

| Collection | Why excluded |
|------------|--------------|
| `users/{uid}/healthSamples/{yyyymm}/metrics/{id}` | raw wearable samples; daily aggregate (`healthDaily`) is the contract surface for partners. Pitfall #6 + WEAR-09. healthSamples is NEVER exported. |
| `users/{uid}/private/**` | KMS-encrypted Discord refresh tokens, DSAR working storage, anything trust-boundary. |
| `users/{uid}/dsarRequests/{id}` | DSAR is a 1:1 user request, not analytics signal. |
| any partner-claim-gated collection | partners read their own partition via Metabase signed embedding only — not BigQuery direct. |

## Consequences

**Positive:**
- Raw health data physically never lands in BigQuery — LOPDP defensibility around health
  sensitivity is preserved.
- Phase 3 partner queries are confined to `healthDaily` aggregates that already smooth
  individual-level signal.
- `auditLog` export means the DPO can build LOPDP audit reports in Metabase without
  writing custom Function code.

**Negative:**
- If a future partner asks for sub-daily wearable signal, we cannot serve it from BigQuery
  without breaking this ADR. We will ship that as a Phase 3 Function-mediated export with
  per-request consent re-check, OR refuse the request.
- The `firestore-bigquery-export` extension creates one Function per collection (8 total)
  — count toward the project Function quota.

## Verification

- `scripts/setup-bq-export.sh` installs the extension exactly 8 times — verifiable by
  grep: the script enumerates the 8 TABLE_IDs literally and does NOT contain the string
  `healthSamples`.
- BigQuery dataset listing after install:
  `bq ls gamechangers-prod:gw_analytics` must show exactly 8 `*_changelog` tables.
  Critically, `healthSamples_changelog` MUST NOT appear.

## References

- PITFALLS.md Pitfall #6 (k-anonymity schema-time enforcement)
- 02-RESEARCH.md §3 (two-tier B2B pipeline)
- WEAR-09 requirement (raw sample boundary)
- ARCH-09 requirement (BigQuery scope lockdown)
- LOPDP Art. 7 minimization principle
