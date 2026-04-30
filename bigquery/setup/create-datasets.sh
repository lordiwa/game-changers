#!/usr/bin/env bash
# bigquery/setup/create-datasets.sh
#
# Idempotent: creates BigQuery datasets gw_analytics and gw_b2b_views.
#
# IMPORTANT REGION NOTE (T-02-09-10):
#   BigQuery Differential Privacy (WITH DIFFERENTIAL_PRIVACY OPTIONS) is GA in US
#   multi-region but may not yet be available in southamerica-east1 (São Paulo).
#   Per Plan 09 Task 2 behavior: if DP is unavailable in southamerica-east1 at deploy
#   time, create gw_b2b_views in US multi-region and add a DPIA cross-border transfer
#   note. The cross_border consent category (Plan 04) covers this transfer.
#   Verify DP availability before deploying:
#     bq --project_id=${PROJECT} query --use_legacy_sql=false \
#       "SELECT * FROM INFORMATION_SCHEMA.JOBS LIMIT 1" 2>&1 | grep -i "DP\|differential"
#
# Required env:
#   FIREBASE_PROJECT_ID — GCP project ID (default: gamechangers-prod)
#   BQ_REGION — BigQuery region for gw_b2b_views (default: US; change to southamerica-east1
#               ONLY if BigQuery DP is confirmed GA there)
#
# Usage:
#   FIREBASE_PROJECT_ID=my-project BQ_REGION=US bash bigquery/setup/create-datasets.sh

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-gamechangers-prod}"
RAW_REGION="southamerica-east1"
VIEWS_REGION="${BQ_REGION:-US}"

echo "=== create-datasets.sh ==="
echo "Project : $PROJECT"
echo "gw_analytics region: $RAW_REGION"
echo "gw_b2b_views region : $VIEWS_REGION"
echo ""

# ── Create gw_analytics (raw mirror, DPO-only access) ──────────────────────
# The Firestore→BigQuery extension (setup-bq-export.sh) writes to this dataset.
# It may already exist; || true makes this idempotent.
echo "[1/2] Creating dataset gw_analytics (raw mirror)..."
bq --project_id="${PROJECT}" mk \
  --dataset \
  --location="${RAW_REGION}" \
  --description="Raw Firestore→BigQuery mirror. DPO-only access. Do NOT grant Metabase service account any role here." \
  "${PROJECT}:gw_analytics" || true

# ── Create gw_b2b_views (anonymized views, Metabase-accessible) ────────────
# This dataset holds CREATE OR REPLACE VIEW DDL statements from bigquery/views/*.sql.
# BigQuery Differential Privacy requires this dataset to be in a region where DP is GA.
echo "[2/2] Creating dataset gw_b2b_views (anonymized views)..."
bq --project_id="${PROJECT}" mk \
  --dataset \
  --location="${VIEWS_REGION}" \
  --description="Anonymized B2B views. k>=50 + epsilon=1.0 DP. Metabase service account has SELECT only. Raw gw_analytics access REVOKED." \
  "${PROJECT}:gw_b2b_views" || true

# ── Apply views ─────────────────────────────────────────────────────────────
echo ""
echo "Applying SQL views from bigquery/views/..."
# Substitute PROJECT placeholder and run each view DDL
for sql_file in bigquery/views/*.sql; do
  view_name=$(basename "$sql_file" .sql)
  echo "  [view] $view_name"
  # Replace ${PROJECT} placeholder with actual project ID
  envsubst '${PROJECT}' < "$sql_file" | \
    bq --project_id="${PROJECT}" query \
      --use_legacy_sql=false \
      --location="${VIEWS_REGION}" \
      --nouse_cache
done

echo ""
echo "Done."
echo "Next steps:"
echo "  1. Run grant-metabase-readonly.sh to create + scope the Metabase service account."
echo "  2. Run revoke-raw-access.sh to confirm gw_analytics access is revoked."
echo "  3. Verify with: bq ls ${PROJECT}:gw_b2b_views"
