#!/usr/bin/env bash
# scripts/setup-bq-export.sh
#
# Installs the Firestore→BigQuery export Firebase Extension once per
# consent-tagged collection. Eight collections total — the raw wearable
# sample subcollection is EXPLICITLY EXCLUDED per Pitfall #6 + WEAR-09 +
# ADR-009 (see docs/architecture/ADR-009-bigquery-export-scope.md for the
# precise excluded path and rationale).
#
# Eight exported collections (TABLE_IDs):
#   profiles, consents, healthDaily, events, attendance, challenges,
#   auditLog, consentLedger
#
# Required env: FIREBASE_PROJECT_ID (default: gamechangers-prod)
# Pre-req: BigQuery API enabled, dataset `gw_analytics` exists in southamerica-east1.

set -euo pipefail

PROJECT="${FIREBASE_PROJECT_ID:-gamechangers-prod}"
DATASET="gw_analytics"
LOCATION="southamerica-east1"

echo "Installing firestore-bigquery-export for project: $PROJECT, dataset: $DATASET"

install_one() {
  local name="$1"
  local collection_path="$2"
  local table_id="$3"
  echo "  [install] $name -> $table_id (path=$collection_path)"
  firebase ext:install firebase/firestore-bigquery-export \
    --project="$PROJECT" \
    --params="LOCATION=$LOCATION,COLLECTION_PATH=$collection_path,DATASET_ID=$DATASET,TABLE_ID=$table_id,WILDCARD_IDS=true,EXCLUDE_OLD_DATA=false,BACKUP_COLLECTION=," \
    --instance-id="bq-export-$table_id" \
    --force
}

# 8 consent-tagged collections — order documented in ADR-009.
install_one "user profiles"       "users/{uid}/profile"             "profiles"
install_one "consent docs"        "users/{uid}/consents"            "consents"
install_one "daily aggregates"    "users/{uid}/healthDaily"         "healthDaily"
install_one "events"              "events"                           "events"
install_one "attendance (CG)"     "events/{eventId}/attendance"     "attendance"
install_one "challenges"          "challenges"                       "challenges"
install_one "audit log"           "auditLog"                         "auditLog"
install_one "consent ledger"      "consentLedger"                    "consentLedger"

# The raw wearable-sample subcollection is INTENTIONALLY NOT INSTALLED here.
# Adding it would violate ADR-009. If you are tempted to add it, read that ADR first.

echo ""
echo "Done. Verify in BigQuery:"
echo "  bq ls $PROJECT:$DATASET"
echo "Expected: exactly 8 *_changelog tables matching the install_one calls above."
