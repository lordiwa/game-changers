# ADR-008: Anonymous → Full Account Upgrade

**Status:** Accepted (2026-04-28)
**Plan:** 02-01 (Phase 2 Step 0 architecture lockdown)

## Context

Phase 2 supports two onboarding flows:
1. **Discord OAuth bridge** — user clicks `/link` in Discord, lands on PWA with a Firebase
   custom token, can immediately access Discord-linked features.
2. **Anonymous → upgrade** — user lands on the PWA without Discord, gets a Firebase
   anonymous account, browses content, decides later to upgrade by linking Discord.

The architectural question is what happens to the anonymous Firebase uid when the user
later authenticates with Discord:

- **Option A:** Keep the anonymous uid as the canonical user identity. On link, write
  Discord identity into `users/{uid}/private/discord` (KMS-encrypted refresh token).
- **Option B:** Treat the Discord-bound uid as canonical. Merge anonymous uid's data
  into the new uid; delete the anonymous uid.

Option B is the conventional Firebase pattern (`linkWithCredential` collapses uids), but
it complicates audit trails — every doc written under the anonymous uid needs a rewrite,
the consentLedger has dangling uid references, and the LOPDP audit story becomes harder.

## Decision

**Option A: keep the anonymous uid as canonical.** Discord identity is a profile attribute,
not the user's primary key.

Implementation:
- The anonymous Firebase uid is created on first PWA load (Plan 02 AUTH-01) and never
  changes.
- On Discord link (Plan 02 AUTH-04), the bridge Function writes `users/{uid}/private/discord`
  with `{ discordId, refreshTokenCiphertext, linkedAt }`. KMS-encrypted via the path
  documented in `functions/shared/kms.ts`.
- Custom claims do NOT include `discordId` — they only carry the consent bitmap. Discord
  identity is read from the private subcollection by Cloud Functions on demand.
- Discord unlink (Plan 02 AUTH-06) deletes the private/discord doc and removes the
  Discord-role-sync subscription; the user's Firebase uid remains intact.

## Consequences

**Positive:**
- audit trails (`consentLedger`, `auditLog`) reference one uid for the user's whole lifetime —
  LOPDP-friendly.
- DSAR exports (Plan 04) are a single uid query — no merge logic.
- Consent grants made anonymously remain valid post-link.
- No risk of accidental data loss during a `linkWithCredential` collision.

**Negative:**
- Two-step reasoning ("the user's anonymous uid IS the canonical uid is the canonical uid is the canonical uid") for new contributors —
  document this prominently in onboarding docs.
- Discord-bot lookups need a `discordId → uid` reverse-index doc (Plan 03 ships this as
  `discordIndex/{discordId} → { uid }`).

**Mitigations:**
- The anonymous uid is canonical: documented in this ADR, in CLAUDE.md (after Phase 2
  ships), and in the Plan 04 consent UI (so users see their stable uid on the DSAR export).
- The reverse-index doc is owned by the consent Function (write only) and read-protected
  by Security Rules (DPO + the Discord bot service-account only).

## Alternatives Considered

| Alternative | Rejected because |
|-------------|------------------|
| Option B (Discord uid canonical) | Audit trail rewrite cost; LOPDP DSAR complexity; risk of merge collisions. |
| Defer the decision to Phase 3 | Compounds 5-10x per Pitfall #6 — Phase 2 must lock the canonical uid before AUTH ships. |

## References

- 02-RESEARCH.md §2 A1 (anonymous-upgrade pattern)
- 02-RESEARCH.md Open Question 1 (which uid wins)
- PROJECT.md Out of Scope: data collection inside Discord
- LOPDP Art. 31 (right of access requires single canonical user identity)
