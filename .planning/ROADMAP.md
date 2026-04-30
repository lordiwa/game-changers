# Roadmap: Gamer Wellness

## Overview

Four sequential phases take Gamer Wellness from legal-foundation zero (no entity, no DPIA, no community) to a sustainable, data-licensed LATAM gaming + wellness platform with $1,000+/month revenue. Phase 0 builds the LOPDP-compliant legal floor (DPO + SPDP System + crisis partner) that lets the project legally collect any data. Phase 1 validates the community thesis with zero code (Discord + IRL meetups + landing page) and applies a hard kill criterion before any platform spend. Phase 2 is the heaviest engineering phase — Vue 3 PWA + Firebase backend with consent-gated architecture, two-tier B2B data pipeline built but not yet exposed, manual-first wellness challenges, and Discord OAuth bridge. Phase 3 turns the validated platform into a revenue engine: B2B partner dashboards (Metabase + BigQuery k≥50), premium membership (Stripe), club self-service, peer coaching, and the moderator/trust infrastructure that makes mental-health adjacency safe at scale. Phase 4 (insurer pilot, Colombia/Mexico expansion, NASEF certification) is v2 — explicitly deferred from the active roadmap until $1,000+/mo revenue baseline proves sustainability.

## Phases

**Phase Numbering:**
- Integer phases (0, 1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 0: Legal Foundation** - Ecuador legal entity, LOPDP SPDP System filed, DPO appointed, crisis partner secured (zero data collection until complete)
- [ ] **Phase 1: Community Foundation** - Discord + IRL meetups + landing page validate the community thesis; kill criterion gate before Phase 2 commit
- [ ] **Phase 2: Platform MVP** - Vue 3 PWA + Firebase backend with consent-gated architecture, Discord OAuth bridge, events/challenges/wearables, two-tier B2B data pipeline pre-built
- [ ] **Phase 3: Revenue + Data** - B2B partner dashboards, premium membership, sponsored challenges, clubs self-service, moderation infrastructure, peer coaching — first $1,000+/month revenue

> **Phase 4 (B2B + Scale)** — insurer pilot, Colombia/Mexico expansion, enterprise API, NASEF certification — is **v2 deferred**. Tracked in REQUIREMENTS.md `v2 Requirements`; not committed to this roadmap until Phase 3 revenue baseline is proven.

## Phase Details

### Phase 0: Legal Foundation
**Goal**: Ecuador legal entity exists, LOPDP-compliant SPDP "Sistema de Protección de Datos Personales" is filed with the Superintendencia, DPO is contracted, crisis intervention is signed off by a licensed mental-health partner — establishing the legal and ethical floor required before any data collection or community launch.
**Depends on**: Nothing (first phase)
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-07, LEGAL-08, LEGAL-09, LEGAL-10, LEGAL-11, LEGAL-12, LEGAL-13
**Success Criteria** (what must be TRUE):
  1. Ecuador legal entity (SAS or Sociedad Anónima) is formed and Project name is locked (8 candidates resolved, domain registered, social handles claimed)
  2. DPO with Ecuador data law expertise is contracted and SPDP "Comprehensive Personal Data Protection System" is filed with the Superintendencia (data processing register, retention schedules, DSAR procedure, breach response plan, training plan, vendor DPA inventory, DPIA template all documented and counsel-reviewed)
  3. Bilingual (ES authoritative + EN legally-equivalent) Privacy Policy and Terms of Service are published with dual counsel review; three glossaries (gaming/legal/marketing) are committed to the repo
  4. Crisis intervention protocol is signed off by a licensed Ecuador mental-health partner with two verified hotlines (Línea 171 + capacity-confirmed backup), Ecuador-Spanish crisis lexicon validated by clinician, and after-hours coverage plan documented
  5. Vendor Data Processing Agreements are signed for every third-party processor (Firebase, Discord, Stripe, PostHog, Resend, Open Wearables, Sentry) and Community Guidelines + Code of Conduct are published
**Plans**: TBD

### Phase 1: Community Foundation
**Goal**: Validate that the gaming + wellness community thesis is real in Ecuador using zero-code tools — if the kill criterion (500 Discord members + 30%+ DAU/MAU + 15+ avg meetup attendance) is not met, the project pivots before any Phase 2 platform spend.
**Depends on**: Phase 0 (cannot legally launch Discord or collect any member data without filed SPDP System)
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, COMM-07, COMM-08, COMM-09, COMM-10, COMM-11, COMM-12, COMM-13, COMM-14, COMM-15, COMM-16
**Success Criteria** (what must be TRUE):
  1. Discord server is live with structured channels, onboarding bot, AutoMod, always-visible crisis resources, and a trained 3-5 person volunteer moderator team operating under a 4h/week-cap rotation discipline
  2. Bilingual ES/EN social presence is active on TikTok / Instagram / YouTube with a published 5-pillar content calendar (Movimiento, Mente, Nutrición, Comunidad, Data/Insights) and a mobile-optimized landing page lists the next 3 events with a Discord join CTA
  3. Six themed meetups (3 Quito + 3 Guayaquil — Caminata Dota, Run Free Fire, Senderismo RPG, Chill Minecraft, Foodie Gamer) and one General Event (50+ attendees) execute successfully with 2-3 confirmed venue partnerships and Luma-based RSVP + QR check-in
  4. Founding-member program is live (first 100 get a special Discord role, naming input, Phase 2 early access), influencer outreach has reached 3-5 LATAM creators, and a gamer focus-group playtest of XP/badge concepts is documented before Phase 2 design begins (mitigates surface-mechanic gamification risk)
  5. **Kill-criterion gate met**: 500+ Discord members, 30%+ DAU/MAU, 15+ average meetup attendance — community thesis is validated before Phase 2 engineering commit
**Plans**: TBD
**UI hint**: yes

### Phase 2: Platform MVP
**Goal**: Ship the Vue 3 PWA + Firebase backend with consent-gated architecture, Discord OAuth bridge, events with QR check-in, manual-first wellness challenges, wearable integration, and a pre-built two-tier B2B data pipeline that B2B partners cannot yet access — turning the validated community into a platform with the architectural firewalls and read-budget discipline that prevent retrofit costs in Phase 3.
**Depends on**: Phase 1 (community kill-criterion met — Phase 2 platform spend is gated on validated demand) AND Phase 0 (DPIA + SPDP System filed before any health-data collection)
**Requirements**: ARCH-01, ARCH-02, ARCH-03, ARCH-04, ARCH-05, ARCH-06, ARCH-07, ARCH-08, ARCH-09, ARCH-10, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, AUTH-11, AUTH-12, CNST-01, CNST-02, CNST-03, CNST-04, CNST-05, CNST-06, CNST-07, CNST-08, CNST-09, CNST-10, CNST-11, CNST-12, CNST-13, CNST-14, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, PROF-09, PROF-10, PROF-11, PROF-12, PROF-13, PROF-14, EVNT-01, EVNT-02, EVNT-03, EVNT-04, EVNT-05, EVNT-06, EVNT-07, EVNT-08, EVNT-09, EVNT-10, EVNT-11, EVNT-12, EVNT-13, EVNT-14, CHLG-01, CHLG-02, CHLG-03, CHLG-04, CHLG-05, CHLG-06, CHLG-07, CHLG-08, CHLG-09, CHLG-10, CHLG-11, CHLG-12, WEAR-01, WEAR-02, WEAR-03, WEAR-04, WEAR-05, WEAR-06, WEAR-07, WEAR-08, WEAR-09, WEAR-10, WEAR-11, WEAR-12, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, DBOT-01, DBOT-02, DBOT-03, DBOT-04, DBOT-05, DBOT-06, DBOT-07, A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06, A11Y-07, A11Y-08, A11Y-09
**Build order (dependency-driven, do NOT rearrange — per ARCHITECTURE.md and PITFALLS.md):**
  - **Step 0 (Architecture lockdown)**: ARCH-01..10 — Firebase project in `southamerica-east1`, 7 Cloud Function codebases, `ConsentEnforcement.ts` shared module, Security Rules baseline + 90% rules-unit-testing CI gate, GCP Budget API alerts, Sentry/UptimeRobot, BigQuery export plumbing, PostHog
  - **Step 1 (Auth + Discord linking)**: AUTH-01..12 + DBOT-01..07 — Anonymous Auth on first app open (Pitfall #4), email/password, Discord OAuth via custom-token bridge, age gate, KMS-encrypted refresh tokens, Discord bot on Compute Engine e2-micro
  - **Step 2 (Consent engine — LOPDP gate)**: CNST-01..14 — 10 categories, granular UI, progressive consent layers, hash-chained ledger + audit log, two-layer enforcement (Rules + middleware), DSAR export + erasure, consent expiry sweeper. **No other feature ships until this is in place.**
  - **Step 3 (Profiles + gamification)**: PROF-01..14 + CONT-01..07 — character-sheet wellness visualization (full-color for ALL users, not just wearable-connected), XP with logarithmic curve, streak entity + shield, multi-progression tracks, badges with provenance, content hub with SEO
  - **Step 4 (Events + QR check-in)**: EVNT-01..14 + A11Y-01..09 — 3-tier events (Meetups / General / Club Sessions), waitlist auto-promote, offline-capable QR check-in (IndexedDB + Background Sync), one-tap report-user, post-event card, accessibility (WCAG 2.1 AA, mobile-first 360px floor, dark mode default, ES-primary i18n)
  - **Step 5 (Wellness challenges — manual-first)**: CHLG-01..12 — 5 challenge types × Bronce/Plata/Oro tiers, manual entry as first-class data path designed BEFORE wearable SDKs, native phone pedometer baseline, gaming-themed narrative comparisons, opt-in leaderboards via aggregate documents (NOT onSnapshot), seasonal battle-pass progression
  - **Step 6 (Wearables — last)**: WEAR-01..12 — Apple HealthKit, Health Connect, Open Wearables webhook (HMAC-validated, consent-gated), monthly-bucketed time-series + daily rollups, only `healthDaily` exported to BigQuery, no auto-medical alerts
  - **Two-tier B2B architecture (built in Step 0/Step 6, used in Phase 3)**: per Pitfall #6, the firestore-raw → bigquery-anonymized pipeline with k≥50 + schema-level generalization + ε-DP noise must exist in Phase 2 — retrofitting in Phase 3 costs 5-10x.
**Success Criteria** (what must be TRUE):
  1. A Discord member can flow `/link` → app account → granted Layer 1 consent → first event QR check-in with XP awarded in under 90 seconds, with conversion measured in PostHog (kill the 40% Discord-to-app target if Layer 1 grant rate < 60%)
  2. Granular consent UI is live with 10 individually-revocable categories, progressive layers, plain Spanish (LATAM "tú"), versioned consent texts, hash-chained audit ledger, DSAR export within 30 days, account erasure within 72 hours — and re-consent is enforced on terms change
  3. A user without any wearable device can view a full-color character sheet (HP/Stamina/Mental/Social), join a Bronce/Plata/Oro challenge, log progress manually with native phone pedometer or photo verification, see opt-in leaderboard ranking, and earn badges with provenance — wearable adoption is tracked but never gates a feature
  4. An organizer can run a meetup with 50+ attendees on poor venue connectivity using offline QR check-in (IndexedDB queue + Background Sync), one-tap report-user is available, and a post-event recap card auto-generates while only aggregate stats post to Discord #fotos-y-recaps via the read-only bot
  5. **Platform success gate met**: 1,500+ app users with active consent, 40%+ Discord-to-App conversion (kill criterion if Layer 1 grant rate <60%), 200+ challenge participants, two-tier B2B data architecture (firestore-raw DPO-only → bigquery-anonymized with k≥50 + ε-DP) is deployed and tested even though no B2B partner is connected yet
**Plans**: 9 plans
- [x] 02-01-PLAN.md — Architecture lockdown: Firebase project (southamerica-east1), 7 Cloud Function codebases, ConsentEnforcement.ts, deny-all Rules + 90% rules-unit-testing CI, BigQuery export, Sentry/PostHog/UptimeRobot, Budget alerts
- [x] 02-02-PLAN.md — Auth + Discord OAuth bridge: Anonymous Auth on boot, email/password, Discord OAuth via custom-token (KMS-encrypted refresh tokens), age gate 16+, anonymous→full preserves uid
- [x] 02-03-PLAN.md — Discord bot: discord.js 14.26 on Compute Engine e2-micro, intents Guilds+GuildMembers+GuildMessageReactions ONLY, 6 slash commands, HMAC bot↔Function, quarterly TOS audit
- [x] 02-04-PLAN.md — Consent engine: 10 categories, granular UI, progressive Layers 0-4, hash-chained ledger, two-layer enforcement, DSAR + 72h erasure, expiry sweeper (LOPDP gate)
- [x] 02-05-PLAN.md — Profiles + gamification: XP logarithmic curve, streaks + shield, multi-progression tracks (HP/Stamina/Mente/Social), badges with provenance, character sheet for ALL users (Pitfall #9), app shell, Discord role sync
- [x] 02-06-PLAN.md — Content hub with SEO: vite-ssg, 5 wellness pillars, embedded YouTube/TikTok lazy, wellness assessments (PSS-4), CMS via Markdown commits
- [x] 02-07-PLAN.md — Events + QR check-in + accessibility: 3-tier events, RSVP + waitlist auto-promote, signed-JWT QR with offline IDB queue + Background Sync, anonymous report-user, WCAG 2.1 AA via axe-playwright
- [ ] 02-08-PLAN.md — Manual-first wellness challenges: 5 types × Bronce/Plata/Oro, Web Sensor pedometer, photo + vouching, gaming narratives, leaderboard via aggregate doc (Pitfall #2), seasonal battle pass
- [ ] 02-09-PLAN.md — Wearables + B2B BigQuery anonymized layer: Open Wearables webhook (HMAC + consent), monthly bucket time-series + daily rollups, 5 BigQuery k≥50 + ε-DP views, Metabase service account scoping (raw access REVOKED)
**UI hint**: yes

### Phase 3: Revenue + Data
**Goal**: Turn the validated platform into a sustainable revenue engine — B2B partner dashboards launch on the pre-built two-tier architecture, premium membership ships (cosmetic-only, never P2W), sponsored challenges and branded event activations operationalize the audience-activator layer, clubs become self-service, the moderation/trust stack matures, and peer coaching launches as a non-clinical framework — reaching $1,000+/month revenue without insurer dependency.
**Depends on**: Phase 2 (two-tier B2B architecture must already exist; 1,500+ users with active consent must already be on the platform)
**Requirements**: B2BD-01, B2BD-02, B2BD-03, B2BD-04, B2BD-05, B2BD-06, B2BD-07, B2BD-08, B2BD-09, B2BD-10, B2BD-11, B2BD-12, B2BD-13, B2BD-14, MONY-01, MONY-02, MONY-03, MONY-04, MONY-05, MONY-06, CLUB-01, CLUB-02, CLUB-03, CLUB-04, CLUB-05, CLUB-06, CLUB-07, MODR-01, MODR-02, MODR-03, MODR-04, MODR-05, MODR-06, MODR-07, MODR-08, COACH-01, COACH-02, COACH-03, COACH-04
**Success Criteria** (what must be TRUE):
  1. A B2B partner (consumer brand or telecom — NEVER an insurer in Phase 3) can log into their Metabase-embedded `/partners/*` dashboard via signed-JWT iframe, see only their authorized pre-built audience segments (Active Movers, Social Connectors, Competitive Core, New Recruits, At Risk), and never receive a row representing fewer than 50 distinct consenting users — with a compliance badge auto-rendered on every export
  2. A user can subscribe to premium membership for $3-5/month via Stripe and receive cosmetic + convenience benefits only (custom themes, priority RSVP, exclusive Discord roles, custom badges) — never XP/leaderboard advantages — and sponsored challenges flow through a 48h SLA editorial campaign approval workflow
  3. A meetup that reaches critical mass (8+ consistent attendees across 4+ consecutive sessions) can spin up as a self-service Club with a Captain role, dedicated Discord channels, club-specific challenges, inactivity-detection + leadership transfer, and a discovery directory filterable by city and interest
  4. The moderator dashboard surfaces incidents through a 4-tier severity escalation protocol with crisis keyword detection signed off by the clinical partner, mandatory rotation discipline (4h/week cap, mandatory cooldown after handling crisis), burnout signal detection, daily reports, and a monthly LOPDP 10-point audit auto-generated for the DPO
  5. **Revenue + scale gate met**: $1,000+/month recurring revenue achieved (combination of premium memberships + sponsored challenges + branded events), 3,000+ users, at least 1 active B2B partner with logged dashboard usage, 3+ active clubs operating with elected captains, and peer coaching framework is live (training certification path, matching system, scope-of-practice clarification — coaches NEVER attempt therapy/diagnosis, all crisis cases route to licensed partner)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 0 → 1 → 2 → 3. Decimal phases (e.g., 2.1) may be inserted between integers via `/gsd-insert-phase`. Phase 4 (B2B + Scale) is v2-deferred and not in this commit.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Legal Foundation | 0/TBD | Not started | - |
| 1. Community Foundation | 0/TBD | Not started | - |
| 2. Platform MVP | 0/TBD | Not started | - |
| 3. Revenue + Data | 0/TBD | Not started | - |

---
*Roadmap created: 2026-04-27 (auto mode from PROJECT.md + REQUIREMENTS.md + research/)*
*Phase 4 deferred to v2 — see `.planning/REQUIREMENTS.md` `v2 Requirements` section.*
