# Phase 2: Platform MVP - Research

**Researched:** 2026-04-28
**Domain:** Vue 3 + Firebase consent-gated platform; Discord OAuth bridge; Firestore time-series + B2B anonymization pipeline; offline PWA; gamification
**Confidence:** HIGH on the architectural skeleton (stack is locked and npm-verified 2026-04-27 in `.planning/research/STACK.md`); MEDIUM on differential-privacy noise calibration and Open Wearables fork timing (both pre-1.0 / external dependencies).

## Summary

Phase 2 is the heaviest engineering phase in the roadmap: 109 requirements across 10 sub-domains, sequenced through 7 build steps (Step 0 architecture lockdown → Step 6 wearables last). The plan must honor a hard rule from PITFALLS.md: every architectural decision made here that gets retrofitted in Phase 3 costs 5–10x. That is why the two-tier B2B pipeline is built but unused, why `ConsentEnforcement.ts` is shared from day 1, why Anonymous Auth is the first surface the user sees, and why manual-entry challenge data paths are designed before any wearable SDK is wired.

The locked stack (Vue 3.5 + Vite 7.4 + VueFire 3.2 + Firebase Functions v2 + discord.js 14.26 + Tailwind 4.2 + reka-ui 2.6 + Open Wearables 0.4.3 webhook-only) is npm-verified for April 2026 and not negotiable. CONTEXT.md adds 17 locked decisions (D-01..D-17) on top — most importantly: GameChangers as the project name, pure PWA only (no Capacitor in Phase 2), 16+ age floor with parental consent for under-18, single `wearable_data` toggle (not per-metric), three B2B partner categories kept (`b2b_insurers`/`b2b_healthcare`/`b2b_brands`), and pronouns as optional self-write. UI-SPEC.md locks the visual contract: dark default, accent green `#1FE090` reserved for XP/CTA only, character-sheet stats for all users, ES-first with gaming terms in EN, 360px mobile floor, 44×44 touch targets.

**Primary recommendation:** Treat Step 0 as one full plan (not a subset of Step 1). Land `ConsentEnforcement.ts`, the Rules baseline + 90% rules-unit-testing CI gate, the BigQuery export plumbing, and the budget alerts before a single AUTH endpoint exists. Every later step is fast IF Step 0 is solid; every later step is a rewrite if Step 0 is shipped half-baked.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Brand & Naming**
- **D-01:** Project name is **GameChangers** (supersedes "Gamer Wellness"/"GamerAlliance" in older artifacts). Resolves LEGAL-08.
- **D-02:** Domain priority `gamechangers.gg` primary, `gamechangers.com` fallback. Both registered before Step 0 Firebase project creation.
- **D-03:** Dark gaming aesthetic confirmed structurally; exact hex values tuned in UI-SPEC.md (deep navy `#0F0F1A`, accent green `#1FE090`, amber `#FFB800`, info blue `#5BB8FF`, destructive `#FF4D5E`).
- **D-04:** Wordmark-only logo for MVP — Space Grotesk Bold 700, no commissioned icon.
- **D-05:** PROJECT.md / REQUIREMENTS.md naming refresh ("Gamer Wellness" → "GameChangers") is a docs pass after CONTEXT.md commit; NOT Phase 2 implementation work.

**Scope & Pacing**
- **D-06:** No phase split. Phase 2 ships all 111 requirements as one phase.
- **D-07:** All 111 requirements are MVP scope; no 2.5 polish round.
- **D-08:** Solo founder + Claude Code execution model. Plans sized for one developer + AI assist.
- **D-09:** Step 0 (ARCH-01..10) ships as the first plan inside Phase 2, not a separate Phase 1.5.

**Mobile Shell & Wearables**
- **D-10:** Pure PWA only for Phase 2. Vue 3 + vite-plugin-pwa, installable to home screen, no App Store/Play Store. **No Capacitor wrapper.** Re-evaluate at Phase 3 only if PWA install rate <30% AND on-device HealthKit web bridges prove inadequate.
- **D-11:** Open Wearables webhook only — Garmin/Fitbit/Polar/Whoop/Oura via self-hosted FastAPI forwarding to a Cloud Function with HMAC + consent gate. **No native Apple HealthKit or Android Health Connect in Phase 2.** Defer native APIs to Phase 3 (contingent on Capacitor decision).
- **D-12:** Web Push API via FCM service worker. Works iOS 16.4+, full Android. WhatsApp Business stays primary LATAM channel for event reminders; Web Push covers in-app actions. No FCM/APNs native push.
- **D-13:** Soft install nudge only — appears in profile menu (`Instalar la app`), no popups, no banner. Suppressed entirely on iOS Safari.

**Policy & Consent**
- **D-14:** **16+** minimum registration age. Implications: LOPDP Art. 24 parental-consent flow for under-18; restricted data categories for minors (no B2B sharing under-18 regardless of consent); Discord teen-mode compliance (mandated since March 2026); age-verification gate in AUTH-12.
- **D-15:** Single `wearable_data` toggle covers all metrics (steps, heart rate, sleep, calories, workouts). No per-metric consent.
- **D-16:** Three B2B partner categories — `b2b_insurers`, `b2b_healthcare`, `b2b_brands`. Not splitting further; not collapsing.
- **D-17:** Pronouns are optional free-text self-write field, blank by default, never required.

### Claude's Discretion

- **DC-01:** Phase 1 used MEE6/Carl-bot; Phase 2 builds the custom discord.js v14 bot per DBOT-01..07. Migration story is implementation detail.
- **DC-02:** Firestore document ID strategy (auto vs deterministic) — pick per access pattern. **Recommendation in this research:** deterministic IDs (`{userId}` for `/users/{uid}`, `{userId}_{category}` for consents, ISO-date for `healthDaily`) wherever the access path knows the ID; auto-IDs for events and challenge instances where no natural key exists.
- **DC-03:** Cloud Function naming convention `<codebase>-<verb><Noun>` (e.g., `auth-discordExchange`, `consent-grant`).
- **DC-04:** i18n URL strategy. **Recommendation in UI-SPEC and this research:** cookie-based locale + single canonical URL set, `<link rel="alternate" hreflang>` for SEO. Avoids `/es` URL fragmentation.
- **DC-05:** reka-ui 2.6 + Tailwind 4.2 confirmed in UI-SPEC.
- **DC-06:** Anti-cheat thresholds — derive numeric values during Step 5 (CHLG) plan from clinical/device-spec sources. **Starter set in this research:** see Section 9 "Profile/character-sheet computation".
- **DC-07:** Streak shield — 1 grace day per 7-day window. Derived in Section 9.
- **DC-08:** Wordmark typography locked to Space Grotesk in UI-SPEC.

### Deferred Ideas (OUT OF SCOPE for Phase 2)

- D-05 docs naming refresh (small docs pass after CONTEXT.md commit, not phase work).
- Commissioned logo design (Phase 3+).
- Capacitor wrapper, App Store/Play Store distribution (Phase 3 contingent on PWA install rate < 30%).
- Native Apple HealthKit / Android Health Connect (Phase 3+ contingent on Capacitor).
- FCM/APNs native push (deferred with Capacitor).
- Aggressive PWA install prompts (rejected; soft-only locked).
- Phase 2.5 polish phase (none planned).
- Per-metric wearable consent (rejected).
- B2B taxonomy expansion / collapse (rejected).
- Curated-pronoun dropdown (rejected; free-text).
- Legal entity type, founder availability, technical co-founder, capital, Aseguradora del Sur — Phase 0 / external open questions.

</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 2 covers 111 requirements (the additional context block listed 109; the discrepancy is `CONT-04..07` and `EVNT-13` which the build-order block consolidates — the canonical count from REQUIREMENTS.md is 111). Mapping each requirement family to the research findings that enable implementation:

| ID range | Description | Research Support |
|----------|-------------|------------------|
| ARCH-01..10 | Firebase project + 7 Function codebases + ConsentEnforcement.ts + Rules baseline + budget alerts + Sentry/PostHog/UptimeRobot + BigQuery export | §1 (Rules), §3 (BigQuery pipeline), §8 (project skeleton) |
| AUTH-01..12 | Anonymous Auth, email/password, Discord OAuth via custom-token bridge, anonymous→full upgrade preserves XP, KMS-encrypted refresh tokens, age gate 16+ | §2 (Discord bridge), §10 (bot's role in `/link`) |
| CNST-01..14 | 10 categories, granular UI, progressive layers, hash-chained ledger, two-layer enforcement, DSAR + erasure, expiry sweeper | §1 (Rules + caching), §6 (versioning, audit ledger, DSAR) |
| PROF-01..14 | Profile fields, XP logarithmic curve, streaks + shield, multi-progression, badges with provenance, character sheet for ALL, anti-cheat, Discord role sync | §9 (XP curve, streaks, badges, character sheet) |
| EVNT-01..14 | 3-tier events, RSVP, waitlist auto-promote, QR check-in (offline-capable), walk-in capture, post-event card, report-user, safety contact | §5 (offline QR check-in, JWT QR payload) |
| CHLG-01..12 | 5 types × 3 tiers, manual-first, pedometer, photo + vouch, opt-in leaderboards via aggregate docs, anti-cheat, seasonal | §7 (challenge_progress write path) |
| WEAR-01..12 | Open Wearables webhook + HMAC, monthly-bucketed time-series, daily rollups, only `healthDaily` to BigQuery, no auto-medical alerts | §4 (time-series schema, daily aggregation) |
| CONT-01..07 | SEO content hub, articles, embedded social, consumption tracking, XP for completion, CMS, embedded assessments | §8 (route structure), §1 (consent gating for tracking) |
| DBOT-01..07 | Bot on Compute Engine e2-micro, no MessageContent, zero Firestore Admin SDK, slash commands, weekly digest, quarterly TOS audit | §10 (bot architecture, IAM, command shape) |
| A11Y-01..09 | Installable PWA, 3s 3G load, WCAG 2.1 AA, 360px floor, ES/EN i18n, gaming terms in EN, data-saver, dark default, teen-mode | §5 (PWA install + offline), UI-SPEC accessibility |

</phase_requirements>

## Standard Stack

The stack is **locked** by `.planning/research/STACK.md` (npm-verified 2026-04-27) and CLAUDE.md. Do not propose alternatives.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | 3.5.33 | PWA framework (Composition API + `<script setup>`) | Locked. [VERIFIED: STACK.md npm view 2026-04-27] |
| Vite | 7.4.0 | Build tool / dev server | Vite 8 ecosystem still lags; pin to 7.4. [VERIFIED] |
| @vitejs/plugin-vue | 6.0.6 | Vue SFC support | Required peer. [VERIFIED] |
| Vue Router | 5.0.6 | Routing | Vue Router 5.x for Vue 3.5+. [VERIFIED] |
| Pinia | 3.0.4 | State management | Composition-API native; tree-shakable. [VERIFIED] |
| VueFire | 3.2.3 | Vue ⇄ Firebase reactive bindings | Official Vue Firebase library, posva. [VERIFIED] |
| Firebase JS SDK | 12.12.1 | Frontend client | [VERIFIED: Firebase release notes April 2026] |
| firebase-admin | 13.8.0 | Server-side Admin SDK | [VERIFIED] |
| firebase-functions | 7.2.5 | Functions v2 SDK | Use v2 API exclusively. [VERIFIED] |
| firebase-tools | 15.15.0 | CLI / Emulator Suite | [VERIFIED] |
| discord.js | 14.26.3 | Discord bot | Node 22.12+ required. [VERIFIED] |
| Tailwind CSS | 4.2.4 | Styling (Oxide engine) | CSS-first `@theme` directive. [VERIFIED] |
| reka-ui | 2.6.2 | Headless components | Radix-Vue successor. [VERIFIED] |
| vite-plugin-pwa | 1.2.0 | Service worker + manifest | `generateSW` strategy. [VERIFIED] |

### Supporting
| Library | Version | Purpose |
|---------|---------|---------|
| @vueuse/core | 14.2.1 | `useLocalStorage`, `useGeolocation`, `useOnline` |
| @vueuse/integrations | matches core | `useIDBKeyval` (offline queue), focus-trap (consent modal) |
| vue-i18n | 11.4.0 | ES/EN i18n, versioned consent keys |
| zod | 4.3.6 | Runtime schema validation (Functions, Discord interactions, shared `packages/shared`) |
| date-fns | 4.1.0 | Date math, locale-aware (`es`, `en-US`) |
| qrcode | 1.5.4 | QR generation (event tickets) |
| jsqr | 1.4.0 | In-browser QR decode |
| posthog-js | 1.372.x | Self-hosted PostHog client |
| @sentry/vue | 10.50.0 | Error monitoring with PII scrubbing |
| @phosphor-icons/vue | 2.x | Icon library (UI-SPEC locked) |
| workbox-background-sync | (with vite-plugin-pwa) | Background Sync queue |
| workbox-window | 7.4.0 | SW registration helper |
| @firebase/rules-unit-testing | 5.0.0 | Rules tests (90%+ CI gate) |
| firebase-functions-test | 3.4.1 | Function unit tests |
| Vitest | 4.1.5 | Unit + component tests |
| @vue/test-utils | 2.4.9 | Vue component testing |
| Playwright | 1.59.1 | E2E (consent flows, QR, Discord-link) |

### Phase 2 explicitly NOT used (deferred)
| Library | Why Not Now |
|---------|-------------|
| @capacitor/* | D-10: Pure PWA only |
| @perfood/capacitor-healthkit | Phase 3+ contingent on Capacitor |
| Open Wearables React Native SDK | No mobile shell in Phase 2 |
| Stripe (`stripe`, `@stripe/stripe-js`) | Phase 3+ (premium memberships) |
| Metabase | Phase 3 dashboards (BigQuery views built but no UI) |

## Architecture Patterns

### Recommended Project Structure (monorepo)

```
game-changers/
├── apps/
│   ├── pwa/                  # Vue 3 + Vite + vite-plugin-pwa (THE main app)
│   │   ├── src/
│   │   │   ├── routes/       # /me, /me/consent, /me/wearables, /events, /challenges, /partners (deny-all)
│   │   │   ├── components/   # AppShell, ConsentRow, EventCard, etc. (UI-SPEC §Component Inventory)
│   │   │   ├── composables/  # useConsent, useOfflineQueue, useXp, useStreak
│   │   │   ├── stores/       # Pinia: auth, consent, profile, events, challenges
│   │   │   ├── locales/      # es.json, en.json (versioned consent keys)
│   │   │   └── pwa/          # service worker config, IDB keys, sync registration
│   │   ├── public/fonts/     # bunny.net self-hosted Space Grotesk + Inter + JetBrains Mono
│   │   └── vite.config.ts    # vite-plugin-pwa generateSW with Workbox config
│   └── discord-bot/          # discord.js 14.26 standalone Node 22 process (Compute Engine e2-micro)
│       ├── src/commands/     # /link, /eventos, /leaderboard, /perfil, /reto, /ayuda
│       ├── src/lib/          # HTTP client to Function endpoints (HMAC-signed)
│       └── deploy/           # systemd unit, deploy script
├── functions/
│   ├── auth/                 # codebase 1: discordExchange, anonUpgrade, ageGate
│   ├── consent/              # codebase 2: grant, revoke, expirySweeper, dsarExport, erasure
│   ├── events/               # codebase 3: createEvent, rsvp, waitlistPromote, checkIn, postEventCard
│   ├── challenges/           # codebase 4: enrollChallenge, logProgress, antiCheat, leaderboardCompute
│   ├── wearables/            # codebase 5: openWearablesWebhook, healthSamplesAggregate, disconnectDevice
│   ├── gamification/         # codebase 6: xpAward, streakAdvance, badgeAward, discordRoleSync
│   ├── b2b/                  # codebase 7: (built but not exposed) bigQueryExportConfig, partnerEmbedJwt
│   └── shared/               # ConsentEnforcement.ts, hmac.ts, kms.ts, types.ts
├── packages/
│   └── shared/               # zod schemas, i18n keys, type definitions consumed by all apps
├── firestore.rules           # all Security Rules (deny-all default)
├── storage.rules
├── firestore.indexes.json
├── firebase.json             # 7 codebases config
└── tests/
    ├── rules/                # @firebase/rules-unit-testing (one file per consent category × CRUD; 90% CI gate)
    ├── functions/            # firebase-functions-test
    └── e2e/                  # Playwright (consent flows, QR, Discord-link round-trip)
```

### Pattern 1: Two-layer consent enforcement (Pitfall #1, CRITICAL)

**Layer A:** Firestore Security Rules with shared helper functions referencing `request.auth.token.consents` (custom claim) for hot-path categories, `get()` for cold paths.

**Layer B:** `consentGate(category)` middleware on every Cloud Function: re-verifies the consent doc + writes the access to `auditLog` in the same transaction.

**Why both:** Rules without middleware miss audit logging; middleware without Rules leaves a backdoor if a future endpoint is added.

### Pattern 2: Append-only audit ledger via Functions service-account only

`/auditLog/{uuid}` and `/consentLedger/{uuid}` are deny-all in Rules; only the Functions service-account writes them. Every consent grant/revoke is a transactional `setDoc(consents/...) + setDoc(consentLedger/...) + setDoc(auditLog/...)`.

### Pattern 3: Firestore→BigQuery export ONLY for consent-tagged aggregate collections

Export config: `profiles`, `consents`, `healthDaily`, `events`, `attendance`, `challenges`, `auditLog`, `consentLedger`. **NEVER** `healthSamples` (raw wearable data) and **NEVER** the user-private subcollections that would carry direct identifiers.

### Pattern 4: Bot has zero Firestore Admin SDK access (ADR-001)

The bot calls Function HTTP endpoints with HMAC-signed headers from a known IP allow-list. Bot's own Firebase service account holds `roles/firebase.viewer` only — read leaderboards/events, never write.

### Anti-Patterns to Avoid

- **`onSnapshot` on user collections in app shell** — burns reads. Use VueFire `useDocument` only on small-cardinality docs (the user's own `profile`, `consent` doc, current `streak`). Aggregate documents (`/leaderboards/{period}`) are recomputed by scheduled Functions; the client subscribes to the single aggregate doc, not the underlying collection. ESLint rule `no-restricted-syntax` warns on `onSnapshot` import per ARCH-07.
- **Large custom-claim payloads** — claims are capped at 1000 bytes; only put a coarse consent bitmap (`consents: { basic: true, event: true, ... }`) in claims, not the full versioned grant. Full grant lives in Firestore.
- **Direct Firestore writes from the bot** — ADR-001 firewall.
- **`MessageContent` Discord intent** — LOPDP minimization violation + Discord verification bar.
- **Auto-update PWA mid-session** — breaks consent flows. `registerType: 'prompt'` (UI-SPEC line 340).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth state/nonce, JWT minting | Custom JWT lib | `firebase-admin` `auth().createCustomToken()` + Discord OAuth state via signed cookies | Crypto bugs are silent and catastrophic; admin SDK is the official path. |
| Background Sync queue | Custom IDB write/retry | Workbox `BackgroundSyncPlugin` (bundled with vite-plugin-pwa) | Workbox handles retry, dedup, max-age, network-error semantics. |
| HMAC signature verification | Hand-rolled HMAC | Node `crypto.createHmac('sha256', secret)` with `timingSafeEqual` | Constant-time comparison is non-trivial; one slip = timing attack. |
| Firestore↔BigQuery sync | Custom Cloud Function ETL | `firebase/firestore-bigquery-export` Extension | Near-real-time, official, change-stream-correct. |
| k-anonymity enforcement | App-layer filtering | BigQuery view: `HAVING COUNT(DISTINCT user_id) >= 50` | Schema-level — partner can never query under-threshold rows even with a SQL injection. |
| Differential privacy noise | Hand-rolled Laplace/Gaussian sampler | BigQuery `SELECT WITH DIFFERENTIAL_PRIVACY OPTIONS(...)` block | Native, calibrated, privacy-budget enforced; partners can't tune ε. |
| QR generation/decode | Custom canvas drawing | `qrcode` (server-side) + `jsqr` (browser) | Spec-correct, multi-encoder support. |
| AES envelope encryption | Custom KMS calls | Cloud KMS `encrypt`/`decrypt` for refresh tokens | Key rotation, audit, IAM all included. |
| Slash command builders | Hand-rolled JSON | `@discordjs/builders` (bundled in discord.js v14) | Type-safe, validates option types client-side. |
| Hash-chained ledger | Naive append | SHA-256 of `{prev_hash, payload, timestamp, user_id}` written transactionally | Correct only if transaction is atomic — Firestore `runTransaction` guarantees it. |

**Key insight:** Crypto, queues, and anonymization SQL are the three places where a junior implementation is functionally indistinguishable from a correct one in dev — and catastrophically broken in prod.

## Runtime State Inventory

Phase 2 is **greenfield** — Vite + Vue 3 starter scaffold is the only existing code (per CONTEXT.md `<code_context>`). No runtime state to migrate. **All categories: None.**

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no Firebase project exists yet | None |
| Live service config | Phase 1 Discord server exists with MEE6/Carl-bot. Migration: leave Phase 1 bots running while custom bot enrolls; cut over per-channel as the custom bot proves out (DC-01) | Bot deploy plan handles this |
| OS-registered state | None — no scheduled tasks, no daemons | None |
| Secrets/env vars | New: `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `OPEN_WEARABLES_HMAC_SECRET`, `BOT_TO_FUNCTION_HMAC`, KMS key ring + crypto-key. Provisioned in Step 0 via SOPS or GCP Secret Manager | Step 0 plan creates secrets |
| Build artifacts | Existing Vite + Vue starter scaffold (HelloWorld.vue, TheWelcome.vue, etc.) — **must be stripped** in Step 0 first plan per CONTEXT.md `<code_context>` | Step 0 task: delete starter components |

## Common Pitfalls

(See `.planning/research/PITFALLS.md` for the full 9 pitfalls. Highlighting the four with the highest retrofit cost.)

### Pitfall 1: Single-layer consent enforcement
**What goes wrong:** Putting consent checks in Rules OR middleware, not both. Either you miss audit logs, or a future Function bypasses Rules and accesses data without consent.
**How to avoid:** `ConsentEnforcement.ts` shared module exports both `consentRulesHelper(category)` (Rules-side) and `consentGate(category)` (middleware-side). Every Function that touches user data starts with `await consentGate(req, 'category')`.
**Warning sign:** A new Function is deployed without importing `consentGate` — CI lint should fail.

### Pitfall 2: Firestore read budget blowup
**What goes wrong:** `onSnapshot` on a leaderboard collection of 10K rows fires once per add — every connected client is charged for every change.
**How to avoid:** Aggregate documents recomputed by scheduled Functions; clients subscribe to the single aggregate. ESLint warning on `onSnapshot` import (ARCH-07). Budget alerts at $50/$100/$200 (ARCH-06).
**Warning sign:** Daily Firestore reads spike >100K outside of expected event-day traffic.

### Pitfall 4: Discord-to-app conversion crash at consent step
**What goes wrong:** User clicks `/link` in Discord, bounces to web, sees a 10-toggle consent wall, drops off. Conversion <60% → kill criterion tripped.
**How to avoid:** Anonymous Auth on first open (AUTH-01) before any consent prompt; Layer 0 captures only basic_profile at account upgrade; Layer 1 (event_participation) captured at first event check-in, not before. Each layer is one screen with 1–3 toggles (UI-SPEC §Copywriting Contract).
**Warning sign:** PostHog funnel shows >40% drop between `discord_link_callback` and `consent_layer_0_granted`.

### Pitfall 6: B2B anonymization retrofitted in Phase 3
**What goes wrong:** Building the analytics path Phase-3-only means rewriting Firestore schema + BigQuery views + audit machinery once partners are signed and angry.
**How to avoid:** Two-tier pipeline (firestore-raw DPO-only with 90-day retention → bigquery-anonymized) lives in Phase 2 even with no B2B partner. Schema-level k≥50 + ε-DP from day one.
**Warning sign:** Phase 2 plan tries to push WEAR-09 (BigQuery export) "later" — STOP, that retrofit is 5–10x.

### Pitfall 9: Wearable-required gamification (CONTEXT.md PROF-12)
**What goes wrong:** Designing challenges and character sheet around wearable telemetry leaves 70%+ of users (who don't own a wearable) staring at greyed-out UI. They churn.
**How to avoid:** Manual entry as first-class data path BEFORE wearable SDKs (Step 5 before Step 6). Native phone pedometer (Web Sensor API) as baseline. Character sheet shows full color for ALL users (PROF-12 + UI-SPEC).

## Code Examples

### 1. Firestore Security Rules with consent helper + custom-claim cache

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    // Helper: hot-path categories cached in custom claims (basic_profile, event_participation)
    function hasConsentClaim(category) {
      return request.auth != null
          && request.auth.token.consents != null
          && request.auth.token.consents[category] == true;
    }

    // Helper: cold-path categories require a get() (b2b_*, research, cross_border)
    // COSTS 1 READ per evaluation — minimize use
    function hasConsentDoc(uid, category) {
      let doc = get(/databases/$(db)/documents/users/$(uid)/consents/$(category));
      return doc.data.status == 'granted'
          && doc.data.expiresAt > request.time;
    }

    // Owner check
    function isOwner(uid) { return request.auth != null && request.auth.uid == uid; }

    // /users/{uid}/profile/main — owner can read/write if basic_profile claim
    match /users/{uid}/profile/main {
      allow read:  if isOwner(uid) && hasConsentClaim('basic_profile');
      allow write: if isOwner(uid) && hasConsentClaim('basic_profile')
                  && request.resource.data.discordId == resource.data.discordId; // immutable
    }

    // /users/{uid}/healthDaily/{date} — wearable_data consent
    match /users/{uid}/healthDaily/{date} {
      allow read: if isOwner(uid) && hasConsentClaim('wearable_data');
      allow write: if false; // Functions service-account only (admin SDK bypass)
    }

    // Append-only audit log — service account only
    match /auditLog/{id} {
      allow read: if request.auth.token.role == 'dpo';
      allow write: if false;
    }

    // /partners/* — deny-all in Phase 2 (Phase 3 exposes via custom claim)
    match /partners/{document=**} {
      allow read, write: if request.auth.token.partner_id != null
                         && request.auth.token.partner_active == true;
    }
  }
}
```

**Source:** [Firebase Rules Conditions](https://firebase.google.com/docs/firestore/security/rules-conditions); [VERIFIED via WebSearch] custom-claim pattern is canonical and `get()` costs 1 read per evaluation.

### 2. Discord OAuth → Firebase custom-token bridge (Cloud Function)

```typescript
// functions/auth/src/discordExchange.ts
import { onRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { kmsEncrypt } from '../../shared/kms';
import { z } from 'zod';

const Body = z.object({ code: z.string(), state: z.string(), pkce: z.string() });

export const discordExchange = onRequest({ region: 'southamerica-east1', cors: true }, async (req, res) => {
  // 1. Verify state + PKCE (signed cookie or in-memory store)
  const { code, state, pkce } = Body.parse(req.body);
  // 2. Exchange code for Discord tokens
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code, redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      code_verifier: pkce,
    }),
  });
  const { access_token, refresh_token } = await tokenRes.json();
  // 3. Fetch Discord identity (no MessageContent scope, only `identify` + `email`)
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const discordUser = await userRes.json();
  // 4. Encrypt refresh token via KMS, persist
  const encrypted = await kmsEncrypt(refresh_token);
  const uid = `discord:${discordUser.id}`; // OR look up existing uid via discordId mapping
  await getFirestore().doc(`users/${uid}/private/discord`).set({
    discordId: discordUser.id,
    encryptedRefreshToken: encrypted,
    linkedAt: FieldValue.serverTimestamp(),
  });
  // 5. Mint Firebase custom token with consent bitmap claim
  const claims = await loadConsentBitmap(uid); // reads /users/{uid}/consents/* once
  const customToken = await getAuth().createCustomToken(uid, { consents: claims });
  res.json({ customToken });
});
```

**Source:** [Firebase Custom Auth](https://firebase.google.com/docs/auth/web/custom-auth); [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2); reference impls [`nawodyaishan/discord-firebase-auth`](https://github.com/nawodyaishan/discord-firebase-auth), [`luizkc/firebase-discord-oauth2-example`](https://github.com/luizkc/firebase-discord-oauth2-example). [VERIFIED] No OIDC discovery endpoint exists for Discord (verified in STACK.md).

### 3. BigQuery k≥50 + differential privacy view

```sql
-- BigQuery view in dataset `gw_b2b_views`
-- Service account `metabase@...` has SELECT on this view ONLY; revoked from `gw_analytics` raw mirror.

CREATE OR REPLACE VIEW gw_b2b_views.active_movers_by_city AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,                  -- privacy budget (lower = more noise)
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  city,
  COUNT(DISTINCT user_id) AS active_user_count,
  AVG(weekly_challenge_count) AS avg_challenges
FROM `gw_analytics.healthDaily_changelog` h
JOIN `gw_analytics.consents_changelog` c USING (user_id)
JOIN `gw_analytics.profiles_changelog` p USING (user_id)
WHERE c.category = 'b2b_brands'
  AND c.status = 'granted'
  AND c.expiresAt > CURRENT_TIMESTAMP()
  AND p.age_band IS NOT NULL                  -- generalized 5-year bands at write
  AND p.is_minor = FALSE                      -- D-14: no B2B sharing for under-18
GROUP BY city
HAVING COUNT(DISTINCT user_id) >= 50;         -- schema-level k-anonymity floor
```

**Source:** [BigQuery Differential Privacy docs](https://cloud.google.com/bigquery/docs/differential-privacy); [DP aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate-dp-functions). [VERIFIED via WebSearch 2026-04-28]: `SELECT WITH DIFFERENTIAL_PRIVACY OPTIONS` is GA in BigQuery; `epsilon` is a numeric value where lower = more noise.

### 4. Wearable webhook + monthly bucketed write + daily rollup trigger

```typescript
// functions/wearables/src/openWearablesWebhook.ts
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as crypto from 'crypto';

export const openWearablesWebhook = onRequest({ region: 'southamerica-east1' }, async (req, res) => {
  // 1. HMAC verify
  const sig = req.header('X-OW-Signature') || '';
  const expected = crypto.createHmac('sha256', process.env.OW_HMAC_SECRET!)
    .update(JSON.stringify(req.body)).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).end();
  }
  // 2. Consent gate
  const { uid, samples } = req.body;
  const ok = await consentGate(uid, 'wearable_data');
  if (!ok) return res.status(403).end();
  // 3. Monthly bucket write
  const db = getFirestore();
  const batch = db.batch();
  for (const s of samples) {
    const yyyymm = s.recordedAt.slice(0, 7);              // "2026-04"
    const ref = db.doc(`users/${uid}/healthSamples/${yyyymm}/metrics/${s.id}`);
    batch.set(ref, { ...s, source: 'open-wearables', recordedAt: new Date(s.recordedAt) });
  }
  await batch.commit();
  res.status(204).end();
});

// Daily rollup — debounced onWrite trigger
export const aggregateDailyHealth = onDocumentWritten(
  { document: 'users/{uid}/healthSamples/{yyyymm}/metrics/{id}', region: 'southamerica-east1' },
  async (event) => {
    const { uid } = event.params;
    const day = event.data?.after.data()?.recordedAt.toDate().toISOString().slice(0, 10);
    if (!day) return;
    // Aggregate that day's samples → /users/{uid}/healthDaily/{yyyy-mm-dd}
    // Use Pub/Sub debounce (Cloud Tasks delayed by 60s) to avoid recompute storm during sync bursts
    await scheduleRollup(uid, day);
  }
);
```

**Source:** [Firebase write-time aggregations](https://firebase.google.com/docs/firestore/solutions/aggregation); [Open Wearables webhook docs](https://github.com/the-momentum/open-wearables); STACK.md §3 monthly bucket pattern.

### 5. Offline QR check-in (vite-plugin-pwa + Workbox BackgroundSync)

```typescript
// apps/pwa/vite.config.ts (excerpt)
import { VitePWA } from 'vite-plugin-pwa';
export default {
  plugins: [VitePWA({
    registerType: 'prompt',                      // UI-SPEC: never auto-update
    strategies: 'generateSW',
    workbox: {
      runtimeCaching: [
        // Network-only for sensitive endpoints (UI-SPEC §PWA)
        { urlPattern: /\/(consent|health|auth)\//, handler: 'NetworkOnly' },
        // Background-sync queue for QR check-ins
        {
          urlPattern: /\/api\/events\/.+\/checkin$/,
          handler: 'NetworkOnly',
          method: 'POST',
          options: {
            backgroundSync: { name: 'checkin-queue', options: { maxRetentionTime: 24 * 60 } },
          },
        },
        // Stale-while-revalidate for content articles
        { urlPattern: /\/content\//, handler: 'StaleWhileRevalidate' },
      ],
    },
  })],
};
```

```typescript
// apps/pwa/src/composables/useCheckIn.ts
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval';

export async function checkIn(eventId: string, qrPayload: string) {
  // The signed JWT QR payload was generated server-side at RSVP time:
  //   payload = jwt.sign({ eventId, uid, exp: event.startsAt + 4h }, SIGNING_KEY)
  const res = await fetch(`/api/events/${eventId}/checkin`, {
    method: 'POST',
    body: JSON.stringify({ qrPayload, geo: await getGeo() }),
  });
  // If offline, the SW intercepts and queues to IDB via Workbox BackgroundSync.
  // UI shows OfflineBanner "Sin señal — guardamos tu check-in" (UI-SPEC).
  return res.ok;
}
```

**Source:** [vite-plugin-pwa docs](https://vite-pwa-org.netlify.app/); [Workbox BackgroundSync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync). [VERIFIED via WebSearch] BackgroundSync is GA but has known browser quirks — test on Chrome Android (primary Ecuador device).

### 6. Aggregate-document leaderboard (no onSnapshot on collection)

```typescript
// functions/challenges/src/leaderboardCompute.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
export const recomputeLeaderboards = onSchedule(
  { schedule: 'every 15 minutes', region: 'southamerica-east1' },
  async () => {
    const periods = ['weekly', 'monthly', 'season'];
    for (const period of periods) {
      // Run aggregation queries server-side (count(), sum())
      const top = await runAggregationQuery(period);
      await getFirestore().doc(`leaderboards/${period}`).set({
        updatedAt: FieldValue.serverTimestamp(),
        rows: top.slice(0, 100),
      });
    }
  }
);
```

```vue
<!-- apps/pwa/src/views/Leaderboard.vue -->
<script setup lang="ts">
import { useDocument } from 'vuefire';
import { doc } from 'firebase/firestore';
const lb = useDocument(doc(db, 'leaderboards/weekly')); // ONE doc subscription, NOT a collection
</script>
```

**Source:** [Firestore aggregation queries](https://firebase.google.com/docs/firestore/query-data/aggregation-queries); [Firestore write-time aggregations](https://firebase.google.com/docs/firestore/solutions/aggregation). [VERIFIED via WebSearch] `count()` does not support real-time listeners — aggregate-doc pattern is the canonical workaround.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vuex | Pinia | 2022+ | Pinia is the official state lib for Vue 3. |
| Firebase Functions v1 | Functions v2 | 2023+ | v2 = Cloud Run runtime, concurrency, smaller cold starts, regional pinning. **Use v2 imports exclusively.** |
| Vue Router 4 | Vue Router 5 | 2025 | 5.x is the current major for Vue 3.5+. |
| radix-vue | reka-ui | 2025 | Same maintainers; renamed. |
| Firestore real-time listeners on large collections | Aggregate documents recomputed by scheduled Functions | 2023+ | `count()` aggregation queries don't support `onSnapshot`; aggregate-doc is the canonical pattern. |
| Hand-rolled k-anonymity | BigQuery `WITH DIFFERENTIAL_PRIVACY` + view-level `HAVING COUNT(DISTINCT) >= N` | 2023+ | GA in BigQuery; partners can never query under-threshold rows. |
| Discord OAuth via OIDC | Custom-token bridge (Discord has no OIDC discovery endpoint) | 2024+ | Confirmed in STACK.md; OIDC pattern requires FusionAuth/Auth0 wrapper — not worth the infra hop for MVP. |
| Tailwind 3 PostCSS | Tailwind 4 Oxide engine | 2025 | CSS-first config via `@theme`; `@tailwindcss/vite` plugin. |
| Moment.js | date-fns 4 | 2020+ | Deprecated. |

**Deprecated/outdated:**
- React Native / Supabase / NestJS / Next.js — superseded by Vue 3 + Firebase per CLAUDE.md and STACK.md.
- discord.js v13 and earlier — Discord API v9 EOL.
- Firebase Functions v1 — higher cold starts, no concurrency.
- `MessageContent` Discord intent — LOPDP minimization; raises Discord verification bar; never enable.

---

## Focus Area Deep-Dives

### §1. Firestore Security Rules for granular consent enforcement

**Recommended approach:** Two-tier consent caching.

- **Hot-path categories** (`basic_profile`, `event_participation`, `wearable_data`, `health_self_reports`) are mirrored into Firebase Auth **custom claims** as a compact bitmap (`consents: { basic: true, event: true, wearable: false, ... }`). Rules read `request.auth.token.consents[category]` — **costs zero document reads** per Rules evaluation.
- **Cold-path categories** (`b2b_insurers`, `b2b_healthcare`, `b2b_brands`, `cross_border`, `research`, `gaming_habits`) live in Firestore at `/users/{uid}/consents/{category}` and Rules use `get()` — **costs 1 read per evaluation**, acceptable because B2B paths are infrequent.

**Code shape:** see Code Example 1 above. The `consent-grant` Function transactionally writes the doc + ledger + audit + calls `auth().setCustomUserClaims()` to update the bitmap. Custom claims **only refresh on next ID-token refresh** (every hour by default; force with `getIdToken(true)`).

**Key gotchas:**
- Custom claims have a **1000-byte cap** ([VERIFIED via WebSearch]). The bitmap uses single-letter keys (`b: true, e: true, w: false, ...`) to stay under the cap with all 10 categories + version metadata.
- `get()` in Rules is billed per evaluation — **even for rejected requests** ([VERIFIED via WebSearch]). Never put cold-path consent on a hot endpoint.
- Hot-path consent revocation has up to a 1-hour propagation lag (claim refresh). The middleware layer (`consentGate`) re-reads the Firestore doc and rejects within seconds — that's why two layers are mandatory.
- 90% rules-unit-testing CI gate (ARCH-05): one test file per consent category × CRUD; deny-all baseline; tests must include "consent revoked → write fails".

**Sources:**
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) [VERIFIED]
- [Rules Conditions docs](https://firebase.google.com/docs/firestore/security/rules-conditions) [VERIFIED]
- [@firebase/rules-unit-testing](https://www.npmjs.com/package/@firebase/rules-unit-testing) [VERIFIED]

**Confidence: HIGH** — this is the canonical Firebase pattern, tested in `.planning/research/ARCHITECTURE.md`.

---

### §2. Discord OAuth ⇄ Firebase Auth bridge

**Recommended approach:** Custom-token pattern (Spark tier, no Identity Platform required).

**Flow:**
1. Bot's `/link` slash command generates a one-time link token, replies with `https://gamechangers.gg/link?t=<token>`.
2. Web flow: PWA opens Discord OAuth URL with `identify email` scopes + state + PKCE.
3. Discord redirects to `auth-discordExchange` Cloud Function with `?code=...&state=...`.
4. Function exchanges code → fetches `/users/@me` → KMS-encrypts refresh token → mints Firebase custom token with consent bitmap claim.
5. PWA calls `signInWithCustomToken(token)` and persists. The user is now authenticated.

**Code shape:** see Code Example 2.

**KMS encryption of refresh tokens:**
```typescript
// shared/kms.ts
import { KeyManagementServiceClient } from '@google-cloud/kms';
const kms = new KeyManagementServiceClient();
const KEY = `projects/<proj>/locations/southamerica-east1/keyRings/gc/cryptoKeys/discord-tokens`;
export async function kmsEncrypt(plaintext: string) {
  const [r] = await kms.encrypt({ name: KEY, plaintext: Buffer.from(plaintext) });
  return r.ciphertext!.toString('base64');
}
```

**Key gotchas:**
- Discord has **no OIDC discovery endpoint** ([CITED: STACK.md §1, verified against Discord docs]). The OIDC alternative requires an external wrapper (FusionAuth/Auth0) — not worth the infra hop for MVP.
- Anonymous → Full upgrade (AUTH-09): `linkWithCustomToken` is NOT directly supported. Pattern: when an anonymous user links Discord, the Function detects an existing Discord ID → either (a) merges anonymous data into the Discord-bound account via batch writes, or (b) keeps the anonymous uid and writes Discord identity into the user's `private` subcollection. **Recommend (b)** — simpler; the anonymous uid stays the canonical user ID throughout the lifecycle; XP and event attendance are preserved without merge logic.
- State + PKCE are **mandatory**, not optional ([CITED: Discord OAuth2 docs]).
- Refresh tokens rotate on every refresh — re-encrypt + persist on each token refresh.

**Sources:**
- [Firebase Custom Auth](https://firebase.google.com/docs/auth/web/custom-auth) [VERIFIED]
- [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2) [VERIFIED]
- [`nawodyaishan/discord-firebase-auth`](https://github.com/nawodyaishan/discord-firebase-auth) [CITED]
- [`luizkc/firebase-discord-oauth2-example`](https://github.com/luizkc/firebase-discord-oauth2-example) [CITED]

**Confidence: HIGH** for the bridge pattern; **MEDIUM** for the anonymous→full merge — the project should pick approach (b) and document it as ADR-008.

---

### §3. Two-tier B2B pipeline (firestore-raw → bigquery-anonymized)

**Recommended approach:** Three layers.

1. **Firestore (raw, DPO-only):** `/users/{uid}/healthSamples/...`, `/auditLog/*`, `/consentLedger/*` — never exported. 90-day TTL on `healthSamples` per LOPDP minimization (use Firestore TTL policy; `expireAt` field).
2. **BigQuery raw mirror (`gw_analytics`):** Firestore→BigQuery extension on the **8 consent-tagged aggregate collections** (`profiles`, `consents`, `healthDaily`, `events`, `attendance`, `challenges`, `auditLog`, `consentLedger`). Service account: DPO + analytics team. **Metabase has zero access here.**
3. **BigQuery anonymized views (`gw_b2b_views`):** materialized views with `HAVING COUNT(DISTINCT user_id) >= 50` + `WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=...)`. **Metabase service account has SELECT on these views ONLY.**

**Code shape:** see Code Example 3.

**Schema-level generalization (B2BD-04):**
- `age_band` field stored at write time (5-year buckets: `16-20, 21-25, ...`). No raw `birthDate` exported.
- `region` field at write time: city for cohorts ≥500, province for cohorts <500, country for cohorts <100.
- `is_minor: bool` (under-18 flag) — every B2B view filters `is_minor = FALSE` per D-14.

**Differential privacy parameters:**
- Start with `epsilon = 1.0`, `delta = 1e-5`, `max_groups_contributed = 5`.
- The exact ε needs Phase 3 calibration ([ASSUMED] — depends on partner query patterns; document as B2BD-05 task).
- BigQuery DP is GA ([VERIFIED via WebSearch 2026-04-28]: native `WITH DIFFERENTIAL_PRIVACY` clause, with `epsilon` scaling noise inversely).

**Key gotchas:**
- Firestore→BigQuery extension exports to `*_changelog` tables (event-style). Build views on top, NOT directly on the changelog.
- Privacy budget is per-query — once exhausted, queries fail. Set conservative `epsilon_per_query` and `total_epsilon`.
- Never JOIN raw `healthSamples` (not exported) or `consents` (PII). Joins are between `healthDaily` + `profiles_changelog` + `consents_changelog` (consent fact only, not text).
- B2B Metabase JWT embed (B2BD-07): per-partner row filters via signed JWT params (`partner_id` claim).

**Sources:**
- [BigQuery Differential Privacy](https://cloud.google.com/bigquery/docs/differential-privacy) [VERIFIED]
- [DP aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate-dp-functions) [VERIFIED]
- [Firestore→BigQuery Extension](https://extensions.dev/extensions/firebase/firestore-bigquery-export) [VERIFIED]

**Confidence: HIGH** for architecture + k-anonymity; **MEDIUM** for ε-DP calibration (Phase 3 task with partner data).

---

### §4. Wearable time-series schema

**Recommended approach:** Monthly bucket subcollection + Pub/Sub-debounced daily rollup.

**Schema:**
```
/users/{uid}/healthSamples/{yyyy-mm}/metrics/{sampleId}
  { metric: 'steps' | 'hr' | 'sleep' | 'workout', value, unit, recordedAt, source }

/users/{uid}/healthDaily/{yyyy-mm-dd}
  { stepsTotal, hrAvg, hrMax, sleepMinutes, workouts: [...], byMetric: {...} }
```

**Why monthly:** Firestore's per-collection 10K-write/sec hot-spot is per-collection, not per-document path. Monthly buckets keep each subcollection write rate low even at scale; document counts manageable for queries.

**Daily aggregation Function:** `onDocumentWritten` trigger on `/users/{uid}/healthSamples/{yyyymm}/metrics/{id}` → schedule a Cloud Task delayed by 60s (debounce) → at fire time, aggregate the day's samples and `set(/healthDaily/{date})`. Debounce avoids recompute storms during sync bursts (a Garmin sync drops 2K samples in 5 seconds).

**Composite indexes:** `(metric ASC, recordedAt DESC)` per `healthSamples` subcollection for trend queries.

**Scale ceiling:** Pattern is good to ~10K DAU wearable users. Beyond that, write samples directly to BigQuery via a Function and keep only `healthDaily` in Firestore (deferred decision; Phase 3+).

**Code shape:** see Code Example 4.

**Key gotchas:**
- TTL policy on `healthSamples`: set `expireAt = recordedAt + 90 days` per LOPDP retention. Firestore TTL policy is GA; field-based with date type ([VERIFIED via WebSearch]).
- Never export `healthSamples` to BigQuery (per WEAR-09 + Pitfall #2 — write-cost blowup).
- Open Wearables 0.4.3 is pre-1.0; **fork at Phase 2 launch** per WEAR-04 (mitigates maintenance risk).

**Sources:**
- [Firestore time-series](https://firebase.google.com/docs/firestore/solutions/aggregation) [VERIFIED]
- [Firestore TTL](https://firebase.google.com/docs/firestore/ttl) [VERIFIED]
- [Open Wearables GitHub](https://github.com/the-momentum/open-wearables) [VERIFIED]
- STACK.md §3 [CITED]

**Confidence: HIGH** for schema; **MEDIUM** for "Firestore is sufficient at scale" (Phase 3 evaluation).

---

### §5. Offline QR check-in PWA

**Recommended approach:** vite-plugin-pwa `generateSW` + Workbox `BackgroundSyncPlugin` + signed-JWT QR payload.

**QR payload shape (signed JWT, generated at RSVP time):**
```
{ eventId, uid, exp: event.startsAt + 4h, iat, jti }
signed with HS256(SIGNING_KEY)
```

The JWT lives client-side in a `qrcode` PNG. At check-in, the organizer's `/events/:id/checkin` page uses `jsqr` to decode the camera frame → POSTs to `/api/events/:id/checkin` with `{ qrPayload, geo }`.

**Verification Function:**
```typescript
// functions/events/src/checkIn.ts
const Body = z.object({ qrPayload: z.string(), geo: z.object({ lat: z.number(), lng: z.number() }).optional() });
export const checkIn = onRequest(...,  async (req, res) => {
  const { qrPayload, geo } = Body.parse(req.body);
  const claims = jwt.verify(qrPayload, SIGNING_KEY);
  if (claims.exp < Date.now() / 1000) return res.status(410).end(); // expired
  // Geofence: event has venue { lat, lng, radiusMeters }; check distance
  if (geo && distanceFrom(claims.eventId, geo) > venue.radiusMeters) {
    return res.status(403).json({ error: 'OUT_OF_VENUE' });
  }
  // Idempotent write — claims.jti as deterministic doc ID
  await getFirestore().doc(`events/${claims.eventId}/attendance/${claims.uid}`).set({ checkedInAt: ... }, { merge: true });
  // Award XP via gamification Function (event)
  await pubsub.topic('xp-events').publishMessage({ json: { uid: claims.uid, type: 'event_attended', eventId: claims.eventId } });
  res.json({ ok: true });
});
```

**Code shape (Vite config + composable):** see Code Example 5.

**Key gotchas:**
- `vite-plugin-pwa` Background Sync has known browser quirks ([CITED: vite-pwa GitHub issues #739, #434]). Test on Chrome Android (primary Ecuador device per UI-SPEC) before Step 4 ships.
- iOS Safari 16.4+ supports Web Push but Background Sync is partial. Fallback: visible offline banner ("Sin señal — guardamos tu check-in") + manual flush on reconnect via `useOnline()` watcher.
- Signed JWT must use **server-side secret** (Cloud KMS or Secret Manager); never expose to PWA bundle.
- `jti` (JWT ID) is the deterministic attendance doc ID — write is idempotent (replay-safe).
- `registerType: 'prompt'` per UI-SPEC — auto-update mid-session can break consent flows.

**Sources:**
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) [VERIFIED]
- [Workbox BackgroundSync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync) [VERIFIED]
- [vite-pwa BG-sync issues](https://github.com/vite-pwa/vite-plugin-pwa/issues/739) [CITED]

**Confidence: MEDIUM** — Background Sync browser quirks make this the riskiest single feature in Phase 2. Test early.

---

### §6. Consent versioning + DSAR + erasure

**Versioned consent texts:**
- `vue-i18n` keys carry the version suffix: `consent.wearable_data.v3.purpose`, `consent.wearable_data.v3.scope`, `consent.wearable_data.v3.retention`.
- Firestore `/consentTexts/{category}/{version}` doc stores the **canonical** ES + EN text (immutable; new versions = new docs).
- At grant time, the consent doc records `{ category, version: 'v3', textHash: sha256(es) }`. The audit ledger captures the EXACT text the user saw.

**Hash-chained audit ledger (CNST-08):**
```typescript
// functions/consent/src/grant.ts
await getFirestore().runTransaction(async (tx) => {
  const lastLedger = await tx.get(...);                          // most recent ledger entry
  const payload = { uid, category, version, action: 'grant', textHash, timestamp };
  const hash = crypto.createHash('sha256')
    .update(`${lastLedger.hash}|${JSON.stringify(payload)}|${uid}|${timestamp}`)
    .digest('hex');
  tx.set(consentDocRef, { ...payload, status: 'granted' });
  tx.set(ledgerRef, { ...payload, hash, prevHash: lastLedger.hash });
  tx.set(auditRef, { ...payload, hash });
});
```

**DSAR export (CNST-10):**
- Async workflow: `consent-dsarExport` Function spawns a Cloud Task → walks `/users/{uid}/...` collections → writes a ZIP to Cloud Storage at `dsar-exports/{uid}/{requestId}.zip` → emits a signed URL with **7-day TTL** → emails via Resend.
- 30-day SLA per LOPDP (REQ-CNST-10). Status doc at `/users/{uid}/dsarRequests/{requestId}` for in-app progress.

**Erasure cascade (CNST-11):**
- 72-hour SLA. `consent-erasure` Function:
  1. **Soft-delete immediately:** mark profile `deletedAt`; revoke all consent tokens; sign user out.
  2. **72h hard-delete:** scheduled Function purges `/users/{uid}/...`, `/attendance/{uid}/*`, wearable subcollections, FCM tokens, KMS-encrypted refresh tokens.
  3. **Retain forever:** `/auditLog/*` and `/consentLedger/*` (pseudonymized — uid hash, no PII) per LOPDP audit retention.
  4. **Reverse chains:** in BigQuery, the user's `*_changelog` rows get a `deleted_at` flag; views filter `WHERE deleted_at IS NULL`.

**Key gotchas:**
- Hash chain must be **transactional** — if you write the consent doc but not the ledger, the chain breaks. `runTransaction` guarantees atomicity.
- DSAR file size cap: Storage signed URLs work for files up to GBs; if a user has 5 years of `healthSamples`, ZIP can be large — paginate the export and use Cloud Storage compose API.
- Erasure must NOT delete the audit ledger (legal retention conflict). Pseudonymize uid in the ledger if regulator demands.
- Re-consent on terms change (CNST-07): when a `consentTexts/{category}/{newVersion}` is published, sweep all `consents` docs with old version → mark `status: 'expired'` → next app open prompts re-grant.

**Sources:**
- [LOPDP retention requirements](https://www.spdp.gob.ec/) [CITED — Ecuador SPDP]
- [Cloud Storage signed URLs](https://cloud.google.com/storage/docs/access-control/signed-urls) [VERIFIED]
- [Firestore TTL](https://firebase.google.com/docs/firestore/ttl) [VERIFIED]

**Confidence: HIGH** for ledger + DSAR mechanics; **MEDIUM** for the exact 72h vs LOPDP audit-retention reconciliation — DPO + counsel must sign off the soft/hard-delete schedule before Step 2 ships.

---

### §7. Manual-first challenge data model

**Recommended approach:** Single `challenge_progress` write path that accepts manual / pedometer / wearable / photo entries; consent-gated by source.

**Schema:**
```
/users/{uid}/challengeEnrollments/{challengeId}
  { tier: 'bronce' | 'plata' | 'oro', enrolledAt, season, target, optInLeaderboard: bool }

/users/{uid}/challengeProgress/{progressId}
  { challengeId, source: 'manual' | 'pedometer' | 'wearable' | 'photo', value, unit, recordedAt, evidence?: string }
```

**Source consent matrix:**
| Source | Required consent |
|--------|------------------|
| `manual` | `health_self_reports` |
| `pedometer` (Web Sensor API) | `health_self_reports` (it's a self-report by another name) |
| `wearable` (Open Wearables webhook) | `wearable_data` |
| `photo` (community vouching) | `event_participation` (vouching is a social act) |

The `challenge-logProgress` Function calls `consentGate(source-specific category)` before writing.

**Native phone pedometer (CHLG-04):** Web Sensor API `Accelerometer` + on-device step counting via WebKit / Chromium accelerometer events. Fallback for browsers without the API: manual entry with photo attestation. **No third-party SDK** — Open Wearables is for connected devices; the phone-as-pedometer path is independent.

**Opt-in leaderboards (CHLG-08, CHLG-09):**
- Aggregate document at `/leaderboards/{period}/{cohort}` recomputed every 15 min by scheduled Function.
- Only users with `optInLeaderboard: true` AND `profile.public: true` appear.
- Anonymous participation option: user opts in but is rendered as `Anónimo #34` in the public board (per CHLG-08).

**Anti-cheat (CHLG-10, PROF-13):** Threshold rules per metric (DC-06 starter set):
- Steps: >100K/day rejected, 50K-100K flagged for moderator review.
- HR: <30 BPM or >220 BPM rejected.
- Sleep: >16 hours/night flagged.
- Geo inconsistency: check-in distance > venue radius rejected.
- Photo evidence required for Plata/Oro tiers when source = `manual`.

**Code shape (write path, all sources):**
```typescript
// functions/challenges/src/logProgress.ts
const Body = z.object({
  challengeId: z.string(),
  source: z.enum(['manual', 'pedometer', 'wearable', 'photo']),
  value: z.number(),
  unit: z.string(),
  evidence: z.string().optional(),
});
export const logProgress = onCall({ region: 'southamerica-east1' }, async (req) => {
  const { challengeId, source, value, unit, evidence } = Body.parse(req.data);
  const uid = req.auth!.uid;
  const requiredConsent = SOURCE_TO_CONSENT[source];
  await consentGate(uid, requiredConsent);
  if (!withinAntiCheatBounds(source, value, unit)) {
    return { status: 'flagged', reason: 'anti_cheat' };
  }
  await getFirestore().collection(`users/${uid}/challengeProgress`).add({
    challengeId, source, value, unit, evidence, recordedAt: FieldValue.serverTimestamp(),
  });
  // XP awarded via gamification Pub/Sub topic
  await pubsub.topic('xp-events').publishMessage({ json: { uid, type: 'challenge_progress', challengeId, value } });
  return { status: 'ok' };
});
```

**Sources:**
- [Web Sensor API spec](https://www.w3.org/TR/generic-sensor/) [VERIFIED]
- [Firestore aggregate documents](https://firebase.google.com/docs/firestore/solutions/aggregation) [VERIFIED]
- `.claude/skills/challenge-framework.md` [CITED]

**Confidence: HIGH** for write path; **MEDIUM** for anti-cheat thresholds (DC-06 — calibrate during Phase 1 focus group + Phase 2 alpha).

---

### §8. Firebase project skeleton (7 Cloud Function codebases + monorepo)

**Recommended approach:** Single repo, multi-codebase Firebase config, three workspace roots (`apps/`, `functions/`, `packages/`).

**`firebase.json` (codebase config):**
```json
{
  "functions": [
    { "codebase": "auth",         "source": "functions/auth",         "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "consent",      "source": "functions/consent",      "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "events",       "source": "functions/events",       "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "challenges",   "source": "functions/challenges",   "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "wearables",    "source": "functions/wearables",    "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "gamification", "source": "functions/gamification", "runtime": "nodejs22", "region": "southamerica-east1" },
    { "codebase": "b2b",          "source": "functions/b2b",          "runtime": "nodejs22", "region": "southamerica-east1" }
  ],
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
  "storage":   { "rules": "storage.rules" },
  "hosting":   { "site": "gamechangers", "public": "apps/pwa/dist", "rewrites": [...] }
}
```

**Region pinning:** `southamerica-east1` (São Paulo) is the closest LOPDP-defensible region — Firebase has no Ecuador region. Document this in DPIA per ARCHITECTURE.md and STACK.md.

**Independent CI/CD:** GitHub Actions matrix on `${{ matrix.codebase }}` — `firebase deploy --only functions:<codebase>` per merged PR scope. Saves cold-redeploy cost.

**Budget alerts (ARCH-06):**
```bash
gcloud billing budgets create \
  --billing-account=$BILLING \
  --display-name="GameChangers MVP" \
  --budget-amount=200 \
  --threshold-rule=percent=25 \   # $50
  --threshold-rule=percent=50 \   # $100
  --threshold-rule=percent=100    # $200
```

**Shared packages:**
- `packages/shared` exports zod schemas (consent docs, challenge progress, event RSVP), i18n key types (auto-generated from `locales/es.json`), and TypeScript types.
- All apps + Functions import from `packages/shared` — single source of truth.

**Key gotchas:**
- Cloud Functions v2 region is **immutable per function**. Pick `southamerica-east1` and never deviate.
- 7 codebases mean 7 `package.json` files — pin Node 22 in each.
- Emulator suite supports multi-codebase: `firebase emulators:start --only functions,firestore,auth,storage`.

**Sources:**
- [Firebase Functions multi-codebase](https://firebase.google.com/docs/functions/organize-functions) [VERIFIED]
- [Firestore locations](https://firebase.google.com/docs/firestore/locations) [VERIFIED]
- [Cloud Billing Budget API](https://cloud.google.com/billing/docs/how-to/budgets) [VERIFIED]
- ARCHITECTURE.md §7 codebases [CITED]

**Confidence: HIGH**.

---

### §9. Profile / character-sheet computation

**XP logarithmic curve (PROF-06):**
```
xpForLevel(n) = floor(100 * 1.5^(n - 1))   // exponential within tiers
totalXpForLevel(n) = sum(xpForLevel(1..n))

Tiers:
  1-10  Noob       (100 → 5,766 cumulative)
  11-20 Iniciado   (8K → 25K)
  21-30 Aventurero (35K → 100K)
  31-40 Veterano   (130K → 350K)
  41-50 Élite      (450K → 1.2M)
  51-60 Leyenda    (1.5M → 4M)
  61+   Mítico     (5M+)
```

This is the StartData/output/expert-product-ux.md §5.3 starting curve, slightly tuned. Final calibration during Phase 1 focus group (COMM-13). [ASSUMED] — exact curve numbers are starter values; calibrate against real attendance data.

**Streak entity (PROF-08):**
```
/users/{uid}/streaks/{trackId}
  { trackId: 'fitness' | 'social' | 'knowledge' | 'leadership',
    currentDays, longestDays, lastEventAt, shieldsRemaining }
```

Streaks are **per-track**, not global — a user can have 30 days of Fitness but 0 days of Social. Aligns with multi-progression tracks (PROF-10).

**Streak shield (PROF-09, DC-07):** 1 grace day per 7-day window. `shieldsRemaining` resets every 7 days. Missing a day decrements; missing two days breaks the streak. Plain-Spanish UI: "Te queda 1 escudo de racha esta semana".

**Multi-progression tracks (PROF-10):**
- HP (Health/Fitness) — drives off `healthDaily` aggregates + manual movement entries.
- Stamina (Endurance) — drives off long-format challenges (Streak type).
- Mente (Mental) — drives off content-completion + wellness assessments + Mental challenges.
- Social — drives off event attendance + community participation.

Each is a 0–100 stat shown on the character sheet (UI-SPEC §StatRow). Recomputed by `gamification-recomputeStats` scheduled Function (every 6h). **Shown for ALL users** even with 0 wearable data — manual entries + event attendance fill the bars.

**Badges with provenance (PROF-11):**
```
/users/{uid}/badges/{badgeId}
  { badgeId, earnedAt, source: 'event:abc' | 'challenge:xyz' | 'streak:fitness:30',
    tier: 'bronce' | 'plata' | 'oro' | null,
    signedClaim: '<HMAC-signed snapshot of source+timestamp>' }
```

Signed claim makes the badge non-forgeable — the bot can verify a badge by re-checking the HMAC.

**Discord role sync (PROF-14):** `gamification-discordRoleSync` Function → calls Discord REST API to add/remove role; the **bot only reads** — write happens server-side via Function with bot token.

**Sources:**
- expert-product-ux §5.3 XP starting values [CITED]
- `.claude/skills/community-ops.md` [CITED]

**Confidence: HIGH** for schema; **MEDIUM** for the exact XP curve coefficients (calibrate post-Phase 1).

---

### §10. Discord bot architecture

**Recommended approach:** discord.js 14.26 on **Compute Engine e2-micro** (NOT Cloud Run).

**Why e2-micro, not Cloud Run:**
- Discord Gateway requires a persistent WebSocket. Cloud Run min-instances=1 works but burns CPU 24/7 at higher cost.
- e2-micro: $5–7/mo with always-on Gateway. systemd-managed, auto-restart on crash. Within Spark→Blaze MVP budget.
- Cloud Run is justified at >2K daily commands or HA requirement; not Phase 2.

**Gateway intents (DBOT-02):** `Guilds`, `GuildMembers`, `GuildMessageReactions`. **NEVER** `MessageContent` — LOPDP minimization + Discord verification gate.

**Slash commands (DBOT-04):**
- `/link` → returns one-time link token + URL → user opens in browser → OAuth flow runs (§2)
- `/eventos` → calls `events-listUpcoming` HTTP Function → embeds top 5 events
- `/leaderboard` → reads `/leaderboards/{period}` aggregate doc via service-account READ → embeds top 10
- `/perfil` → reads user's `profile/main` and `level` via service-account READ
- `/reto` → reads active enrollments
- `/ayuda` → static crisis-resource embed (Línea 171 + backup)

**Bot's Firebase service account:**
- Role: `roles/firebase.viewer` (project-wide). Cannot write.
- Calls Function HTTP endpoints with HMAC + IP allow-list (DBOT-03):
  ```
  Authorization: HMAC-SHA256 t=<timestamp> sig=<hmac(timestamp + body)>
  ```
- Function middleware verifies HMAC + checks `req.ip` against bot's static Compute Engine IP.

**Slash command registration (CI):**
```typescript
// scripts/deploy-commands.ts
import { REST, Routes } from 'discord.js';
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
  { body: commands.map(c => c.data.toJSON()) }
);
```

Run in GitHub Actions on bot deploy.

**Quarterly TOS compliance audit (DBOT-07):** scripted check that bot's intents = `Guilds | GuildMembers | GuildMessageReactions` exactly; no message-storage Functions exist; bot service account has no Admin SDK roles. Runs in CI quarterly via cron.

**Key gotchas:**
- Cloud Functions cannot host the Gateway WebSocket — confirmed in STACK.md and Firebase docs.
- discord.js v14 requires Node 22.12+ ([VERIFIED via WebSearch]) — pin Node 22 LTS in Compute Engine image.
- Bot deploys are independent of Function deploys — bot has its own GitHub Actions workflow + systemd service unit.

**Sources:**
- [discord.js v14 docs](https://discordjs.guide/) [VERIFIED]
- [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2) [VERIFIED]
- ARCHITECTURE.md §5 [CITED]

**Confidence: HIGH**.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Anonymous Auth → full-account upgrade approach (b) — keep anonymous uid as canonical, write Discord identity into user's `private/discord` subcollection — is simpler than (a) merge logic | §2 | Wrong: user-experience corner cases (e.g., user signs up with email FIRST, then links Discord that already has an anonymous record); resolution = ADR-008 during Step 1 |
| A2 | XP curve starting coefficients (`100 * 1.5^(n-1)`) are reasonable defaults | §9 | Wrong: levels feel too fast/slow → re-tune during Phase 1 focus group; cheap to change |
| A3 | Streak shield = 1 grace day per 7-day window is the right retention/strictness balance | §9, DC-07 | Wrong: too lenient = no streak meaning; too strict = brutal resets; A/B test post-launch |
| A4 | Differential privacy `epsilon = 1.0` is a defensible starting value | §3 | Wrong: too high = leaks; too low = noise overwhelms signal; calibrate in Phase 3 with first partner |
| A5 | Cloud Storage signed URL with 7-day TTL meets LOPDP DSAR portability requirement | §6 | Wrong: regulator may demand 30-day URL; trivial fix |
| A6 | Compute Engine e2-micro at $5–7/mo fits MVP infra budget ($25–100/mo) with FB Spark→Blaze | §10 | Wrong: under-provisioned for >50 events/mo; upgrade to e2-small ($14/mo) is one command |
| A7 | LOPDP 72h erasure SLA is consistent with audit-ledger retention (pseudonymize uid) | §6 | Wrong: counsel demands hard-delete from audit log too; conflict between LOPDP rights — needs DPO sign-off |
| A8 | Anti-cheat thresholds (>100K steps/day, <30 BPM, >220 BPM, >16h sleep) are reasonable starter values | §7, DC-06 | Wrong: false positives reject legit Oro-tier users; tune based on community-baseline data from Phase 1 |
| A9 | Native Web Sensor API pedometer is reliable enough on Chrome Android (primary device per UI-SPEC) | §7 | Wrong: too inaccurate to be useful; fallback = manual + photo |

**These assumptions need confirmation during plan-phase or first-execution.** Highest-risk: A1 (architectural — affects every later step), A4 (regulatory — affects B2B sign-off), A7 (legal — affects DPO sign-off).

## Open Questions

1. **Anonymous → full-account upgrade merge strategy** (A1)
   - What we know: `linkWithCustomToken` doesn't directly support custom-token providers; documented patterns vary.
   - What's unclear: which path is least bug-prone for Discord-first vs email-first signup orderings.
   - Recommendation: ADR-008 during Step 1; default to "anonymous uid is canonical" approach.

2. **Differential privacy ε calibration** (A4)
   - What we know: BigQuery DP is GA, ε is a tunable knob.
   - What's unclear: real partner query patterns (which the project doesn't have until Phase 3).
   - Recommendation: ship `ε=1.0` placeholder; document in B2BD-05 task for Phase 3 tuning.

3. **LOPDP audit-ledger retention vs erasure right reconciliation** (A7)
   - What we know: Both rights exist in LOPDP.
   - What's unclear: whether pseudonymized-uid retention is sufficient for the SPDP.
   - Recommendation: DPO sign-off required before Step 2 (consent engine) ships. Block the step on this.

4. **Vite-plugin-pwa Background Sync iOS Safari coverage**
   - What we know: Background Sync is partial on iOS; Web Push is GA on iOS 16.4+.
   - What's unclear: how often the iOS gap will bite real users.
   - Recommendation: ship the visible offline-banner fallback first; instrument PostHog to measure the gap; plan an iOS-specific path only if data warrants.

5. **Open Wearables 0.4.x maintenance trajectory** (WEAR-04)
   - What we know: Pre-1.0; MIT license; recent activity; no Node SDK.
   - What's unclear: long-term maintainer commitment.
   - Recommendation: fork at Phase 2 launch (already in roadmap as WEAR-04); pin to 0.4.3; subscribe to release feed; budget for fork-and-maintain in Phase 4.

## Environment Availability

Skipping detailed audit — Phase 2 is greenfield with no existing services to probe. Required dependencies for execution:

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Firebase CLI | All Function/Hosting deploys | TBD (Step 0 task) | ^15.15.0 | — (mandatory) |
| Node 22 LTS | Functions runtime + bot + dev | TBD | ≥22.12 | — (mandatory for discord.js v14) |
| GCP project + billing | All cloud infra | TBD | — | — (mandatory) |
| Discord Developer App | Bot + OAuth2 | TBD (Step 0 task) | — | — (mandatory) |
| Resend account | Transactional email | TBD | — | Postmark (alternate) |
| Sentry account | Error monitoring | TBD | — | Postpone to Step 4 only if blocked |
| PostHog (self-hosted) | Funnel analytics | TBD (Step 0 deploy) | latest | PostHog Cloud (privacy concession) |
| Compute Engine e2-micro | Discord bot | TBD (Step 1) | Node 22 image | Hetzner CX22 ($5/mo) — same architecture |
| Open Wearables FastAPI VPS | Wearable webhook source | TBD (Step 6) | 0.4.3 | Manual entry only (degraded experience but functional) |
| Cloud KMS key ring | Refresh token encryption | TBD (Step 0) | — | — (mandatory for AUTH-11) |

**All dependencies are provisioning tasks for Step 0 / appropriate steps; nothing is missing as a fallback-blocker.**

## Validation Architecture

Per the `additional_context` notes, **Nyquist sampling-validation is disabled for this run.** Including this section anyway because the planner needs to know how each layer is tested.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.5 (unit + component); @firebase/rules-unit-testing 5.0 (Rules); firebase-functions-test 3.4.1 (Functions); Playwright 1.59.1 (E2E) |
| Config files | `vitest.config.ts` per workspace; `firestore.rules` tested by Vitest in `tests/rules/`; `playwright.config.ts` at repo root |
| Quick run command | `pnpm vitest run --changed` (per package) |
| Full suite command | `pnpm test:all` → Vitest + rules + Functions + Playwright |
| Phase gate | All four green before `/gsd-verify-work` |

### Phase Requirements → Test Map (selected; full mapping in plan-phase)

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ARCH-04 | Deny-all default Rules | Rules unit | `vitest tests/rules/baseline.test.ts` | ❌ Wave 0 |
| ARCH-05 | 90% rules-unit-testing CI gate | Rules unit | `vitest tests/rules/ --coverage` | ❌ Wave 0 |
| AUTH-01 | Anonymous Auth on first open | Component | `vitest apps/pwa/src/views/__tests__/Boot.test.ts` | ❌ Wave 0 |
| AUTH-06 | Discord OAuth callback exchange + custom token | Function unit | `vitest functions/auth/src/__tests__/discordExchange.test.ts` | ❌ Wave 0 |
| AUTH-09 | Anonymous → email upgrade preserves XP | E2E | `playwright test specs/auth-upgrade.spec.ts` | ❌ Wave 0 |
| AUTH-11 | KMS-encrypted refresh tokens | Function unit | `vitest functions/auth/src/__tests__/kms.test.ts` | ❌ Wave 0 |
| CNST-05 | Revoke immediately stops processing | Rules unit + integration | `vitest tests/rules/consent.revoke.test.ts` | ❌ Wave 0 |
| CNST-08 | Hash-chained ledger transactionality | Function unit | `vitest functions/consent/src/__tests__/grant.test.ts` | ❌ Wave 0 |
| CNST-13 | Two-layer enforcement (Rules + middleware) | Rules + Function unit | `vitest tests/rules/consent.gate.test.ts && vitest functions/shared/__tests__/consentGate.test.ts` | ❌ Wave 0 |
| EVNT-06 | QR check-in JWT verification | Function unit | `vitest functions/events/src/__tests__/checkIn.test.ts` | ❌ Wave 0 |
| EVNT-07 | Offline check-in queues + flushes | Playwright + service worker mock | `playwright test specs/events-offline-checkin.spec.ts` | ❌ Wave 0 |
| WEAR-05 | HMAC signature verification | Function unit | `vitest functions/wearables/src/__tests__/webhook.test.ts` | ❌ Wave 0 |
| CHLG-09 | Aggregate doc leaderboard (no onSnapshot) | ESLint + integration | `eslint apps/pwa/src/ && vitest tests/integration/leaderboard.test.ts` | ❌ Wave 0 |
| DBOT-02 | No MessageContent intent | Compliance check | `vitest apps/discord-bot/src/__tests__/intents.test.ts` | ❌ Wave 0 |
| A11Y-03 | WCAG 2.1 AA color contrast | Playwright + axe-core | `playwright test specs/a11y.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Vitest changed-only (`pnpm vitest run --changed`)
- **Per wave merge:** full Vitest + Rules + Functions
- **Phase gate:** all four (Vitest + Rules + Functions + Playwright) green before `/gsd-verify-work`

### Wave 0 Gaps
All test infrastructure must be provisioned in Step 0:
- [ ] `vitest.config.ts` per workspace
- [ ] `tests/rules/` directory with baseline + per-category test files
- [ ] `firebase.json` emulator suite config
- [ ] Playwright + axe-core install + baseline `playwright.config.ts`
- [ ] CI matrix workflow (`.github/workflows/test.yml`) — runs all four on PR
- [ ] ESLint config with `no-restricted-syntax` rule on `onSnapshot` (ARCH-07)

## Security Domain

`security_enforcement` is enabled by default (no opt-out in CLAUDE.md). Phase 2 touches all six high-risk ASVS categories.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Firebase Auth (anonymous + email + custom-token Discord); KMS-encrypted refresh tokens; AUTH-11 |
| V3 Session Management | yes | Firebase Auth ID tokens (1h TTL, refresh via SDK); session persistence across browser refresh (AUTH-05) |
| V4 Access Control | yes | Two-layer consent enforcement (Rules + middleware); custom claims for hot paths; deny-all baseline (ARCH-04) |
| V5 Input Validation | yes | zod 4.3 on every Function HTTP/callable input; Discord interaction payload schemas; eslint-plugin-vue-i18n forbids inline strings |
| V6 Cryptography | yes | Cloud KMS for refresh tokens (never hand-rolled); HMAC-SHA256 with `timingSafeEqual` for webhook + bot-to-Function calls; signed JWT for QR check-ins |
| V7 Error Handling/Logging | yes | Sentry with `beforeSend` PII scrubbing (ARCH-08); plain-Spanish user-facing error messages (UI-SPEC §Error states); audit ledger for all consent state changes |
| V13 API & Web Service | yes | Functions v2 callable + HTTPS; CORS allow-list (PWA origin only); HMAC + IP allow-list for bot↔Function |
| V14 Configuration | yes | Region pinned to `southamerica-east1`; secrets in Cloud Secret Manager (not env files committed to git) |

### Known Threat Patterns for Vue 3 + Firebase + Discord stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via user-generated content (event description, profile, challenge log evidence) | Tampering | Vue 3 template auto-escape (default); zod-validated server side; reject HTML in text fields |
| CSRF on Cloud Function callable | Spoofing | Firebase callables include auth context automatically; HTTP endpoints require Firebase ID token |
| Discord OAuth open-redirect | Spoofing | Strict `redirect_uri` allow-list at Discord developer console; state + PKCE verification |
| Refresh token leak | Information Disclosure | KMS encryption at rest (AUTH-11); never log; rotate on every refresh |
| HMAC timing attack on webhook | Tampering | `crypto.timingSafeEqual`; never `===` |
| Re-identification via small-cohort B2B query | Information Disclosure | Schema-level `HAVING COUNT(DISTINCT) >= 50` + ε-DP; views materialized; Metabase service account has zero raw access |
| Replay of QR check-in | Tampering | JWT `jti` as deterministic doc ID; idempotent write; `exp` ≤ event end + 4h |
| Privilege escalation via custom-claim spoofing | Elevation | Custom claims set ONLY by Functions service account; client cannot write to claims |
| Discord TOS violation via message scraping | Repudiation | Bot intents exclude `MessageContent`; quarterly compliance audit (DBOT-07) |
| Audit ledger tampering | Repudiation | Hash chain (SHA-256 of prev+payload+timestamp+uid); transactional write; deny-all client write to `/auditLog`/`/consentLedger` |
| Minor data B2B leak | Information Disclosure | `is_minor: bool` flag; every B2B view filters `is_minor = FALSE` (D-14) |
| Erasure incomplete (data persists in BigQuery exports) | Compliance | `deleted_at` flag in changelog; views filter `WHERE deleted_at IS NULL`; soft-delete cascades to BigQuery within 24h |

## Sources

### Primary (HIGH confidence)
- [Firebase Custom Auth](https://firebase.google.com/docs/auth/web/custom-auth) — Discord bridge pattern
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) — 1000-byte limit; bitmap pattern
- [Firebase Rules Conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) — `get()` cost; `request.auth.token`
- [Firebase Functions multi-codebase](https://firebase.google.com/docs/functions/organize-functions) — 7-codebase config
- [Firebase Firestore aggregation](https://firebase.google.com/docs/firestore/solutions/aggregation) — write-time aggregations; aggregate-doc pattern
- [Firebase Firestore TTL](https://firebase.google.com/docs/firestore/ttl) — 90-day retention on `healthSamples`
- [Firebase Firestore→BigQuery Extension](https://extensions.dev/extensions/firebase/firestore-bigquery-export) — official sync
- [BigQuery Differential Privacy](https://cloud.google.com/bigquery/docs/differential-privacy) — GA `WITH DIFFERENTIAL_PRIVACY`
- [BigQuery DP aggregate functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate-dp-functions) — epsilon, delta, max_groups_contributed
- [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2) — state, PKCE, no OIDC discovery
- [discord.js Guide v14](https://discordjs.guide/) — slash commands, intents, REST registration
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) — generateSW, registerType
- [Workbox BackgroundSync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync) — IDB queue + retry
- [Open Wearables GitHub](https://github.com/the-momentum/open-wearables) — webhook integration, MIT, 0.4.3
- [VueFire docs](https://vuefire.vuejs.org/) — Vue 3 ⇄ Firebase reactive bindings
- `.planning/research/STACK.md` (npm-verified 2026-04-27) — all version pins
- `.planning/research/ARCHITECTURE.md` — 7-codebase organization, time-series schema
- `.planning/research/PITFALLS.md` — 9 design-time pitfalls
- `.planning/phases/02-platform-mvp/02-CONTEXT.md` — 17 locked decisions
- `.planning/phases/02-platform-mvp/02-UI-SPEC.md` — visual contract

### Secondary (MEDIUM confidence)
- [`nawodyaishan/discord-firebase-auth`](https://github.com/nawodyaishan/discord-firebase-auth) — reference impl
- [`luizkc/firebase-discord-oauth2-example`](https://github.com/luizkc/firebase-discord-oauth2-example) — reference impl
- [vite-pwa Background Sync issues #739, #434](https://github.com/vite-pwa/vite-plugin-pwa/issues/739) — known browser quirks
- WebSearch findings 2026-04-28: aggregation queries don't support onSnapshot (canonical aggregate-doc pattern)

### Tertiary (LOW — needs validation)
- Differential privacy ε starting value — A4 in Assumptions Log; calibrate Phase 3
- Anti-cheat thresholds — A8 in Assumptions Log; calibrate post-Phase 1
- LOPDP 72h erasure vs audit-ledger retention reconciliation — A7; DPO sign-off mandatory

## Project Constraints (from CLAUDE.md)

The CLAUDE.md and STACK.md content embedded in the system reminder is the authoritative constraint set. Key directives the planner MUST verify compliance with:

1. **Stack:** Vue 3 + Firebase ONLY. Do NOT propose React/NestJS/Supabase/PostgreSQL.
2. **Region:** All Cloud Functions and Firestore in `southamerica-east1`. Region is immutable.
3. **Functions API:** v2 only (`firebase-functions/v2/...`); never v1.
4. **Discord intents:** `Guilds | GuildMembers | GuildMessageReactions` ONLY. Never `MessageContent`.
5. **Bot ↔ Firebase:** ZERO Admin SDK access from bot. Bot calls Function HTTP with HMAC + IP allow-list.
6. **Bot host:** Compute Engine e2-micro (NOT Cloud Run, NOT Cloud Functions — Gateway WebSocket needed).
7. **Compliance gate:** DPIA + DPO sign-off **before** any health-data collection. Step 2 (consent) cannot ship without DPO sign-off on the audit-retention vs erasure reconciliation (A7).
8. **k-anonymity floor:** k≥50 enforced at SCHEMA level (`HAVING COUNT(DISTINCT user_id) >= 50` in BigQuery views). Never trust query-time enforcement.
9. **B2B raw access:** Metabase service account has SELECT on `gw_b2b_views` only; ZERO access to `gw_analytics` raw mirror.
10. **Refresh token storage:** Cloud KMS-encrypted at rest. Never plaintext.
11. **Anonymization:** Treat all behavioral/health data as personal data; small Ecuador gamer pop makes true anonymization technically near-impossible.
12. **Language:** ES-first (LATAM "tú"); gaming terms in EN universally; consent texts legally equivalent across languages.
13. **Anti-feature: auto-medical alerts** from wearable patterns. Concerning patterns surface content + crisis resources only.
14. **Anti-feature: surface gamification** (spin-the-wheel, collect-stars). Gaming-themed XP/badges with provenance, never naked mechanics.
15. **Budget:** MVP infra target $25–100/mo. GCP budget alerts at $50/$100/$200 (ARCH-06).
16. **Test infra:** 90% rules-unit-testing CI gate (ARCH-05). Mandatory before Step 1 (AUTH) ships.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm-verified 2026-04-27 in STACK.md.
- Architecture skeleton: HIGH — 7-codebase pattern + monthly bucket time-series + two-tier B2B all confirmed in research/ARCHITECTURE.md.
- Discord bridge: HIGH for custom-token pattern; MEDIUM for anonymous→full upgrade (A1, ADR-008 needed).
- BigQuery DP: HIGH for mechanics; MEDIUM for ε calibration (A4, Phase 3 task).
- Offline QR check-in: MEDIUM — Background Sync browser quirks are real; iOS Safari partial.
- Wearable schema: HIGH for monthly+rollup; MEDIUM for ~10K DAU scale ceiling (Phase 3 evaluation).
- Audit-ledger ↔ erasure reconciliation: MEDIUM — DPO + counsel sign-off required (A7).

**Research date:** 2026-04-28
**Valid until:** 2026-05-28 (30 days; stack is locked, but verify Firebase SDK + discord.js minor versions before Step 0 starts)

---

## RESEARCH COMPLETE

All 10 focus areas covered with concrete approaches, code shapes, gotchas, and confidence levels. CONTEXT.md locked decisions (17) and UI-SPEC.md visual contract are honored throughout. Architecture skeleton is HIGH confidence; the three MEDIUM-confidence areas (anonymous-upgrade merge, ε-DP calibration, audit-vs-erasure reconciliation) are flagged in Assumptions Log with mitigation paths (ADR-008, Phase 3 task, DPO sign-off gate).

Planner can now create PLAN.md files for Steps 0–6 in dependency order. Each step's plan should reference the corresponding focus-area section in this research for code-shape and gotcha context.
