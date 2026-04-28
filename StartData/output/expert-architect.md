# Expert Architecture Design -- Gamer Wellness Platform

**Project**: Gamer Wellness (first gaming+wellness community in LATAM)
**Author**: Software Architect Agent
**Date**: 2026-04-07
**Status**: Initial Architecture Design (Pre-MVP)

---

## Architecture Overview

The system follows a **serverless event-driven architecture** built on **Vue 3 + Firebase (Cloud Functions + Firestore)**, organized into three deployment layers: Vue 3 PWA (frontend), Firebase Cloud Functions (backend logic), and Firestore (data + security rules). The fundamental architectural constraint is the **strict separation between community (Discord) and data platform (Web/App)** -- Discord serves as community-only; all data collection, consent, health tracking, and monetization occur exclusively on the owned Firebase-hosted platform.

```
                         +-----------------------------+
                         |     EXTERNAL CONSUMERS      |
                         | (B2B Dashboard / Metabase)   |
                         +-------------+---------------+
                                       |
                                       | Aggregated via BigQuery export
                                       |
+------------------+     +-------------+---------------+     +------------------+
|   DISCORD BOT    |     |   FIREBASE CLOUD FUNCTIONS  |     |  WEARABLE SYNC   |
|   (discord.js)   |     |       (Node.js / TS)        |     | (Open Wearables) |
|                  |     |                             |     |                  |
| - Bridge identity|     | - Auth / Consent endpoints  |     | - Apple HealthKit|
| - Event announce |     | - Profile / Wellness CRUD   |     | - Health Connect |
| - Challenge feed |     | - Gamification triggers     |     | - Fitbit API     |
| - Link accounts  |     | - Event management          |     | - Garmin Connect |
|                  |     | - B2B data access (filtered) |     |                  |
+--------+---------+     +---+-------+-------+---+-----+     +--------+---------+
         |                    |       |       |   |                     |
         | Discord            |       |       |   |                     |
         | OAuth2 link        |       |       |   |                     |
         |                    |       |       |   |                     |
+--------+--------------------+-------+-------+---+---------------------+--------+
|                                                                                |
|                    FIRESTORE (NoSQL + Security Rules)                           |
|                                                                                |
|  +------------+  +----------+  +------------+  +-----------+  +-------------+  |
|  |   users/   |  | consents/|  | healthData/|  |  events/  |  | achievements|  |
|  |  profiles/ |  | auditLog/|  | (subcoll)  |  | attendance|  |  challenges/|  |
|  +------------+  +----------+  +------------+  +-----------+  +-------------+  |
|                                                                                |
|  +-------------------+  +--------------------+  +---------------------------+  |
|  |  Security Rules   |  |  Realtime          |  |  Firestore Triggers       |  |
|  |  (consent-gated)  |  |  Listeners         |  |  (Cloud Function hooks)   |  |
|  +-------------------+  +--------------------+  +---------------------------+  |
|                                                                                |
+---+------------------------------------+-------------------+-------------------+
    |                                    |                   |
    |                                    |                   |
+---+------------------+     +-----------+---------+   +-----+----------+
| Firebase Auth        |     |    PostHog          |   |   Metabase     |
|  - Discord OAuth     |     |  - Product analytics|   |  - B2B reports |
|  - Email/password    |     |  - Feature flags    |   |  - BigQuery    |
|  - Phone auth        |     |  - Funnels/retention|   |  - Embeddable  |
+----------------------+     +---------------------+   +----------------+

+------------------------------------------------------------+
|                   VUE 3 PWA (Vite + Firebase Hosting)       |
|  - Landing / content / SEO (SSG via Vite plugin)           |
|  - Event registration + QR check-in                        |
|  - Consent management UI (granular toggles)                |
|  - Gamification / profile / leaderboards                   |
|  - Wellness challenges + wearable sync                     |
|  - B2B partner portal (separate route group)               |
|  - PWA: installable, offline-capable, push notifications   |
+------------------------------------------------------------+
```

### Key Architectural Principles

1. **Consent-First**: Every Firestore write passes through Cloud Function consent verification. Firestore Security Rules enforce that no health/behavioral data is stored without an active, purpose-specific consent record.
2. **Discord Firewall**: The Discord bot is a read-only bridge. It can push notifications and link identities but never pulls user data back from Discord for storage/monetization.
3. **Serverless-First**: Firebase Cloud Functions handle all backend logic — auto-scaling, zero server management. Firestore provides real-time sync and offline support natively.
4. **Event-Driven Processing**: Firestore triggers (onCreate, onUpdate) fire Cloud Functions for gamification scoring, consent auditing, and analytics pipelines. BigQuery export enables B2B reporting via Metabase.
5. **Progressive Data Collection**: Users start with zero data sharing; each data category (demographics, gaming habits, health metrics, wearable data) requires separate opt-in.

---

## Components

### 1. Discord Bot

- **Responsibility**: Community engagement hub. Announces events, posts challenge leaderboards, facilitates account linking between Discord and the owned platform. Provides slash commands for community interactions. Does NOT collect, store, or transmit any user data for monetization.
- **Technology**: discord.js v14, Node.js, deployed as a standalone service
- **Interfaces**:
  - Discord Gateway (WebSocket) for real-time events
  - Discord REST API for message/embed management
  - Discord OAuth2 for account linking (1-Click Account Linking)
  - Internal API calls to NestJS backend (read-only: fetch leaderboards, event info)
- **Key Commands**:
  - `/link` -- Initiates OAuth2 flow to connect Discord account to platform profile
  - `/events` -- Lists upcoming meetups/events with registration links (links to web)
  - `/leaderboard` -- Displays top community challenge participants (fetched from API)
  - `/profile` -- Shows public gamification stats (level, badges, streak)
  - `/challenge` -- Shows active wellness challenges with join links (links to app)
- **Constraints**:
  - No message content scraping or behavioral analysis of Discord activity
  - No forwarding of Discord user data to B2B partners
  - Bot must comply with Discord teen-appropriate mode defaults (March 2026)
  - All data displayed in Discord is fetched from the owned platform, not generated from Discord activity

### 2. Web Application (Next.js)

- **Responsibility**: Public-facing web presence with SSR for SEO. Handles content/blog (wellness articles, event recaps), event registration, consent management dashboard, user profile/settings, and B2B partner portal.
- **Technology**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase client SDK
- **Interfaces**:
  - Supabase client (direct with RLS) for authenticated user operations
  - NestJS API for complex business logic (gamification scoring, B2B queries)
  - PostHog JS SDK for analytics
- **Pages/Routes**:
  - `/` -- Landing page with community stats, upcoming events, mission statement
  - `/blog` -- Wellness content (SSG for SEO)
  - `/events` -- Event listing and registration
  - `/events/[id]` -- Event detail with registration/RSVP
  - `/profile` -- User dashboard (stats, achievements, health summary)
  - `/settings/consent` -- Granular consent management panel
  - `/settings/data` -- Data export and deletion requests (LOPDP rights)
  - `/challenges` -- Active wellness challenges with progress tracking
  - `/partners` -- B2B portal (authenticated, separate auth flow)
  - `/partners/dashboard` -- Embedded Metabase dashboards for B2B clients

### 3. Mobile Application (React Native / Expo)

- **Responsibility**: Primary health data capture interface. Native access to HealthKit (iOS) and Health Connect (Android) for wearable integration. Push notifications for challenges, events, and community updates.
- **Technology**: React Native with Expo, TypeScript, expo-health (HealthKit/Health Connect bridge), Open Wearables React Native SDK
- **Interfaces**:
  - Apple HealthKit (iOS native bridge)
  - Health Connect API (Android, replaces deprecated Google Fit)
  - Open Wearables SDK for Fitbit, Garmin, and 200+ device support
  - Supabase client SDK (direct with RLS)
  - NestJS API for business logic
  - Firebase Cloud Messaging / APNs for push notifications
- **Key Screens**:
  - Home: Daily wellness summary, active challenges, community feed
  - Health: Wearable sync status, health metrics dashboard, trends
  - Challenges: Browse/join challenges, progress tracking, social comparison
  - Events: Upcoming events, RSVP, attendance check-in (QR code)
  - Profile: Gamification stats, achievements, level progression
  - Settings: Consent management, wearable connections, notification preferences

### 4. API Server (NestJS + Fastify)

- **Responsibility**: Core business logic, authentication orchestration, consent enforcement middleware, gamification engine orchestration, B2B data access layer, event management, job queue dispatching.
- **Technology**: NestJS with Fastify adapter (30-40% faster than Express), TypeScript, Passport.js (multi-strategy auth), BullMQ for async jobs
- **Interfaces**:
  - REST API (primary) with OpenAPI/Swagger documentation
  - WebSocket gateway for real-time leaderboard updates
  - BullMQ producers (enqueue health data processing, gamification recalculation)
  - Supabase Admin SDK (service role for cross-user operations)
  - gengine REST API (gamification rule execution)
  - Redis for caching and leaderboard sorted sets
- **Middleware Stack**:
  1. Rate limiting (per-user, per-IP)
  2. Authentication (JWT verification via Supabase)
  3. Consent verification (checks active consent before any data operation)
  4. Audit logging (all data access logged to AuditLog table)
  5. Request validation (class-validator DTOs)

### 5. Data Pipeline / Background Workers

- **Responsibility**: Async processing of health data ingestion, gamification score recalculation, analytics event forwarding, consent expiry checks, data anonymization for B2B aggregates, scheduled report generation.
- **Technology**: BullMQ workers (Node.js), Redis queues, Supabase Edge Functions for lightweight triggers
- **Queues**:
  - `health-data-ingest`: Validates, normalizes, and stores incoming wearable data
  - `gamification-recalc`: Recalculates user scores, levels, achievements after new events
  - `consent-audit`: Logs all consent changes with full audit trail
  - `b2b-aggregate`: Periodically generates anonymized aggregate datasets for B2B
  - `notification-dispatch`: Sends push notifications, emails, Discord messages
  - `data-retention`: Enforces retention policies, processes deletion requests

### 6. Gamification Engine

- **Responsibility**: Rules-based engine for wellness challenges, achievement tracking, XP/level calculations, leaderboards, streak tracking, and badge awards.
- **Technology**: gengine (MIT license, Go-based, REST API) deployed as sidecar service, with Redis for leaderboard sorted sets
- **Core Mechanics**:
  - **XP System**: Actions (event attendance, challenge completion, health goals, content engagement) award XP. Level thresholds follow a logarithmic curve.
  - **Challenges**: Time-bound group wellness goals (e.g., "Walk 10K steps/day for 7 days"). Creator-defined or system-generated.
  - **Achievements**: One-time badges for milestones (first event, 30-day streak, linked wearable, referred a friend).
  - **Leaderboards**: Weekly/monthly/all-time. Segmented by club, city, game preference. Stored in Redis sorted sets for O(log N) operations.
  - **Streaks**: Consecutive days of activity tracking. Grace periods configurable.
  - **Seasonal Events**: Time-limited themed challenges tied to game releases or community events.
- **Integration**: gengine receives events from the API server, evaluates rules, returns actions (award XP, unlock badge, update leaderboard). API server persists results to Supabase.

### 7. Consent Management System

- **Responsibility**: LOPDP-compliant granular consent capture, storage, modification, revocation, and audit. Central authority for all data processing decisions.
- **Technology**: Custom module within NestJS, backed by Supabase with dedicated consent and audit tables
- **Consent Categories** (independently toggleable):
  1. **Basic Profile**: Name, email, gaming preferences (required for account)
  2. **Event Participation**: Event attendance tracking and history
  3. **Health Self-Reports**: Self-reported wellness surveys and mood tracking
  4. **Wearable Data**: Steps, heart rate, sleep, activity from connected devices
  5. **Gaming Habits**: Play time, game preferences, session patterns (self-reported)
  6. **B2B Sharing -- Insurers**: Aggregated health/wellness data shared with insurance partners
  7. **B2B Sharing -- Healthcare**: Aggregated data shared with hospitals/clinics
  8. **B2B Sharing -- Brands**: Behavioral/preference data shared with consumer brands
  9. **Cross-Border Transfer**: Consent to process data outside Ecuador (for LATAM expansion)
  10. **Research**: Use of anonymized data for academic/public health research
- **Rules**:
  - Each consent is purpose-specific, time-bound (renewable), and individually revocable
  - Revocation triggers immediate cessation of processing for that category
  - All consent events (grant, modify, revoke) logged in immutable AuditLog
  - B2B data access checks active consent for every query, at row level
  - Minor users (< 18) require parental/guardian consent (LOPDP requirement)

### 8. Event Management System

- **Responsibility**: CRUD for three event tiers (Meetups, General Events, Club Sessions). Registration, attendance tracking (QR check-in), capacity management, post-event surveys, and gamification event emission.
- **Technology**: NestJS module + Supabase tables + QR code generation library
- **Event Types**:
  - **Meetup**: Free, game-themed (Caminata Dota, Run Free Fire, etc.), capacity 10-50
  - **General Event**: Monthly/bimonthly, multi-activity convergence, brand activations, capacity 50-500
  - **Club Session**: Recurring, club-managed, stable membership, capacity 10-30
- **Flow**: Create event -> Publish (Discord announcement + web listing + push notification) -> Registration (web/app) -> Attendance (QR check-in at venue) -> Post-event survey -> XP award -> Analytics

### 9. Wearable Integration Layer

- **Responsibility**: Unified abstraction over multiple health data sources. Normalizes data from Apple HealthKit, Health Connect (Android), Fitbit Web API, Garmin Connect IQ, and any Open Wearables-supported device into a common schema.
- **Technology**: Open Wearables (MIT, free, self-hosted), React Native native modules for HealthKit/Health Connect
- **Data Types Captured** (with individual consent per type):
  - Steps / distance / active minutes
  - Heart rate (resting, active, variability)
  - Sleep (duration, stages, quality score)
  - Calories burned (active, total)
  - Workout sessions (type, duration, intensity)
- **Sync Strategy**:
  - Mobile app performs local sync with on-device health stores (HealthKit/Health Connect)
  - Data is batched and uploaded to API server every 15 minutes (configurable)
  - Server-side sync for cloud-connected wearables (Fitbit, Garmin) via OAuth2 + webhooks
  - All synced data passes through consent verification before storage
  - TimescaleDB hypertables for efficient time-series storage and querying

### 10. B2B Dashboard

- **Responsibility**: Self-service analytics portal for B2B partners (insurers, hospitals, brands). Displays only aggregated, anonymized data from users who have given specific B2B consent. Enforces minimum aggregation thresholds (k-anonymity, k >= 50) to prevent re-identification.
- **Technology**: Metabase (open source) embedded in Next.js via iframe, connected to read-replica or materialized views in Supabase
- **Access Control**:
  - Partner accounts with organization-level auth (separate from user auth)
  - Each partner sees only data categories they are authorized for
  - All queries logged in AuditLog with partner ID, query parameters, result count
  - Automated alerts if query patterns suggest re-identification attempts
- **Dashboard Types**:
  - **Insurer View**: Aggregate wellness metrics, activity levels, health trends by demographic cohort
  - **Healthcare View**: Prevalence of sedentary behavior, sleep patterns, mental wellness self-reports by region
  - **Brand View**: Gaming preferences, event participation rates, engagement metrics by segment

### 11. Analytics Platform

- **Responsibility**: Product analytics for the internal team. Tracks user flows, feature adoption, retention, and conversion funnels. Provides feature flags for gradual rollouts.
- **Technology**: PostHog (self-hosted for data sovereignty), connected to Supabase
- **Key Metrics Tracked**:
  - Discord-to-App conversion funnel
  - Consent grant/revoke rates by category
  - Wearable connection and retention rates
  - Challenge participation and completion rates
  - Event registration-to-attendance ratio
  - B2B dashboard usage and query patterns
  - DAU/WAU/MAU and engagement depth

---

## Data Model

### User
```
- id: UUID (PK) -- Supabase Auth UID
- email: TEXT (UNIQUE, encrypted at rest)
- phone: TEXT (nullable, encrypted)
- display_name: TEXT
- avatar_url: TEXT (nullable)
- discord_id: TEXT (nullable, UNIQUE) -- linked Discord account
- locale: TEXT (default 'es-EC')
- timezone: TEXT (default 'America/Guayaquil')
- date_of_birth: DATE (encrypted, for age verification)
- is_minor: BOOLEAN (computed, triggers parental consent flow)
- status: ENUM('active', 'suspended', 'deleted')
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- deleted_at: TIMESTAMPTZ (soft delete for LOPDP retention)
```

### Profile
```
- id: UUID (PK)
- user_id: UUID (FK -> User, UNIQUE)
- bio: TEXT (nullable)
- city: TEXT (nullable) -- Quito, Guayaquil, Cuenca, etc.
- country: TEXT (default 'EC')
- favorite_games: TEXT[] -- array of game titles
- gaming_platforms: TEXT[] -- ['PC', 'Mobile', 'PlayStation', 'Switch', 'Xbox']
- gaming_hours_weekly: INTEGER (nullable, self-reported)
- wellness_goals: TEXT[] -- ['fitness', 'mental_health', 'nutrition', 'sleep', 'social']
- xp: INTEGER (default 0)
- level: INTEGER (default 1)
- current_streak_days: INTEGER (default 0)
- longest_streak_days: INTEGER (default 0)
- public_visibility: BOOLEAN (default true) -- whether profile shows on leaderboards
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### HealthData
```
-- TimescaleDB hypertable, partitioned by time
- id: UUID (PK)
- user_id: UUID (FK -> User)
- source: ENUM('apple_health', 'health_connect', 'fitbit', 'garmin', 'open_wearables', 'self_report')
- metric_type: ENUM('steps', 'heart_rate', 'sleep_duration', 'sleep_quality', 'active_minutes', 'calories', 'workout', 'mood', 'stress', 'weight', 'bmi')
- value: NUMERIC
- unit: TEXT -- 'steps', 'bpm', 'minutes', 'kcal', 'kg', 'score_1_10'
- recorded_at: TIMESTAMPTZ -- when the measurement was taken
- synced_at: TIMESTAMPTZ -- when it was received by our system
- metadata: JSONB (nullable) -- device info, workout type, sleep stages, etc.
- consent_id: UUID (FK -> Consent) -- which consent authorized this data point
```

### Consent
```
- id: UUID (PK)
- user_id: UUID (FK -> User)
- category: ENUM('basic_profile', 'event_participation', 'health_self_reports', 'wearable_data', 'gaming_habits', 'b2b_insurers', 'b2b_healthcare', 'b2b_brands', 'cross_border', 'research')
- status: ENUM('granted', 'revoked', 'expired')
- granted_at: TIMESTAMPTZ
- revoked_at: TIMESTAMPTZ (nullable)
- expires_at: TIMESTAMPTZ -- consents must be time-bound (12 months default, renewable)
- ip_address: INET -- captured at time of grant for audit
- user_agent: TEXT -- captured at time of grant for audit
- version: INTEGER -- consent text version accepted
- purpose_text: TEXT -- exact text shown to user at time of consent (immutable)
- guardian_user_id: UUID (nullable, FK -> User) -- for minor consent
```

### Event
```
- id: UUID (PK)
- title: TEXT
- description: TEXT
- type: ENUM('meetup', 'general_event', 'club_session')
- game_theme: TEXT (nullable) -- e.g., 'Dota 2', 'Free Fire', 'Minecraft'
- city: TEXT
- venue_name: TEXT
- venue_address: TEXT
- venue_coordinates: POINT (nullable) -- lat/lng for maps
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- capacity: INTEGER
- registration_count: INTEGER (default 0)
- status: ENUM('draft', 'published', 'cancelled', 'completed')
- club_id: UUID (nullable, FK -> Club) -- if club session
- organizer_user_id: UUID (FK -> User)
- cover_image_url: TEXT (nullable)
- xp_reward: INTEGER (default 50)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Attendance
```
- id: UUID (PK)
- event_id: UUID (FK -> Event)
- user_id: UUID (FK -> User)
- registered_at: TIMESTAMPTZ
- checked_in_at: TIMESTAMPTZ (nullable) -- QR scan timestamp
- check_in_method: ENUM('qr_code', 'manual', 'geofence')
- xp_awarded: BOOLEAN (default false)
- post_event_survey: JSONB (nullable) -- optional feedback
- created_at: TIMESTAMPTZ
```

### Achievement
```
- id: UUID (PK)
- slug: TEXT (UNIQUE) -- 'first_event', '30_day_streak', 'linked_wearable', etc.
- title: TEXT -- display name
- title_es: TEXT -- Spanish display name
- description: TEXT
- description_es: TEXT
- icon_url: TEXT
- xp_reward: INTEGER
- category: ENUM('community', 'wellness', 'events', 'social', 'milestones')
- criteria: JSONB -- machine-readable unlock conditions for gengine
- is_active: BOOLEAN (default true)
- created_at: TIMESTAMPTZ
```

### UserAchievement (join table)
```
- id: UUID (PK)
- user_id: UUID (FK -> User)
- achievement_id: UUID (FK -> Achievement)
- unlocked_at: TIMESTAMPTZ
- context: JSONB (nullable) -- e.g., which event, which challenge
- UNIQUE(user_id, achievement_id)
```

### Challenge
```
- id: UUID (PK)
- title: TEXT
- title_es: TEXT
- description: TEXT
- description_es: TEXT
- type: ENUM('steps', 'active_minutes', 'sleep', 'mood_check', 'event_attendance', 'custom')
- goal_value: NUMERIC -- target to complete (e.g., 70000 steps)
- goal_unit: TEXT -- 'steps', 'minutes', 'hours', 'count'
- duration_days: INTEGER
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- xp_reward: INTEGER
- max_participants: INTEGER (nullable)
- participant_count: INTEGER (default 0)
- status: ENUM('upcoming', 'active', 'completed', 'cancelled')
- created_by: UUID (FK -> User, nullable) -- null = system-generated
- club_id: UUID (nullable, FK -> Club) -- club-specific challenge
- created_at: TIMESTAMPTZ
```

### ChallengeParticipation
```
- id: UUID (PK)
- challenge_id: UUID (FK -> Challenge)
- user_id: UUID (FK -> User)
- progress_value: NUMERIC (default 0)
- progress_pct: NUMERIC (computed, 0-100)
- completed_at: TIMESTAMPTZ (nullable)
- joined_at: TIMESTAMPTZ
- UNIQUE(challenge_id, user_id)
```

### Club
```
- id: UUID (PK)
- name: TEXT
- slug: TEXT (UNIQUE)
- description: TEXT
- city: TEXT
- game_focus: TEXT (nullable) -- primary game association
- activity_type: TEXT (nullable) -- 'running', 'hiking', 'cycling', 'chill', 'foodie'
- cover_image_url: TEXT (nullable)
- leader_user_id: UUID (FK -> User)
- member_count: INTEGER (default 0)
- max_members: INTEGER (nullable)
- is_active: BOOLEAN (default true)
- discord_channel_id: TEXT (nullable) -- linked Discord channel
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### ClubMembership
```
- id: UUID (PK)
- club_id: UUID (FK -> Club)
- user_id: UUID (FK -> User)
- role: ENUM('member', 'moderator', 'leader')
- joined_at: TIMESTAMPTZ
- UNIQUE(club_id, user_id)
```

### Partner
```
- id: UUID (PK)
- name: TEXT
- type: ENUM('insurer', 'healthcare', 'brand', 'sponsor', 'venue', 'gaming')
- contact_name: TEXT
- contact_email: TEXT
- contract_start: DATE (nullable)
- contract_end: DATE (nullable)
- data_categories_authorized: TEXT[] -- which consent categories they may access
- api_key_hash: TEXT (nullable) -- for API access
- is_active: BOOLEAN (default true)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Campaign
```
- id: UUID (PK)
- partner_id: UUID (FK -> Partner)
- name: TEXT
- type: ENUM('sponsorship', 'activation', 'data_access', 'event_sponsorship', 'content')
- description: TEXT
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ
- budget: NUMERIC (nullable)
- target_audience: JSONB -- segment criteria (age range, city, game preferences, etc.)
- status: ENUM('draft', 'active', 'paused', 'completed')
- metrics: JSONB (nullable) -- impressions, clicks, conversions
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### AuditLog
```
-- Immutable, append-only table. No UPDATE or DELETE allowed.
- id: UUID (PK)
- timestamp: TIMESTAMPTZ (default NOW())
- actor_type: ENUM('user', 'system', 'partner', 'admin')
- actor_id: TEXT -- user ID, partner ID, or 'system'
- action: TEXT -- 'consent.grant', 'consent.revoke', 'data.access', 'data.export', 'data.delete', 'b2b.query', etc.
- resource_type: TEXT -- 'consent', 'health_data', 'profile', 'event', etc.
- resource_id: TEXT (nullable)
- details: JSONB -- action-specific metadata
- ip_address: INET (nullable)
- user_agent: TEXT (nullable)
```

### Entity Relationship Summary

```
User 1--1 Profile
User 1--* Consent
User 1--* HealthData
User 1--* Attendance
User 1--* UserAchievement
User 1--* ChallengeParticipation
User 1--* ClubMembership
User *--* Club (via ClubMembership)
User *--* Achievement (via UserAchievement)
User *--* Challenge (via ChallengeParticipation)
User *--* Event (via Attendance)
Club 1--* Event (club_session type)
Club 1--* Challenge (club-specific)
Partner 1--* Campaign
Event 1--* Attendance
Challenge 1--* ChallengeParticipation
Achievement 1--* UserAchievement
AuditLog -- standalone, references by actor_id/resource_id (no FK for immutability)
```

---

## Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Mobile** | React Native (Expo) | Native HealthKit/Health Connect access via expo-health. Largest talent pool in LATAM. Single codebase for iOS/Android. Expo EAS Build simplifies CI/CD. |
| **Web** | Next.js 14+ (App Router) | Code sharing with React Native (shared types, API client). SSR/SSG for SEO (critical for content/blog discovery). Server Components reduce client bundle. |
| **Backend API** | NestJS + Fastify | TypeScript end-to-end with frontend. Fastify is 30-40% faster than Express. NestJS provides structured DI, guards, interceptors ideal for consent middleware. Large ecosystem of NestJS modules. |
| **Database** | Supabase (managed PostgreSQL) | Row-Level Security natively enforced at DB level (critical for health data). Built-in Auth with JWT. Realtime subscriptions for leaderboards. Self-hostable if LOPDP requires on-premise. PostgREST layer for simple CRUD reduces API code. |
| **Time-Series** | TimescaleDB (Postgres extension) | Runs as extension within Supabase PostgreSQL -- no separate database to manage. Hypertables for wearable data with automatic time-based partitioning. Continuous aggregates for efficient B2B reporting. |
| **Cache / Queues** | Redis (Upstash serverless) | Sorted sets for leaderboards (O(log N) insert/rank). BullMQ for job queues. Session caching. Upstash serverless tier starts at $0 (10K commands/day free). |
| **Wearable Integration** | Open Wearables (MIT, free) | 200+ device support. Self-hosted (data sovereignty). React Native SDK available. Zero per-user cost vs. Terra ($0.20/user/mo) or ROOK ($0.15/user/mo). At 10K users, saves $1,500-2,000/mo. |
| **Gamification** | gengine (MIT, Go) | REST API, rule-based engine with geo-awareness and social features. Self-hosted. Handles complex rule evaluation (if X and Y and streak > 7, award Z). Avoids building custom gamification logic. |
| **Product Analytics** | PostHog (self-hosted) | Free unlimited events when self-hosted. Feature flags for gradual rollouts. Session recording for UX debugging. Funnels and retention analysis. Data stays under our control (LOPDP). |
| **B2B Dashboards** | Metabase (open source) | Embeddable iframes in partner portal. Connects directly to PostgreSQL. SQL-based -- non-technical partners can use the query builder. No per-seat cost for open source. |
| **Community** | Discord (discord.js v14) | 259M MAU, dominant in gaming communities. 94 min average daily engagement. Free to operate. BUT: data collection happens exclusively outside Discord. |
| **Email / Notifications** | Resend (email) + FCM/APNs (push) | Resend: 3,000 emails/mo free, developer-friendly API. FCM: free unlimited push via Expo Push Notifications. |
| **File Storage** | Supabase Storage | Integrated with Supabase Auth and RLS. S3-compatible. Profile images, event covers, achievement icons. |
| **Payments** (Phase 2+) | Stripe | Standard for SaaS/membership payments. Available in Ecuador. Handles recurring billing for premium memberships. |
| **Monitoring** | Sentry + UptimeRobot | Sentry free tier: 5K errors/mo. UptimeRobot free tier: 50 monitors. Sufficient for MVP. |

### MVP Monthly Cost Estimate

| Service | Tier | Cost/mo |
|---------|------|---------|
| Supabase | Pro | $25 |
| Upstash Redis | Pay-as-go | $0-10 |
| Railway/Render (API + workers) | Starter | $20-40 |
| Railway/Render (gengine) | Starter | $7-15 |
| PostHog (self-hosted on Railway) | Free | $10 (hosting) |
| Metabase (self-hosted on Railway) | Free | $7-10 (hosting) |
| Vercel (Next.js) | Hobby/Pro | $0-20 |
| Open Wearables (self-hosted) | Free | $5-10 (hosting) |
| Resend | Free tier | $0 |
| Sentry | Free tier | $0 |
| UptimeRobot | Free tier | $0 |
| Domain + DNS | -- | $2-5 |
| **TOTAL** | | **$76-185/mo** |

Fits within the $100-260/mo budget with room for growth.

---

## API Design

Base URL: `https://api.gamerwellness.ec/v1`

### Authentication & Consent

```
POST   /auth/register                    -- Email/password registration
POST   /auth/login                       -- Email/password login, returns JWT
POST   /auth/refresh                     -- Refresh JWT
POST   /auth/discord/link                -- Link Discord account via OAuth2 callback
DELETE /auth/discord/link                -- Unlink Discord account
POST   /auth/forgot-password             -- Initiate password reset

GET    /consent                          -- List all consent statuses for current user
POST   /consent                          -- Grant consent for a specific category
PUT    /consent/:id/revoke               -- Revoke a specific consent
GET    /consent/history                  -- Full consent change history (audit)
GET    /consent/text/:category/:version  -- Get consent text for a category/version
```

### Profiles

```
GET    /profile                          -- Get current user's profile
PUT    /profile                          -- Update profile fields
GET    /profile/:userId                  -- Get public profile of another user
GET    /profile/me/stats                 -- Gamification stats (XP, level, streak)
GET    /profile/me/achievements          -- User's unlocked achievements
POST   /profile/me/data-export           -- Request LOPDP data export (async, emailed)
POST   /profile/me/data-delete           -- Request LOPDP data deletion (async, confirmed)
```

### Events

```
GET    /events                           -- List upcoming events (filterable by city, type, game)
POST   /events                           -- Create event (organizer/admin role)
GET    /events/:id                       -- Event detail
PUT    /events/:id                       -- Update event
DELETE /events/:id                       -- Cancel event (soft delete)
POST   /events/:id/register             -- Register for event
DELETE /events/:id/register             -- Cancel registration
POST   /events/:id/checkin              -- Check in via QR code (requires signed token)
POST   /events/:id/survey               -- Submit post-event survey
GET    /events/:id/attendees            -- List attendees (organizer only)
```

### Wellness Data

```
POST   /wellness/sync                    -- Batch upload wearable/health data (from mobile app)
GET    /wellness/summary                 -- Daily/weekly/monthly wellness summary
GET    /wellness/history                 -- Time-series data for a specific metric
GET    /wellness/trends                  -- Trend analysis (7d, 30d, 90d rolling averages)
POST   /wellness/self-report             -- Submit mood/stress/sleep quality self-report
GET    /wellness/connections             -- List connected wearable sources
POST   /wellness/connections/:source     -- Connect a wearable source (OAuth2 initiation)
DELETE /wellness/connections/:source     -- Disconnect a wearable source
```

### Gamification

```
GET    /challenges                       -- List active/upcoming challenges
GET    /challenges/:id                   -- Challenge detail with participant ranking
POST   /challenges/:id/join             -- Join a challenge
GET    /challenges/:id/progress          -- Current user's progress in challenge
GET    /leaderboard                      -- Global leaderboard (paginated)
GET    /leaderboard/weekly               -- Weekly leaderboard
GET    /leaderboard/club/:clubId         -- Club-specific leaderboard
GET    /achievements                     -- List all available achievements
GET    /achievements/:slug               -- Achievement detail with unlock stats
```

### Clubs

```
GET    /clubs                            -- List active clubs (filterable by city, game, activity)
POST   /clubs                            -- Create a club (requires minimum level)
GET    /clubs/:id                        -- Club detail with member count, upcoming events
POST   /clubs/:id/join                   -- Join a club
DELETE /clubs/:id/leave                  -- Leave a club
GET    /clubs/:id/members                -- List club members
POST   /clubs/:id/challenges             -- Create club-specific challenge (leader/mod only)
```

### B2B (Partner-authenticated, separate API key auth)

```
GET    /b2b/segments                     -- Available audience segments
GET    /b2b/aggregate/:segment           -- Aggregated, anonymized data for a segment
GET    /b2b/reports                      -- Pre-built report catalog
GET    /b2b/reports/:id                  -- Download specific report
GET    /b2b/campaigns                    -- List partner's campaigns
POST   /b2b/campaigns                    -- Create campaign (sponsorship, activation)
GET    /b2b/campaigns/:id/metrics        -- Campaign performance metrics
GET    /b2b/consent-stats                -- How many users consent to this partner category
```

### Common Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 142,
    "consent_active": true
  },
  "error": null
}
```

### API Versioning

URL-based versioning (`/v1/`, `/v2/`). Major version bumps only for breaking changes. Minor additions (new fields, new endpoints) are non-breaking. Deprecated endpoints return `Sunset` header 90 days before removal.

---

## Infrastructure

### Hosting Strategy

**Primary**: Managed cloud services with data sovereignty considerations for Ecuador LOPDP.

- **Supabase Cloud (Pro)**: Primary database + auth + storage + realtime. Supabase offers AWS us-east-1 by default; for LOPDP compliance, evaluate self-hosting on a South American region (AWS sa-east-1 in Sao Paulo or GCP southamerica-east1) if the Superintendencia de Proteccion de Datos requires data residency in Ecuador or LATAM. Supabase is fully self-hostable via Docker.
- **Railway or Render**: For NestJS API, BullMQ workers, gengine, PostHog, and Metabase. Railway has a Sao Paulo region. Render has Oregon (closest with latency acceptable for MVP).
- **Vercel**: Next.js web app deployment. Edge network provides low-latency serving globally. Serverless functions for lightweight API routes.
- **Expo EAS**: Build and OTA update service for React Native app.

**Data Sovereignty Path**:
1. **Phase 1 (MVP)**: Supabase Cloud Pro + Railway (cheapest, fastest to deploy). Document data flows for DPIA.
2. **Phase 2 (Post-DPIA)**: If LOPDP requires LATAM residency, migrate to Supabase self-hosted on AWS sa-east-1 (Sao Paulo). NestJS moves to same region.
3. **Phase 3 (Scale)**: If Ecuador requires in-country residency, evaluate CNT/Google Cloud Ecuador partnership for local hosting.

### CI/CD Pipeline

```
GitHub Repository
    |
    +-- Push to main --> GitHub Actions
    |       |
    |       +-- Lint + Type Check (ESLint, TypeScript)
    |       +-- Unit Tests (Vitest)
    |       +-- Integration Tests (against Supabase local via Docker)
    |       +-- Build verification
    |       |
    |       +-- Deploy to Staging
    |       |       +-- API -> Railway (staging)
    |       |       +-- Web -> Vercel (preview)
    |       |       +-- Run E2E tests (Playwright)
    |       |
    |       +-- Manual approval gate
    |       |
    |       +-- Deploy to Production
    |               +-- API -> Railway (production)
    |               +-- Web -> Vercel (production)
    |               +-- DB migrations -> Supabase CLI
    |
    +-- Push to feature/* --> PR Preview
            +-- Vercel preview deployment
            +-- Automated test run
            +-- Bot comments with preview URL
```

**Mobile CI/CD**:
- Expo EAS Build triggered on tagged commits
- OTA updates for JS-only changes (no native module changes)
- TestFlight (iOS) and Internal Testing (Android) for beta builds
- App Store / Play Store submission via EAS Submit

### Monitoring & Observability

| Concern | Tool | Details |
|---------|------|---------|
| Error tracking | Sentry (free tier) | 5K errors/mo. Source maps for React/React Native. |
| Uptime monitoring | UptimeRobot (free tier) | HTTP checks every 5 min for API, web, and critical endpoints |
| Application metrics | PostHog | Custom events, funnels, feature flag evaluation |
| Database monitoring | Supabase Dashboard | Query performance, connection pool, storage usage |
| Log aggregation | Railway logs + Logflare | Structured JSON logs from NestJS. Logflare free tier for search. |
| Alerts | UptimeRobot + Sentry | Email/Slack/Discord webhook alerts on downtime or error spikes |
| Health checks | NestJS Terminus | `/health` endpoint with DB, Redis, and queue connectivity checks |

### Backup Strategy

- **Supabase Pro**: Daily automated backups with 7-day retention. Point-in-time recovery available.
- **Redis (Upstash)**: Persistent storage with automatic snapshots.
- **Code**: GitHub with branch protection on `main`. Required PR reviews.
- **Secrets**: Environment variables in Railway/Vercel. Never committed to repository.
- **Audit Logs**: Immutable table with no DELETE permissions. Archived to cold storage monthly after 12 months.

---

## Architecture Decision Records

### ADR-001: Discord as Community-Only Channel (No Data Collection)

- **Context**: Discord is the natural hub for gaming communities (259M MAU, 94 min/day engagement). However, Discord's Developer Policy explicitly prohibits disclosing API Data to "data brokers, advertising networks, or monetization-related services." The project's B2B layer relies on monetizing aggregated user data. These two facts are in direct conflict.
- **Decision**: Discord serves exclusively as the community and engagement layer. All data collection, health tracking, consent management, and monetization occur on the owned platform (web app and mobile app). The Discord bot bridges identity (via OAuth2 account linking) and pushes read-only content (event announcements, leaderboard summaries, challenge notifications) but never collects or transmits user behavioral data from Discord to the data platform.
- **Consequences**:
  - Users must take an extra step to link their Discord account to their platform profile
  - The Discord-to-App conversion funnel becomes a critical metric
  - Community engagement data from Discord (message frequency, voice participation) cannot be used in B2B offerings
  - The bot is simpler to build and maintain (read-only bridge)
  - Full compliance with Discord TOS, eliminating platform risk

### ADR-002: Supabase over Firebase (Data Sovereignty + RLS)

- **Context**: The project needs a backend-as-a-service for rapid MVP development. Firebase and Supabase are the two leading options. Ecuador's LOPDP mandates specific handling of sensitive health data, including potential data residency requirements. Firebase stores data in Google-managed infrastructure with limited region control and proprietary lock-in. Supabase is built on PostgreSQL, fully self-hostable, and provides native Row-Level Security.
- **Decision**: Use Supabase as the primary database and auth provider.
- **Consequences**:
  - RLS policies enforce consent-based data access at the database level (defense in depth -- even if API has a bug, DB rejects unauthorized reads)
  - Self-hosting path available if LOPDP requires on-premise or specific-region hosting
  - PostgreSQL ecosystem (TimescaleDB, PostGIS, pg_crypto) eliminates need for separate databases
  - Supabase client SDK works in both React Native and Next.js
  - Trade-off: Supabase ecosystem is smaller than Firebase's (fewer pre-built UI components, less documentation for edge cases)
  - Trade-off: Supabase Realtime is less battle-tested than Firebase Realtime Database at massive scale (acceptable for MVP)

### ADR-003: Open Wearables over Terra/ROOK (Cost at Scale)

- **Context**: The platform needs to ingest health data from Apple Watch, Fitbit, Garmin, and Android devices. Three options evaluated: (a) Terra API ($0.20/user/mo), (b) ROOK SDK ($0.15/user/mo), (c) Open Wearables (MIT, free, self-hosted). At 10,000 users with wearables connected, Terra costs $2,000/mo and ROOK costs $1,500/mo -- exceeding the entire infrastructure budget.
- **Decision**: Use Open Wearables (MIT license) as the wearable abstraction layer, supplemented by direct native integrations for Apple HealthKit and Health Connect via React Native native modules.
- **Consequences**:
  - Zero per-user cost for wearable data ingestion
  - 200+ device support through Open Wearables
  - Self-hosted: data never leaves our infrastructure (LOPDP compliance)
  - Trade-off: More initial development effort to integrate and maintain
  - Trade-off: Must handle device-specific quirks ourselves (Terra/ROOK abstract these away)
  - Trade-off: Open Wearables is younger and less documented than commercial alternatives
  - Mitigation: Direct HealthKit/Health Connect integration covers 85%+ of users (iOS + Android); Open Wearables handles the long tail (Fitbit, Garmin, Oura, etc.)

### ADR-004: Consent-First Data Architecture

- **Context**: Ecuador's LOPDP (Ley Organica de Proteccion de Datos Personales) requires explicit, informed, specific consent for processing sensitive data (health data qualifies). The SPDP (regulatory body) has actively fined sports organizations in 2026 (LigaPro: $259K, FEF: $195K). Consent must be granular, purpose-specific, time-bound, and individually revocable. Additionally, true anonymization of behavioral data in small populations is technically near-impossible, so the system must treat all data as identifiable.
- **Decision**: Implement a consent-first architecture where: (1) every data write operation verifies active consent for the specific data category, (2) consent is stored as a first-class entity with full audit trail, (3) Row-Level Security policies in Supabase enforce consent at the database level, (4) B2B data access is filtered through consent verification at query time, (5) consent revocation triggers immediate cessation of processing.
- **Consequences**:
  - Every API endpoint that touches user data has consent-checking middleware
  - RLS policies on HealthData, Profile, and related tables include consent status checks
  - B2B queries are slower (must join with consent table and filter) but correct
  - Users have full visibility and control over their data via the consent dashboard
  - Trade-off: Development is slower (every feature must consider consent flow)
  - Trade-off: Some gamification features (leaderboards) may show fewer participants if users revoke certain consents
  - Mitigation: Default gamification (XP, levels, streaks) works on event attendance and challenge completion, which require only basic_profile consent

### ADR-005: NestJS Monolith over Microservices

- **Context**: The system has multiple logical domains (auth, profiles, events, wellness, gamification, B2B). A microservices architecture would provide independent deployment and scaling. However, the team is small (likely 1-3 developers), the budget is constrained, and operational complexity of microservices (service discovery, distributed tracing, inter-service communication) is prohibitive at this stage.
- **Decision**: Build as a modular NestJS monolith with clear module boundaries. Each domain (auth, consent, events, wellness, gamification, b2b) is a separate NestJS module with its own controllers, services, and DTOs. The gengine gamification engine runs as a separate sidecar service because it is a pre-built Go binary, not because of a microservices architecture decision.
- **Consequences**:
  - Single deployment unit simplifies CI/CD, monitoring, and debugging
  - Module boundaries provide a clear migration path to microservices if/when needed
  - Shared database access simplifies joins and transactions (especially consent checks)
  - Trade-off: Cannot independently scale individual domains
  - Trade-off: A bug in one module can affect the entire application
  - Mitigation: BullMQ workers run as separate processes for heavy async work, providing some isolation

### ADR-006: Bilingual Spanish-First Architecture

- **Context**: The platform launches in Ecuador (Spanish) with plans to scale across LATAM and eventually globally. Content, UI, notifications, consent texts, and achievement descriptions must support at minimum Spanish and English.
- **Decision**: All user-facing strings are internationalized from day one using i18next (shared between Next.js and React Native). Database entities with user-facing text (achievements, challenges, events) store both `title` and `title_es` / `description` and `description_es` fields. Consent texts are versioned and stored in both languages. The default locale is `es-EC`.
- **Consequences**:
  - Slightly more verbose data model (dual language fields)
  - i18next namespace structure shared across web and mobile reduces duplication
  - Adding new languages later requires only translation files, not schema changes (for UI strings) and new columns (for DB content)
  - Trade-off: Two-column approach for DB content is simpler than a full translation table system but less flexible for 5+ languages
  - Mitigation: When expanding beyond ES/EN, migrate to a `translations` JSONB column or separate translation table

### ADR-007: k-Anonymity Threshold for B2B Data Access

- **Context**: True anonymization of behavioral data in small populations (e.g., female gamers aged 25-30 in Cuenca who play Valorant) is technically near-impossible. If data is re-identifiable, full LOPDP applies, and the platform bears liability as data source. Insurers using granular data for price discrimination creates additional legal and ethical risk.
- **Decision**: Enforce a minimum k-anonymity threshold of k=50 for all B2B aggregate queries. Any query that would return results representing fewer than 50 distinct consenting users is rejected with an error. Aggregate functions (AVG, MEDIAN, percentiles) are used instead of individual records. No raw data is ever exposed through B2B endpoints.
- **Consequences**:
  - B2B partners receive useful population-level insights without individual identification risk
  - Some narrow segments may not be queryable until sufficient users exist
  - Trade-off: Reduces granularity of B2B data product
  - Mitigation: As community grows, more segments become available. City-level data for Quito (large population) available sooner than Cuenca (smaller population).

---

## Integration Points

### 1. Discord Integration

| Integration | Method | Direction | Purpose |
|-------------|--------|-----------|---------|
| Account Linking | Discord OAuth2 (1-Click) | Bidirectional | Bridge Discord identity to platform profile |
| Event Announcements | discord.js + Webhook | Platform -> Discord | Announce new events, registration reminders |
| Leaderboard Updates | discord.js embeds | Platform -> Discord | Weekly leaderboard summary posts |
| Challenge Notifications | discord.js embeds | Platform -> Discord | New challenge announcements, completion celebrations |
| Slash Commands | discord.js interactions | Discord -> Platform API | `/link`, `/events`, `/leaderboard`, `/profile`, `/challenge` |
| Discord Activities API | Embedded app in voice channel | Bidirectional | (Phase 2) Wellness mini-games/challenges during voice sessions |

**Implementation Notes**:
- Bot runs as standalone Node.js service with discord.js v14
- Uses Discord Gateway intents: `Guilds`, `GuildMembers` (for welcome messages), `GuildMessages` (for slash commands only)
- Does NOT use `MessageContent` intent (no message content reading)
- Account linking stores only `discord_id` in User table; no Discord profile data is cached

### 2. Wearable Integrations

| Platform | Method | Data Flow | Notes |
|----------|--------|-----------|-------|
| Apple HealthKit | React Native native module (expo-health) | On-device -> App -> API | Read-only access. User grants permissions in iOS Health app. Background sync. |
| Health Connect (Android) | React Native native module | On-device -> App -> API | Replaces deprecated Google Fit. Permissions per data type. |
| Fitbit | Fitbit Web API + OAuth2 + Webhooks | Cloud -> API (webhook) + API -> Cloud (query) | User authorizes via Fitbit OAuth2. Webhook notifications for new data. |
| Garmin | Garmin Connect IQ + Health API | Cloud -> API (push) | Garmin pushes data via registered endpoint. |
| Other (200+ devices) | Open Wearables SDK | Device -> Open Wearables -> API | Self-hosted aggregation service. REST API for data retrieval. |

**Unified Data Pipeline**:
1. Mobile app or cloud webhook delivers raw health data
2. API server validates payload structure and checks active consent for `wearable_data` category
3. Data is normalized to common schema (metric_type, value, unit, recorded_at)
4. Normalized data is written to TimescaleDB hypertable
5. BullMQ job is enqueued for gamification recalculation (step challenges, activity achievements)
6. Continuous aggregates in TimescaleDB pre-compute daily/weekly/monthly rollups

### 3. Payment Processing (Phase 2+)

| Integration | Purpose | Method |
|-------------|---------|--------|
| Stripe Checkout | Premium membership subscription | Stripe SDK + Webhooks |
| Stripe Connect | Event ticket sales (if applicable) | Stripe Connect platform |
| Stripe Billing | Recurring B2B partner invoicing | Stripe Billing API |

**Notes**:
- Stripe is available in Ecuador and supports USD (dolarized economy)
- Free tier users are never charged; payment is only for premium features and B2B services
- Webhook events update subscription status in Supabase
- PCI compliance handled by Stripe (no card data touches our servers)

### 4. Email & Notifications

| Channel | Provider | Use Cases |
|---------|----------|-----------|
| Email | Resend | Welcome emails, consent confirmations, event reminders, data export delivery, password reset |
| Push (iOS) | APNs via Expo Push | Challenge reminders, event check-in prompts, achievement unlocks, community updates |
| Push (Android) | FCM via Expo Push | Same as iOS |
| Discord | discord.js Webhook | Event announcements, leaderboard updates, community milestones |
| WhatsApp (Phase 2) | WhatsApp Business API | Event reminders for users who prefer WhatsApp (dominant in Ecuador) |

**Notification Preferences**: Users control notification channels and categories in app settings. All notifications are dispatched through BullMQ queue for reliability and rate limiting.

### 5. Analytics & Tracking

| Integration | Method | Purpose |
|-------------|--------|---------|
| PostHog (self-hosted) | JS SDK (web), React Native SDK (mobile) | Product analytics, funnels, retention, feature flags |
| Metabase | Direct PostgreSQL connection (read replica) | B2B dashboards, internal reporting |
| Sentry | JS SDK (web + mobile), Node.js SDK (API) | Error tracking, performance monitoring |

### 6. Content & Social Media

| Platform | Integration | Purpose |
|----------|-------------|---------|
| YouTube | YouTube Data API v3 (read-only) | Embed latest videos on web, track view counts |
| TikTok | Deep links only | Drive traffic to app/web (no API integration needed for MVP) |
| Instagram | Instagram Basic Display API | Embed feed on web (optional, Phase 2) |

---

## Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **LOPDP enforcement action** | Critical -- fines of 0.1-1% turnover + data deletion + suspension | Medium | Hire DPO, conduct DPIA before any data collection, implement consent-first architecture, engage Ecuadorian data privacy counsel |
| **Discord TOS violation** | High -- bot banned, community loses hub | Low (if ADR-001 followed) | Strict separation enforced by architecture. Code review checklist includes Discord data boundary verification. |
| **Re-identification of "anonymized" data** | Critical -- LOPDP liability, reputational damage | Medium (small populations) | k-anonymity k>=50 threshold, no raw data in B2B, differential privacy noise for small cohorts |
| **Wearable API deprecation** | Medium -- data ingestion disrupted | Medium (Google Fit already deprecated) | Open Wearables abstraction layer isolates from individual API changes. Direct HealthKit/Health Connect integration for primary platforms. |
| **Mental health crisis in community** | High -- duty of care, legal liability | High (given target audience) | Crisis intervention protocol from day one. Partner with licensed mental health service in Ecuador. Moderator training. Automated keyword detection for crisis language in Discord (route to resources, not data collection). |
| **Supabase downtime** | High -- entire platform unavailable | Low | Supabase Pro SLA. Self-hosting migration plan documented. Daily backups with tested restoration procedure. |
| **Slow B2B sales cycle** | High -- revenue delayed 12-24 months | High (based on industry data) | Revenue model does NOT depend on B2B. Phase 1-2 revenue from content, memberships, sponsorships, events. B2B is Phase 3+ upside. |
| **React Native / Expo breaking changes** | Medium -- mobile development delays | Medium | Pin Expo SDK version. Upgrade only after community validation. E2E tests catch regressions. |
| **Open Wearables maintenance risk** | Medium -- MIT project could become abandoned | Low-Medium | Fork the repository. Core HealthKit/Health Connect integrations are direct (not dependent on Open Wearables). Open Wearables handles only long-tail devices. |
| **Cross-border data transfer (LATAM expansion)** | Medium -- each country has different requirements | Medium | Separate consent category for cross-border transfers. Per-country DPIA. Standard Contractual Clauses where applicable. |

---

## Security Architecture

### Defense in Depth Layers

1. **Network**: HTTPS/TLS everywhere. API behind rate limiting (per-IP and per-user). CORS restricted to owned domains.
2. **Authentication**: Supabase Auth with JWT. Multi-factor authentication available. Session management with refresh token rotation. Discord OAuth2 for account linking (not primary auth).
3. **Authorization**: Row-Level Security in Supabase (database-level enforcement). NestJS Guards for role-based access (user, organizer, admin, partner). Consent verification middleware on every data endpoint.
4. **Data Encryption**: Encryption at rest (Supabase default, AES-256). Encryption in transit (TLS 1.3). Sensitive fields (email, phone, date_of_birth) additionally encrypted at application level using pg_crypto.
5. **Audit Trail**: Immutable AuditLog table (no UPDATE/DELETE permissions). All data access, consent changes, and B2B queries logged with actor, timestamp, IP, and action details.
6. **API Security**: Input validation on all endpoints (class-validator). SQL injection prevention (parameterized queries via Supabase SDK). XSS prevention (React's default escaping + CSP headers). CSRF protection (SameSite cookies + CSRF tokens for state-changing operations).
7. **Secret Management**: Environment variables in deployment platform (Railway/Vercel). No secrets in code or version control. API keys for B2B partners are hashed (bcrypt) and stored; plaintext shown only at creation.

### Health Data Specific Controls

- Health data (HealthData table) has the most restrictive RLS policies: only the data owner can read their own data, only with active consent
- B2B access goes through materialized views with k-anonymity enforcement; never touches raw HealthData table
- Data retention: health data auto-archived after 24 months unless user re-consents
- Right to deletion: user can request full deletion; processed within 72 hours per LOPDP requirements
- Data export: user can request full data export in machine-readable format (JSON); processed within 30 days per LOPDP

---

## Phased Implementation Roadmap (Technical)

### Phase 1: Foundation (Months 0-3)

**Goal**: Discord bot live, web landing page, basic event management, account system.

- Supabase project setup with Auth, RLS policies for User/Profile/Consent/Event/Attendance
- NestJS API with auth, profile, consent, and event modules
- Discord bot with `/link`, `/events`, `/leaderboard` commands
- Next.js web app: landing page, event listing, registration, basic profile
- PostHog self-hosted for analytics
- CI/CD pipeline (GitHub Actions + Railway + Vercel)
- Consent management system (grant/revoke/audit for basic categories)
- Email integration (Resend) for transactional emails

**Deliverables**: Working web + Discord bot + API. Users can register, link Discord, browse/register for events, manage basic consent.

### Phase 2: Community + Health Data (Months 3-9)

**Goal**: Mobile app launched, wearable integration, gamification system, clubs.

- React Native (Expo) app: health data capture, wearable sync, challenges, profile
- Open Wearables integration + direct HealthKit/Health Connect
- TimescaleDB hypertables for health data
- gengine deployment for gamification rules
- Redis leaderboards and BullMQ job queues
- Club system (create, join, club events, club challenges)
- Achievement system with initial badge catalog
- Wellness challenge engine (step challenges, sleep challenges, etc.)
- Push notification infrastructure
- Expanded consent categories (wearable_data, health_self_reports, gaming_habits)

**Deliverables**: Full mobile app. Users can connect wearables, participate in challenges, join clubs, earn XP/achievements.

### Phase 3: Monetization + B2B (Months 9-24)

**Goal**: B2B dashboard live, premium features, LATAM expansion preparation.

- Metabase B2B dashboard with embeddable partner portal
- k-anonymity enforcement layer for aggregate queries
- Partner management system (accounts, API keys, authorized categories)
- Campaign management for sponsorships and activations
- Stripe integration for premium memberships
- WhatsApp Business API for notifications
- Data anonymization pipeline for B2B aggregates
- DPIA documentation for each B2B data category
- Internationalization infrastructure for LATAM expansion (Colombia, Mexico)
- Performance optimization for growing user base

**Deliverables**: B2B partners can access aggregated insights. Premium membership tier available. Platform ready for multi-country operation.

---

## Appendix: Row-Level Security Policy Examples

### HealthData table -- Users can only read their own data with active consent

```sql
CREATE POLICY "Users read own health data with consent"
ON health_data FOR SELECT
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM consent
    WHERE consent.user_id = health_data.user_id
    AND consent.category = 'wearable_data'
    AND consent.status = 'granted'
    AND consent.expires_at > NOW()
  )
);
```

### HealthData table -- Insert requires active consent

```sql
CREATE POLICY "Insert health data requires consent"
ON health_data FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM consent
    WHERE consent.user_id = health_data.user_id
    AND consent.category = 'wearable_data'
    AND consent.status = 'granted'
    AND consent.expires_at > NOW()
  )
);
```

### Profile table -- Public profiles visible, full profile only to owner

```sql
CREATE POLICY "Public profiles visible to all authenticated users"
ON profile FOR SELECT
USING (
  public_visibility = true
  OR auth.uid() = user_id
);

CREATE POLICY "Users update own profile only"
ON profile FOR UPDATE
USING (auth.uid() = user_id);
```

### AuditLog table -- No one can update or delete

```sql
REVOKE UPDATE, DELETE ON audit_log FROM authenticated;
REVOKE UPDATE, DELETE ON audit_log FROM service_role;

CREATE POLICY "System and authenticated users can insert audit logs"
ON audit_log FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins and data owner can read audit logs"
ON audit_log FOR SELECT
USING (
  auth.uid()::text = actor_id
  OR auth.jwt()->>'role' = 'admin'
);
```
