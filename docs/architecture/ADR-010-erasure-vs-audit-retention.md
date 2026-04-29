# ADR-010: Account Erasure vs. Audit-Log Retention

**Status:** Proposed — awaiting DPO + legal counsel sign-off before production deploy
**Date:** 2026-04-29
**Deciders:** Engineering lead, DPO (TBD)
**Context:** LOPDP Art. 22 (right of erasure) vs. Art. 26 (retention for legal obligation)

---

## NOTE FOR DPO REVIEW

This ADR explicitly flags that the DPO + counsel must sign off on this approach BEFORE production deploy. The tension between "right to erasure" and "legal retention of audit records" is the core compliance question for Gamer Wellness's Ecuador operations under LOPDP. Penalties for getting this wrong: 0.1-1% of annual turnover + activity suspension (see SPDP vs. LigaPro $259K and SPDP vs. FEF $195K, January 2026).

---

## Context and Problem

When a user requests account erasure (LOPDP Art. 22), two competing legal obligations apply:

1. **Right to erasure** — The user has the right to have their personal data deleted.
2. **Audit-log retention** — LOPDP Art. 26 and Ecuador's general administrative law require that organizations maintain records demonstrating lawful data processing. The consent audit trail (`auditLog`) and the hash-chain consent ledger (`consentLedger`) serve as proof that data was collected under valid consent — and that consent was later revoked/expired per user request.

If we delete `auditLog` and `consentLedger` entries on erasure, we destroy the evidence that processing was lawful, exposing the company to regulatory penalties. If we retain them unmodified, we retain the user's UID (personal data) beyond their erasure request.

**The tension:** Deleting the records eliminates compliance proof; retaining them unmodified violates erasure rights.

---

## Decision

**Pseudonymize, do not delete, `auditLog` and `consentLedger` entries.**

Specifically:

1. **Soft delete (immediate):** Mark the user profile as deleted (`deletedAt`, `displayName: '[deleted]'`). Revoke all Firebase Auth sessions. Set `accountDeleted: true` custom claim. Revoke all active consents.

2. **Hard delete (72 hours later, via Cloud Tasks):** Delete all user-generated content subcollections: `consents`, `profile`, `badges`, `streaks`, `challengeEnrollments`, `challengeProgress`, `healthDaily`, `healthSamples`, `dsarRequests`, `private`, `notifications`, `fcmTokens`.

3. **Pseudonymization (during hard delete):** In `auditLog` and `consentLedger`, replace the `uid` field with `pseudoUid = sha256(uid + ERASURE_PSEUDONYM_SALT)`. The original UID is not retained. The records remain for audit purposes but cannot be linked back to the individual without the salt (which is itself a controlled secret).

4. **The `subcollections` array passed to the deletion loop MUST NOT include `'auditLog'` or `'consentLedger'`** — deletion of these is explicitly prohibited by this ADR.

---

## Rationale

### Why pseudonymize rather than delete?

- **LOPDP Art. 26** requires retention of records sufficient to demonstrate lawful processing. The consent ledger is the primary evidence that data was collected under valid consent.
- **Recital analogy to GDPR Recital 65:** Erasure should be balanced against the need to retain records for legal proceedings, regulatory compliance, or establishment/exercise/defense of legal claims.
- Pseudonymization is an accepted technique under both GDPR (Art. 4(5)) and LOPDP's definitions of anonymization/pseudonymization. Once pseudonymized with a controlled salt, the records are no longer "personal data" under the key-holder's control — they cannot identify the data subject without the salt.
- The `auditLog` hash chain would be broken if entries were deleted (gaps in the chain = evidence of tampering). Pseudonymization preserves chain integrity.

### Why 72-hour delay for hard delete?

- Allows time to cancel if the user changes their mind (within 24h they can contact support).
- Gives the DSAR pipeline time to complete any in-flight export request before data is gone.
- 72 hours is short enough to satisfy "without undue delay" under LOPDP Art. 22.

### Why sha256(uid + salt) and not a random UUID?

- Deterministic pseudonymization means multiple audit records for the same user remain linkable to each other (for integrity verification) but not to the original user.
- If a regulator queries "show me all consent events for this pseudonym," we can produce a coherent audit trail without re-identifying the user.
- The salt is stored in Firebase Secret Manager; if we ever need to re-identify (under court order), we retain the cryptographic ability to do so while controlling access to the salt as a separate secret.

---

## Consequences

### Positive
- Preserves compliance audit trail for SPDP inspection.
- Satisfies LOPDP Art. 22 erasure right (UID is gone from Firestore as a readable field).
- Hash chain integrity preserved (no gaps).
- Deterministic pseudonymization allows regulator-requested audit without re-identification.

### Negative / Risks
- **Residual linkability risk:** If an attacker obtains the `ERASURE_PSEUDONYM_SALT` secret and the pseudonymized audit records, they can re-identify users. Mitigation: restrict salt access to Cloud Functions service account only; rotate salt annually.
- **Legal grey area:** LOPDP does not explicitly address pseudonymization as a substitute for erasure. This interpretation aligns with GDPR precedent, but Ecuador's SPDP has not issued a formal ruling. **DPO + counsel must confirm this interpretation before go-live.**
- **Data subject challenge:** A user could argue that pseudonymized records are still "their data" if the controller holds the de-pseudonymization key. Our position: the salt is a separate controlled secret accessible only to a supervised Cloud Function, not to general staff.

---

## Alternatives Considered

| Option | Verdict |
|--------|---------|
| Delete `auditLog` + `consentLedger` entirely | Rejected — destroys compliance evidence; hash chain gaps are evidence of tampering |
| Retain unmodified (keep UID in audit records) | Rejected — violates LOPDP Art. 22 erasure right |
| Anonymize by replacing UID with random UUID (non-deterministic) | Rejected — breaks cross-record linkability needed for audit trail coherence |
| Pseudonymize with sha256(uid + salt) — **chosen** | Accepted — balances erasure right with audit retention; aligns with GDPR pseudonymization precedent |

---

## Implementation Reference

- `functions/consent/src/erasure.ts` — `pseudonymizeUid()`, `performHardDelete()`
- The `subcollections` array in `erasureHardDelete` explicitly excludes `'auditLog'` and `'consentLedger'`
- `ERASURE_PSEUDONYM_SALT` — stored in Firebase Secret Manager, accessed only by `erasureHardDelete`
- Unit test in `functions/consent/src/__tests__/erasure.test.ts` — "erasure does NOT delete auditLog or consentLedger" test reads the source to assert the subcollections array constraint

---

## Open Questions for DPO

1. Does Ecuador's SPDP accept pseudonymization as satisfying the Art. 22 erasure right?
2. What retention period applies to pseudonymized audit records under LOPDP + Ecuadorian commercial law? (Proposed: 7 years, matching standard record-keeping obligation.)
3. Must the DPIA explicitly document the pseudonymization approach and the salt as a "key" held by the controller?
4. Is 72 hours an acceptable delay for hard-delete, or does LOPDP require immediate deletion?

---

## Related ADRs

- ADR-009: BigQuery Export Scope (consent-gated collections only — `auditLog` excluded from BigQuery export)
- DPIA — Section 4.3 (erasure procedure) — must be updated to reference this ADR
