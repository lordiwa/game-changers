---
created: 2026-05-09
status: paused-mid-execution
priority: P0
---

# HANDOFF — Pivot to PWA functionality (P0)

## Context for the next session

The user paused all Phase 02 gap-closure infrastructure work because **the PWA buttons don't function** for users. Login works (we verified that earlier), but downstream actions (RSVP to event, enroll in challenge, view profile, etc.) are broken or untested.

We had been deep in operator/ops territory (KMS provisioning, BigQuery setup, Pub/Sub topics, Cloud Tasks migration, GCE bot VM, Hetzner Open Wearables hub) — none of which is what the user clicks on. **The user is right: fix the UI first.**

## What's stable (don't touch)

- 47 Cloud Functions live in `southamerica-east1` (auth, consent, events, challenges, wearables, gamification, b2b, trustsafety)
- Firebase web app registered (`gamechangers-prod`)
- Login flow works (signup → /me redirect)
- Dev server runs (`apps/pwa` via `npm run dev` or `pnpm --filter @gamechangers/pwa dev`)
- `.env.local` configured with real Firebase web SDK credentials
- Vite pinned to 7.3.3 (downgrade per ADR-012)
- Counter backfill script ready (`scripts/backfill-counters.ts`)

## What's deferred (DO NOT spend time on these until UI works)

- `02-10` partial — KMS keyring provisioning (script committed, awaiting `gcloud auth login`)
- `02-11` blocked — BigQuery two-tier architecture (needs gcloud + bq CLI)
- `02-12` not started — Discord bot VM (Wave 10)
- `02-15` not started — Cloud Tasks migration (Wave 9)
- `02-16` not started — Open Wearables Hetzner hub (Wave 10)

These are real plans with verified PLAN.md files. They survive a long pause. **Do not resume them until the user explicitly asks.**

Also deferred (separately):
- 35 pre-existing TypeScript errors in PWA build (`02-platform-mvp/deferred-items.md`) — `vue-tsc -b` fails on these but `vite build` succeeds. Some may be related to the UI not working.

## What the user needs next

The user wants to make **the PWA buttons functional**. We don't yet know which specific buttons are broken or why. Investigation is needed before any planning.

## Recommended first command after `/clear`

```
/gsd-debug "PWA buttons don't work after login — RSVP, challenge enrollment, profile actions, etc. are all broken or untested"
```

The `/gsd-debug` skill will:
1. Ask the user to describe specifically which buttons fail and what they expect
2. Spawn a debugger agent that inspects the live app, finds root causes (likely Firestore Rules, missing consent claims, broken event handlers, or cascading TS errors from `deferred-items.md`)
3. Apply atomic fixes per finding
4. Verify each fix in the browser

**Alternative if user prefers a structured approach:**

```
/gsd-quick --discuss "audit PWA UI flows: login → /me → events → challenges → profile, document every broken interaction with severity"
```

This produces a written audit before any fixing — useful if the user wants to triage scope first.

## Key files to read first in the next session

1. `CLAUDE.md` (root) — project rules + tech stack + memory
2. `.planning/STATE.md` — current state including this handoff reference
3. `.planning/phases/02-platform-mvp/02-HUMAN-UAT.md` — Phase 02 UAT diagnostic from earlier today (1 pass, 4 partial, 4 fail, 4 blocked)
4. `apps/pwa/src/views/me/Me.vue` — the dashboard the user lands on after login (entry point for everything else)
5. `apps/pwa/src/router/index.ts` — has DEV bypass for `requiresAge` guard (`260507-hvf`) — may need revisit since `verifyAge` is now deployed

## Memory constraints

Two persistent memories now in place at `~/.claude/projects/C--Users-srpar-WebstormProjects-game-changers/memory/`:

1. **deploy-firebase-binary.md** — always use `pnpm exec firebase`, never global
2. **prioritize-user-facing-mvp.md** — broken UI > completed infra (the lesson from this pivot)

## Goal for the next session

User can sign up → login → click around `/me`, `/events`, `/challenges`, `/contenido` → things actually happen. Drop everything else.
