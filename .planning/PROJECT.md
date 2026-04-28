# Gamer Wellness

## What This Is

The first community in LATAM where gaming is the meeting point to level up in physical, mental, and social health. Three-layer product: Media (content), Social Hub (Discord + IRL events), Audience Activator (B2B data). Launches in Ecuador (Quito/Guayaquil/Cuenca), scales LATAM (372M gamers). Tagline: "Gamers que se mueven, se cuidan y se encuentran."

## Core Value

Gamers in Ecuador find a real community that combines what they love (games) with what they need (movement, mental health, IRL connection) — without feeling surveilled, monetized, or moralized at. **If the community does not form, nothing else matters.**

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Phase 0 — Legal Foundation (Mo 0-2)**
- [ ] DPO appointed (LOPDP mandate for health data processors)
- [ ] DPIA drafted and filed with SPDP before any data collection
- [ ] LOPDP-compliant Privacy Policy + Terms of Service published (ES/EN)
- [ ] Crisis intervention protocol documented + licensed mental health partner secured
- [ ] Community guidelines + Code of Conduct published
- [ ] Legal entity formed in Ecuador
- [ ] Project naming finalized (8 candidates pending)

**Phase 1 — Community Foundation (Mo 1-4)**
- [ ] Discord server with full IA structure live
- [ ] Social media presence active (TikTok, Instagram, YouTube) bilingual ES/EN
- [ ] Mobile-optimized landing page with event listing
- [ ] 6 themed meetups executed (3 Quito, 3 Guayaquil)
- [ ] First General Event executed (50+ attendees target)
- [ ] WhatsApp Business broadcast for event reminders
- [ ] 3-5 volunteer moderators recruited and trained
- [ ] 2-3 venue partnerships confirmed (Kubox, parks)
- [ ] 500 Discord members, 30%+ DAU/MAU, 15+ avg meetup attendance

**Phase 2 — Platform MVP (Mo 4-10)**
- [ ] Vue 3 PWA (Vite + Firebase Hosting)
- [ ] Firebase backend (Cloud Functions, Firestore, Auth, Storage)
- [ ] Discord OAuth account linking (1-Click)
- [ ] Custom Discord bot (discord.js v14) — read-only bridge, zero data collection
- [ ] Granular consent management UI (10 categories, individually revocable, audit-logged)
- [ ] User profiles with XP, badges, levels, streaks
- [ ] Event management (3 tiers: Meetups, General Events, Club Sessions) with QR check-in
- [ ] Wellness challenges (Bronce/Plata/Oro tiers, manual + wearable entry)
- [ ] Community leaderboards (opt-in)
- [ ] Wearable integration (Apple HealthKit, Health Connect, Open Wearables)
- [ ] Content hub (articles + embedded video, SEO-optimized)
- [ ] PostHog (self-hosted) + Firebase Analytics
- [ ] DPIA updated and re-filed with SPDP

**Phase 3 — Revenue + Data (Mo 10-18)**
- [ ] B2B partner dashboard (Metabase via BigQuery export, k>=50 enforced)
- [ ] Premium membership tier (Stripe, $3-5/mo)
- [ ] Sponsored wellness challenges with campaign approval workflow
- [ ] Branded event activations
- [ ] Club management tools (self-service for club leaders)
- [ ] Moderator dashboard + training (mental health crisis protocols)
- [ ] Peer coaching framework (non-clinical, training curriculum, matching)
- [ ] Anchor B2B pilot (consumer brand or telecom — NOT insurer)
- [ ] First $1,000+/month revenue achieved

**Phase 4 — B2B + Scale (Mo 18-30)**
- [ ] Insurer pilot (Aseguradora del Sur — co-creation, not commodity)
- [ ] Colombia market entry (Ley 1581 compliance, local CM)
- [ ] Mexico market entry (LFPDPPP compliance, local CM)
- [ ] Enterprise API for B2B partners (rate-limited, audited)
- [ ] Multi-country consent architecture
- [ ] NASEF-style wellness certification concept
- [ ] $10,000+/month revenue, 10,000+ users, 3+ countries

### Out of Scope

- **Clinical therapy or diagnosis** — Platform is non-clinical peer support; all crisis cases route to licensed partners
- **VR fitness hardware** — Out of scope for software platform; may integrate via Open Wearables later
- **Standalone game development** — Project is community + wellness, not a game studio
- **Insurer B2B as primary revenue** — Demoted from intake's original positioning to Phase 4 upside; every health-tech startup that bet on this failed (Akili $1B→$34M, Pear $1.6B→bankruptcy)
- **Data collection inside Discord** — Discord TOS prohibits monetization of API data; all health/behavioral data lives on owned platform only
- **React Native / Supabase / NestJS stack** — Earlier expert docs proposed this; canonical decision is Vue 3 + Firebase per project-definition.md §5

## Context

**Source materials.** This project enters GSD with extensive pre-existing research in `StartData/`: a 7-stage pipeline produced 6 expert analyses (business, research, product/UX, architect, security/compliance, PM), a unified `project-definition.md`, and 4 operational skills (community-ops, content-engine, trust-safety, challenge-framework). Read those files for any deeper context the planning agents need.

**Market.** LATAM = 372.3M active gamers (2025), $25.7-26.1B market. Ecuador specifically: $168.3M gaming market, 83.7% internet penetration, 67% adult overweight/obesity, 37% of competitive players showing depression/anxiety symptoms. Confirmed white space: zero gaming+wellness organizations in all of LATAM.

**Reference models.** HealthyGamer.gg (~164 employees, 6M YouTube subs, $5M revenue, zero VC) is the validated bootstrapped community-funded model. Nerd Fitness proves identity-first content + SEO drives organic growth at zero ad spend. Discovery Vitality is the insurer-gamification gold standard but has no gaming focus (validates demand, but their Vitality AI + Google Cloud partnership raises the analytics bar).

**Regional dynamics.** Riot's LTA failure (Sept 2025) proved imported globalized formats fail in LATAM. Locally rooted Spanish-first brands have a structural advantage. Ecuador-launched, "tú" universal LATAM tone, gaming terms in English (XP, GG, buff, clutch).

**Operational architecture.** 4 operational skills already drafted in `.claude/skills/` (community-ops, content-engine, trust-safety, challenge-framework). These were refactored from an original 10-agent design to reduce coordination overhead and redundancy with the 6 generic GSD planning agents.

## Constraints

- **Tech stack (locked)**: Vue 3 (Composition API + Vite) + Firebase (Functions, Firestore, Auth, Storage, Hosting) — Decision documented in `StartData/output/project-definition.md` §5; do NOT propose React/NestJS/Supabase even though older expert docs reference them
- **Compliance (LOPDP)**: Health data is "sensitive" under Ecuador's LOPDP — DPO + DPIA mandatory before any health data collection; SPDP fined LigaPro $259K and FEF $195K in Jan 2026; penalties 0.1-1% of turnover + activity suspension
- **Discord TOS**: Discord Developer Policy prohibits disclosing API Data to data brokers/advertising/monetization services — Discord bot must be read-only bridge, zero data collection there
- **Budget**: Bootstrapped — MVP infra target $25-100/mo (Firebase Spark→Blaze); avoid VC; total Phase 0 legal $1-3K + Phase 1 events $500-1K
- **Anonymization**: k-anonymity k>=50 enforced on all B2B exports; small Ecuador gamer population makes true anonymization technically near-impossible — treat all behavioral/health data as personal data
- **Language**: Spanish-first (LATAM "tú"), English toggle; gaming terms (XP, GG, buff, nerf, clutch, AFK) stay in English universally; consent texts must be legally equivalent across languages
- **Community before code**: Phase 1 uses zero-code tools only (Discord, Canva, Luma, WhatsApp) — kill criterion: if first 3 meetups don't reach 15+ attendees, fix product-market fit before building anything
- **Revenue without insurers**: Phases 1-3 must reach sustainability through sponsorships/events/memberships/coaching; insurer B2B is Phase 4 upside, never the foundation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vue 3 + Firebase stack (not React/NestJS/Supabase) | User memory + project-definition.md §5; faster MVP; Firebase Security Rules sufficient for consent enforcement; serverless = no infra ops | — Pending |
| Discord = community only (architectural firewall) | Discord TOS forbids monetizing API data; LOPDP demands separation; ADR-001 in expert-architect.md | — Pending |
| Insurer B2B demoted to Phase 4 (not core revenue) | Every health-tech startup that bet on insurer revenue failed (Akili, Pear); 12-24mo sales cycles incompatible with bootstrap | — Pending |
| Operational layer = 4 skills, not 10 agents | Original 10-agent design overlapped with GSD's 6 generic agents and forced coordination on naturally-integrated tasks | — Pending |
| Bootstrap, no VC | HealthyGamer.gg proved community-funded model works; gaming startup VC declining since 2021; $260/mo infra is achievable | — Pending |
| k-anonymity k≥50 on all B2B exports | Small Ecuador population makes anonymization re-identifiable below this threshold; ADR-007 | — Pending |
| Coarse roadmap granularity (5 phases) | Existing project-definition.md already maps to 5 phases; matches GSD coarse setting | ✓ Set in config.json |
| YOLO mode + Yes/Yes/Yes workflow agents | Comprehensive context already exists in StartData; want plan-check + verifier as quality gates without manual approval | ✓ Set in config.json |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after initialization (auto mode from `StartData/output/project-definition.md`)*
