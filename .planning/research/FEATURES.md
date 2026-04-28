# Feature Research

**Domain:** Gaming + Wellness Community Platform (Discord + PWA + Wearables + B2B Data)
**Researched:** 2026-04-27
**Confidence:** HIGH (cross-referenced against 36 functional requirements in expert-business-analyst.md, 4 user journeys in expert-product-ux.md, and 7 competitor analyses in expert-research-analyst.md, plus 2026 ecosystem validation)

> **Reading guide.** This file *validates* the existing 36 functional requirements (REQ-F001..F036) and 19 NFRs against 2026 industry table stakes for gaming+wellness communities. It does NOT re-invent the feature set. Where a documented requirement matches a 2026 table stake, the requirement ID is cited. Where 2026 ecosystem signals reveal a *gap* (something competitive products have that the existing requirements miss), the feature is flagged "GAP" so requirements definition can decide whether to absorb it.

---

## Feature Landscape

### Table Stakes (Users Will Leave Without These)

These are the features the target personas (El Casual, El Competitivo, La Madre/Padre Gamer, El Líder, La Gamer Mujer) and the B2B persona (La Marca/Aseguradora) *assume* exist in 2026. Their absence makes the product feel broken or amateur. Every entry below cross-references the existing requirement set; "GAP" means the documented requirement set does not yet cover the feature explicitly.

#### Community & Identity Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Discord server with structured channels per game/city/wellness topic | Every gaming community in 2026 lives on Discord; users won't onboard if not there | LOW | REQ-F006 — covered |
| Discord onboarding bot (welcome, role self-assignment, FAQ) | Users expect zero-friction guided entry; manual onboarding feels neglected | LOW | REQ-F007 — covered |
| Discord OAuth account linking ("1-Click") to PWA | Users will not create another username/password if Discord identity exists | MEDIUM | REQ-F008 — covered |
| User profile (display name, avatar, city, main games, pronouns optional) | Identity baseline; without it the platform is anonymous and untrustable | LOW | REQ-F019 — covered |
| Auto role assignment based on city + main game | Users expect Discord roles to reflect declared interests instantly | LOW | Implied REQ-F007 — verify in skill `community-ops.md` |
| One-tap report/block (in-app + Discord) | Post-2024 trust & safety baseline; women gamers (90% harassment rate) won't stay without it | LOW | Implied REQ-F032; **GAP**: explicit "report user" UX flow not in functional reqs — add |
| Public moderation policy + visibly enforced code of conduct | Without visible enforcement signals, La Gamer Mujer persona disengages within first session | LOW | Phase 0 community guidelines item — covered in PROJECT.md |
| Crisis resources visible on every surface ("Necesitas ayuda?") | 37% depression/anxiety rate in target audience; legal + ethical floor | LOW | REQ-F033 — covered |

#### Events Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Event listing with RSVP (web + Discord embed) | Luma normalized this in 2024-2026; ~2M people RSVP via Luma monthly. Anything less feels amateur | LOW | REQ-F009 — covered |
| QR code check-in at physical events | Luma made QR check-in table stakes for community events; manual lists feel 2010s | LOW | REQ-F010 — covered |
| Calendar invite (.ics) + WhatsApp/email reminder cadence (24h, 2h) | Standard event-platform flow; LATAM specifically expects WhatsApp | LOW | REQ-F012 — covered |
| RSVP without forcing app install (phone + name minimum) | Luma proved low-friction RSVP raises attendance; gating drives drop-off | LOW | UX journey 2.1 step 4 — covered, verify in implementation |
| Waitlist with auto-promote when capacity opens | Luma standard; users expect it for popular events | LOW | **GAP** — not in functional reqs, add |
| Post-event recap (photos, attendees, NPS survey) | Standard for community-builder platforms | LOW | REQ-F013 — covered |
| Offline check-in fallback (queue, sync later) | Outdoor LATAM venues have unreliable connectivity; without this, check-in fails publicly | MEDIUM | REQ-F036 — covered |

#### Gamification Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| XP / levels / badges with native gaming vocabulary | Every community platform with gamification has this in 2026 (Skool, Disco, Circle); gamers will mock generic "points" | MEDIUM | REQ-F023, REQ-F024 — covered |
| Streaks with bonus multipliers | 67% of top-ranking apps use streaks (2026 retention benchmark); Habitify/Headspace built retention on it | LOW | Implied in REQ-F023; **GAP**: explicit streak entity + streak-bonus rules not specified — add |
| Leaderboards (global, city, club, challenge) with opt-out | Strava's 2022 Challenges feature lifted 90-day retention 18%→32%; gamers expect competitive social proof | MEDIUM | REQ-F025 — covered |
| Tiered challenge difficulty (Bronce/Plata/Oro) | Without tiering, casual users disengage and competitive users find it trivial; both leave | MEDIUM | REQ-F026 + UX 2.3 — covered |
| Time-limited challenges (weekly/seasonal) with completion rewards | Battle-pass paradigm is the 2026 retention model | MEDIUM | REQ-F026 — covered |

#### Health Data & Wearables Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Wearable integration (Apple HealthKit, Android Health Connect) | Google Fit deprecated 2026 → Health Connect mandatory; Apple HealthKit is industry default | HIGH | REQ-F021 — covered |
| Manual data entry as first-class (NOT secondary) | 87% of LATAM gamers are mobile-first without wearables; wearable-only locks out the majority | LOW | UX 2.3 step 2 — covered, verify implementation does NOT degrade manual UX |
| Phone step counter (built-in pedometer) as zero-config baseline | Users expect their phone to "just work" without buying a $200 wearable | LOW | **GAP** — not explicit in functional reqs (REQ-F021 lists Open Wearables/HealthKit/Health Connect but not native phone pedometer); add |
| User-visible "what data we have on you" view | Post-GDPR/LOPDP norm; users expect data transparency dashboards | MEDIUM | UC-003 AF-3 — covered, but make REQ-explicit |
| Data export (JSON/CSV) — LOPDP right to portability | Legal mandate + user expectation post-2018 | MEDIUM | REQ-NF018 — covered |
| Account deletion with full data purge | LOPDP right to erasure + user expectation | MEDIUM | REQ-F030 — covered |

#### Consent Layer (Distinctive Table Stake for LATAM Health Data)

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Granular consent UI with individually toggleable categories | LOPDP enforcement (LigaPro $259K, FEF $195K Jan 2026) made this non-negotiable | HIGH | REQ-F027, REQ-F028, REQ-F031 — covered |
| Consent revocation with immediate processing cessation | LOPDP requirement; user expectation post-GDPR | HIGH | REQ-F028 — covered |
| Consent audit log (immutable, user-visible) | LOPDP requirement; differentiator for trust | MEDIUM | REQ-F029 — covered |
| Re-consent triggered on terms change (no passive accept) | Post-2024 regulator expectation across LATAM | LOW | UX 5.1 — covered; **GAP**: not in REQ-F set, add |

#### Content Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| SEO-optimized articles in Spanish (primary) + English | Nerd Fitness model: 405K backlinks, $0 ad spend = the LATAM organic-growth playbook | MEDIUM | REQ-F001, REQ-F003 — covered |
| Embedded YouTube/TikTok content in unified hub | Users expect a single content surface that aggregates the brand's social presence | LOW | REQ-F002 — covered |
| Bilingual ES/EN UI with gaming terms preserved in English | Riot LTA failure proved imported English-first kills LATAM engagement | MEDIUM | REQ-NF014 — covered |

#### B2B Dashboard Layer (Table stake for the B2B persona)

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Aggregated audience demographics + engagement metrics | Every brand/insurer dashboard since 2020 has this; without it, partners can't justify spend | MEDIUM | REQ-F014, REQ-F015 — covered |
| k-anonymity hard-gate on small cohorts | Post-Cambridge Analytica, partners *want* legal cover; Vitality+Google AI raised the analytics bar | HIGH | REQ-F016, REQ-NF010 — covered |
| Campaign approval workflow with editorial review | Brand safety baseline; partners expect human-in-loop for community sponsorships | MEDIUM | UC-004 — covered, formalize as REQ |
| PDF/CSV export of aggregated reports + compliance badge | Standard B2B dashboard expectation | LOW | UC-004 step 5 — covered |

#### Mobile / PWA Layer

| Feature | Why Expected (2026 baseline) | Complexity | Notes / Existing REQ |
|---------|------------------------------|------------|----------------------|
| Mobile-first responsive design (360px floor) | 87% of LATAM gamers are mobile-primary | LOW | REQ-NF014 + UX 6.2 — covered |
| PWA installable to home screen (no app-store gate) | Critical for users with limited phone storage; 2026 PWA capability is mature | MEDIUM | Phase 2 in PROJECT.md — covered |
| Push notifications (opt-in, per category) | Standard re-engagement mechanism; without it, retention drops 40%+ | MEDIUM | UX 2.1 step 7 — covered, verify per-category opt-in |
| Offline mode for event details + check-in | Outdoor venue connectivity reality | MEDIUM | REQ-F036 — covered |
| WCAG 2.1 AA accessibility | Public-platform baseline + LOPDP-adjacent inclusion expectation | MEDIUM | REQ-NF015 — covered |

---

### Differentiators (Competitive Advantage)

These features are not table stakes — competitors don't all have them — but each maps directly to the project's Core Value ("real community + wellness without surveillance/moralization") and creates a structural moat.

| Feature | Value Proposition | Complexity | Notes / Existing REQ |
|---------|-------------------|------------|----------------------|
| **IRL events as the wellness primitive** (3-tier: Meetups / General / Club Sessions) | HealthyGamer.gg has *no* IRL events. Discovery Vitality has no community. Strava has no gaming identity. Owning the gaming-IRL intersection in LATAM = uncopyable moat | HIGH | REQ-F009, UC-002 — covered |
| **Spanish-first, gaming-native voice** ("tú" universal LATAM, gaming terms preserved in EN) | Riot LTA (Sept 2025) proved imported globalized formats fail. First-mover Spanish-native = structural advantage over any future English entrant | LOW | REQ-NF014, UX 5.5 — covered |
| **Gaming-themed wellness narratives** ("Caminaste 4.2km — equivalente a cruzar Summoner's Rift 47 veces") | 80% of gamification fails at surface mechanics; behavioral framing in gaming language is what HealthyGamer.gg + Nerd Fitness proved works | MEDIUM | UX 2.2 step 6, UX 5.3 — covered in skill `challenge-framework.md` |
| **Character-sheet wellness visualization** (HP / Stamina / Mental / Social) | Reframes "health stats" as RPG identity; only SuperBetter does anything similar but without community | MEDIUM | UC-003 step 6 — covered |
| **Club formation workflow** (meetup → persistent club with own Discord channels + leaders) | Scalability engine: turns one-off meetups into self-sustaining sub-communities. None of the named competitors have this | HIGH | REQ-F011, UC-005 — covered |
| **Crisis intervention with licensed mental health partner + trained mods** | HealthyGamer.gg has clinical partners but no LATAM presence. Discord communities generally have no crisis protocol | HIGH | REQ-F032, REQ-F033, REQ-F034 — covered |
| **Peer wellness coaching framework** (non-clinical, trained, matched) | HealthyGamer.gg's $35-75/session coaching is 70% of their revenue. First in LATAM = pricing power | HIGH | Phase 3 in PROJECT.md — covered |
| **k≥50 anonymity gate visible to B2B partners** | Discovery Vitality + Google AI raised the analytics bar; the move is to compete on *trust*, not analytics depth. Visible compliance badge = differentiator | MEDIUM | REQ-NF010, UC-004 step 1 — covered |
| **B2B campaign builder requiring editorial approval** | Most ad networks let brands self-serve; editorial gate protects community trust + lets the platform shape narrative | MEDIUM | UC-004 step 3 — covered, formalize as REQ |
| **Wellness "character sheet" as B2B segment input** (without exposing individual data) | Partners segment by gaming-wellness persona (Active Movers, Social Connectors, Competitive Core, At Risk) — language no other platform speaks | MEDIUM | Skill `trust-safety.md` segments — covered |
| **NASEF-style wellness certification (B2B2C)** | NASEF launched at $499/license Sept 2025 with UNC; LATAM has zero equivalent. First-mover credential | HIGH | Phase 4 in PROJECT.md — covered |
| **Discord-as-tease, App-as-value** bridge design | Bot never replicates app functionality; teases (XP, leaderboard, challenge link). Forces conversion without feeling coercive | MEDIUM | UX 5.2 — covered in skill `community-ops.md` |
| **Multi-progression tracks** (Fitness / Social / Knowledge / Leadership) | Avoids the "competitive leaderboard alienates casual" trap; lets each persona find a track that fits | MEDIUM | UX 5.3 — covered, formalize in challenge-framework |
| **Female-safe-space design choices** (pronouns optional, attendee lists opt-in, photo-optional, anonymous reporting) | 90% LATAM women gamers report harassment; building safety as default = unlocks an under-served 50% of the market | LOW | UX 6.7 — covered |
| **First Ecuador gamer-health study** (academic credibility + media + B2B sales asset) | Zero published Ecuador-specific gamer health data exists; producing it = unique authority | MEDIUM | Recommendation 6 in expert-research-analyst.md — **GAP**: not in functional reqs, treat as marketing/research deliverable |
| **WhatsApp Business as middleware** (event reminders, post-event XP notifications, weekly resumen) | LATAM-specific; Discord+app users still expect WhatsApp for time-sensitive nudges | LOW | REQ-F012 — covered |

---

### Anti-Features (Deliberately NOT Built)

These are features that *would* seem natural to add but have been actively rejected for legal, strategic, or ethical reasons. Every feature here has an explicit "do not build" rationale already in `PROJECT.md` Out of Scope section, expert docs, or LATAM regulatory context — this section consolidates them so requirements definition can defend the "no" when stakeholders inevitably propose them.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **Data collection inside Discord (bot tracking messages, sentiment, behavior)** | Discord has 259M MAU and the conversations are right there — feels like wasted signal | Discord Developer Policy explicitly prohibits disclosing API Data to "data brokers, advertising networks, or monetization-related services." Violation = bot ban + community loss. Already locked in PROJECT.md and ADR-001 | All data collection happens on owned PWA; Discord bot is read-only bridge with zero data persistence beyond identity link |
| **Insurer-first revenue / B2B health data sales as primary engine** | The original intake positioned this as the core; insurer interest in gamer wellness is real | Akili ($1B → $34M, 97% destruction), Pear ($1.6B → bankruptcy), 12-24mo sales cycles incompatible with bootstrap. SPDP fines on adjacent orgs (LigaPro, FEF) prove enforcement is active. Already rejected in PROJECT.md | Phase 1-3 sustainability via sponsorships/events/memberships/coaching first. Insurer pilot is Phase 4 upside, never foundation |
| **Generic wellness gamification ("spin the wheel", "collect stars", corporate clip-art badges)** | Easy to ship, gamification engines have it built-in | 80% failure rate documented for surface-level gamification. Gamers can smell fake gamification instantly and will mock it publicly, killing trust | Gaming-native vocabulary (XP, levels, ranked tiers Bronce/Plata/Oro), in-game-style stat narratives, behavioral-design challenges with Bronce-floor + Oro-ceiling |
| **Clinical therapy / diagnosis / medical advice features** | Mental health is core to the value prop; "why not just do therapy?" | Crosses into Ministerio de Salud Pública licensing requirements; liability exposure if peer coach gives clinical advice; HealthyGamer's "subclinical" model proved this is the right line | Peer coaching (non-clinical, trained, matched), licensed mental health partner for crisis escalation, visible crisis lines on every surface |
| **Standalone game development / VR fitness hardware** | "We're a gaming company, build a game!" or "VR fitness is hot" | Out of scope per PROJECT.md; consumes engineering bandwidth; competes with the actual product (community + wellness platform); $1.5B→$4B VR fitness market is a distraction | Integrate with existing games via discord (game-cluster channels), integrate with wearables (incl. future VR via Open Wearables) without owning the hardware |
| **Pay-to-win XP / leaderboard boosts via premium membership** | Easy revenue lever; many SaaS communities do this | Gamers will revolt instantly; destroys trust in the gamification system; turns leaderboards into ad displays | Premium membership offers cosmetic/convenience benefits only (custom themes, priority RSVP for capacity-limited events, exclusive Discord roles, exclusive content) |
| **Real-name policy / mandatory profile photo / mandatory pronouns** | "Authenticity"; reduces bot accounts | Drives away La Gamer Mujer persona (90% harassment context); reduces signup conversion; LOPDP minimization principle disfavors mandatory PII | Display name (any), avatar optional, pronouns optional, attendee list opt-in. Verification via Discord OAuth is sufficient signal |
| **Auto-medical alerts from wearable data** ("Your HRV is low — see a doctor") | Looks helpful, technically possible | Crosses into medical device territory under Ecuadorian and broader LATAM regulation; liability if alert is wrong; trust collapse if alert is patronizing | UC-008 AF-4: surface relevant content + crisis resources for severe patterns, no diagnosis, no automated medical alerts |
| **Individual-level data exposure to B2B partners (even with consent)** | Partners ask for it constantly; would command premium pricing | k-anonymity is mathematically impossible to guarantee at individual level in Ecuador's small population; LOPDP fines + reputational nuke risk; no partner contract is worth the company | k≥50 enforced hard gate; aggregated segments only; partner education on why aggregate-only is more legally defensible for *them* |
| **Cross-Discord-server data harvesting** (track members across other servers) | "We could see who's also in [esports server]" | Violates Discord TOS and user expectation; turns the bot into a surveillance tool | Stay strictly within own server scope; identity bridge via Account Linking only |
| **Social-graph features mirroring Facebook (friend requests, follows, DMs)** | "Communities need social features" | Discord already provides DMs, voice, friends; rebuilding it on the platform = bloat + maintenance burden + harassment vector | Use Discord as the social layer; PWA shows attendee lists + leaderboards (opt-in) but no DM / follow primitives |
| **AI chatbot mental-health assistant** | LLMs are cheap, "scales coaching" | Liability if it gives bad advice; HealthyGamer.gg explicitly avoids this; mental health audiences are sensitive to inauthentic care | Human peer coaches (Phase 3), licensed partner for clinical, AI used only for content tagging / moderation triage |
| **Daily-check-in nag notifications** ("You haven't logged in for 2 days!") | Engagement-loop reflex | Drives churn in wellness apps (documented in Calm/Headspace decline); reads as surveillance | Event-driven nudges only (your event is in 24h, your challenge ends tomorrow), opt-in per category, with hard frequency caps |

---

## Feature Dependencies

```
Phase 0: Legal Foundation
  ├── DPO appointment ──required-by──> ANY data collection
  ├── DPIA filed ──required-by──> Wearable + health survey + B2B dashboard
  └── Crisis protocol + licensed partner ──required-by──> Discord launch (community goes live)

Phase 1: Community Foundation
  Discord server + onboarding bot
    └── enables ──> Event RSVP via Discord
                      └── enables ──> QR check-in at events
                                        └── enables ──> Phase 2 platform conversion via QR

Phase 2: Platform MVP
  PWA + Firebase Auth
    └── required-by ──> Discord OAuth account linking
                          └── required-by ──> User profile / XP / Badges
                                                └── required-by ──> Wellness challenges (XP rewards)
                                                                      └── enhanced-by ──> Wearable integration
                                                                                            └── requires ──> Granular consent UI (categories e/f)
                                                                                                              └── requires ──> Consent audit log
                                                                                                                                └── requires ──> Data export + erasure flows
  PWA + Event management
    └── required-by ──> QR check-in (digital)
                          └── enhanced-by ──> Offline check-in fallback
                          └── enhanced-by ──> Post-event survey + recap

Phase 3: Revenue + Data
  Granular consent UI
    └── required-by ──> B2B partner dashboard (only consented users feed exports)
                          └── requires ──> k-anonymity validator (k≥50 hard gate)
                                            └── requires ──> BigQuery export pipeline from Firestore
                                                              └── required-by ──> Metabase dashboard
                                                                                    └── enables ──> Sponsored challenges + branded activations
                                                                                                      └── requires ──> Campaign approval workflow (editorial)

  User profile + XP
    └── required-by ──> Premium membership tier (cosmetic upgrades hook)
    └── required-by ──> Club formation (meetups → persistent clubs)
                          └── requires ──> Club Captain tools + training (skill: community-ops)
                                            └── enhanced-by ──> Moderator dashboard + crisis training

Phase 4: Scale
  Multi-country consent architecture (Phase 3 consent + per-country toggles)
    └── required-by ──> Colombia / Mexico market entry
                          └── requires ──> Localized crisis lines + partner per country
                                            └── enables ──> NASEF-style certification across LATAM
  Anchor B2B partner pilot (Phase 3 dashboard + segments)
    └── required-by ──> Insurer pilot (Aseguradora del Sur, co-creation)
                          └── requires ──> Enterprise API (rate-limited, audited)

CONFLICTS (do NOT combine in same phase):
  Discord data collection ⨯ Discord bot of any kind (TOS violation)
  Insurer B2B revenue ⨯ Phase 1-2 (sales cycle 12-24mo, kills bootstrap)
  Wearable-required challenges ⨯ launch (locks out 87% mobile-only users)
  Real-name policy ⨯ female-safe-space design (mutually exclusive)
```

### Dependency Notes

- **DPO + DPIA gate everything that touches health/behavioral data.** Phase 2 wellness features cannot ship without Phase 0 complete. Roadmap must enforce this hard.
- **Discord OAuth Account Linking is the linchpin** between Phase 1 (community) and Phase 2 (platform). If linking fails or is high-friction, the entire conversion funnel collapses (Risk #3 in PROJECT.md: Discord-to-App < 15%).
- **Granular consent UI is a hard gate for B2B revenue.** Without consent categories (g) for insurer / (h) consumer brand sharing, the B2B dashboard has zero data to show. Build consent before dashboard, not after.
- **k-anonymity validator must run server-side as a hard gate**, not a UI hint. Any export/query where cohort < 50 must return empty + audit log entry, not "limited data."
- **QR check-in conflicts with poor venue connectivity** (LATAM outdoor reality). Offline fallback is not optional — it's the difference between "works" and "embarrasses the brand at the event."
- **Premium membership ⨯ Pay-to-win XP** is the most dangerous conflict. Memberships must be cosmetic/convenience only; if revenue pressure pushes XP boosts, the gamification trust collapses.

---

## MVP Definition

### Launch With (v1 = Phase 1 Community Foundation, Mo 1-4)

Zero-code only. No app yet. Community must validate before any platform investment. Kill criterion in PROJECT.md: if first 3 meetups don't reach 15+ attendees, fix product-market fit before building.

- [ ] Discord server with full IA structure (channels for game / city / wellness / events / clubs)
- [ ] Discord onboarding bot (welcome, role self-assignment, FAQ, crisis resource link)
- [ ] Mobile-optimized landing page (Carrd / Framer / static) with event listing + Discord join CTA
- [ ] Social media presence: TikTok + Instagram + YouTube (bilingual ES/EN)
- [ ] Event listing + RSVP via Luma or similar (no custom platform yet)
- [ ] WhatsApp Business broadcast list for event reminders
- [ ] QR check-in via Luma or printed QR → Google Form (interim)
- [ ] Crisis resources + community guidelines published, visible everywhere
- [ ] Trained volunteer mods (5-3) + licensed mental health partner contact

### Add After Validation (v1.5 = Phase 2 Platform MVP, Mo 4-10)

Trigger: 500 Discord members + 30% DAU/MAU + 15+ avg meetup attendance achieved.

- [ ] Vue 3 PWA + Firebase backend + Discord OAuth account linking
- [ ] User profile (display name, avatar, city, main games, level, XP, badges)
- [ ] Granular consent UI (Layers 0-2: account + event tracking + activity data)
- [ ] Event management (3 tiers: Meetups / General / Club Sessions) with QR check-in
- [ ] Wellness challenges (manual entry first, wearable enhancement)
- [ ] Streak tracking with bonus multipliers ← **GAP from existing reqs, add explicitly**
- [ ] Community leaderboards (opt-in, tiered)
- [ ] Wearable integration (Apple HealthKit + Health Connect + Open Wearables) + native phone pedometer ← **phone pedometer is GAP, add**
- [ ] Content hub (articles + embedded YouTube, SEO-optimized)
- [ ] Discord bot integration (event announcements, XP teasers, challenge links — read-only)
- [ ] Push notifications (per-category opt-in)
- [ ] Offline check-in fallback
- [ ] Waitlist with auto-promote ← **GAP, add**
- [ ] Re-consent on terms change ← **GAP, add**
- [ ] Data export (JSON/CSV) + account deletion flow
- [ ] PostHog (self-hosted) + Firebase Analytics

### Future Consideration (v2+ = Phase 3-4)

Trigger: 1,500 app users + 40% Discord-to-app conversion + first revenue.

- [ ] B2B partner dashboard (Metabase via BigQuery export) with k≥50 hard gate
- [ ] Consent Layers 3-4 (wellness profile + per-partner sharing toggles)
- [ ] Sponsored challenges + branded activations + campaign approval workflow
- [ ] Premium membership tier (Stripe, $3-5/mo, cosmetic-only benefits)
- [ ] Club management self-service tools (Club Captain dashboard)
- [ ] Moderator dashboard + crisis training module
- [ ] Peer coaching framework (training curriculum + matching + scheduling)
- [ ] Anchor B2B partner pilot (consumer brand or telecom — NOT insurer)
- [ ] Multi-country consent architecture (Colombia, Mexico)
- [ ] NASEF-style wellness certification
- [ ] Enterprise API (rate-limited, audited)
- [ ] Insurer pilot (Aseguradora del Sur, co-creation only — Phase 4)

---

## Feature Prioritization Matrix

Combines user value (across personas) with implementation cost. Cross-references existing UX matrix in expert-product-ux.md §3 — this is a *re-derivation* using 2026 ecosystem evidence to validate the original prioritization.

| Feature | User Value | Implementation Cost | Priority | Phase |
|---------|------------|---------------------|----------|-------|
| Discord server + structured channels | HIGH | LOW | P1 | 1 |
| Discord onboarding bot | HIGH | LOW | P1 | 1 |
| Landing page + event listing | HIGH | LOW | P1 | 1 |
| WhatsApp event reminders | HIGH | LOW | P1 | 1 |
| QR event check-in (Luma interim) | HIGH | LOW | P1 | 1 |
| Crisis resources visible everywhere | HIGH (legal) | LOW | P1 | 1 |
| Trained mods + crisis partner | HIGH (legal) | MEDIUM | P1 | 1 |
| Vue 3 PWA + Firebase + Discord OAuth | HIGH | MEDIUM | P1 | 2 |
| Granular consent UI (Layers 0-2) | HIGH (legal) | HIGH | P1 | 2 |
| User profile + XP + badges + levels | HIGH | MEDIUM | P1 | 2 |
| Streaks + bonus multipliers | HIGH | LOW | P1 | 2 |
| Event management (3-tier) + QR check-in (custom) | HIGH | MEDIUM | P1 | 2 |
| Wellness challenges (manual + tiered) | HIGH | MEDIUM | P1 | 2 |
| Native phone pedometer baseline | HIGH | LOW | P1 | 2 |
| Wearable integration (HealthKit/Health Connect) | HIGH | HIGH | P1 | 2 |
| Community leaderboards (opt-in) | MEDIUM | MEDIUM | P1 | 2 |
| Push notifications (opt-in) | MEDIUM | LOW | P1 | 2 |
| Offline check-in fallback | MEDIUM | MEDIUM | P1 | 2 |
| Waitlist with auto-promote | MEDIUM | LOW | P2 | 2 |
| Content hub (articles + YouTube embed) | MEDIUM | MEDIUM | P2 | 2 |
| Discord bot integration (read-only) | MEDIUM | MEDIUM | P2 | 2 |
| Consent revocation + audit log + data export | HIGH (legal) | HIGH | P1 | 2 |
| Re-consent on terms change | MEDIUM (legal) | LOW | P2 | 2 |
| B2B dashboard + k≥50 gate (Metabase) | HIGH (B2B) | HIGH | P2 | 3 |
| Sponsored challenges + campaign approval | HIGH (B2B) | MEDIUM | P2 | 3 |
| Consent Layers 3-4 (partner sharing) | HIGH (legal+revenue) | MEDIUM | P2 | 3 |
| Premium memberships (cosmetic-only) | MEDIUM | MEDIUM | P2 | 3 |
| Club management tools | MEDIUM | MEDIUM | P2 | 3 |
| Moderator dashboard + crisis training module | MEDIUM | MEDIUM | P2 | 3 |
| Peer coaching framework | HIGH | HIGH | P2 | 3 |
| Anchor B2B pilot (brand/telecom) | HIGH | MEDIUM | P2 | 3 |
| Multi-country consent + market entry | HIGH | HIGH | P3 | 4 |
| NASEF-style certification | MEDIUM | HIGH | P3 | 4 |
| Enterprise API | MEDIUM (B2B) | HIGH | P3 | 4 |
| Insurer pilot (co-creation, not commodity) | HIGH (revenue) | HIGH | P3 | 4 |

**Priority key:**
- P1: Must have for the phase to be considered shipped
- P2: Should have, ship within phase if capacity allows
- P3: Nice to have, defer freely

---

## Competitor Feature Analysis

| Feature | HealthyGamer.gg | Nerd Fitness | Discovery Vitality | SuperBetter | Strava | NASEF | Zen Gamer | Our Approach |
|---------|-----------------|--------------|--------------------|-------------|--------|-------|-----------|--------------|
| Gaming identity as core | Yes (mental health for gamers) | No (broader "nerd") | No | No | No | Yes (esports) | Yes (mindfulness for gamers) | Yes — Spanish-first gaming-native voice |
| IRL events | No | No | No | No | Limited (group rides) | Yes (school events) | No | **Yes — 3-tier event system as primary wellness primitive (differentiator)** |
| Discord-native community | Yes (live events in Discord) | No (forum/FB) | No | No | No (own social) | No | No | Yes — Discord as community hub, app as data layer |
| Wearable integration | No | No | Yes (funded Apple Watch / Oura / Garmin) | No | Yes (deep) | No | No | Yes — HealthKit + Health Connect + Open Wearables + phone pedometer |
| Consent / privacy granular UI | Standard | Standard | Standard | Standard | Standard | n/a | Standard | **HIGHEST — LOPDP-driven 10-category granular, individually revocable, audit-logged (differentiator + legal mandate)** |
| Coaching | Yes (peer + group, $35-75/session) | Yes (paid programs) | No | No | No | No | No | **Yes — peer wellness coaching Phase 3 (HealthyGamer model adapted for LATAM)** |
| Gamification mechanics | Light (progress, content unlocks) | Medium (RPG-themed workouts) | Heavy (status tiers, premium reductions) | **Heavy (Quests, Power-Ups, Bad Guys, Allies)** | Medium (Challenges, KOMs, segments) | Certification as gamification | Light (streaks) | **Heavy — XP/levels/badges/streaks/leaderboards/tiered challenges with gaming-native vocabulary** |
| Streaks | No | No | Yes | No | Yes | No | Yes | **Yes — explicit streak entity + bonus multipliers (GAP from existing REQ-F set, must add)** |
| Tiered challenges (Bronze/Silver/Gold) | No | No | Yes (status tiers) | No | Yes | n/a | No | **Yes — Bronce/Plata/Oro per challenge, prevents casual-vs-competitive alienation** |
| B2B data dashboard | No | No | Yes (insurer-internal only) | Yes (B2B2C licenses) | Yes (Strava Metro for cities) | Yes (license sales) | No | Yes — Metabase + BigQuery export with k≥50 hard gate, Phase 3+ |
| Crisis intervention with licensed partner | Yes (clinical referrals) | No | No | No | No | Yes (school context) | No | **Yes — LOPDP + ethical mandate, licensed partner + trained mods + visible resources (differentiator in LATAM)** |
| LATAM Spanish-first | No | No | Limited (Argentina/Brazil via Prudential) | No | Some | No | No | **Yes — Spanish-primary, "tú" universal LATAM, gaming terms preserved EN (structural moat)** |
| Club / sub-community formation | Yes (skill groups) | No (single community) | No | No | Yes (clubs feature) | No (school chapters) | No | **Yes — meetup → persistent club workflow with leadership tools (scalability engine)** |
| Female-safe-space defaults | Standard | Standard | Standard | Standard | Standard | Standard | Standard | **Yes — pronouns optional, photos optional, attendee opt-in, anonymous reporting (under-served 50% market)** |
| Bilingual UI (ES/EN) | EN only | EN only | Multi (not LATAM-focused) | EN + limited | Multi | EN + JP | EN only | **Yes — ES primary, EN toggle, gaming terms in EN universally (validated by Riot LTA failure)** |
| Pricing model | Coaching + memberships, no VC | Programs + community | B2B insurer, B2C members | B2B2C licenses + freemium | Freemium + premium subs | $499/license B2B2C | Freemium + premium | Free community + Phase 3 memberships ($3-5/mo) + sponsorships + B2B (Phase 3+) |

**Key differentiation pattern:** No single competitor combines (a) IRL events, (b) Discord-native community, (c) wearable+health data, (d) gaming identity, (e) Spanish-first LATAM voice, and (f) LOPDP-grade consent. The opportunity is the *combination*, not any single feature.

---

## Gaps Identified vs. Existing 36 Functional Requirements

These are features that 2026 industry table stakes / competitor analysis surfaced as expected, but which are **not explicitly captured** in the existing REQ-F001..F036 set in `expert-business-analyst.md`. Requirements definition should decide whether to absorb each into a new REQ or leave as implementation detail.

| Gap | Source of expectation | Suggested REQ category |
|-----|----------------------|------------------------|
| **Streak entity + streak-bonus rules** explicitly modeled (data model + XP rules) | 67% of top retention apps in 2026; Habitify/Headspace baseline | Functional — gamification |
| **Native phone pedometer integration** as zero-config baseline (independent of wearable connection) | 87% LATAM mobile-only users; iOS Motion API + Android Sensor API standard | Functional — wearable/health |
| **Waitlist with auto-promote** when capacity opens | Luma table stake since 2024 | Functional — events |
| **Re-consent on terms change** (active acceptance, not passive continuation) | LATAM regulator expectation post-2024 | Functional — consent |
| **One-tap report-user UX flow** (in-app + Discord, with anonymity to reported user) | 90% women-gamer harassment context; trust & safety baseline | Functional — trust & safety |
| **User-visible "data we have on you" dashboard** (separate from raw export) | Post-GDPR/LOPDP norm; user trust signal | Functional — consent / transparency |
| **Editorial campaign approval workflow** as a first-class B2B-side feature (with SLA) | UC-004 mentions it but no REQ formalizes it | Functional — B2B |
| **First-Ecuador gamer-health study** as a deliverable (academic + B2B sales asset) | Recommendation 6 in expert-research-analyst.md | Project deliverable (not platform feature) — track separately |
| **WhatsApp Business middleware** for users who resist app install | LATAM-specific UX layer per UX 5.2; REQ-F012 covers reminders but not the "lightweight bridge" pattern | Functional — communications |
| **Multi-progression tracks** (Fitness / Social / Knowledge / Leadership XP categories) | UX 5.3 design principle; not in REQ-F023 which treats XP as scalar | Functional — gamification (data model decision) |

---

## Sources

### Primary project documents (re-read for this research)
- `.planning/PROJECT.md` — project context, constraints, Out of Scope
- `StartData/output/project-definition.md` — §4 use cases, §10 operational skills
- `StartData/output/expert-business-analyst.md` — full functional + NFR list (REQ-F001..F036, REQ-NF001..F019)
- `StartData/output/expert-product-ux.md` — 6 personas, 4 user journeys, feature prioritization matrix in §3
- `StartData/output/expert-research-analyst.md` — competitor analysis (HealthyGamer, Nerd Fitness, Discovery Vitality, SuperBetter, Strava, NASEF, Zen Gamer, AEDE/Kubox, Calm/Headspace, Mujeres en VG)

### Competitor product surfaces examined
- HealthyGamer.gg — products & resources, memberships, coaching tiers (verified 2026 features: live Discord events, MAYke It / Touch Grass community challenges, group/personal/career/creator coaching, guided meditations)
- Discovery Vitality — Vitality AI partnership with Google Cloud (Nov 2025), Apple Watch / Oura Ring 4 / Garmin funding, status tiers
- SuperBetter — Quests, Power-Ups, Bad Guys, Allies (verified 2026)
- Strava — Challenges feature (90-day retention 18%→32% lift, 2022), KOM/segments, Metro API for B2B
- NASEF — Esports Health & Wellness Certification ($499/license, Sept 2025, with UNC School of Medicine)
- Zen Gamer — mindfulness-only, EN-only, July 2025 launch
- Nerd Fitness — 405K backlinks, $0 ad spend, identity-first community model
- Luma — QR check-in, ~2M monthly RSVPs, waitlist + auto-promote standard

### 2026 industry signals
- Top community gamification platforms 2026 (Disco, Circle, Skool, Mighty Networks, Bettermode) all converged on points + badges + leaderboards + streaks as table stakes
- Streak-based motivation: 67% of top-ranking apps in 2026; gamification adoption +41% with -18% abandonment
- Wearable cross-device syncing: +33%; wearable habit-tracker users >118M globally
- Discord teen-appropriate mode default (March 2026) — affects all community content design
- Google Fit API deprecated 2026 → Health Connect mandatory on Android

### Regulatory / legal sources
- Ecuador LOPDP — health data sensitive classification, mandatory DPO + DPIA
- SPDP enforcement: LigaPro $259K, FEF $195K (January 2026)
- Discord Developer Policy — prohibition on disclosing API Data to data brokers / advertising / monetization

### Confidence notes
- **HIGH** confidence on table stakes (cross-validated across 5+ sources per feature)
- **HIGH** confidence on anti-features (every one is documented in PROJECT.md Out of Scope or expert docs with explicit rationale)
- **MEDIUM** confidence on the 10 GAP items (derived from 2026 industry signals + 1 competitor each; recommend requirements analyst confirm before adding to REQ-F set)
- **HIGH** confidence on competitor matrix (sourced from competitor product pages and the existing expert-research-analyst.md)

---
*Feature research for: Gaming + Wellness Community Platform (LATAM, Ecuador launch)*
*Researched: 2026-04-27*
*Cross-checked against: 36 functional requirements (REQ-F001..F036) + 19 NFRs (REQ-NF001..F019) in expert-business-analyst.md*
