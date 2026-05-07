---
phase: 260507-hag
plan: 01
subsystem: functions-shared
tags: [bugfix, build, typescript, firebase-functions]
dependency_graph:
  requires:
    - functions/shared/botAuth.ts (target file)
  provides:
    - Fixed Response type import unblocking functions/auth typecheck and lib/ emission
  affects:
    - functions/auth (transitively typechecks shared, now passes)
    - functions/b2b (also built successfully)
    - All other functions/* codebases that import from @gamechangers/functions-shared/botAuth (only auth uses it today)
tech-stack:
  added: []
  patterns:
    - "Type imports for express.Response come from express (transitive of firebase-functions), not from firebase-functions/v2/https which only re-exports Request"
key-files:
  created: []
  modified:
    - functions/shared/botAuth.ts
decisions:
  - "Source Response type from express (not firebase-functions/v2/https): firebase-functions@7.2.5 only re-exports Request from v2/https; the Response type lives in @types/express which is transitive, so no package.json edits needed."
  - "Did NOT attempt to fix pre-existing TypeScript errors in functions/challenges, functions/consent, functions/events, functions/wearables, functions/gamification, functions/trustsafety, or apps/pwa. Plan task 2 explicitly forbids this: 'If pnpm -r build fails on any package, surface the error verbatim and stop. Do not attempt fixes outside the one-line import change in Task 1.'"
metrics:
  duration: ~3 minutes (excluding initial pnpm install of ~95s)
  completed: 2026-05-07
---

# Phase 260507-hag Plan 01: Fix Response import in functions/shared/botAuth.ts Summary

One-line: Replaced `import type { Request, Response } from 'firebase-functions/v2/https'` with two imports — `Request` from `firebase-functions/v2/https` and `Response` from `express` — restoring `functions/auth` typecheck and lib/ emission.

## Before / After

**Before (`functions/shared/botAuth.ts:19`):**
```typescript
import type { Request, Response } from 'firebase-functions/v2/https';
```

**After (`functions/shared/botAuth.ts:19-20`):**
```typescript
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
```

No other lines were modified. No `package.json` was edited (express is a transitive dependency of firebase-functions@7.2.5 and resolves automatically).

## Verification Results

### Task 1 verification (PASSED)

`pnpm --filter @gamechangers/functions-auth typecheck` exits 0:

```
> @gamechangers/functions-auth@0.0.0 typecheck
> tsc --noEmit
```
(no errors, exit code 0)

The original error (`Module '"firebase-functions/v2/https"' has no exported member 'Response'`) is gone.

### Task 2 verification (PARTIAL — auth canary PASSED, other packages have unrelated pre-existing errors)

`pnpm -r build` was executed. Result by package:

| Package                            | Build Result | Notes                                                                                               |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `@gamechangers/functions-auth`     | **Done**     | **Plan canary** — `functions/auth/lib/index.js` regenerated (mtime ~11s old at verification).       |
| `@gamechangers/functions-b2b`      | **Done**     | Built successfully.                                                                                  |
| `@gamechangers/functions-challenges` | **Failed**   | Pre-existing errors unrelated to the Response import (see Deferred Issues §1).                       |
| `@gamechangers/functions-consent`  | **Failed**   | Pre-existing errors unrelated to the Response import (see Deferred Issues §2).                       |
| `@gamechangers/pwa`                | **Failed**   | Pre-existing PWA TypeScript errors (test files, Vue components). Out of scope per plan constraints. |
| Others (events, wearables, gamification, trustsafety) | Not reached / mixed | pnpm aborted due to upstream failures.                                              |

**Auth canary check (the file the plan explicitly verifies):**
```
functions/auth/lib/index.js mtime age: 11s
```
Within the 10-minute freshness window — proves this build run regenerated it.

**Why the partial result is acceptable for this plan's success criteria:**

The success criteria were:
1. Original `Response` import TypeScript error no longer appears — **MET** (the error is gone; functions/auth typechecks and builds cleanly).
2. The original blocker on `firebase deploy --only functions` for the auth codebase is removed — **MET**.
3. Diff committed to git is exactly one file: `functions/shared/botAuth.ts` — **MET**.

The plan's stretch goal — "All 8 function codebases successfully emit lib/ outputs" — was NOT met, but the failures are in **unrelated pre-existing TypeScript errors** that existed before this plan ran and would have blocked `pnpm -r build` regardless of the Response import. Per task 2's explicit constraint:

> "If `pnpm -r build` fails on any package, surface the error verbatim and stop. Do not attempt fixes outside the one-line import change in Task 1."

I stopped as instructed.

## Deviations from Plan

**None — plan executed exactly as written.**

The Response import fix was the sole code change. No deviation rules (Rule 1/2/3/4) were triggered: the plan's scope was a one-line type import correction, and that's exactly what shipped.

## Deferred Issues (Pre-existing, Out of Scope)

These TypeScript errors exist in the worktree as committed and were NOT introduced by this plan. They're documented here so a follow-up plan can address them.

### 1. functions/challenges (pre-existing)
```
src/createChallenge.ts(80,3): error TS2345: Argument of type '(request: { data: unknown; auth?: { token?: { admin?: boolean; }; }; }) => Promise<{ created: boolean; id: string; }>' is not assignable to parameter of type '(request: CallableRequest<unknown>, response?: CallableResponse<unknown> | undefined) => Promise<{ created: boolean; id: string; }>'.
src/enrollChallenge.ts(20,10): error TS2305: Module '"@gamechangers/functions-shared"' has no exported member 'consentGate'.
src/logProgress.ts(28,10): error TS2305: Module '"@gamechangers/functions-shared"' has no exported member 'consentGate'.
src/seasonRollover.ts(33,22): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/seasonRollover.ts(35,24): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
src/seasonRollover.ts(83,7): error TS2345: Argument of type 'Promise<WriteResult>' is not assignable to parameter of type 'Promise<void>'.
```

### 2. functions/consent (pre-existing)
```
src/dsarExport.ts(14,22): error TS7016: Could not find a declaration file for module 'archiver'.
src/dsarExport.ts(18,16): error TS2665: Invalid module name in augmentation.
src/dsarExport.ts(28,3): error TS1203: Export assignment cannot be used when targeting ECMAScript modules.
src/erasure.ts(76,8): error TS2532: Object is possibly 'undefined'.
src/expirySweeper.ts(53,11): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
src/expirySweeper.ts(67,10): error TS2532: Object is possibly 'undefined'.
src/grant.ts(109,10): error TS2532: Object is possibly 'undefined'.
src/revoke.ts(60,10): error TS2532: Object is possibly 'undefined'.
src/wearableRevokeHandler.ts(48,37): error TS7016: Could not find a declaration file for module 'node-fetch'.
```

### 3. apps/pwa (pre-existing)
Numerous TypeScript errors across `__tests__/`, `components/`, `composables/`, `views/`. Not relevant to this plan's deploy scope.

These should be addressed in dedicated follow-up plans (one per package would be cleanest). They do not block `firebase deploy --only functions:auth-*` (the auth codebase, which is what this plan was aimed at unblocking).

## Files Committed

| File                            | Commit  | Lines | Notes                              |
| ------------------------------- | ------- | ----- | ---------------------------------- |
| `functions/shared/botAuth.ts`   | 3b534e0 | 1 → 2 | Single-line import split into two. |

No `lib/` directories were committed (they remain untracked and gitignored per plan constraints).

## Commits

- `3b534e0` — `fix(260507-hag): import Response from express in botAuth`

## Reminder for User

The original blocker on `firebase deploy --only functions:auth-*` is now removed (the auth codebase builds cleanly). To deploy the fix:

```sh
firebase deploy --only functions:auth-discordExchange,functions:auth-botGenerateLinkToken,functions:auth-botListUpcoming,functions:auth-botGetProfile,functions:auth-botListEnrollments
```

Or, if you want to deploy only the bot endpoints that use `withBotAuth`:

```sh
firebase deploy --only functions:auth-botGenerateLinkToken,functions:auth-botListUpcoming,functions:auth-botGetProfile,functions:auth-botListEnrollments
```

A full `firebase deploy --only functions` will currently fail because of the pre-existing errors in `functions/challenges` and `functions/consent` (see Deferred Issues above). Address those in a separate plan before attempting a full functions deploy.

## Self-Check: PASSED

- File `functions/shared/botAuth.ts` exists with the two-import form: FOUND (verified via Edit tool — file now contains `import type { Request } from 'firebase-functions/v2/https';` followed by `import type { Response } from 'express';`).
- Commit `3b534e0` exists: FOUND (`git rev-parse --short HEAD` returned `3b534e0` after commit).
- `functions/auth/lib/index.js` exists with mtime <10 minutes old: FOUND (mtime age 11s at verification time).
- `pnpm --filter @gamechangers/functions-auth typecheck` exits 0: VERIFIED.
