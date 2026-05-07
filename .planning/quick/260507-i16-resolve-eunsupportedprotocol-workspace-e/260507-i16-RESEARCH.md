# Quick Task 260507-i16 — Resolve `EUNSUPPORTEDPROTOCOL workspace:*` for `firebase deploy`

**Researched:** 2026-05-07
**Domain:** Firebase Functions v2 + pnpm 9 workspaces (8 codebases)
**Confidence:** HIGH
**Mode:** quick-task — decision-oriented

## Summary

Firebase Cloud Build runs `npm install` against the uploaded source dir; npm does not understand pnpm's `workspace:*` protocol, so any function package depending on `@gamechangers/shared` or `@gamechangers/functions-shared` fails with `EUNSUPPORTEDPROTOCOL` `[VERIFIED: GH firebase-tools#5911, pnpm#4079]`. There is no first-party Firebase fix in 2026 — issue #5911 is still open since May 2023 `[VERIFIED: GitHub]`.

The community has converged on a single canonical solution: **`isolate-package` by Thijs Koerselman (`0x80`)**, integrated through Firebase's existing `predeploy` hook with `"isolate": true` in `firebase.json`. This is consumed via the `firebase-tools-with-isolate` fork (current = upstream) `[VERIFIED: npm 2026-05-01, fork v15.16.0 = upstream v15.16.0]`. The fork is daily-synced to upstream and has been the de-facto answer in articles, GitHub recommendations, and even the deprecated `firebase-pnpm-workspaces` README which now points users at it `[VERIFIED: willviles/firebase-pnpm-workspaces archived Feb 2024 with redirect notice]`.

**Primary recommendation:** **Adopt `isolate-package` via `firebase-tools-with-isolate`** with `"isolate": true` per codebase entry in `firebase.json`. It is the lowest-risk option that (a) keeps the source tree unchanged, (b) preserves pnpm workspace dev ergonomics, (c) supports multiple codebases natively, (d) is ESM/subpath-exports compatible, and (e) is actively maintained. Net diff for this repo is ~5 lines per codebase in `firebase.json` + 1 root devDep swap.

## Phase Constraints (from CLAUDE.md)

- Stack locked: Firebase Functions v2 modular API, Node 22 runtime, region `southamerica-east1` — solution must not touch any of these `[CITED: CLAUDE.md]`.
- 8 codebases (auth, consent, events, challenges, wearables, gamification, b2b, trustsafety) — solution must apply uniformly to all `[VERIFIED: firebase.json]`.
- pnpm 9.15.0 locked at root `[VERIFIED: package.json packageManager]`.
- ESM (`"type": "module"`) end-to-end including `functions/shared/` with subpath exports (`./hmac`, `./kms`, `./botAuth`, etc.) `[VERIFIED: functions/shared/package.json]`.
- `@gamechangers/shared` is a TS-source workspace package (no build step, `main` = `src/index.ts`); `@gamechangers/functions-shared` builds to `lib/` `[VERIFIED: package.json files]`.
- 260507-hag already fixed the `Response` import in `functions/shared/botAuth.ts` — no further refactor of shared lib needed for THIS task.

## Comparison of Options

| Option | Integration effort | Build-time cost | Runtime risk | Debug-ability | Lock-in / maintenance | Evidence |
|---|---|---|---|---|---|---|
| **A. `isolate-package` + `firebase-tools-with-isolate`** (RECOMMENDED) | LOW — `~5 LOC/codebase` in `firebase.json`, swap one devDep | +2-5 s/codebase (isolate run) | Very low — produces a real `node_modules` Cloud Build can `npm install` cleanly | HIGH — original source maps, real files, no transpilation | Tracks upstream daily; v15.16.0 = upstream v15.16.0 as of 2026-05-01 | `[VERIFIED]` GH 0x80/firebase-tools-with-isolate, npm 1.32.1 (2026-04-30) |
| **B. Bundle each fn with esbuild/tsup** | MEDIUM — write esbuild config per codebase, set `"main": "dist/bundle.js"`, externalise `firebase-functions`/`firebase-admin` | +1-3 s/codebase | MEDIUM — bundling Node 22 ESM with `firebase-admin` (uses dynamic require for KMS) is fragile | LOW — Cloud Run logs reference bundled files; needs sourcemaps uploaded to Sentry | None — own your config | `[CITED]` firecms.co/blog/firebase_functions_monorepo (chose tarball over esbuild for this reason) |
| **C. `pnpm deploy --filter <pkg> <out>` + repoint `firebase.json` source** | MEDIUM — predeploy hook, 8 output dirs | +3-7 s/codebase | LOW — official pnpm command, rewrites `workspace:*` to concrete versions | HIGH — same as A | None (official pnpm) but **requires `inject-workspace-packages=true`** in `.npmrc`, adds a deploy artifact dir per codebase to manage | `[VERIFIED]` pnpm.io/cli/deploy |
| **D. Pre-deploy `sed` rewrite of `workspace:*` → `file:../../packages/...`** | LOW (dirty) | Negligible | HIGH — leaves a modified `package.json` in the workspace; CI/dev sync hazards | HIGH | None but error-prone | `[CITED]` sworld-docs.netlify.app (older recipe) |

**Why not B (bundle):** The `firebase-admin` SDK loads `@google-cloud/firestore` and `@google-cloud/kms` (already in `functions/shared/`) via lazy/conditional requires; bundling them is a known footgun. The locked stack uses Node 22 ESM with subpath exports — esbuild can do it but the maintenance surface is meaningful and 8× the work. Cite: firecms.co explicitly evaluated bundlers and rejected them for "bloated bundles, dependency conflicts" `[CITED]`.

**Why not C (`pnpm deploy`):** It works, but each codebase needs its own deploy artifact dir, `firebase.json` `source` must repoint to that dir, and it does **not** integrate with `firebase emulators:start` (the emulator reads the source dir directly, so dev mode would either skip the deploy step or run it on every change). Option A keeps `source` pointed at the workspace dir (emulator-friendly) and only isolates at deploy time.

**Why not D (`sed` rewrite):** Active hazard — a cancelled deploy leaves the working tree dirty; CI must rollback. No.

## Recommendation: Option A — `isolate-package` via `firebase-tools-with-isolate`

**Rationale:**
1. **Native multi-codebase support.** Per-entry `"isolate": true` flag means each of the 8 codebases gets its own pruned `node_modules` with `@gamechangers/shared` and `@gamechangers/functions-shared` materialised as real packages with rewritten lockfile entries `[VERIFIED: GH 0x80/firebase-tools-with-isolate README, multi-codebase example]`.
2. **Emulator stays untouched.** `firebase.json` `source` continues to point at `functions/<name>` — isolation runs only inside the deploy command, not the emulator path `[CITED: 0x80/firebase-tools-with-isolate README — "isolation runs automatically whenever your functions source directory sits inside a detected monorepo... only as part of the deploy command"]`.
3. **Subpath exports work.** `isolate-package` copies the full source tree of internal deps (including `exports` map in `package.json`) — `@gamechangers/functions-shared/botAuth` resolves the same way it does in dev `[CITED: 0x80/isolate-package README — "Compatible with Firebase Functions (1st and 2nd generation)"]`. **Note:** `@gamechangers/shared`'s `main` points at `src/index.ts` (TS source). Either (a) add a `build` step that emits `lib/index.js` and switch `main`, OR (b) trust the consuming function's `tsc` to resolve TS via project references. **(a) is safer for the deploy artifact** — see Pitfalls.
4. **Maintenance.** `firebase-tools-with-isolate` is a daily-synced fork (same minor.patch as upstream); adding ~50 LOC of integration `[VERIFIED]`. If upstream merges #5911 we drop the fork.
5. **Production references.** firecms (the headless CMS at firecms.co) uses it; Thijs Koerselman's Medium article documents the pattern; the pnpm community discussion #4079 cites it.

## Implementation Sketch

### 1. Root `package.json` — devDep swap

Replace `firebase-tools` with `firebase-tools-with-isolate` (drop-in, exposes the same `firebase` binary):

```jsonc
// package.json
"devDependencies": {
  // remove:    "firebase-tools": "^15.15.0",
  "firebase-tools-with-isolate": "^15.16.0",  // tracks upstream
  "isolate-package": "^1.32.1"
}
```

CRITICAL: per fork README, **uninstall `firebase-tools` first** — both packages provide the `firebase` binary and PATH precedence is ambiguous.

```bash
pnpm remove -D firebase-tools
pnpm add -D firebase-tools-with-isolate isolate-package
```

### 2. `firebase.json` — add `"isolate": true` to all 8 entries

```jsonc
{
  "functions": [
    {
      "codebase": "auth",
      "source": "functions/auth",
      "runtime": "nodejs22",
      "region": "southamerica-east1",
      "isolate": true,
      "predeploy": [
        "pnpm --filter @gamechangers/shared build || true",
        "pnpm --filter @gamechangers/functions-shared build",
        "pnpm --filter @gamechangers/functions-auth build"
      ]
    },
    // ... repeat for consent, events, challenges, wearables, gamification, b2b, trustsafety
  ]
}
```

The `predeploy` array (a) builds workspace dep `lib/` artifacts so the isolated copy contains JS, not TS; (b) builds the codebase itself. `isolate-package` runs **after** `predeploy` because `firebase-tools-with-isolate` injects it into the deploy pipeline post-predeploy.

### 3. Per-codebase `package.json` — no change

`workspace:*` entries stay as-is. `isolate-package` rewrites them in the produced isolate dir; the source tree is untouched.

### 4. `@gamechangers/shared` — fix the `main` field

`packages/shared/package.json` currently has `"main": "src/index.ts"` and no build script. Cloud Build's Node 22 cannot execute `.ts` directly. Add:

```jsonc
{
  "name": "@gamechangers/shared",
  "type": "module",
  "main": "lib/index.js",       // was: "src/index.ts"
  "types": "lib/index.d.ts",    // was: "src/index.ts"
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    // ...
  },
  "exports": {
    ".":         { "types": "./lib/index.d.ts",         "default": "./lib/index.js" },
    "./schemas": { "types": "./lib/schemas/index.d.ts", "default": "./lib/schemas/index.js" },
    "./types":   { "types": "./lib/types/index.d.ts",   "default": "./lib/types/index.js" },
    "./xp":      { "types": "./lib/xp.d.ts",            "default": "./lib/xp.js" }
  }
}
```

Plus a minimal `tsconfig.build.json` emitting to `lib/`. **This change is mandatory for any deploy strategy** — Cloud Run cannot run TS source. It's not specific to the isolate approach.

### 5. Developer flow — unchanged surface

`firebase deploy --only functions:auth` still works. Behind the scenes:
1. Firebase CLI runs the `predeploy` array → builds `packages/shared/lib`, `functions/shared/lib`, `functions/auth/lib`.
2. `firebase-tools-with-isolate` calls `isolate-package` against `functions/auth` → produces `functions/auth/.isolate/` (or similar) with materialised internal deps + pruned pnpm-lock.
3. Firebase CLI uploads `.isolate/` to Cloud Build.
4. Cloud Build runs `npm install` — sees no `workspace:*` (rewritten to file: refs that point at materialised local copies).

For deploying all 8 in one shot: `firebase deploy --only functions` runs the 8 isolations in parallel `[CITED: 0x80/firebase-tools-with-isolate README — "lockfile isolation code is solid and works in parallel for multiple packages, unlike NPM"]`.

### 6. CI

GitHub Actions: install `firebase-tools-with-isolate` (already in devDeps), call `firebase deploy --only functions --token $FIREBASE_TOKEN`. No special handling needed — `--only functions:<codebase>` filter passes through to the predeploy/isolate path correctly because the fork hooks the per-entry pipeline `[VERIFIED: fork README]`.

## Pitfalls and Gotchas

### P1 — `firebase.json` schema warning
The deploy log already shows `Field "/functions/0" in "firebase.json" is possibly invalid`. The `"isolate"` field is a fork-specific extension and will trip the upstream JSON schema validator further. **Mitigation:** the warning is non-fatal (Firebase CLI prints it but proceeds). To silence, add a top-level `"$schema"` field referencing the fork's schema, or accept the warning. `[ASSUMED: warning is non-fatal in fork — verify in first deploy]`.

### P2 — `--only functions:auth` codebase filter + predeploy hooks
`firebase-tools` runs `predeploy` hooks **only for the matched codebase entries** `[VERIFIED: firebase.google.com/docs/cli/#deploy_targets]`. So `firebase deploy --only functions:auth` runs only the `auth` entry's predeploy array — that array must include the build of any workspace deps it consumes (hence the explicit `pnpm --filter @gamechangers/shared build` and `--filter @gamechangers/functions-shared build` lines above). DO NOT rely on a global pre-build.

### P3 — `@gamechangers/shared` TS-source main field
Listed above (§4). Without the `lib/` build, the isolate ships TS files that Cloud Build's `npm install` can't resolve at runtime. This is the single most likely deploy-time failure after enabling isolate. Add the `tsconfig.build.json` and the `build` script in this same task.

### P4 — Subpath exports across the isolate boundary
`@gamechangers/functions-shared` exports `./hmac`, `./kms`, `./botAuth`, etc. `isolate-package` copies the package's `package.json` verbatim, so subpath exports are preserved `[CITED: 0x80/isolate-package — "Compatible with Firebase Functions"]`. **Verify in the first deploy** that `import { ... } from '@gamechangers/functions-shared/botAuth'` resolves at cold-start. `[ASSUMED: subpath exports work cleanly — needs first-deploy verification]`.

### P5 — Cloud Build Node 22
Firebase Cloud Build for `nodejs22` runtime uses Node 22 with npm 10+. `npm 10` understands `file:` deps, so the rewritten `workspace:*` → `file:./.isolate-deps/...` references resolve cleanly `[VERIFIED: docs.npmjs.com — file: protocol stable since npm 7]`. No issue here.

### P6 — pnpm `inject-workspace-packages` setting
`pnpm deploy` (Option C) requires `inject-workspace-packages=true` in `.npmrc`. **`isolate-package` (Option A) does NOT** — it works regardless of this setting `[CITED: pnpm.io/cli/deploy — explicit prerequisite for deploy command, not isolate]`. One less landmine.

### P7 — `Response` import fix from 260507-hag
Already done. No further change to `functions/shared/botAuth.ts` needed for this task.

### P8 — Emulator parity
`firebase emulators:start` reads `functions/<name>` directly and uses pnpm's symlinked workspace resolution. Isolation doesn't run in emulator mode `[VERIFIED: 0x80/firebase-tools-with-isolate — "live code updates when running the Firebase emulators locally"]`. Local dev ergonomics preserved.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The fork's `"isolate": true` field doesn't escalate `firebase.json` schema warning to a hard error | P1 | Pre-deploy lint fails; mitigation is upstream-fixed by referencing fork schema URL |
| A2 | Subpath exports of `@gamechangers/functions-shared` resolve at Cloud Run cold-start exactly as in dev | P4 | One-off import fix; isolate-package handles `package.json` verbatim so very low likelihood |

## Code Changes Required (one task, ordered)

1. `packages/shared/package.json` — fix `main`, `types`, add `build` script, add real `lib/` `exports` map.
2. `packages/shared/tsconfig.build.json` — new file, emits to `lib/`.
3. Root `package.json` — swap `firebase-tools` for `firebase-tools-with-isolate` + add `isolate-package` as devDep.
4. `firebase.json` — add `"isolate": true` and `"predeploy": [...]` to all 8 function entries.
5. Re-run `pnpm install`.
6. Test: `firebase deploy --only functions:auth` from a clean tree.
7. If green: deploy the rest in batches of 2 (region quota + cold-build time).

Estimated effort: **30-60 minutes** for steps 1-5, plus one deploy iteration.

## Sources

### Primary (HIGH confidence)
- [GH firebase/firebase-tools#5911 — pnpm workspaces support](https://github.com/firebase/firebase-tools/issues/5911) — issue still open May 2023, no upstream fix
- [GH firebase/firebase-tools#7334 — pnpm workspace firebase support](https://github.com/firebase/firebase-tools/issues/7334)
- [GH 0x80/firebase-tools-with-isolate](https://github.com/0x80/firebase-tools-with-isolate) — v15.16.0 (2026-05-01), tracks upstream daily
- [GH 0x80/isolate-package](https://github.com/0x80/isolate-package) — v1.32.1 (2026-04-30)
- [GH 0x80/isolate-package docs/firebase.md](https://github.com/0x80/isolate-package/blob/main/docs/firebase.md) — multi-codebase example with `"isolate": true`
- [pnpm.io/cli/deploy](https://pnpm.io/cli/deploy) — official `pnpm deploy --filter` docs (Option C reference)
- [GH pnpm/discussions#4079 — Can't deploy firebase functions](https://github.com/orgs/pnpm/discussions/4079) — community confirmation of the workspace:* incompatibility
- [firebase.google.com/docs/functions/organize-functions](https://firebase.google.com/docs/functions/organize-functions) — multi-codebase `firebase.json` schema

### Secondary (MEDIUM confidence — production references)
- [Thijs Koerselman — Deploy to Firebase Without the Hacks (Medium)](https://thijs-koerselman.medium.com/deploy-to-firebase-without-the-hacks-e685de39025e)
- [firecms.co — Firebase Functions Monorepo Deployments That Work](https://firecms.co/blog/firebase_functions_monorepo/) — evaluated bundling, chose tarball/isolate
- [GH willviles/firebase-pnpm-workspaces (archived Feb 2024)](https://github.com/willviles/firebase-pnpm-workspaces) — predecessor tool, README redirects to isolate-package

### Tertiary (LOW — informational)
- [SWorld Docs — Deploy Firebase Functions in monorepo with pnpm](https://sworld-docs.netlify.app/blog/firebase-functions-deployment/) — older `pnpm-isolate-workspace` recipe (predecessor to isolate-package)

## Metadata

**Confidence breakdown:**
- Recommended option (isolate-package): **HIGH** — multiple official references, daily-synced fork, currently maintained
- Multi-codebase support: **HIGH** — explicit example in fork README
- Subpath exports preservation: **MEDIUM-HIGH** — claimed compatible, no contradicting evidence; needs first-deploy verification
- Schema warning impact: **MEDIUM** — assumed non-fatal; verify on first run

**Research date:** 2026-05-07
**Valid until:** 2026-06-07 (30 days — fork tracks upstream daily; if upstream merges #5911 the recipe simplifies)
