<!-- GSD:project-start source:PROJECT.md -->
## Project

**Gamer Wellness**

The first community in LATAM where gaming is the meeting point to level up in physical, mental, and social health. Three-layer product: Media (content), Social Hub (Discord + IRL events), Audience Activator (B2B data). Launches in Ecuador (Quito/Guayaquil/Cuenca), scales LATAM (372M gamers). Tagline: "Gamers que se mueven, se cuidan y se encuentran."

**Core Value:** Gamers in Ecuador find a real community that combines what they love (games) with what they need (movement, mental health, IRL connection) — without feeling surveilled, monetized, or moralized at. **If the community does not form, nothing else matters.**

### Constraints

- **Tech stack (locked)**: Vue 3 (Composition API + Vite) + Firebase (Functions, Firestore, Auth, Storage, Hosting) — Decision documented in `StartData/output/project-definition.md` §5; do NOT propose React/NestJS/Supabase even though older expert docs reference them
- **Compliance (LOPDP)**: Health data is "sensitive" under Ecuador's LOPDP — DPO + DPIA mandatory before any health data collection; SPDP fined LigaPro $259K and FEF $195K in Jan 2026; penalties 0.1-1% of turnover + activity suspension
- **Discord TOS**: Discord Developer Policy prohibits disclosing API Data to data brokers/advertising/monetization services — Discord bot must be read-only bridge, zero data collection there
- **Budget**: Bootstrapped — MVP infra target $25-100/mo (Firebase Spark→Blaze); avoid VC; total Phase 0 legal $1-3K + Phase 1 events $500-1K
- **Anonymization**: k-anonymity k>=50 enforced on all B2B exports; small Ecuador gamer population makes true anonymization technically near-impossible — treat all behavioral/health data as personal data
- **Language**: Spanish-first (LATAM "tú"), English toggle; gaming terms (XP, GG, buff, nerf, clutch, AFK) stay in English universally; consent texts must be legally equivalent across languages
- **Community before code**: Phase 1 uses zero-code tools only (Discord, Canva, Luma, WhatsApp) — kill criterion: if first 3 meetups don't reach 15+ attendees, fix product-market fit before building anything
- **Revenue without insurers**: Phases 1-3 must reach sustainability through sponsorships/events/memberships/coaching; insurer B2B is Phase 4 upside, never the foundation
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Node.js** | 22 LTS | Runtime for Cloud Functions and dev tooling | Firebase Functions v2 + Firebase CLI fully support Node 22; required by `discord.js@14.26+` (needs ≥22.12). Node 20 is the safe fallback if the platform team prefers a more battle-tested LTS. |
| **TypeScript** | 5.9.x (currently 5.9 / approaching 6.0.3 release line) | End-to-end typing across PWA, Functions, bot | Single language across all surfaces; strict mode catches consent-flow bugs at compile time; Firebase Admin SDK and `discord.js` ship first-class types. |
| **Vue** | 3.5.33 | PWA framework (Composition API + `<script setup>`) | Locked by PROJECT.md. 3.5 is the current 3.x line; Composition API is the standard for new code; Vapor mode (3.6+) not needed for MVP. |
| **Vite** | 7.4.0 | Build tool / dev server | Vite 7 is the current major; Vite 8 was released as v8.0.10 but Vue ecosystem (vite-plugin-pwa, @vitejs/plugin-vue 6.0.x) is most stable on Vite 7 right now. **Pin to ^7.4** unless you've validated v8 with all plugins. |
| **@vitejs/plugin-vue** | 6.0.6 | Vue SFC support in Vite | Required peer of Vue 3 + Vite. |
| **Vue Router** | 5.0.6 | Client-side routing | Vue Router 5.x is the current line for Vue 3 (the older "v4" branch ended; 5.x is the new major). |
| **Pinia** | 3.0.4 | State management | Official replacement for Vuex; Composition-API-native; first-class TypeScript inference; tiny (~2 KB). |
| **VueFire** | 3.2.3 | Vue 3 ⇄ Firebase reactive bindings | Official Vue.js Firebase library; binds Firestore documents/collections and Auth to Vue refs reactively; supports Firebase v9–v12 modular SDK. Maintained by the Vue core team (Eduardo San Martin Morote / posva). |
| **Firebase JS SDK (web)** | 12.12.1 | Frontend client (Auth, Firestore, Storage, Analytics) | Latest 12.x line (April 2026); modular tree-shakable imports keep PWA bundle small. |
| **firebase-admin** | 13.8.0 | Server-side Admin SDK in Cloud Functions | Required for custom-token mint (Discord OAuth bridge), security-rules bypass for trusted writes (consent audit log), admin Firestore queries. |
| **firebase-functions** | 7.2.5 | Cloud Functions runtime SDK (v2) | Use **v2 API exclusively** (`firebase-functions/v2/...` imports). v2 supports Node 22, smaller cold starts via Cloud Run, regional pinning, and concurrency >1. |
| **firebase-tools** (CLI) | 15.15.0 | Firebase CLI for deploy, emulator suite, extensions | Local emulator suite is mandatory for security-rules unit tests and consent-flow integration tests. |
| **Firestore** | (managed, Native mode) | Primary database with consent-gated Security Rules | Native real-time sync, offline persistence in PWA, security rules evaluate consent docs at read/write time (defense-in-depth alongside Functions). |
| **Firebase Auth** | (Identity Platform tier) | User auth + Discord identity bridge | Identity Platform tier (paid) unlocks **OIDC custom providers**; on Spark tier you must use **custom tokens** instead. See "Discord Auth Bridge" below. |
| **Firebase Hosting** | (managed) | PWA hosting + preview channels | Free CDN, automatic SSL, preview channels per PR (use with GitHub Actions for staging). |
| **Firebase Storage** | (managed) | Event photos, avatars, data-export ZIPs | Security rules mirror Firestore; signed URLs for time-limited B2B exports. |
| **discord.js** | 14.26.3 | Discord bot library | Locked by PROJECT.md. v14 is the current major; 14.26.3 supports current Discord API. **Bot uses ZERO message-content intent** — read-only bridge per ADR-001. |
| **discord-api-types** | 0.38.47 | Type definitions for Discord REST/Gateway payloads | Peer of discord.js; typed slash-command builders. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@vueuse/core** | 14.2.1 | Composition utilities (storage, mediaqueries, sensors) | Use for reactive `useLocalStorage` (consent draft state), `useGeolocation` (event check-in geofence), `useOnline` (offline-first PWA banners). |
| **vue-i18n** | 11.4.0 | i18n for Vue 3 | Required: ES (default `es-EC`) + EN. Versioned consent texts MUST be stored as keys with version suffix (e.g., `consent.wearableData.v3.purpose`) so old grants reference the exact text shown. |
| **vite-plugin-pwa** | 1.2.0 | Service worker + manifest generation | Use `generateSW` strategy for MVP (Workbox handles precache). Switch to `injectManifest` only if custom offline logic exceeds Workbox config. |
| **workbox-window** | 7.4.0 | Client-side SW registration helper | Comes with vite-plugin-pwa; use to surface "new version available" toast. |
| **zod** | 4.3.6 | Runtime schema validation | Validate every Cloud Function HTTP/callable input; validate Discord interaction payloads; share schemas between PWA and Functions via a `packages/shared` workspace. |
| **date-fns** | 4.1.0 | Date math + formatting | Smaller bundle than Moment/Luxon; tree-shakable; locale-aware (`es`, `en-US`). Use for streak calculations, event windows, consent expiry. |
| **qrcode** | 1.5.4 | QR generation for event check-in | Generate signed JWT-encoded QR per event ticket on the PWA; check-in Function verifies signature. |
| **jsqr** | 1.4.0 | In-browser QR decode | For organizer "scan attendees" flow (camera → jsqr → verify). |
| **stripe** | 22.1.0 | Server-side Stripe SDK in Functions | Phase 3+ premium memberships ($3-5/mo) and Phase 4 B2B billing. Use `firestore-stripe-payments` Firebase Extension to skip 80% of glue code. |
| **@stripe/stripe-js** | 9.3.1 | Client-side Stripe.js loader | Stripe Elements / Checkout in the PWA. |
| **posthog-js** | 1.372.x | Self-hosted PostHog client | Funnels (Discord→App, consent grant rate), feature flags, session replay (mask PII automatically). Self-host on a Hetzner / DigitalOcean droplet for LOPDP data sovereignty. |
| **@sentry/vue** | 10.50.0 | Error monitoring in PWA | Free tier: 5K errors/mo. Configure `beforeSend` to scrub health-data fields. |
| **@vueuse/firebase** | (matches @vueuse/core) | Optional: VueFire alternative for ad-hoc bindings | Use only if VueFire feels too opinionated. VueFire is recommended primary. |
### Wearables (Phase 2)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **@momentum/open-wearables** (self-hosted server) | 0.4.3+ | Multi-device wearable normalization (Apple Health, Health Connect, Garmin, Polar, Suunto, Whoop, Oura) | Self-host the FastAPI server (Docker Compose) on a small VPS in São Paulo (latency-acceptable for Ecuador). Cloud Function listens for outgoing webhooks; writes normalized samples into Firestore subcollection. **Note:** Open Wearables is Python/FastAPI; integration with Firebase is via webhook (HTTPS) not a Node SDK. |
| **Open Wearables React Native SDK** (TypeScript) | 0.4.x | Mobile bridge to HealthKit / Health Connect | **Used only if/when** a mobile-native shell is built (Phase 3+). For pure Vue 3 PWA, omit and rely on Open Wearables server-to-cloud OAuth flows (Garmin, Fitbit, Polar, Whoop, Oura). |
| **@capacitor/core** + **@capacitor/cli** | 8.3.1 | (Optional Phase 3) Wrap PWA as installable iOS/Android app for HealthKit access | Only needed if the iOS HealthKit / Android Health Connect on-device data sync is required and the PWA-installable model is insufficient. Use `@perfood/capacitor-healthkit@1.3.x` and an Android Health Connect plugin. **Defer to Phase 3.** |
### Discord Bot
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **discord.js** | 14.26.3 | Bot framework | Standalone Node 22 process (deploy on Cloud Run or a $5 Hetzner VPS — Cloud Functions cannot hold a Discord Gateway WebSocket). |
| **@discordjs/builders** | (bundled with discord.js v14.26) | Slash-command builders | Type-safe `/link`, `/events`, `/leaderboard`, `/profile`, `/challenge`. |
| **@discordjs/rest** | (bundled) | REST client for command registration | Used in CI to register guild commands on deploy. |
| **passport-discord** | 0.1.4 | (Optional) Express middleware for OAuth callback | Lightweight alternative to hand-rolled OAuth on a Cloud Function callback endpoint. **Not required** — a hand-rolled callback is ~30 lines and avoids a transitive dependency. |
### B2B Analytics (Phase 3)
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **Firestore → BigQuery Extension** | `firebase/firestore-bigquery-export` (latest) | Stream Firestore writes to BigQuery in near real-time | Official Firebase Extension. Stream **only consent-tagged collections** that have `b2b_*` consent (configure per collection). Build BigQuery views on top with k≥50 anonymization. Exposed at `extensions.dev/extensions/firebase/firestore-bigquery-export`. |
| **Metabase** | 0.51 / latest stable OSS | B2B partner dashboards | Self-hosted Docker container; connects to BigQuery via JDBC; embeddable signed iframes per partner. Per-partner row filters via SQL parameters tied to authorized consent categories. |
| **BigQuery (Standard SQL)** | (managed) | Aggregation + k-anonymity gate | All B2B queries are SQL views with `HAVING COUNT(DISTINCT user_id) >= 50` enforced; raw row access revoked from Metabase service account. |
### Development Tools
| Tool | Version | Notes |
|------|---------|-------|
| **Firebase Emulator Suite** | shipped with `firebase-tools@15.15` | Run Auth, Firestore, Functions, Storage, Hosting locally. **Mandatory** for security-rules tests. |
| **@firebase/rules-unit-testing** | 5.0.0 | Test Firestore Security Rules with Jest/Vitest | One test file per consent category × CRUD operation. CI gate: zero passing rule allows write without active consent. |
| **firebase-functions-test** | 3.4.1 | Unit-test Functions in isolation | Mock Firestore triggers. |
| **Vitest** | 4.1.5 | Unit + component tests | Fast Vite-native test runner; replaces Jest for the Vue side. |
| **@vue/test-utils** | 2.4.9 | Vue component testing | Pair with Vitest. |
| **Playwright** | 1.59.1 | E2E tests (consent flows, QR check-in, Discord-link round trip) | Run against emulator suite in CI. |
| **ESLint** | 10.2.1 | Linting | Use flat config; pair with `eslint-plugin-vue@10.9.0`, `@typescript-eslint/*`, `eslint-plugin-security`. |
| **eslint-plugin-vue** | 10.9.0 | Vue SFC linting | Required for `<script setup>` rules. |
| **Prettier** | 3.x | Formatting | `singleQuote: true`, `printWidth: 100`. |
| **Tailwind CSS** | 4.2.4 | Styling (utility-first) | v4 introduces Oxide engine, zero-config; CSS-first config via `@theme` directive. Use with `@tailwindcss/forms` and `@tailwindcss/typography` for content hub. |
| **reka-ui** | 2.6.2 | Headless accessible components for Vue 3 | Successor to Radix-Vue. Pair with shadcn-vue (1.9.x) for pre-built theme. Critical for accessible consent toggles, modal flows, focus trapping. |
| **@vueuse/integrations** | matches @vueuse/core | Optional integrations (focus-trap, IDB-keyval) | Use focus-trap for the consent modal; IDB-keyval for offline event queue. |
## Installation
### PWA workspace (`apps/pwa`)
# Core
# Dev
### Functions workspace (`functions/`)
### Discord bot workspace (`apps/discord-bot`)
### Repo-root tooling
## Architectural Patterns (Locked-Stack-Specific)
### 1. Discord OAuth ⇄ Firebase Auth bridge
- **Confidence: HIGH** — official Firebase pattern (`firebase.google.com/docs/auth/web/custom-auth`); reference impl `nawodyaishan/discord-firebase-auth` and `luizkc/firebase-discord-oauth2-example`.
- Configure Discord as an OIDC provider in Firebase Console using a wrapper that exposes a discovery endpoint (e.g., FusionAuth, Auth0 social connection, or a tiny self-hosted bridge). Discord itself does not expose `/.well-known/openid-configuration`, so this pattern adds a hop.
- **Confidence: MEDIUM** — works but adds infra; not worth it for MVP.
### 2. Firestore Security Rules for granular consent enforcement
- Each `get()` in rules costs **one document read** per evaluation — cache via `request.auth.token` custom claims for hot-path categories (`basic_profile`).
- All consent grants/revokes flow through a `consentMutation` callable Function that writes the consent doc + an immutable `auditLog/{uuid}` doc in a transaction.
- **Confidence: HIGH** — official pattern; tested via `@firebase/rules-unit-testing`.
### 3. Firestore schema for time-series wearable data
- **Monthly bucket subcollection** prevents the per-collection 10K-write/sec hot-spot and keeps document counts manageable.
- **Daily aggregation Function** (Pub/Sub scheduled or `onWrite` debounce) writes to `healthDaily` for fast PWA reads (one doc per day, not 10K samples per query).
- **Composite index**: `(recordedAt DESC, metric)` per `healthSamples` subcollection for trend queries.
- **BigQuery is the source of truth for analytics** — use the Firestore→BigQuery extension on `healthSamples` and `healthDaily`; build trend dashboards in Metabase off BigQuery, not Firestore.
- **Confidence: HIGH** for schema; **MEDIUM** for "Firestore is sufficient at scale" — at >10K daily-active wearable users, evaluate writing samples directly to BigQuery via a Function and keeping only `healthDaily` in Firestore. This is a well-known pattern (see Firebase blog "Time-series data in Firestore").
### 4. Vue 3 PWA pattern
- **`vite-plugin-pwa` with `generateSW` strategy** for MVP.
- **Offline-first event check-in**: queue QR scans in IDB (`@vueuse/integrations` `useIDBKeyval`), flush via Background Sync API when online.
- **Push notifications**: Firebase Cloud Messaging Web SDK (`firebase/messaging`); request permission *only after* user opts in to `event_participation` consent.
- **Confidence: HIGH** — vite-pwa-org docs at `vite-pwa-org.netlify.app/frameworks/vue`.
### 5. discord.js v14 bot architecture
- Single-process Node 22 service (NOT a Cloud Function — Functions cannot maintain a Gateway WebSocket).
- Deploy as **Cloud Run** (min instances = 1, CPU always allocated) or a $5/mo Hetzner VPS.
- **Gateway intents:** `Guilds`, `GuildMembers`, `GuildMessageReactions` (for `/link` confirmation reactions). **DO NOT enable `MessageContent`** — violates LOPDP minimization principle and Discord's TOS for non-essential bots.
- **Slash commands only** — no message-content scraping.
- All bot commands that need data call the PWA's Firebase Functions (read-only) using a service-account ID token; the bot has **its own Firebase service account with `roles/firebase.viewer`** (read leaderboards, event lists). It cannot write user data.
- Deploy commands via `@discordjs/rest` in CI (`scripts/deploy-commands.ts`).
### 6. BigQuery export for B2B Metabase dashboards
- Install Firebase Extension `firebase/firestore-bigquery-export` per collection that has B2B-relevant data.
- Configure each install to **only export consent-tagged collections** (`healthDaily`, `events`, `attendance`, `clubMembership`) — never raw `healthSamples`, never `consents` themselves, never `auditLog`.
- BigQuery dataset `gw_analytics` holds raw mirror; dataset `gw_b2b_views` holds k≥50-enforced views.
- Each B2B view: `WHERE user_id IN (SELECT user_id FROM consents WHERE category = 'b2b_brands' AND status = 'granted' AND expiresAt > CURRENT_TIMESTAMP())` and `HAVING COUNT(DISTINCT user_id) >= 50`.
- Metabase service account has SELECT on `gw_b2b_views` only — **revoke all access to `gw_analytics`** for the Metabase principal.
- Per-partner Metabase dashboards use signed embedding with locked filter parameters (partner can only see their authorized segments).
- **Confidence: HIGH** — official Firebase Extension; pattern documented at `firebase.google.com/docs/firestore/solutions/bigquery`.
### 7. Open Wearables integration
- **Open Wearables 0.4.3** (April 2026) is the recommended self-hosted wearables hub: Python/FastAPI server, Docker Compose deploy, supports Apple Health, Health Connect, Samsung Health, Garmin, Polar, Suunto, Whoop, Oura.
- **No Node.js SDK exists.** Integration with Firebase is **webhook-driven**:
- **MCP server feature (v0.3+)** is a nice-to-have for the founder's internal tooling but not exposed to users.
- **License:** MIT — fork-safe.
- **Risk mitigation:** maintain a fallback "manual entry" path in the PWA (already a Phase 2 deliverable). If Open Wearables is unavailable, the platform still functions on self-reports + phone step counter (Web Sensor APIs, gated behind permission).
- **Confidence: HIGH** for architecture; **MEDIUM** for long-term maintenance (project is at v0.4 — pre-1.0; pin to a tested version, plan a fork if maintenance lapses).
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vue 3 + Vite | Nuxt 3 (with SSR) | If SEO content hub becomes a primary growth lever beyond Phase 2 — Nuxt offers SSR/SSG without leaving the Vue ecosystem. PWA-only is sufficient for MVP. |
| Firestore | Firebase Realtime Database | Use RTDB only for ephemeral presence (online users in event chat). Firestore is the primary store. |
| Firebase Auth custom token (Discord) | Identity Platform OIDC | Switch to OIDC via FusionAuth bridge **only** if you outgrow custom tokens or need SSO with multiple OIDC IDPs. |
| `vite-plugin-pwa` `generateSW` | `injectManifest` | Switch to `injectManifest` only if Workbox config can't express your offline strategy (rare). |
| Open Wearables (self-hosted) | Terra ($0.20/user/mo) or ROOK ($0.15/user/mo) | If the team has zero ops capacity and <2K wearable users (cost is bearable). At Phase 4 scale, self-hosting saves $1.5-2K/mo. **LOPDP also favors self-hosting** (data residency). |
| Firestore→BigQuery Extension | Manual ETL via Cloud Scheduler + Function | Use manual ETL only if you need <1 min freshness with custom transforms. The extension's near-real-time sync is sufficient. |
| Cloud Run for Discord bot | Hetzner / DO VPS | Use VPS if cold-start cost on Cloud Run is unacceptable AND $5/mo VPS is acceptable for ops. Cloud Run is Firebase-native and easier in the GCP IAM model. |
| Pinia | Vuex 4 | Don't. Vuex is in maintenance mode; Pinia is the official replacement. |
| Tailwind CSS v4 | UnoCSS | Tailwind v4 (Oxide engine) is now competitive on perf with UnoCSS and has a much larger ecosystem of components (shadcn-vue, reka-ui). |
| reka-ui | Headless UI Vue | Headless UI Vue is fine but reka-ui (Radix-Vue successor) has more components and active 2026 development. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **React / React Native / Next.js** | Locked stack is Vue 3 + PWA. Older `expert-architect.md` proposals are superseded. | Vue 3 + Vite PWA; defer mobile-native to Phase 3+ via Capacitor if needed. |
| **NestJS / Fastify backend** | Locked stack is Firebase Cloud Functions. A separate API server adds infra overhead and breaks Firebase's serverless model. | Firebase Functions v2 (modular, regional, concurrency >1). |
| **Supabase / PostgreSQL / TimescaleDB** | Locked stack is Firestore. Supabase RLS does not exist in Firebase; consent enforcement uses Security Rules. | Firestore + Security Rules; BigQuery for time-series analytics if Firestore aggregates aren't enough. |
| **Redis / BullMQ / Upstash** | No Redis-backed queue is needed in a Functions-only architecture. | Pub/Sub triggers for async work; Cloud Tasks for delayed/retry jobs; Firestore as a poor-man's leaderboard (with `orderBy + limit`). |
| **gengine** (Go gamification engine) | Adds a second service; Firestore + Functions can implement XP/streaks natively in <300 LOC. | Custom Cloud Functions: `onCreate(attendance)` → award XP, evaluate badges, update profile aggregates. |
| **discord.js v13 or earlier** | Deprecated; Discord API v9 is end-of-life; v14 is required for current slash-command ergonomics. | discord.js@^14.26.3. |
| **Firebase Functions v1 API** | v1 has higher cold starts, no Cloud Run runtime, no concurrency. v2 is the default for new projects. | `firebase-functions/v2/{https,firestore,scheduler,pubsub,storage}` modular imports. |
| **`MessageContent` Discord intent** | LOPDP minimization violation + raises Discord verification bar. The bot doesn't need message text. | Slash commands + reaction roles only. |
| **Moment.js** | Deprecated; large bundle. | date-fns 4.x. |
| **Vuex** | Maintenance mode. | Pinia 3. |
| **CommonJS `require()` in Functions** | Firebase v2 SDK and `discord.js@14` are ESM-friendly; mixing breaks tree-shaking. | `"type": "module"` in package.json; ESM imports. |
| **Storing Discord OAuth refresh tokens unencrypted** | LOPDP breach risk; Discord TOS requires safeguarding. | Cloud KMS-encrypted at rest in Firestore, decrypt only in Functions on demand. |
| **Direct Firestore writes from the Discord bot** | Architectural firewall (ADR-001). | Bot reads via Firebase service account with viewer role only; all writes flow through PWA → Functions. |
## Stack Patterns by Variant
- Open Wearables on a $10/mo Hetzner CX22 VPS in Falkenstein.
- Firestore→BigQuery extension on `healthDaily` only (skip raw samples).
- Metabase on the same VPS in Docker Compose.
- Open Wearables on a $40/mo VPS or Cloud Run with min-instances=1.
- Firestore→BigQuery extension on `healthSamples` AND `healthDaily`.
- Metabase on Cloud Run with private VPC connector to BigQuery.
- Add Cloud KMS for refresh-token encryption (was optional at MVP, mandatory here).
- Re-evaluate: Firebase has no Ecuador region. Options: GCP `southamerica-east1` (São Paulo) is closest; CNT/Telconet partnerships may offer local hosting in 2027. **Document this explicitly in the DPIA.** No 2026 remediation available within Firebase.
- Wrap the PWA via **Capacitor 8.3.x** (not React Native, not Flutter — preserves the Vue codebase).
- Add `@perfood/capacitor-healthkit@^1.3.x` (iOS) and a Health Connect plugin (Android).
- Use Open Wearables React Native SDK as a reference for the data shape; reimplement against Capacitor plugins.
## Version Compatibility
| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `firebase@12.x` | `vuefire@^3.2`, `firebase-admin@^13`, `firebase-functions@^7` | All current as of 2026-04. |
| `vue@3.5.x` | `vue-router@^5`, `pinia@^3`, `@vitejs/plugin-vue@^6`, `vite@^7` | Pinia 3 requires Vue 3.3+; Vue Router 5 requires Vue 3.5+. |
| `vite@7.x` | `vite-plugin-pwa@^1.2`, `@vitejs/plugin-vue@^6.0` | vite-plugin-pwa 1.x supports Vite 5/6/7. Vite 8 is released (8.0.10) but ecosystem lags — pin to 7.4 for now. |
| `discord.js@14.26.3` | Node.js >=22.12.0, `discord-api-types@^0.38.47` | Node 22 LTS is the minimum. Won't run on Node 20. |
| `firebase-functions@7.x` | Node 20 or 22 runtime | Set `"engines": {"node": "22"}` in `functions/package.json`. |
| `tailwindcss@4.x` | `@tailwindcss/vite@^4`, Vite 5+ | v4 needs the Vite plugin (no PostCSS path); not compatible with v3-style configs. |
| `reka-ui@2.6.x` | Vue 3.4+ | Successor to radix-vue (renamed). |
| Open Wearables 0.4.3 (server) | PostgreSQL 15+, Redis, Python 3.11+ | Self-hosted; no Node integration — webhook-only from Firebase side. |
## Sources
- **Verified via `npm view` on 2026-04-27** — all version numbers in this doc.
- [Firebase JS SDK release notes](https://firebase.google.com/support/release-notes/js) — v12.12.1 verified for April 20, 2026.
- [Firebase Custom Auth docs](https://firebase.google.com/docs/auth/web/custom-auth) — Discord bridge pattern A. **HIGH confidence.**
- [Firebase OIDC docs](https://firebase.google.com/docs/auth/web/openid-connect) — Pattern B requires Identity Platform tier.
- [Firebase Firestore→BigQuery Extension](https://extensions.dev/extensions/firebase/firestore-bigquery-export) — official extension. **HIGH confidence.**
- [Firebase Firestore best practices](https://firebase.google.com/docs/firestore/best-practices) — schema sizing, index cost.
- [Vite PWA org docs](https://vite-pwa-org.netlify.app/frameworks/vue) — Vue 3 + Workbox patterns. **HIGH confidence.**
- [Open Wearables GitHub](https://github.com/the-momentum/open-wearables) — v0.4.3 verified, MIT license, FastAPI/Python server, no Node SDK. **HIGH confidence.**
- [Open Wearables 0.4.3 release notes](https://www.themomentum.ai/blog/open-wearables-0-4-3-release) — webhook architecture verified.
- [Discord OAuth2 docs](https://docs.discord.com/developers/topics/oauth2) — `identify` + `email` scopes; **no OIDC discovery endpoint** (verified). **HIGH confidence on negative claim.**
- [discord.js docs](https://discord.js.org/docs/packages/discord.js/main) — v14, Node 22.12 minimum. **HIGH confidence.**
- [VueFire docs + npm](https://vuefire.vuejs.org/) — peer-deps Firebase 9-12 verified via `npm view`. **HIGH confidence.**
- Reference impls — [`nawodyaishan/discord-firebase-auth`](https://github.com/nawodyaishan/discord-firebase-auth), [`luizkc/firebase-discord-oauth2-example`](https://github.com/luizkc/firebase-discord-oauth2-example) for Discord-Firebase bridge. **MEDIUM confidence** (community refs, but architecturally sound).
### Confidence summary
| Area | Confidence | Notes |
|------|------------|-------|
| Vue 3 / Vite / Pinia versions | HIGH | npm-verified 2026-04-27. |
| Firebase SDK versions | HIGH | npm + Firebase release notes verified. |
| discord.js v14.26.3 | HIGH | npm-verified; v14 is current major. |
| Discord OAuth → Firebase Auth (custom token pattern) | HIGH | Official Firebase pattern + working refs. |
| Discord OIDC discovery non-existence | HIGH | Verified against Discord docs (April 2026). |
| Firestore Security Rules consent enforcement | HIGH | Standard Firebase pattern; testable via emulator. |
| Firestore time-series schema (monthly buckets + daily aggregate) | HIGH | Firebase-recommended pattern; scales to ~10K DAU before BigQuery offload becomes mandatory. |
| Open Wearables architecture (webhook from FastAPI to Functions) | HIGH | Verified in Open Wearables docs. |
| Open Wearables long-term maintenance | MEDIUM | Pre-1.0 project; mitigation: fork on Phase 2 launch, monitor releases. |
| Firestore→BigQuery extension for B2B | HIGH | Official extension, well-documented. |
| k-anonymity in BigQuery views | HIGH | Standard SQL `HAVING COUNT(DISTINCT) >= N`. |
| vite-plugin-pwa Vue 3 patterns | HIGH | First-party Vite-PWA org docs. |
| Capacitor for Phase 3 mobile shell | MEDIUM | Recommendation, not validated against project — defer detailed eval to Phase 3 research. |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
