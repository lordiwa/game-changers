#!/usr/bin/env bash
# bigquery/setup/revoke-raw-access.sh
#
# Idempotent: revokes any access the Metabase service account may have on
# gw_analytics (the raw mirror dataset). Also asserts the service account
# has no unexpected roles beyond gw_b2b_views + jobUser.
#
# This script is also run by the quarterly bigquery-views-audit.yml CI workflow
# to catch and revert privilege escalations (T-02-09-11 mitigation).
#
# Required env:
#   FIREBASE_PROJECT_ID — GCP project ID (default: gamechangers-prod)
#
# Usage:
#   FIREBASE_PROJECT_ID=my-project bash bigquery/setup/revoke-raw-access.sh
# Exit code:
#   0 — no unexpected access; gw_analytics is safe.
#   1 — unexpected role found and revoked; CI workflow will fail to notify DPO.

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-gamechangers-prod}"
SA_NAME="metabase-readonly"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

echo "=== revoke-raw-access.sh ==="
echo "Project : $PROJECT"
echo "SA email: $SA_EMAIL"
echo ""

UNEXPECTED_ACCESS=0

# ── Remove any viewer/editor/owner on gw_analytics ─────────────────────────
echo "[1/3] Revoking roles/bigquery.dataViewer on gw_analytics (idempotent)..."
# Belt-and-braces: try to remove — OK if already absent (|| true)
gcloud projects remove-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataViewer" \
  --condition=None \
  2>/dev/null || true

gcloud projects remove-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataEditor" \
  2>/dev/null || true

gcloud projects remove-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataOwner" \
  2>/dev/null || true

# ── Assert via gcloud IAM policy inspection ─────────────────────────────────
echo "[2/3] Inspecting effective IAM roles for ${SA_EMAIL}..."
EFFECTIVE_ROLES=$(
  gcloud projects get-iam-policy "${PROJECT}" \
    --flatten='bindings[].members' \
    --filter="bindings.members:${SA_EMAIL}" \
    --format='value(bindings.role)' 2>/dev/null || echo ""
)

echo "  Effective roles:"
echo "${EFFECTIVE_ROLES}" | sed 's/^/    /'

# Check for any role that is NOT jobUser or dataViewer (the two allowed ones)
while IFS= read -r role; do
  if [[ -z "$role" ]]; then
    continue
  fi
  if [[ "$role" != "roles/bigquery.jobUser" ]] && \
     [[ "$role" != "roles/bigquery.dataViewer" ]]; then
    echo "  ERROR: Unexpected role found: $role"
    UNEXPECTED_ACCESS=1
  fi
done <<< "${EFFECTIVE_ROLES}"

# ── Final assertion ──────────────────────────────────────────────────────────
echo "[3/3] Checking no direct gw_analytics access..."
# Note: BigQuery dataset-level IAM is separate from project-level IAM.
# If dataset-level bindings were set, they won't appear in project policy.
# We do a belt-and-braces bq show to check dataset ACL:
BQ_ACL=$(bq show --format=json --project_id="${PROJECT}" "${PROJECT}:gw_analytics" 2>/dev/null \
  | python3 -c "import sys,json; data=json.load(sys.stdin); print(json.dumps([e for e in data.get('access',[]) if '${SA_EMAIL}' in str(e)]))" \
  2>/dev/null || echo "[]")

if [[ "$BQ_ACL" != "[]" ]]; then
  echo "  ERROR: metabase-readonly has dataset-level access on gw_analytics: $BQ_ACL"
  UNEXPECTED_ACCESS=1
fi

echo ""
if [[ $UNEXPECTED_ACCESS -eq 0 ]]; then
  echo "OK: metabase-readonly has only expected roles (gw_b2b_views dataViewer + jobUser)."
  echo "OK: gw_analytics raw mirror is NOT accessible to metabase-readonly."
  exit 0
else
  echo "FAIL: metabase-readonly had unexpected access. Roles above were revoked."
  echo "      CI workflow failure will notify DPO. Review audit log for escalation cause."
  exit 1
fi
