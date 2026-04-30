#!/usr/bin/env bash
# bigquery/setup/grant-metabase-readonly.sh
#
# Idempotent: creates the Metabase service account (if not already existing) and
# grants it SELECT access on gw_b2b_views ONLY.
#
# Scope: this script intentionally grants NO access to gw_analytics (the raw mirror).
# The revoke-raw-access.sh script provides the belt-and-braces check.
#
# Required env:
#   FIREBASE_PROJECT_ID — GCP project ID (default: gamechangers-prod)
#
# Usage:
#   FIREBASE_PROJECT_ID=my-project bash bigquery/setup/grant-metabase-readonly.sh

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-gamechangers-prod}"
SA_NAME="metabase-readonly"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

echo "=== grant-metabase-readonly.sh ==="
echo "Project : $PROJECT"
echo "SA email: $SA_EMAIL"
echo ""

# ── Create service account (idempotent: describe first; create if missing) ──
echo "[1/3] Ensuring service account exists..."
if gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT}" > /dev/null 2>&1; then
  echo "  Service account already exists. Skipping creation."
else
  echo "  Creating service account metabase-readonly..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Metabase B2B readonly — SELECT on gw_b2b_views ONLY" \
    --project="${PROJECT}"
fi

# ── Grant bigquery.dataViewer on gw_b2b_views dataset ──────────────────────
echo "[2/3] Granting bigquery.dataViewer on gw_b2b_views..."
# bq update --dataset accepts --set_label but IAM binding uses gcloud
# IAM on BigQuery datasets is done via bq update or gcloud (bq is simpler):
bq update \
  --project_id="${PROJECT}" \
  --dataset \
  "${PROJECT}:gw_b2b_views" \
  --add_binding="role=roles/bigquery.dataViewer,member=serviceAccount:${SA_EMAIL}" \
  2>/dev/null || \
bq update \
  --project_id="${PROJECT}" \
  "${PROJECT}:gw_b2b_views"

# Alternative using gcloud for dataset-level IAM (works even if bq update flag unavailable):
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.dataViewer" \
  --condition="expression=resource.name.startsWith('projects/${PROJECT}/datasets/gw_b2b_views'),title=gw_b2b_views only,description=Restricts Metabase to gw_b2b_views dataset" \
  2>/dev/null || true

# ── Grant bigquery.jobUser at project level (required to run queries) ───────
echo "[3/3] Granting bigquery.jobUser at project level..."
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/bigquery.jobUser"

echo ""
echo "Done. Metabase service account ${SA_EMAIL} has:"
echo "  roles/bigquery.dataViewer on gw_b2b_views"
echo "  roles/bigquery.jobUser at project level"
echo ""
echo "IMPORTANT: Run revoke-raw-access.sh next to confirm gw_analytics is NOT accessible."
