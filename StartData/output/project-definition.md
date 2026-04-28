# Project Definition: Gamer Wellness

## 1. Project Brief

**Vision**: The first community in LATAM where gaming is the meeting point to level up in physical, mental, and social health. "Gamers que se mueven, se cuidan y se encuentran." Launch in Ecuador, scale to LATAM (372M gamers), operate as three layers: Media, Social Hub, and Audience Activator.

**Problem**: Three unaddressed health crises among adult gamers in LATAM: (1) 67% of Ecuadorian adults are overweight/obese, gamers sit 12+ hrs/day; (2) 37% of competitive players show depression/anxiety; (3) digital connectivity masks physical social isolation.

**Scope**:
- **In Scope**: Community platform (Discord + owned web/app), physical events, wellness gamification, content, B2B data dashboards, LOPDP compliance, LATAM expansion
- **Out of Scope**: Clinical therapy/diagnosis, VR fitness hardware, standalone game development
- **Project Type**: Software + community platform | **Scale**: Full

### Key Findings

1. **Confirmed white space** -- Zero gaming+wellness organizations exist in all of LATAM despite 372M active gamers and $25.7B in annual revenue. HealthyGamer.gg (6M YT subs, $5M rev) validated the model but has no LATAM plans.
2. **B2B data-first revenue is an existential risk** -- Every startup that bet on insurer B2B health data failed catastrophically (Akili: $1B to $34M; Pear Therapeutics: $1.6B to bankruptcy). Insurer sales cycles run 12-24+ months.
3. **Ecuador's data regulator is actively enforcing** -- SPDP fined LigaPro $259K and FEF $195K in January 2026 for data violations. Health data is "sensitive" under LOPDP requiring DPO, DPIA, and granular consent before any collection.
4. **Discord TOS prohibits data monetization** -- All data collection must happen on a separate owned platform. Discord is community-only. Architectural separation is mandatory.
5. **Regional identity wins in LATAM** -- Riot's LTA failure (Sept 2025) proved imported/globalized formats fail. Locally rooted, Spanish-first brands have a structural advantage.

### Top Recommendations

1. **Community before code** -- Prove demand with Discord + free events before building the platform. If meetups don't attract 15+ people, no software fixes that.
2. **Restructure revenue** -- Sponsorships, events, content, coaching, and memberships first. Insurer B2B is Phase 4 upside, not core revenue.
3. **Hire a DPO before a developer** -- LOPDP compliance is a legal mandate. DPIA must be filed before any health data collection.
4. **Bootstrap, do not seek VC** -- HealthyGamer.gg proved community-funded bootstrapping works. Tech stack runs at $76-185/mo.
5. **Build consent as a first-class product feature** -- Multi-layered, individually toggleable, auditable consent with gaming-friendly UX.

---

## 2. Business Model

| Layer | Function | Revenue Source | Phase |
|-------|----------|----------------|-------|
| Media | Content (YouTube, TikTok, web articles, podcast) | Content sponsorships, YouTube/AdSense, affiliate | 1-2 |
| Social Hub | Discord + physical events + clubs | Event sponsorships, branded activations, ticket/entry | 1-3 |
| Audience Activator | B2B dashboards, audience data | Sponsored challenges, premium memberships, B2B data access | 3-4 |

**Core principle**: Gamers never pay for community participation. Revenue comes from brands, sponsors, premium services, and eventually B2B data.

**Revised from intake**: The original model positioned insurer B2B data sales as the primary revenue engine. Per expert consensus, this has been demoted to Phase 4 upside. The model must be self-sustaining on community-driven revenue (events, content, sponsorships, memberships) before any B2B data monetization is activated.

---

## 3. Revenue Strategy

| Phase | Timeline | Revenue Streams | Monthly Target |
|-------|----------|-----------------|----------------|
| 0-1 | Mo 0-4 | None (pre-revenue; community validation) | $0 |
| 2 | Mo 4-10 | Content monetization (YouTube/TikTok), small sponsorships | $0-500 |
| 3 | Mo 10-18 | Event sponsorships, branded activations, premium memberships ($3-5/mo), content partnerships | $1,300-3,800 |
| 4 | Mo 18-30 | All Phase 3 + B2B insurer/healthcare pilot, corporate wellness, certification | $10,000+ |

**Kill criteria**: If Phase 3 revenue < $500/mo after 12 months, pivot to pure community/content model (HealthyGamer.gg style) without B2B data layer.

---

## 4. Top Use Cases

**UC-1: Gamer Onboarding (Discord to App)**. A gamer discovers the community via TikTok, joins Discord, attends a themed meetup (Caminata Dota), scans a QR code at the event, and creates an app profile via Discord OAuth. Consent is presented after the first value moment (XP credit). The entire flow bridges physical events to digital engagement in under 90 seconds of app interaction.

**UC-2: Event Attendance and Check-In**. Events operate in three tiers (Meetups, General Events, Club Sessions). Organizers publish via Discord bot + web platform. Attendees check in via QR, receive XP, get post-event surveys. Offline fallback exists for poor-connectivity venues. Target: 70%+ RSVP attendance, 50%+ digital check-in.

**UC-3: Wellness Challenge Participation**. Time-limited challenges (e.g., "Walk 30,000 steps in 7 days") tracked via wearables or manual entry. Three difficulty tiers (Bronce/Plata/Oro) prevent casual users from being discouraged. Leaderboards are opt-in. Gaming-themed progress narratives replace generic fitness messaging. Target: 40%+ completion rate.

**UC-4: Consent-Driven Wellness Data Collection**. Separate from basic account consent, users opt into health surveys and wearable data via individually toggleable categories. Data is visualized as a gaming "character sheet" (HP, Stamina, Mental, Social). Each data point is tagged with the consent that authorized it. Revocation triggers immediate processing cessation.

**UC-5: B2B Partner Dashboard**. Partners access a Metabase-powered portal showing aggregated, k-anonymized (k>=50) audience segments. They can filter by demographics, game cluster, engagement tier, and wellness interest. Campaign activation (sponsored challenges, branded events) requires editorial approval. Zero individual-level data is ever exposed.

---

## 5. Architecture Summary

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Web/PWA | Vue 3 (Composition API) + Vite | Reactive, lightweight, excellent DX; PWA for mobile-first |
| Backend | Firebase Cloud Functions (Node.js) | Serverless, auto-scaling, zero infra management; TypeScript |
| Database | Firestore | Real-time sync, offline support, Firestore Security Rules for consent enforcement |
| Auth | Firebase Auth | Discord OAuth provider, email/password, phone; built-in session management |
| Storage | Firebase Storage | Event photos, profile images, export files |
| Hosting | Firebase Hosting | CDN-backed, SSL, preview channels for staging |
| Wearables | Open Wearables (MIT) | 200+ devices; Cloud Function webhook receiver; $0 per-user cost |
| Gamification | Custom Cloud Functions | XP/achievement logic in Functions triggered by Firestore writes |
| Analytics | Firebase Analytics + PostHog | Firebase for funnels/events; PostHog for product analytics |
| B2B Dashboards | Metabase (open source) | Connects to Firestore via BigQuery export; embeddable |
| Community | Discord (discord.js v14) | 259M MAU; dominant in gaming; zero data collection here |
| Payments | Stripe | Premium memberships; Firebase Extensions for Stripe integration |

**MVP Cost**: Firebase Spark (free) → Blaze (pay-as-you-go) ~$25-100/month at MVP scale

### System Diagram

```
DISCORD (community only)              OWNED PLATFORM (Vue 3 + Firebase)
+-- Chat/voice channels               +-- Vue 3 PWA (Vite, Firebase Hosting)
+-- Event announcements                +-- Firebase Cloud Functions (API)
+-- Bot: info only                     +-- Firestore (DB + Security Rules)
|                                      +-- Firebase Auth (Discord OAuth)
|   --- Discord OAuth Link --->        +-- Firebase Storage (media)
|       (identity bridge ONLY)         +-- Cloud Functions (gamification)
|                                      +-- PostHog (analytics)
                                       +-- Metabase (B2B via BigQuery)
                                       +-- Open Wearables (health data)
                                       +-- Consent Engine (Cloud Functions)
```

---

## 6. Security & Compliance Summary

**Must-do before launch:**

- [ ] Appoint DPO with Ecuador data law expertise (LOPDP mandate)
- [ ] Complete and file DPIA with SPDP before any health data collection
- [ ] Register all processing activities with SPDP
- [ ] Publish LOPDP-compliant Privacy Policy + Terms of Service (ES/EN)
- [ ] Implement granular consent engine with 10 independent categories, each individually revocable
- [ ] Deploy immutable consent audit log (append-only, timestamped, versioned)
- [ ] Enforce Row-Level Security on ALL tables with personal/health data
- [ ] Encrypt health data: AES-256 at rest, TLS 1.3 in transit, field-level encryption on health columns
- [ ] Establish architectural firewall: Discord bot collects ZERO data; all health/behavioral data lives on owned platform only
- [ ] Implement breach notification playbook (SPDP within 72h, users without delay)
- [ ] Build data subject rights portal (access, rectification, erasure, portability) with 15-day SLA
- [ ] Define minors policy: parental consent flow if accepting users under 18
- [ ] Enforce k-anonymity (k>=50) on all B2B data exports
- [ ] Establish crisis data separation: mental health crisis data never enters analytics/B2B pipeline
- [ ] Conduct penetration test before launch; annually thereafter

---

## 7. Roadmap

| Phase | Name | Duration | Key Deliverables | Effort | Milestone |
|-------|------|----------|-----------------|--------|-----------|
| 0 | Legal Foundation | Mo 0-2 | DPO, DPIA, privacy policy, crisis protocol, entity formation, community guidelines | S (dev) / M (legal) | DPIA filed, DPO appointed, legal entity formed |
| 1 | Community Foundation | Mo 1-4 | Discord server, social media (TikTok/IG/YT), 6 meetups, first General Event, landing page, 5 volunteer mods | 0.5 PM (dev) / 4-6 PM (ops) | 500 Discord members, 30% DAU/MAU, 15+ avg event attendance |
| 2 | Platform MVP | Mo 4-10 | Supabase + NestJS + Next.js PWA, Discord bot, consent UI, user profiles/XP, event management, wellness challenges, wearable integration, PostHog | 8-12 PM (dev) / 6-8 PM (ops) | 1,500 app users, 40% Discord-to-App conversion, 200+ challenge participants |
| 3 | Revenue + Data | Mo 10-18 | B2B dashboard (Metabase), premium memberships, sponsored challenges, native React Native app, club tools, peer coaching design, anchor B2B pilot | 6-10 PM (dev) / 8-12 PM (ops) | $1,000+/mo revenue, 3,000 users, 1 active B2B partner |
| 4 | B2B + Scale | Mo 18-30 | Insurer pilot, Colombia + Mexico entry, enterprise API, multi-country consent, NASEF-style certification, regional community managers | 8-12 PM (dev) / 12-18 PM (ops) | $10,000+/mo revenue, 10,000 users, 3+ countries, insurer pilot live |

**Critical path**: Community engagement (500 members) --> Consent management --> Discord-to-App conversion --> B2B data value. If community does not form, nothing else matters.

**Total timeline to business viability**: 24 months.

---

## 8. Top 10 Risks

| # | Risk | Impact | Prob. | Mitigation |
|---|------|--------|-------|------------|
| 1 | LOPDP enforcement action (SPDP fines, activity suspension) | Critical | Medium | DPO + DPIA before any data collection; engage privacy counsel; annual audit |
| 2 | Community fails to form (< 200 Discord, < 10 event attendance) | Critical | Medium | Influencer seeding; focus on 2 cities; TikTok discovery; pivot event format before building tech |
| 3 | Discord-to-App conversion below 15% | High | High | App offers value Discord cannot (XP, challenges, wearables); QR at events forces first interaction; progressive value delivery |
| 4 | Insurer B2B revenue never materializes | High | High | Revenue model works WITHOUT insurers through Phase 3; insurer B2B is Phase 4 upside only |
| 5 | Mental health crisis in community | Critical | High | Crisis protocol from day one; licensed mental health partner; moderator training; visible crisis resources on all surfaces |
| 6 | Re-identification of "anonymized" data | Critical | Medium | k-anonymity k>=50; differential privacy noise; withhold data for segments < 50 users; treat all B2B exports as personal data by default |
| 7 | Founder/team burnout | High | High | Phase 1 uses zero-code tools; recruit volunteer leaders early; defer engineering to Phase 2; seek technical co-founder |
| 8 | Discord TOS violation (bot ban, community loss) | High | Low | Strict architectural separation; code review checklist; bot never accesses health data; quarterly TOS compliance review |
| 9 | Wearable adoption below 10% | Medium | High | Manual entry as first-class citizen; phone step counter as baseline; challenges designed to work without wearables |
| 10 | Budget overrun during Phase 2 | High | Medium | MVP scope ruthlessly limited; PWA before native app; Supabase free tier first; track burn rate weekly |

---

## 9. Open Questions

Decisions required from the founder/team before proceeding:

1. **Legal entity type**: SAS, Sociedad Anonima, or other? Affects tax treatment and data processing obligations.
2. **Naming decision**: 8 candidates listed (Vida GG, Respawn EC, etc.). Blocks domain, social handles, brand design. When will this be decided?
3. **Founder's full-time availability**: Full-time from Month 0, or transitioning? Timeline depends on this.
4. **Technical co-founder**: Is there a candidate, or must one be recruited? This is the Phase 2 bottleneck.
5. **Initial capital**: Cash reserves beyond $76-185/mo infrastructure? Phase 0 legal ($1-3K) and Phase 1 events ($500-1K for first 6) require upfront capital.
6. **Aseguradora del Sur relationship status**: MOU? Verbal interest? Letter of intent? Affects Phase 3-4 planning.
7. **Age policy**: 16+ or 18+? Fundamentally changes consent architecture, Discord config, LOPDP requirements.
8. **Minimum viable team**: Can the founder handle Phase 1 alone, or is a co-founder essential?
9. **Equity allocation**: If a technical co-founder is brought on, what structure? Decide before recruitment.
10. **Event economics**: Who funds Phase 1 events before sponsorship revenue? Per-event budget?

---

## 10. Operational Skills (Skill-Centric Architecture)

The operational layer is organized as **4 combined skills** (not granular agents) that live in `projects/gamer-alliance/skills/`. Each skill groups responsibilities by cohesive operational domain rather than by narrow role. The 6 generic agents in `agents/` (business-analyst, architect, product-ux, project-manager, research-analyst, security-compliance) cover the design/analysis pipeline; these skills cover product runtime.

See `projects/gamer-alliance/skills/README.md` for the full migration map.

### Skill 1: Community Ops (`skills/community-ops.md`)
**Domain**: End-to-end member lifecycle and community leadership.
**What it covers**:
- Onboarding funnel (Discord → first event → app → first challenge → retention) with target metrics (30% Discord-to-event in 30 days, 60% event-to-app, 80% consent grant, 50% 30-day retention).
- Three-tier event logistics (Meetups, General Events, Club Sessions) across Guayaquil, Quito and Cuenca with Kubox/parks venues, QR check-in, RSVP, post-event NPS and XP distribution.
- Club Captain coaching: training modules (crisis recognition, de-escalation, harassment response, event organization, community building, self-care), burnout detection signals, rotation and recovery protocols.
**Tools needed**: Discord bot API, push notifications, PostHog (funnel analytics), QR code generator, calendar/scheduling, WhatsApp Business API, weather API, training content library, community health dashboard.

### Skill 2: Content Engine (`skills/content-engine.md`)
**Domain**: Bilingual content creation, organic discovery and regional localization.
**What it covers**:
- Weekly content calendars across TikTok, YouTube, Instagram, blog, Discord using 5 pillars (Movimiento, Mente, Nutrición, Comunidad, Data/Insights), gaming-native voice (XP/GG/buff stay in English, "tú" universal LATAM).
- SEO/SEM and platform-algorithm optimization following the Nerd Fitness model (405K+ backlinks, $0 ad spend); keyword research, link-building outreach, ranking tracking.
- ES/EN translation with gaming glossary, regional adaptation (Ecuador/Colombia/México/Perú variants, currency, crisis lines) and legally precise consent/LOPDP terminology.
**Tools needed**: Claude API, web search, YouTube/TikTok trend APIs, SEO tools (Ahrefs/Semrush), Google Search Console, translation memory + glossary, content CMS, Canva API.

### Skill 3: Trust & Safety (`skills/trust-safety.md`)
**Domain**: Real-time moderation, LOPDP compliance auditing, B2B reporting with k-anonymity.
**What it covers**:
- Discord/app moderation: toxicity, harassment, gender-based abuse, crisis keyword detection (ES/EN), 4-tier escalation (Low → Critical), automatic crisis resource surfacing (Línea 171, Crisis Text Line), moderator workload tracking.
- Monthly LOPDP compliance audit (10-point checklist): consent validity, k≥50 on B2B exports, consent revocations within SLA, data subject requests within 15 days, Discord-bot-zero-data audit, encryption verification, audit log integrity.
- B2B partner dashboards (Metabase) and PDF reports with pre-built segments (Active Movers, Social Connectors, Competitive Core, New Recruits, At Risk), compliance badge on every export, k≥50 hard gate.
**Tools needed**: Discord API (read-only), NLP/sentiment analysis, crisis keyword DB, audit logging, Firestore read access, consent ledger API, k-anonymity validator, Metabase API, PDF generation, DPO notification system.

### Skill 4: Challenge Framework (`skills/challenge-framework.md`)
**Domain**: Gamified wellness challenge design (stand-alone, no fusion).
**What it covers**:
- Five challenge types (Movement, Streak, Social, Mental, Hybrid) with three-tier calibration (Bronce/Plata/Oro) anchored on community baseline data.
- Gaming-native narrative ("Caminaste 4.2km — equivalente a cruzar Summoner's Rift 47 veces"), seasonal battle-pass progression, anti-cheat rules for unrealistic data.
- Anti-patterns enforcement: no fake gamification, no pay-to-win XP, no shaming for non-completion.
**Tools needed**: Community engagement data API, wearable aggregate data, gamification engine, content generation, analytics dashboard.

### Why skills, not agents

The previous design proposed 10 granular agents (one per role). They created two problems: redundancy with the 6 generic pipeline agents (e.g., compliance-watcher vs `agents/security-compliance.md`), and forced coordination overhead for tasks that are naturally integrated (e.g., content creation + SEO optimization + regional translation are sequential steps on every piece). Grouping by operational domain reduces friction and produces a smaller, clearer surface to maintain.
