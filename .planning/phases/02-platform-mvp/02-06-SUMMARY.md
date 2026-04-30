---
phase: 02-platform-mvp
plan: "06"
subsystem: content-hub
tags: [content, cms, seo, gamification, consent, pss4, pubsub]
dependency_graph:
  requires: [02-04, 02-05]
  provides: [content-hub-routes, content-completed-callable, cms-workflow]
  affects: [apps/pwa, functions/gamification, packages/shared]
tech_stack:
  added: []
  patterns:
    - Markdown-in-git CMS with snapshot.json export for build-time pre-render
    - Custom vite plugin (contentPreRenderPlugin) for static route generation from snapshot
    - vi.hoisted() pattern for shared mock state across hoisted vi.mock factories
    - Two-layer consent enforcement: client gate (useContentTracking) + server gate (consentGate)
    - IntersectionObserver for scroll-based 80% completion detection (ContentArticle)
    - Pub/Sub decoupling: contentCompleted callable publishes; xpAward (Plan 05) consumes
key_files:
  created:
    - apps/pwa/src/views/content/ContentArticle.vue
    - apps/pwa/cms/README.md
    - apps/pwa/cms/sample-content/movimiento-stretching-gamer.es.md
    - apps/pwa/cms/sample-content/movimiento-stretching-gamer.en.md
    - apps/pwa/cms/sample-content/mente-burnout-en-rankeds.es.md
    - apps/pwa/cms/sample-content/mente-burnout-en-rankeds.en.md
    - apps/pwa/cms/sample-content/quiz-estres.es.md
    - apps/pwa/cms/sample-content/quiz-estres.en.md
    - apps/pwa/src/cms/snapshot.json
    - scripts/cms-publish.ts
    - functions/gamification/src/contentCompleted.ts
    - functions/gamification/src/__tests__/contentCompleted.test.ts
  modified:
    - apps/pwa/src/components/ContentCard.vue (bug fix: duplicate data-pillar attr)
    - apps/pwa/src/router/index.ts (added /contenido + /quiz routes)
    - apps/pwa/src/locales/es.json (added content.* namespace)
    - apps/pwa/src/locales/en.json (added content.* namespace)
    - apps/pwa/vite.config.ts (added contentPreRenderPlugin)
    - functions/gamification/src/index.ts (export contentCompleted)
    - functions/gamification/package.json (add @google-cloud/pubsub dep)
decisions:
  - "vite-ssg incompatible with Vue Router 5 — used custom contentPreRenderPlugin instead; generates dist/contenido/<slug>/index.html from snapshot.json at build time"
  - "CMS uses minimal inline YAML parser to avoid gray-matter root dependency; sufficient for project frontmatter schema"
  - "contentCompleted uses @google-cloud/pubsub directly (not trigger doc pattern) for reliable Pub/Sub delivery"
  - "snapshot.json committed to git so build is reproducible without Firestore credentials"
metrics:
  duration_minutes: 95
  completed_date: "2026-04-29"
  tasks_completed: 2
  files_created: 12
  files_modified: 7
  tests_added: 4
  tests_total_passing: 24
---

# Phase 02 Plan 06: Content Hub — Summary

SEO-optimized content hub with consent-gated tracking, CMS Markdown workflow, PSS-4 wellness quiz, and XP-on-completion via Pub/Sub.

## What was built

### Content hub routes (public, no auth required)

| Route | Component | Notes |
|-------|-----------|-------|
| `/contenido` (alias `/content`) | `ContentHub.vue` | Pillar tabs, article grid, soft Layer 1 nudge |
| `/contenido/categoria/:cat` (alias `/content/categoria/:cat`) | `ContentCategory.vue` | Filtered by pillar |
| `/contenido/:slug` (alias `/content/article/:slug`) | `ContentArticle.vue` | Markdown body, scroll tracking, manual complete CTA |
| `/quiz/:id` | `WellnessAssessment.vue` | Layer 2 gated PSS-4 quiz |

### Pillar taxonomy (5 pillars)

| Pillar | Color token | ES label | EN label |
|--------|-------------|----------|----------|
| movimiento | accent-xp (green) | Movimiento | Movement |
| mente | blue-400 (info-blue) | Mente | Mental Health |
| nutricion | amber-400 | Nutrición | Nutrition |
| comunidad | surface-3 | Comunidad | Community |
| data | text-muted | Data | Data |

### CMS workflow: Markdown → cms-publish → Firestore + snapshot.json

```
apps/pwa/cms/sample-content/
  {id}.es.md        ← authoritative Spanish content + YAML frontmatter
  {id}.en.md        ← legally-equivalent EN translation
         ↓
scripts/cms-publish.ts
  - Reads all *.es.md files, merges *.en.md body
  - Writes to Firestore /content/{id} (idempotent, publishedAt preserved)
  - Exports apps/pwa/src/cms/snapshot.json (build-time pre-render)
         ↓
vite build (contentPreRenderPlugin)
  - Reads snapshot.json
  - Generates dist/contenido/<slug>/index.html for each article
  - Generates dist/contenido/index.html (hub)
  - Generates dist/contenido/categoria/<pillar>/index.html (5 category pages)
```

**3 seed articles published:**
1. `movimiento-stretching-gamer` — video, pillar=movimiento, clusters=[free-fire, valorant, general]
2. `mente-burnout-en-rankeds` — article, pillar=mente, clusters=[lol, valorant, free-fire, dota, general]
3. `quiz-estres` — quiz (PSS-4), pillar=mente, cluster=[general], requires Layer 2 consent

### Consent gating

| Feature | Consent required | Layer |
|---------|-----------------|-------|
| Content tracking (trackView, markComplete) | `gaming_habits` | Layer 1 |
| XP award (contentCompleted callable) | `gaming_habits` | Layer 1 (re-checked server-side) |
| PSS-4 assessment submission | `health_self_reports` | Layer 2 |

Two-layer enforcement: client gate in `useContentTracking` + server-side `consentGate()` in `contentCompleted` callable (Pitfall #1 protection, T-02-06-03).

### contentCompleted callable

- Region: `southamerica-east1`
- Input: `{ contentId, completionPercent: ≥80, durationSec }`
- Consent: `consentGate(uid, 'gaming_habits')` → throws `permission-denied` if missing
- Anti-cheat: rejects if `durationSec < estReadMinutes * 60 * 0.5`; writes to `/users/{uid}/private/flaggedRecords`
- Idempotency: checks `/users/{uid}/contentCompletions/{contentId}` before publishing
- Publishes `{ type: 'content_completed', uid, contentId, durationSec }` to `xp-events` Pub/Sub
- Does NOT call xpAward directly — decoupled via Pub/Sub per architecture contract

### Pre-render approach (vite-ssg alternative)

`vite-ssg` is incompatible with Vue Router 5 (which this project uses). Instead, a custom `contentPreRenderPlugin` was implemented:

- Runs at Vite `closeBundle` phase (after `dist/` is generated)
- Reads `apps/pwa/src/cms/snapshot.json`
- Injects `window.__GC_PRELOADED_ROUTE__` into each article's HTML stub
- Outputs `dist/contenido/<slug>/index.html` for Firebase Hosting to serve
- Generates hub + 5 category pages

This satisfies SEO pre-render requirement with zero additional dependencies.

### Bundle size

Initial JS is the same SPA bundle as the base app — content routes are lazy-loaded via `() => import(...)` in the router. EmbeddedSocial defers iframe load until user click (no third-party network calls on initial page load), preserving the ≤200KB gzipped target.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Fixed duplicate `data-pillar` attribute in ContentCard.vue**
- **Found during:** Task 1 (ContentCard.test.ts failure)
- **Issue:** `data-pillar` (static, no value) AND `:data-pillar="article.pillar"` (dynamic) both on same element; static attribute shadowed the dynamic binding in Vue test-utils
- **Fix:** Removed the redundant static `data-pillar` attribute; kept only `:data-pillar="article.pillar"`
- **Files modified:** `apps/pwa/src/components/ContentCard.vue`
- **Commit:** 3436856

**2. [Rule 3 — Blocking] vite-ssg incompatible with Vue Router 5**
- **Found during:** Task 1 (plan specifies vite-ssg)
- **Issue:** vite-ssg@0.25+ requires Vue Router 4; project uses Vue Router 5 (current major)
- **Fix:** Custom `contentPreRenderPlugin` in `vite.config.ts` — generates static HTML from `snapshot.json` at build time; achieves same SEO pre-render goal without the incompatible dependency
- **Files modified:** `apps/pwa/vite.config.ts`
- **Commit:** 3436856

**3. [Rule 1 — Bug] cms-publish.ts credential error not caught broadly enough**
- **Found during:** Task 1 (script threw on "Unable to detect Project Id")
- **Issue:** Initial error check only matched "Could not load the default credentials"; GCP throws a different message when no project ID is set
- **Fix:** Broadened catch to include "Unable to detect a Project Id", "Application Default Credentials"
- **Files modified:** `scripts/cms-publish.ts`
- **Commit:** 3436856

**4. [Rule 1 — Bug] vi.mock factory used class expression referencing outer scope**
- **Found during:** Task 2 (contentCompleted.test.ts failed with "Cannot access 'MockPubSub' before initialization")
- **Issue:** `class MockPubSub` declared in outer scope referenced in hoisted `vi.mock` factory
- **Fix:** Used `vi.hoisted()` pattern (inline class inside factory + shared state via hoisted object) — matches Vitest docs for complex mock scenarios
- **Files modified:** `functions/gamification/src/__tests__/contentCompleted.test.ts`
- **Commit:** 9780cbb

## Known Stubs

None — all content routes serve real data from Firestore (or snapshot.json pre-render). The `embeddedMedia.videoId: PLACEHOLDER` in `movimiento-stretching-gamer.es.md` is intentional — the actual YouTube video ID is to be replaced by editorial team before launch (not a code stub; it is a content placeholder documented in `apps/pwa/cms/README.md`).

## Threat Flags

No new network endpoints or trust boundaries beyond those in the plan's threat model. The `contentCompleted` callable is an authenticated HTTPS callable — consistent with the existing callable pattern in the project.

## Self-Check: PASSED

Files verified to exist:
- `apps/pwa/src/views/content/ContentArticle.vue` — FOUND
- `functions/gamification/src/contentCompleted.ts` — FOUND
- `functions/gamification/src/__tests__/contentCompleted.test.ts` — FOUND
- `apps/pwa/cms/README.md` — FOUND
- `apps/pwa/cms/sample-content/movimiento-stretching-gamer.es.md` — FOUND
- `apps/pwa/cms/sample-content/mente-burnout-en-rankeds.es.md` — FOUND
- `apps/pwa/cms/sample-content/quiz-estres.es.md` — FOUND
- `scripts/cms-publish.ts` — FOUND
- `apps/pwa/src/cms/snapshot.json` — FOUND
- `apps/pwa/src/router/index.ts` (extended with content routes) — FOUND
- `apps/pwa/vite.config.ts` (extended with contentPreRenderPlugin) — FOUND
- `apps/pwa/src/locales/es.json` + `en.json` (extended with content.*) — FOUND

Commits verified:
- `3436856` — feat(02-06-task-1): content hub PWA — FOUND
- `9780cbb` — feat(02-06-task-2): contentCompleted callable — FOUND

Tests: 20 PWA + 4 gamification = 24 passing, 0 failing.
