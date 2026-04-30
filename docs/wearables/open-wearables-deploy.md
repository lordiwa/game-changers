# Open Wearables 0.4.3 — Deployment Guide

GameChangers uses a self-hosted fork of Open Wearables 0.4.3 on a Hetzner CX22 VPS
in Falkenstein, Germany. This document covers the full deployment procedure.

**Webhook URL pattern:**
```
https://southamerica-east1-<project>.cloudfunctions.net/wearables-openWearablesWebhook
```

---

## Infrastructure

### Hetzner CX22 (Falkenstein)

| Spec | Value |
|------|-------|
| Plan | CX22 ($10/mo) |
| Location | Falkenstein, Germany |
| OS | Ubuntu 24.04 LTS |
| RAM | 4 GB |
| vCPU | 2 |
| Disk | 40 GB SSD |

### Docker Compose stack

The Open Wearables server runs as a Docker Compose service alongside:
- PostgreSQL 16 (internal state)
- Redis 7 (session cache)
- Nginx (TLS termination → Let's Encrypt)

---

## Deployment Steps

### 1. Provision the VPS

```bash
# Via Hetzner Cloud CLI
hcloud server create \
  --name gamechangers-ow \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key <your-key-name>
```

### 2. Clone and fork

```bash
# Fork: https://github.com/gamechangers/open-wearables (created at Phase 2 launch)
git clone https://github.com/gamechangers/open-wearables.git /opt/open-wearables
cd /opt/open-wearables
git checkout v0.4.3  # Pin to tested commit
```

### 3. Configure environment

Create `/opt/open-wearables/.env`:

```env
# PostgreSQL
POSTGRES_DB=open_wearables
POSTGRES_USER=ow
POSTGRES_PASSWORD=<generate-strong-password>

# Redis
REDIS_URL=redis://redis:6379

# HMAC signing key (shared with GCP Secret Manager OW_HMAC_SECRET)
OW_HMAC_SECRET=<generate-32-byte-hex>

# Provider OAuth credentials
GARMIN_CLIENT_ID=<from-garmin-developer-portal>
GARMIN_CLIENT_SECRET=<from-garmin-developer-portal>

FITBIT_CLIENT_ID=<from-fitbit-developer>
FITBIT_CLIENT_SECRET=<from-fitbit-developer>

POLAR_CLIENT_ID=<from-polar-accesslink>
POLAR_CLIENT_SECRET=<from-polar-accesslink>

WHOOP_CLIENT_ID=<from-whoop-developer>
WHOOP_CLIENT_SECRET=<from-whoop-developer>

OURA_CLIENT_ID=<from-oura-cloud>
OURA_CLIENT_SECRET=<from-oura-cloud>

# Outgoing webhook (our Cloud Function)
OUTGOING_WEBHOOK_URL=https://southamerica-east1-gamechangers-prod.cloudfunctions.net/wearables-openWearablesWebhook
OUTGOING_WEBHOOK_HMAC_SECRET=<same-as-OW_HMAC_SECRET>
```

### 4. Start the stack

```bash
cd /opt/open-wearables
docker compose up -d
docker compose logs -f  # Verify startup
```

### 5. Configure TLS (Let's Encrypt)

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d ow.gamechangers.gg
```

### 6. Store HMAC secret in GCP Secret Manager

```bash
echo -n "$OW_HMAC_SECRET" | \
  gcloud secrets create OW_HMAC_SECRET \
    --data-file=- \
    --project=gamechangers-prod

# Grant access to the wearables Function service account
gcloud secrets add-iam-policy-binding OW_HMAC_SECRET \
  --member="serviceAccount:gamechangers-prod@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=gamechangers-prod
```

### 7. Enable Firestore TTL policy for healthSamples

```bash
# Enable TTL on the 'metrics' collection-group using the 'expireAt' field.
# This enforces the 90-day LOPDP minimization requirement (T-02-09-12, WEAR-03).
gcloud firestore fields ttls update \
  --collection-group=metrics \
  --enable-ttl \
  --field=expireAt \
  --async \
  --project=gamechangers-prod
```

### 8. Create Cloud Tasks queue

```bash
gcloud tasks queues create daily-health-rollup \
  --location=southamerica-east1 \
  --max-dispatches-per-second=100 \
  --max-concurrent-dispatches=1000 \
  --project=gamechangers-prod
```

---

## Provider OAuth Registration

Register OAuth applications at each provider's developer portal:

| Provider | Portal | OAuth Scope |
|----------|--------|-------------|
| **Garmin** | https://developer.garmin.com/gc-developer-program/overview/ | User data + fitness activities |
| **Fitbit** | https://dev.fitbit.com/apps/new | activity, heartrate, sleep |
| **Polar** | https://www.polar.com/accesslink-api | AccessLink API |
| **Whoop** | https://developer.whoop.com/ | read:workout, read:sleep, read:recovery |
| **Oura** | https://cloud.ouraring.com/oauth/applications | daily, heartrate, sleep, workout |

**Redirect URI for all providers:**
```
https://ow.gamechangers.gg/oauth/callback/{provider}
```

---

## HMAC Secret Rotation

Rotate **quarterly** (aligned with bigquery-views-audit.yml CI cron):

1. Generate new secret: `openssl rand -hex 32`
2. Update in Open Wearables admin UI → Settings → Webhook HMAC Secret
3. Update in GCP Secret Manager:
   ```bash
   echo -n "$NEW_SECRET" | \
     gcloud secrets versions add OW_HMAC_SECRET \
       --data-file=- \
       --project=gamechangers-prod
   ```
4. Redeploy the Cloud Function to pick up the new secret version:
   ```bash
   firebase deploy --only functions:wearables-openWearablesWebhook \
     --project=gamechangers-prod
   ```

---

## Verification

After deployment, verify the full flow:

```bash
# 1. Check OW server is running
curl https://ow.gamechangers.gg/health

# 2. Trigger a test sample via OW admin UI
# → Check Firestore: /users/{testUid}/healthSamples/{yyyy-mm}/metrics/

# 3. Verify daily rollup after 60s
# → Check Firestore: /users/{testUid}/healthDaily/{date}

# 4. Verify TTL policy is active
gcloud firestore fields ttls describe metrics \
  --field=expireAt \
  --project=gamechangers-prod
```

---

## Monitoring

- **UptimeRobot**: Monitor `https://ow.gamechangers.gg/health` (HTTP 200 check, 5-min interval)
- **Sentry**: Open Wearables errors flow to the `functions` Sentry project via Functions
- **Cloud Tasks queue depth**: Monitor `daily-health-rollup` queue via GCP Console → Cloud Tasks
