#!/usr/bin/env bash
# scripts/setup-pubsub-topics.sh
#
# Idempotent provisioner for ALL Pub/Sub topics consumed by Phase 2 Functions.
# Plan 01 owns this — Plans 05/06/07/08 only publish/subscribe and DO NOT create topics.
# Run once after GCP project creation, BEFORE any Function deploy.
#
# Topology:
#   xp-events
#     publishers : events/checkIn, content/contentCompleted, challenges/challengeProgress,
#                  gamification/recomputeStats
#     subscribers: gamification/xpAward, gamification/streakAdvance
#   level-up-events
#     publisher  : gamification/xpAward
#     subscriber : gamification/discordRoleSync
#   consent-revoked
#     publisher  : consent/revoke
#     subscriber : gamification/cleanup (Phase 3 placeholder)
#   events-capacity-changed
#     publisher  : events/cancelRsvp
#     subscriber : events/waitlistPromote
#   crisis-alerts
#     publisher  : trustsafety/reportUser
#     subscriber : Phase 3 moderation dashboard placeholder
#
# Required env: GCP_PROJECT_ID (or `gcloud config get-value project`).
# Region: All topics are global by default; subscribers in southamerica-east1 pull regionally.

set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || echo '')}"
if [[ -z "$PROJECT" ]]; then
  echo "ERROR: GCP_PROJECT_ID not set and gcloud has no default project."
  exit 1
fi

TOPICS=(
  "xp-events"
  "level-up-events"
  "consent-revoked"
  "events-capacity-changed"
  "crisis-alerts"
)

echo "Provisioning Pub/Sub topics in project: $PROJECT"
for t in "${TOPICS[@]}"; do
  # Idempotent pattern: describe-or-create. set -e is honored because the OR short-circuits.
  gcloud pubsub topics describe "$t" --project="$PROJECT" >/dev/null 2>&1 \
    || gcloud pubsub topics create "$t" --project="$PROJECT"
done

echo ""
echo "Done. Verify with:"
echo "  gcloud pubsub topics list --project=$PROJECT --format='value(name)'"
