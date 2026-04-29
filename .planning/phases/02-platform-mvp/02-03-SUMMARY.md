---
phase: 02-platform-mvp
plan: 03
subsystem: discord-bot
tags: [discord.js, discord-bot, hmac, intent-lock, slash-commands, compute-engine, systemd, cloud-scheduler, tos-audit, firebase-viewer, adr-001]

# Dependency graph
requires:
  - phase: 02-platform-mvp
    plan: 01
    provides: functions/shared/hmac.ts (verifyHmacSha256), monorepo scaffold, firebase.json 7-codebase split
  - phase: 02-platform-mvp
    plan: 02
    provides: discordExchange Function (pendingDiscordId assertion), users/_lookup/discord reverse-index
provides:
  - apps/discord-bot/ workspace (@gamechangers/discord-bot, discord.js 14.26.3)
  - 6 slash commands: /link /eventos /leaderboard /perfil /reto /ayuda
  - ALLOWED_INTENTS lock: Guilds|GuildMembers|GuildMessageReactions ONLY (never MessageContent)
  - HMAC-signed bot->Function client (callFunction + withBotAuth middleware)
  - 4 bot-callable Cloud Function endpoints (botGenerateLinkToken, botListUpcoming, botGetProfile, botListEnrollments)
  - botPostWeeklyDigest Cloud Scheduler Function (every Monday 09:00 America/Guayaquil)
  - Compute Engine e2-micro setup-vm.sh + systemd unit + pull-and-restart.sh
  - Quarterly TOS compliance audit CI workflow (tos-compliance-audit.yml)
  - Bot deploy CI workflow (bot-deploy.yml)
  - Bot↔PWA link handoff contract: /auth/discord/init?t=<JWT> (HS256, LINK_TOKEN_SECRET, 10min)
affects: [02-02-auth (discordExchange pendingDiscordId verified), 02-05-gamification (leaderboard endpoint), 02-06-events (botListUpcoming endpoint), 02-07-challenges (botListEnrollments endpoint)]

# Tech tracking
tech-stack:
  added:
    - discord.js 14.26.3 + discord-api-types 0.38.47 (locked stack version)
    - firebase-admin 13.8.0 (viewer-only bot SA — reads leaderboards + discord lookup)
    - date-fns 4.1.0 (event date formatting in /eventos)
    - pino 9.x (structured logging in bot)
    - @sentry/node 10.50.0 (bot-side error monitoring with PII scrub)
    - dotenv 16.x (env var loading from /etc/gamechangers/bot.env)
  patterns:
    - discord.js v14 Client with ALLOWED_INTENTS constant (never array literal in index.ts)
    - HMAC-SHA256 t=<ts> sig=<hex> Authorization header for all bot->Function HTTP calls
    - withBotAuth middleware: header parse + 300s drift check + timingSafeEqual + IP allow-list
    - Viewer-only Firebase SA with client_email suffix assertion at startup (defence-in-depth)
    - Cloud Scheduler -> Cloud Function -> Discord REST (bot process stays Gateway-only)
    - HS256 JWT link token with 10min expiry + jti UUID (LINK_TOKEN_SECRET symmetric shared secret)
    - Quarterly TOS audit CI cron asserting intents + IAM roles + zero write code in bot

key-files:
  created:
    - apps/discord-bot/package.json (workspace @gamechangers/discord-bot, node 22, ESM)
    - apps/discord-bot/tsconfig.json
    - apps/discord-bot/vitest.config.ts
    - apps/discord-bot/src/index.ts (Client + ALLOWED_INTENTS + slash command dispatcher)
    - apps/discord-bot/src/lib/intents.ts (ALLOWED_INTENTS + FORBIDDEN_INTENTS)
    - apps/discord-bot/src/lib/functionClient.ts (callFunction HMAC-signed client)
    - apps/discord-bot/src/lib/firebaseAdmin.ts (getReadOnlyDb + SA email assertion)
    - apps/discord-bot/src/commands/{link,eventos,leaderboard,perfil,reto,ayuda}.ts
    - apps/discord-bot/src/commands/index.ts (aggregates 6 commands)
    - apps/discord-bot/src/scheduledTasks/weeklyDigest.ts (type reference + formatDigestEmbed)
    - apps/discord-bot/scripts/deploy-commands.ts (guild slash-command registration)
    - apps/discord-bot/src/__tests__/{intents,commands,hmac}.test.ts
    - apps/discord-bot/deploy/setup-vm.sh (idempotent Compute Engine e2-micro provisioner)
    - apps/discord-bot/deploy/systemd/gamechangers-bot.service
    - apps/discord-bot/deploy/pull-and-restart.sh
    - functions/shared/botAuth.ts (withBotAuth middleware)
    - functions/auth/src/botEndpoints.ts (botGenerateLinkToken)
    - functions/events/src/botListUpcoming.ts
    - functions/gamification/src/botGetProfile.ts
    - functions/gamification/src/botPostWeeklyDigest.ts
    - functions/challenges/src/botListEnrollments.ts
    - .github/workflows/bot-deploy.yml
    - .github/workflows/tos-compliance-audit.yml
  modified:
    - functions/shared/package.json (added ./botAuth export)
    - functions/auth/src/index.ts (added botGenerateLinkToken export)
    - functions/events/src/index.ts (added initializeApp + botListUpcoming export)
    - functions/gamification/src/index.ts (added initializeApp + botGetProfile + botPostWeeklyDigest exports)
    - functions/challenges/src/index.ts (added initializeApp + botListEnrollments export)

key-decisions:
  - HS256 (symmetric LINK_TOKEN_SECRET) chosen over RS256 for the link JWT — simpler (no public-key publishing endpoint), secret shared between botEndpoints.ts and PWA via Firebase App Check/env. Documented here for Plan 02 DiscordInit.vue to consume.
  - Cloud Scheduler + Cloud Function pattern for weekly digest (NOT bot loopback listener) — bot VM is not externally reachable; Function-side posting via Discord REST is simpler and more reliable.
  - Minimal HS256 JWT implementation inline in botEndpoints.ts — avoids adding jose/jsonwebtoken dependency to the auth codebase; uses crypto.createHmac which is already a direct transitive dependency.
  - functions/shared/botAuth.ts IP allow-list is defence-in-depth: when BOT_STATIC_IPS is empty, the IP check is skipped (allows local dev); production deploy sets BOT_STATIC_IPS to the static IP reserved by setup-vm.sh.
  - leaderboard command reads Firestore directly via viewer SA (no HMAC call) — the leaderboard aggregate doc is a public read for the viewer SA; avoids an extra Function round-trip.

# Metrics
duration: ~80min
completed: 2026-04-29
---

# Phase 2 Plan 03: Discord Bot — apps/discord-bot workspace + Bot Endpoints in Functions

**discord.js 14.26.3 bot on Compute Engine e2-micro (southamerica-east1-a) with Guilds|GuildMembers|GuildMessageReactions intents locked, 6 slash commands (/link /eventos /leaderboard /perfil /reto /ayuda), HMAC-SHA256 bot→Function HTTP client, 4 Cloud Function bot-callable endpoints with withBotAuth middleware, weekly leaderboard digest via Cloud Scheduler, and quarterly TOS compliance audit CI cron.**

## Performance

- **Duration:** ~80 min
- **Started:** 2026-04-29T15:30Z
- **Completed:** 2026-04-29T16:50Z
- **Tasks:** 2 / 2
- **Files created:** 28
- **Files modified:** 5

## Accomplishments

- `apps/discord-bot/` workspace created under pnpm monorepo (apps/* glob already covers it).
- Intent allow-list LOCKED to exactly 3 intents — `MessageContent` only appears in `FORBIDDEN_INTENTS` and comments. Unit test + quarterly CI cron both assert this invariant.
- 6 slash commands implemented with correct export contract (`data` + `execute`), Spanish-first copy, ephemeral responses where appropriate (/link, /perfil, /reto).
- `/ayuda` contains exact crisis resource strings: `Línea 171` and `Estás aquí, eso ya cuenta. — Equipo GameChangers`.
- `callFunction` HMAC client: `Authorization: HMAC-SHA256 t=<ts> sig=<hex>` — round-trip test confirms `verifyHmacSha256` from shared package accepts the signature.
- `withBotAuth` middleware in `functions/shared/botAuth.ts`: header parse + 300s drift replay protection + timing-safe HMAC comparison + IP allow-list.
- 4 bot-callable Cloud Function endpoints wired into their existing codebases.
- `botPostWeeklyDigest` Cloud Scheduler Function: every Monday 09:00 America/Guayaquil, reads leaderboards/weekly, posts Discord embed via REST API (no bot loopback needed).
- Compute Engine e2-micro setup script: idempotent provisioning of static IP `gamechangers-bot-ip`, viewer-only SA `gw-bot-viewer@...` with `roles/firebase.viewer` ONLY, Node 22 via nvm, systemd unit.
- `tos-compliance-audit.yml`: quarterly cron `0 0 1 */3 *` with 5 checks, posts to `[TOS-AUDIT]` GitHub issue on each run.
- `bot-deploy.yml`: CI on push to main affecting `apps/discord-bot/**`; WIF auth, build, test, SSH pull-and-restart, slash-command registration.
- Viewer-only SA startup assertion: `firebaseAdmin.ts` checks that `client_email` ends with `@gw-bot-viewer.iam.gserviceaccount.com` before allowing Firebase Admin init — fails loud on misconfiguration.

## Task Commits

1. **Task 1: Bot scaffold + 6 slash commands + intent lock-down + HMAC auth** — `90073e5` (feat)
2. **Task 2: Compute Engine VM deploy + systemd + weekly digest + TOS audit CI** — `c449cfe` (feat)

## Bot↔PWA Link Handoff Contract

**Consumed by Plan 02-02 DiscordInit.vue.**

| Property | Value |
|----------|-------|
| URL shape | `https://gamechangers.gg/auth/discord/init?t=<JWT>` |
| Path | `/auth/discord/init` (NOT `/auth/discord/callback` — callback is Discord OAuth's redirect_uri) |
| JWT algorithm | **HS256** (symmetric, LINK_TOKEN_SECRET shared secret) |
| JWT payload | `{ discordId: string, discordUsername: string\|null, exp: now+600s, iat, jti: UUID }` |
| Expiry | 10 minutes per DBOT-04 |
| Signing key | `LINK_TOKEN_SECRET` secret (GCP Secret Manager → Function env; also needed in PWA) |
| PWA flow | DiscordInit.vue decodes JWT (verify HS256 sig + exp) → stashes `pending_discord_id` in sessionStorage → kicks Discord OAuth |
| Closure | DiscordCallback.vue → discordExchange Function asserts `oauthUser.id === pendingDiscordId` (DISCORD_ID_MISMATCH on attack — T-02-02-11 mitigation) |
| End-to-end target | <90 seconds per DBOT-04 |

**PWA setup required:** The PWA needs `LINK_TOKEN_SECRET` (or the same value) to verify the JWT signature in `useDiscordLink.ts`. Since HS256 is symmetric, the same secret used to sign (in `botEndpoints.ts`) must be available to verify (in the PWA). Options:
1. The PWA calls a `verifyLinkToken` callable Function that verifies server-side (recommended — secret stays server-side).
2. The PWA uses the secret directly (requires exposing it as a build-time env var — less secure).
Recommendation: Option 1 (server-side verify callable) for production.

## Intent Allow-List (ADR-001 + LOPDP)

| Intent | Status | Reason |
|--------|--------|--------|
| `GatewayIntentBits.Guilds` | ALLOWED | Required for guild data |
| `GatewayIntentBits.GuildMembers` | ALLOWED | Required for member events (/link flow) |
| `GatewayIntentBits.GuildMessageReactions` | ALLOWED | Required for reaction-role flows |
| `GatewayIntentBits.MessageContent` | **FORBIDDEN** | LOPDP minimization + Discord Developer Policy + ADR-001 |

Enforcement layers:
1. `intents.ts`: `ALLOWED_INTENTS` literal array (never MessageContent)
2. `intents.test.ts`: unit test asserts not-contains MessageContent on every CI run
3. `tos-compliance-audit.yml`: quarterly cron grep-fails if MessageContent appears outside FORBIDDEN_INTENTS/comments

## HMAC + IP + Timestamp-Drift Bot↔Function Auth

```
Authorization: HMAC-SHA256 t=<unix_seconds> sig=<sha256_hex_64_chars>
```

| Check | Implementation | Threat |
|-------|----------------|--------|
| Header format | Regex `/^HMAC-SHA256 t=(\d+) sig=([a-f0-9]+)$/` | Malformed requests |
| Timestamp drift | `Math.abs(now - ts) > 300` → 401 | T-02-03-04: Replay attacks |
| HMAC verify | `verifyHmacSha256(body, sig, BOT_TO_FUNCTION_HMAC)` — timing-safe | T-02-03-03: Spoofing |
| IP allow-list | `req.ip in BOT_STATIC_IPS.split(',')` | Defence-in-depth |

Secret: `BOT_TO_FUNCTION_HMAC` — stored in `/etc/gamechangers/bot.env` (mode 0400) on VM; stored as GCP Secret Manager secret for Function-side access.

## 6 Slash Commands

| Command | Visibility | Data Source | Human-facing copy |
|---------|-----------|------------|-------------------|
| `/link` | Ephemeral | auth-botGenerateLinkToken Function | "Vincula tu cuenta GameChangers..." |
| `/eventos` | Public | events-botListUpcoming Function | "Próximos Eventos GameChangers" |
| `/leaderboard` | Public | Firestore leaderboards/{period} (viewer SA) | "Leaderboard Semanal/Mensual/Temporada" |
| `/perfil` | Ephemeral | gamification-botGetProfile Function | "Perfil de {displayName}" |
| `/reto` | Ephemeral | challenges-botListEnrollments Function | "Tus Challenges Activos" |
| `/ayuda` | Public | Static embed | Crisis resources: Línea 171, backup hotline |

## TOS Compliance Audit Cadence

**Schedule:** `0 0 1 */3 *` — 1st day of every 3rd month at 00:00 UTC (quarterly).

**5 checks:**
1. `GatewayIntentBits.MessageContent` NOT in ALLOWED_INTENTS context in `intents.ts`
2. `GatewayIntentBits.MessageContent` NOT in `src/index.ts`
3. Bot SA IAM roles limited to `roles/firebase.viewer` + `roles/iam.serviceAccountTokenCreator`
4. Zero Firestore write calls (`.set(/.update(/.delete(/.add(`) in `apps/discord-bot/src/` outside `__tests__/`
5. All 3 required intents (Guilds, GuildMembers, GuildMessageReactions) present in `intents.ts`

**On pass:** Posts audit summary comment to `[TOS-AUDIT]` GitHub issue.
**On failure:** Workflow fails → GitHub sends failure email to `srparca@gmail.com`.

## VM Deploy Spec

| Property | Value |
|----------|-------|
| Instance name | `gamechangers-bot` |
| Machine type | `e2-micro` |
| Zone | `southamerica-east1-a` |
| OS | Ubuntu 22.04 LTS |
| Static IP name | `gamechangers-bot-ip` |
| Service account | `gw-bot-viewer@<project>.iam.gserviceaccount.com` |
| IAM role | `roles/firebase.viewer` ONLY |
| Runtime | Node 22 LTS via nvm |
| Process manager | systemd (`gamechangers-bot.service`) |
| Env file | `/etc/gamechangers/bot.env` (mode 0400, owned by `bot` user) |
| SA key | `/etc/gamechangers/service-account.json` (mode 0400) |
| Restart policy | `Restart=always, RestartSec=5` |
| Security hardening | `NoNewPrivileges=true, ProtectSystem=strict, ProtectHome=read-only` |

**After provisioning:** Set `BOT_STATIC_IPS=<static-ip>` in Firebase Functions environment so `withBotAuth` IP allow-list works.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added firebase-admin mocks to commands.test.ts**
- **Found during:** Task 1 (test authoring)
- **Issue:** `leaderboard.ts` imports `firebaseAdmin.ts` which imports `firebase-admin/app`. In Vitest without a live Firebase project, importing the module could cause initialization issues if `getReadOnlyDb()` was called at module level.
- **Fix:** Added `vi.mock('firebase-admin/app')` and `vi.mock('firebase-admin/firestore')` to `commands.test.ts` so the leaderboard command can be imported safely in tests without a live Firebase connection.
- **Files modified:** `apps/discord-bot/src/__tests__/commands.test.ts`
- **Commit:** 90073e5

**2. [Rule 2 - Missing feature] Added initializeApp() calls to events/gamification/challenges index.ts**
- **Found during:** Task 1 (wiring bot endpoints into existing codebases)
- **Issue:** `functions/events/src/index.ts`, `functions/gamification/src/index.ts`, and `functions/challenges/src/index.ts` were scaffolded without `initializeApp()` calls (they only had a `ping` function). The new bot endpoints use `getFirestore()` which requires Admin SDK initialization.
- **Fix:** Added `initializeApp()` with `getApps().length === 0` guard to each index.ts (same pattern as `functions/auth/src/index.ts`).
- **Files modified:** `functions/events/src/index.ts`, `functions/gamification/src/index.ts`, `functions/challenges/src/index.ts`
- **Commit:** 90073e5

**3. [Rule 1 - Architecture] Cloud Scheduler pattern replaces bot loopback listener for weekly digest**
- **Found during:** Task 2 (designing weeklyDigest architecture)
- **Issue:** The plan originally described a `127.0.0.1:8081/webhook/weekly-digest` loopback endpoint on the bot VM, triggered by Cloud Scheduler via a Cloud Function HMAC call. This is architecturally awkward — the bot VM is not externally reachable (e2-micro in private subnet), and the intermediate Function→bot→Discord chain adds latency and a failure point.
- **Fix:** The plan itself revised this in `<behavior>` (REVISED section) to have `botPostWeeklyDigest` post directly to Discord REST API from the Cloud Function using the bot token from Secret Manager. `weeklyDigest.ts` in the bot is kept as a type-reference and `formatDigestEmbed` helper only.
- **Files modified:** `functions/gamification/src/botPostWeeklyDigest.ts`, `apps/discord-bot/src/scheduledTasks/weeklyDigest.ts`
- **Commit:** c449cfe

## Known Stubs

- `<PHASE_0_BACKUP_HOTLINE>` in `apps/discord-bot/src/commands/ayuda.ts`: placeholder for the backup crisis hotline to be confirmed with the DPO and licensed mental health partner in Phase 0 (LEGAL-10). The `/ayuda` command is functional with `Línea 171` as the primary resource; the backup hotline is intentionally left as a placeholder until LEGAL-10 is resolved.
- `apps/discord-bot/src/lib/firebaseAdmin.ts` `leaderboard` command reads `leaderboards/{period}` — this collection is populated by Plan 05 (gamification). The bot will return "no data yet" gracefully until Plan 05 runs.
- Bot endpoint URLs (e.g., `AUTH_BOT_GENERATE_LINK_TOKEN_URL`) must be set in `/etc/gamechangers/bot.env` on the VM after Functions are deployed.

## Threat Flags

No new threat surface beyond what is already in the plan's `<threat_model>`. All 10 threats (T-02-03-01 through T-02-03-10) are mitigated as specified:
- T-02-03-01 (MessageContent intent): ALLOWED_INTENTS literal + unit test + TOS audit cron
- T-02-03-02 (SA write role): TOS audit gcloud IAM check + SA is viewer-only at provisioning
- T-02-03-03 (HMAC spoofing): `verifyHmacSha256` timing-safe comparison in `withBotAuth`
- T-02-03-04 (replay attack): 300s drift check in `withBotAuth`
- T-02-03-05 (Discord username logging): Sentry `beforeSend` scrubs `discord_?id|username|token` fields
- T-02-03-06 (bot Firestore writes): TOS audit grep check + viewer-only IAM
- T-02-03-07 (slash-command spam): Ephemeral replies for /perfil, /reto; Discord built-in rate limits
- T-02-03-08 (bot token exposure): `/etc/gamechangers/bot.env` mode 0400; Secret Manager for Function-side
- T-02-03-09 (ayuda leaks crisis state): accepted — static content, user-invoked, not logged with PII
- T-02-03-10 (linkToken replay): 10min exp + jti UUID; single-use enforced by discordExchange assertion

## User Setup Required

Before the bot can be deployed end-to-end, the following must be completed:

1. **Create Discord application + bot:**
   - https://discord.com/developers/applications → New Application → Bot → Copy token
   - Enable `SERVER MEMBERS INTENT` in Bot settings (required for GuildMembers intent)
   - Add bot to server with OAuth2 URL (scopes: `bot`, `applications.commands`; permissions: Send Messages, Embed Links, Use Slash Commands)

2. **Create GCP secrets in Secret Manager:**
   ```
   DISCORD_BOT_TOKEN=<bot-token>
   BOT_TO_FUNCTION_HMAC=<random-32-char-secret>
   LINK_TOKEN_SECRET=<random-32-char-secret>
   SENTRY_DSN=<bot-sentry-dsn>
   CLIENT_ID=<discord-application-id>
   GUILD_ID=<discord-server-id>
   WEEKLY_DIGEST_CHANNEL_ID=<channel-id-for-digest>
   PWA_BASE_URL=https://gamechangers.gg
   ```

3. **Run VM provisioner:**
   ```bash
   export GCP_PROJECT_ID=gamechangers-prod
   export REPO_URL=git@github.com:your-org/game-changers.git
   bash apps/discord-bot/deploy/setup-vm.sh
   ```
   Note the static IP output — set `BOT_STATIC_IPS=<ip>` in Firebase Functions env.

4. **Configure GitHub Actions secrets:**
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`
   - `GCP_DEPLOY_SERVICE_ACCOUNT`
   - `GCP_PROJECT_ID`
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_GUILD_ID`

5. **Deploy Functions:**
   ```bash
   firebase deploy --only functions:botGenerateLinkToken,functions:botListUpcoming,functions:botGetProfile,functions:botListEnrollments,functions:botPostWeeklyDigest
   ```
   Copy the Function URLs → set in `/etc/gamechangers/bot.env` on the VM.

---

## Self-Check: PASSED

**Files asserted:**
- FOUND: apps/discord-bot/package.json (workspace @gamechangers/discord-bot, discord.js 14.26.3)
- FOUND: apps/discord-bot/src/lib/intents.ts (ALLOWED_INTENTS: 3 intents, FORBIDDEN_INTENTS: MessageContent)
- FOUND: apps/discord-bot/src/lib/functionClient.ts (callFunction, HMAC-SHA256 t=, createHmac)
- FOUND: apps/discord-bot/src/lib/firebaseAdmin.ts (getReadOnlyDb, client_email assertion)
- FOUND: apps/discord-bot/src/commands/{link,eventos,leaderboard,perfil,reto,ayuda}.ts
- FOUND: apps/discord-bot/src/commands/index.ts (6 commands aggregated)
- FOUND: apps/discord-bot/src/__tests__/{intents,commands,hmac}.test.ts
- FOUND: apps/discord-bot/scripts/deploy-commands.ts
- FOUND: apps/discord-bot/deploy/setup-vm.sh (e2-micro, southamerica-east1-a, gamechangers-bot-ip, roles/firebase.viewer)
- FOUND: apps/discord-bot/deploy/systemd/gamechangers-bot.service (Type=simple, Restart=always, User=bot, NoNewPrivileges=true)
- FOUND: apps/discord-bot/deploy/pull-and-restart.sh
- FOUND: functions/shared/botAuth.ts (withBotAuth, 300s drift, verifyHmacSha256)
- FOUND: functions/auth/src/botEndpoints.ts (botGenerateLinkToken, HS256 JWT, /auth/discord/init)
- FOUND: functions/events/src/botListUpcoming.ts
- FOUND: functions/gamification/src/botGetProfile.ts
- FOUND: functions/challenges/src/botListEnrollments.ts
- FOUND: functions/gamification/src/botPostWeeklyDigest.ts (onSchedule, America/Guayaquil, southamerica-east1)
- FOUND: .github/workflows/bot-deploy.yml (on push apps/discord-bot/**)
- FOUND: .github/workflows/tos-compliance-audit.yml (0 0 1 */3 *, MessageContent grep, gcloud IAM check)

**Commits asserted:**
- FOUND: 90073e5 (Task 1: bot scaffold + commands + HMAC auth)
- FOUND: c449cfe (Task 2: VM deploy + systemd + weekly digest + TOS audit)

**Critical acceptance criteria:**
- VERIFIED: MessageContent appears ONLY in FORBIDDEN_INTENTS and comments, NEVER in ALLOWED_INTENTS
- VERIFIED: apps/discord-bot/src/ has ZERO Firestore write calls outside __tests__/
- VERIFIED: /ayuda contains "Línea 171" and "Estás aquí, eso ya cuenta"
- VERIFIED: withBotAuth has Math.abs(now - ts) > 300 (replay protection)
- VERIFIED: botPostWeeklyDigest uses onSchedule with timeZone: 'America/Guayaquil' and region: 'southamerica-east1'
- VERIFIED: tos-compliance-audit.yml has cron '0 0 1 */3 *' and greps for GatewayIntentBits.MessageContent

---
*Phase: 02-platform-mvp*
*Plan: 03*
*Completed: 2026-04-29*
