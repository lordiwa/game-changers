---
phase: 260507-hag
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - functions/shared/botAuth.ts
autonomous: true
requirements:
  - QUICK-260507-hag
must_haves:
  truths:
    - "TypeScript typecheck passes for @gamechangers/functions-auth (which transitively typechecks functions/shared)"
    - "All 8 function codebases (auth, consent, events, challenges, wearables, gamification, b2b, trustsafety) build successfully via pnpm -r build"
    - "Response type in botAuth.ts resolves to express.Response (not the non-existent firebase-functions/v2/https export)"
  artifacts:
    - path: "functions/shared/botAuth.ts"
      provides: "Bot HMAC auth middleware with corrected Response import"
      contains: "from 'express'"
    - path: "functions/auth/lib/index.js"
      provides: "Compiled output proving auth codebase build succeeds after the fix"
  key_links:
    - from: "functions/shared/botAuth.ts line 19"
      to: "express types"
      via: "import type { Response } from 'express'"
      pattern: "from 'express'"
    - from: "functions/shared/botAuth.ts line 19"
      to: "firebase-functions/v2/https types"
      via: "import type { Request } from 'firebase-functions/v2/https'"
      pattern: "Request.*from 'firebase-functions/v2/https'"
---

<objective>
Fix a TypeScript build error in `functions/shared/botAuth.ts:19` that blocks `firebase deploy --only functions`.

The file imports both `Request` and `Response` from `firebase-functions/v2/https`, but firebase-functions v7.2.5 only re-exports `Request` from that module. `Response` must be imported from `express` (which is a transitive dependency of firebase-functions and resolves without adding it to package.json).

Purpose: Unblock `firebase deploy --only functions` by restoring a successful `pnpm -r build` across all 8 function codebases.

Output: A one-line import fix in `botAuth.ts`, plus regenerated `lib/` directories for all 8 function codebases (lib/ stays gitignored — only the source change is committed).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@functions/shared/botAuth.ts
@functions/shared/package.json
@package.json

<interfaces>
<!-- Current broken import (functions/shared/botAuth.ts line 19): -->
```typescript
import type { Request, Response } from 'firebase-functions/v2/https';
```

<!-- Target fix — split into two imports: -->
```typescript
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
```

<!-- Rationale:
     firebase-functions@7.2.5 only re-exports `Request` from `firebase-functions/v2/https`.
     The `Response` type lives in @types/express (a transitive dep of firebase-functions),
     so the import resolves without adding express to package.json.

     The existing usage on line 23 (`type BotHandler = (req: Request, res: Response, payload: BotPayload) => Promise<void>;`)
     is structurally compatible with express.Response — firebase-functions v2 onRequest handlers
     receive an express Request/Response pair, so this aligns the type with runtime reality.
-->
</interfaces>

</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix Response import in functions/shared/botAuth.ts</name>
  <files>functions/shared/botAuth.ts</files>
  <action>
Edit line 19 of `functions/shared/botAuth.ts`. Replace the single import:

```typescript
import type { Request, Response } from 'firebase-functions/v2/https';
```

with two imports — keep `Request` from `firebase-functions/v2/https`, and source `Response` from `express`:

```typescript
import type { Request } from 'firebase-functions/v2/https';
import type { Response } from 'express';
```

Do NOT modify any other line in the file. Do NOT touch any other source file. Do NOT add `express` to `functions/shared/package.json` — it is already a transitive dependency of `firebase-functions@7.2.5` and the import will resolve via the existing dependency graph.

Why express (not firebase-functions/v2/https): firebase-functions v7.2.5 only re-exports `Request` from the `v2/https` module. The `Response` type is provided by `@types/express`, which firebase-functions pulls in transitively because `onRequest` handlers in v2 receive an express request/response pair. The existing `BotHandler` signature on line 23 is already structurally aligned with express.Response, so no usage-site changes are needed.
  </action>
  <verify>
    <automated>pnpm --filter @gamechangers/functions-auth typecheck</automated>
  </verify>
  <done>
- Line 19 of `functions/shared/botAuth.ts` is replaced with the two-import form shown above.
- No other line in any file is modified.
- `pnpm --filter @gamechangers/functions-auth typecheck` exits with code 0 (which transitively typechecks the shared workspace consumed via `@gamechangers/functions-shared/botAuth`).
  </done>
</task>

<task type="auto">
  <name>Task 2: Regenerate lib/ outputs for all 8 function codebases via pnpm -r build</name>
  <files>(no source files modified — this task only runs the build command and inspects outputs; lib/ directories remain gitignored)</files>
  <action>
From the repo root, run:

```
pnpm -r build
```

This invokes the `build` script in every workspace package. The 8 function codebases (auth, consent, events, challenges, wearables, gamification, b2b, trustsafety) each compile their TypeScript sources to a local `lib/` directory, which is what `firebase deploy --only functions` uploads.

After the command completes successfully, verify that `functions/auth/lib/index.js` exists and has a fresh modification time (within the last few minutes — i.e., regenerated by this build, not stale from a prior run). Use a single `ls`/`stat`-equivalent check; do NOT spot-check every codebase individually beyond the auth canary.

Constraints:
- DO NOT `git add` any `lib/` directory. They are (and must remain) gitignored. Only the source change from Task 1 is committed.
- DO NOT run `firebase deploy` — deploy is the user's responsibility after this plan succeeds.
- If `pnpm -r build` fails on any package, surface the error verbatim and stop. Do not attempt fixes outside the one-line import change in Task 1.
  </action>
  <verify>
    <automated>pnpm -r build &amp;&amp; node -e "const fs=require('fs');const s=fs.statSync('functions/auth/lib/index.js');const ageMs=Date.now()-s.mtimeMs;if(ageMs>10*60*1000){console.error('functions/auth/lib/index.js is stale ('+Math.round(ageMs/1000)+'s old) — build did not regenerate it');process.exit(1);}console.log('functions/auth/lib/index.js fresh ('+Math.round(ageMs/1000)+'s old)');"</automated>
  </verify>
  <done>
- `pnpm -r build` exits with code 0 across all workspace packages.
- `functions/auth/lib/index.js` exists and was modified within the last 10 minutes (proving this build run regenerated it).
- No `lib/` directories are staged for commit.
  </done>
</task>

</tasks>

<verification>
Phase-level checks:
- `functions/shared/botAuth.ts` line 19 area contains two import statements: `Request` from `firebase-functions/v2/https` and `Response` from `express`.
- `pnpm --filter @gamechangers/functions-auth typecheck` exits 0.
- `pnpm -r build` exits 0.
- `functions/auth/lib/index.js` exists with a fresh mtime.
- `git status` shows only `functions/shared/botAuth.ts` as modified (no `lib/` directories staged).
</verification>

<success_criteria>
- The original TypeScript error (`Module '"firebase-functions/v2/https"' has no exported member 'Response'` or equivalent) no longer appears in `pnpm -r build` output.
- All 8 function codebases (auth, consent, events, challenges, wearables, gamification, b2b, trustsafety) successfully emit `lib/` outputs.
- The user can subsequently run `firebase deploy --only functions` without encountering this build error. (Deployment itself is out of scope for this plan.)
- Diff committed to git is exactly one file: `functions/shared/botAuth.ts`, with a one-line import change split into two lines.
</success_criteria>

<output>
After completion, create `.planning/quick/260507-hag-fix-response-import-in-functions-shared-/260507-hag-SUMMARY.md` documenting:
- The exact before/after of the line 19 change.
- Confirmation that `pnpm -r build` succeeded across all 8 function codebases.
- Confirmation that no `lib/` directories were committed.
- Reminder that the user must run `firebase deploy --only functions` themselves to ship the fix.
</output>
