#!/bin/bash
# Plan 02-03 Task 2 — Idempotent Compute Engine e2-micro VM provisioner.
#
# Provisions the GameChangers Discord bot VM in southamerica-east1-a:
#   - e2-micro instance named "gamechangers-bot"
#   - Static external IP "gamechangers-bot-ip" (used as BOT_STATIC_IPS in withBotAuth)
#   - Service account gw-bot-viewer@<project>.iam.gserviceaccount.com with roles/firebase.viewer ONLY
#   - Node 22 LTS via nvm
#   - pnpm + repo clone + build
#   - systemd unit install + enable
#   - Secrets provisioned from GCP Secret Manager into /etc/gamechangers/bot.env (mode 0400)
#
# Prerequisites:
#   - gcloud authenticated: gcloud auth login && gcloud config set project $GCP_PROJECT_ID
#   - GCP project + APIs enabled: Compute Engine, IAM, Secret Manager
#   - Secrets pre-created in Secret Manager:
#       DISCORD_BOT_TOKEN, BOT_TO_FUNCTION_HMAC, LINK_TOKEN_SECRET,
#       SENTRY_DSN, CLIENT_ID, GUILD_ID, WEEKLY_DIGEST_CHANNEL_ID, PWA_BASE_URL
#   - Deploy key (read-only) added to GitHub repo
#
# Usage:
#   export GCP_PROJECT_ID=gamechangers-prod
#   export REPO_URL=git@github.com:your-org/game-changers.git
#   bash apps/discord-bot/deploy/setup-vm.sh

set -euo pipefail

GCP_PROJECT_ID="${GCP_PROJECT_ID:?GCP_PROJECT_ID must be set}"
REPO_URL="${REPO_URL:-git@github.com:your-org/game-changers.git}"

ZONE="southamerica-east1-a"
REGION="southamerica-east1"
INSTANCE_NAME="gamechangers-bot"
IP_NAME="gamechangers-bot-ip"
SA_NAME="gw-bot-viewer"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
MACHINE_TYPE="e2-micro"

echo "[setup-vm] Project: $GCP_PROJECT_ID | Zone: $ZONE"

# ─── 1. Reserve static external IP ─────────────────────────────────────────────
echo "[setup-vm] Reserving static IP: $IP_NAME ..."
gcloud compute addresses describe "$IP_NAME" --region="$REGION" --project="$GCP_PROJECT_ID" \
  >/dev/null 2>&1 || \
gcloud compute addresses create "$IP_NAME" \
  --region="$REGION" \
  --project="$GCP_PROJECT_ID" \
  --description="Static IP for GameChangers Discord bot VM (used in BOT_STATIC_IPS allow-list)"

STATIC_IP=$(gcloud compute addresses describe "$IP_NAME" \
  --region="$REGION" --project="$GCP_PROJECT_ID" --format='value(address)')
echo "[setup-vm] Static IP: $STATIC_IP"

# ─── 2. Create viewer-only service account ───────────────────────────────────
echo "[setup-vm] Creating service account: $SA_EMAIL ..."
gcloud iam service-accounts describe "$SA_EMAIL" --project="$GCP_PROJECT_ID" \
  >/dev/null 2>&1 || \
gcloud iam service-accounts create "$SA_NAME" \
  --project="$GCP_PROJECT_ID" \
  --display-name="GameChangers Bot Viewer SA (read-only)" \
  --description="Discord bot viewer-only service account per ADR-001. roles/firebase.viewer ONLY."

# Grant roles/firebase.viewer — ONLY this role (TOS audit checks for drift).
echo "[setup-vm] Granting roles/firebase.viewer to $SA_EMAIL ..."
gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/firebase.viewer" \
  --condition=None \
  --quiet

# ─── 3. Create Compute Engine e2-micro instance ──────────────────────────────
echo "[setup-vm] Creating Compute Engine instance: $INSTANCE_NAME ..."
gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --project="$GCP_PROJECT_ID" \
  >/dev/null 2>&1 || \
gcloud compute instances create "$INSTANCE_NAME" \
  --project="$GCP_PROJECT_ID" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family="$IMAGE_FAMILY" \
  --image-project="$IMAGE_PROJECT" \
  --address="$STATIC_IP" \
  --tags="gamechangers-bot" \
  --service-account="$SA_EMAIL" \
  --scopes="https://www.googleapis.com/auth/cloud-platform" \
  --metadata="startup-script=#! /bin/bash
apt-get update -qq
apt-get install -y -qq git curl build-essential
# Create bot user
useradd -m -s /bin/bash bot || true
mkdir -p /var/log/gamechangers-bot
chown bot:bot /var/log/gamechangers-bot
mkdir -p /etc/gamechangers
"

echo "[setup-vm] Instance created. Waiting for SSH to be ready..."
sleep 30

# ─── 4. Provision via SSH ────────────────────────────────────────────────────
echo "[setup-vm] Running provisioning steps on VM..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --project="$GCP_PROJECT_ID" -- bash <<'REMOTE_SCRIPT'
set -euo pipefail

# Install nvm + Node 22 LTS for the bot user.
sudo -u bot bash -c '
  export HOME=/home/bot
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  nvm install 22.12.0
  nvm use 22.12.0
  nvm alias default 22.12.0
  npm install -g pnpm
  echo "Node $(node --version) and pnpm $(pnpm --version) installed"
'

# Clone repo (read-only deploy key must be pre-configured on the VM's bot user).
sudo -u bot bash -c '
  export HOME=/home/bot
  if [ ! -d "$HOME/gamechangers" ]; then
    git clone '"$REPO_URL"' "$HOME/gamechangers"
  fi
'

REMOTE_SCRIPT

# ─── 5. Provision secrets from Secret Manager into /etc/gamechangers/bot.env ─
echo "[setup-vm] Provisioning secrets from Secret Manager..."

SECRETS=(
  "DISCORD_BOT_TOKEN"
  "BOT_TO_FUNCTION_HMAC"
  "LINK_TOKEN_SECRET"
  "SENTRY_DSN"
  "CLIENT_ID"
  "GUILD_ID"
  "WEEKLY_DIGEST_CHANNEL_ID"
  "PWA_BASE_URL"
)

ENV_CONTENT=""
for SECRET in "${SECRETS[@]}"; do
  VALUE=$(gcloud secrets versions access latest \
    --secret="$SECRET" \
    --project="$GCP_PROJECT_ID" 2>/dev/null || echo "")
  if [ -n "$VALUE" ]; then
    ENV_CONTENT+="${SECRET}=${VALUE}\n"
  else
    echo "[setup-vm] WARNING: Secret $SECRET not found in Secret Manager — skipping."
  fi
done

# Write bot.env to the VM (mode 0400, owned by bot user).
echo -e "$ENV_CONTENT" | gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --project="$GCP_PROJECT_ID" -- \
  bash -c 'cat > /tmp/bot.env && sudo install -o bot -g bot -m 0400 /tmp/bot.env /etc/gamechangers/bot.env && rm /tmp/bot.env'

# Download service-account JSON key for the viewer SA.
echo "[setup-vm] Downloading viewer SA key..."
gcloud iam service-accounts keys create /tmp/sa-key.json \
  --iam-account="$SA_EMAIL" \
  --project="$GCP_PROJECT_ID"

gcloud compute scp /tmp/sa-key.json "$INSTANCE_NAME":/tmp/sa-key.json \
  --zone="$ZONE" --project="$GCP_PROJECT_ID"

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --project="$GCP_PROJECT_ID" -- \
  bash -c 'sudo install -o bot -g bot -m 0400 /tmp/sa-key.json /etc/gamechangers/service-account.json && rm /tmp/sa-key.json'

rm -f /tmp/sa-key.json

# ─── 6. Build + install systemd unit ────────────────────────────────────────
echo "[setup-vm] Building bot and installing systemd unit..."

gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --project="$GCP_PROJECT_ID" -- bash <<'REMOTE_BUILD'
set -euo pipefail
sudo -u bot bash -c '
  export HOME=/home/bot
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  cd "$HOME/gamechangers"
  pnpm install --frozen-lockfile --filter @gamechangers/discord-bot...
  pnpm --filter @gamechangers/discord-bot build
  echo "Build complete"
'

# Install systemd service.
sudo cp /home/bot/gamechangers/apps/discord-bot/deploy/systemd/gamechangers-bot.service \
  /etc/systemd/system/gamechangers-bot.service

sudo systemctl daemon-reload
sudo systemctl enable gamechangers-bot
sudo systemctl start gamechangers-bot
sudo systemctl status gamechangers-bot --no-pager

REMOTE_BUILD

echo ""
echo "========================================"
echo "[setup-vm] Setup complete!"
echo "  Instance:  $INSTANCE_NAME"
echo "  Zone:      $ZONE"
echo "  Static IP: $STATIC_IP"
echo "  SA:        $SA_EMAIL (roles/firebase.viewer ONLY)"
echo ""
echo "  Next steps:"
echo "  1. Add BOT_STATIC_IPS=${STATIC_IP} to Firebase Functions environment."
echo "  2. Run: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE -- 'systemctl status gamechangers-bot'"
echo "  3. Register slash commands: node dist/scripts/deploy-commands.js (via bot-deploy.yml CI)"
echo "========================================"
