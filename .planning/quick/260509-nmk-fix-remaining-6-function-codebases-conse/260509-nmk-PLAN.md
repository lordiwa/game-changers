---
phase: quick-260509-nmk
plan: 01
type: execute
wave: 1
depends_on: []
quick_id: 260509-nmk
files_modified:
  - functions/shared/index.ts
  - functions/consent/src/wearableRevokeHandler.ts
  - functions/wearables/src/disconnectDevice.ts
  - functions/consent/src/expirySweeper.ts
  - functions/consent/src/grant.ts
  - functions/consent/src/revoke.ts
  - functions/challenges/src/seasonRollover.ts
  - functions/challenges/src/logProgress.ts
  - functions/gamification/src/recomputeStats.ts
  - functions/gamification/package.json
autonomous: true
requirements: [DEPLOY-PARITY]
must_haves:
  truths:
    - "consentGate is importable from '@gamechangers/functions-shared' root (not only subpath)"
    - "node-fetch import is removed from consent + wearables; native Node 22 fetch is used"
    - "All 6 remaining codebases (consent, challenges, wearables, gamification, events, b2b) typecheck cleanly via pnpm typecheck"
    - "QR_SIGNING_KEY and PARTNER_EMBED_SIGNING_KEY exist in Secret Manager for gamechangers-prod"
    - "All 8 codebases (auth, trustsafety, consent, challenges, wearables, gamification, events, b2b) deploy or fail with documented unrelated reasons"
    - "firebase functions:list shows expected functions per codebase in southamerica-east1"
  artifacts:
    - path: "functions/shared/index.ts"
      provides: "Root barrel re-exporting consentGate + types"
      contains: "export * from './ConsentEnforcement.js'"
    - path: "functions/shared/lib/index.d.ts"
      provides: "Compiled root barrel declaration with consentGate export"
      contains: "consentGate"
    - path: ".planning/quick/260509-nmk-fix-remaining-6-function-codebases-conse/260509-nmk-SUMMARY.md"
      provides: "Per-codebase deploy outcome table (deployed function counts or skip reasons)"
  key_links:
    - from: "functions/challenges/src/logProgress.ts"
      to: "functions/shared/index.ts"
      via: "import { consentGate } from '@gamechangers/functions-shared'"
      pattern: "consentGate.*@gamechangers/functions-shared"
    - from: "functions/gamification/src/xpAward.ts"
      to: "functions/shared/index.ts"
      via: "import { consentGate } from '@gamechangers/functions-shared'"
      pattern: "consentGate.*@gamechangers/functions-shared"
    - from: "Cloud Run southamerica-east1"
      to: "Secret Manager"
      via: "events codebase resolves QR_SIGNING_KEY at deploy time; b2b resolves PARTNER_EMBED_SIGNING_KEY"
      pattern: "QR_SIGNING_KEY|PARTNER_EMBED_SIGNING_KEY"
---

<objective>
Fix the 6 remaining function codebases so all 8 deploy cleanly to `gamechangers-prod` in `southamerica-east1`. Workspace-protocol blocker is resolved (260507-i16). Remaining failures fall into 7 narrowly-scoped categories: missing root re-export of `consentGate` (A), node-fetch typing/imports (B), strict null checks (C — three codebases), callable handler signature (D), missing dep / type mismatch (E), missing operator secrets (F), and final deploy verification (G).

Purpose: Unblock all server-side feature work by getting Phase 02 backend functions live.
Output: 6 codebase typecheck-clean + 2 secrets created + 1 multi-codebase deploy run + per-codebase outcome SUMMARY.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/quick/260507-i16-resolve-eunsupportedprotocol-workspace-e/260507-i16-SUMMARY.md

<interfaces>
<!-- Key facts the executor needs without re-exploring the codebase. -->

**functions/shared/index.ts (current full content):**
```ts
// Single barrel export for the shared functions package.
export * from './types.js';
```

**functions/shared/ConsentEnforcement.ts exports** (verified): `CONSENT_CATEGORIES`, `consentGate`, plus internal helpers. Already consumed by `functions/events/*` and `functions/consent/*` via subpath import `@gamechangers/functions-shared/ConsentEnforcement`. Adding to root barrel is the canonical fix.

**Node 22 fetch:** Native `fetch` is global in Node 22 LTS — no import required. `firebase-functions@7.x` requires Node 22 (`engines.node: "22"` in every functions package.json).

**Both node-fetch usages** are dynamic imports inside try/catch blocks:
- `functions/consent/src/wearableRevokeHandler.ts:48` — `const fetch = (await import('node-fetch')).default;`
- `functions/wearables/src/disconnectDevice.ts:37` — same pattern.
Replacement: delete that line entirely (global `fetch` works as-is).

**logProgress.ts handler signature** (verified line 57-67): already typed as `request: { data: unknown; auth?: { uid?: string } }` — there is no `admin` field accessed in the handler. The Category D issue from the planning context appears to have been addressed already; spot-check during execution and only fix if `pnpm --filter ./functions/challenges typecheck` reports it.

**seasonRollover.ts:33,35** (verified): `const [year, qPart] = currentSeasonId.split('-q');` — `qPart` is `string | undefined` under noUncheckedIndexedAccess. `parseInt(qPart, 10)` rejects undefined input typing. Fix: validate format up-front, e.g. `if (!year || !qPart) throw new Error(...)`. Same for `year` on line 35.

**seasonRollover.ts:83** (verified): `db.collection('leaderboards').doc(docId).set({...})` returns `Promise<WriteResult>` but is pushed into `Array<Promise<void>>`. Fix: change array type to `Array<Promise<unknown>>` or `Array<Promise<WriteResult>>`.

**recomputeStats.ts:175** (verified): `lastDoc = snap.docs[snap.docs.length - 1];` — returns `QueryDocumentSnapshot | undefined` under noUncheckedIndexedAccess; `lastDoc` was likely typed as `DocumentSnapshot | null`. Fix: `lastDoc = snap.docs[snap.docs.length - 1] ?? null;` (or guard with `if (snap.docs.length > 0)` already on line 173).

**gamification/package.json deps include `@gamechangers/shared: workspace:*`** — already present. The "Cannot find module '@gamechangers/shared'" error from i16's report is likely a stale-build / lib-not-yet-emitted issue that resolves once `pnpm --filter ./packages/shared build` runs (already in firebase.json predeploy chain). Verify with `pnpm --filter ./functions/gamification typecheck` after running `pnpm --filter ./packages/shared build`.

**Codebase function inventory** (for Task 7 verification):
- consent: 6 functions (grant, revoke, expirySweeper, dsarExport, erasure, wearableRevokeHandler) + seedConsentTexts (script, may not export)
- events: 10 functions (botListUpcoming, checkIn, createEvent, eventReminders, postEventCard, postEventFeedback, postRecapToDiscord, rsvp, waitlistPromote, walkInCapture)
- challenges: 5 functions (botListEnrollments, createChallenge, enrollChallenge, leaderboardCompute, logProgress, seasonRollover) — leaderboardCompute may be a helper
- wearables: 4 functions (aggregateDailyHealth, connectDevice, disconnectDevice, openWearablesWebhook)
- gamification: 7 functions (badgeAward, botGetProfile, botPostWeeklyDigest, contentCompleted, discordRoleSync, recomputeStats, streakAdvance, xpAward)
- b2b: 2 functions (partnerEmbedJwt + index exports)
- auth: 5 (already deployed)
- trustsafety: 1 (already deployed)

Executor: derive exact counts by listing each codebase's `index.ts` exports during Task 7 verification — do not block on minor count drift.

**Hard constraints (from planning context — re-stated):**
- Do NOT modify `apps/pwa/`, `apps/discord-bot/`, `tests/*`, or `firebase.json`.
- Do NOT bump dependency versions; only ADD missing ones (none expected based on interface check).
- Do NOT modify `functions/shared/package.json` or its tsconfig.
- Do NOT touch business logic — fixes are mechanical (re-export, fetch swap, null guards, type fixes, secrets, deploy).
- For Category D (logProgress signature): verified above — likely already correct. Skip unless typecheck flags it.
- If any codebase fails Task 7 deploy for a NEW unrelated reason, document and skip (consistent with i16 approach).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Re-export consentGate from functions/shared root barrel (Category A)</name>
  <files>functions/shared/index.ts</files>
  <action>
Edit `functions/shared/index.ts` to add the ConsentEnforcement re-export. Final file content (2 lines existing + 1 added):

```ts
// Single barrel export for the shared functions package.
export * from './types.js';
export * from './ConsentEnforcement.js';
```

Then rebuild the shared package so downstream typecheck sees the updated `lib/index.d.ts`:

```bash
pnpm --filter ./functions/shared build
```
  </action>
  <verify>
    <automated>pnpm --filter ./functions/shared build && grep -c "consentGate" functions/shared/lib/index.d.ts</automated>
  </verify>
  <done>`functions/shared/lib/index.d.ts` re-exports `consentGate` (grep count >= 1). Build exits 0.</done>
</task>

<task type="auto">
  <name>Task 2: Replace node-fetch with native Node 22 fetch (Category B)</name>
  <files>functions/consent/src/wearableRevokeHandler.ts, functions/wearables/src/disconnectDevice.ts</files>
  <action>
Both files use the same dynamic-import pattern inside a try/catch wrapper. Remove the dynamic import line; the subsequent `fetch(...)` call resolves to the Node 22 global `fetch`.

In `functions/consent/src/wearableRevokeHandler.ts` around line 48: delete the line
```ts
const fetch = (await import('node-fetch')).default;
```

In `functions/wearables/src/disconnectDevice.ts` around line 37: delete the line
```ts
const fetch = (await import('node-fetch')).default;
```

The remaining `await fetch(${OPEN_WEARABLES_BASE_URL}/disconnect/${uid}/${provider}, {...})` calls work unchanged on Node 22's global fetch (signature compatible). Do NOT add `@types/node-fetch` (we are eliminating the dependency, not typing it).
  </action>
  <verify>
    <automated>! grep -n "node-fetch" functions/consent/src/wearableRevokeHandler.ts functions/wearables/src/disconnectDevice.ts</automated>
  </verify>
  <done>Neither file references `node-fetch` (grep returns nothing, exit 1, negated to 0). Both files still call `await fetch(...)` against `OPEN_WEARABLES_BASE_URL`.</done>
</task>

<task type="auto">
  <name>Task 3: Fix strict null check errors in functions/consent (Category C-consent)</name>
  <files>functions/consent/src/expirySweeper.ts, functions/consent/src/grant.ts, functions/consent/src/revoke.ts</files>
  <action>
All three files have the same pattern: a `ledgerQuery` is read, `ledgerQuery.empty` is checked, and `ledgerQuery.docs[0].data()` is accessed. Under `noUncheckedIndexedAccess`, `docs[0]` is `QueryDocumentSnapshot | undefined`. The `.empty` guard makes it logically safe but TypeScript doesn't infer that.

Fix in all three files: add an explicit non-null assertion ONLY at the index access site, since `.empty === false` guarantees `docs[0]` exists:

`expirySweeper.ts` line 65-67 — change:
```ts
const prevHash = ledgerQuery.empty
  ? '0'.repeat(64)
  : (ledgerQuery.docs[0].data()['hash'] as string);
```
to:
```ts
const prevHash = ledgerQuery.empty
  ? '0'.repeat(64)
  : (ledgerQuery.docs[0]!.data()['hash'] as string);
```

`grant.ts` line 107-109 — apply same `docs[0]` → `docs[0]!` change.

`revoke.ts` line 58-60 — apply same `docs[0]` → `docs[0]!` change.

For `expirySweeper.ts` line 53 (`const uid: string = doc.ref.path.split('/')[1]`), wrap with non-null assertion: `const uid: string = doc.ref.path.split('/')[1]!;` — the path format `users/{uid}/consents/{category}` guarantees index 1 exists.

Do NOT modify any other lines. Do NOT change business logic. Use non-null assertions ONLY where the surrounding guard (`.empty` check or guaranteed string format) makes it provably safe.
  </action>
  <verify>
    <automated>pnpm --filter ./functions/consent typecheck</automated>
  </verify>
  <done>`pnpm --filter ./functions/consent typecheck` exits 0.</done>
</task>

<task type="auto">
  <name>Task 4: Fix challenges TS errors (Categories C-challenges + D)</name>
  <files>functions/challenges/src/seasonRollover.ts, functions/challenges/src/logProgress.ts</files>
  <action>
**seasonRollover.ts:**

Line 32-37 (`getNextSeasonId`): the destructure `const [year, qPart] = currentSeasonId.split('-q')` produces `string | undefined` for both. Add a guard that throws if format is invalid (this should never happen at runtime since `getCurrentSeasonId()` always emits the canonical `YYYY-qN` format, but TS needs the assurance). Replace the function body with:

```ts
function getNextSeasonId(currentSeasonId: string): string {
  const [year, qPart] = currentSeasonId.split('-q');
  if (!year || !qPart) {
    throw new Error(`Invalid season id format: ${currentSeasonId}`);
  }
  const q = parseInt(qPart, 10);
  if (q >= 4) {
    return `${parseInt(year, 10) + 1}-q1`;
  }
  return `${year}-q${q + 1}`;
}
```

Line ~79-94 (`leaderboardResets` array): currently typed as `Array<Promise<void>>` but `db.collection(...).doc(...).set({...})` returns `Promise<WriteResult>`. Change the type annotation:

```ts
const leaderboardResets: Array<Promise<unknown>> = [];
```

(Use `unknown` rather than `WriteResult` to avoid importing the type and to remain forward-compatible; the array is only awaited via `Promise.all`, never inspected.)

**logProgress.ts:**

The handler signature (lines 57-67) already conforms to the loose `{ data: unknown; auth?: { uid?: string } }` shape and does NOT access `admin`. Run typecheck — if it passes after seasonRollover fixes, no changes needed. If typecheck still flags `logProgress.ts`, read the specific error and fix narrowly (likely a downstream effect of the consentGate import resolving cleanly after Task 1).

Do NOT modify any other lines or files.
  </action>
  <verify>
    <automated>pnpm --filter ./functions/challenges typecheck</automated>
  </verify>
  <done>`pnpm --filter ./functions/challenges typecheck` exits 0.</done>
</task>

<task type="auto">
  <name>Task 5: Fix gamification TS errors (Categories C-gamification + E)</name>
  <files>functions/gamification/src/recomputeStats.ts, functions/gamification/package.json</files>
  <action>
**Pre-step:** Ensure `@gamechangers/shared` is already built so its `lib/index.d.ts` exists. Run:

```bash
pnpm --filter ./packages/shared build
pnpm --filter ./functions/shared build
```

This is what fixes the "Cannot find module '@gamechangers/shared'" error in `discordRoleSync.ts:26` and `xpAward.ts:31` — the dep entry in `functions/gamification/package.json` is already correct (`@gamechangers/shared: workspace:*`), it just needs the lib output to resolve.

If after the rebuild typecheck still reports the missing module, the lockfile may need refresh:
```bash
pnpm install
```
Do NOT modify `functions/gamification/package.json` unless typecheck explicitly reports a missing dep AFTER rebuild + install.

**recomputeStats.ts line 175:**

Change:
```ts
lastDoc = snap.docs[snap.docs.length - 1];
```
to:
```ts
lastDoc = snap.docs[snap.docs.length - 1] ?? null;
```

The `?? null` aligns the value with the declared `DocumentSnapshot | null` type. The `if (snap.empty) break;` on line 173 already ensures the array is non-empty in practice, but the `?? null` makes the type narrow correctly.

Do NOT modify business logic, the loop structure, or any other line.
  </action>
  <verify>
    <automated>pnpm --filter ./functions/gamification typecheck</automated>
  </verify>
  <done>`pnpm --filter ./functions/gamification typecheck` exits 0.</done>
</task>

<task type="auto">
  <name>Task 6: Set placeholder secrets for events + b2b codebases (Category F)</name>
  <files>(no file changes — Secret Manager only)</files>
  <action>
Create the two missing operator secrets in `gamechangers-prod` Secret Manager so the `events` and `b2b` codebases can deploy. Real values will be populated when those features go live; placeholders are sufficient for deploy success.

```bash
printf "placeholder-replace-with-real-qr-signing-key" | firebase functions:secrets:set QR_SIGNING_KEY --project gamechangers-prod --data-file=-
printf "placeholder-replace-with-real-partner-embed-signing-key" | firebase functions:secrets:set PARTNER_EMBED_SIGNING_KEY --project gamechangers-prod --data-file=-
```

If either secret already exists from a previous attempt, the CLI will create a new version — that is fine. If the CLI prompts interactively despite `--data-file=-`, retry with the prompt's literal answer "y" piped via stdin or use `gcloud secrets versions add`.
  </action>
  <verify>
    <automated>firebase functions:secrets:access QR_SIGNING_KEY --project gamechangers-prod && firebase functions:secrets:access PARTNER_EMBED_SIGNING_KEY --project gamechangers-prod</automated>
  </verify>
  <done>Both secrets are accessible via `firebase functions:secrets:access` (returns the placeholder string), exit 0.</done>
</task>

<task type="auto">
  <name>Task 7: Deploy all 8 codebases and verify in functions:list</name>
  <files>(no file changes — deploy + verification only)</files>
  <action>
With Tasks 1-6 complete, run a unified deploy of all 8 codebases:

```bash
firebase deploy --only functions --project gamechangers-prod
```

Use a long timeout (15-20 min). Cloud Build runs predeploy (build chain) + isolate-package + Cloud Run deploy per codebase, sequentially. Some codebases may take 3-5 min each.

**Per-codebase outcome handling:**
- If a codebase deploys successfully → record function count from the deploy log.
- If a codebase fails for a NEW reason unrelated to the 7 categories above (e.g., quota, transient Cloud Build error, runtime mismatch) → document the error and continue. Do NOT loop or retry indefinitely.
- If multiple unrelated failures occur, retry the failing codebases once with `firebase deploy --only functions:<codebase> --project gamechangers-prod` to rule out flakes.

After the deploy attempt(s), enumerate live functions:

```bash
firebase functions:list --project gamechangers-prod
```

Cross-reference against the inventory in the `<interfaces>` block. Expected post-deploy state:
- auth: 5 functions (already live, idempotent re-deploy)
- trustsafety: 1 function (already live)
- consent: ~6 functions
- events: ~10 functions
- challenges: ~5-6 functions
- wearables: ~4 functions
- gamification: ~7 functions
- b2b: ~1-2 functions

All should be in `southamerica-east1`, runtime `nodejs22`.

Then write the SUMMARY.md at `.planning/quick/260509-nmk-fix-remaining-6-function-codebases-conse/260509-nmk-SUMMARY.md` with a per-codebase outcome table (status, function count, region, runtime, or skip reason if applicable). Follow the template at `$HOME/.claude/get-shit-done/templates/summary.md` and mirror the structure of `260507-i16-SUMMARY.md` (per-codebase deploy table format).
  </action>
  <verify>
    <automated>firebase functions:list --project gamechangers-prod | grep -E "consent|challenges|wearables|gamification|events|b2b" | grep -c "southamerica-east1"</automated>
  </verify>
  <done>`firebase functions:list` shows functions from at least 6 of 8 codebases in `southamerica-east1` (the 6 newly-fixed plus auth + trustsafety = 8 total). Per-codebase SUMMARY.md exists with outcomes for all 8 codebases. Any skipped codebase has a documented unrelated reason.</done>
</task>

</tasks>

<verification>
After all 7 tasks:

1. **Typecheck cleanliness** — All 6 fixed codebases pass `pnpm --filter ./functions/<name> typecheck`:
   ```bash
   for c in consent challenges wearables gamification events b2b; do
     pnpm --filter "./functions/$c" typecheck || echo "FAIL: $c"
   done
   ```
   Expected: zero "FAIL:" lines (events + b2b were already clean per i16, but verify).

2. **Secret presence** — Both new secrets accessible:
   ```bash
   firebase functions:secrets:access QR_SIGNING_KEY --project gamechangers-prod
   firebase functions:secrets:access PARTNER_EMBED_SIGNING_KEY --project gamechangers-prod
   ```

3. **Deploy outcome** — At minimum 6 of 8 codebases deployed; any non-deployed codebase has a documented unrelated reason in SUMMARY.md.

4. **Live function inventory** — `firebase functions:list --project gamechangers-prod` shows functions from at least 6 codebases (target: all 8) in `southamerica-east1` with runtime `nodejs22`.

5. **No regression** — `auth` (5 functions) and `trustsafety` (1 function) from i16 are still live.
</verification>

<success_criteria>
- All 6 remaining codebases typecheck clean (`pnpm --filter ./functions/<name> typecheck` exits 0).
- `consentGate` is exported from `@gamechangers/functions-shared` root (verified via `functions/shared/lib/index.d.ts` grep).
- `node-fetch` is no longer imported in any function source file.
- `QR_SIGNING_KEY` and `PARTNER_EMBED_SIGNING_KEY` exist in Secret Manager.
- All 8 codebases deploy or have a documented unrelated skip reason in SUMMARY.md.
- `firebase functions:list` shows expected functions across the 8 codebases in `southamerica-east1`.
- Per-codebase outcomes recorded in `260509-nmk-SUMMARY.md` (mirroring `260507-i16-SUMMARY.md` format).
</success_criteria>

<output>
After completion, create `.planning/quick/260509-nmk-fix-remaining-6-function-codebases-conse/260509-nmk-SUMMARY.md` with:

- **One-liner** describing the outcome
- **Per-codebase deploy table** (8 rows: codebase | region | status | function count | notes)
- **Tasks completed** table (7 tasks with commits + outcomes)
- **Deviations from plan** (if any — mark with Rule 1/2/3 per executor protocol)
- **Followups** for any codebase that could not deploy
- **Self-check** verifying the success criteria
</output>
