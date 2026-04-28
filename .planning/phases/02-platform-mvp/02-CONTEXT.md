# Phase 2: Platform MVP - Context

**Gathered:** 2026-04-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the Vue 3 PWA + Firebase backend with consent-gated architecture, Discord OAuth bridge, events with QR check-in, manual-first wellness challenges, wearable integration via Open Wearables webhook, and a pre-built two-tier B2B data pipeline that no B2B partner can yet access. Turns the Phase 1 community into a platform with the architectural firewalls and read-budget discipline that prevent retrofit costs in Phase 3.

**In scope:** all 111 requirements (ARCH/AUTH/CNST/PROF/EVNT/CHLG/WEAR/CONT/DBOT/A11Y) executed in the dependency-locked build order Step 0→1→2→3→4→5→6.

**Out of scope (deferred or anti-features):** App Store / Play Store distribution, native HealthKit / Health Connect access, B2B dashboard launch, premium memberships, peer coaching, geographic expansion, Discord data collection, insurer-first revenue, surface-mechanic gamification, auto-medical alerts, individual-level B2B exposure.

</domain>

<decisions>
## Implementation Decisions

### Brand & Naming

- **D-01 (Project name):** **GameChangers** — supersedes the working title "Gamer Wellness" / "GamerAlliance" used in earlier StartData/output/* artifacts and PROJECT.md. Resolves LEGAL-08 (naming finalized).
- **D-02 (Domain priority):** `gamechangers.gg` primary, `gamechangers.com` fallback. Register both before Step 0 Firebase project creation. The `.gg` ccTLD signals gaming identity; `.com` covers brand defensiveness.
- **D-03 (Visual theme):** Confirm dark gaming aesthetic structure (deep navy/charcoal base, neon-accented), but defer exact color palette hex tuning to the UI phase / `/gsd-ui-phase 2`. Expert-product-ux.md proposed teal/green primary + amber XP/reward + electric blue interactive + Valorant red alerts as a starting point.
- **D-04 (Logo):** Wordmark-only for MVP (typographic treatment, no icon). Defer commissioned logo work to Phase 3+ when budget allows.
- **D-05 (Update PROJECT.md):** PROJECT.md and REQUIREMENTS.md still reference "Gamer Wellness" as the project name. After this phase planning completes, refresh those documents to use "GameChangers" consistently. Out of scope for this CONTEXT.md to do automatically.

### Scope & Pacing

- **D-06 (No phase split):** Phase 2 ships as a single phase with all 111 requirements — no 2a/2b split. Roadmap stays at 4 active phases.
- **D-07 (All MVP):** All 111 requirements are Phase 2 MVP scope; nothing defers to a Phase 2.5 polish round. The research already pruned deferred items into v2.
- **D-08 (Execution model):** Solo founder + Claude Code as primary execution path. Plans should be sized for one developer + AI-assisted execution, not assume contractor or co-founder availability.
- **D-09 (Step 0 placement):** The architecture lockdown work (ARCH-01..10) ships as the first plan inside Phase 2, not a separate Phase 1.5 micro-phase. Keeps roadmap simple.

### Mobile Shell & Wearables

- **D-10 (Mobile strategy):** Pure PWA only for Phase 2. Vue 3 + vite-plugin-pwa, installable to home screen, no App Store / Play Store. **No Capacitor wrapper in Phase 2.** Re-evaluate at Phase 3 entry only if PWA install rate < 30% AND Web Sensor / on-device HealthKit web bridges prove inadequate.
- **D-11 (Wearable depth):** Open Wearables webhook only — Garmin, Fitbit, Polar, Whoop, Oura via self-hosted FastAPI service forwarding to a Cloud Function with HMAC validation + consent gate. **No native Apple HealthKit or Android Health Connect integration in Phase 2.** Defer native APIs to Phase 3 contingent on Capacitor decision.
- **D-12 (Push notifications):** Web Push API via FCM service worker. Works iOS 16.4+, full Android. WhatsApp Business (already in Phase 1 COMM-08) remains the primary LATAM channel for event reminders; Web Push covers in-app actions (challenge updates, achievement unlocks). No FCM/APNs native push.
- **D-13 (Install nudge):** Soft only — PWA install prompt available in profile menu, no popups, no banner on home. Matches gaming-native anti-spam ethos.

### Policy & Consent

- **D-14 (Age floor):** **16+** minimum registration age. Implications:
  - LOPDP Art. 24 parental consent flow required for under-18 users
  - Restricted data categories for minors (no B2B sharing for under-18 regardless of consent)
  - Discord teen-mode compliance (already mandated since March 2026)
  - Age verification gate in AUTH-12
  - Captures Free Fire / mobile gamer demographic which skews younger
- **D-15 (Wearable consent granularity):** Single `wearable_data` toggle covers all metrics (steps, heart rate, sleep, calories, workouts). Per-metric consent is industry-rare and reduces grant rates without meaningfully strengthening LOPDP defensibility. CNST-01 stays as proposed.
- **D-16 (B2B taxonomy):** Keep three partner categories — `b2b_insurers`, `b2b_healthcare`, `b2b_brands`. Not splitting further (no separate telecom / fitness-brand / food-brand toggles); not collapsing to single `b2b_consumer_brands`. Matches expert-business-analyst.md and CNST-01 unchanged.
- **D-17 (Pronouns):** Optional self-write field in profile (free text, blank by default, never required). Resolves PROF-02 implementation.

### Claude's Discretion

These areas were not user-specified and the planner/researcher should pick sensible defaults:

- **DC-01 (Discord onboarding bot vs custom):** Phase 1 used MEE6 / Carl-bot for the Discord server stand-up; Phase 2 builds the custom discord.js v14 bot per DBOT-01..07. Migration path between the two is implementation detail.
- **DC-02 (Firestore document ID strategy):** Auto-generated vs deterministic IDs per collection — pick per access pattern.
- **DC-03 (Cloud Function naming convention):** `<codebase>-<verb><Noun>` (e.g., `auth-discordExchange`, `consent-grant`) suggested but planner can refine.
- **DC-04 (i18n URL strategy):** vue-i18n is locked but URL pattern (`/es/...` prefix vs query param vs locale-cookie + single URL) is open. Planner picks based on SEO impact.
- **DC-05 (Design system primitives):** STACK.md proposed reka-ui 2.6 + Tailwind 4.2. Planner can swap for shadcn-vue or PrimeVue if a stronger reason surfaces.
- **DC-06 (Anti-cheat thresholds):** Specific numeric thresholds for "unrealistic" wearable data per metric (>100K steps/day, BPM bounds, etc.) — planner derives from clinical / device-spec sources.
- **DC-07 (Streak shield mechanics):** Number of grace days per period for PROF-09 — planner picks 1 or 2 based on retention vs strictness tradeoff.
- **DC-08 (Wordmark typography):** Specific font + treatment for the GameChangers wordmark — planner / UI phase picks; D-04 only locks "wordmark-only, no icon."

### Folded Todos

None — `gsd-tools todo match-phase 2` returned 0 matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Locked stack (Vue 3 + Firebase), constraints, key decisions, Out of Scope, kill criteria
- `.planning/REQUIREMENTS.md` — 179 v1 requirements with REQ-IDs; Phase 2 covers 111 of them (ARCH/AUTH/CNST/PROF/EVNT/CHLG/WEAR/CONT/DBOT/A11Y)
- `.planning/ROADMAP.md` — 4-phase structure, Phase 2 build order Steps 0→6, success criteria, dependencies

### Research (committed 2026-04-27)
- `.planning/research/STACK.md` — npm-verified 2026-04-27 versions: Vue 3.5.33, Vite 7.4, Firebase JS SDK 12.12.1, firebase-admin 13.8, firebase-functions 7.2.5, discord.js 14.26.3, VueFire 3.2.3, Tailwind 4.2, reka-ui 2.6, vite-plugin-pwa 1.2; 7 architectural patterns
- `.planning/research/FEATURES.md` — Validates the 111 Phase 2 reqs against 2026 table stakes; identifies 5 GAPs already absorbed (CNST-07, PROF-08, PROF-10, CHLG-04, EVNT-04, EVNT-13)
- `.planning/research/ARCHITECTURE.md` — Vue 3 + Firebase translation of expert-architect.md; 7 Cloud Function codebases; Firestore Security Rules consent-gating pattern; monthly-bucketed time-series schema; Discord-bot-on-Compute-Engine (NOT Cloud Run); Phase 2 build order with explicit step gates
- `.planning/research/PITFALLS.md` — 9 net-new pitfalls; ALL 9 are Phase 2 design-time decisions that compound 5-10x if retrofitted; especially #1 (consent enforcement two-layer), #2 (Firestore read-budget discipline), #4 (Discord-to-app conversion at consent step), #6 (k-anonymity schema-time enforcement)
- `.planning/research/SUMMARY.md` — Synthesis with phase-by-phase implications; ADR additions 008/009/010/011 to formalize during Phase 2 Step 0

### Source artifacts (StartData/ — preserve as historical context, supersede where contradicted)
- `StartData/output/project-definition.md` §5 — canonical Vue 3 + Firebase stack; **AUTHORITATIVE** for tech stack
- `StartData/output/expert-business-analyst.md` — 36 functional reqs (REQ-F001..F036) + 19 NFRs; the basis for the current REQUIREMENTS.md
- `StartData/output/expert-product-ux.md` — 6 personas, 4 user journeys, feature prioritization, IA, gamification XP economy starting values, color palette starting point
- `StartData/output/expert-architect.md` — Data model + ADRs 001/003/004/006/007 (Discord firewall, Open Wearables, consent-first, bilingual ES/EN, k-anonymity); **NOTE: Supabase / NestJS / React Native / TimescaleDB sections are SUPERSEDED — use the Firebase translation in research/ARCHITECTURE.md**
- `StartData/output/expert-security-compliance.md` — LOPDP threats T1-T10, 10-point compliance checklist, Discord TOS architectural separation diagram
- `StartData/output/expert-research-analyst.md` — Competitor matrix, Akili/Pear/LTA failure patterns, market sizing
- `StartData/output/expert-project-manager.md` — Top 10 strategic risks, kill criteria, phase model
- `StartData/output/gaming-wellness-latam-brief.md` — April 2026 domain brief

### Operational skills (already in `.claude/skills/`)
- `.claude/skills/community-ops.md` — Discord onboarding funnel, event logistics, Club Captain coaching (informs DBOT, EVNT)
- `.claude/skills/content-engine.md` — Bilingual ES/EN content pipeline, gaming glossary, regional adaptation (informs CONT, A11Y)
- `.claude/skills/trust-safety.md` — Moderation, LOPDP audit, B2B reporting (informs CNST, EVNT-13, future Phase 3 B2BD/MODR)
- `.claude/skills/challenge-framework.md` — Challenge type taxonomy, Bronce/Plata/Oro tier calibration, anti-patterns (informs CHLG)

### External docs (verify versions current at planning time)
- Firebase Cloud Functions Gen 2 organization: https://firebase.google.com/docs/functions/organize-functions
- Firestore→BigQuery extension: https://extensions.dev/extensions/firebase/firestore-bigquery-export
- Cloud Firestore locations (region selection): https://firebase.google.com/docs/firestore/locations
- Firebase Security Rules with `get()` for cross-doc consent lookups: https://firebase.google.com/docs/firestore/security/rules-conditions
- discord.js v14 guide: https://discordjs.guide/
- Open Wearables (the-momentum/open-wearables): https://github.com/the-momentum/open-wearables
- vite-plugin-pwa: https://vite-pwa-org.netlify.app/
- VueFire (Firestore reactive bindings): https://vuefire.vuejs.org/

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

The project entered Phase 2 planning with only a Vite + Vue 3 starter scaffold (`src/App.vue`, `src/components/HelloWorld.vue`, `src/components/TheWelcome.vue`, `src/components/icons/Icon*.vue`, default `src/assets/{base,main}.css`). None of this is reusable for the GameChangers product.

**Action for Step 0 first plan:** Strip the scaffold (delete `HelloWorld.vue`, `TheWelcome.vue`, `WelcomeItem.vue`, `Icon*.vue`, `base.css`, `main.css`); replace `App.vue` with the GameChangers shell; keep `index.html`, `vite.config.js`, `package.json`, `jsconfig.json` as foundation. The `package.json` will need substantial dependency additions (Firebase SDK, VueFire, Pinia, vue-router, vue-i18n, Tailwind 4, reka-ui, vite-plugin-pwa, etc. per STACK.md).

### Established Patterns

None established yet — Phase 2 sets the patterns. Key patterns to establish in Step 0:
- Cloud Function codebase organization (7 codebases per ARCHITECTURE.md)
- `ConsentEnforcement.ts` shared module as single source of truth for consent gating
- Firestore document path conventions (`/users/{uid}/...` for everything user-scoped so Security Rules can resolve via `get()`)
- Audit log append-only write pattern (Functions service-account only)
- BigQuery export configuration (consent-tagged collections only)

### Integration Points

Outside-the-codebase integration points (Phase 1 already running, Phase 0 deliverables in motion):

- **Discord server** — already live from Phase 1 (COMM-01..03). Phase 2 adds the custom bot via DBOT-01..07; the bot replaces or runs alongside the Phase 1 MEE6 / Carl-bot setup.
- **Luma** — Phase 1 RSVP/check-in (COMM-12) gets superseded by the Phase 2 PWA event system (EVNT-01..14). Migration story: events with future dates are entered in both systems during transition; check-in moves to QR.
- **WhatsApp Business broadcast** — Phase 1 COMM-08 stays operational; Phase 2 adds Web Push as in-app channel without removing WhatsApp.
- **TikTok / Instagram / YouTube** — Phase 1 COMM-07 social presence stays operational; Phase 2 CONT-03 embeds these into the platform content hub.
- **Vendor accounts to provision in Step 0:** Firebase project (`southamerica-east1`), GCP Compute Engine (Discord bot host), Stripe (deferred to Phase 3 but DPA signed in Phase 0), PostHog (self-hosted), Resend (transactional email), Sentry, UptimeRobot.

</code_context>

<specifics>
## Specific Ideas

- **GameChangers** as the project name comes from the user (matches the `game-changers/` working directory). Captures the platform's positioning as a generational shift in how gamers approach health — not a clinical wellness app retrofit for gamers, but an identity-native community.
- The existing `StartData/output/expert-product-ux.md` color palette (deep navy `#1A1A2E` + teal/green `#00F5A0` + amber `#FFB800` + electric blue `#00D4FF` + Valorant red `#FF4655`) is a usable starting point for the UI phase, with explicit user permission to tune hex values during the UI phase.
- The `/gsd-ui-phase 2` workflow is the right next step before plan-phase (Phase 2 has `**UI hint**: yes` in the roadmap). Generates UI-SPEC.md design contract aligned with the 6-pillar audit framework, gives the planner a concrete visual contract instead of free-styling.

</specifics>

<deferred>
## Deferred Ideas

Items that surfaced during discussion but belong in other phases or v2.

### From Brand & Naming
- **D-05 follow-up: PROJECT.md + REQUIREMENTS.md naming refresh** — replace "Gamer Wellness" / "GamerAlliance" references with "GameChangers". Belongs in plan-phase output or a small docs pass after this CONTEXT.md commits, NOT in Phase 2 implementation work itself.
- **Commissioned logo design** — deferred to Phase 3+ when revenue allows; wordmark-only is the MVP placeholder.

### From Mobile shell
- **Capacitor wrapper for App Store + Play Store distribution** — Phase 3 contingent. Trigger condition: PWA install rate <30% from Phase 2 telemetry AND demonstrated need for native HealthKit / Health Connect access.
- **Native Apple HealthKit + Android Health Connect integration** — Phase 3+ contingent on Capacitor decision. Phase 2 ships Open Wearables webhook only.
- **FCM + APNs native push** — only viable post-Capacitor; deferred with Capacitor decision.
- **Aggressive PWA install prompts (banner-on-home, triggered-after-engagement)** — rejected for Phase 2 (soft-only). Could revisit if install rate is too low.

### From Scope
- **Phase 2.5 polish phase** — none planned. If reqs slip, they get re-roadmapped, not silently deferred.
- **Contractor / mobile specialist hire path** — if solo + Claude Code execution stalls, evaluate hiring at Phase 2 mid-point. Captured in PROJECT.md Open Questions.

### From Policy
- **Per-metric wearable consent (steps / heart rate / sleep / etc.)** — rejected for MVP. Could revisit if a specific partner / DPO insists.
- **B2B taxonomy expansion (telecom / fitness-brand / food-brand split)** — rejected for MVP. Could surface in Phase 3 if anchor partners require finer granularity.
- **Drop-insurer-and-healthcare-from-MVP-consent option** — rejected; CNST-01 keeps all 10 categories visible from Phase 2 onward (consent UI shows all available toggles, even those for categories with no active partners yet).
- **Curated-pronoun-dropdown** — rejected in favor of free-text self-write.

### From Open questions still pending (PROJECT.md §9)
These remain open for Phase 0 / external action and are NOT Phase 2 implementation work:
- Legal entity type (SAS vs Sociedad Anónima) — Phase 0 LEGAL-07
- Founder full-time availability — affects Phase 2 timeline assumptions
- Technical co-founder recruitment — affects Phase 2 pacing assumption D-08
- Initial capital beyond infra budget — affects Phase 0 + Phase 1 event funding
- Aseguradora del Sur relationship status — affects Phase 4 readiness, not Phase 2

### Reviewed Todos (not folded)

None — no todos surfaced from the matcher.

</deferred>

---

*Phase: 02-platform-mvp*
*Context gathered: 2026-04-28*
