# Requirements: Gamer Wellness

**Defined:** 2026-04-27
**Core Value:** Gamers in Ecuador find a real community combining what they love (games) with what they need (movement, mental health, IRL connection) — without feeling surveilled, monetized, or moralized at. **If the community does not form, nothing else matters.**

## v1 Requirements

Requirements for initial release across Phases 0-3. Synthesized from `StartData/output/expert-business-analyst.md` (REQ-F001..F036) + `expert-product-ux.md` + research/SUMMARY.md (5 GAP items absorbed).

### Legal & Compliance (Phase 0)

- [ ] **LEGAL-01**: DPO with Ecuador data law expertise appointed and contracted
- [ ] **LEGAL-02**: Data Protection Impact Assessment (DPIA) drafted, reviewed by counsel, and filed with SPDP before any health/behavioral data collection
- [ ] **LEGAL-03**: Comprehensive SPDP "Sistema de Protección de Datos Personales" documented (data processing register, retention schedules, DSAR procedure, breach response plan, training plan, vendor DPA inventory, DPIA template)
- [ ] **LEGAL-04**: LOPDP-compliant Privacy Policy published in Spanish (authoritative) and English (legally equivalent), dual counsel review
- [ ] **LEGAL-05**: Terms of Service published in Spanish + English, dual counsel review
- [ ] **LEGAL-06**: Vendor DPA inventory complete and signed (Firebase, Discord, Stripe, PostHog, Resend, Open Wearables, Sentry)
- [ ] **LEGAL-07**: Legal entity formed in Ecuador (SAS or Sociedad Anónima)
- [ ] **LEGAL-08**: Project naming finalized (8 candidates) — domain registered, social handles claimed
- [ ] **LEGAL-09**: Crisis intervention protocol documented and signed off by licensed Ecuador mental-health partner (escalation tree, scope-of-practice clarification, after-hours coverage)
- [ ] **LEGAL-10**: Two verified crisis hotlines integrated (Línea 171 + confirmed-capacity backup, monthly answer-rate test scheduled)
- [ ] **LEGAL-11**: Ecuador-Spanish crisis lexicon authored and signed off by clinical partner (idioms + gamer-coded distress phrases)
- [ ] **LEGAL-12**: Three glossaries committed to repo (gaming / legal / marketing) with Spanish-first authoring discipline
- [ ] **LEGAL-13**: Community guidelines and Code of Conduct published (anti-harassment, IRL event safety, gender protections)

### Community Foundation (Phase 1 — zero-code)

- [ ] **COMM-01**: Discord server live with structured channels (≤6 at launch, expand as community grows): info, comunidad, juegos clusters, bienestar, eventos
- [ ] **COMM-02**: Onboarding bot welcomes new members, assigns roles (city, main game), surfaces community guidelines (≤3 taps)
- [ ] **COMM-03**: AutoMod configured for hate speech, harassment, self-harm content; human mod escalation rules documented
- [ ] **COMM-04**: Crisis resources visible across all platform surfaces (Discord channels, landing page); always-accessible "Necesitas ayuda?" link
- [ ] **COMM-05**: 3-5 volunteer moderators recruited, trained on crisis recognition + de-escalation + harassment response, with rotation discipline (4h/week cap)
- [ ] **COMM-06**: Mobile-optimized landing page with mission, next 3 events, Discord join CTA (Carrd or Framer interim, then Vue 3 PWA in Phase 2)
- [ ] **COMM-07**: Bilingual ES/EN social media presence active on TikTok, Instagram, YouTube with content calendar (5 pillars: Movimiento, Mente, Nutrición, Comunidad, Data/Insights)
- [ ] **COMM-08**: WhatsApp Business broadcast list for event reminders (LATAM communication standard)
- [ ] **COMM-09**: 6 themed meetups executed (3 Quito + 3 Guayaquil) — Caminata Dota, Run Free Fire, Senderismo RPG, Chill Minecraft, Foodie Gamer
- [ ] **COMM-10**: 1 General Event executed (multi-cluster convergence, 50+ attendees target)
- [ ] **COMM-11**: 2-3 venue partnerships confirmed (Kubox eSports Arena, parks, restaurants)
- [ ] **COMM-12**: Event RSVP via Luma + QR check-in via Luma or printed-QR-to-Google-Form (interim, replaced by Phase 2 platform)
- [ ] **COMM-13**: Gamer focus group playtest of XP/badge concepts BEFORE Phase 2 design (mitigates surface-mechanic gamification pitfall)
- [ ] **COMM-14**: Influencer outreach to 3-5 LATAM creators (Philippe Michelet, Sebastián Hernández, Macarena Humalde or equivalent)
- [ ] **COMM-15**: Founding members program (first 100 members get special Discord role, naming input, Phase 2 early access)
- [ ] **COMM-16**: Phase 1 success gates met: 500 Discord members, 30%+ DAU/MAU, 15+ avg meetup attendance (KILL CRITERION below this)

### Platform Foundation (Phase 2 Step 0 — pre-feature architecture)

- [ ] **ARCH-01**: Firebase project created in `southamerica-east1` (region is immutable; closest LOPDP-defensible)
- [ ] **ARCH-02**: 7 Cloud Function codebases scaffolded (auth, consent, events, challenges, wearables, gamification, b2b) with independent deploy CI/CD
- [ ] **ARCH-03**: `ConsentEnforcement.ts` shared module created as single source of truth for consent gating (used by Rules helper + Function middleware)
- [ ] **ARCH-04**: Firestore Security Rules baseline (deny-all default; per-collection adds with consent helpers); no wildcard `{document=**}` rules on user collections
- [ ] **ARCH-05**: `@firebase/rules-unit-testing` skeleton with 90%+ coverage CI gate
- [ ] **ARCH-06**: GCP Budget API alerts configured at $50, $100, $200 thresholds (mitigates onSnapshot read-cost pitfall)
- [ ] **ARCH-07**: ESLint rule warning on `onSnapshot` in app shell components
- [ ] **ARCH-08**: Sentry + UptimeRobot wired with PII scrubbing for error monitoring
- [ ] **ARCH-09**: Firestore→BigQuery export extension installed for consent-tagged collections only (`profiles`, `consents`, `healthDaily`, `events`, `attendance`, `challenges`, `auditLog`, `consentLedger`)
- [ ] **ARCH-10**: PostHog (self-hosted EU region) wired for funnel analytics with PII scrubbing

### Authentication & Identity (Phase 2 Step 1)

- [ ] **AUTH-01**: Firebase Anonymous Auth on first app open (mitigates Discord-to-app conversion friction at consent step)
- [ ] **AUTH-02**: User can sign up with email and password via Firebase Auth
- [ ] **AUTH-03**: User can sign in with email and password
- [ ] **AUTH-04**: User can reset password via email link (Resend transactional)
- [ ] **AUTH-05**: User session persists across browser refresh (Firebase Auth persistence)
- [ ] **AUTH-06**: User can link Discord account via OAuth2 (custom-token bridge through `auth-discordExchange` Cloud Function)
- [ ] **AUTH-07**: Discord account linking pre-fills display name, avatar, and game roles from Discord
- [ ] **AUTH-08**: User can unlink Discord account
- [ ] **AUTH-09**: Anonymous user → email/password upgrade preserves XP and event attendance
- [ ] **AUTH-10**: Phone authentication available as alternative (Firebase Phone Auth)
- [ ] **AUTH-11**: Discord OAuth refresh tokens encrypted via Cloud KMS at rest
- [ ] **AUTH-12**: Age verification gate (16+ minimum, parental consent flow if minor — TBD per open question)

### Consent Management (Phase 2 Step 2 — LOPDP gate)

- [ ] **CNST-01**: 10 independent consent categories defined: basic_profile, event_participation, health_self_reports, wearable_data, gaming_habits, b2b_insurers, b2b_healthcare, b2b_brands, cross_border, research
- [ ] **CNST-02**: Granular consent UI with individual toggles per category (no bundled consent), plain Spanish (LATAM "tú"), gaming-friendly metaphors where appropriate
- [ ] **CNST-03**: Each consent toggle shows: what data, why, who sees it, how to revoke (expandable "learn more")
- [ ] **CNST-04**: Progressive consent layers (Layer 0 account → Layer 1 after first event XP → Layer 2 before challenges → Layer 3 wellness profile → Layer 4 partner sharing)
- [ ] **CNST-05**: User can revoke any consent category at any time with immediate processing cessation
- [ ] **CNST-06**: Versioned consent texts stored in Firestore `/consentTexts/{category}/{version}` (ES + EN); version captured at grant time
- [ ] **CNST-07**: Re-consent on terms change required (active acceptance, not passive) — **GAP from REQ-F set, added per research**
- [ ] **CNST-08**: Immutable hash-chained `/consentLedger` and append-only `/auditLog` (Cloud Functions service-account write only)
- [ ] **CNST-09**: User can view full consent history (grants, modifications, revocations) with timestamps
- [ ] **CNST-10**: User can request full data export (LOPDP portability right) — JSON/CSV via signed Storage URL with 7-day TTL, 30-day SLA
- [ ] **CNST-11**: User can request full account deletion (LOPDP erasure right) — async workflow purges data within 72 hours, retains audit log per legal retention
- [ ] **CNST-12**: Consent expiry sweeper Cloud Function (scheduled, daily) — re-prompt when consent expires (12 months default)
- [ ] **CNST-13**: Two-layer consent enforcement: Firestore Security Rules + `consentGate` middleware on every Cloud Function (mitigates Pitfall #1)
- [ ] **CNST-14**: B2B partner queries verify active consent for the specific partner category at row level

### Profiles & Gamification (Phase 2 Step 3)

- [ ] **PROF-01**: User profile with display name, avatar (optional, never required), city, favorite games, gaming platforms
- [ ] **PROF-02**: Pronouns are optional (never required)
- [ ] **PROF-03**: Profile photos optional, no real-name mandate
- [ ] **PROF-04**: Profile public visibility toggle (controls leaderboard appearance)
- [ ] **PROF-05**: User can view other users' public profiles
- [ ] **PROF-06**: XP system with logarithmic level curve (Noob → Iniciado → Aventurero → Veterano → Élite → Leyenda → Mítico)
- [ ] **PROF-07**: XP earned from: event attendance, challenge completion, content consumption, community participation, club leadership, referrals, wellness survey completion
- [ ] **PROF-08**: Streak entity with bonus multipliers (consecutive days/weeks of activity) — **GAP from REQ-F set, added per research**
- [ ] **PROF-09**: Streak shield mechanic (1 missed day grace per period to prevent harsh resets)
- [ ] **PROF-10**: Multi-progression tracks: Fitness, Social, Knowledge, Leadership — **GAP from REQ-F set, added per research**
- [ ] **PROF-11**: Achievement/badge collection with earned + locked states; gaming-themed names with provenance ("Caminata Dota — Primera vez")
- [ ] **PROF-12**: Character-sheet wellness visualization (HP / Stamina / Mental / Social) shown for ALL users (not just wearable-connected)
- [ ] **PROF-13**: Anti-cheat anomaly detection for unrealistic data (>100K steps/day, impossible BPM, geolocation inconsistencies)
- [ ] **PROF-14**: Discord role sync on level-up (custom claim-based; bot reads from Function endpoint, never directly from Firestore)

### Events Management (Phase 2 Step 4)

- [ ] **EVNT-01**: Event creation supporting 3 tiers: Meetups, General Events, Club Sessions
- [ ] **EVNT-02**: Event detail with name, theme (game tie-in), date/time, location (Google Maps link), capacity, RSVP count, difficulty (Chill/Activo/Intenso), what to bring
- [ ] **EVNT-03**: User can RSVP with 1-tap if logged in; lightweight registration (name + phone) if not
- [ ] **EVNT-04**: Event waitlist with auto-promote when capacity opens — **GAP from REQ-F set, added per research**
- [ ] **EVNT-05**: WhatsApp Business + push notification reminders 24h and 2h before event
- [ ] **EVNT-06**: QR check-in via mobile camera (dynamic, event-specific, time-limited token)
- [ ] **EVNT-07**: Offline-capable event check-in (IndexedDB queue + Background Sync when connection returns)
- [ ] **EVNT-08**: Manual check-in fallback (organizer with tablet/laptop searches by username)
- [ ] **EVNT-09**: Walk-in capture flow (basic info for follow-up invitation, no account required)
- [ ] **EVNT-10**: Post-event feedback survey (NPS + qualitative + optional wellness self-report)
- [ ] **EVNT-11**: Auto-generated shareable post-event card (dark theme, gaming aesthetic, personal stats + event branding)
- [ ] **EVNT-12**: Event recap to Discord #fotos-y-recaps via bot (group photo + aggregate stats only — no individual data)
- [ ] **EVNT-13**: One-tap report-user UX flow with anonymity to reported user (mitigates harassment risk) — **GAP from REQ-F set, added per research**
- [ ] **EVNT-14**: Event safety contact assigned per event (trained in basic crisis response)

### Wellness Challenges (Phase 2 Step 5 — manual-first)

- [ ] **CHLG-01**: Five challenge types: Movement, Streak, Social, Mental, Hybrid
- [ ] **CHLG-02**: Three difficulty tiers (Bronce / Plata / Oro) calibrated against community baseline data
- [ ] **CHLG-03**: Manual entry as first-class data path (designed BEFORE wearable integration; mitigates Pitfall #9)
- [ ] **CHLG-04**: Native phone pedometer baseline (iOS Motion API + Android Sensor API) — independent of third-party wearable SDKs — **GAP from REQ-F set, added per research**
- [ ] **CHLG-05**: Photo + community vouching as alternative verification for non-wearable users
- [ ] **CHLG-06**: Gaming-themed narrative comparisons ("Caminaste 4.2km — equivalente a cruzar Summoner's Rift 47 veces")
- [ ] **CHLG-07**: Daily progress tracking with motivational messages; no shaming for missed days
- [ ] **CHLG-08**: Opt-in challenge leaderboards (global, city, club) — anonymous participation option
- [ ] **CHLG-09**: Aggregate `/leaderboards/{period}` documents recomputed by scheduled Function (mitigates onSnapshot cost pitfall)
- [ ] **CHLG-10**: Anti-cheat rules per challenge type (rejection thresholds for unrealistic data)
- [ ] **CHLG-11**: Completion rewards: XP, badge, occasional partner-sponsored prize draw entry
- [ ] **CHLG-12**: Seasonal battle-pass-style progression with monthly/quarterly themed seasons and exclusive badges

### Wearable Integration (Phase 2 Step 6 — last in Phase 2)

- [ ] **WEAR-01**: Apple HealthKit integration via Vue PWA (Web bridge or Capacitor wrapper if PWA inadequate)
- [ ] **WEAR-02**: Android Health Connect integration (replaces deprecated Google Fit)
- [ ] **WEAR-03**: Open Wearables (self-hosted FastAPI on VPS) integration via webhook for 200+ devices (Garmin, Fitbit, Polar, Whoop, Oura)
- [ ] **WEAR-04**: Open Wearables fork strategy decision documented (pre-1.0 maintenance risk mitigation)
- [ ] **WEAR-05**: Webhook validates HMAC signature + checks active `wearable_data` consent before any storage
- [ ] **WEAR-06**: Wearable data normalized to common schema: metric_type, value, unit, recorded_at, source
- [ ] **WEAR-07**: Time-series storage in `/users/{uid}/healthData/{yyyy-mm}/metrics/{id}` (monthly-bucketed Firestore subcollection)
- [ ] **WEAR-08**: Daily rollup documents in `/users/{uid}/healthDaily/{yyyy-mm-dd}` maintained by Cloud Function trigger
- [ ] **WEAR-09**: Only `healthDaily` rollups exported to BigQuery (raw `healthData` is NOT mirrored — too expensive)
- [ ] **WEAR-10**: User can disconnect wearable; existing data retained per consent or deleted on request
- [ ] **WEAR-11**: Wearable data drives challenge auto-tracking but is NEVER required to participate
- [ ] **WEAR-12**: No automated medical alerts from wearable patterns (anti-feature) — concerning patterns surface relevant content + crisis resources only

### Content Hub (Phase 2)

- [ ] **CONT-01**: SEO-optimized public content hub (Vue 3 PWA + vite-ssg) with wellness articles in Spanish (primary) and English (secondary)
- [ ] **CONT-02**: Articles tagged by game cluster, wellness pillar (Movimiento/Mente/Nutrición/Comunidad/Data), content type
- [ ] **CONT-03**: Embedded YouTube/TikTok content into unified content hub
- [ ] **CONT-04**: User content consumption tracked (views, watch time, completion) with explicit Layer 1 consent
- [ ] **CONT-05**: XP awarded for completing content pieces (varies by type and length)
- [ ] **CONT-06**: Editorial CMS for staff to publish, schedule, categorize content
- [ ] **CONT-07**: Wellness assessments embedded in content (e.g., stress quiz) gated by `health_self_reports` consent

### Discord Bot Bridge (Phase 2)

- [ ] **DBOT-01**: Discord bot deployed on Compute Engine e2-micro (NOT Cloud Run — Gateway WebSocket requires persistent connection)
- [ ] **DBOT-02**: Bot uses `Guilds` + `GuildMembers` intents only — NO `MessageContent` intent (LOPDP minimization + ADR-001 firewall)
- [ ] **DBOT-03**: Bot has zero Firestore Admin SDK access; calls Cloud Function HTTP endpoints with HMAC + IP allow-list
- [ ] **DBOT-04**: Slash commands: `/link` (account linking), `/eventos` (next events), `/leaderboard` (top participants), `/perfil` (gamification stats), `/reto` (active challenges), `/ayuda` (crisis resources)
- [ ] **DBOT-05**: Bot posts event recaps to #fotos-y-recaps with aggregate stats only
- [ ] **DBOT-06**: Bot posts weekly leaderboard digest scheduled via Cloud Scheduler
- [ ] **DBOT-07**: Quarterly Discord TOS compliance audit (verify zero data collection through Discord API)

### Mobile-First Accessibility (Phase 2)

- [ ] **A11Y-01**: PWA installable to mobile home screen with offline capability for event details, challenge progress, profile
- [ ] **A11Y-02**: Pages load in under 3 seconds on 3G
- [ ] **A11Y-03**: WCAG 2.1 AA compliance (color contrast ≥4.5:1, keyboard navigation, alt text, no color-only information)
- [ ] **A11Y-04**: Mobile-first design (360px minimum width); touch targets ≥44x44px; one-handed thumb-zone primary actions
- [ ] **A11Y-05**: Bilingual ES/EN with i18n framework; user-selected locale stored in profile (not browser)
- [ ] **A11Y-06**: Gaming terms preserved in English universally (XP, GG, buff, nerf, clutch, AFK)
- [ ] **A11Y-07**: Data-saver mode toggle (disables auto-play, reduces image quality, minimizes background sync)
- [ ] **A11Y-08**: Dark mode default with light mode toggle (outdoor readability for events)
- [ ] **A11Y-09**: Discord teen-appropriate mode compatible (mandated since March 2026)

### B2B Partner Dashboard (Phase 3)

- [ ] **B2BD-01**: Metabase OSS deployment with embedded iframe in `/partners/*` route group (custom-claim-gated)
- [ ] **B2BD-02**: Two-tier data architecture (firestore-raw DPO-only with 90-day retention → bigquery-anonymized) — built in Phase 2, used in Phase 3
- [ ] **B2BD-03**: BigQuery k≥50 enforced via SQL views (`HAVING COUNT(DISTINCT user_id) >= 50`); under-threshold rows never leave database
- [ ] **B2BD-04**: Schema-level generalization (5-year age bands, region collapse for segments <500)
- [ ] **B2BD-05**: ε-Differential Privacy noise on counts <200 (calibration per segment in Phase 3 research)
- [ ] **B2BD-06**: Metabase service account has SELECT on `gw_b2b_views` only — ZERO access to raw mirror
- [ ] **B2BD-07**: Per-partner row filters via signed-JWT iframe embed parameters
- [ ] **B2BD-08**: Pre-built audience segments: Active Movers (3+ challenges/mo), Social Connectors (2+ events/mo), Competitive Core, New Recruits, At Risk
- [ ] **B2BD-09**: Custom segment filters with minimum cohort enforcement
- [ ] **B2BD-10**: Compliance badge on every export ("Datos basados en N usuarios con consentimiento explícito verificado")
- [ ] **B2BD-11**: Query audit log (every B2B query logged with partner ID, parameters, result count) reviewable by DPO
- [ ] **B2BD-12**: Automated alert on query patterns suggesting re-identification attempts
- [ ] **B2BD-13**: PDF/CSV export with methodology notes, consent audit summary, LOPDP statement (aggregated only)
- [ ] **B2BD-14**: Formal anonymization assessment filed with SPDP per LOPDP Reglamento

### Monetization (Phase 3)

- [ ] **MONY-01**: Premium membership tier ($3-5/mo) via Stripe (Firebase Extensions integration)
- [ ] **MONY-02**: Premium benefits are cosmetic/convenience ONLY (custom profile themes, priority event registration, exclusive Discord roles, custom badges) — NEVER XP/leaderboard advantages
- [ ] **MONY-03**: Sponsored wellness challenges with editorial campaign approval workflow (48h SLA review)
- [ ] **MONY-04**: Branded event activations (sponsor integration in General Events with ROI tracking)
- [ ] **MONY-05**: Campaign performance dashboard for B2B partners (impressions, engagement, completions, ROI vs platform benchmark)
- [ ] **MONY-06**: First $1,000+/month revenue milestone achieved before Phase 4 expansion

### Clubs (Phase 3)

- [ ] **CLUB-01**: Club formation workflow when meetup reaches critical mass (8+ consistent attendees across 4+ consecutive sessions)
- [ ] **CLUB-02**: Club entity with name, mission, schedule, city, target game/activity, dedicated Discord channels
- [ ] **CLUB-03**: Club Captain role with elevated permissions (event creation within club, member management, announcements, attendance tracking)
- [ ] **CLUB-04**: Club Captain XP bonuses for leadership activities
- [ ] **CLUB-05**: Club inactivity detection with leadership transfer workflow
- [ ] **CLUB-06**: Club-specific challenges
- [ ] **CLUB-07**: Club discovery directory (filter by city, interest)

### Moderation & Trust (Phase 3)

- [ ] **MODR-01**: Moderator dashboard for incident review and escalation
- [ ] **MODR-02**: Crisis keyword detection in Discord/app (ES + EN lexicon signed off by clinical partner)
- [ ] **MODR-03**: 4-tier severity escalation protocol (Low → Critical) with documented response actions
- [ ] **MODR-04**: Mandatory moderator rotation (4h/week cap, mandatory time off after handling crisis)
- [ ] **MODR-05**: Moderator training modules (crisis recognition, de-escalation, harassment response, event safety, community building, self-care)
- [ ] **MODR-06**: Burnout detection signals (no posting/moderation 7+ days, sudden moderation spike, sentiment decline)
- [ ] **MODR-07**: Daily moderation reports with incident summaries
- [ ] **MODR-08**: Monthly LOPDP compliance audit (10-point checklist) generated by Cloud Function for DPO

### Peer Coaching (Phase 3)

- [ ] **COACH-01**: Peer coaching framework documented (non-clinical, training curriculum, scope-of-practice clarification)
- [ ] **COACH-02**: Coach matching system based on interests and availability
- [ ] **COACH-03**: Coach training certification path
- [ ] **COACH-04**: Boundaries enforced: peer coaches NEVER attempt therapy/diagnosis; all crisis cases route to licensed partner

## v2 Requirements

Phase 4 deliverables — deferred to post-MVP scale phase. Tracked but not in initial roadmap commits.

### Geographic Expansion (Phase 4)

- **GEO-01**: Colombia market entry (Ley 1581 compliance, local CM, regional glossary variant, local crisis hotlines)
- **GEO-02**: Mexico market entry (LFPDPPP compliance, local CM, regional glossary variant, local crisis hotlines)
- **GEO-03**: Multi-country consent architecture with cross-border transfer consent
- **GEO-04**: Per-country DPIA filed with respective regulators
- **GEO-05**: Regional community managers hired (Colombia, Mexico)

### B2B Scale (Phase 4)

- **B2BS-01**: Insurer pilot with Aseguradora del Sur (co-creation model, NEVER commodity B2B sale)
- **B2BS-02**: Healthcare B2B pilot (Hospital de los Valles or equivalent — preventive health outreach)
- **B2BS-03**: Enterprise API for B2B partners (rate-limited, audited, deep integration with partner systems)
- **B2BS-04**: NASEF-style wellness certification program (curriculum + credentialing partner)
- **B2BS-05**: Standardized B2B data products catalog with clear pricing and compliance guarantees

### Mobile (Phase 4 contingent)

- **MOBL-01**: Capacitor wrapper for App Store / Play Store distribution (only if PWA install rate <30% from Phase 2 telemetry)
- **MOBL-02**: Native iOS HealthKit / Android Health Connect on-device sync (only if Web Sensor APIs prove inadequate)

### Insurance Gamification (Phase 4)

- **INSU-01**: Vitality-style insurance gamification product design (distribution channel for insurers, not commodity data sale)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep and to defend against repeated stakeholder requests.

| Feature | Reason |
|---------|--------|
| Discord data collection / message content scraping | Discord TOS violation + ADR-001 architectural firewall — Discord is community-only, all data lives on owned platform |
| Insurer-first revenue model | Demoted from intake's positioning to Phase 4 upside; every health-tech startup that bet on insurer revenue failed (Akili $1B→$34M, Pear $1.6B→bankruptcy); 12-24mo sales cycles incompatible with bootstrap |
| Clinical therapy or diagnosis | Platform is non-clinical peer support; MSP licensing required for therapy + liability exposure; all crisis cases route to licensed partner |
| Generic surface gamification (spin-the-wheel, collect stars) | 80% of gamification programs fail with surface mechanics; gamers see through fake gamification harder than non-gamers — brand-fatal |
| Pay-to-win XP boosts via premium | Gamification trust collapse; premium is cosmetic/convenience only |
| Real-name mandates / mandatory profile photos | Gender safety in LATAM gaming (90% women report harassment); pronouns optional, photos optional |
| Auto-medical alerts from wearable data | Regulatory minefield; concerning patterns surface relevant content + crisis resources only, never diagnose |
| Individual-level B2B data exposure | k-anonymity is the floor, not the ceiling; no raw individual records ever leave the database |
| AI chatbot mental-health assistant | Crisis intervention requires human review on every L3+ alert; AI cannot perform scope-of-practice clarification |
| Daily-check-in nag notifications | Anti-pattern for retention; opt-in only, max 1 proactive DM per week |
| VR fitness hardware | Out of scope for software platform; may integrate via Open Wearables later |
| Standalone game development | Project is community + wellness, not a game studio |
| React Native / Supabase / NestJS / Next.js stack | Earlier expert docs proposed this; canonical decision is Vue 3 + Firebase per project-definition.md §5 |
| Interactive Discord wellness mini-games (Activities API) | Phase 4+ exploration only; data sovereignty implications not yet researched |
| Cross-border wearable data transfer beyond LATAM | Scope-creep risk; cross-border transfer consent only for LATAM expansion in Phase 4 |
| Open Discord federation / community-of-communities | Out of scope; single Gamer Wellness server only through Phase 4 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEGAL-01..13 | Phase 0 | Pending |
| COMM-01..16 | Phase 1 | Pending |
| ARCH-01..10 | Phase 2 (Step 0) | Pending |
| AUTH-01..12 | Phase 2 (Step 1) | Pending |
| CNST-01..14 | Phase 2 (Step 2) | Pending |
| PROF-01..14 | Phase 2 (Step 3) | Pending |
| EVNT-01..14 | Phase 2 (Step 4) | Pending |
| CHLG-01..12 | Phase 2 (Step 5) | Pending |
| WEAR-01..12 | Phase 2 (Step 6) | Pending |
| CONT-01..07 | Phase 2 | Pending |
| DBOT-01..07 | Phase 2 | Pending |
| A11Y-01..09 | Phase 2 | Pending |
| B2BD-01..14 | Phase 3 | Pending |
| MONY-01..06 | Phase 3 | Pending |
| CLUB-01..07 | Phase 3 | Pending |
| MODR-01..08 | Phase 3 | Pending |
| COACH-01..04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 179 total
  - Phase 0 (Legal Foundation): 13 — LEGAL-01..13
  - Phase 1 (Community Foundation): 16 — COMM-01..16
  - Phase 2 (Platform MVP): 111 — ARCH(10) + AUTH(12) + CNST(14) + PROF(14) + EVNT(14) + CHLG(12) + WEAR(12) + CONT(7) + DBOT(7) + A11Y(9)
  - Phase 3 (Revenue + Data): 39 — B2BD(14) + MONY(6) + CLUB(7) + MODR(8) + COACH(4)
- Mapped to phases: 179
- Unmapped: 0 ✓

**Roadmap reference:** See `.planning/ROADMAP.md` for phase goals, dependencies, success criteria, and the Phase 2 step-order build sequence (Step 0 architecture lockdown → Step 1 Auth+Discord → Step 2 Consent → Step 3 Profiles+Gamification → Step 4 Events+QR → Step 5 Challenges manual-first → Step 6 Wearables last; do NOT rearrange).

(v2 requirements deferred to Phase 4 — not in initial roadmap commit. Phase 4 v2 set: GEO-01..05, B2BS-01..05, MOBL-01..02, INSU-01.)

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 after roadmap creation (4 active phases — Phase 0/1/2/3 — committed; Phase 4 deferred to v2)*
