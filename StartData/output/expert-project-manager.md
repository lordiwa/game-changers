# Expert Project Management Analysis: Gamer Wellness

**Project**: Gamer Wellness -- First Gaming + Wellness Community in LATAM
**Author**: Senior Project Manager (AI-assisted)
**Date**: 2026-04-07
**Version**: 1.0
**Status**: Initial Plan -- Pending Human Review

---

## Project Overview

- **Scope**: Build a three-layer platform (Media, Social Hub, Audience Activator) that creates the first gaming+wellness community in LATAM. Starts in Ecuador (Quito/Guayaquil), expands regionally. Community lives on Discord (no data collection there); data collection, consent management, gamification, wellness tracking, and B2B monetization live on owned web/app infrastructure. Must comply with Ecuador's LOPDP from day zero. Budget is bootstrapped at ~$100-260/mo infrastructure.
- **Complexity**: **Very High** -- This project spans community building, physical event operations, software platform development, health data compliance (LOPDP), wearable integration, gamification design, B2B sales, and multi-country expansion. The combination of sensitive health data regulation, bootstrapped budget, and the need to build community before technology makes this one of the hardest project archetypes: a regulated, community-dependent, data-driven marketplace launched without capital.
- **Recommended Approach**: **Lean Community-First with Progressive Digitization**. The project must resist the temptation to build technology before community exists. Phase 0 is legal foundation. Phase 1 is purely community + events + social media using free/cheap tools (Discord, Canva, WhatsApp, Google Forms). Technology enters in Phase 2 only after the community has proven demand. This follows the HealthyGamer.gg model: Dr. K built 3M+ YouTube subscribers before building a platform. Software is an amplifier of community, not a substitute.

---

## Phases

### Phase 0: Legal & Compliance Foundation -- "Before You Touch Any Data"
**Duration**: Months 0-2 (overlaps with Phase 1 start)
**Goal**: Establish the legal, compliance, and governance foundation required by LOPDP before any personal data is collected.

**Deliverables**:

| Deliverable | Effort | Notes |
|-------------|--------|-------|
| LOPDP legal counsel engagement | S | Identify and retain an Ecuadorian data privacy attorney. Non-negotiable. |
| Data Protection Officer (DPO) appointment | S | LOPDP mandate for health data processors. Can be part-time / outsourced initially. |
| Data Protection Impact Assessment (DPIA) draft | L | Must be filed with SPDP before any health data collection. Covers all planned data categories. |
| Privacy Policy + Terms of Service (ES/EN) | M | Plain-language, LOPDP-compliant. Must cover all consent categories from REQ-F027. |
| Consent architecture design | M | Document all 10 consent categories, their purposes, and the progressive consent model. |
| Crisis intervention protocol | M | Partnership with licensed mental health provider in Ecuador. Moderator escalation procedures. Crisis resource list (Linea 171, etc.). |
| Community guidelines + Code of Conduct | S | For Discord and events. Anti-harassment policy. Safety protocols for IRL events. |
| Company / entity formation | M | Legal entity in Ecuador capable of signing B2B contracts and processing data. |

**Dependencies**: None -- this is the foundation everything else depends on.
**Milestone**: DPO appointed, DPIA submitted to SPDP, privacy policy published, crisis protocol documented and reviewed by licensed professional.
**Estimated Effort**: **Medium** (calendar time) / **Small** (dev effort, mostly legal/administrative work)

**CRITICAL**: No personal data may be collected -- not even email addresses for a mailing list -- until the DPIA is at least drafted and the privacy policy is published. Discord community participation (Phase 1) is acceptable because Discord is the data controller for their platform, not Gamer Wellness.

---

### Phase 1: Community Foundation -- "Build the Soul Before the Machine"
**Duration**: Months 1-4 (overlaps with Phase 0 completion)
**Goal**: Build a thriving, visible gaming+wellness community in Ecuador using zero-code/low-code tools. Prove demand. Create content. Run events. Build the founding tribe of 500 Discord members.

**Deliverables**:

| Deliverable | Effort | Notes |
|-------------|--------|-------|
| Discord server setup (full IA from Product/UX spec) | S | Channels, roles, onboarding bot (MEE6 or Carl-bot initially, custom bot later), moderation config. |
| Social media launch (TikTok, Instagram, YouTube) | M | Content calendar. First 30 days of content. Bilingual ES/EN. Focus on TikTok for discovery. |
| Mobile-optimized landing page | S | Single-page site with: mission, next 3 events, Discord join CTA. Carrd.co or simple Next.js page on Vercel ($0). |
| First 6 meetups (3 Quito, 3 Guayaquil) | M | Themed by game (Caminata Dota, Run Free Fire, Chill Minecraft). QR check-in via Google Forms or Luma. |
| WhatsApp broadcast group for events | S | WhatsApp Business for event reminders. |
| First General Event | L | Multi-activity convergence event. 50+ attendees target. Brand activation opportunity (even unpaid at first). |
| Community moderation team (3-5 volunteers) | M | Recruit from early members. Basic training on guidelines and crisis escalation. |
| Influencer outreach (3-5 initial creators) | M | Philippe Michelet, Sebastian Hernandez, or equivalent. Co-create first content. |
| Venue partnerships (2-3 confirmed) | M | Kubox eSports Arena (Guayaquil), MMA El Valle, public parks. |
| Founding members program | S | First 100 members get special Discord role, input on naming, early app access later. |

**Dependencies**: Phase 0 (community guidelines, crisis protocol) must be complete before first event.
**Milestone**: 500 Discord members, 6+ meetups completed, 3 social media channels active with growing followers, at least one General Event executed, community engagement rate (DAU/MAU) > 30% on Discord.
**Estimated Effort**: **Large** (calendar + ongoing content + event logistics)

**Key Principle**: In Phase 1, every tool is disposable. Google Forms for check-in, Canva for graphics, Luma for events, WhatsApp for comms. The goal is community validation, not technical infrastructure. If nobody shows up to the meetups, no amount of software will fix that.

---

### Phase 2: Platform MVP -- "Digitize the Community"
**Duration**: Months 4-10
**Goal**: Build the owned web/app platform that enables data collection (with consent), gamification, event management, and the Discord-to-App bridge. PWA first, not native app.

**Deliverables**:

| Deliverable | Effort | Notes |
|-------------|--------|-------|
| Supabase project setup (DB, Auth, RLS, Storage) | M | Schema from architect spec. RLS policies for consent enforcement. |
| NestJS API server (core modules) | L | Auth, profiles, consent, events, gamification. Modular monolith per ADR-005. |
| Next.js web app (PWA) | L | Landing, events, profiles, consent management, content hub, QR check-in. |
| Discord bot (custom, discord.js v14) | M | Account linking (OAuth), event announcements, slash commands, leaderboard display. |
| Granular consent management UI | L | Progressive consent model (Layers 0-3). Audit trail. Revocation support. LOPDP compliant. |
| User profiles with XP/badges/levels | M | Gamification engine integration (gengine or custom). Redis leaderboards. |
| Event management system | M | Create, publish, RSVP, QR check-in, post-event survey, XP award. |
| Wellness challenges (manual entry) | M | Weekly challenges with progress tracking. Bronze/Silver/Gold tiers. |
| Community leaderboards (opt-in) | M | Global, city, club, challenge. Redis sorted sets. |
| Content hub (blog/articles + embedded video) | M | Next.js SSG for SEO. Wellness articles in Spanish. YouTube embeds. |
| Wearable integration (HealthKit + Health Connect) | L | React Native native modules. Open Wearables for long-tail devices. |
| PostHog setup (self-hosted) | S | Product analytics, feature flags, funnel tracking. |
| Push notifications (FCM/APNs via Expo) | S | Event reminders, challenge updates, achievement unlocks. |
| DPIA update and re-file with SPDP | M | Updated DPIA reflecting actual data collection now live. |

**Dependencies**: Phase 0 complete (DPO, DPIA filed, privacy policy live). Phase 1 community of 500+ Discord members to seed the platform.
**Milestone**: 1,500 app registrations (40% Discord-to-App conversion), consent Layer 2 granted by 40% of app users, 8+ events/month managed through platform, first wellness challenge with 200+ participants, wearable connection rate of 20% among app users.
**Estimated Effort**: **Extra Large** (this is the core engineering phase)

**Build vs Buy Decisions for Phase 2**:

| Component | Decision | Rationale |
|-----------|----------|-----------|
| Database/Auth | Buy (Supabase) | $25/mo, RLS built-in, self-hostable for LOPDP. |
| Backend framework | Build (NestJS) | Custom consent middleware required. No off-the-shelf solution handles LOPDP + gaming gamification. |
| Web app | Build (Next.js) | Custom UX critical for gaming audience. |
| Gamification engine | Buy/Integrate (gengine, MIT) | Pre-built rule engine. Self-hosted. Avoids building XP/achievement logic from scratch. |
| Wearable integration | Buy/Integrate (Open Wearables, MIT) | Free, 200+ devices, self-hosted. At scale, saves $1,500-2,000/mo vs Terra/ROOK. |
| Analytics | Buy (PostHog self-hosted) | Free, full-featured. Self-hosted for data sovereignty. |
| Leaderboards | Build (Redis sorted sets) | Simple, fast, no third-party needed. |
| Consent management | Build (custom NestJS module) | No off-the-shelf solution meets LOPDP granularity + gaming UX requirements. |
| Event QR check-in | Build (simple QR generation + scan) | Trivial to build. No third-party needed. |
| Email | Buy (Resend) | Free tier (3K emails/mo). Developer-friendly. |
| Push notifications | Buy (Expo Push + FCM/APNs) | Free. Integrated with React Native. |

---

### Phase 3: Wellness & Data + First Revenue -- "Start the Engine"
**Duration**: Months 10-18
**Goal**: Deepen wellness data collection, launch the B2B dashboard, activate first revenue streams (sponsorships, premium memberships, branded activations). Begin generating revenue WITHOUT depending on insurer B2B sales.

**Deliverables**:

| Deliverable | Effort | Notes |
|-------------|--------|-------|
| B2B partner dashboard (Metabase) | L | Embedded in partner portal. Aggregated data only. k-anonymity k>=50. Consent audit trail. |
| Consent Layer 4 (B2B partner sharing) | M | Per-category toggles for insurers, healthcare, brands. Plain-language explanation. |
| Sponsored wellness challenges | M | Template system for B2B partners. Campaign approval workflow. Performance tracking. |
| Premium membership tier | M | Cosmetic benefits (profile themes, badges), priority event registration, exclusive challenges. Via Stripe. |
| Branded event activations | M | Sponsor integration in General Events. ROI tracking for partners. |
| Advanced analytics pipeline | L | TimescaleDB continuous aggregates. PostHog funnels. B2B report generation. |
| Native React Native app (Expo) | L | Deep wearable integration. Push notification reliability. Offline-capable event check-in. |
| Club management tools | M | Self-service for club leaders. Event creation within clubs. Member management. |
| Moderator dashboard + training | M | Mental health crisis protocols. Training materials. Burnout prevention rotation. |
| Peer coaching framework design | M | Not therapy. Training curriculum. Matching system. Boundaries clearly defined. |
| Anchor B2B partner pilot | L | Likely first sponsor/brand (NOT insurer). Prove the model with a consumer brand or telecom (Tigo, Red Bull, Samsung). |
| Content partnerships (3-5 creators) | M | Revenue share model. Branded content for sponsors. |

**Dependencies**: Phase 2 platform live with 1,500+ registered users. Consent Layer 2+ granted by meaningful percentage. B2B data only becomes valuable with audience scale.
**Milestone**: First $1,000/month revenue (any source), 3,000+ app users, 1 active B2B partner, premium membership with 2%+ conversion, 15+ events/month, 3+ active clubs.
**Estimated Effort**: **Extra Large** (platform + business development + operations)

**Revenue Model (Phase 3 -- No Insurer Dependency)**:

| Revenue Stream | Target Monthly Revenue | Notes |
|----------------|----------------------|-------|
| Event sponsorships | $500-1,500 | Consumer brands, telecom, gaming companies sponsor General Events. |
| Branded activations/challenges | $300-1,000 | Sponsors pay for branded wellness challenges. |
| Premium memberships | $200-500 | $3-5/mo, target 100-200 members. |
| Content sponsorships | $200-500 | Branded articles/videos from sponsors. |
| Affiliate/merch | $100-300 | Gaming/fitness product affiliates, branded merch. |
| **Total target** | **$1,300-3,800/mo** | Covers infrastructure + part-time team. |

---

### Phase 4: B2B & Scale -- "Prove the Business"
**Duration**: Months 18-30
**Goal**: Activate the insurer/healthcare B2B model (now with proven community and data), expand to Colombia and Mexico, professionalize operations.

**Deliverables**:

| Deliverable | Effort | Notes |
|-------------|--------|-------|
| Insurer B2B pilot (Aseguradora del Sur) | XL | 12-24 month sales cycle. Co-creation model, not commodity sale. |
| Healthcare B2B pilot (Hospital de los Valles) | L | Preventive health outreach partnership. |
| Colombia market entry | XL | Compliance (Ley 1581 de 2012, explicit authorization for health data), local community manager, events in Bogota/Medellin. |
| Mexico market entry | XL | Compliance (LFPDPPP, express written consent), local community manager, events in CDMX/Monterrey. |
| Enterprise API for B2B partners | L | Rate-limited, audited. Enables deep integration with partner systems. |
| Insurance gamification product design | L | Vitality-style program design. NOT launched -- designed and validated. |
| NASEF-style wellness certification concept | M | Curriculum design. Credentialing partner exploration. |
| Multi-country consent architecture | L | Per-country compliance. Cross-border data transfer consent. |
| Regional community managers (2-3 hires) | M | Colombia, Mexico. Local event operations. |
| Data products catalog | M | Standardized B2B offerings with clear pricing and compliance guarantees. |

**Dependencies**: Phase 3 revenue covering operational costs. Proven community engagement metrics. B2B pilot success with non-insurer partners.
**Milestone**: $10,000+/month revenue, 10,000+ registered users across 3 countries, 3+ active B2B partners, first insurer pilot generating revenue, LATAM brand recognition.
**Estimated Effort**: **Extra Large** (multi-market expansion + B2B enterprise sales)

---

## Critical Path

The critical path identifies the sequence of dependent activities where any delay directly delays the entire project.

```
Phase 0: Legal Foundation
   |
   +-- DPO Appointment --------+
   +-- DPIA Draft -------------+---> DPIA Filed with SPDP
   +-- Privacy Policy Draft ---+        |
                                        |
Phase 1: Community Foundation           |
   |                                    |
   +-- Discord Setup                    |
   +-- Social Media Launch              |
   +-- First Meetups (need crisis protocol from Phase 0)
   +-- Community grows to 500 members
   |        |
   |        +-- Founding members seed the platform
   |                    |
Phase 2: Platform MVP   |
   |                    |
   +-- Supabase + NestJS + Next.js setup (needs DPIA filed)
   +-- Consent management UI (BLOCKS all data collection)
   +-- Discord account linking (BLOCKS Discord-to-App conversion)
   +-- User profiles + gamification (needs consent + account linking)
   +-- Event management (needs profiles)
   +-- Wellness challenges (needs gamification)
   +-- Wearable integration (needs consent Layer 2 + app)
   |        |
   |        +-- 1,500+ registered users with consent
   |                    |
Phase 3: Revenue         |
   |                    |
   +-- B2B dashboard (needs aggregated data from 1,500+ consented users)
   +-- Sponsored challenges (needs B2B dashboard + challenge system)
   +-- Premium memberships (needs Stripe + profile system)
   |        |
   |        +-- Revenue covering operations
   |                    |
Phase 4: Scale           |
   |                    |
   +-- Multi-country compliance (needs revenue to fund legal counsel)
   +-- B2B insurer pilot (needs proven B2B model + 5,000+ users)
   +-- Regional expansion (needs local hires funded by revenue)
```

**The single most critical dependency**: Community engagement. If the Discord community does not reach critical mass (500 members, regular event attendance), the entire platform is built for nobody. Community is not a feature; it is the product.

**Second critical dependency**: Consent management. If consent is not properly implemented, no data can be legally collected, which means no gamification beyond basic participation, no wellness tracking, no B2B data product, and no revenue from the data layer.

**Third critical dependency**: Discord-to-App conversion. If users stay in Discord and never migrate to the app, the data platform starves. The bridge mechanisms (QR at events, Discord bot teases, account linking) are not nice-to-haves; they are the bloodline of the business model.

---

## Risk Assessment

| # | Risk | Impact | Probability | Mitigation |
|---|------|--------|-------------|------------|
| 1 | **LOPDP enforcement action** -- SPDP fines the platform for non-compliant data handling. LigaPro fined $259K, FEF fined $195K in Jan 2026. Health data = highest sensitivity category. | **Critical** (fines of 0.1-1% turnover + mandatory data deletion + activity suspension) | **Medium** (actively enforced in Ecuador sports/community orgs) | Appoint DPO before any data collection. Complete DPIA and file with SPDP. Engage Ecuadorian data privacy counsel. Implement consent-first architecture (ADR-004). Annual compliance audit. |
| 2 | **Community fails to form** -- Meetups attract fewer than 10 people. Discord stays below 200 members after 3 months. No organic growth. | **Critical** (no community = no product = no business) | **Medium** (new concept in Ecuador, depends on execution quality) | Start with influencer partnerships to seed initial attendance. Focus on 2 cities only (Quito + Guayaquil). Run first 3 meetups at zero cost in public parks. Invest in TikTok content for discovery. If first 3 meetups fail, pivot event format before building tech. |
| 3 | **Discord-to-App conversion below 15%** -- Users love Discord but never download the app or register on the web platform. Data platform has insufficient users for B2B value. | **High** (data platform and revenue model collapse) | **High** (Discord is sticky; users resist platform switches) | Design the app to offer value Discord cannot (XP, challenges, wearable tracking, badges). QR check-in at events forces first app interaction. Never gate Discord community behind app registration. Progressive value delivery: consent comes AFTER first XP award. |
| 4 | **Insurer B2B revenue never materializes** -- 12-24 month sales cycles. Every startup that bet on insurer revenue has failed (Akili, Pear Therapeutics). | **High** (B2B data monetization was the projected revenue engine) | **High** (industry pattern of failure) | Design revenue model to work WITHOUT insurer revenue. Phase 3 revenue targets are achievable through sponsorships, premium memberships, and consumer brand activations alone. Insurer B2B is Phase 4 upside, not foundation. |
| 5 | **Mental health crisis in community** -- A member expresses suicidal ideation in Discord or at an event. Inadequate response causes harm and liability. | **Critical** (human safety + legal liability + reputational destruction) | **High** (37% of competitive gamers show depression/anxiety) | Crisis protocol from day one (Phase 0 deliverable). Licensed mental health partner in Ecuador. Moderator training on crisis detection and referral (not intervention). Visible crisis resources on all platform surfaces. Mandatory moderator rotation to prevent burnout. |
| 6 | **Re-identification of "anonymized" data** -- Small population (Ecuador gamers in specific segments) makes true anonymization near-impossible. A B2B partner or researcher re-identifies individuals. | **Critical** (LOPDP liability + reputational damage + user trust destruction) | **Medium** (technically probable in small cohorts) | Enforce k-anonymity k>=50 for all B2B queries (ADR-007). No raw data in B2B endpoints. Differential privacy noise for narrow segments. Legal review of all data products before partner access. When a segment has fewer than 50 users, data is withheld entirely. |
| 7 | **Founder/team burnout** -- Bootstrapped project with one founder trying to be community manager, event organizer, developer, content creator, and business developer simultaneously. | **High** (project abandonment) | **High** (bootstrapped projects with broad scope have highest burnout rate) | Ruthlessly prioritize. Phase 1 uses zero-code tools -- founder focuses on community, not coding. Recruit volunteer community leaders early (Club Captains). Defer all engineering to Phase 2 when community is proven. Consider a technical co-founder before Phase 2. |
| 8 | **Discord TOS violation** -- Bot or integration inadvertently collects or monetizes Discord user data, leading to bot ban and community disruption. | **High** (loss of community hub) | **Low** (if ADR-001 architectural separation is followed) | Strict architectural separation (Discord bot is read-only bridge). Code review checklist includes Discord data boundary verification. Bot does NOT use MessageContent intent. Account linking stores only discord_id. Regular TOS compliance review. |
| 9 | **Wearable adoption below 10%** -- Target audience (mobile gamers, often on budget phones) does not own wearables. Wellness data layer remains thin. | **Medium** (reduces B2B data value, limits challenge types) | **High** (wearable penetration in Ecuador is low) | Manual entry as first-class citizen for all challenges. Phone step counter (built into most smartphones) as baseline. Challenges designed to work WITHOUT wearables. Partner with Tigo for subsidized fitness trackers as growth lever. Wearable data is enrichment, not requirement. |
| 10 | **Budget overrun during Phase 2 development** -- Engineering takes longer than planned. Infrastructure costs exceed $260/mo. Founder runs out of runway. | **High** (project stalls mid-build) | **Medium** (common for bootstrapped projects with complex tech requirements) | MVP scope ruthlessly limited. PWA before native app. No wearable integration in initial MVP -- add in Phase 2.5. Use Supabase free tier until Pro is needed. Deploy on Railway starter tier. Track burn rate weekly. If cost exceeds budget, defer features, not compliance. |

---

## Team Requirements

### Phase 0-1 (Months 0-4): Community Building -- 1-2 people

| Role | When | Commitment | Responsibility | Profile |
|------|------|------------|----------------|---------|
| **Founder / Community Lead** | Phase 0 Day 1 | Full-time | Community strategy, event organization, content creation, social media, Discord management, influencer relationships, brand partnerships, legal coordination. THE critical path person. | Must be a gamer who understands wellness. Must be in Ecuador (Quito or Guayaquil). Must speak Spanish natively and English fluently. |
| **DPO (outsourced)** | Phase 0 Month 1 | Part-time (5-10 hrs/mo) | LOPDP compliance, DPIA authoring, consent architecture review, regulatory liaison. | Ecuadorian data privacy specialist or law firm. Can be outsourced to a compliance consultancy. |
| **Mental Health Partner (contracted)** | Phase 0 Month 1 | Advisory (2-4 hrs/mo) | Crisis protocol design, moderator training, quarterly protocol review. | Licensed psychologist or psychiatrist in Ecuador with experience in digital/community mental health. |

### Phase 2 (Months 4-10): Platform Build -- 2-4 people

| Role | When | Commitment | Responsibility | Profile |
|------|------|------------|----------------|---------|
| **Full-Stack Developer** | Phase 2 Month 4 | Full-time | NestJS API, Next.js web app, Supabase setup, Discord bot, consent management. THE critical technical hire. | TypeScript, React, Node.js, PostgreSQL experience. Ideally in Ecuador (timezone alignment). Can be remote LATAM. |
| **Mobile Developer** | Phase 2 Month 6 | Full-time or contract | React Native (Expo) app, wearable integration (HealthKit, Health Connect, Open Wearables). | React Native experience with native module integration. Health data API experience is a strong plus. |
| **Founder / Community Lead** | Continues | Full-time | Community operations, events, content, B2B outreach. Now also product owner for the platform. | Same person from Phase 1. |
| **UI/UX Designer** | Phase 2 Month 4 | Contract (initial design) then part-time | Design system, consent flows, gamification UI, mobile app design. Gaming aesthetic expertise critical. | Portfolio showing dark-themed, gaming-adjacent UI. Understanding of LATAM mobile-first design constraints. |

### Phase 3 (Months 10-18): Revenue + Growth -- 4-6 people

| Role | When | Commitment | Responsibility | Profile |
|------|------|------------|----------------|---------|
| **Business Development / Partnerships** | Phase 3 Month 10 | Full-time or part-time | B2B partner acquisition, sponsorship sales, brand relationships. Revenue responsibility. | Sales experience in Ecuador. Connections to brands, agencies, or corporate innovation teams. |
| **Content Creator / Community Manager** | Phase 3 Month 10 | Full-time | Social media, YouTube, content production, Discord moderation coordination. Frees founder for strategy. | Bilingual gamer. Content creation skills (video editing, copywriting). |
| **DevOps / Backend (contract)** | Phase 3 as needed | Contract | Infrastructure scaling, self-hosted service maintenance (PostHog, Metabase, Open Wearables), monitoring. | Docker, Railway/Render, PostgreSQL administration. |

### Phase 4 (Months 18-30): Scale -- 8-12 people

| Role | When | Commitment | Responsibility | Profile |
|------|------|------------|----------------|---------|
| **Regional Community Managers** (2-3) | Phase 4 | Full-time | Local community building and event operations in Colombia, Mexico, Peru. | Local gamers with community organizing experience. |
| **Data Analyst** | Phase 4 | Full-time | B2B data products, analytics pipeline, partner reporting, anonymization QA. | SQL, Python, data privacy awareness. |
| **Legal / Compliance (expanded)** | Phase 4 | Part-time or contract | Multi-country compliance (Colombia Ley 1581, Mexico LFPDPPP, Peru neurodata). | LATAM data protection expertise. |

---

## Milestones & Timeline

| Milestone | Phase | Target Date | Success Criteria |
|-----------|-------|-------------|-----------------|
| **M0: Legal Foundation Complete** | 0 | Month 2 | DPO appointed. DPIA submitted to SPDP. Privacy policy and ToS published. Crisis protocol documented and reviewed. Legal entity formed. |
| **M1: Community Launch** | 1 | Month 2 | Discord server live with full channel structure. Social media accounts active on TikTok, Instagram, YouTube. Landing page live. |
| **M2: First Events Executed** | 1 | Month 3 | 3+ meetups completed in Quito/Guayaquil. Average attendance 15+. Post-event feedback collected. |
| **M3: Community Critical Mass** | 1 | Month 4 | 500 Discord members. Monthly engagement rate >30%. First General Event completed with 50+ attendees. At least 2 venue partnerships confirmed. |
| **M4: Platform Alpha** | 2 | Month 6 | Web app live with: user registration, Discord OAuth linking, basic profiles, event listing. Consent management UI functional. Internal testing only. |
| **M5: Platform Beta** | 2 | Month 8 | App open to founding members (first 100). XP/gamification live. Event check-in via QR. First wellness challenge launched. Consent Layers 0-2 functional. |
| **M6: Platform GA (General Availability)** | 2 | Month 10 | 1,500+ registered users. 40%+ Discord-to-App conversion. Wearable integration live. 8+ events/month on platform. 200+ challenge participants. |
| **M7: First Revenue** | 3 | Month 12 | First paid sponsorship or B2B activation. Premium membership launched. Target: $500+/month combined revenue from any source. |
| **M8: Sustainable Operations** | 3 | Month 15 | Revenue covers infrastructure costs ($260/mo) plus part-time help. 3,000+ registered users. 3+ active clubs. NPS > 8.5 at events. |
| **M9: B2B Model Validated** | 3 | Month 18 | 1+ active B2B partner on dashboard. Sponsored challenge completed with measurable ROI for partner. Revenue > $3,000/month. |
| **M10: LATAM Expansion Start** | 4 | Month 20 | First events in Colombia or Mexico. Multi-country compliance framework in place. Regional community manager hired. |
| **M11: Business Viability** | 4 | Month 24 | 10,000+ registered users. Revenue > $10,000/month. 3+ countries active. 3+ B2B partners. Insurer pilot in progress. |

---

## Recommendations

### 1. Community Before Code -- This Is Not a Software Project (Yet)

The single biggest risk is building a platform nobody uses. Phase 1 must prove that gamers in Ecuador will show up to wellness-themed events and engage in a Discord community. Use zero-code tools (Google Forms, Canva, Luma, WhatsApp Business) for everything in Phase 1. If the first 6 meetups do not attract at least 15 people each, the problem is not technology -- it is product-market fit, event design, or marketing. Fix that before writing a line of code.

### 2. Hire a Data Privacy Attorney Before a Developer

The DPO appointment and DPIA filing are legal mandates, not optional compliance theater. The SPDP fined LigaPro $259K and FEF $195K in January 2026 -- organizations in adjacent domains to this project. An Ecuadorian data privacy attorney should be the first professional engagement, before any developer or designer.

### 3. Revenue Must Work Without Insurers

Every company that built a business model dependent on insurer B2B revenue has failed catastrophically (Akili: $1B to $34M; Pear Therapeutics: $1.6B to bankruptcy to $6M acquisition). The revenue model for Phases 1-3 must be entirely funded by: event sponsorships from consumer brands (Red Bull, HyperX, Samsung), premium memberships ($3-5/mo), content partnerships, and branded activations. Insurer revenue is Phase 4 upside -- the plan must survive without it indefinitely.

### 4. Discord Is Community Only -- Enforce the Firewall Architecturally

Discord's Developer Policy prohibits monetizing data collected through its platform. This is not a suggestion -- it is a TOS that, if violated, results in bot ban and potential community disruption. The architectural decision (ADR-001) to make Discord a read-only bridge is correct and must be enforced through code review checklists, not just documentation. The Discord bot should never have write access to the Supabase health/behavioral data tables.

### 5. PWA Before Native App -- Save $15,000+ in Initial Development

A Progressive Web App (Next.js, installable to home screen) covers 80% of the app experience without App Store/Play Store submission, review processes, or native module complexity. Reserve the native React Native app (Phase 3) for when wearable integration demands it. This saves months of development time and avoids the double-platform maintenance burden during the critical early phases.

### 6. Find a Technical Co-Founder, Not Just a Developer

Phase 2 requires building a consent-first data platform with health data compliance, gamification, wearable integration, and a B2B analytics layer -- all on a $260/mo budget. This is not a contractor engagement. This requires someone with deep technical ownership who is invested in the mission. The ideal Phase 2 hire is a technical co-founder or founding engineer who is also a gamer and cares about the mission. Equity compensation may be necessary given the bootstrapped budget.

### 7. Outsource: Legal, Design, Mental Health. Build In-House: Community, Code, Content

| Outsource | In-House | Rationale |
|-----------|----------|-----------|
| Data privacy attorney | Community management | Community is the core product -- cannot be outsourced. |
| DPO (initial, part-time) | Full-stack development | Platform is the competitive moat -- needs ownership. |
| UI/UX design (initial contract) | Content creation / social media | Authenticity requires someone who lives the culture. |
| Mental health partner | Event organization | Local knowledge and relationships are essential. |
| Accounting / tax | Business development | B2B relationships are founder-driven. |

### 8. Define the "Kill Criteria" for Each Phase

Bootstrapped projects must be honest about when to stop. Define clear kill criteria:

- **Phase 1 Kill Criteria**: If after 3 months, fewer than 200 Discord members and fewer than 10 average event attendance -- the community thesis is not validated. Pivot event format or target audience before proceeding.
- **Phase 2 Kill Criteria**: If after 6 months of platform being live, Discord-to-App conversion is below 10% -- the bridge is broken. Redesign the value proposition before investing in B2B features.
- **Phase 3 Kill Criteria**: If after 12 months, total revenue is below $500/month -- the monetization model needs fundamental rethinking. Consider pivoting to a pure community/content model (like HealthyGamer.gg) without the B2B data layer.

### 9. Naming Decision Must Be Made in Phase 0

The naming is still unresolved (GamerAlliance rejected, alternatives under evaluation). The name must be finalized before social media launch, domain registration, and Discord server branding. This is a Phase 0 deliverable that blocks Phase 1. Recommendation: choose a name that works in both Spanish and English, is available as a .gg or .ec domain, and does not contain "gamer" (too generic) or health-specific terms (too clinical). From the evaluated options, names ending in "GG" (gaming's universal "good game") have the strongest cultural resonance.

### 10. Start the Insurer Conversation Now, But Do Not Depend On It

The contact with Aseguradora del Sur should be initiated in Phase 1 as a relationship-building exercise, not a sales pitch. Frame it as: "We are building the first gaming+wellness community in Ecuador. We think this is relevant to your customer acquisition and preventive health goals. We would love your input as we design the data products." This 18-month warm-up means that by Phase 4, the relationship is mature enough for a pilot. But the business plan must never depend on this conversion.

---

## Effort Summary

| Phase | Duration | Dev Effort (person-months) | Non-Dev Effort (person-months) | Infrastructure Cost |
|-------|----------|---------------------------|-------------------------------|-------------------|
| Phase 0 | Months 0-2 | 0 | 2-3 (legal, compliance, admin) | $0 (legal fees: $1,000-3,000 one-time) |
| Phase 1 | Months 1-4 | 0.5 (landing page, basic bot) | 4-6 (community, events, content) | $10-30/mo (domain, hosting) |
| Phase 2 | Months 4-10 | 8-12 (full-stack + mobile) | 6-8 (community, events, testing) | $100-185/mo (Supabase + Railway + Vercel) |
| Phase 3 | Months 10-18 | 6-10 (B2B dashboard, native app, analytics) | 8-12 (BD, content, community ops) | $150-260/mo (scaled infrastructure) |
| Phase 4 | Months 18-30 | 8-12 (multi-country, enterprise API) | 12-18 (regional expansion, sales) | $260-500/mo (multi-region) |

**Total estimated timeline to business viability (M11)**: 24 months from project start.

---

## Open Questions Requiring Human Decision

1. **Legal entity structure**: What type of Ecuadorian entity is being formed? SAS, Sociedad Anonima, or other? This affects tax treatment of B2B revenue and data processing obligations.
2. **Founder's full-time availability**: Is the founder working on this full-time from Month 0, or transitioning from another role? Timeline depends critically on this.
3. **Technical co-founder**: Is there a technical co-founder candidate, or must one be recruited? This is the Phase 2 bottleneck.
4. **Naming decision**: When will the name be finalized? This blocks domain registration, social media handles, and brand design.
5. **Initial capital available**: What cash reserves exist beyond the $100-260/mo infrastructure budget? Phase 0 legal costs ($1,000-3,000) and Phase 1 event costs ($500-1,000 for first 6 events) require upfront capital.
6. **Aseguradora del Sur relationship status**: Has initial contact been made? What is the current state of this relationship?
7. **Minimum viable team**: Can the founder realistically handle Phase 1 alone (community + events + content + social media + legal coordination), or is a co-founder or early volunteer essential?
8. **Club formation thresholds**: What constitutes "critical mass" for promoting a meetup to a club? (Recommended: 8+ consistent attendees across 4+ consecutive meetups.)
9. **Age policy**: Will the platform accept users under 18? If yes, parental consent flow (LOPDP requirement for minors) adds complexity to Phase 2. If no, it simplifies consent but excludes a meaningful demographic.
10. **Equity allocation**: If a technical co-founder is brought on, what equity structure is envisioned? This decision should be made before recruitment begins.

---

*This project plan is based on the intake document, market research, knowledge brief, business analysis, product/UX design, and architecture specification as of April 2026. All timeline estimates assume a dedicated founder with full-time availability starting Month 0 and a full-stack developer joining at Month 4. Estimates are ranges, not commitments -- bootstrapped projects have inherently higher variance than funded ones. The plan should be reviewed and updated monthly as real-world execution data replaces assumptions.*
