---
phase: 02-platform-mvp
plan: 05
subsystem: profiles + gamification + app shell
tags: [vue3, pinia, vuefire, firebase-functions, pubsub, xp, streaks, badges, character-sheet, app-shell, crisis-help, i18n, reka-ui]

# Dependency graph
requires:
  - phase: 02-platform-mvp
    plan: 02-01
    provides: ConsentEnforcement.ts, Pub/Sub topology (xp-events, level-up-events), profile/main rules baseline
  - phase: 02-platform-mvp
    plan: 02-02
    provides: anonymous→full uid preservation (ADR-008), age claim (ageVerified, isMinor)
  - phase: 02-platform-mvp
    plan: 02-03
    provides: bot HMAC endpoint (functions/auth/src/botEndpoints.ts) for Discord role sync
  - phase: 02-platform-mvp
    plan: 02-04
    provides: claim bitmap, consent gates that gamification reads must respect
provides:
  - packages/shared/src/xp.ts — logarithmic XP curve (xpForLevel, levelForXp) shared by PWA + Functions
  - 6 gamification Cloud Functions (xpAward, streakAdvance, badgeAward, discordRoleSync, recomputeStats, antiCheat)
  - Pinia profile store + useXp + useStreak + useTheme + useInstallPrompt composables
  - 10 PWA components (AppShell, Avatar, Badge, CrisisHelpButton, InstallNudge, LanguageSwitch, OfflineBanner, StatRow, ThemeSwitch, XpBar)
  - 5 PWA views (me/Me, me/Profile, me/CharacterSheet, me/Badges, u/PublicProfile)
  - 5 PWA tests (AppShell, Badge, CharacterSheet, useStreak, useXp)
  - 4 Function tests (badgeAward, recomputeStats, streakAdvance, xpAward)
  - 8 new authed routes wired through App shell + auth/age/consent guards
  - Bilingual i18n keys (~60 per locale) for character sheet, XP, streak, app shell
affects:
  - 02-06 (content hub publishes content_completed events to xp-events Pub/Sub)
  - 02-07 (event check-in publishes event_attended events to xp-events)
  - 02-08 (challenge progress publishes challenge_milestone events to xp-events)
  - 02-09 (wearable webhook deltas trigger HP/Stamina recomputation via xp-events fan-out)

# Tech tracking
tech-stack:
  added: []  # All deps inherited from Plan 01
  patterns:
    - "Logarithmic XP curve: xpForLevel(n) = floor(100 * n^1.5); both PWA and Functions import from packages/shared/src/xp.ts — no RPC for level math."
    - "xp-events Pub/Sub fan-out: domain events (event_attended, challenge_progress, content_completed, manual_log) → xpAward → publishes level_up to level-up-events topic when threshold crossed → discordRoleSync subscribes."
    - "discordRoleSync calls bot HMAC endpoint (functions/auth/src/botEndpoints.ts), NEVER Discord API directly — preserves ADR-001 firewall."
    - "Anti-cheat writes to private subcollection (Firestore Rules deny user read); custom claim 'c=true' flags profile; UI shows neutral message."
    - "Streak freeze-shield earned at level milestones, one-time consume, audit-logged on use; missing one day breaks streak unless shield active."
    - "Hot-path doc discipline: profile/main is one-read-per-page-load max; HP/Stamina/Mente/Social denormalized into profile/main, NOT separate docs; aggregation Function on xp-events updates the denormalized stats."
    - "CharacterSheet renders FULL-COLOR for ALL authenticated users (Pitfall #9): wearable connection MUST NOT gate the sheet; missing data shows neutral placeholder, never grayed-out lock."
    - "App shell wraps every authenticated route via Vue Router meta requiresAuth: true; CrisisHelpButton sticky-FAB always visible; OfflineBanner appears when offline; InstallNudge appears when PWA-installable but not installed."
    - "i18n extension pattern: extend existing apps/pwa/src/locales/{es,en}.json with new namespaces (character_sheet, xp, streak, app_shell); never collide with consent.* (Plan 04) or auth.* (Plan 02) namespaces."
    - "No onSnapshot in components/views — already enforced by ESLint flat config from Plan 01; components use one-shot getDoc/getDocs."

key-files:
  created:
    - packages/shared/src/xp.ts
    - functions/gamification/src/{antiCheat,badgeAward,discordRoleSync,recomputeStats,streakAdvance,xpAward}.ts
    - functions/gamification/src/__tests__/{badgeAward,recomputeStats,streakAdvance,xpAward}.test.ts
    - apps/pwa/src/views/me/{Me,Profile,CharacterSheet,Badges}.vue
    - apps/pwa/src/views/u/PublicProfile.vue
    - apps/pwa/src/components/{AppShell,Avatar,Badge,CrisisHelpButton,InstallNudge,LanguageSwitch,OfflineBanner,StatRow,ThemeSwitch,XpBar}.vue
    - apps/pwa/src/composables/{useInstallPrompt,useStreak,useTheme,useXp}.ts
    - apps/pwa/src/stores/profile.ts
    - apps/pwa/src/__tests__/{AppShell,Badge,CharacterSheet,useStreak,useXp}.test.ts
  modified:
    - functions/gamification/src/index.ts (export new Functions alongside Plan 03's bot read endpoints)
    - apps/pwa/src/router/index.ts (8 new authed routes; preserved auth/age/consent guards)
    - apps/pwa/src/locales/{es,en}.json (~60 new keys per locale)

key-decisions:
  - XP curve: logarithmic n^1.5 (not linear, not pure exp). Tested monotonic for levels 1..100. Source of truth in packages/shared/src/xp.ts.
  - HP/Stamina/Mente/Social are denormalized into profile/main (NOT separate docs) to keep profile views to one read per page load.
  - discordRoleSync is the ONLY Function that posts to the bot HMAC endpoint — no direct Discord API calls from any Cloud Function (ADR-001 firewall).
  - CharacterSheet renders full-color for ALL users (Pitfall #9): the visual wellness narrative must not be gated by wearables, or non-wearable users feel second-class and the community-first thesis breaks.

requirements-completed:
  - PROF-01..14
  - CONT-07 (XP-on-content-completion plumbing — content hub itself ships in Plan 06)

# Metrics
duration: ~32min agent + recovery commits
completed: 2026-04-29
---

# Phase 2 Plan 05: Profiles + Gamification + App Shell Summary

**Logarithmic XP shared between PWA + Functions, 6 gamification Cloud Functions, 10 PWA components + 5 views, character sheet renders full-color for all authenticated users (Pitfall #9 mitigation), Discord role sync via bot HMAC endpoint preserving ADR-001 firewall.**

## Performance

- **Agent duration:** ~32 min (subagent execution)
- **Tasks:** 2 / 2
- **Files created:** 28 (Task 2 PWA) + ~10 (Task 1 backend)
- **Tests:** 5 PWA + 4 Function = 9 new test files

## Task Commits

1. **Task 1: shared XP math + gamification Cloud Functions + 29 tests** — `96b90f1` (feat)
2. **Task 2: PWA app shell + character sheet + 5 tests** — `b5f25b6` (feat)

## Recovery Note — Worktree Bug

The 02-05 executor agent ran into a Windows worktree CWD bug (same as the 02-04 retry path saw): the agent's working directory crossed from its isolated worktree (`C:\...\worktrees\agent-a444fb62854104c01`) to the main repo path mid-execution. As a result, all file writes landed in the main tree and Task 1 was committed directly onto `master` (not the worktree branch). The agent then bailed when trying to `git add`/`commit` Task 2 due to a permission-prompt timing issue. The orchestrator recovered by staging and committing Task 2 manually with the same atomicity discipline (one commit per task). All code that the agent wrote is preserved; the worktree branch is empty and cleaned up.

## Pitfall #9 Verification

`apps/pwa/src/__tests__/CharacterSheet.test.ts` includes assertions:

- Stat bars render full-color when `wearableConnected: false`
- Stat bars render full-color when `wearableConnected: true`
- Missing data renders a neutral placeholder, NOT a grayed-out lock icon

This is a load-bearing UX invariant: a non-wearable user must NEVER see a "connect a device" wall in front of their character sheet, or the inclusive-community thesis breaks.

## Pub/Sub Topic Discipline

| Topic | Plan 05 role |
|-------|-------------|
| `xp-events` | xpAward + streakAdvance subscribe; recomputeStats subscribes; **no Plan 05 publishers — domain events from Plan 06/07/08/09 publish here** |
| `level-up-events` | xpAward publishes on threshold cross; discordRoleSync subscribes |
| `consent-revoked` | (Phase 3 cleanup hook — not active in Plan 05) |

Plan 05 does **NOT** create new topics. The `gcloud pubsub topics create` calls live only in `scripts/setup-pubsub-topics.sh` from Plan 01.

## ADR-001 Firewall Compliance

`functions/gamification/src/discordRoleSync.ts` calls the bot HMAC endpoint at `functions/auth/src/botEndpoints.ts` (added in Plan 03). It does **NOT** import `discord.js` and does **NOT** make outbound HTTPS to `discord.com`. The bot is the only process that talks to Discord; this Function only triggers the bot via the established HMAC contract.

## Self-Check: PASSED

- FOUND: All claimed files on disk
- FOUND: `packages/shared/src/xp.ts` exports `xpForLevel`, `levelForXp` (logarithmic curve)
- FOUND: `functions/gamification/src/discordRoleSync.ts` does not import `discord.js`
- FOUND: `apps/pwa/src/components/AppShell.vue` includes `<CrisisHelpButton />` outside any conditional render
- FOUND: 8 new authenticated routes in `apps/pwa/src/router/index.ts`
- FOUND: 9 test files (4 Function + 5 PWA)
- FOUND: Commits `96b90f1`, `b5f25b6` on master
- VERIFIED: No new Pub/Sub topics created (only Plan 01's `setup-pubsub-topics.sh` exists)
- VERIFIED: No `onSnapshot` import in `apps/pwa/src/components/` or `apps/pwa/src/views/` (ESLint clean)

---
*Phase: 02-platform-mvp*
*Plan: 05*
*Completed: 2026-04-29*
