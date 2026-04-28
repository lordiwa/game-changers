# Project Research Summary

**Project:** Gamer Wellness (working name — 8 candidates pending)
**Domain:** Gaming + wellness community PWA + Discord bridge + B2B aggregated analytics — Ecuador launch, LATAM scale, LOPDP-compliant
**Researched:** 2026-04-27
**Confidence:** HIGH

## Executive Summary

The four research dimensions converge on a single, internally consistent picture: this is a **Vue 3 PWA + Firebase serverless architecture** built around a **two-layer consent enforcement model** (Firestore Security Rules + Cloud Functions middleware), with a **read-only Discord bot deployed on a Compute Engine e2-micro VM** (NOT Cloud Run — Cloud Run cannot reliably hold the Discord Gateway WebSocket), a **time-series wearable pipeline** using monthly-bucketed Firestore subcollections + daily rollup documents, and a **two-tier analytics architecture** (Firestore raw → BigQuery k≥50 generalized views → Metabase) for B2B partners. The 36 functional requirements already in `expert-business-analyst.md` are largely validated against 2026 industry table stakes; feature research surfaced **5 high-priority gaps** (explicit streak entity + bonus rules, native phone pedometer baseline, event waitlist with auto-promote, re-consent on terms change, one-tap report-user UX flow) that should be absorbed into the requirement set before roadmap commits Phase 2.

The dominant risk surface is **Phase 2 architectural** — almost every critical pitfall flagged by the pitfalls dimension (Security Rules as sole consent enforcement, Firestore read-cost overrun via `onSnapshot`, k-anonymity at query-time only, Discord-to-app conversion at the consent step, gamification surface mechanics that gamers see through, wearable-first design ignoring the 85% without devices) is a Phase 2 design decision that compounds 5-10x in remediation cost if discovered after launch. The architecture and pitfalls dimensions agree these must be designed in before the first health-data write, not retrofitted. The legal foundation (Phase 0) was also refined: Ecuador's **SPDP "Comprehensive Personal Data Protection System"** deadline (Dec 31, 2025) has already passed, meaning a documented internal System — broader than just the DPIA — is mandatory from day one of legal entity formation, not a forward-dated deliverable.

The recommended posture is: **lock the architectural decisions in Phase 2 Step 0** (consent middleware, Firestore read-budget discipline, two-tier B2B data flow, manual-entry-first wearable path), **expand Phase 0 legal scope** to the full SPDP System with vendor DPA inventory + clinical partner sign-off on the Ecuador-Spanish crisis lexicon, and **defer Open Wearables OAuth + Capacitor mobile shell to a Phase 2 mid-point research checkpoint** because both carry meaningful uncertainty (Open Wearables is pre-1.0 / MEDIUM long-term maintenance confidence; Capacitor's value depends on PWA install rates only knowable after launch). The stack itself is locked, fully version-pinned, and HIGH confidence; the work is ensuring the architecture and operating discipline match the pitfalls already documented.

## Key Findings

### Recommended Stack

The stack is **locked** by `PROJECT.md` and `project-definition.md` §5 — Vue 3 + Firebase. STACK.md does not re-debate it; it specifies concrete 2026-current versions (npm-verified 2026-04-27) and the architectural patterns required to make it work for this domain (Discord OAuth bridge via custom tokens, consent-gated Security Rules, time-series wearable schema, BigQuery export for B2B). All older `expert-architect.md` references to React Native / NestJS / Supabase / TimescaleDB / BullMQ / Redis are explicitly **superseded artifacts**.

**Core technologies (npm-verified 2026-04-27):**
- **Vue 3.5.33 + Vite 7.4 + Pinia 3 + VueFire 3.2.3** — PWA frontend with reactive Firestore bindings; vite-plugin-pwa 1.2 for service worker
- **Firebase JS SDK 12.12.1 + firebase-admin 13.8 + firebase-functions 7.2.5 (v2 API only)** — Firestore + Auth + Storage + Hosting; Cloud Functions Gen 2 organized into 7 codebases (auth/consent/events/challenges/wearables/gamification/b2b) for independent deploys
- **discord.js 14.26.3 on Node 22 LTS** — read-only bridge per ADR-001; ZERO `MessageContent` intent; deployed on **Compute Engine e2-micro (~$6/mo)**, NOT Cloud Run
- **Tailwind CSS 4.2 + reka-ui 2.6 + vue-i18n 11** — accessible components for consent toggles; ES-primary i18n with versioned consent text keys
- **Firestore→BigQuery Extension + Metabase OSS** — analytics warehouse with k≥50 enforced SQL views; Metabase has zero direct Firestore access
- **Open Wearables 0.4.3 (self-hosted FastAPI, MIT)** — webhook-driven wearable normalization (Apple Health, Health Connect, Garmin, Polar, Whoop, Oura); **MEDIUM long-term maintenance confidence** — plan a fork on Phase 2 launch
- **Stripe 22.1 + posthog-js (self-hosted) + @sentry/vue 10.50** — Phase 3 monetization, LOPDP-sovereign analytics, error monitoring with PII scrubbing

See `.planning/research/STACK.md` for full version table, installation commands per workspace, and the seven critical architectural patterns.

### Expected Features

FEATURES.md validates the existing 36 functional requirements (REQ-F001..F036) against 2026 industry table stakes drawn from competitor product surfaces (HealthyGamer.gg, Nerd Fitness, Discovery Vitality, SuperBetter, Strava, NASEF, Zen Gamer, Luma) and identifies **10 gaps** the requirement set does not yet capture. The requirement set is structurally sound; the gaps are mostly refinements that competitors have normalized since the original requirements were written.

**Must have (table stakes — already covered by REQ-F set):**
- Discord server + onboarding bot + OAuth account linking (REQ-F006/F007/F008)
- Event listing + RSVP + QR check-in + offline fallback (REQ-F009/F010/F036)
- Granular consent UI (10 categories, individually revocable, audit-logged) (REQ-F027/F028/F029/F031)
- XP / levels / badges + tiered challenges (Bronce/Plata/Oro) (REQ-F023/F024/F026)
- Wearable integration (HealthKit + Health Connect + Open Wearables) + manual entry (REQ-F021)
- Crisis resources visible everywhere + licensed partner + trained mods (REQ-F032/F033/F034)
- B2B aggregated dashboard with k≥50 hard gate (REQ-F014/F016)
- Bilingual ES/EN UI with gaming terms preserved in EN (REQ-NF014)
- WCAG 2.1 AA accessibility + mobile-first 360px floor (REQ-NF015)

**5 high-priority gaps to absorb into REQ set before Phase 2 build:**
1. **Explicit streak entity + bonus multiplier rules** (67% of top 2026 retention apps; Habitify/Headspace baseline)
2. **Native phone pedometer as zero-config baseline** (87% LATAM users are mobile-only; iOS Motion API + Android Sensor API standard — independent of Open Wearables)
3. **Event waitlist with auto-promote** (Luma normalized in 2024)
4. **Re-consent on terms change** (active acceptance, not passive — LATAM regulator expectation post-2024)
5. **One-tap report-user UX flow** (90% LATAM women-gamer harassment context; trust & safety baseline)

**Differentiators (already in REQ set — protect during execution):**
- IRL events as the wellness primitive (3-tier: Meetups / General / Club Sessions) — uncopyable LATAM moat
- Spanish-first gaming-native voice (Riot LTA Sept 2025 failure validates first-mover advantage)
- Character-sheet wellness visualization (HP/Stamina/Mental/Social) with gaming-themed narratives
- Club formation workflow (meetup → persistent club with own Discord channels)
- k≥50 anonymity gate visible to B2B partners as a **trust differentiator**, not just compliance
- Female-safe-space defaults (pronouns optional, attendee opt-in, anonymous reporting)

**Defer (v2+ / Phase 3-4):**
- Premium membership ($3-5/mo, **cosmetic + convenience only — never P2W**)
- Sponsored challenges + campaign approval workflow (formalize as REQ in Phase 3)
- Peer wellness coaching framework (HealthyGamer-style, Phase 3)
- Multi-country consent architecture (Colombia / Mexico — Phase 4)
- NASEF-style certification (Phase 4)
- Insurer pilot — Aseguradora del Sur, **co-creation only, never commodity B2B**

**Anti-features (deliberate "no"s — defend against stakeholder requests):**
- Discord data collection (TOS violation + ADR-001)
- Insurer-first revenue (Akili/Pear failure pattern)
- Generic surface gamification (gamers see through it harder than non-gamers)
- Clinical therapy / diagnosis features (MSP licensing + liability)
- Pay-to-win XP boosts via premium
- Real-name mandates / mandatory profile photos
- Auto-medical alerts from wearable data
- Individual-level B2B data exposure (even with consent — k-anonymity is the floor)
- AI chatbot mental-health assistant
- Daily-check-in nag notifications

See `.planning/research/FEATURES.md` for the full table-stakes / differentiator / anti-feature breakdown, the dependency graph, the MVP definition split (Phase 1 zero-code → Phase 2 platform → Phase 3+ revenue), the prioritization matrix, and the 7-competitor feature comparison.

### Architecture Approach

A **serverless event-driven Firebase architecture** in `southamerica-east1` (São Paulo — closest LOPDP-defensible GCP region; no Ecuador-resident region exists) with a **Vue 3 PWA frontend**, **Cloud Functions Gen 2 organized by 7 domain codebases** for independent deploys, **Firestore as system-of-record** with consent-gated Security Rules, **BigQuery as the analytics warehouse** fed by the official `firestore-bigquery-export` extension on consent-tagged collections only, **Metabase OSS as the B2B portal** querying BigQuery k≥50 views via signed-JWT iframe embedding, and a **Discord bot on Compute Engine e2-micro** as the one persistent component (Cloud Run unsuitable for Gateway WebSockets — confirmed by multiple production reports). The architectural firewall (ADR-001: Discord bot has zero Firestore Admin SDK credentials, calls only locked-down Cloud Function HTTP endpoints with HMAC + IP allow-list) is preserved verbatim from `expert-architect.md`.

**Major components:**

1. **Vue 3 PWA** — Public surfaces (landing/blog/events listing with vite-ssg SEO), authenticated `/me` (character sheet), `/me/consent` (10-toggle UI with history + revoke), `/events/:id/checkin` (camera + IndexedDB offline queue), `/me/wearables`, `/partners/*` (separate route group, custom-claim-gated). Direct Firestore reads via VueFire (Security Rules enforce); all mutations via callable Cloud Functions.
2. **Cloud Functions Gen 2 (7 codebases)** — `auth` (Discord OAuth custom-token bridge), `consent` (grant/revoke + immutable hash-chained `/consentLedger` + `/auditLog`), `events`, `challenges`, `wearables` (PWA ingest + Open Wearables webhook), `gamification` (XP/streaks/achievements via Firestore triggers), `b2b` (Metabase JWT mint + query audit hook). Single source of truth for consent enforcement via shared `ConsentEnforcement.ts` middleware.
3. **Firestore (Native, southamerica-east1, immutable region)** — `/users/{uid}/consents/{category}` colocated under user path so Security Rules can resolve via single `get()`; `/users/{uid}/healthData/{yyyy-mm}/metrics/{id}` monthly-bucketed subcollection for time-series; `/users/{uid}/healthDaily/{yyyy-mm-dd}` daily rollups (BQ-mirrored, raw is NOT mirrored — too expensive); `/auditLog` and `/consentLedger` are append-only Functions-service-account-only writes.
4. **BigQuery + Metabase** — Consent-tagged collections only (`profiles`, `consents`, `healthDaily`, `events`, `attendance`, `challenges`, `auditLog`, `consentLedger`, `userAchievements`); k≥50 enforced in SQL views via `HAVING COUNT(DISTINCT user_id) >= 50`; Metabase service account has SELECT on `gw_b2b_views` only, ZERO access to raw mirror; per-partner row filters via signed-JWT embed parameters.
5. **Discord bot (Compute Engine e2-micro, us-east1, ~$6/mo)** — discord.js v14.26 on Node 22 with `Guilds` + `GuildMembers` intents only (no `MessageContent`); slash commands `/link`, `/eventos`, `/leaderboard`, `/perfil`, `/reto`; calls Cloud Function HTTP endpoints with HMAC + IP allow-list for all data; **zero Firestore Admin SDK access**.
6. **Open Wearables (self-hosted FastAPI, separate VPS or Cloud Run)** — Webhook receiver for cloud wearables (Garmin/Fitbit/Polar/Whoop/Oura); fires HTTPS POST to `wearables-openWearablesWebhook` Cloud Function which validates HMAC, checks `wearable_data` consent, normalizes payload, writes to monthly subcollection. **MEDIUM maintenance confidence** — plan a fork on Phase 2 launch.
7. **Supporting services** — PostHog (self-hosted, EU region for cost — anonymized event data, document in DPIA), Cloud Scheduler (consent expiry sweeper, daily rollup recalc, weekly Discord leaderboard digest, monthly LOPDP audit job, hash-chain integrity verifier), Cloud KMS (Discord refresh token encryption), Firebase Storage (signed URLs for DSAR exports with 7-day TTL).

See `.planning/research/ARCHITECTURE.md` for the full system diagram, 5 critical data flows (Discord onboarding, consent capture, wearable ingestion, B2B query, offline event check-in), 5 patterns to follow with full code examples (Security Rules, codebase organization, time-series schema, BigQuery k≥50 views, Discord bot bridge), 5 anti-patterns to avoid, scalability cost projections (~$10-15/mo MVP → ~$100-180/mo at 10K users — well under the $260 ceiling), and the explicit translation table mapping every superseded `expert-architect.md` section to its Firebase equivalent.

### Critical Pitfalls

PITFALLS.md surfaces 9 critical pitfalls **net-new or substantially refined beyond** the existing risk registers in `expert-project-manager.md` and `expert-security-compliance.md` (which remain authoritative for top-line strategic risks). The pattern: most pitfalls are **Phase 2 design-time decisions** that are 5-10x more expensive to fix after launch.

1. **Firestore Security Rules as the ONLY consent enforcement layer** (Phase 2, STACK-SPECIFIC) — Rules use OR composition (not AND like Supabase RLS), and Cloud Functions with admin credentials bypass rules entirely. **Mitigation:** two-layer enforcement (Rules + `consentGate` middleware on every Function), no wildcard `{document=**}` rules on user collections, `@firebase/rules-unit-testing` coverage >90% as CI gate, single `ConsentEnforcement.ts` shared module as source of truth.

2. **Firestore read-cost overrun via `onSnapshot` reactive listeners** (Phase 2, STACK-SPECIFIC) — A live leaderboard `onSnapshot` mounted on every page header at 1,500 users can balloon the $25-100/mo budget to $400-2,000/mo. **Mitigation:** `getDocs` + 5-15 min TTL cache for aggregate/feed surfaces; aggregate `/leaderboards/{period}` docs recomputed by scheduled Function (one read per view, not 50); GCP Budget API alerts at $50/$100/$200 configured day 1; ESLint rule warning on `onSnapshot` in app shell; reads-per-DAU as a PostHog KPI. Add as **ADR-008 "Firestore read budget discipline"**.

3. **SPDP "Comprehensive System" deadline already passed** (Phase 0, LEGAL) — Two things abbreviated SPDP: the regulator (Superintendencia) and the System (internal compliance program — policies, registers, retention schedules, DSAR procedure, breach response, training log, vendor DPAs, DPIA template). The Dec 31, 2025 System deadline already passed; a project incorporated post-deadline must demonstrate the full System from day one. **Mitigation:** expand Phase 0 deliverable beyond DPO+DPIA to the full documented System; engage Ecuadorian privacy counsel that has filed at least one System with SPDP; complete vendor DPA inventory (Firebase, Discord, Stripe, PostHog, Resend, etc.) before legal entity formation.

4. **Discord-to-app conversion friction at the consent step** (Phase 2, FUNNEL) — LOPDP-trained counsel will reflexively want consent BEFORE first interaction; engineers will design "consent on signup." Both undermine the 40% conversion target — realistic without funnel discipline is 5-15%. **Mitigation:** Firebase Anonymous Auth on first app open → user scans QR → gets XP credited to anonymous account → THEN Layer 1 consent shown; consent layers truly progressive (Layer 0 → 1 → 2 → 3, refusing higher layers does NOT lock out earlier-layer features); funnel instrumented in PostHog from day 1; kill the 40% target if L1 grant rate < 60%.

5. **Surface-mechanic gamification in a gaming-native audience** (Phase 1 testing, Phase 2 build) — Gamers see through fake gamification harder and faster than non-gamers because they've spent thousands of hours in real loot/battle-pass systems. The 80% surface-failure rate **understates** the gamer-audience risk — it's brand-fatal. **Mitigation:** recruit a gamification consultant who is also a 1000+ hour gamer for Phase 2 design review; anchor mechanics in real status (Discord-synced badges, priority access, named achievements with provenance); season-based progression with resets; gamer focus group playtest BEFORE shipping; narrative > numbers (gaming-themed equivalents like "47 cruces de Summoner's Rift").

6. **k-anonymity enforced only at query time, not at schema time** (Phase 2 architecture, Phase 3 use) — k=50 is weak in Ecuador's small population; (city=Quito + Free Fire + age 22-26) might already be <500 people. BigQuery exports of raw Firestore preserve full cardinality; an analyst with admin access bypasses the application gate. **Mitigation:** **two-tier data architecture must be built in Phase 2** (firestore-raw DPO-only with 90-day retention → bigquery-anonymized with k≥50 + generalization + ε-DP noise + restricted quasi-identifier combinations); Metabase ONLY connects to anonymized tier; schema-level generalization (5-year age bands, region collapse for segments <500); differential privacy noise on counts <200; formal anonymization assessment filed with SPDP per LOPDP Reglamento. Update **ADR-007** to reflect schema-time enforcement.

7. **Crisis-keyword detection without Ecuador clinical sign-off + Línea 171 capacity assumption** (Phase 0 design, Phase 1 training, Phase 2 automation) — Off-the-shelf NLP is English-trained and misses Ecuadorian Spanish idioms ("ya no quiero seguir," "cansado de todo," gamer-coded "uninstall life"); Línea 171 may not be 24/7 specialist-staffed. Surfacing an unanswered line at 2am is worse than no resource. **Mitigation:** licensed Ecuador mental-health partner signs off on the Spanish lexicon + escalation tree + 24/7 coverage plan + scope-of-practice clarification; **two verified hotlines, not one** (Línea 171 + a confirmed-capacity backup, monthly answer-rate tested); human review on every L3+ alert; moderator hard cap of 4h/week + mandatory rotation off after handling a crisis; no clinical-service language in marketing.

8. **Bilingual ES/EN content pipeline drift across registers** (Phase 0 setup, ongoing) — Three registers collide: gaming (EN preserved), legal (ES/EN must be legally equivalent — enforceable under LOPDP), marketing ("tú" universal LATAM). Without discipline, gaming terms leak into consent text (legal ambiguity), or legal templates get auto-translated (non-native consent that won't hold up if challenged). The team default ("English original + ES translation") **reverses** the project's Spanish-first positioning — Riot LTA's exact failure pattern. **Mitigation:** Spanish-first authoring; three separate glossaries committed to repo (`glossary-gaming.json`, `glossary-legal.json`, `glossary-marketing.json`); TM tagged by register; consent texts dual-counsel-reviewed in BOTH languages; content style guide tags every doc by register; native bilingual gamer reviews everything before publish.

9. **Wearable data path optimized for the 5-15% who have wearables, ignoring the 85% who don't** (Phase 2) — South America fitness-tracker penetration is ~4.66% (Statista 2024). Wearable APIs demo well; manual entry feels boring to engineers; founders extrapolate from US/EU adoption. Result: clunky manual UX, blank stats for non-wearable users, anti-cheat over-trusts wearables, character sheet shows second-class status to most of the audience. **Mitigation:** manual entry is first-class, designed FIRST in Phase 2; phone-native step counting (iOS Motion / Android Sensor APIs) is the baseline before any third-party SDK; no wearable required for any badge/level/leaderboard tier; photo + community vouching as alt-verification; character sheet shows full-color stats for everyone; if wearable adoption < 10%, do not gate any feature on wearables.

**Cross-cutting reminder:** all 10 LOPDP threats from `expert-security-compliance.md` (T1-T10) and the 10 strategic risks from `expert-project-manager.md` (community formation failure, founder burnout, insurer dependency, Discord TOS, generic LOPDP, wearable adoption, budget overrun, etc.) **remain active and authoritative** — these 9 supplement, do not replace.

See `.planning/research/PITFALLS.md` for the full table of technical-debt patterns, integration gotchas, performance traps, security mistakes, UX pitfalls, the "Looks Done But Isn't" verification checklist, and recovery strategies per pitfall.

## Implications for Roadmap

The 5 phases in `PROJECT.md` (Phase 0 Legal → Phase 1 Community → Phase 2 Platform MVP → Phase 3 Revenue + Data → Phase 4 B2B + Scale) are **validated by all four research dimensions** and should remain the roadmap's top-level structure. The research surfaces refinements to scope and ordering within each phase, plus mid-phase research checkpoints for known-uncertain decisions.

### Phase 0 — Legal Foundation (Mo 0-2)

Expanded SPDP "Comprehensive System" beyond DPO+DPIA; clinical partner Ecuador-Spanish lexicon sign-off; bilingual glossary discipline established; vendor DPA inventory before legal entity formation.

### Phase 1 — Community Foundation (Mo 1-4)

Zero-code, validates kill criterion before any Phase 2 spend; gamer focus group playtest of XP/badge concepts before any Phase 2 build (Pitfall #5).

### Phase 2 — Platform MVP (Mo 4-10)

**Architecturally critical phase.** Build order is dependency-driven, do not rearrange:

- **Step 0** — Firebase project in `southamerica-east1` (immutable region); 7 Cloud Function codebases scaffolded; `ConsentEnforcement.ts` shared module; Firestore Security Rules baseline + 90% rules-unit-testing CI gate; GCP Budget API alerts; ESLint rule banning `onSnapshot` in app shell; ADRs 008/009/010/011 finalized
- **Step 1 — Auth + Discord Linking** with **Anonymous Auth on first app open** (Pitfall #4)
- **Step 2 — Consent Engine** (LOPDP gate; nothing else writes data until this exists) with re-consent on terms change (GAP from REQ set)
- **Step 3 — User Profiles + Basic Gamification** (explicit streak entity + multi-progression tracks — GAPs from REQ set)
- **Step 4 — Events + QR Check-In** with waitlist auto-promote and one-tap report-user (GAPs from REQ set)
- **Step 5 — Wellness Challenges** manual-first; native phone pedometer BEFORE third-party SDK (GAP from REQ set; Pitfall #9)
- **Step 6 — Wearable Integration** last; **two-tier B2B architecture built here even though B2B launches Phase 3** (Pitfall #6 — retrofitting later is 5-10x cost)

### Phase 3 — Revenue + Data (Mo 10-18)

B2B dashboard launches against pre-built two-tier architecture (Metabase + BigQuery k≥50 views with schema-level generalization + ε-DP noise); cosmetic-only premium ($3-5/mo); editorial campaign approval workflow formalized as REQ; consumer-brand pilot (NEVER insurer); first $1,000+/month revenue.

### Phase 4 — B2B + Scale (Mo 18-30)

Insurer co-creation pilot (Aseguradora del Sur) only after revenue baseline; Colombia (Ley 1581) + Mexico (LFPDPPP) entry with regional glossary variants; multi-country consent architecture; enterprise API; NASEF certification concept.

### Phase Ordering Rationale

- **Phase 0 first, hard-gated:** SPDP System + crisis partner are legal/ethical floor; Discord cannot go live without them
- **Phase 1 before Phase 2 (zero-code first):** community formation is the validated kill criterion
- **Phase 2 internal step order is dependency-driven:** Auth → Consent (LOPDP gate) → Profiles → Events → Challenges → Wearables; two-tier B2B built in Phase 2 even though B2B launches Phase 3
- **Phase 3 follows Phase 2 by design:** B2B dashboard requires two-tier architecture; sponsored challenges require editorial workflow; coaching requires trained moderator base
- **Phase 4 last:** geographic + insurer expansion only after revenue baseline; insurer-first is documented failure pattern (Akili, Pear)

### Research Flags

**Phases needing deeper research during planning (`/gsd-research-phase`):**

- **Phase 2 Step 0 (architecture lockdown)** — High value: ADRs 008/009/010/011 to formalize; Open Wearables version-pinning + fork strategy decision
- **Phase 2 mid-point (Steps 5-6 boundary)** — Re-evaluate Open Wearables stability; PWA Web Health API maturity vs Capacitor necessity; wearable adoption telemetry from Step 5
- **Phase 3 Step 1 (B2B dashboard launch)** — Differential privacy noise calibration (ε per segment); formal anonymization assessment filing with SPDP
- **Phase 4 entry (Colombia/Mexico)** — Country-specific privacy law deep-dive; local crisis-hotline capacity verification; regional glossary variants

**Phases with standard patterns (skip research-phase, well-documented in current research):**

- **Phase 0** — Legal procurement + counsel engagement
- **Phase 1** — Covered by `.claude/skills/community-ops.md` and `trust-safety.md`
- **Phase 2 Steps 1-4** — Fully specified in ARCHITECTURE.md with code examples

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions npm-verified 2026-04-27; only MEDIUM area is Open Wearables long-term maintenance (pre-1.0) and Capacitor as a Phase 3 hypothetical |
| Features | HIGH | Cross-validated against 5+ sources per feature; 10 GAP items at MEDIUM confidence (recommend confirm before adding to REQ-F set) |
| Architecture | HIGH | Translation of `expert-architect.md` to Firebase done with explicit per-section mapping; MEDIUM only on `southamerica-east1` LOPDP defensibility (DPO must sign off) |
| Pitfalls | HIGH on stack-specific + LOPDP; MEDIUM on community/operational |

**Overall confidence:** HIGH — the four research dimensions converge with no internal contradictions; existing risk registers in `expert-project-manager.md` and `expert-security-compliance.md` complement (not duplicate) this research.

### Gaps to Address

- **Open Wearables maintenance trajectory** (flagged by ALL 4 dimensions): pin to a tested version, fork on Phase 2 launch, monthly release monitoring, Phase 2 mid-point checkpoint; manual entry + phone pedometer is fallback baseline
- **LOPDP in-country residency**: no Ecuador-resident GCP region in 2026; `southamerica-east1` is closest; document in DPIA + counsel sign-off; SPDP-mandated migration would force AWS LightSail Quito or Telconet (multi-month, document as residual risk)
- **Capacitor decision deferred to Phase 2 mid-point**: triggers only if PWA install < 30% AND HealthKit native access required
- **Crisis lexicon for Ecuador-specific Spanish + gamer-coded distress idioms**: no validated public lexicon; partner builds during Phase 0 with quarterly refresh
- **k=50 effectiveness in small Ecuador segments**: schema-level generalization + ε-DP noise + DPO query audit (not just SQL gate)
- **Discord-to-app 40% conversion target vs realistic 5-15%**: anonymous-first auth + progressive consent + funnel instrumentation; recalibrate target if L1 grant rate <60%
- **Editorial campaign approval workflow**: formalize as REQ during Phase 3
- **First Ecuador gamer-health study**: track separately as Phase 3-4 marketing/research deliverable

## Sources

### Primary (HIGH confidence — verified)
- `.planning/research/STACK.md` — npm-verified versions 2026-04-27, Firebase + Vue + discord.js + Open Wearables official docs, full architectural-pattern code examples
- `.planning/research/FEATURES.md` — cross-referenced against 36 functional requirements + 4 user journeys + 7 competitor product surfaces
- `.planning/research/ARCHITECTURE.md` — translation of `expert-architect.md` to Firebase with explicit per-section mapping
- `.planning/research/PITFALLS.md` — Firebase docs + Lexology + OlarteMoure + CorralRosales 2025-2026 LOPDP publications + Sweeney's k-anonymity foundational paper

### Pre-existing project documents (authoritative for project-internal context)
- `.planning/PROJECT.md` — locked constraints, 4-phase active requirement set, key decisions, kill criteria
- `StartData/output/project-definition.md` §5 — canonical Vue 3 + Firebase tech stack
- `StartData/output/expert-business-analyst.md` — 36 functional requirements + 19 NFRs
- `StartData/output/expert-product-ux.md` — 6 personas + 4 user journeys + UX prioritization matrix
- `StartData/output/expert-research-analyst.md` — competitor analyses, Akili/Pear/LTA failure patterns
- `StartData/output/expert-architect.md` — data model + ADRs (Supabase/NestJS/RN sections SUPERSEDED — translated through Firebase per ARCHITECTURE.md translation table)
- `StartData/output/expert-security-compliance.md` — LOPDP threats T1-T10 + k-anonymity ADR-007 + Discord firewall ADR-001
- `StartData/output/expert-project-manager.md` — top 10 strategic risks, kill criteria, phase model
- `.claude/skills/` — community-ops, content-engine, trust-safety, challenge-framework operational skills

---
*Research completed: 2026-04-27*
*Ready for roadmap: yes*
