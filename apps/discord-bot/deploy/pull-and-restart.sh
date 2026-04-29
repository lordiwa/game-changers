#!/bin/bash
# Plan 02-03 Task 2 — Pull latest code and restart the bot service.
# Runs on the VM — invoked by bot-deploy.yml CI via SSH.
set -euo pipefail

BOT_HOME="/home/bot/gamechangers"

echo "[pull-and-restart] Pulling latest code..."
cd "$BOT_HOME"
sudo -u bot git fetch
sudo -u bot git reset --hard origin/main

echo "[pull-and-restart] Installing dependencies..."
sudo -u bot bash -c '
  export HOME=/home/bot
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  cd '"$BOT_HOME"'
  pnpm install --frozen-lockfile --filter @gamechangers/discord-bot...
'

echo "[pull-and-restart] Building bot..."
sudo -u bot bash -c '
  export HOME=/home/bot
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh"
  pnpm --filter @gamechangers/discord-bot build
'

echo "[pull-and-restart] Restarting bot service..."
sudo systemctl restart gamechangers-bot
sleep 3
sudo systemctl status gamechangers-bot --no-pager

echo "[pull-and-restart] Done."
