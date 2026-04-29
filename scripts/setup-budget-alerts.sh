#!/usr/bin/env bash
# scripts/setup-budget-alerts.sh
#
# Provisions a single $200 monthly budget on the GameChangers GCP billing account
# with email alerts at 25% ($50), 50% ($100), and 100% ($200) thresholds, sent to
# srparca@gmail.com. Idempotent: skips if a budget with display-name
# "GameChangers MVP" already exists.
#
# Required env:
#   BILLING_ACCOUNT  - the billing account ID (without `billingAccounts/` prefix),
#                      e.g. ABCDEF-123456-789012
#   GCP_PROJECT_ID   - target project, e.g. gamechangers-prod
#   ALERT_EMAIL      - default: srparca@gmail.com
#
# This requires the Cloud Billing Budget API enabled and the gcloud user to have
# `roles/billing.admin` on the billing account.

set -euo pipefail

BILLING_ACCOUNT="${BILLING_ACCOUNT:?Set BILLING_ACCOUNT (e.g. ABCDEF-123456-789012)}"
PROJECT="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
ALERT_EMAIL="${ALERT_EMAIL:-srparca@gmail.com}"
DISPLAY_NAME="GameChangers MVP"

if gcloud billing budgets list \
    --billing-account="$BILLING_ACCOUNT" \
    --filter="displayName=\"$DISPLAY_NAME\"" \
    --format="value(name)" 2>/dev/null | grep -q .; then
  echo "[skip] budget '$DISPLAY_NAME' already exists"
  exit 0
fi

# Email-channel notifications need a notification channel resource. Create or reuse one.
CHANNEL_NAME=$(gcloud alpha monitoring channels list \
    --project="$PROJECT" \
    --filter="type=email AND labels.email_address=\"$ALERT_EMAIL\"" \
    --format="value(name)" 2>/dev/null | head -n 1 || true)

if [[ -z "$CHANNEL_NAME" ]]; then
  CHANNEL_NAME=$(gcloud alpha monitoring channels create \
      --project="$PROJECT" \
      --display-name="GameChangers budget alerts" \
      --type=email \
      --channel-labels="email_address=$ALERT_EMAIL" \
      --format="value(name)")
fi

gcloud billing budgets create \
  --billing-account="$BILLING_ACCOUNT" \
  --display-name="$DISPLAY_NAME" \
  --budget-amount=200 \
  --threshold-rule=percent=25 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=100 \
  --filter-projects="projects/$PROJECT" \
  --notifications-rule-monitoring-notification-channels="$CHANNEL_NAME"

echo "[ok] budget '$DISPLAY_NAME' created at thresholds 25/50/100%"
