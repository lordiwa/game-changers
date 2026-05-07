---
quick_id: 260507-hvf
description: Skip requiresAge route guard in dev mode to unblock /me access without verifyAge function
date: 2026-05-07
status: complete
commits:
  - acca9b4
---

# 260507-hvf-SUMMARY — Dev-only bypass for `requiresAge` route guard

## Outcome

Bypass added at `apps/pwa/src/router/index.ts` — when `import.meta.env.DEV`
is `true`, the `requiresAge` guard returns early without checking the
`ageVerified` custom claim. Production builds (`vite build`) keep the guard
intact.

A `console.warn` is emitted on every navigation that hits the bypass so the
escape hatch is visible in dev tools.

## Commit

- `acca9b4` — fix(260507-hvf): bypass requiresAge guard in dev mode

## Files modified

- `apps/pwa/src/router/index.ts` (+8 lines, no removals)

## Follow-ups

1. **Camino B (separate task):** Resolve `EUNSUPPORTEDPROTOCOL workspace:*` so
   Cloud Build can install function workspace deps. Either adopt `pnpm deploy`
   per codebase, or bundle each function with esbuild. Affects all 8 function
   codebases.
2. **Revert this bypass:** When `verifyAge` is deployed and reachable from the
   PWA, remove the `if (import.meta.env.DEV)` block in `router/index.ts` so the
   guard runs uniformly across environments.
