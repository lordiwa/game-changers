# Architecture Patterns — Gamer Wellness (Vue 3 + Firebase)

**Domain:** Gaming + wellness community platform with consent-gated health data, B2B aggregated dashboards, IRL events, and Discord-as-firewall community layer.
**Researched:** 2026-04-27
**Translation source:** `StartData/output/expert-architect.md` (Supabase/NestJS/RN — SUPERSEDED) translated through the locked Vue 3 + Firebase stack per `project-definition.md` §5 and `.planning/PROJECT.md` constraints.

---

## Recommended Architecture

### One-Liner

A **serverless event-driven Firebase architecture** with a **Vue 3 PWA frontend**, **Cloud Functions Gen 2** organized by codebase domain, **Firestore as system-of-record** with consent-gated Security Rules, **BigQuery as analytics warehouse** (fed by the official Firestore→BigQuery extension), **Metabase B2B portal** querying BigQuery only, and a **Discord bot deployed on Compute Engine e2-micro** (NOT Cloud Run) so the Discord Gateway WebSocket stays persistent. The fundamental constraint — the **Discord/Platform firewall (ADR-001)** — is preserved verbatim from the older expert doc.

### System Diagram

```
                          +---------------------------------+
                          |    EXTERNAL CONSUMERS           |
                          |  (B2B partners → Metabase)      |
                          +----------------+----------------+
                                           |
                                  Read-only SQL on
                                  k≥50 enforced views
                                           |
                          +----------------v----------------+
                          |          BIGQUERY               |
                          |   - mirror_* tables (raw)       |
                          |   - bq_segments_k50 (views)     |
                          |   - daily/weekly aggregates     |
                          +----------------^----------------+
                                           |
                       Firestore→BigQuery extension
                       (streaming, per-collection)
                                           |
+----------------------+    +--------------+--------------+    +------------------------+
|  DISCORD BOT         |    |   CLOUD FUNCTIONS Gen 2     |    |  WEARABLE INGESTION    |
|  (discord.js v14,    |    |   (Node.js / TypeScript)    |    |  (Open Wearables +     |
|   Compute Engine     |    |                             |    |   HealthKit / Health   |
|   e2-micro VM —      |    | codebases:                  |    |   Connect via PWA)     |
|   NOT Cloud Run)     |    |  - auth     (callable)      |    |                        |
|                      |    |  - consent  (callable + log)|    | - PWA bridges native   |
| - Slash commands     |    |  - events   (Firestore trig)|    |   stores via Capacitor |
| - OAuth identity     |    |  - challenges (Firestore)   |    |   (Phase 3+, optional) |
|   bridge to platform |    |  - wearables (HTTP webhook) |    | - Open Wearables       |
| - Read-only embeds   |    |  - gamification (Firestore) |    |   self-hosted on       |
|   (leaderboards,     |    |  - b2b      (callable)      |    |   Cloud Run for OAuth  |
|   event reminders)   |    |  - scheduled (Cloud Sched.) |    |   webhook receivers    |
+--------+-------------+    +-------+---+-------+---+-----+    +------------+-----------+
         |                          |   |       |   |                       |
         | OAuth2 link              |   |       |   |                       |
         | (identity ONLY,          |   |       |   |                       |
         |  no msg content)         |   |       |   |                       |
         v                          v   v       v   v                       v
+-----------------------------------+---+-------+---+----------------------+---------+
|                                                                                    |
|              FIRESTORE (Native mode, southamerica-east1 / São Paulo)               |
|                                                                                    |
|  /users/{uid}                  /events/{eventId}             /challenges/{cid}     |
|  /users/{uid}/profile/main     /events/{e}/attendance/{uid}  /challenges/{c}/      |
|  /users/{uid}/consents/{cat}                                  participation/{uid}  |
|  /users/{uid}/healthData/{m}   /clubs/{clubId}                                     |
|    (subcollection, time-       /clubs/{c}/members/{uid}      /achievements/{aid}   |
|     bucketed by yyyy-mm)       /partners/{pid} (admin-only)  /userAchievements/{x} |
|  /users/{uid}/healthDaily/     /campaigns/{campId}                                 |
|    {yyyy-mm-dd}  ← rollups                                                          |
|                                                                                    |
|  /auditLog/{logId}    ← append-only, no client write, Functions service-acct only  |
|  /consentLedger/{eId} ← immutable hash chain, Functions service-acct only          |
|                                                                                    |
|  Security Rules: consent-gated on every read/write of personal/health data.        |
|  Triggers: onCreate/onUpdate fire Cloud Functions (gamification, BQ mirror, audit) |
|                                                                                    |
+----+-----------------------------+---------------------+--------------------------+
     |                             |                     |
     v                             v                     v
+--------------+        +---------------------+   +------------------+
| Firebase     |        | PostHog             |   | Firebase Storage |
| Auth         |        | (self-hosted on     |   | - Event photos   |
| - Discord    |        |  Cloud Run, EU      |   | - Avatars        |
|   OAuth2     |        |  region for cost)   |   | - Export bundles |
| - Email/Pwd  |        | - Funnels           |   |   (LOPDP DSAR)   |
| - Custom     |        | - Feature flags     |   +------------------+
|   claims for |        | - Session replay    |
|   roles      |        +---------------------+
+------+-------+
       |
       v
+--------------------------------------------------------------------+
|         VUE 3 PWA  (Vite + Pinia + VueFire + Firebase Hosting)     |
|  - Public: landing / blog / events listing / SEO (vite-ssg)        |
|  - Auth: register / login / Discord-link callback                  |
|  - Profile: /me — XP, badges, streak (gaming "character sheet")    |
|  - Consent: /me/consent — 10-toggle UI, history, revoke            |
|  - Events: /events, /events/:id — RSVP, QR check-in (camera API)   |
|  - Challenges: /challenges — Bronce/Plata/Oro tiers, manual entry  |
|  - Wearables: /me/wearables — connect Apple/Health Connect/Fitbit  |
|  - Partners: /partners/* — separate route group, custom claim gate |
|  - Service worker: offline event check-in, background wearable sync|
+--------------------------------------------------------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | Tech |
|-----------|----------------|-------------------|------|
| **Vue 3 PWA** | All user-facing UI (consumer + B2B portal as separate route group). Direct Firestore reads via VueFire (RLS-equivalent via Security Rules). Mutations via callable functions. PWA install + offline event check-in. | Firebase Auth, Firestore (reads), Cloud Functions (callable for mutations), Firebase Storage (signed URLs) | Vue 3, Vite, Pinia, VueFire, vue-i18n, vite-plugin-pwa |
| **Firebase Auth** | Identity: Discord OAuth2 (primary path from community), email/password (fallback). Custom claims: `role`, `partner_id`, `is_minor`, `dpo`. | PWA, Cloud Functions | Firebase Auth + Discord OIDC custom provider via `signInWithCredential` |
| **Cloud Functions Gen 2** | All write paths, all consent checks, all gamification, all B2B query gateways. Organized into 7 codebases (see §"Cloud Function Organization") so deploys of one domain don't redeploy everything. | Firestore (CRUD + triggers), BigQuery (admin SDK for B2B), Auth (custom claims), Discord bot (HTTP webhook for notification dispatch), Open Wearables webhook receiver | Node 20, TypeScript, firebase-functions/v2 |
| **Firestore** | System-of-record for all user, event, challenge, consent, audit data. Native mode, `southamerica-east1` region. Time-series (wearable raw) lives in user-scoped subcollections, bucketed by month. Rollups in `/healthDaily/` for fast PWA reads. | PWA (read), Cloud Functions (read/write), BigQuery extension (stream out) | Firestore Native, multi-region NOT used (cost + LOPDP residency) |
| **BigQuery** | Analytics warehouse + Metabase data source. Fed by official `firestore-bigquery-export` extension (one install per mirrored collection). Materialized views enforce k≥50 anonymization at query time. **No B2B query ever touches Firestore directly.** | Firestore extension (write), Metabase (read), Cloud Functions (occasional batch jobs) | BigQuery, scheduled SQL queries for daily aggregates |
| **Metabase (B2B Dashboard)** | Embedded in PWA `/partners/dashboard` via signed JWT iframe. Queries ONLY BigQuery `bq_segments_k50` views. Partner sees only categories their `Partner.data_categories_authorized` permits. Compliance badge auto-rendered on every export. | BigQuery (read-only service account), PWA (embed), Cloud Functions (signed JWT mint, audit log of every export) | Metabase OSS, self-hosted on Cloud Run (min-instances=0 OK; sessions are short) |
| **Discord Bot** | Slash commands (`/link`, `/eventos`, `/leaderboard`, `/perfil`, `/reto`), event reminder embeds, leaderboard posts. **Read-only consumer of platform data via callable functions.** Zero data collection — no `MessageContent` intent. | Discord Gateway (WebSocket — persistent), Cloud Functions HTTP endpoints (read-only), Firebase Admin SDK ONLY for resolving `discord_id`→`uid` during OAuth link | discord.js v14, Node 20, **Compute Engine e2-micro VM** (~$6/mo) — NOT Cloud Run (see §"Discord Bot Hosting Decision") |
| **Open Wearables Service** | OAuth2 callback receiver for Fitbit/Garmin/Polar/Withings, normalizes to common schema, forwards to `wearable-webhook` Cloud Function. | Wearable vendor APIs (OAuth + webhooks), Cloud Functions (HTTP POST to `/wearables/ingest`) | Open Wearables (MIT, self-hosted), Cloud Run (warm-up not required; webhook latency tolerant), eventually replaced by direct Capacitor plugins for HealthKit/Health Connect on mobile-installed PWA |
| **PostHog (self-hosted)** | Product analytics, funnels, feature flags. Separate from Firebase Analytics (which feeds Google's pipeline; PostHog gives data sovereignty). | PWA (JS SDK), Cloud Functions (server-side events for backend funnels) | PostHog OSS, Cloud Run, EU region |
| **Firebase Storage** | Event cover photos, user avatars, DSAR export bundles (signed URLs, 7-day TTL). | PWA (upload via signed URL), Cloud Functions (export generator) | Firebase Storage, same region as Firestore |
| **Cloud Scheduler** | Cron triggers for: weekly leaderboard digest to Discord, daily health rollup recalc, monthly LOPDP audit job, consent expiry sweeper. | Cloud Functions (HTTP callable trigger) | Cloud Scheduler (free tier covers 3 jobs; we'll have ~6) |

### Data Flow — Critical Paths

#### Flow 1: Discord-to-App Onboarding (UC-1)

```
Gamer in Discord
  → /link slash command (Discord Bot on GCE)
  → Bot generates one-time PKCE code, posts deep-link DM
  → User clicks link → opens PWA /auth/discord-callback?code=...
  → PWA calls Cloud Function `auth-discordExchange` (callable)
  → Function exchanges code with Discord OAuth2, gets discord_id + email
  → Function creates Firebase Auth user (or links to existing by email)
  → Function writes /users/{uid} doc with discord_id, locale='es-EC'
  → Function sets custom claim {discord_linked: true}
  → PWA receives custom token, signs in via signInWithCustomToken
  → PWA navigates to /onboarding (consent capture flow — basic_profile only)
```

#### Flow 2: Granular Consent Capture (UC-4)

```
PWA /me/consent UI (10 toggles, individually revocable)
  → User toggles `wearable_data` to ON
  → PWA calls Cloud Function `consent-grant` (callable, NOT direct Firestore write)
  → Function writes /users/{uid}/consents/wearable_data with:
      {status: 'granted', granted_at, expires_at: +12mo, ip, user_agent,
       version: 3, purpose_text: <verbatim text user saw>, hash_prev}
  → Function appends to /consentLedger with hash chain (immutable, append-only)
  → Function appends to /auditLog (actor=user, action='consent.grant')
  → Function streams to BigQuery via extension (audit_consent_changes table)
  → Returns success → PWA shows confirmation + revocation link
```

#### Flow 3: Wearable Time-Series Ingestion (UC-3 dependency)

```
Apple Watch syncs to iPhone HealthKit
  → PWA running as installed PWA on iOS (or Capacitor wrapper Phase 3+)
  → vite-plugin-pwa background sync queues last 24h delta
  → POST to Cloud Function `wearables-ingestBatch` with array of metrics
  → Function FIRST checks Firestore Security Rules equivalent in code:
      get /users/{uid}/consents/wearable_data → must be granted+unexpired
      (defense-in-depth: Security Rules ALSO enforce this on the writes below)
  → Function writes to /users/{uid}/healthData/{yyyy-mm}/metrics/{auto-id}
      (subcollection bucketed by month — keeps any single doc list <10k entries)
  → Function updates /users/{uid}/healthDaily/{yyyy-mm-dd} rollup doc
      (atomic transaction: increment steps, recompute averages)
  → Firestore trigger `gamification-onHealthDailyUpdate` fires:
      → Recalc challenge progress for active /challenges/.../participation/{uid}
      → Award XP if thresholds crossed → write /users/{uid}/profile/main {xp+=N}
      → If achievement unlocked → write /userAchievements/{x}
  → Firestore→BigQuery extension streams /healthDaily mirror to BQ
      (raw metric collection NOT mirrored to BQ — too high volume; rollups only)
```

#### Flow 4: B2B Dashboard Query (UC-5)

```
Partner logs into /partners (separate Firebase Auth tenant, custom claim {partner_id})
  → PWA loads Metabase iframe with signed JWT (minted by Cloud Function `b2b-mintToken`)
  → Metabase queries BigQuery view: bq_segments_k50_brand
      Definition: SELECT segment, AVG(steps), AVG(active_min), COUNT(*) as n
                  FROM healthDaily_mirror
                  WHERE consent_b2b_brands = TRUE
                  GROUP BY segment
                  HAVING n >= 50  ← k-anonymity hard gate at SQL level
  → Result rows < k=50 simply do not appear (not "redacted" — never returned)
  → Every Metabase query logged via BQ audit logs + custom Cloud Function `b2b-onQuery`
      writes to /auditLog with partner_id, query_hash, row_count
```

#### Flow 5: Event Check-In (UC-2, offline-tolerant)

```
At venue (poor connectivity):
  → Volunteer opens PWA /events/{id}/checkin (works offline via service worker)
  → Camera scans attendee QR (signed JWT containing {event_id, uid, exp})
  → PWA queues check-in in IndexedDB if offline
  → On reconnect, batch POSTs to Cloud Function `events-checkInBatch`
  → Function verifies JWT signature, checks event_participation consent
  → Writes /events/{id}/attendance/{uid} {checked_in_at, method:'qr_code'}
  → Trigger awards XP, fires push notification "You earned 50 XP!"
```

---

## Patterns to Follow

### Pattern 1: Consent-Gated Firestore Security Rules

**What:** Every read/write of personal or health data is gated by a Security Rule that checks the user's active consent for the relevant category. The consent doc lives at `/users/{uid}/consents/{category}` so it's cheap to fetch (single `get()` call inside rules — Firestore allows up to 10 per request).

**When:** All collections holding personal data: `healthData`, `healthDaily`, `attendance`, `challengeParticipation`, `clubMembership` (location data).

**Example — Firestore Security Rules translation of the SQL RLS in expert-architect.md §Appendix:**

```js
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check active consent for a category
    function hasConsent(uid, category) {
      let c = get(/databases/$(database)/documents/users/$(uid)/consents/$(category));
      return c.data.status == 'granted'
          && c.data.expires_at > request.time;
    }

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function hasRole(role) {
      return request.auth != null && request.auth.token.role == role;
    }

    // Users own their identity doc
    match /users/{uid} {
      allow read: if isOwner(uid);
      allow write: if false;  // Only Cloud Functions write here (admin SDK bypass)

      // Profile is readable by anyone if public_visibility=true
      match /profile/main {
        allow read: if isOwner(uid)
                  || resource.data.public_visibility == true;
        allow write: if false;  // Functions only — gamification updates xp/level
      }

      // Consents — user can read own, only Functions can write (for audit chain)
      match /consents/{category} {
        allow read: if isOwner(uid);
        allow write: if false;
      }

      // Health data raw — strict consent gate, owner-only read
      match /healthData/{bucket}/metrics/{metricId} {
        allow read: if isOwner(uid) && hasConsent(uid, 'wearable_data');
        allow create: if isOwner(uid)
                    && hasConsent(uid, 'wearable_data')
                    && request.resource.data.user_id == uid;
        allow update, delete: if false;  // Append-only
      }

      // Health daily rollups — same gate
      match /healthDaily/{date} {
        allow read: if isOwner(uid) && hasConsent(uid, 'wearable_data');
        allow write: if false;  // Functions only
      }
    }

    // Audit log — never readable by clients, never writable by clients
    match /auditLog/{logId} {
      allow read: if hasRole('dpo') || hasRole('admin');
      allow write: if false;  // Functions service account only
    }

    // Consent ledger (immutable hash chain)
    match /consentLedger/{entryId} {
      allow read: if hasRole('dpo');
      allow write: if false;
    }

    // Events public; attendance gated
    match /events/{eventId} {
      allow read: if request.auth != null;
      allow write: if hasRole('organizer') || hasRole('admin');

      match /attendance/{uid} {
        allow read: if isOwner(uid) || hasRole('organizer');
        allow create: if isOwner(uid)
                    && hasConsent(uid, 'event_participation');
        allow update, delete: if false;
      }
    }
  }
}
```

**Translation note from expert-architect.md:** Supabase RLS uses SQL `EXISTS (SELECT 1 FROM consent WHERE...)` inline in the policy. Firestore can't do JOINs in rules, so consents must live in a path the rule can resolve via `get()` — that's why we put them at `/users/{uid}/consents/{category}` instead of a top-level `/consents` collection. This also satisfies the 10-document `get()` limit in rules (we typically need only one consent check per write).

### Pattern 2: Cloud Function Codebase Organization (Gen 2)

**What:** Use `firebase.json` `codebases` array (Firebase CLI ≥10.7.1) to split functions into deployable groups by domain. Only changed codebases redeploy on `firebase deploy --only functions`. This avoids the "monorepo function deploys take 8 minutes" problem.

**Repo layout:**

```
functions/
├── auth/                     codebase: "auth"
│   ├── package.json
│   └── src/
│       ├── discordExchange.ts        (callable: OAuth2 code → Firebase user)
│       ├── linkDiscord.ts            (callable)
│       └── beforeUserCreated.ts      (Auth blocking trigger: minor flag)
├── consent/                  codebase: "consent"
│   ├── package.json
│   └── src/
│       ├── grant.ts                  (callable + ledger write + BQ stream)
│       ├── revoke.ts                 (callable + propagate revocation)
│       ├── expirySweeper.ts          (Cloud Scheduler)
│       └── ledgerVerifier.ts         (monthly hash chain integrity check)
├── events/                   codebase: "events"
│   ├── src/
│   │   ├── createEvent.ts            (callable, role-gated)
│   │   ├── checkInBatch.ts           (callable, JWT-verified QR)
│   │   ├── onAttendanceCreated.ts    (Firestore trigger → award XP)
│   │   └── reminderScheduler.ts      (Cloud Scheduler → Discord embed)
├── challenges/               codebase: "challenges"
│   ├── src/
│   │   ├── join.ts
│   │   ├── onParticipationUpdate.ts  (Firestore trigger → check completion)
│   │   └── leaderboardRecalc.ts
├── wearables/                codebase: "wearables"
│   ├── src/
│   │   ├── ingestBatch.ts            (HTTP, called by PWA)
│   │   ├── openWearablesWebhook.ts   (HTTP, called by Open Wearables)
│   │   └── onHealthDailyUpdate.ts    (Firestore trigger → gamification)
├── gamification/             codebase: "gamification"
│   ├── src/
│   │   ├── awardXp.ts                (internal, called by other functions via pubsub)
│   │   ├── checkAchievements.ts
│   │   └── streakRecalc.ts           (Cloud Scheduler nightly)
├── b2b/                      codebase: "b2b"
│   ├── src/
│   │   ├── mintMetabaseToken.ts      (callable)
│   │   ├── onMetabaseQuery.ts        (HTTP audit hook)
│   │   └── exportBundle.ts           (callable, signed URL)
└── shared/                   (NOT a codebase — published as @gamerwellness/shared internal package)
    ├── consent-check.ts
    ├── audit-logger.ts
    └── types/
```

**`firebase.json`:**

```json
{
  "functions": [
    { "source": "functions/auth",         "codebase": "auth",         "runtime": "nodejs20" },
    { "source": "functions/consent",      "codebase": "consent",      "runtime": "nodejs20" },
    { "source": "functions/events",       "codebase": "events",       "runtime": "nodejs20" },
    { "source": "functions/challenges",   "codebase": "challenges",   "runtime": "nodejs20" },
    { "source": "functions/wearables",    "codebase": "wearables",    "runtime": "nodejs20" },
    { "source": "functions/gamification", "codebase": "gamification", "runtime": "nodejs20" },
    { "source": "functions/b2b",          "codebase": "b2b",          "runtime": "nodejs20" }
  ]
}
```

**Translation note from expert-architect.md ADR-005:** The older doc proposed a "NestJS monolith with modules." The Firebase translation is Cloud Function codebases — same modular boundary, but each codebase deploys independently and scales independently. We get the modularity benefit without the monolith's all-or-nothing deploy problem.

### Pattern 3: Time-Series Wearable Storage — Subcollection + Rollup, NOT Hot Single Collection

**What:** Wearable data writes can hit hundreds of metrics/user/day (HealthKit syncs every minute). Storing in a flat `/healthData/{id}` collection with `user_id` field would (a) blow past Firestore's 1-write-per-second-per-document hot-spot limit on aggregations and (b) make BigQuery streaming costs explode. Instead:

```
/users/{uid}/healthData/{yyyy-mm}/metrics/{auto-id}   ← raw, sharded by month
/users/{uid}/healthDaily/{yyyy-mm-dd}                 ← rollup doc (one write/day)
/users/{uid}/healthWeekly/{yyyy-Www}                  ← weekly rollup (computed nightly)
```

- **Raw metrics:** Written by `wearables-ingestBatch`. NOT mirrored to BigQuery (too expensive — a 10K-user community syncing every 15min = ~960K writes/day = ~$20/mo BQ streaming alone).
- **Daily rollups:** Updated atomically per write. Mirrored to BigQuery via the official `firestore-bigquery-export` extension (one document per user-day = ~10K writes/day, manageable).
- **PWA reads** rollups, not raw — fast for the gaming "character sheet" UI.
- **B2B queries** read the BQ mirror of rollups, never raw.

**Translation note from expert-architect.md:** The older doc used **TimescaleDB hypertables** (PostgreSQL extension with auto-partitioning by time). Firestore has no equivalent, so we manually partition by month-bucket subcollection. The trade-off: we can't run analytical queries across users in Firestore — that's exactly what BigQuery is for in this architecture. Don't try to make Firestore do analytics.

### Pattern 4: BigQuery as the Analytics Boundary

**What:** Firestore is the system-of-record (transactional, real-time, security-rule-gated). BigQuery is the analytics warehouse (columnar, SQL, joinable). The official **`firebase/firestore-bigquery-export` extension** streams selected collections in real time. Install one instance per mirrored collection (or use wildcard for subcollection patterns).

**Mirrored collections (B2B-relevant only):**

| Firestore | BigQuery table | Mirror? | Reason |
|-----------|----------------|---------|--------|
| `/users/{uid}` | `users_raw_changelog` | YES | Demographics for B2B segments |
| `/users/{uid}/profile/main` | `profiles_raw_changelog` | YES | Gaming preferences, city, level |
| `/users/{uid}/consents/{cat}` | `consents_raw_changelog` | YES | **Consent state required for every B2B query filter** |
| `/users/{uid}/healthDaily/{date}` | `healthDaily_raw_changelog` | YES | Aggregate health metrics (k-anon enforced in views) |
| `/users/{uid}/healthData/{m}/metrics/*` | — | **NO** | Volume too high; rollups are sufficient |
| `/events/{id}` | `events_raw_changelog` | YES | Event metadata for engagement reports |
| `/events/{e}/attendance/{uid}` | `attendance_raw_changelog` | YES | Attendance counts |
| `/challenges/{c}` + participation | `challenges_*` | YES | Challenge participation rates |
| `/auditLog/{id}` | `audit_raw_changelog` | YES | Required for LOPDP audit reporting |
| `/consentLedger` | `consent_ledger_raw_changelog` | YES | Audit chain backup outside Firestore |
| `/userAchievements` | `userAchievements_raw_changelog` | YES | Unlock rate analytics |

**k≥50 enforcement views** (created in BigQuery, granted to Metabase service account):

```sql
-- bq_segments_k50_brand: brand-tier B2B segment with hard k=50 floor
CREATE OR REPLACE VIEW `gamerwellness.b2b.bq_segments_k50_brand` AS
WITH consenting_users AS (
  SELECT user_id
  FROM `gamerwellness.firestore_export.consents_raw_changelog`
  WHERE category = 'b2b_brands'
    AND status = 'granted'
    AND expires_at > CURRENT_TIMESTAMP()
    AND _CHANGE_TYPE != 'DELETE'
),
segment_data AS (
  SELECT
    p.city, p.favorite_games[OFFSET(0)] AS primary_game,
    AVG(h.steps) AS avg_steps,
    AVG(h.active_minutes) AS avg_active_min,
    COUNT(DISTINCT p.user_id) AS n_users
  FROM `gamerwellness.firestore_export.profiles_raw_changelog` p
  JOIN consenting_users c ON p.user_id = c.user_id
  JOIN `gamerwellness.firestore_export.healthDaily_raw_changelog` h
    ON p.user_id = h.user_id
  WHERE h.date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  GROUP BY p.city, primary_game
)
SELECT * FROM segment_data WHERE n_users >= 50;  -- HARD GATE
```

### Pattern 5: Discord Bot as External Read-Only Bridge

**What:** Bot lives outside the Firebase project (no Admin SDK access except via locked-down Cloud Function callable endpoints). Bot calls Cloud Functions for all data fetches; never queries Firestore directly. This keeps the architectural firewall enforceable in code, not just in policy.

**Bot interactions:**

```
Discord user runs /leaderboard
  → Bot calls https://...cloudfunctions.net/discord-getLeaderboard?guild_id=X
  → Function verifies caller via shared HMAC secret + IP allow-list (bot's GCE IP)
  → Function reads top-10 from /challenges/active/leaderboard (cached doc)
  → Returns JSON list of {display_name, xp} — NO emails, NO discord_ids leaked
  → Bot renders Discord embed
```

The bot has **zero Firestore Admin SDK credentials**. Compromise of the bot leaks at most: HMAC secret (rotatable) and the public-facing Cloud Function URL.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct Firestore Writes from PWA for Health Data

**What:** Letting the Vue 3 client write directly to Firestore for `healthData` or `consents` and relying solely on Security Rules.

**Why bad:**
1. **Audit log gap** — Security Rules can't trigger writes. Every consent grant/revoke MUST also append to `/consentLedger` and `/auditLog` with hash chain. Only a Cloud Function can do this atomically.
2. **BigQuery streaming has lag** — direct writes might propagate to BQ in 1-30s. A B2B query racing a revocation could expose data the user just revoked.
3. **No server-side validation** of consent text version — user might be granting v2 consent while v3 is now active.

**Instead:** All sensitive writes go through callable Cloud Functions. Security Rules act as defense-in-depth, NOT as the primary gate.

### Anti-Pattern 2: Discord Bot on Cloud Run with `min-instances=1`

**What:** Deploying the discord.js bot to Cloud Run, hoping `min-instances=1` keeps the Gateway WebSocket alive.

**Why bad:** Confirmed unreliable in 2026 — Cloud Run will silently recycle instances on background revisions, networking changes, or zonal failover. The Discord Gateway connection drops, the bot reconnects with stale state, and slash commands return "Application did not respond." Multiple production reports document this exact failure mode.

**Instead:** Deploy the bot to a **Compute Engine `e2-micro` VM (~$6/mo, in `us-east1` for free egress to Cloud Functions)** with `systemd` unit + `nodemon`/`pm2` for auto-restart. This is the simplest production-stable path. Alternatively, Cloud Run **Jobs** (not Services) work for some patterns but add complexity.

### Anti-Pattern 3: Firestore as Time-Series Database

**What:** Storing every wearable metric in a top-level `/healthData/{auto-id}` collection with a `user_id` field, then trying to compute "this week's average steps for user X" with a `where('user_id', '==', uid)` query.

**Why bad:**
- Index on `user_id` becomes a hot index, throttles at high write volume
- Reads cost 1 document each — 7 days × 96 syncs/day = 672 reads for one weekly average
- BigQuery mirroring this collection costs $$$
- No time-bucket sharding means you can't expire old data efficiently

**Instead:** Subcollection sharded by month-bucket + rollup pattern (see Pattern 3 above). Raw retained 90 days, then archived to Cloud Storage cold. Rollups retained 24 months per LOPDP retention policy.

### Anti-Pattern 4: B2B Metabase Queries Hitting Firestore

**What:** Connecting Metabase directly to Firestore via a community ODBC driver.

**Why bad:**
1. Firestore has no SQL — drivers translate poorly, queries are O(n) reads
2. K-anonymity enforcement requires JOINs (consent table + metric table) — Firestore can't JOIN
3. Read costs explode — a partner running 50 dashboard queries/day at 10K users could hit $100/mo in Firestore reads alone
4. No way to enforce k≥50 at the query layer; you'd need every query to flow through a Function proxy

**Instead:** Metabase queries BigQuery only. BigQuery views enforce k≥50 in SQL. Cost is predictable (~$5/TB scanned).

### Anti-Pattern 5: Mixing Crisis Mental Health Data into Analytics

**What:** Moderator-flagged crisis reports (suicide ideation, self-harm) flowing into the same `healthData` collection as steps/sleep.

**Why bad:** Per `expert-security-compliance.md` Threat T6 — crisis data must NEVER enter B2B/analytics pipeline. If it shares a collection with other health data, the BigQuery extension WILL stream it.

**Instead:** Crisis events live in a separate `/crisisInterventions/{id}` collection with `bigquery-export` extension EXPLICITLY not installed. Auto-purged 30 days after closure. Read access restricted to DPO + designated mental-health partner role only.

---

## Scalability Considerations

| Concern | At 100 users (MVP) | At 1.5K users (Phase 2 target) | At 10K users (Phase 4 target) |
|---------|-------------------|-------------------------------|------------------------------|
| **Firestore reads** | ~50K/day, free tier covers | ~750K/day, ~$2/mo | ~5M/day, ~$15/mo |
| **Firestore writes** | ~5K/day, free | ~75K/day, ~$3/mo | ~500K/day, ~$20/mo |
| **Wearable raw writes** | ~10K/day | ~150K/day, ~$5/mo | ~1M/day → MUST shard subcollections by month-bucket (Pattern 3); ~$30/mo |
| **Cloud Functions invocations** | ~30K/mo, free | ~500K/mo, ~$0.20/mo | ~5M/mo, ~$2/mo |
| **BigQuery storage** | <1GB, free | ~10GB, ~$0.20/mo | ~100GB, ~$2/mo + ~$5-20/mo query scanning |
| **Discord bot GCE VM** | $6/mo (e2-micro) | $6/mo | $6-13/mo (e2-small if many concurrent slash commands) |
| **Metabase Cloud Run** | $0-5/mo (cold starts OK) | $5-10/mo | $15-25/mo (min-instances=1 for partner UX) |
| **Open Wearables Cloud Run** | $0-5/mo | $5-10/mo | $20-40/mo (or sunset in favor of Capacitor native plugins) |
| **Firebase Hosting CDN** | Free | $0-1/mo | $5-10/mo |
| **TOTAL infra** | **~$10-15/mo** | **~$25-50/mo** | **~$100-180/mo** |

Stays inside the $25-100/mo MVP target through Phase 2; scales to Phase 4 at $100-180/mo, well under the $260 ceiling in `.planning/PROJECT.md`.

---

## Region & Data Residency Decisions

- **Firestore region:** `southamerica-east1` (São Paulo) — closest to Ecuador users (~150ms vs ~80ms us-east1, but data stays in LATAM, simplifies LOPDP cross-border analysis). Firestore region is **immutable after database creation** — get this right first.
- **Cloud Functions region:** Same — `southamerica-east1`. Co-locating with Firestore eliminates inter-region latency for triggers.
- **BigQuery dataset region:** `southamerica-east1` to match — and because the Firestore→BQ extension requires same-region for streaming.
- **Cloud Storage:** `southamerica-east1` for user-generated content; `us-central1` (cheaper) acceptable for static assets behind CDN.
- **Compute Engine (Discord bot):** `us-east1` — Discord's gateway is in us-east; lowest latency. WebSocket traffic is small enough that egress cost is negligible (~$0.10/mo).
- **PostHog Cloud Run:** EU region (cheaper) acceptable since analytics is anonymized event data, not personal data. Document this in DPIA.
- **Metabase Cloud Run:** `southamerica-east1` to colocate with BigQuery for query latency.
- **No Ecuador-resident region exists in GCP as of April 2026.** São Paulo is the closest LOPDP-defensible option. If SPDP later mandates in-country residency (unlikely but possible), the migration path is to AWS LightSail Quito or Telconet (CNT cloud) — would require leaving Firebase for a self-hosted Postgres + custom auth stack, a multi-month project. Document this risk in the DPIA. **For Phase 2-3, São Paulo is acceptable.**

---

## Build Order — Phase 2 MVP (Mo 4-10)

The roadmap's "Phase 2 — Platform MVP" deliverables map to the following build order. Each step has a clear "ready to start next" gate.

### Step 0 (Pre-Phase 2): Foundation

- [ ] Firebase project created in `southamerica-east1`
- [ ] Cloud Functions Gen 2 codebase scaffold (7 codebases per Pattern 2)
- [ ] Vue 3 + Vite + VueFire scaffold, deployed to Firebase Hosting (placeholder)
- [ ] CI/CD: GitHub Actions → `firebase deploy --only functions:<changed-codebase>` + `firebase deploy --only hosting`
- [ ] Firestore Security Rules baseline (deny-all, then add per-collection)
- [ ] Sentry + UptimeRobot wired

### Step 1: Auth + Discord Linking (the "first value" gate)

**Why first:** UC-1 (Onboarding) is the critical-path conversion funnel. Without it nothing else gets users.

- [ ] Firebase Auth configured: email/password + Discord OAuth via custom provider
- [ ] Cloud Function `auth-discordExchange` (callable)
- [ ] Vue route `/auth/discord-callback` + `/onboarding`
- [ ] Discord bot deployed to GCE e2-micro with `/link` slash command
- [ ] HMAC-shared-secret bridge: bot ↔ Cloud Functions
- [ ] **Gate:** Single user can flow Discord → /link → app account in <90 seconds (UC-1 SLA)

### Step 2: Consent Engine (the LOPDP gate)

**Why second:** Per `expert-security-compliance.md` checklist, NO data collection is legally allowed without DPIA + consent infrastructure. This must exist before profiles, events, or anything else stores personal data.

- [ ] `/users/{uid}/consents/{category}` schema + Security Rules
- [ ] `/consentLedger` immutable hash chain + verifier function
- [ ] `/auditLog` append-only collection
- [ ] Cloud Functions: `consent-grant`, `consent-revoke`, `consent-expirySweeper`
- [ ] Vue `/me/consent` UI with 10 toggles per ADR-001/§5 PROJECT.md
- [ ] Consent text versioning (stored in `/consentTexts/{category}/{version}` with ES + EN)
- [ ] BigQuery export of consents collection (so revocation propagates to B2B layer)
- [ ] **Gate:** DPIA submitted to SPDP citing this consent architecture; DPO sign-off

### Step 3: User Profiles + Basic Gamification

**Why third:** Now that consent exists, we can write profiles. Profiles are read-only foundation for everything after.

- [ ] `/users/{uid}/profile/main` schema (XP, level, streak, city, favorite_games)
- [ ] Cloud Function `gamification-awardXp` (internal, called via Pub/Sub)
- [ ] Vue `/me` profile page with "character sheet" UI
- [ ] Achievement seed data (`/achievements/`): 10 starter badges
- [ ] **Gate:** User can see XP=0, level=1, and zero badges on their profile

### Step 4: Events + QR Check-In

**Why fourth:** Phase 1's IRL events are the primary way users earn first XP. PWA must support them by Mo 6 to bridge IRL → digital.

- [ ] `/events/{id}` + `/events/{id}/attendance/{uid}` schemas
- [ ] Cloud Functions: `events-createEvent`, `events-checkInBatch`, `events-onAttendanceCreated` (XP trigger)
- [ ] Vue `/events`, `/events/:id`, `/events/:id/checkin` (camera + offline IndexedDB queue)
- [ ] Service worker offline check-in support
- [ ] Discord bot `/eventos` command (read-only listing)
- [ ] **Gate:** Volunteer can check in 50 attendees offline at a meetup, sync on reconnect

### Step 5: Wellness Challenges (manual entry first)

**Why fifth:** Challenges drive sustained engagement. Start with manual entry so users without wearables aren't excluded (per Risk #9 in PROJECT.md — wearable adoption may be <10%).

- [ ] `/challenges/{id}` + `/challenges/{c}/participation/{uid}` schemas
- [ ] Bronze/Plata/Oro tiered challenge templates
- [ ] Cloud Functions: `challenges-join`, `challenges-onParticipationUpdate`, `challenges-leaderboardRecalc`
- [ ] Vue `/challenges` + `/challenges/:id` with manual progress entry
- [ ] Opt-in leaderboards (gated by `public_visibility` flag in profile)
- [ ] **Gate:** User can join a 7-day step challenge, manually log daily steps, see ranking

### Step 6: Wearable Integration

**Why last in Phase 2:** Most complex (OAuth flows for 4-5 vendors), and manual entry already covers the use case. Wearables are an enhancement, not foundation.

- [ ] `/users/{uid}/healthData/{yyyy-mm}/metrics/{auto-id}` subcollection schema
- [ ] `/users/{uid}/healthDaily/{date}` rollup schema + atomic update function
- [ ] Open Wearables service deployed to Cloud Run
- [ ] Cloud Functions: `wearables-ingestBatch` (PWA path), `wearables-openWearablesWebhook` (cloud path), `wearables-onHealthDailyUpdate` (gamification trigger)
- [ ] Vue `/me/wearables` connection UI
- [ ] HealthKit / Health Connect integration via PWA Web APIs (where supported) or document Capacitor fallback for Phase 3
- [ ] BigQuery export of `healthDaily` collection
- [ ] **Gate:** User connects Fitbit, sees today's steps populate within 15min, challenge progress auto-updates

### Phase 3 Build Order Preview (Mo 10-18)

1. **B2B Foundation:** Partner schema, Metabase deployment, BigQuery k≥50 views, signed-JWT iframe embed
2. **Premium membership:** Stripe via Firebase Extension, custom claim `is_premium`
3. **Sponsored challenges:** Partner-created challenges with editorial approval workflow
4. **Capacitor wrapper** for App Store / Play Store distribution (only if PWA install rates < 30%)

---

## Translation Notes — Where to Re-Read `expert-architect.md` Through the Firebase Lens

The older expert-architect.md is still useful as a **conceptual** reference for data model fields, ADR rationale, and B2B query patterns. But these specific sections must be mentally re-translated:

| Old doc section | Old tech | Translate to | Notes |
|----------------|----------|--------------|-------|
| "Web Application (Next.js)" §Components.2 | Next.js + Tailwind + Supabase client | **Vue 3 + Vite + VueFire** | Routing pages map directly. SSR via `vite-ssg` plugin (lighter than Nuxt). |
| "Mobile Application (React Native)" §Components.3 | React Native + Expo + expo-health | **Vue 3 PWA, Capacitor wrapper if needed Phase 3+** | Drop the dedicated mobile section. PWA install on iOS/Android covers 80% of use cases. Capacitor only if HealthKit native access is critical. |
| "API Server (NestJS + Fastify)" §Components.4 | NestJS modules + BullMQ + Passport.js | **Cloud Functions Gen 2 codebases (Pattern 2)** | Each NestJS module ≈ one codebase. BullMQ → Cloud Tasks or Pub/Sub. Passport → Firebase Auth (built-in). |
| "Data Pipeline / Background Workers" §Components.5 | BullMQ workers + Redis | **Cloud Tasks + Pub/Sub + Cloud Scheduler** | Each queue → a Cloud Tasks queue. Sorted-set leaderboards → cached `/leaderboards/{period}` Firestore docs, recalc on schedule. |
| "Gamification Engine (gengine)" §Components.6 | gengine sidecar (Go) | **Custom Cloud Functions in `gamification` codebase** | Per project-definition.md §5 — "Custom Cloud Functions" replaces gengine. Achievement criteria stored as JSONB in `/achievements/{id}`, evaluated in TypeScript. Loses some flexibility but eliminates a service. |
| "Consent Management System" §Components.7 | NestJS module + Supabase tables | **`consent` codebase + `/users/{uid}/consents/{cat}` + `/consentLedger`** | Logic identical, just relocated. The 10 categories per ADR-004 stay verbatim. |
| "Wearable Integration Layer" §Components.9 | TimescaleDB hypertables | **Subcollection-bucketed by month + rollup docs (Pattern 3)** | Lose the SQL window functions; gain real-time triggers. BigQuery handles the analytical queries TimescaleDB would have. |
| "Database" Tech Stack | Supabase Pro + RLS | **Firestore Native + Security Rules (Pattern 1)** | RLS SQL → Security Rules JS. Consent JOIN → consent path `get()`. Place consents under `/users/{uid}/` so rules can resolve. |
| "Time-Series" Tech Stack | TimescaleDB extension | **Firestore subcollection + BigQuery for analytics** | No direct equivalent — split the responsibility. |
| "Cache / Queues" | Redis (Upstash) + BullMQ | **Cloud Tasks + Pub/Sub + Firestore cached docs** | Sorted-set leaderboards → cached docs (eventually consistent acceptable). No Redis. |
| "Hosting Strategy" §Infrastructure | Supabase Cloud + Railway + Vercel + Expo | **Firebase Hosting + Functions + Firestore + GCE (Discord) + Cloud Run (PostHog/Metabase/OpenWearables)** | Single GCP project. Simpler IAM, single billing. |
| "ADR-002: Supabase over Firebase" | Argues FOR Supabase | **OBSOLETE — superseded by project-definition.md §5** | Reasoning was data sovereignty + RLS. We're accepting Firestore Security Rules as RLS-equivalent and São Paulo region as acceptable LOPDP residency. Document this trade-off in the new DPIA. |
| "ADR-005: NestJS Monolith" | Modular monolith | **Cloud Function codebases (Pattern 2)** | Same modularity intent, better deploy isolation. |
| "Phased Implementation Roadmap" §Phase 1-3 | NestJS + Supabase build order | **See "Build Order — Phase 2 MVP" above** | Re-derived from scratch for Firebase. |
| ADRs 001, 003, 004, 006, 007 | — | **Carry over verbatim** | Discord firewall, Open Wearables choice, consent-first architecture, bilingual ES/EN, k≥50 — all stack-agnostic and still apply. |

The **data model** in §Data Model of expert-architect.md (User, Profile, Consent, HealthData, Event, etc. with field lists) is **directly usable** as Firestore document schemas — just convert UUIDs to Firestore auto-IDs and re-shape relations into subcollections per the rules constraint.

---

## Confidence Assessment

| Area | Confidence | Source |
|------|------------|--------|
| Firestore Security Rules consent gating | **HIGH** | Official Firebase docs + tested pattern; only nuance is the 10-`get()` rules limit which we respect by colocating consents under user path |
| Cloud Function codebases organization | **HIGH** | Official Firebase docs (firebase.json `codebases` array, CLI ≥10.7.1) |
| Time-series subcollection + rollup pattern | **HIGH** | Standard Firestore pattern; verified by Firestore best-practices guides + cost models |
| BigQuery as analytics boundary via official extension | **HIGH** | `firebase/firestore-bigquery-export` is the official, supported path; widely used in production |
| Discord bot must NOT run on Cloud Run | **HIGH** | Multiple production reports + GCP forum threads confirm Cloud Run min-instances unreliable for persistent WebSocket; GCE VM is the standard recommendation |
| `southamerica-east1` as best-available LOPDP region | **MEDIUM** | GCP confirms region exists; LOPDP defensibility is a legal judgment (DPO must sign off). No Ecuador-resident GCP region exists. |
| Capacitor deferral to Phase 3+ | **MEDIUM** | Depends on whether iOS HealthKit web bridges mature; PWA Web Health API is still experimental in 2026 |
| Cost projections | **MEDIUM** | Based on standard Firebase pricing + extrapolation; real costs depend on usage patterns |
| Open Wearables sunset path | **LOW** | Project is MIT but maintenance velocity is uncertain in 2026; flag for Phase 3 re-evaluation |

---

## Sources

- [Cloud Firestore locations | Firebase](https://firebase.google.com/docs/firestore/locations) — confirms `southamerica-east1` (São Paulo) availability
- [Stream Firestore to BigQuery | Firebase Extensions Hub](https://extensions.dev/extensions/firebase/firestore-bigquery-export) — official streaming extension
- [Integrate with BigQuery | Firestore](https://firebase.google.com/docs/firestore/solutions/bigquery) — supported integration patterns
- [Organize multiple functions | Cloud Functions for Firebase](https://firebase.google.com/docs/functions/organize-functions) — codebases pattern (CLI ≥10.7.1)
- [Extend Cloud Firestore with Cloud Functions (2nd gen) | Firebase](https://firebase.google.com/docs/firestore/extend-with-functions-2nd-gen) — Gen 2 trigger model
- [Privacy and Security in Firebase](https://firebase.google.com/support/privacy) — Firestore + Cloud Functions covered by GCP BAA (HIPAA precedent applies to LOPDP)
- [Firebase Security Rules: The Complete Guide for App Developers (2026)](https://app369.com/blog/firebase-security-guide-2026/) — current rules patterns
- [How to run Discord bot on Cloud Run | emilwypych.com](https://emilwypych.com/2020/10/25/how-to-run-discord-bot-on-cloud-run/) + [discuss thread on min-instances](https://discuss.google.dev/t/) — confirms Cloud Run unsuitable for persistent gateway
- [Best Discord Bot Hosting 2026 | hostadvice.com](https://hostadvice.com/vps/discord-bot-hosting/) — VPS / GCE recommended for 24/7 gateway
- [Cloud Functions locations | Cloud Functions for Firebase](https://firebase.google.com/docs/functions/locations) — region co-location guidance
- `StartData/output/expert-architect.md` — conceptual reference (Supabase/NestJS/RN sections SUPERSEDED; data model + ADRs 001/003/004/006/007 carry over)
- `StartData/output/expert-security-compliance.md` — LOPDP threat model + 10-point compliance checklist informing Pattern 1 and Anti-Pattern 5
- `StartData/output/project-definition.md` §5 — canonical tech stack
- `.planning/PROJECT.md` — locked constraints
