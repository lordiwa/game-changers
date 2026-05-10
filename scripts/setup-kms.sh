#!/usr/bin/env bash
# scripts/setup-kms.sh
#
# Idempotent provisioner for the Cloud KMS keyring + cryptoKey that
# functions/shared/kms.ts encrypts Discord OAuth refresh tokens against.
#
# Provisions:
#   keyring : gc                (location: southamerica-east1)
#   key     : discord-tokens    (purpose: ENCRYPT_DECRYPT, software protection level — MVP)
#
# IAM:
#   Grants roles/cloudkms.cryptoKeyEncrypterDecrypter to the Cloud Functions
#   runtime service account on the cryptoKey resource ONLY (not on the
#   keyring or project — least-privilege per T-02-10-01 mitigation).
#
# Runtime SA discovery order:
#   1. Inspect a deployed consent function (consent-grant) on Cloud Run.
#   2. If not found, fall back to the project default compute SA
#      ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com — and
#      WARN the operator to re-run after the real SA is deployed and to
#      revoke the fallback binding (T-02-10-05 / Major-2 fix).
#
# Required env: GCP_PROJECT_ID (or `gcloud config get-value project`).
#
# Idempotent: re-running this script is safe — describe-or-create + IAM
# add-binding are no-ops when state already matches.
#
# DESTRUCTION SAFETY: This script never destroys keys. To retire a key,
# use `gcloud kms keys versions destroy` with --scheduled-destroy-duration
# (24h–30d window) so the operation is reversible.

set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
if [[ -z "$PROJECT" ]]; then
  echo "ERROR: GCP_PROJECT_ID not set and gcloud has no default project." >&2
  exit 1
fi

KEYRING="gc"
KEY="discord-tokens"
LOCATION="southamerica-east1"
ROLE="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Used to flag the operator that a follow-up revoke is required (Major-2 fix).
USED_FALLBACK_SA=0

echo "Provisioning Cloud KMS keyring + cryptoKey in project: $PROJECT"
echo "  keyring : $KEYRING ($LOCATION)"
echo "  key     : $KEY (ENCRYPT_DECRYPT)"

# ---------------------------------------------------------------------------
# Step A: Keyring (idempotent describe-or-create)
# ---------------------------------------------------------------------------
if gcloud kms keyrings describe "$KEYRING" \
     --location="$LOCATION" --project="$PROJECT" >/dev/null 2>&1; then
  echo "[A] keyring '$KEYRING' already exists — skipping create."
else
  echo "[A] creating keyring '$KEYRING'..."
  gcloud kms keyrings create "$KEYRING" \
    --location="$LOCATION" --project="$PROJECT"
fi

# ---------------------------------------------------------------------------
# Step B: CryptoKey (idempotent describe-or-create) with 90d rotation
# ---------------------------------------------------------------------------
if gcloud kms keys describe "$KEY" \
     --keyring="$KEYRING" --location="$LOCATION" \
     --project="$PROJECT" >/dev/null 2>&1; then
  echo "[B] cryptoKey '$KEY' already exists — skipping create."
else
  echo "[B] creating cryptoKey '$KEY' (purpose=encryption, rotation=90d)..."
  # Compute next rotation in a portable way (GNU date vs BSD date).
  if NEXT_ROT=$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null); then
    :
  else
    NEXT_ROT=$(date -u -v+90d +%Y-%m-%dT%H:%M:%SZ)
  fi
  gcloud kms keys create "$KEY" \
    --keyring="$KEYRING" \
    --location="$LOCATION" \
    --purpose=encryption \
    --rotation-period=90d \
    --next-rotation-time="$NEXT_ROT" \
    --project="$PROJECT"
fi

# ---------------------------------------------------------------------------
# Step C: Resolve the runtime service account
# ---------------------------------------------------------------------------
echo "[C] resolving Cloud Functions runtime service account..."

RUNTIME_SA=""
# Try to read the SA from the deployed consent-grant function (Cloud Run
# revision under the hood for Functions v2). Suppress errors — function
# may not be deployed yet.
RUNTIME_SA=$(gcloud run services describe consent-grant \
  --region="$LOCATION" \
  --project="$PROJECT" \
  --format='value(spec.template.spec.serviceAccountName)' 2>/dev/null || true)

if [[ -z "$RUNTIME_SA" ]]; then
  PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
  RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
  USED_FALLBACK_SA=1
  echo "[C] WARN: consent-grant not deployed; falling back to default compute SA: $RUNTIME_SA" >&2
else
  echo "[C] resolved runtime SA: $RUNTIME_SA"
fi

# ---------------------------------------------------------------------------
# Step D: IAM binding on the cryptoKey resource (NOT keyring, NOT project)
# ---------------------------------------------------------------------------
echo "[D] binding $ROLE to $RUNTIME_SA on cryptoKey '$KEY'..."
gcloud kms keys add-iam-policy-binding "$KEY" \
  --keyring="$KEYRING" \
  --location="$LOCATION" \
  --member="serviceAccount:$RUNTIME_SA" \
  --role="$ROLE" \
  --condition=None \
  --project="$PROJECT" >/dev/null

# ---------------------------------------------------------------------------
# Step E: Print verification commands
# ---------------------------------------------------------------------------
cat <<EOF

[E] VERIFY — copy/paste:

  gcloud kms keys describe $KEY \\
    --keyring=$KEYRING --location=$LOCATION --project=$PROJECT
  # Expect: purpose: ENCRYPT_DECRYPT

  gcloud kms keys get-iam-policy $KEY \\
    --keyring=$KEYRING --location=$LOCATION --project=$PROJECT --format=json
  # Expect: exactly one serviceAccount member with role $ROLE
EOF

# ---------------------------------------------------------------------------
# Step F: Fallback-revoke notice (Major-2 fix)
# ---------------------------------------------------------------------------
if [[ "$USED_FALLBACK_SA" -eq 1 ]]; then
  cat >&2 <<EOF

==============================================================================
[F] WARNING: Fallback compute-default SA was bound because consent-grant
    is not yet deployed.

    Two service accounts must NOT hold $ROLE on the key simultaneously
    (T-02-10-05). After deploying consent functions, follow the
    "Fallback Revoke Procedure" in
        docs/operations/infrastructure-provisioning.md
    Specifically:
      1. Re-run this script (binds the real runtime SA).
      2. Smoke-test the real SA can encrypt:
           gcloud kms encrypt --location=$LOCATION --keyring=$KEYRING \\
             --key=$KEY --plaintext-file=<(echo test) \\
             --ciphertext-file=/dev/null \\
             --impersonate-service-account=<REAL_SA>
      3. Revoke the fallback binding:
           gcloud kms keys remove-iam-policy-binding $KEY \\
             --keyring=$KEYRING --location=$LOCATION --project=$PROJECT \\
             --member="serviceAccount:$RUNTIME_SA" \\
             --role=$ROLE --condition=None
      4. Re-verify: get-iam-policy must show exactly ONE serviceAccount
         member for $ROLE — and it must be the real runtime SA.
==============================================================================
EOF
fi

echo ""
echo "Done."
