# Phase 2: Platform MVP - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 02-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-28
**Phase:** 02-platform-mvp
**Areas discussed:** Brand & naming lock-in, Scope split, Mobile shell strategy, Open policy decisions

---

## Gray Area Selection

**Question:** Phase 2 has the architecture, build order, and 111 requirements locked. Pick which gray areas to discuss.

| Option | Description | Selected |
|--------|-------------|----------|
| Brand & naming lock-in | 8 candidate names pending; blocks Firebase project + domain + Discord OAuth + visual theme confirmation | ✓ |
| Scope split (2a / 2b sub-phases?) | Phase 2 = 111 reqs across 6 build steps; ship as one or split? | ✓ |
| Mobile shell strategy | Pure PWA vs Capacitor commit; affects HealthKit/Health Connect access | ✓ |
| Open policy decisions | Age floor, wearable consent granularity, B2B partner taxonomy, pronouns | ✓ |

**User's choice:** All four.

---

## Brand & Naming Lock-In

### Q1 — Project name

| Option | Description | Selected |
|--------|-------------|----------|
| Vida GG | Spanish 'life' + universal gaming 'GG'. Easy ES/EN. Memorable. | |
| Respawn EC | Gaming-native verb (revival/restart) + Ecuador suffix. | |
| LevelUp.ec | Universal progression metaphor + EC ccTLD. | |
| Other / let me decide later | None of the 8, brainstorm fresh. | ✓ |

**User's choice:** "Other" with notes: **gamechangers** (decided as the project name).

### Q2 — Domain TLD priority

| Option | Description | Selected |
|--------|-------------|----------|
| .gg primary + .com fallback | Gaming-native TLD signals identity to gamers. | ✓ |
| .ec primary + .com fallback | Ecuador ccTLD signals local roots. | |
| .com primary | Universal recognition. | |

**User's choice:** `.gg` primary + `.com` fallback. → `gamechangers.gg` + `gamechangers.com`

### Q3 — Visual theme

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm proposed palette (dark navy + teal + amber + electric blue + red) | expert-product-ux.md proposal as-is. | |
| Confirm structure, let me tune colors later | Dark gaming aesthetic locked, hex values revisited during UI phase. | ✓ |
| Different direction — I'll describe | Override proposed palette. | |

**User's choice:** Confirm structure, defer hex tuning to UI phase.

### Q4 — Logo / wordmark approach

| Option | Description | Selected |
|--------|-------------|----------|
| Wordmark only (typographic) | Custom typeface treatment, no icon. $0-200, ships Phase 2 Step 0. | ✓ |
| AI-gen icon + wordmark for MVP, commission later | Midjourney/Ideogram + manual cleanup. | |
| Commission designer now | LATAM designer $500-2K. Blocks Phase 2 Step 0 by 2-4 weeks. | |

**User's choice:** Wordmark only for MVP.

---

## Scope Split

### Q1 — Single phase or split?

| Option | Description | Selected |
|--------|-------------|----------|
| Split into 2a + 2b | 2a = Steps 0-4 (~70 reqs, 3-4 mo); 2b = Steps 5-6 (~41 reqs). Ships value sooner. | |
| Keep as one Phase 2 | Single big phase, ~6 months, all 111 reqs. | ✓ |
| Split 3 ways: 2a / 2b / 2c | Most granular, more roadmap overhead. | |

**User's choice:** Single Phase 2 (no split).

### Q2 — MVP cut

| Option | Description | Selected |
|--------|-------------|----------|
| All 111 are MVP | Trust the requirement set; everything ships in Phase 2. | ✓ |
| Defer content hub (CONT-01..07) | SEO content hub deferred to Phase 2.5/3. | |
| Defer wearables (WEAR-01..12) entirely | Manual entry + phone pedometer covers 85%+ users. | |
| Defer something else — I'll specify | Custom defer list. | |

**User's choice:** All 111 are MVP.

### Q3 — Pacing assumption

| Option | Description | Selected |
|--------|-------------|----------|
| Solo founder + Claude Code | Solo + AI execution. 6 months for full Phase 2 with split. | ✓ |
| Solo founder + 1 contractor (mobile/Vue) | Faster but adds coordination overhead. | |
| Founder + technical co-founder | Phase 2 in 4 months realistic. | |
| Skip — too early to commit | Plans assume solo + Claude. | |

**User's choice:** Solo founder + Claude Code.

### Q4 — Step 0 placement

| Option | Description | Selected |
|--------|-------------|----------|
| Step 0 = first plan inside 2a | Treat Step 0 as Plan 1 of Phase 2a. Fast, no roadmap restructuring. | ✓ |
| Step 0 = Phase 1.5 (own micro-phase) | Architecturally clean but adds roadmap complexity. | |

**User's choice:** Step 0 = first plan inside Phase 2.

---

## Mobile Shell Strategy

### Q1 — When to commit on mobile shell?

| Option | Description | Selected |
|--------|-------------|----------|
| Pure PWA only — install to home screen | Vue 3 PWA via vite-plugin-pwa; HealthKit via web bridge. Cheaper, faster. | ✓ |
| Capacitor wrapper from day one | App Store + Play Store. Native HealthKit/Health Connect. Adds setup overhead. | |
| PWA now, decide on Capacitor at Phase 2 mid-point | Default per research/SUMMARY.md. | |

**User's choice:** Pure PWA only.

### Q2 — Wearable depth

| Option | Description | Selected |
|--------|-------------|----------|
| Open Wearables webhook only (cloud APIs) | Garmin/Fitbit/Polar/Whoop/Oura via webhook. No native HealthKit/Health Connect. | ✓ |
| Open Wearables + native HealthKit/Health Connect via web bridges | Best-effort web access; degrades gracefully. | |
| Full Capacitor with native plugins | Most native UX. Only viable with Capacitor commit. | |

**User's choice:** Open Wearables webhook only.

### Q3 — Push notifications

| Option | Description | Selected |
|--------|-------------|----------|
| Web Push API (PWA standard) | FCM via service worker. Works iOS 16.4+, all Android. | ✓ |
| WhatsApp Business + Web Push fallback | WhatsApp = primary LATAM, Web Push for in-app actions. | |
| FCM + APNs via Capacitor | Native push only viable with Capacitor. | |

**User's choice:** Web Push API.
**Notes:** WhatsApp Business broadcast remains operational from Phase 1 COMM-08; Web Push is the additional in-app channel, not a replacement.

### Q4 — Install nudge

| Option | Description | Selected |
|--------|-------------|----------|
| Soft — in profile menu only, no popups | Discoverable but not pushy. | ✓ |
| Triggered — after 2nd event check-in or 3rd app open | Non-blocking banner after demonstrated engagement. | |
| Aggressive — banner on home until installed/dismissed | Maximizes install rate. Not recommended for audience. | |

**User's choice:** Soft only.

---

## Open Policy Decisions

### Q1 — Age floor

| Option | Description | Selected |
|--------|-------------|----------|
| 18+ | Simpler consent (no parental flow), broader content latitude, cuts ~30% of mobile gamer audience. | |
| 16+ | Captures more of mobile gamer demographic, requires parental consent flow for under-18 (LOPDP Art. 24). | ✓ |
| 13+ | Maximum reach. Heaviest compliance burden. NOT recommended for bootstrapped MVP. | |

**User's choice:** 16+.

### Q2 — Wearable consent granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Single toggle for all wearable data | One consent grants all metrics. Simpler UI, higher grant rate. | ✓ |
| Per-metric toggles | Separate consent per metric. Maximum LOPDP defensibility. | |
| Tiered: Movement / Vitals / Sleep | Three groups: Movement / Vitals / Sleep. Middle ground. | |

**User's choice:** Single toggle.

### Q3 — B2B partner taxonomy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 3 categories as proposed | Insurers, healthcare, brands. Matches existing CNST-01. | ✓ |
| Add b2b_telecom + b2b_fitness_brands | Split brands into telecom + fitness/lifestyle + food brands. | |
| Replace with 'consumer brands' only | Phase 2 ships only b2b_consumer_brands; insurer/healthcare deferred to Phase 3-4. | |

**User's choice:** Keep 3 categories.

### Q4 — Pronouns

| Option | Description | Selected |
|--------|-------------|----------|
| Optional self-write field | User types pronouns or leaves blank. Maximum flexibility. | ✓ |
| Optional select from list (él/ella/elle/they/etc.) | Curated dropdown with LATAM Spanish neutral 'elle'. | |
| Don't include pronouns at all | Skip the field entirely. | |

**User's choice:** Optional self-write field.

---

## Wrap-Up

### Q — Ready for context?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context | Write CONTEXT.md and continue to /gsd-plan-phase 2. | ✓ |
| Explore more gray areas | Surface 2-4 more gray areas based on what we've discussed. | |
| Revisit one of the 4 areas | Re-open Brand / Scope / Mobile / Policy. | |

**User's choice:** Ready for context.

---

## Claude's Discretion

Items where the planner / researcher should pick sensible defaults (captured in CONTEXT.md `<decisions>` section as DC-01 through DC-08):

- Discord onboarding bot vs custom migration path (DC-01)
- Firestore document ID strategy (DC-02)
- Cloud Function naming convention (DC-03)
- i18n URL strategy (DC-04)
- Design system primitives (reka-ui vs shadcn-vue vs PrimeVue) (DC-05)
- Anti-cheat numeric thresholds per wearable metric (DC-06)
- Streak shield grace days (DC-07)
- Wordmark typography for the GameChangers logo (DC-08)

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:

- Capacitor wrapper for App Store + Play Store (Phase 3 contingent)
- Native Apple HealthKit + Android Health Connect integration (Phase 3+ contingent)
- FCM + APNs native push (post-Capacitor)
- Aggressive PWA install prompts (rejected; could revisit if install rate too low)
- Per-metric wearable consent (rejected; could revisit if DPO insists)
- B2B taxonomy expansion (telecom / fitness-brand / food-brand split — rejected for MVP)
- Curated-pronoun dropdown (rejected in favor of free text)
- Commissioned logo design (Phase 3+ when revenue allows)
- PROJECT.md + REQUIREMENTS.md naming refresh from "Gamer Wellness" to "GameChangers" (small docs pass after this commit)

## Open Questions Still Pending (PROJECT.md §9)

External / not Phase 2 work:
- Legal entity type (Phase 0 LEGAL-07)
- Founder full-time availability
- Technical co-founder recruitment
- Initial capital beyond infra budget
- Aseguradora del Sur relationship status
