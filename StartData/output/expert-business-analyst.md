# Expert Business Analysis: Gamer Wellness
## The First Gaming + Wellness Community in LATAM

**Project**: Gamer Wellness (working name)
**Analyst**: Senior Business Analyst (AI-assisted)
**Date**: 2026-04-07
**Version**: 1.0
**Status**: Initial Analysis — Pending Human Review

---

## Stakeholders

### Primary Stakeholders

- **Gamers (End Users)**: Adults 16-34, predominantly mobile/PC gamers in Ecuador (expanding LATAM). 67% overweight/obese, 37% showing depression/anxiety symptoms, socially isolated despite digital connectivity. Core concern: free access to community, events, and wellness resources without feeling surveilled or monetized. They must perceive genuine value, not a data extraction scheme. They are NOT the customer; they are the community.

- **B2B Clients — Insurers** (e.g., Aseguradora del Sur, Saludsa/Vitality): Want access to behavioral and health data of a young, previously unreachable demographic to build risk profiles, reduce siniestros, and design gamified insurance products. Core concern: data quality, audience size, regulatory compliance, and demonstrable ROI on reduced claims. CRITICAL WARNING: Every startup that has depended on insurer B2B revenue has failed catastrophically (Akili $1B to $34M; Pear Therapeutics $1.6B to bankruptcy). This stakeholder must NOT be the primary revenue source.

- **B2B Clients — Hospitals/Healthcare** (e.g., Hospital de los Valles, Hospital Metropolitano): Interested in preventive health outreach to a young demographic that rarely visits doctors. Want brand positioning as forward-thinking, youth-friendly healthcare. Can sponsor wellness content, screenings at events, and referral pipelines.

- **B2B Clients — Consumer Brands** (e.g., Red Bull, Nike, Adidas, Samsung, HP OMEN, HyperX): Want access to a qualified, engaged audience with high brand affinity. Core concern: authentic integration (not cringe), measurable engagement metrics, exclusivity within category, and audience scale. This is the most proven revenue path in gaming ecosystems.

- **B2B Clients — Telecom/Finance** (e.g., Tigo/JP Michelet, Visa, Banco de Guayaquil): Want co-branded activations and access to digitally native youth for customer acquisition. Core concern: conversion metrics, audience overlap with their target, and brand safety.

### Secondary Stakeholders

- **Community Leaders / Club Captains**: Gamers who organically become leaders of persistent clubs (e.g., "Caminata Dota" becomes a permanent running club). Concern: recognition, tools to manage their group, clear governance, and avoiding burnout. They are the scalability engine of the physical layer.

- **Content Creators / Influencers** (e.g., Philippe Michelet, Sebastian Hernandez, Macarena Humalde): Drive discovery and legitimacy. Concern: creative freedom, fair compensation, audience growth, and brand alignment. Their authentic endorsement is what makes the community credible vs. corporate.

- **Moderators (Discord + Events)**: Required at 1:100 member ratio per best practice. Concern: clear guidelines, mental health support for themselves (secondary trauma from crisis situations), tools, and recognition. They are the front line of community safety.

- **Venue Partners** (e.g., Kubox eSports Arena, MMA El Valle): Provide physical infrastructure for events. Concern: foot traffic, revenue share, brand association, and event scheduling predictability.

- **Gaming Companies** (e.g., Sony, Nintendo, Riot Games, Blizzard): Potential sponsors and co-marketing partners. Concern: brand safety, audience authenticity, and scale. Riot's LLA dissolution and LTA backlash means regional identity is a sensitive topic.

### Regulatory & Governance Stakeholders

- **Ecuador SPDP (Superintendencia de Proteccion de Datos Personales)**: The data protection authority actively enforcing LOPDP. Has fined LigaPro ($259K) and FEF ($195K) in January 2026. Requires: mandatory DPO appointment, DPIA before any health data collection, granular consent, data deletion capabilities. This is not theoretical; it is actively enforced against organizations in adjacent domains.

- **Ministerio de Salud Publica**: Regulatory oversight for any health-adjacent claims. If wellness coaching crosses into therapy or medical advice, licensing requirements apply. Peer coaching is currently unregulated in Ecuador (opportunity and risk).

- **Discord (Platform Owner)**: Developer Policy explicitly prohibits disclosing API Data to "data brokers, advertising networks, or monetization-related services." ALL data collection and monetization must happen on a separate, owned platform. Discord is community only.

### Tertiary Stakeholders

- **Families of Gamers**: Especially parents of 16-18 segment. Concern: safety, data privacy of minors, positive impact narrative.
- **Academic / Research Partners**: Opportunity to produce the first Ecuador-specific gamer health study. Could provide credibility and attract grant funding.
- **Local Government / Municipal Authorities**: Event permits, potential public health alignment with Ecuador's Agenda de Transformacion Digital 2025-2030.

---

## Requirements

### Functional Requirements

#### Layer 1: Media Platform (Content + Discovery)

- **[REQ-F001]**: The system shall provide a web platform (Next.js) with SEO-optimized wellness content in Spanish (primary) and English (secondary), including articles, video embeds, and interactive guides. (Priority: **Must**)

- **[REQ-F002]**: The system shall integrate YouTube, TikTok, Instagram, and Twitch content feeds into a unified content hub on the web platform. (Priority: **Should**)

- **[REQ-F003]**: The system shall support a content management system for editorial staff to publish, schedule, and categorize wellness content tagged by game title, wellness topic, and content type. (Priority: **Must**)

- **[REQ-F004]**: The system shall track content consumption analytics (views, watch time, shares, content completion) per user with explicit consent, feeding the behavioral data layer. (Priority: **Must**)

- **[REQ-F005]**: The system shall support content localization for LATAM expansion (Colombia, Mexico, Peru dialects and cultural references). (Priority: **Could**)

#### Layer 2: Social Hub (Community + Events)

- **[REQ-F006]**: The system shall maintain a Discord server as the primary community hub with structured channels per game cluster, wellness topic, city, and club. (Priority: **Must**)

- **[REQ-F007]**: The system shall provide Discord bot functionality (discord.js v14) for: event announcements, RSVP tracking, XP display, role assignment based on activity, and wellness challenge participation tracking. (Priority: **Must**)

- **[REQ-F008]**: The system shall support Discord Account Linking ("1-Click") to bridge Discord identity with the web/app platform identity, enabling cross-platform XP and profile continuity. (Priority: **Must**)

- **[REQ-F009]**: The system shall support event creation and management for three event tiers: Meetups (free, weekly/biweekly, themed by game), General Events (monthly/bimonthly convergence with brand activations), and Club Sessions (permanent recurring activities). (Priority: **Must**)

- **[REQ-F010]**: The system shall provide a check-in system for physical events using QR codes or NFC, recording attendance with timestamp, location, and event type. (Priority: **Must**)

- **[REQ-F011]**: The system shall support club formation workflow: when a meetup achieves critical mass (threshold TBD — see Open Questions), it can be promoted to a persistent club with its own identity, leadership roles, and recurring schedule. (Priority: **Should**)

- **[REQ-F012]**: The system shall provide WhatsApp integration for event reminders, community announcements, and direct communication in LATAM markets. (Priority: **Should**)

- **[REQ-F013]**: The system shall support event feedback collection (post-event surveys, NPS, qualitative feedback) within the owned platform, never within Discord. (Priority: **Should**)

#### Layer 3: Audience Activator (B2B Revenue Engine)

- **[REQ-F014]**: The system shall provide a B2B partner dashboard (Metabase-based) displaying: audience demographics, engagement metrics, campaign performance, and aggregated (never individual) behavioral/health data segments. (Priority: **Must** — Phase 2-3)

- **[REQ-F015]**: The system shall support audience segmentation for B2B clients based on: game preferences, event attendance patterns, wellness engagement level, self-reported health interests, geographic cluster, and opted-in data categories. (Priority: **Must** — Phase 2-3)

- **[REQ-F016]**: The system shall enforce that all B2B data access is aggregated and anonymized, with minimum cohort sizes (k-anonymity threshold TBD) to prevent re-identification in Ecuador's small gamer population. (Priority: **Must**)

- **[REQ-F017]**: The system shall support branded activation campaigns where B2B partners can sponsor challenges, events, content, and rewards within the platform, with performance tracking (impressions, participation, conversion). (Priority: **Should**)

- **[REQ-F018]**: The system shall generate automated B2B reports on audience reach, engagement depth, and campaign ROI on a weekly/monthly cadence. (Priority: **Could**)

#### Gamer Profile & Data

- **[REQ-F019]**: The system shall maintain a gamer profile containing: demographic data, gaming habits (self-reported and observed), event history, content consumption history, wellness challenge participation, XP/level, club memberships, and optionally linked wearable data. (Priority: **Must**)

- **[REQ-F020]**: The system shall collect health/wellness data exclusively through self-reported surveys and opted-in wearable integrations on the owned platform (web/app), never through Discord. (Priority: **Must**)

- **[REQ-F021]**: The system shall support wearable device integration via Open Wearables (MIT, 200+ devices) and native HealthKit (iOS) / Health Connect (Android) APIs, collecting: steps, heart rate, sleep duration, active minutes, and calories burned. (Priority: **Should** — Phase 2)

- **[REQ-F022]**: The system shall store wearable time-series data in TimescaleDB (PostgreSQL extension within Supabase) with per-user encryption and access controls. (Priority: **Should** — Phase 2)

#### Gamification / XP System

- **[REQ-F023]**: The system shall implement a gamification engine (gengine or custom) with XP points earned from: event attendance, content consumption, wellness challenge completion, community participation, club leadership, and referrals. (Priority: **Must**)

- **[REQ-F024]**: The system shall define levels/tiers (e.g., Bronze/Silver/Gold/Platinum or gaming-themed equivalents) with unlockable rewards: badges, Discord roles, event priority access, merchandise, and partner-sponsored prizes. (Priority: **Must**)

- **[REQ-F025]**: The system shall provide leaderboards (global, per-city, per-club, per-challenge) displayed via Redis sorted sets with real-time updates. (Priority: **Should**)

- **[REQ-F026]**: The system shall support time-limited wellness challenges (e.g., "Walk 10K steps for 7 days", "Attend 3 meetups this month", "Complete sleep hygiene module") with progress tracking and completion rewards. (Priority: **Must**)

#### Consent Management

- **[REQ-F027]**: The system shall implement a multi-layered consent architecture with individually togglable consent categories: (a) basic community participation, (b) content consumption tracking, (c) event behavior tracking, (d) self-reported health data collection, (e) wearable data collection, (f) sharing aggregated data with healthcare partners, (g) sharing aggregated data with insurance partners, (h) sharing aggregated data with consumer brand partners, (i) cross-border data transfer (for LATAM expansion). (Priority: **Must**)

- **[REQ-F028]**: The system shall allow users to revoke any individual consent category at any time, with immediate effect on data processing and clear UI showing what is currently consented. (Priority: **Must**)

- **[REQ-F029]**: The system shall maintain a complete audit trail of all consent grants, revocations, and data access events, stored immutably. (Priority: **Must**)

- **[REQ-F030]**: The system shall support data deletion requests (right to erasure) per LOPDP, with automated workflows to purge user data from all systems including backups within legally mandated timeframes. (Priority: **Must**)

- **[REQ-F031]**: The system shall present consent requests in plain Spanish (not legalese), with gaming-friendly metaphors where appropriate, clearly explaining what data is collected, why, who receives it, and what happens if consent is denied. (Priority: **Must**)

#### Crisis Intervention

- **[REQ-F032]**: The system shall implement crisis detection mechanisms in community interactions (keyword detection, sentiment analysis, user-reported concerns) with escalation to trained moderators and licensed mental health partners. (Priority: **Must**)

- **[REQ-F033]**: The system shall provide a visible, always-accessible "crisis resource" link/button across all platform surfaces (web, app, Discord) connecting to Ecuador's emergency mental health resources and the platform's licensed partner. (Priority: **Must**)

- **[REQ-F034]**: The system shall maintain crisis intervention protocols documentation, moderator training materials, and escalation procedures, reviewed quarterly by a licensed mental health professional. (Priority: **Must**)

#### Mobile App

- **[REQ-F035]**: The system shall provide a React Native (Expo) mobile app for iOS and Android as the primary data collection and gamification interface, with features: profile management, event check-in, wellness challenges, wearable sync, XP dashboard, consent management, and content consumption. (Priority: **Must** — Phase 2)

- **[REQ-F036]**: The system shall support offline-capable event check-in via the mobile app (QR scanning works without internet, syncs when connected). (Priority: **Could**)

### Non-Functional Requirements

#### Performance

- **[REQ-NF001]**: Web platform pages shall load in under 3 seconds on a 10 Mbps connection (Ecuador median is 77.65 Mbps fixed, but mobile varies). (Priority: **Must**)

- **[REQ-NF002]**: Event check-in system shall process a check-in in under 2 seconds to avoid queuing at physical events. (Priority: **Must**)

- **[REQ-NF003]**: Leaderboard updates shall reflect within 30 seconds of triggering action. (Priority: **Should**)

#### Scalability

- **[REQ-NF004]**: The platform shall support 10,000 concurrent users at Phase 1, scaling to 100,000 at Phase 2 and 500,000 at Phase 3, without architectural changes. (Priority: **Must**)

- **[REQ-NF005]**: The wearable data pipeline shall handle ingestion of 1M+ data points per day at Phase 3 scale. (Priority: **Should**)

#### Security & Compliance

- **[REQ-NF006]**: All health data shall be encrypted at rest (AES-256) and in transit (TLS 1.3). (Priority: **Must**)

- **[REQ-NF007]**: The system shall implement Row-Level Security (Supabase RLS) ensuring users can only access their own data, B2B partners can only access aggregated data within their consent scope, and administrators have audited access. (Priority: **Must**)

- **[REQ-NF008]**: A Data Protection Impact Assessment (DPIA) shall be completed and filed with SPDP before any health data collection begins. (Priority: **Must** — Pre-launch legal requirement)

- **[REQ-NF009]**: A Data Protection Officer (DPO) shall be appointed before platform launch. (Priority: **Must** — LOPDP legal mandate)

- **[REQ-NF010]**: The platform shall implement k-anonymity (k >= 50 recommended given Ecuador's small gamer population) for all B2B data exports to prevent re-identification. (Priority: **Must**)

- **[REQ-NF011]**: The system shall pass an annual security audit and penetration test. (Priority: **Should**)

#### Availability

- **[REQ-NF012]**: The platform shall target 99.5% uptime for web/app services. (Priority: **Should**)

- **[REQ-NF013]**: The crisis resource links shall have 99.99% availability (static, CDN-hosted, independent of main platform). (Priority: **Must**)

#### Localization & Accessibility

- **[REQ-NF014]**: All user-facing interfaces shall be in Spanish (primary) with English toggle, using LATAM Spanish (not Castilian). (Priority: **Must**)

- **[REQ-NF015]**: The platform shall meet WCAG 2.1 AA accessibility standards. (Priority: **Should**)

- **[REQ-NF016]**: The platform shall be Discord teen-appropriate mode compatible (mandated since March 2026). (Priority: **Must**)

#### Data Sovereignty

- **[REQ-NF017]**: All personal and health data shall be stored in infrastructure within jurisdictions compliant with LOPDP cross-border transfer requirements. Supabase self-hosting is the recommended path. (Priority: **Must**)

- **[REQ-NF018]**: The system shall support data portability — users can export all their data in a standard format (JSON/CSV). (Priority: **Should**)

#### Cost

- **[REQ-NF019]**: Infrastructure costs shall remain under $260/month at MVP stage, scaling with revenue. (Priority: **Must**)

---

## Use Cases

### UC-001: Gamer Onboarding

- **Actor**: New Gamer
- **Precondition**: Gamer discovers the platform via Discord invite, social media, content, event, or word of mouth.
- **Main Flow**:
  1. Gamer joins the Discord server (community layer — zero data collection here).
  2. Discord bot welcomes the gamer with community guidelines, channel guide, and an invitation to "link your account for XP and challenges."
  3. Gamer clicks the Discord Account Linking ("1-Click") URL, which opens the web platform.
  4. Gamer creates an account on the owned platform (email or social login).
  5. System presents the first consent layer in plain Spanish: basic community participation and content tracking consent. Explains in simple terms what is collected and why.
  6. Gamer completes an optional onboarding survey: favorite games, city, wellness interests (fitness, mental health, nutrition, sleep), preferred event types.
  7. System assigns the gamer a starter XP amount and relevant Discord roles (city, game preference).
  8. Gamer sees their profile dashboard with: XP, upcoming events in their city, recommended content, and available challenges.
- **Alternative Flows**:
  - **AF-1**: Gamer declines account linking — they remain a Discord-only community member with no data collection, no XP, limited gamification. Periodic non-intrusive invitations to link.
  - **AF-2**: Gamer is under 18 — system detects age and applies enhanced protections: parental consent flow (LOPDP requirement for minors), restricted data categories, age-appropriate content filters, Discord teen mode compliance.
  - **AF-3**: Gamer arrives via event (physical) first, not Discord — check-in process at event includes QR code with signup URL, creating account with event as entry point.
- **Postcondition**: Gamer has a linked Discord + platform identity, baseline profile, and initial consent grants. System has demographic + preference data (with consent) for segmentation.

### UC-002: Event Attendance and Check-In

- **Actor**: Registered Gamer, Event Organizer
- **Precondition**: An event (meetup, general event, or club session) has been created and published on Discord + web platform. Gamer has RSVP'd (optional but tracked).
- **Main Flow**:
  1. Event organizer publishes event details on the platform, which syncs to Discord via bot announcement with RSVP reaction.
  2. Gamer receives reminder via Discord notification and/or WhatsApp (if opted in) 24 hours and 1 hour before event.
  3. At the physical venue, event organizer displays a check-in QR code (dynamic, event-specific, time-limited).
  4. Gamer opens the mobile app and scans the QR code.
  5. System records: user ID, event ID, timestamp, location (venue-level, not GPS tracking), event type (meetup/general/club).
  6. System awards XP for attendance (amount varies by event tier and frequency — bonus for streak attendance).
  7. Gamer receives a push notification confirming check-in and XP earned.
  8. Post-event (next day): system sends a brief feedback survey via the app (NPS, qualitative, optional wellness self-report).
- **Alternative Flows**:
  - **AF-1**: Gamer has no mobile app — event organizer has a tablet/laptop with manual check-in (search by username, confirm attendance).
  - **AF-2**: No internet at venue — app caches check-in locally and syncs when connection is restored (REQ-F036).
  - **AF-3**: Virtual event — check-in is via a Discord Activity or clicking a "join" button on the web platform at event time, with presence duration tracked.
  - **AF-4**: Walk-in (no RSVP, no account) — event organizer captures basic info for a lead-generation follow-up invitation to join the platform.
- **Postcondition**: Attendance is recorded, XP is awarded, behavioral data (event type preference, attendance frequency, geographic cluster) is captured with consent. Feedback is collected for event improvement and community health assessment.

### UC-003: Wellness Data Collection with Consent

- **Actor**: Registered Gamer
- **Precondition**: Gamer has a linked platform account. System has not yet collected health/wellness data beyond basic demographics.
- **Main Flow**:
  1. Gamer navigates to "Mi Bienestar" (My Wellness) section on the web/app.
  2. System presents the wellness data consent layer separately from the basic account consent: (a) self-reported health surveys, (b) wearable data connection, (c) sharing with healthcare partners, (d) sharing with insurance partners. Each is a separate toggle.
  3. Gamer enables consent for self-reported surveys.
  4. System presents a baseline wellness survey: physical activity level, sleep quality, stress level, dietary habits, gaming hours/day, social connection frequency. All questions are optional and framed in gaming metaphors (e.g., "What's your current HP level? 1-10").
  5. System stores responses in Supabase with RLS, tagged with the specific consent grant.
  6. Gamer sees their "wellness stats" visualized as a gaming character sheet (HP, Stamina, Mental, Social).
  7. System recommends relevant challenges and content based on self-identified areas of interest.
  8. Periodically (monthly), system prompts for a brief wellness check-in to track trends over time.
- **Alternative Flows**:
  - **AF-1**: Gamer enables wearable data — system initiates OAuth flow with Open Wearables / HealthKit / Health Connect. Once connected, data syncs automatically. Gamer sees real-time stats integrated into their character sheet.
  - **AF-2**: Gamer revokes a specific consent category — system immediately stops collecting that data type, marks existing data as "consent-revoked" (retained per legal retention period or deleted per user request), and updates the B2B aggregation pipeline to exclude this user from that segment.
  - **AF-3**: Gamer wants to see exactly what data is shared — system provides a "data transparency" view showing every data point, when it was collected, and which consent category it falls under.
  - **AF-4**: Gamer is part of a cohort too small for anonymization (k-anonymity threshold not met) — system withholds that cohort's data from B2B reports entirely, notifies admin.
- **Postcondition**: Wellness data is collected strictly within consented categories, stored with encryption and RLS, auditable. Gamer has visibility and control. Data feeds aggregated segments for B2B (where cohort size permits).

### UC-004: B2B Partner Dashboard

- **Actor**: B2B Partner (Insurer, Hospital, Brand)
- **Precondition**: Partner has signed a B2B agreement, been onboarded with a partner account, and has defined their data access scope (which consent categories they can access aggregated data for).
- **Main Flow**:
  1. Partner logs into the B2B dashboard (Metabase-based, embedded in the partner portal).
  2. System authenticates and authorizes, showing only data segments the partner is contractually and consent-wise permitted to access.
  3. Partner views: audience demographics dashboard (age, gender, city, game preferences), engagement metrics (event attendance, content consumption, challenge participation), and wellness segment summaries (only if sufficient users have consented to that partner category).
  4. Partner can filter by: geography, game cluster, wellness interest, engagement level, time period.
  5. Partner can create a sponsored activation (challenge, event sponsorship, content sponsorship) and submit for platform approval.
  6. Partner views campaign performance: impressions, participation rate, completion rate, brand sentiment (if surveyed).
  7. Partner can export aggregated reports (PDF/CSV) for internal use, subject to data use restrictions in the B2B agreement.
- **Alternative Flows**:
  - **AF-1**: Partner requests data at a granularity that would violate k-anonymity — system rejects the query and displays an explanation: "This segment has fewer than [threshold] users. Data is not available to protect user privacy."
  - **AF-2**: A significant number of users revoke consent for this partner's category — system updates the dashboard in real-time, reducing available audience size. If audience drops below a viability threshold, system alerts the partner and platform admin.
  - **AF-3**: Partner is an insurer — additional guardrails apply: data cannot be used for individual risk scoring or price discrimination. Contract and technical controls enforce aggregate-only access.
- **Postcondition**: Partner has actionable, privacy-compliant audience insights and campaign tools. No individual user is identifiable. All access is logged for audit.

### UC-005: Community Club Formation

- **Actor**: Club Captain (Community Leader), Platform Admin
- **Precondition**: A recurring meetup (e.g., "Caminata Dota Quito") has been running for at least N sessions (threshold TBD) with consistent attendance above M members (threshold TBD).
- **Main Flow**:
  1. Platform admin identifies a meetup that meets club formation criteria (attendance consistency, member demand, leader availability) or a community leader self-nominates.
  2. Admin contacts the most active organizer(s) and proposes club formation.
  3. Candidate Club Captain agrees and completes a brief onboarding: club name, mission, schedule, city, target game/activity.
  4. System creates the club entity: dedicated Discord channels (chat + voice), web/app club page, recurring event schedule, member roster.
  5. Club Captain receives elevated permissions: event creation within their club, member management, announcement posting, attendance tracking.
  6. Existing meetup attendees are invited to formally join the club (opt-in, not automatic).
  7. Club appears in the platform's club directory, discoverable by city and interest.
  8. Club Captain earns XP bonuses for leadership activities (organizing events, growing membership, member retention).
- **Alternative Flows**:
  - **AF-1**: Club Captain becomes inactive — system detects inactivity (no events for X weeks), prompts for a status check. If unresponsive, offers leadership transfer to the next most active member.
  - **AF-2**: Club violates community guidelines — admin can suspend or dissolve the club, with members redirected to general meetups.
  - **AF-3**: Club requests physical resources (venue booking, equipment) — routed to operations team for evaluation and partner venue coordination.
- **Postcondition**: A persistent, self-sustaining community unit exists with its own identity, leadership, and activity cadence. The platform scales community without proportional headcount increase.

### UC-006: Content Consumption and Tracking

- **Actor**: Registered Gamer
- **Precondition**: Gamer has a linked account with content tracking consent granted.
- **Main Flow**:
  1. Gamer browses the content hub on web/app, which surfaces personalized recommendations based on their game preferences, wellness interests, and consumption history.
  2. Gamer selects a piece of content (article, video, interactive guide).
  3. System tracks: content ID, start time, completion percentage, time spent, interaction (likes, shares, saves).
  4. Upon completing a piece of content, gamer earns XP (amount varies by content type and length).
  5. System updates the gamer's content profile and refines future recommendations.
  6. Aggregated content engagement data feeds into B2B dashboards (which wellness topics resonate, which game clusters engage most with health content, etc.).
- **Alternative Flows**:
  - **AF-1**: Gamer consumes content on YouTube/TikTok directly (not via platform) — no tracking occurs. Platform incentivizes in-platform consumption via XP.
  - **AF-2**: Gamer has not consented to content tracking — content is accessible but no behavioral data is collected. XP for content completion is unavailable.
  - **AF-3**: Content contains a wellness assessment (e.g., stress quiz embedded in an article) — assessment results stored under the self-reported health data consent, not the content tracking consent. System checks that specific consent before storing.
- **Postcondition**: Gamer has consumed wellness content relevant to their interests. Platform has engagement data (with consent) for recommendations and B2B insights.

### UC-007: Gamification / XP System

- **Actor**: Registered Gamer
- **Precondition**: Gamer has a linked platform account.
- **Main Flow**:
  1. Gamer performs an XP-earning action (event check-in, challenge completion, content consumption, club participation, referral, wellness survey completion, wearable milestone).
  2. System calculates XP earned based on action type and multipliers (streak bonuses, club bonuses, challenge bonuses).
  3. System updates the gamer's total XP and checks for level-up thresholds.
  4. If a level-up occurs, system sends a celebratory notification, updates Discord role, and unlocks tier rewards (new badge, access to exclusive channel, merchandise eligibility, partner-sponsored prize draw entry).
  5. Gamer's position on relevant leaderboards (global, city, club, challenge) updates in near-real-time.
  6. System tracks XP velocity (rate of earning) as an engagement health metric for the community team.
- **Alternative Flows**:
  - **AF-1**: Gamer attempts to game the system (e.g., rapid check-in/out, bot-like content consumption) — anti-cheat mechanisms detect anomalous patterns and flag for review. XP is held pending verification.
  - **AF-2**: Gamer earns enough XP to redeem a physical reward — system triggers a fulfillment workflow (merchandise shipping, partner voucher generation, etc.).
  - **AF-3**: Leaderboard competition causes negative behavior (toxicity, gatekeeping) — community team can adjust leaderboard visibility, introduce collaborative challenges, or create separate competitive and cooperative tracks.
- **Postcondition**: Gamer has a tangible sense of progress and belonging. Platform has rich engagement data. Partner-sponsored rewards create B2B touchpoints that feel organic.

### UC-008: Wearable Integration

- **Actor**: Registered Gamer with a wearable device
- **Precondition**: Gamer has linked their platform account and consented to wearable data collection (consent category (e) from REQ-F027).
- **Main Flow**:
  1. Gamer navigates to "Connect Wearable" in the app settings.
  2. System presents supported connection methods: HealthKit (iOS), Health Connect (Android, replacing deprecated Google Fit), or Open Wearables (200+ devices via MIT library).
  3. Gamer authorizes the connection via the device platform's OAuth flow.
  4. System begins ingesting data: steps, heart rate, sleep duration, active minutes, calories burned. Data is streamed into TimescaleDB via the backend.
  5. Gamer's "character sheet" updates with real-time vitals displayed as gaming stats (Stamina = steps, Regen = sleep, etc.).
  6. Wearable data feeds into wellness challenges (e.g., "Walk 50K steps this week" auto-tracked via wearable).
  7. Gamer can set personal goals and receive push notifications for milestones.
- **Alternative Flows**:
  - **AF-1**: Gamer's device is not supported — system recommends supported devices or allows manual data entry as fallback.
  - **AF-2**: Wearable sync fails (Bluetooth issues, API downtime) — system retries with exponential backoff and notifies gamer if data gap exceeds 24 hours.
  - **AF-3**: Gamer disconnects wearable — system stops ingesting data immediately, existing data retained per consent terms or deleted on request.
  - **AF-4**: Wearable data reveals a concerning pattern (e.g., resting heart rate spike, prolonged sleep deprivation) — system does NOT diagnose. Instead, it suggests relevant wellness content and, if patterns are severe, surfaces crisis resources (REQ-F033). No automated medical alerts.
- **Postcondition**: Wearable data enriches the gamer's profile, powers challenges, and (in aggregate) provides health behavior data for B2B insights. Data sovereignty maintained in Supabase with RLS.

### UC-009: Crisis Intervention

- **Actor**: Gamer in distress, Moderator, Crisis Response Partner
- **Precondition**: A gamer exhibits signs of mental health crisis via community interaction (Discord message, event behavior, self-reported survey) or self-identifies as in crisis.
- **Main Flow**:
  1. **Detection**: One of three triggers fires:
     - (a) Keyword detection in Discord messages (suicide, self-harm, crisis-related terms) — bot flags the message for moderator review without publicly alerting the user.
     - (b) Another community member reports a concern about a gamer via a confidential reporting mechanism.
     - (c) Gamer self-identifies by clicking the "I need help now" crisis button (REQ-F033).
  2. **Triage**: If self-identified (trigger c), system immediately displays: Ecuador emergency number (911), Linea de Apoyo Emocional, and the platform's licensed partner contact. No delay, no gating.
  3. If detected via triggers (a) or (b), a trained moderator reviews the context within 15 minutes (SLA for active hours, best-effort off-hours).
  4. **Moderator Response**: Moderator reaches out privately (DM) with a supportive, non-clinical message following the trained protocol (do not diagnose, do not minimize, provide resources, ask if they want to talk to a professional).
  5. **Escalation**: If the situation is assessed as high-risk (imminent self-harm, suicidal ideation with plan), moderator escalates to the licensed mental health partner via the established emergency protocol.
  6. **Follow-up**: Within 48 hours, a designated community care team member checks in with the gamer (if they consented to follow-up).
  7. **Documentation**: All crisis interactions are logged in a secure, access-restricted system for quality review and protocol improvement. Logged data is NOT used for B2B purposes under any circumstances.
- **Alternative Flows**:
  - **AF-1**: Crisis occurs at a physical event — event organizer follows physical crisis protocol: ensure safety, call emergency services if needed, provide support, debrief with community team. Written protocol posted at every event.
  - **AF-2**: False positive from keyword detection — moderator assesses context and dismisses. System learns from moderator feedback to reduce false positives over time.
  - **AF-3**: No moderator available (off-hours) — system auto-responds with crisis resources (trigger c behavior) and queues for next available moderator.
  - **AF-4**: Moderator experiences secondary trauma — moderator support protocol: debrief with lead moderator, access to the same crisis partner, optional break from moderation duties.
- **Postcondition**: Gamer in crisis received immediate resource access and human support. Incident is documented for protocol improvement. Moderator wellbeing is also addressed. Zero crisis data enters the B2B pipeline.

---

## Open Questions

*These require human/domain expert input before implementation can proceed:*

### Business & Strategy

1. **Revenue sequencing**: The intake doc positions B2B data monetization to insurers as the primary revenue engine, but the knowledge brief strongly warns against this. What is the actual Day 1 revenue model? Recommendation: sponsorships + events + content monetization first. B2B data as Phase 3 upside only. This needs explicit founder alignment.

2. **Naming decision**: Eight candidate names are listed (Vida GG, HP Collective, Respawn EC, Vitalis GG, Equinox GG, LevelUp.ec, Buff Zone, Nexus Well). This blocks domain registration, social handle registration, brand identity, and legal trademark filing. When will this be decided?

3. **Anchor client status**: Aseguradora del Sur is listed as an anchor client. What is the actual status of this relationship? MOU signed? Verbal interest? Letter of intent? This materially affects Phase 2-3 planning.

4. **Bootstrapping vs. funding**: HealthyGamer succeeded by deliberately avoiding VC. The market analysis recommends bootstrapping. What is the actual capitalization plan? Personal funds? Angel? Grant? This determines build velocity.

5. **Event economics**: Who funds the physical events in Phase 1 before sponsorship revenue? Venue costs, equipment, food, insurance — what is the budget per event?

### Product & Operations

6. **Club formation thresholds**: What defines "critical mass" for a meetup becoming a club? Number of sessions? Minimum consistent attendance? Leader availability? These numbers need to be defined based on early meetup data.

7. **Age floor**: Is the platform 16+ or 18+? This fundamentally changes: consent architecture (parental consent for minors), content policies, Discord configuration (teen mode), LOPDP requirements, and B2B data usability.

8. **Mental health partner**: Who is the licensed mental health partner for crisis intervention? Has a partnership been established? This is a MUST-HAVE before community launch, not a nice-to-have.

9. **DPO appointment**: Has a Data Protection Officer been identified? This is a legal prerequisite before any health data collection under LOPDP. What is the timeline?

10. **Moderator sourcing**: Where do the initial moderators come from? Paid or volunteer? What training will they receive? At 1:100 ratio, a 1,000-member Discord needs 10 moderators.

### Technical

11. **Supabase hosting**: Self-hosted (for data sovereignty) or cloud-hosted? Self-hosted gives full LOPDP compliance but increases operational burden. Cloud-hosted simplifies ops but requires confirmation that the hosting region is LOPDP-compliant for health data.

12. **k-anonymity threshold**: What is the minimum cohort size for B2B data exports? k=50 is recommended for Ecuador's small population, but this needs legal and statistical validation. Too high and B2B data is useless; too low and re-identification is possible.

13. **Wearable data retention**: How long is wearable time-series data retained? Indefinitely (useful for longitudinal studies but storage-intensive and privacy-risky)? Rolling 12 months? This needs a policy decision with legal input.

### Regulatory

14. **Cross-border data transfer**: For LATAM expansion (Colombia, Mexico, Peru), each country has different data protection regimes. Colombia requires explicit authorization for health data. Mexico requires express written consent. Peru is classifying neurodata. Has legal counsel mapped the compliance requirements for target expansion markets?

15. **"Wellness" vs. "health" claims**: How does the platform position its wellness content to avoid being classified as health advice or medical services? This affects regulatory requirements and liability. Legal review needed.

16. **Anti-discrimination safeguards**: If insurer partners use aggregated data to inform product design, and that product design results in price discrimination against certain gamer segments, what is the platform's liability exposure? Legal opinion needed before any insurer B2B deal.

---

## Assumptions

*These are working assumptions that underpin this analysis. If any prove false, the corresponding requirements and use cases must be revisited.*

### Business Assumptions

- **A1**: Gamers will voluntarily share wellness data if the value exchange is clear (XP, personalized content, community belonging) and consent is transparent. Basis: HealthyGamer's 16,000+ coaching clients, Discovery Vitality's 68% participation rate in gamified health programs.

- **A2**: Sponsorship and brand partnership revenue will materialize before insurer B2B revenue. Basis: Red Bull's 79% awareness among gamers translating to 39% favorability increase; gaming sponsorship is a proven $50K-$2M/year market per the market analysis.

- **A3**: The B2B insurer revenue model will take 18-36 months to generate meaningful revenue, if it works at all. Basis: Akili, Pear Therapeutics, and every B2B health tech play's extended sales cycles and failures. The platform must be financially viable without it.

- **A4**: Physical events in Quito and Guayaquil will achieve sufficient attendance (20+ per meetup) within 3 months to validate the community layer. Basis: Kubox's successful launch, E-Sport Celerity's $30K+ prize pools indicating audience demand, 80% of gamers saying events make them feel part of community.

- **A5**: The Ecuador market is large enough to validate the model ($168M gaming market, 2.8M projected users by 2027) but small enough to dominate as first mover before expanding to Colombia/Mexico/Peru.

### Technical Assumptions

- **A6**: The recommended tech stack (Supabase + React Native + NestJS + Open Wearables) is production-viable at the specified cost ($100-260/month MVP). Basis: knowledge brief recommendation with rationale per component.

- **A7**: Discord Account Linking will reliably bridge Discord identity to the owned platform, enabling cross-platform XP and profile continuity. Basis: Discord's official "1-Click" account linking feature.

- **A8**: Open Wearables (MIT license) will remain maintained and support the 200+ devices claimed. Basis: MIT license guarantees forkability even if abandoned, but ongoing maintenance is assumed.

- **A9**: Google Fit APIs are deprecated (2026) and Health Connect is the mandatory Android path. All Android wearable integrations must go through Health Connect or Open Wearables, not Google Fit.

### Regulatory Assumptions

- **A10**: LOPDP enforcement will continue to intensify based on the trajectory evidenced by the January 2026 fines against LigaPro and FEF. The project cannot afford a "move fast, comply later" approach.

- **A11**: Peer wellness coaching (non-clinical, non-therapeutic) is not regulated in Ecuador as of April 2026. If regulation changes, the coaching model must be adapted. This assumption needs periodic legal review.

- **A12**: Discord's TOS prohibition on data monetization is non-negotiable and will not change. All data collection, storage, and monetization logic must exist entirely outside Discord. Discord is a community channel only.

- **A13**: "Anonymized" data from a small population (Ecuadorian gamers) is technically re-identifiable. The platform must treat all behavioral/health data as personal data under LOPDP unless proven otherwise through formal anonymization assessment.

### Community Assumptions

- **A14**: Community leaders (club captains) will emerge organically from active meetup attendees within 6-9 months, following the pattern described in the master project document.

- **A15**: Content in Spanish with gaming-native language will resonate more strongly than translated English content. Basis: LTA backlash showing regional identity matters; zero existing Spanish wellness content for gamers.

- **A16**: Mental health discussions in the community will occur and will occasionally involve genuine crisis situations. Crisis intervention is not a theoretical requirement; it is an operational certainty that must be prepared for before launch.

---

## Risk-Adjusted Priority Matrix

| Priority | Item | Risk if Deferred |
|----------|------|-----------------|
| P0 (Before Launch) | DPO appointment | Legal non-compliance, fines |
| P0 (Before Launch) | DPIA completion | Cannot collect health data legally |
| P0 (Before Launch) | Crisis intervention protocol + licensed partner | Liability exposure, user harm |
| P0 (Before Launch) | Consent architecture (multi-layered, revocable) | Legal non-compliance, trust erosion |
| P0 (Before Launch) | Discord-separate data collection confirmation | Discord TOS violation, platform ban |
| P1 (Phase 1) | Web platform with content hub | Community has no owned surface |
| P1 (Phase 1) | Discord bot (events, XP, roles) | Community engagement is manual |
| P1 (Phase 1) | Event check-in system | No behavioral data from events |
| P1 (Phase 1) | Gamification engine (XP/levels) | Low retention, no engagement loop |
| P2 (Phase 2) | Mobile app | Data collection limited to web only |
| P2 (Phase 2) | Wearable integration | No biometric data layer |
| P2 (Phase 2) | B2B partner dashboard | No monetization from data |
| P2 (Phase 2) | Club formation workflow | Community scaling bottleneck |
| P3 (Phase 3) | LATAM expansion compliance | Cannot enter new markets legally |
| P3 (Phase 3) | Insurer-specific data products | Revenue upside but NOT core |

---

*End of Business Analysis. This document should be reviewed by: the project founder (for strategic alignment and open question resolution), legal counsel (for LOPDP/regulatory assumptions), and the technical architect (for stack and NFR validation).*
