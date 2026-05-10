# Infrastructure Provisioning Runbook (Phase 02 floor)

> Owner: Platform / DevOps
> Scope: Cloud KMS keyring + cryptoKey, Cloud Pub/Sub topics
> Phase: 02 (Plan 10 / G1 + G6 closure)
> Project: `gamechangers-prod`
> Region (regional resources): `southamerica-east1`

This runbook covers the GCP infrastructure floor that Phase 02 Cloud Functions
depend on at runtime:

1. **Cloud KMS** — keyring `gc` + cryptoKey `discord-tokens` (encrypts Discord
   OAuth refresh tokens — see `functions/shared/kms.ts`).
2. **Cloud Pub/Sub** — 5 topics consumed by Phase 02 publishers/subscribers
   (see `scripts/setup-pubsub-topics.sh`).

Both are provisioned via idempotent `bash` scripts that can be re-run safely.

---

## Prerequisites

- `gcloud` CLI installed and authenticated:
  ```
  gcloud auth login
  gcloud config set project gamechangers-prod
  ```
- IAM on the operator account:
  - `roles/cloudkms.admin` on the project (create keyring + cryptoKey, manage IAM)
  - `roles/pubsub.admin` on the project (create topics)
  - `roles/run.viewer` on the project (read consent-grant SA)
  - `roles/iam.serviceAccountUser` (binding role to runtime SA)
- The Firebase project ID is set on the env or as the gcloud default:
  ```
  export GCP_PROJECT_ID=gamechangers-prod
  ```

---

## Run order (one-time bootstrap)

```bash
# 1. KMS first — Discord OAuth flow is dead without it.
bash scripts/setup-kms.sh

# 2. Pub/Sub topics second — implicit-on-first-publish exists but explicit
#    provisioning gives an audit trail and a clean baseline.
bash scripts/setup-pubsub-topics.sh
```

Both scripts are idempotent; re-running them after Functions deploy is also
required to re-bind IAM on the **real** runtime service account (see Fallback
Revoke Procedure below).

---

## KMS provisioning

`scripts/setup-kms.sh` provisions:

| Resource | Value |
|----------|-------|
| Keyring  | `gc` (location `southamerica-east1`) |
| CryptoKey | `discord-tokens` |
| Purpose | `ENCRYPT_DECRYPT` |
| Protection level | software (MVP — HSM upgrade documented as Phase 3 follow-up) |
| Rotation | 90 days |
| IAM binding | `roles/cloudkms.cryptoKeyEncrypterDecrypter` on the cryptoKey resource only — bound to the Cloud Functions runtime service account |

### Runtime SA discovery

The script resolves the Cloud Functions runtime service account by reading
the `consent-grant` Cloud Run service revision. If `consent-grant` is not
deployed yet, the script falls back to the project default compute SA
(`<PROJECT_NUMBER>-compute@developer.gserviceaccount.com`) and emits a
warning to stderr instructing the operator to re-run the script and
**revoke the fallback binding** once the real SA is identified. See the
Fallback Revoke Procedure below.

### Verification

```bash
# Purpose check (must be ENCRYPT_DECRYPT)
gcloud kms keys describe discord-tokens \
  --keyring=gc --location=southamerica-east1 --project=gamechangers-prod \
  --format='value(purpose)'

# IAM policy check (must show exactly ONE serviceAccount member with the
# encrypter/decrypter role — Major-2 invariant from threat T-02-10-05)
gcloud kms keys get-iam-policy discord-tokens \
  --keyring=gc --location=southamerica-east1 --project=gamechangers-prod \
  --format=json
```

The IAM policy JSON must show a single binding for
`roles/cloudkms.cryptoKeyEncrypterDecrypter`, with exactly one
`serviceAccount:` member. If it shows two (real + fallback), follow the
Fallback Revoke Procedure immediately.

---

## Pub/Sub topics provisioning

`scripts/setup-pubsub-topics.sh` provisions:

| Topic | Publishers | Subscribers |
|-------|------------|-------------|
| `xp-events` | events/checkIn, content/contentCompleted, challenges/challengeProgress, gamification/recomputeStats | gamification/xpAward, gamification/streakAdvance |
| `level-up-events` | gamification/xpAward | gamification/discordRoleSync |
| `consent-revoked` | consent/revoke | gamification/cleanup (Phase 3 placeholder) |
| `events-capacity-changed` | events/cancelRsvp | events/waitlistPromote |
| `crisis-alerts` | trustsafety/reportUser | Phase 3 moderation dashboard placeholder |

### Verification

```bash
gcloud pubsub topics list --project=gamechangers-prod --format='value(name)'
```

Expected output: 5 lines with `projects/gamechangers-prod/topics/<name>` for each
of the topics above.

---

## Fallback Revoke Procedure (Major-2 fix)

**Why this matters.** If the script fell back to the project default compute
SA when binding KMS encrypter/decrypter, two service accounts now hold the
encrypter/decrypter role on the key — doubling the attack surface
(threat T-02-10-05). The fallback binding must be revoked once the real
runtime SA is known.

**Branch A — Real SA matches the SA the script bound (no fallback used)**

OK. No action needed. Record in Appendix A: "Runtime SA resolved on first
try; no fallback binding to revoke."

**Branch B — Script used the fallback compute-default but a real runtime SA
exists now**

```bash
# 1. Bind the real runtime SA explicitly
gcloud kms keys add-iam-policy-binding discord-tokens \
  --keyring=gc --location=southamerica-east1 --project=gamechangers-prod \
  --member="serviceAccount:<REAL_SA>" \
  --role=roles/cloudkms.cryptoKeyEncrypterDecrypter \
  --condition=None

# 2. Smoke-test the real SA can encrypt
gcloud kms encrypt \
  --location=southamerica-east1 --keyring=gc --key=discord-tokens \
  --plaintext-file=<(echo test) \
  --ciphertext-file=/dev/null \
  --impersonate-service-account=<REAL_SA>
# Expected: silent success (exit 0). Permission denied means the binding
# has not propagated yet; wait 60s and retry.

# 3. REVOKE the fallback binding
gcloud kms keys remove-iam-policy-binding discord-tokens \
  --keyring=gc --location=southamerica-east1 --project=gamechangers-prod \
  --member="serviceAccount:<PROJECT_NUMBER>-compute@developer.gserviceaccount.com" \
  --role=roles/cloudkms.cryptoKeyEncrypterDecrypter \
  --condition=None

# 4. Re-verify — must show exactly ONE serviceAccount member
gcloud kms keys get-iam-policy discord-tokens \
  --keyring=gc --location=southamerica-east1 --project=gamechangers-prod \
  --format=json
```

If both members still appear, repeat the revoke or escalate. Log timestamps
and before/after policy outputs to Appendix A.5.

**Branch C — Real SA cannot be resolved (e.g., consent-grant not deployed)**

Halt. Do not leave the fallback binding in place permanently. Document
that the real SA could not be resolved, mark this gap as `BLOCKED`, and
require the next deploy of `consent-grant` to re-run `bash scripts/setup-kms.sh`
and follow Branch B.

---

## Rollback notes

**Cloud KMS — NEVER use `gcloud kms keys destroy` directly.** Key destruction
is irreversible. To retire a key:

1. Schedule destruction via `--scheduled-destroy-duration` on a key version
   (24h–30d window):
   ```bash
   gcloud kms keys versions destroy <version> \
     --key=discord-tokens --keyring=gc --location=southamerica-east1 \
     --project=gamechangers-prod
   ```
   Cloud KMS then waits the configured `destroyScheduledDuration` (default
   24h, can extend up to 30d) before actually destroying material.
2. The version remains in `DESTROY_SCHEDULED` state and can be restored
   with `gcloud kms keys versions restore` during the window.
3. Do **not** delete the keyring or cryptoKey itself — those are hard-deletes
   for IAM but keep the key version state.

**Pub/Sub — topic deletion is straightforward but cascade-deletes
subscriptions.** Document any subscription deletion in change-management
before running `gcloud pubsub topics delete`.

---

## Audit / KMS Data Access logs

Cloud KMS Data Access logs are **not** on by default (cost). The threat
register accepts T-02-10-03 (cannot prove who decrypted) for MVP, with
enablement deferred to Phase 3. To enable later:

```bash
gcloud projects get-iam-policy gamechangers-prod  # capture before snapshot
# Edit Logging audit config to enable DATA_READ + DATA_WRITE for cloudkms.googleapis.com
gcloud projects set-iam-policy gamechangers-prod <updated-policy.yaml>
```

---

## Appendix A — KMS run-log

> Captured live `gcloud` output from `bash scripts/setup-kms.sh` against
> `gamechangers-prod`. Updated each time the script is re-run after a
> Functions deploy that changes the runtime SA.

### A.1 Initial provisioning run

_Pending — to be appended after the first run against `gamechangers-prod`._

### A.2 `gcloud kms keys describe` output

_Pending — see Verification command above._

### A.3 `gcloud kms keys get-iam-policy` output

_Pending — must show exactly ONE serviceAccount member for the
encrypter/decrypter role._

### A.4 Branch taken (A / B / C)

_Pending._

### A.5 Fallback Revoke ledger (only if Branch B was taken)

_Pending — if applicable, capture timestamps, before/after IAM policies,
and the smoke-test result here as proof the attack surface was reduced
to a single SA._

---

## Appendix B — Pub/Sub run-log

> Captured live `gcloud pubsub topics list` output and any subscriber
> mapping notes from `bash scripts/setup-pubsub-topics.sh`.

### B.1 Topic-list output

_Pending — must contain all 5 topic names._

### B.2 Subscriber mapping

The Phase 02 subscribers expected to wire to these topics (from script
header comment + Phase 02 plans):

- `xp-events` → `gamification-xp-award`, `gamification-streak-advance`
- `level-up-events` → `gamification-discord-role-sync`
- `consent-revoked` → `gamification-cleanup` (Phase 3 placeholder; possibly
  not yet deployed)
- `events-capacity-changed` → `events-waitlist-promote`
- `crisis-alerts` → Phase 3 moderation dashboard (placeholder; not yet
  deployed)

To verify wiring after Functions deploy:

```bash
gcloud run services list --region=southamerica-east1 \
  --project=gamechangers-prod \
  --filter='metadata.labels.cloudfunctions-eventarc-trigger:*' \
  --format='value(metadata.name,metadata.labels.cloudfunctions-eventarc-trigger)'
```

### B.3 Pre-existing topics flag

If a topic already existed before this script ran (i.e., implicit creation
on a prior publish from local dev), note here. Audit log evidence:

```bash
gcloud logging read \
  'protoPayload.methodName="google.pubsub.v1.Publisher.CreateTopic"' \
  --project=gamechangers-prod --limit=20 \
  --format='value(timestamp,protoPayload.resourceName)'
```
