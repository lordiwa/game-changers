# Pitfalls Research

**Domain:** Gaming + Wellness Community Platform (Vue 3 + Firebase, Ecuador launch, LATAM scale)
**Researched:** 2026-04-27
**Confidence:** HIGH on stack-specific (verified against current Firebase/Vue docs); HIGH on LOPDP (verified against Lexology, OlarteMoure, CorralRosales 2025-2026 publications); MEDIUM on community/operational (synthesized from documented post-mortems + industry research)

## Scope of This Document

This file does **not** re-list the 10 risks in `StartData/output/expert-project-manager.md` or the 10 LOPDP threats in `expert-security-compliance.md`. Those remain authoritative for top-line strategic risks (community formation failure, founder burnout, insurer B2B failure pattern, Discord TOS bot ban, generic LOPDP enforcement, etc.).

What is captured here:

- **VALIDATIONS** — confirms a documented risk is still accurate as of 2026-04 with refined detail
- **NEW** — pitfalls not covered by existing StartData docs
- **STACK-SPECIFIC** — Vue 3 + Firebase pitfalls absent from existing docs (which were written when Supabase + NestJS was the proposed stack)

The 9 critical pitfalls below are **net new or substantially refined** beyond the existing risk registers.

---

## Critical Pitfalls

### Pitfall 1: Firestore Security Rules as the ONLY consent enforcement layer (NEW — STACK-SPECIFIC)

**What goes wrong:**
Firestore Security Rules are evaluated as **OR statements across matching paths**, not AND. A consent rule on `/users/{uid}/wellness/{doc}` can be silently overridden by a broader rule on `/users/{uid}/{document=**}` written for a different feature. The Cloud Function trigger model also bypasses rules entirely — a function with admin SDK credentials can write health data regardless of consent state. The team assumes "Security Rules = consent enforcement" (per `project-definition.md` §5: "Firestore Security Rules for consent enforcement"), but Cloud Functions running gamification logic are a complete bypass surface.

**Why it happens:**
The Supabase RLS model (referenced in older expert docs) uses PostgreSQL policies that are compositional and AND-based. Firestore Security Rules look syntactically similar but have fundamentally different semantics (OR composition, no joins, no `current_setting()` equivalent for runtime context). Teams migrating mental models from RLS to Firestore Security Rules write rules that look correct but fail open. Additionally, every `functions.https.onCall` and Firestore trigger uses admin credentials by default — they don't inherit user permissions.

**How to avoid:**
1. **Two-layer enforcement**: Firestore Security Rules for client-direct writes + a `consentGate` middleware that wraps every Cloud Function reading/writing personal data. The middleware queries the immutable consent ledger before allowing the operation.
2. **Single-rule-per-path discipline**: avoid wildcard `{document=**}` rules on user collections. Maintain a flat ACL document model.
3. **Rules unit tests**: Firebase Emulator Suite + `@firebase/rules-unit-testing` — write a test for every consent category + every revocation scenario. Block CI on coverage <90%.
4. **Audit log on every Function entry**: who called, what consent state was at call time, what was written. Append-only Firestore collection (also exported to BigQuery for SPDP audits).
5. **Document the consent contract as code**: a TypeScript `ConsentEnforcement.ts` shared module that both Security Rules generation (via codegen) and Functions reference. Single source of truth.

**Warning signs:**
- A developer writes `allow read, write: if request.auth != null;` "temporarily"
- Cloud Functions code reviews don't include "consent gate verified" line item
- Rules file exceeds 200 lines without tests
- Any wildcard match path on a personal-data collection

**Phase to address:**
**Phase 2 (Platform MVP)** — must be designed before first health data write. Block Phase 2 milestone "consent management UI live" until rules tests + Function gate middleware exist.

---

### Pitfall 2: Firestore reads cost overrun via reactive listeners on community feeds (NEW — STACK-SPECIFIC)

**What goes wrong:**
A "live leaderboard" component using `onSnapshot` with a 50-doc limit, mounted on every page header for 1,500 active users, generates **billions of read-doc events/month** as documents change. Real-time XP updates on the profile page that users keep open in a tab compound the problem. Total cost at MVP scale (~1,500 users, modest activity): the documented $25-100/mo target balloons to $400-2,000/mo. This is the modal Firebase failure pattern in 2026 — Cando Consulting and Airbyte both flag Firestore reads as the dominant cost driver, with "well within free tier" jumping to "millions of operations/month" on minor activity changes.

**Why it happens:**
Vue 3's reactive bindings + `useFirestore` composables make `onSnapshot` feel free. Each `onSnapshot` listener counts every document delivered (initial load + every change for the listener's lifetime) as a billable read. Open the leaderboard in two tabs, that's 2x the cost. A single user with the app open all day could generate 10K reads/day if upstream activity is high. Bootstrapped budget assumed naive cost models.

**How to avoid:**
1. **No `onSnapshot` on aggregate/feed surfaces** — use one-shot `getDocs` with TTL caching (5-15 min). Reserve real-time for 1:1 chat-like surfaces only (which we don't have — Discord owns chat).
2. **Aggregate documents**: maintain a denormalized `/leaderboards/{period}` document updated by a scheduled Function (every 15 min), not computed on read. One read per leaderboard view, not 50.
3. **Pagination + cursor-based fetching** for activity feeds. Hard cap initial page at 20 docs.
4. **Firestore bundle API** for static-ish content (event lists older than 24h).
5. **Hard budget alerts** at $50, $100, $200/mo (50%/100%/200% of MVP target). GCP Budget API → Slack/email. Configure on day 1, before any data exists.
6. **Disable `onSnapshot` in `dev` builds without explicit opt-in** — eslint rule or wrapper that warns.
7. **Track reads-per-DAU as a product KPI** in PostHog dashboards. If it crosses 500 reads/DAU, refactor.

**Warning signs:**
- Any component imports `onSnapshot` and is rendered above-the-fold or in app shell
- A Firebase Console "Usage" tab showing >100K reads/day at <500 DAU
- Cloud Functions invocation count growing faster than user count
- Bills crossing 2x infra budget without traffic spike

**Phase to address:**
**Phase 2 (Platform MVP)** — architecture decision before the first feature is built. Add to ADR list as ADR-008 "Firestore read budget discipline."

---

### Pitfall 3: SPDP "Comprehensive Personal Data Protection System" (SPDP-the-system) deadline conflated with SPDP-the-regulator (NEW — VALIDATION + REFINEMENT of LOPDP risk)

**What goes wrong:**
Per Lexology (2026) and CorralRosales (Aug 2025), Ecuador required all personal-data-handling organizations to implement an **internal "Comprehensive Personal Data Protection System (SPDP)"** by **December 31, 2025**. This is a documented internal compliance program (policies, procedures, registers, training records, incident response) — distinct from the regulator (Superintendencia de Protección de Datos, also abbreviated SPDP). The DPIA is one component; the System is the encompassing framework. As of January 2026, organizations without a documented System are in violation regardless of whether they've collected data yet. The existing project docs reference "DPIA filed" as the trigger but understate the broader internal-system requirement that was already enforceable when this project starts.

**Why it happens:**
Two things abbreviated "SPDP" — the regulator (Superintendencia) and the System (Sistema de Protección de Datos Personales). English-language sources (and AI training data) often conflate them. The Dec 31, 2025 deadline already passed when this project starts (2026-04); a project incorporated post-deadline must demonstrate a System from day one of legal entity existence, not as a forward-dated deliverable.

**How to avoid:**
1. **Phase 0 deliverable expansion**: not just "DPO appointed + DPIA filed" but a **documented SPDP System** including: data processing register, retention schedules, DSAR procedure, breach response plan, training plan, vendor data processing agreements (DPAs), DPIA template.
2. **Engage Ecuadorian privacy counsel that has filed at least one System with the regulator** (LigaPro/FEF cases produced a wave of consultancies — vet them, they vary in rigor).
3. **Before legal entity formation**: have a System draft ready so it ships within 30 days of incorporation, not 6 months later.
4. **Internal training log**: even a 1-person team must document founder + first volunteers received privacy training — auditable artifact.
5. **Vendor DPA inventory**: Firebase, Discord, Stripe, PostHog, Resend, etc. — each needs a signed DPA referencing LOPDP. Firebase's standard DPA covers GDPR; verify LOPDP coverage or supplement.

**Warning signs:**
- "We'll do compliance after we have users" thinking
- Privacy counsel quotes <$1,500 for the full Phase 0 work (likely insufficient depth)
- DPA inventory missing for any third party that touches user-identifiable data (including Discord IDs)
- No evidence of internal training even for a 1-person team

**Phase to address:**
**Phase 0 (Legal Foundation)** — expand the existing DPO+DPIA deliverable set. Block Phase 1 milestone "first event" until the System is documented (even if filed-but-pending review).

---

### Pitfall 4: Discord-to-app conversion funnel friction at the consent step (NEW — REFINEMENT of conversion risk)

**What goes wrong:**
The roadmap targets 40% Discord-to-App conversion by end of Phase 2. The dominant industry pattern (per Communipass 2026 and the broader migration literature): communities that ask for consent before delivering value lose 60-80% at that step. Combined with the 10-30% baseline drop from "Discord users don't switch platforms easily" (RestoreCord 2026 migration data), realistic conversion without funnel discipline is 5-15%, not 40%. The project's plan to use "QR check-in at events" as the forcing function is correct but undermined if the consent UI appears before the QR check-in completes (i.e., before the user gets their XP).

**Why it happens:**
LOPDP-trained legal counsel will reflexively want consent gates BEFORE first interaction. Engineers will design "consent on signup" because that's the standard pattern. Both are wrong here — the project-definition.md §UC-1 explicitly says "Consent is presented after the first value moment (XP credit)" but this requires architectural support (anonymous account → consent → identified account) that's easy to skip.

**How to avoid:**
1. **Anonymous-first auth**: Firebase Anonymous Auth on first app open. User gets a temporary UID, can scan QR, gets XP credited to anonymous account, sees their badge — THEN consent layer 1 (account creation, link Discord) appears.
2. **Consent layers truly progressive**: Layer 0 (anonymous, no PII) → Layer 1 (account, basic profile) → Layer 2 (wellness data) → Layer 3 (B2B sharing). Each layer gates only the features that require it. Refusing Layer 2 must NOT lock users out of events/community/XP.
3. **Funnel instrumented from day 1**: PostHog events at every step (`app_open`, `qr_scanned`, `xp_awarded`, `consent_l1_shown`, `consent_l1_granted`, `consent_l1_declined`, `account_created`). Watch the L1 conversion specifically.
4. **A/B test consent copy** (within LOPDP legal-equivalence constraints) — wording impact on consent rates is documented as ±20%.
5. **"Continue without account" as a first-class option** that still credits XP locally (synced when/if account created later).
6. **Kill the 40% target if consent grant rate < 60%** — go back to product/UX before pushing more users in.

**Warning signs:**
- Funnel data shows >50% drop between `qr_scanned` and `consent_l1_granted`
- PMs propose "we'll just require an account at QR scan" — this resets the funnel break to step 1
- Consent UI appears as a full-screen modal before any value delivered
- Discord members joining the app then never opening it again (likely they hit consent wall and bounced)

**Phase to address:**
**Phase 2 (Platform MVP)** — design the funnel architecture before building. Re-validate in Phase 3.

---

### Pitfall 5: Surface-mechanic gamification ("XP for everything") in a gaming-native audience (NEW — REFINEMENT of "80% gamification fails")

**What goes wrong:**
Generic apps fail with surface mechanics because users see through cheap rewards. Gaming-native audiences fail **harder and faster** — gamers have spent thousands of hours in Riot/Blizzard/Valve loot systems and instantly recognize "fake gamification." A wellness XP that doesn't unlock anything tangible, badges that don't have visible status, leaderboards that aren't tied to real social capital — gamers register this as cringe and disengage at higher rates than non-gamer users would. The 80% surface-failure rate likely understates the gamer-audience risk.

**Why it happens:**
Designing gamification for gamers requires gamification literacy: understanding loot boxes, battle passes, season resets, prestige systems, achievement frameworks (Steam/Xbox/PSN), and the meta-language gamers use to describe these (e.g., "the grind," "P2W," "FOMO mechanics," "skinner box"). A team that ships generic point/badge/leaderboard mechanics broadcasts "we don't actually play games." This is brand-fatal in a community defined by gaming identity.

**How to avoid:**
1. **Recruit a gamification consultant/designer who is also a competitive/long-term gamer** — at least one Phase 2 design review by someone who has a 1000+ hour Steam library and reads /r/truegaming.
2. **Anchor mechanics in real status, not abstract points**: visible badges in Discord (synced via the read-only bridge), priority access to limited events, club captain progression with real responsibility, named achievements with provenance.
3. **Season-based progression** (per `challenge-framework` skill) — XP resets each season, prevents whale dominance, gives lapsed users a fresh start.
4. **Anti-patterns enforced in code review**: no leaderboards that can be gamed by manual entry, no XP for trivial actions (opening the app, viewing a page), no "log in for XP daily" Skinner box that creates FOMO.
5. **Test with a gamer focus group BEFORE shipping**: 5 Discord members from the founding cohort, hour-long playtest, watch their faces. If they laugh at the XP system, fix it.
6. **Narrative > numbers**: "Caminaste 4.2km — equivalente a cruzar Summoner's Rift 47 veces" is the right move (already in `challenge-framework`). Extend this discipline to every numeric reward.

**Warning signs:**
- Design docs use "points" without specifying what they unlock
- Badges are SVG icons without lore/story
- Discord screenshots from beta show mockery of the XP system
- Founding members opt out of leaderboards (they should be the most engaged)

**Phase to address:**
**Phase 2 (Platform MVP)** — design discipline. **Phase 1** for community feedback that informs design (test rough ideas in Discord polls before building).

---

### Pitfall 6: k-anonymity with k≥50 enforced only at query time, not at schema time (NEW — REFINEMENT of re-identification risk)

**What goes wrong:**
The k≥50 rule (ADR-007) prevents B2B partners from querying segments smaller than 50 users — but if quasi-identifiers (game preference + city + age band + activity tier) are stored in their original cardinality, a partner running 20 queries can triangulate. Worse: BigQuery exports of raw Firestore data preserve full cardinality. A Metabase analyst with admin access (DPO, data analyst, even a B2B partner with broader-than-intended permissions) can bypass the application-level k-anonymity gate by querying the underlying tables directly. The rule isn't enforced; it's *requested*.

For Ecuador's small population, even k=50 is weak: Sweeney's foundational re-identification work showed k=5 has 20% re-identification probability under attack; k=50 in a population where (city=Quito, plays Free Fire, age 22-26) might already be <500 people leaves narrow effective anonymity. The 2025 Springer Nature study on rare disease registries (analogous: small population, sensitive data) found k-anonymity alone insufficient — differential privacy at ε=1.0 was needed to drop re-identification risk below 0.1%.

**Why it happens:**
"k-anonymity = k=50" is treated as a checkbox. Generalization (binning age into 5-year bands, city into region) and suppression (dropping rare game titles from public segments) are not part of the data pipeline. BigQuery exports skip the anonymization layer. Application-level checks aren't enforced at the database level. There's no formal anonymization assessment per the LOPDP Reglamento.

**How to avoid:**
1. **Two-tier data architecture**: `firestore-raw` (encrypted, DPO-only access, 90-day retention) → `bigquery-anonymized` (k≥50 enforced + generalized + ε-differential noise + only allowed quasi-identifier combinations). B2B/Metabase only ever connects to `bigquery-anonymized`. No exception. Network-level isolation if possible.
2. **Schema-level generalization**: ages stored as 5-year bands in the analytics tier, cities collapsed to region for segments <500, game titles outside top-20 collapsed to "other."
3. **Pre-publication query review**: every B2B segment definition reviewed by DPO + flagged for high-cardinality combinations (e.g., 4+ quasi-identifiers).
4. **Differential privacy noise** on count aggregates (BigQuery has built-in DP functions) at ε=1.0 for any segment <200.
5. **Formal anonymization assessment** per LOPDP Reglamento — file with SPDP. Re-validate when adding new data categories.
6. **Audit log of every B2B query** including the user, query, result row count, time. Quarterly DPO review.
7. **Treat all B2B exports as personal data** in legal/contractual terms, even if technically anonymized — don't promise anonymization legal status to partners.

**Warning signs:**
- B2B partner asks "can we filter by [highly specific demographic combination]?" — the answer should provoke a privacy review, not a feature ticket
- BigQuery dataset accessible to anyone outside DPO + 1 backend engineer
- Metabase has direct read access to Firestore (via plugin or proxy) instead of going through BigQuery anonymized tier
- "Just give them a CSV" requests from B2B sales

**Phase to address:**
**Phase 3 (Revenue + Data)** — when B2B dashboard launches. But the **two-tier architecture must be built in Phase 2** to avoid retrofitting. Add to ADR-007.

---

### Pitfall 7: Crisis-keyword detection without licensed clinical sign-off + Línea 171 capacity assumption (NEW — REFINEMENT of mental health crisis risk)

**What goes wrong:**
The trust-safety skill specifies "crisis keyword detection (ES/EN), 4-tier escalation, automatic crisis resource surfacing (Línea 171, Crisis Text Line)." Three failure modes:

1. **False negatives**: NLP keyword detection trained on English suicide ideation data misses Ecuador-specific Spanish idioms ("ya no quiero seguir," "cansado de todo," "no tengo salida"), regional slang, and gamer-coded distress ("perdí la partida final," "uninstall life"). A user in real crisis goes undetected.
2. **False positives**: gamer language is hyperbolic ("kill me," "I want to die after this match," "estoy quemado"). Over-triggering creates moderator burnout and trains users that the safety net is theater. Volunteer moderators ignore the next alert.
3. **Línea 171 capacity assumption**: Línea 171 (Ecuador's general health line, including mental health) has limited mental health-specific capacity and is not 24/7 specialist-staffed. Surfacing it as the primary resource without prior coordination/MOU may send users to an unanswered line at 2am — far worse than no resource.

The existing risk register (#5 in `expert-project-manager.md`) names "crisis protocol from day one + licensed mental health partner" but doesn't address the operational specifics that make protocols actually work.

**Why it happens:**
NLP off-the-shelf models are trained on English crisis corpora. Ecuador-specific clinical validation requires partnership with local clinicians, which is slower and more expensive than installing a library. Línea 171 is the publicly known number, so it gets defaulted to without verifying capacity for the project's specific use case (online community member in crisis, possibly outside business hours).

**How to avoid:**
1. **Partner with a licensed Ecuador-based mental health provider BEFORE Phase 1 first event** (already in roadmap; this expands the spec). Provider sign-off on:
   - Spanish-language crisis lexicon (Ecuador-specific)
   - Escalation tree (who responds, when, what they say)
   - 24/7 coverage plan (is it actually 24/7? if not, what's the after-hours protocol?)
   - Liability/scope-of-practice clarification (community moderators ≠ counselors)
2. **Two crisis hotlines, not one**: Línea 171 + a confirmed-capacity backup (e.g., Centro de Apoyo Psicológico Crea, or international: Crisis Text Line works in Spanish via SMS to 741741 in select countries — verify Ecuador). Test both monthly with a "is the line answered" check.
3. **Human review on every L3+ alert** — no auto-escalation without a moderator confirming. Crisis detection is a triage tool, not a clinical instrument.
4. **Moderator training cycle**: initial training + quarterly refresh + post-incident debrief. Document attendance.
5. **Moderator wellness rotation**: hard cap of 4 hours/week of trust-safety duty per volunteer. Mandatory rotation off after handling a crisis incident. (Documented in skill, but enforce in scheduling tool.)
6. **Public-facing crisis resource page** that is not just numbers — short scripts ("If you call Línea 171, say: 'Necesito apoyo en crisis emocional'"), what to expect, alternatives if line is unanswered.
7. **Incident log + post-mortem** for every crisis event, reviewed by clinical partner monthly. LOPDP-sensitive — store crisis data SEPARATELY from analytics/B2B (already specified, enforce architecturally).
8. **Never claim clinical service** in marketing or community description. "Peer support, not therapy" disclaimer prominent.

**Warning signs:**
- Crisis lexicon copy-pasted from an English-language safety library
- Single hotline listed as the resource, no backup, no verification of answer rate
- Moderators handling crisis events without licensed-provider debrief
- Marketing copy uses words like "support your mental health," "we're here for you" without disclaimers (creates implicit clinical relationship)
- Moderator turnover after 2-3 months (burnout signal — rotation isn't working)

**Phase to address:**
**Phase 0 (Legal Foundation)** — partner secured, protocol documented, lexicon validated by clinician. Re-validated quarterly. **Phase 1** — moderator training before first event. **Phase 2** — automated detection layer added with clinical sign-off, never ships without it.

---

### Pitfall 8: Bilingual ES/EN content pipeline drift — gaming terms vs legal terms vs marketing terms (NEW)

**What goes wrong:**
The project has three distinct linguistic registers that interact:
- **Gaming register**: English terms preserved (XP, GG, buff, nerf, clutch, AFK) — this is the cultural authenticity layer
- **Legal/consent register**: must be **legally equivalent** ES/EN per LOPDP (consent texts in different languages cannot have different legal effect; this is enforceable)
- **Marketing register**: "tú" universal LATAM tone, regional adaptations, casual

Without explicit pipeline discipline, these collide. A gaming term ("buff de XP") embedded in a consent text creates legal ambiguity ("does the user understand what they're consenting to?"). A marketing translator localizing "GG" loses cultural authenticity. A gaming-fluent native translator without legal training mistranslates "explicit consent to share with healthcare providers." The translation memory captures the latest version but not the register, leading to next-translation drift.

Additionally: bilingual content ops at zero/low budget tend to default to "English original + ES translation" which **reverses the project's Spanish-first positioning**. The Riot LTA failure is precisely about this — imported English-first formats fail in LATAM.

**Why it happens:**
Translation tools (DeepL, Google Translate, even most TMS systems) don't model register. Gaming glossaries and legal glossaries live in different files. Founder writes content in their dominant language and assumes "we can translate later." Legal consent text often comes from English LOPDP/GDPR templates and gets translated → produces non-native-feeling consent that users skim and won't hold up if challenged.

**How to avoid:**
1. **Spanish-first content authoring** — every piece of content written in ES first, then translated to EN. (Gaming terms stay in EN within the Spanish text — they don't need translation.) Single exception: legal docs reviewed by counsel in ES authoritative version, EN reference.
2. **Three glossaries, separate files**:
   - `glossary-gaming.json` — terms that NEVER translate (XP, GG, buff, clutch, AFK, MMR, etc.)
   - `glossary-legal.json` — terms with locked ES/EN pairs reviewed by counsel (consentimiento explícito = explicit consent; tratamiento de datos = data processing)
   - `glossary-marketing.json` — brand voice terms (e.g., "Caminata Dota" = "Dota Walk" for ES-EN events)
3. **Translation Memory tagged by register** — gaming TM, legal TM, marketing TM kept separate. Most TMS support segment metadata; use it.
4. **Legal text: dual native review** — never auto-translate consent. Authoritative version in ES (Ecuadorian Spanish), reviewed by Ecuador-licensed counsel. EN version reviewed for legal equivalence by counsel familiar with both languages. File equivalence statement with SPDP.
5. **Content style guide includes register indicators** — every doc tagged [gaming]/[legal]/[marketing]/[mixed] with rules for each.
6. **Regional adaptation layer for Phase 4 expansion** — Colombia/Mexico variants need separate glossary entries (Colombia: "vos" rare in gaming, México: "güey" not used in formal contexts, etc.). Don't ship the Ecuador version as-is.
7. **Fail-safe**: if translation feels awkward to a native speaker, it IS awkward. Founders + early team should include a native bilingual gamer who reads everything before publish.

**Warning signs:**
- Consent text reads like a translation of GDPR templates (formal, foreign-feeling, long sentences)
- Marketing copy in EN reads better than the ES (signals EN-first authoring)
- Discord members joke about the app's Spanish ("¿esto lo tradujo Google?")
- Different content surfaces use different terms for the same concept (XP vs PE vs puntos)
- Legal counsel reviewed only ES version; EN version unreviewed

**Phase to address:**
**Phase 0** — establish glossaries and authoring discipline, draft and review consent texts. **Phase 1** — apply discipline from first content piece. **Phase 4 (LATAM expansion)** — extend with country variants.

---

### Pitfall 9: Wearable data path optimized for the 5-15% who have wearables, ignoring the 85% who don't (NEW — REFINEMENT of wearable adoption risk)

**What goes wrong:**
South America fitness tracker penetration is ~4.66% (Statista 2024) projected to ~5.13% by 2028. Ecuador-specific is likely lower. The project plans Apple HealthKit + Health Connect + Open Wearables integration as a Phase 2 deliverable. Risk: engineering effort and feature design centers on the wearable-having minority, while the manual-entry path (which 85%+ of users will rely on) is treated as fallback. This creates:
- Manual entry UX is clunky (typed numbers instead of guided steps)
- Challenge difficulty calibration assumes wearable data accuracy
- Anti-cheat rules over-trust wearables, under-trust manual (creating distrust)
- Phone step counter (Google Fit/Apple Motion) — built into nearly 100% of smartphones — is treated as an afterthought when it should be the **primary** baseline
- Visual design (character sheet, "Stamina" stat) shows blank/incomplete states for users without wearables, signaling second-class status

**Why it happens:**
Wearable APIs are technically interesting and demo well. Manual entry feels boring to engineers. Founders extrapolate from US/EU adoption (~25-40%) without validating local data. Competitive analysis (Strava, Vitality) emphasizes wearable users because that's their premium audience. Open Wearables supports 200+ devices — impressive number that doesn't translate to Ecuadorian wallets.

**How to avoid:**
1. **Manual entry is a first-class citizen**, not fallback. Design it FIRST in Phase 2, before any wearable SDK integration.
2. **Phone-native step counting is the baseline** — Google Fit/Apple Motion APIs require zero hardware purchase. Implement before any third-party SDK.
3. **Challenges designed manual-first**: e.g., "30 minutos de movimiento, 5 días" is verifiable manually with photo/check-in. Wearable users get a wearable-verified version. Both equally valid for completion.
4. **No wearable required for any badge/level/leaderboard tier** — wearable data is enrichment for personal insights, not gating.
5. **Photo + community vouching** as alt-verification: post a photo at the meetup, attendees vouch for participation. Social proof scales the trust manual entry needs.
6. **Anti-cheat rules calibrated to manual reality**: wearable showing 50K steps in 1h triggers review; manual entry showing 30K steps in a day flagged but trusted unless pattern emerges. Don't over-police low-stakes wellness data.
7. **Character sheet visual**: full-color "Stamina" stat from manual data; wearable users see a small "synced" icon. No empty states.
8. **Track adoption KPI**: % of active users with wearable connected. If <10%, do not gate any feature on wearables.

**Warning signs:**
- Demo flow leads with "connect your Apple Watch" instead of "tell us about your last walk"
- Manual entry hidden behind a "no device? click here" link
- Empty wearable charts shown to non-wearable users
- Engineering hours: wearable integration > manual entry UX

**Phase to address:**
**Phase 2 (Platform MVP)** — manual-entry path designed and shipped before wearable SDKs. Wearable integration is Phase 2.5/Phase 3 polish.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip Firestore Security Rules unit tests "for now" | 1-2 week dev time saved | Silent consent bypass discoverable only in audit/incident; reputational + LOPDP fine risk | **Never** for personal/health data collections; OK for public read-only content |
| Use `onSnapshot` everywhere because "Firebase is real-time" | 1-line code, instant feel | $400-2,000/mo unexpected bills at modest scale; rewrites required to fix | OK for ≤2 truly real-time surfaces (active event check-in, crisis alert dashboard) |
| Single-language consent text translated automatically | 1 hour saved | LOPDP non-compliance if challenged; consent provably invalid if Spanish version diverges materially | **Never** |
| Discord bot does "just one little data write" to Firestore | Convenience | Discord TOS violation → bot ban → community loss; ADR-001 broken | **Never** |
| Defer differential privacy / two-tier B2B architecture to "when we have B2B partners" | Engineering simplicity in Phase 2 | Retrofit cost 5-10x; risk of partner getting raw access; SPDP findings if audited | **Never** for B2B-bound data; OK if B2B layer is genuinely deferred to Phase 4 with clean separation in MVP |
| Manual mod team without rotation/training cap | Faster Phase 1 launch | Mod burnout → community trust collapse if crisis mishandled | OK only for first 30 days, with documented transition plan |
| BigQuery export with no row-level filters | Fast analytics setup | Personal data pooled in BQ accessible to any project member with viewer role | OK only if BQ project has DPO + 1 engineer access total, and audit log enabled |
| Wearable integration before manual-entry path | Demo-impressive | Reinforces "this app is for people with $200 watches" — kills inclusivity goal | **Never** (manual first) |
| Carrd/Google Forms in Phase 1 collecting emails | Zero engineering | Carrd/Google are data processors outside SPDP-System inventory; potential LOPDP gap | OK if explicitly named in DPIA + Privacy Policy + DPA in place; otherwise migrate before launch |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Discord OAuth (Firebase Auth provider) | Discord is not a built-in Firebase Auth provider — using a third-party adapter that stores Discord tokens insecurely | Implement Discord OAuth via custom token flow: Cloud Function exchanges Discord code → mints Firebase custom token. Store only `discord_id`, never the access token long-term. |
| Discord bot (discord.js v14) | Enabling `MessageContent` intent "just in case" — triggers Discord verification + LOPDP scope expansion | Bot uses ONLY: `Guilds`, `GuildMembers` (privileged but justified for role sync), nothing else. `MessageContent` intent NEVER enabled. Quarterly intent audit. |
| Firebase Hosting + Vue PWA | Cache headers default to long TTL → users stuck on stale builds after deploy; service worker caches stale shell | Configure `firebase.json` with hashed asset filenames + short TTL on `index.html` + service worker `skipWaiting` strategy with user-prompted refresh |
| HealthKit (iOS) | Requesting all health permissions upfront → iOS shows scary granular permission sheet, users decline | Request only the specific data types needed for the connected challenge; defer expansion to feature use |
| Health Connect (Android) | Assuming it's installed — Health Connect is preinstalled only on Android 14+, requires Play Store install on older versions | Detect availability, fall back to Google Fit-style permissions or manual entry; show install prompt only if user opts in to wearable connection |
| Open Wearables (MIT) | Self-hosted but not version-pinned → upstream breaking changes silently land | Pin version, monitor releases monthly, run integration tests before bumping |
| Stripe (premium memberships) | Webhook handler is a public Cloud Function without signature verification | Use Stripe SDK signature verification on every webhook; idempotency keys on subscription state writes |
| BigQuery streaming export from Firestore | Streaming costs scale with write volume, not query volume — surprise bill at scale | Use scheduled batch export (daily) instead of streaming for analytics; reserve streaming for low-volume audit logs |
| PostHog (self-hosted) | Self-hosted on Firebase Hosting (it's not a static site) → doesn't work | Self-host on a separate VM/container (Railway, Render, Fly.io); document in DPA inventory; ensure data residency matches LOPDP requirement |
| Metabase (B2B dashboards) | Embedded with a shared API key visible in client → partners can pull arbitrary data | Use signed embedded URLs with row-level filters set per partner; rotate keys quarterly |
| WhatsApp Business API | Treating it as comms-only — opt-in/opt-out tracking and marketing messaging templates have separate compliance regimes | Document WA Business as a processor in SPDP-System inventory; implement double-opt-in; separate transactional vs marketing template approval |
| Discord Activities API (if used later) | Assuming data stays "in Discord" — actually generated data is on platform backend, but session metadata flows through Discord | If used, document the data flow explicitly; maintain architectural firewall — generated data writes to platform DB via OAuth-authenticated user, not via bot |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Firestore N+1 reads on event lists (read event → for each, read attendees) | Slow event page load, read counts ballooning | Denormalize attendee count + sample names onto event doc; update via Cloud Function trigger | At ~10 events × 50 attendees concurrent (~500 reads/page view) |
| Full-collection `getDocs` on leaderboards | Cost spike when leaderboard grows | Aggregate document pattern; pagination; cap displayed list at 50 | At ~1,000 users with daily leaderboard views |
| Cloud Function cold starts on consent gate middleware | First-of-day API call takes 2-5s, users assume app is broken | Min instances = 1 on consent-critical functions ($5-15/mo extra); consider 2nd-gen Functions on Cloud Run | Always perceptible; worsens past ~100 DAU |
| Vue reactivity on large user lists | Page hangs during render | `v-memo` on list items; virtual scrolling (`vue-virtual-scroller`); avoid deep reactive on read-only data | At ~200+ items rendered |
| Service worker caching stale Firestore data offline | Users see XP that doesn't exist | Don't cache user-specific data in service worker; rely on Firestore offline persistence which has consistency guarantees | Anytime offline + reconnect happens |
| Image storage in Firestore documents (vs. Storage URLs) | Document size limits hit at scale, slow reads | Always store images in Firebase Storage; reference by URL in Firestore | At ~100 events with photos |
| BigQuery exports without partitioning | Metabase queries scan full history → cost + speed | Partition exported tables by date; use clustering on common filter fields (city, game cluster) | At ~6 months of data |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Crisis data in same Firestore project as analytics | LOPDP violation: crisis data leaks to B2B pipeline; "data minimization" failure | Separate Firebase project for crisis incidents; cross-project access via DPO-only service account; never exported to BigQuery |
| Discord bot scope creep (read messages "for moderation") | Discord TOS violation; LOPDP scope expansion; bot ban risk | Bot intents locked at minimum; quarterly audit; ADR-001 enforced via code review checklist |
| Firebase Anonymous Auth orphans (anonymous accounts never upgraded → never deleted) | Personal data accumulates indefinitely; LOPDP retention failure | Scheduled Function deletes anonymous accounts older than 30 days with no upgrade |
| Profile images uploaded without virus scan / NSFW check | Malware distribution; CSAM exposure (child safety + criminal liability) | Cloud Function with Cloud Vision SafeSearch on every upload; quarantine + manual review on flag; documented in trust-safety skill |
| Logging health data to Cloud Logging (default for all Function errors) | Sensitive data in logs accessible to all Firebase project viewers; LOPDP scope creep | Structured logging with redaction middleware; never log request bodies for health endpoints; restrict log viewer role |
| B2B partner credentials sent via email | Credential leak via email forwarding | Provision via 1Password/Bitwarden shared item; require MFA on first login; rotate quarterly |
| `allow read: if true` for "public" content (e.g., events) leaking adjacent data | Adjacent collections accessible if rules wildcards used | One rule per collection, no wildcards on user-data paths; rules linter in CI |
| Service account keys committed to git (even private repo) | Compromise on contributor machine = full Firebase admin access | Use Workload Identity / short-lived tokens; gitleaks pre-commit hook; IAM review monthly |
| Incomplete DSAR (Data Subject Access Request) export — missing Discord-linked data | LOPDP: subject-rights violation, 15-day SLA breach | DSAR script enumerates ALL collections with user data; manual checklist for non-Firestore sources (Discord roles, Stripe customer, PostHog) |
| Crisis-detected message kept in moderator queue indefinitely | Sensitive data retention violation; mod team has personal data without continuing legal basis | Auto-purge crisis review queue 30 days post-resolution; archived only as redacted incident summary |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Consent UI as scroll-of-death legal text | Users dismiss without reading, consent legally suspect | Layered consent: short plain-language summary + expandable details + per-category toggles; gaming-styled illustrations |
| "Connect Discord" required on app open | Users without Discord (yes, they exist even in gaming community) bounce | Discord linking optional; alternative auth (email, Google) available; Discord linking offered as benefit ("sync your Discord roles") |
| English-language onboarding (the "translate later" trap) | Spanish-first users feel like guests in their own community | Spanish as default at install (locale detection), English as toggle; even alpha versions ship ES-first |
| Wellness "character sheet" with empty stats for new users | Onboarding feels broken; user feels behind | Pre-seed sheet with "starter" stats (level 1, basic badges); explain stats grow as they participate |
| Crisis resources buried in settings | Crisis users can't find help in distress | Persistent "ayuda" button in app shell; crisis resources at top of profile; one-tap to call |
| Event check-in QR requires app install before check-in works | First-event attendees can't check in → no XP → no funnel start | Web-based QR landing page that works without install; offers install AFTER check-in confirmed |
| Notifications: every XP award triggers push | Notification fatigue, app uninstall | Notification budget: max 1/day for routine, push only for events/challenges/social interactions user opted into |
| Wearable data shown as raw numbers (12,439 steps) | Boring, doesn't feel gaming-native | Gaming-native narrative ("Caminaste 4.2km — equivalente a 47 cruces de Summoner's Rift") with numbers as supporting detail |
| Streak mechanics that can break overnight | Existential dread on travel/illness; user quits to avoid losing streak | "Streak shield" auto-applied 1x/week; missed days during documented life events forgivable |
| "Pro tier" features that feel pay-to-win | Community resentment, gaming-fluent users sniff out P2W instantly | Premium = cosmetics + convenience (themes, badges, priority RSVP), NEVER XP boosts or leaderboard advantages |
| Empty Discord channels at launch (40 channels, 5 members) | Looks dead, members don't engage | Launch with ≤6 channels; expand based on member request as community grows |

## "Looks Done But Isn't" Checklist

- [ ] **Consent UI:** Often missing audit log write on grant/revoke — verify Firestore `consent_events` collection records every state change with timestamp, version, and method (UI vs API)
- [ ] **DPIA:** Often missing one or more data categories that snuck in (e.g., IP addresses in Cloud Functions logs) — verify Cloud Logging settings + every external SDK's data collection
- [ ] **k-anonymity gate:** Often missing the schema-level generalization layer — verify Metabase only connects to `bigquery-anonymized`, not raw exports
- [ ] **Crisis protocol:** Often missing the after-hours coverage answer and verified hotline answer-rate — call Línea 171 at 2am as a test
- [ ] **Discord bot:** Often missing the quarterly intent audit — verify dashboard shows current intents match documented minimum
- [ ] **Manual-entry challenges:** Often missing the photo/social-vouching alt-verification path — verify a wearable-less user can complete every challenge
- [ ] **Bilingual content:** Often missing legal-equivalence sign-off on consent texts — verify counsel signed off on BOTH ES and EN versions
- [ ] **Anonymous Auth flow:** Often missing the orphan cleanup Function — verify deletion of unupgraded anonymous accounts after 30 days
- [ ] **DSAR export:** Often missing Discord-linked data, Stripe customer data, PostHog events — verify export includes ALL personal data sources
- [ ] **Funnel instrumentation:** Often missing the consent-decline event — verify PostHog/Firebase Analytics tracks declines, not just grants
- [ ] **Cloud Function consent gate:** Often missing on admin/internal functions ("we trust ourselves") — verify EVERY function reading personal data passes through the gate
- [ ] **Budget alerts:** Often configured but not tested — verify email/Slack actually arrives when crossing thresholds (force a test alert)
- [ ] **Wearable disconnection:** Often missing the data deletion on disconnect — verify revoking HealthKit access deletes synced data within retention SLA
- [ ] **Moderator rotation:** Often documented but not enforced — verify scheduling tool refuses to assign a mod >4h/week or post-crisis without cooldown
- [ ] **Crisis incident log:** Often stored in same DB as analytics — verify separate Firebase project / encryption / DPO-only access

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Firebase cost overrun discovered mid-month | LOW-MEDIUM | (1) Identify top 3 read-heavy queries via Firestore Usage tab; (2) replace `onSnapshot` with `getDocs`+TTL; (3) deploy hotfix; (4) backfill aggregate documents; (5) update budget alerts |
| Consent rule bypass discovered (rules OR-composition issue) | MEDIUM | (1) Audit consent ledger for affected period; (2) identify users whose data was processed without consent; (3) DPO assesses whether SPDP notification triggered; (4) deploy corrected rules + Function-side gate; (5) rules unit tests; (6) document incident |
| Crisis incident mishandled | HIGH | (1) Immediate clinical partner consultation on user welfare; (2) post-incident review with all involved mods; (3) protocol revision; (4) potentially involve legal counsel; (5) publish learnings (anonymized) to community |
| Discord bot ban | HIGH | (1) Identify violation cause; (2) negotiate appeal with Discord (rare success); (3) parallel: deploy replacement bot with stripped intents; (4) community announcement explaining without panic; (5) accelerate Phase 2 platform features to reduce Discord dependency |
| Re-identification incident (B2B partner correlated dataset) | CRITICAL | (1) Immediate revoke partner access; (2) DPO files SPDP notification within 72h; (3) notify affected users without delay; (4) legal counsel engages; (5) public statement; (6) all B2B exports paused pending audit + differential privacy retrofit |
| LOPDP fine assessed | CRITICAL | (1) Legal counsel handles formal response; (2) implement remediation per SPDP order (data deletion, process changes); (3) public transparency statement; (4) board/founder review of compliance posture; (5) potentially: kill criterion for project if fine + forced changes destroy economics |
| Bilingual consent challenged (ES vs EN divergence) | MEDIUM-HIGH | (1) Counsel review which version is authoritative; (2) re-consent affected users with corrected text; (3) update glossary + process; (4) document for SPDP if asked |
| Wearable adoption stalled at <5% (challenges feel inaccessible) | LOW | (1) Audit which challenges require wearables; (2) add manual/photo verification paths; (3) reframe wearable as enrichment in marketing; (4) measure participation lift |
| Mod team burnout / mass resignation | HIGH | (1) Pause non-essential community programming; (2) bring in clinical partner for team debrief; (3) recruit new mods with revised role/training; (4) implement strict rotation if not already; (5) consider paying critical mod hours |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| #1 Firestore Security Rules sole consent enforcement | Phase 2 | Rules unit test coverage >90%; every Function reading personal data has documented gate; CI blocks on either failing |
| #2 Firestore reads cost overrun | Phase 2 (architecture); ongoing | Monthly review: actual vs target spend; reads-per-DAU dashboard; budget alerts firing |
| #3 SPDP-System (broader than DPIA) | Phase 0 | Filed System documentation reviewed by counsel + DPO sign-off; vendor DPA inventory complete |
| #4 Discord-to-app conversion at consent step | Phase 2 | Funnel data shows >60% L1 grant rate; anonymous-first auth implemented; consent-after-value verified by user testing |
| #5 Surface-mechanic gamification | Phase 1 (testing); Phase 2 (build) | Founding-member playtest shows positive reception; no leaderboard exploits in beta; design review by gamer-designer signed off |
| #6 k-anonymity application-only enforcement | Phase 2 (architecture); Phase 3 (use) | Two-tier architecture deployed before any B2B export; differential privacy noise in place; quarterly DPO query audit |
| #7 Crisis protocol inadequate | Phase 0 (design); Phase 1 (training); ongoing | Clinical partner signed protocol; lexicon validated for Ecuador Spanish; both hotlines verified monthly; mod rotation enforced |
| #8 Bilingual content register drift | Phase 0 (glossaries + process); ongoing | Three glossaries committed to repo; consent texts dual-counsel reviewed; every content piece tagged with register |
| #9 Wearable-first design ignoring 85% | Phase 2 | Manual-entry path shipped before any wearable SDK; every challenge has non-wearable verification; wearable adoption KPI tracked |

### Cross-cutting reminder

Existing risks from `expert-project-manager.md` (community failure, founder burnout, insurer dependency, Discord TOS, generic LOPDP, wearable adoption, budget overrun) and `expert-security-compliance.md` (T1-T10) **remain active and authoritative**. This document supplements, does not replace.

## Sources

### Verified (HIGH confidence)
- [Firebase Security Rules — fix insecure rules](https://firebase.google.com/docs/firestore/security/insecure-rules) — confirms OR-composition behavior
- [Firebase Cloud Firestore billing](https://firebase.google.com/docs/firestore/pricing) — read pricing model
- [Firebase BigQuery Export documentation](https://firebase.google.com/docs/projects/bigquery-export) — streaming vs batch tradeoffs
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) — Spark/Blaze tier details
- [Discord Developer Policy](https://discord.com/developers/docs/policies-and-agreements/developer-policy) — bot/data restrictions (referenced in StartData)
- [LOPDP Ecuador — CuencaLawyer compliance guide 2026](https://cuencalawyer.com/my-blog/blog/corporate-business-law/ecuador-data-protection-law-lopdp-explained-business-compliance-guide)
- [Lexology — Personal Data Protection in Ecuador: What Every Company Must Implement Before 2026](https://www.lexology.com/library/detail.aspx?g=3909f2c2-a2d8-4dde-8da4-e335057ab448)
- [OlarteMoure — Sanctions for violations of the data protection law](https://olartemoure.com/en/sanctions-for-violations-data-protection-law/) — fine ranges (0.1-1% turnover)
- [DLA Piper — Ecuador Data Protection Laws](https://www.dlapiperdataprotection.com/index.html?t=law&c=EC) — DPO/DPIA requirements
- [k-anonymity — Wikipedia](https://en.wikipedia.org/wiki/K-anonymity) and [Sweeney's foundational paper](https://epic.org/wp-content/uploads/privacy/reidentification/Sweeney_Article.pdf) — re-identification risk math
- [Springer Nature 2025 — Comparative Evaluation of K-Anonymity, DP, and Pseudonymization for Rare Disease Registries](https://link.springer.com/chapter/10.1007/978-3-032-06497-4_56) — k-anonymity insufficient for small populations
- [Scientific Reports 2025 — Practical methodology to assess re-identification risk](https://www.nature.com/articles/s41598-025-04907-3)
- [PMC — Suicidal behaviours and moderator support in online health communities (scoping review)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8246377/) — moderator preparedness gaps
- [Cyberpsychology — Keeping users in suicidal crisis safe online](https://cyberpsychology.eu/article/view/35038) — text-based moderator practices
- [Center for Suicide Awareness — Gaming Communities](https://www.centerforsuicideawareness.org/gaming-community) — Pixel Care, STOP programs

### MEDIUM confidence (industry/practitioner sources, not peer-reviewed)
- [Cando Consulting — Firebase Costs Comprehensive Breakdown](https://candoconsulting.medium.com/firebase-costs-a-comprehensive-breakdown-27da1c403873)
- [Airbyte — Google Firestore Pricing Guide](https://airbyte.com/data-engineering-resources/google-firestore-pricing)
- [Moldstud — Hidden Costs of Firebase](https://moldstud.com/articles/p-the-hidden-costs-of-firebase-essential-tips-for-developers-to-avoid-surprises)
- [Statista — Fitness Trackers South America market forecast](https://www.statista.com/outlook/hmo/digital-health/digital-fitness-well-being/fitness-trackers/south-america) — ~5% penetration
- [Communipass — Creator Monetization Mistakes 2026](https://communipass.com/blog/creator-monetization-mistakes-2026/) — community migration / funnel patterns
- [RestoreCord — How to Migrate Your Discord Server Without Losing Members 2026](https://restorecord.com/blog/how-to-migrate-discord-server) — 10-30% baseline conversion data
- [RGA — Behavioral science and gamified digital wellness](https://www.rgare.com/knowledge-center/article/achieving-the-buzzword-badge-behavioral-science-and-gamified-digital-wellness) — surface vs behavioral mechanics
- [Smartico — Gamification in Mental Wellness](https://www.smartico.ai/blog-post/gamification-mental-wellness-apps)
- [Fivejars — Vue, Nuxt & Vite Status in 2026: Risks, Priorities & Architecture](https://fivejars.com/insights/vue-nuxt-vite-status-for-2026-risks-priorities-architecture-updates/)
- [Vue Mastery — Vue 3 PWAs Deployment & Performance](https://www.vuemastery.com/blog/vue3-pwas-deployment-and-performance/)

### Pre-existing project documents (authoritative for project-internal context)
- `StartData/output/project-definition.md` — top 10 risks, architecture decisions
- `StartData/output/expert-project-manager.md` — risk register, kill criteria, phase model
- `StartData/output/expert-security-compliance.md` — LOPDP threats, k-anonymity ADR-007, Discord firewall ADR-001
- `StartData/output/expert-research-analyst.md` — Akili/Pear/LTA failure patterns, gamification 80% failure, Calm/Headspace decline

---
*Pitfalls research for: Gaming + Wellness Community Platform (Vue 3 + Firebase, Ecuador-launch)*
*Researched: 2026-04-27*
*Author: GSD Project Researcher (pitfalls dimension)*
