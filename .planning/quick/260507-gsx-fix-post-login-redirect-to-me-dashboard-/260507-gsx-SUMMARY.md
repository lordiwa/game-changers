---
phase: 260507-gsx
plan: 01
subsystem: auth
tags: [auth, routing, ux-fix]
requires: []
provides:
  - Email sign-in users land on /me dashboard
  - Authenticated non-anonymous users at / are auto-redirected to /me
affects:
  - apps/pwa/src/views/auth/SignIn.vue
  - apps/pwa/src/views/auth/Boot.vue
tech-stack:
  added: []
  patterns:
    - Single-shot onAuthStateChanged listener for IndexedDB hydration safety
    - router.replace (not push) for redirect to avoid history pollution
key-files:
  created: []
  modified:
    - apps/pwa/src/views/auth/SignIn.vue
    - apps/pwa/src/views/auth/Boot.vue
decisions:
  - "Use onAuthStateChanged + immediate unsubscribe instead of auth.currentUser to handle hard-refresh hydration"
  - "Use router.replace instead of push so back button does not return to brand stub"
  - "Defer age-gate check to /me route guard chain (no duplication in Boot.vue)"
metrics:
  duration: ~10m
  completed: 2026-05-07T17:14:19Z
  tasks_completed: 2
  files_modified: 2
requirements:
  - QUICK-FIX-POST-LOGIN-REDIRECT
---

# Quick 260507-gsx: Fix Post-Login Redirect to /me Dashboard Summary

**One-liner:** Email sign-in now redirects to `/me` dashboard, and Boot.vue (`/`) auto-redirects already-authenticated non-anonymous users to `/me` using a single-shot `onAuthStateChanged` listener.

## What Was Built

### Task 1 — SignIn.vue redirect target (commit `47dc28e`)

Single-line change in `apps/pwa/src/views/auth/SignIn.vue` line 63:

```diff
-    await router.push('/');
+    await router.push('/me');
```

The router guard chain on `/me` (`requiresAuth + requiresFullAuth + requiresAge`) handles the age-gate bounce automatically — no extra logic needed in this view. SignUp.vue was intentionally NOT modified (its redirect to `/auth/age-gate` remains correct for new accounts).

### Task 2 — Boot.vue auto-redirect for authenticated users (commit `95554ec`)

Replaced the empty `<script setup lang="ts">` block in `apps/pwa/src/views/auth/Boot.vue` with a Composition-API setup that uses a single-shot `onAuthStateChanged` listener:

```ts
// Boot.vue - default landing.
// - Unauthenticated or anonymous Firebase users: render brand + sign-up CTA (template).
// - Authenticated non-anonymous users: redirect to /me dashboard.
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const router = useRouter();

onMounted(() => {
  const auth = getAuth();
  // Use onAuthStateChanged (not just currentUser) because Firebase Auth may
  // still be hydrating from IndexedDB on first paint after a hard refresh.
  // We unsubscribe immediately after the first emission - single-shot check.
  const unsub = onAuthStateChanged(auth, (user) => {
    unsub();
    if (user && !user.isAnonymous) {
      router.replace('/me');
    }
    // else: stay on Boot - template renders brand + sign-up CTAs.
  });
});
```

Key design notes baked in:
- `onAuthStateChanged` (not `auth.currentUser`) handles the case where Firebase has not yet rehydrated the IndexedDB session on hard refresh.
- `unsub()` inside the callback makes this a single-shot check — no lingering listener on the mounted view.
- `router.replace` (not `push`) so the back button doesn't return to the brand stub.
- Anonymous Firebase users (from app-boot anon-auth) are NOT redirected — they still see the brand + sign-up CTAs in the template.
- The `<template>` block was NOT changed.

## Files Changed

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `apps/pwa/src/views/auth/SignIn.vue` | 1 line (63) | Redirect target after `signInWithEmail` |
| `apps/pwa/src/views/auth/Boot.vue` | Script setup body (was 2 comment lines, now 21 lines) | Auto-redirect authenticated non-anonymous users |

## Verification

### Automated

- **Typecheck (`cd apps/pwa && npx tsc --noEmit`):** Pre-existing errors in test files (`__tests__/*.ts`) and Vue SFC module-resolution in `router/index.ts` (lines 26-27) are unrelated to this fix and existed on `c4de833` (pre-edit base). No NEW typecheck errors introduced. The SFC resolution warnings are a project-level `tsc` configuration concern (Vite handles them at build time via `@vitejs/plugin-vue`).
- **Structural greps on Boot.vue:**
  - `onAuthStateChanged` — 3 occurrences (1 import, 1 in comment, 1 call site) — matches the plan's exact code sample. Plan's `expect: 1` count was a planning oversight; the body the plan specifies inherently contains 3 occurrences of the identifier. Implementation is faithful to the plan's literal code.
  - `router.replace('/me')` — 1 occurrence (matches plan).
  - `isAnonymous` — 1 occurrence (matches plan).
- **Structural grep on SignIn.vue:**
  - `router.push` — 1 line (`63: await router.push('/me');`) (matches plan).

### Manual Smoke Checks (deferred to user; not gating)

1. Fresh visit to `/` with no Firebase user (or anon-only user) → Boot.vue renders brand + CTAs, no redirect.
2. Sign in via `/auth/signin` with valid credentials → URL becomes `/me` (or `/auth/age-gate` if age claim missing — both correct per guard chain).
3. Hard refresh on `/` while signed in (non-anonymous, age verified) → brief Boot flash possible, then URL becomes `/me`. Back button does NOT return to `/`.
4. SignUp flow unchanged → `/auth/signup` still routes new accounts to `/auth/age-gate`.

## Deviations from Plan

None. Plan executed exactly as written. SignUp.vue confirmed untouched (`git diff c4de833..HEAD -- apps/pwa/src/views/auth/SignUp.vue` returns empty).

### Notes on tooling friction (not deviations)

During Task 1 execution, an early `git stash` / `git stash pop` cycle (used to check whether typecheck errors were pre-existing) appeared to lose the in-flight edit. Investigation showed the Read tool was serving stale cached content while the on-disk file had reverted. The edit was re-applied via PowerShell. Subsequent `Write` tool calls on Boot.vue exhibited the same staleness, so the Boot.vue rewrite was performed with PowerShell (one-shot regex replacement of the `<script setup>` block) to guarantee disk sync. Final diffs are clean and were verified through `git diff`. Helper `.ps1` files were created in the worktree root and removed before the final commit.

## Authentication Gates

None encountered — pure client-side routing change, no auth flows triggered during execution.

## Known Stubs

None introduced. The `/me` dashboard is implemented (per the plan's interface notes about the existing router guard chain on `/me`). The redirect now correctly delivers users to a real, gated dashboard.

## Threat Flags

None. This change does not alter trust boundaries, network endpoints, schema, or auth surface — it only changes which authenticated route the user lands on after sign-in.

## TDD Gate Compliance

Not applicable — plan type is `execute`, not `tdd`.

## Self-Check: PASSED

- File `apps/pwa/src/views/auth/SignIn.vue`: FOUND, line 63 contains `await router.push('/me');`.
- File `apps/pwa/src/views/auth/Boot.vue`: FOUND, contains `onAuthStateChanged`, `router.replace('/me')`, and `isAnonymous` checks.
- File `apps/pwa/src/views/auth/SignUp.vue`: FOUND, untouched (confirmed via git diff against base).
- Commit `47dc28e`: FOUND in `git log`.
- Commit `95554ec`: FOUND in `git log`.
