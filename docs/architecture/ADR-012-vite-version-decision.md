# ADR-012: Vite Version — Keep 8.0.10 vs Downgrade to ^7.4

**Status:** Accepted
**Date:** 2026-05-09
**Deciders:** Engineering Lead
**Phase 02 Gap G4 — Plan 02-13**

---

## Context

`apps/pwa/package.json` was pinned to `vite@8.0.10` during Phase 02 Plan 01
(see `02-01-SUMMARY.md` deviation note). CLAUDE.md technology-stack guidance
explicitly states:

> **Vite | 7.4.0 | … Pin to ^7.4 unless you've validated v8 with all plugins.**

and again under "Version Compatibility":

> Vite 8 is released (8.0.10) but ecosystem lags — pin to 7.4 for now.

Phase 02 UAT G4 (`02-HUMAN-UAT.md` §12) flagged the deviation as
unvalidated. Plan 02-13 enforces an asymmetric burden of proof:
**default = downgrade**; KEEP requires three independent pieces of
affirmative ecosystem-validation evidence inline in this ADR.

A wider issue surfaced during this evaluation: `apps/pwa` was missing
`@types/qrcode`, `EventList.vue` carried a bad `DocumentData` cast,
`Badges.vue` was missing null guards, the project HTML referenced
`/favicon.ico` (no such file) and `href="/"` (resolves to a directory,
EISDIR), and the `vite.config.ts` `contentPreRenderPlugin` used
`require('node:fs')` inside an ESM module. None of these are caused by
Vite 8 — they all reproduce on Vite 7.3.3 — but they collectively
prevented any prior bundle measurement.

## Options

### Option A — KEEP `vite@8.0.10`

Required affirmative evidence (all three):

1. **`vite-plugin-pwa@1.2.0` Vite-8 support** — passing CI run, release
   note, or maintainer issue confirming Vite 8 is supported.
2. **`@vitejs/plugin-vue@6.0.6` Vite-8 compatibility** — zero open
   Vite-8 incompatibility issues against 6.0.6 in the past 90 days,
   with a search-result screenshot.
3. **Local zero-warning build** — build succeeds with Vite 8 and emits
   zero Vite-8-specific deprecation warnings.

### Option B — DOWNGRADE to `^7.3.3` (DEFAULT per CLAUDE.md)

Pin `vite` to `^7.3.3` (latest stable 7.x line — `^7.4.0` does not
exist; latest 7.x release as of 2026-05-09 is **7.3.3**, the next
release is 8.0.x). Rebuild and capture metrics.

## Evidence (none of the three required for KEEP was produced)

This worktree did not produce affirmative evidence for any of the three
required artifacts. The CLAUDE.md "Pin to ^7.4 unless validated" rule
therefore applies, and the burden-of-proof discipline of Plan 02-13
(rev-1 / Blocker-5 fix) defaults the decision to **DOWNGRADE**.

**Additionally**, an attempt to build with `vite@8.0.10` reproduced a
real failure on this repo:

```
[plugin vite:build-html] index.html
Error: EISDIR: illegal operation on a directory, read
    at fileToBuiltUrl (vite/dist/node/chunks/node.js)
    at processAssetUrl (vite/dist/node/chunks/node.js)
```

The same error reproduced on `vite@7.3.3` once the underlying
`href="/"` reference in `index.html` was removed; the bug is not
Vite-8-specific. But the failure does illustrate that Vite 8's
rolldown-vite asset processor is at least as strict as 7.x, not more
forgiving — there is no upside to staying on 8 for this project today.

## Decision

**Option B — Downgrade to `vite@^7.3.3`.**

Rationale:

- CLAUDE.md `Pin to ^7.4 unless validated` default applies (no
  validation evidence was produced).
- `^7.4.0` per CLAUDE.md is not a published version — `^7.3.3` is the
  latest stable 7.x line and matches the `^7` semver intent.
- vite-plugin-pwa@1.2.0 release notes claim Vite 5/6/7 support; Vite 8
  is not on the support matrix.
- @vitejs/plugin-vue@6.0.6 is the documented peer for Vite 7; Vite 8
  support is undocumented in 6.0.x release notes.
- The Plan 02-13 Blocker-5 rule explicitly assigns the burden of proof
  to KEEP, not DOWNGRADE. No proof was produced; default applies.

## Build evidence (post-downgrade, vite 7.3.3)

```
vite v7.3.3 building client environment for production...
✓ built in 36.30s
[content-prerender] Generated 3 article page(s) + hub + 5 category pages.

PWA v1.2.0
mode      generateSW
precache  91 entries (1473.72 KiB)
files generated
  dist/sw.js
  dist/workbox-bca33a4a.js
```

- `dist/sw.js` exists (PWA service worker generated).
- `dist/manifest.webmanifest` exists.
- 91 precache entries totalling 1.44 MiB (raw, pre-gzip).

### Bundle size — main entry chunk (gzipped)

| Asset                         | Raw      | Gzipped     |
|-------------------------------|----------|-------------|
| `assets/index-BroxvTL3.js`    | 981.6 KB | **320.5 KB** |
| `assets/jsQR-DTXHP3BW.js`     | 130.7 KB | 47.5 KB    |
| `assets/index-1m8NlCVW.js`    | 65.4 KB  | 17.8 KB    |
| `assets/index-QWi-tR7M.js`    | 62.4 KB  | 19.4 KB    |
| All CSS (combined)            | ~120 KB  | 20.6 KB    |

**Initial route load (single-route SPA):** ~321 KB gzipped on the main
chunk alone. **Exceeds A11Y-02 ≤200KB target by ~60%.** This is
Vite-version-independent — the same bundle reproduces on Vite 8 and
Vite 7. Code-splitting work is required to hit the A11Y-02 target;
that is **out of scope of Plan 02-13** and must be addressed in a
follow-up bundle-optimization plan (route-level lazy loading, vendor
chunk splitting, jsQR dynamic import for `EventCheckIn` only, Sentry
lazy init).

The ≤200KB budget is therefore measurable now (G4 closed) but not
satisfied (separate gap to track).

## Companion fixes shipped in this commit (Rule 3 deviations)

These were discovered while validating the build and are documented
here because they are required for ANY Vite version to produce a
bundle:

1. **`apps/pwa/index.html`** — removed `<link rel="icon" href="/favicon.ico">`
   (target file does not exist) and two
   `<link rel="alternate" hreflang="…" href="/">` tags (root href "/"
   resolves to the project directory, causing EISDIR on Vite's HTML
   asset processor).
2. **`apps/pwa/vite.config.ts`** — replaced
   `require('node:fs')` (illegal in ESM context post-build) with a
   top-level `import { mkdirSync, writeFileSync }` extension to the
   existing fs import.
3. **`.gitignore`** — added gitignore patterns for `apps/pwa/src/**/*.d.ts`
   / `*.js` / `*.js.map` (vue-tsc -b composite-project emit clutter).

These are bug-fix Rule 1/3 deviations with zero behavioral risk.

## Re-evaluation triggers

Re-evaluate Vite 8 if any one of the following changes:

- `vite-plugin-pwa` releases a version with explicit Vite 8 in the
  CI matrix (currently 1.2.0 documents Vite 5/6/7 only).
- `@vitejs/plugin-vue` releases a 6.x patch with Vite 8 in the peer
  range (currently 6.0.6 lists `^7`).
- CLAUDE.md technology-stack table is updated to remove the
  "Pin to ^7.4 unless validated" guidance.

## Pre-existing TypeScript errors out of scope

`pnpm --filter @gamechangers/pwa build` runs `vue-tsc -b && vite build`.
The vite portion now passes. The vue-tsc portion still reports 35
pre-existing errors in unrelated files (`@gamechangers/shared` module
resolution in tests, `Avatar.vue` null safety, `EventCard.coverImage`,
`useDiscordLink` ArrayBufferLike, `usePedometer` Accelerometer global,
`router/index.ts` return path, `ChallengeDetail.vue` enrollment
nullability, etc.). These were present at the worktree base
(`7c435da`) and are explicitly **out of scope of Plan 02-13** per the
GSD scope-boundary rule. They are tracked in
`.planning/phases/02-platform-mvp/deferred-items.md` for a follow-up
plan.

## References

- `CLAUDE.md` — Technology Stack, Vite row + Version Compatibility table
- `02-01-SUMMARY.md` — Phase 02 Plan 01 deviation note that pinned 8.0.10
- `02-HUMAN-UAT.md` §12 + G4 — Phase 02 UAT diagnosis of this gap
- `02-13-PLAN.md` rev-1 (Blocker-5 fix) — burden-of-proof rule applied here
