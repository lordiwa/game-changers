---
phase: 260507-gsx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/pwa/src/views/auth/SignIn.vue
  - apps/pwa/src/views/auth/Boot.vue
autonomous: true
requirements:
  - QUICK-FIX-POST-LOGIN-REDIRECT

must_haves:
  truths:
    - "User who signs in via /auth/signin lands on /me (not /)"
    - "User already authenticated (non-anonymous) who navigates to / is redirected to /me"
    - "Unauthenticated visitor (no Firebase user) at / still sees the Boot brand + sign-up CTA"
    - "Anonymous Firebase user (from app boot anon-auth) at / still sees the Boot brand + sign-up CTA — NOT redirected"
    - "Browser history is not polluted by the Boot→/me bounce (uses replace, not push)"
  artifacts:
    - path: "apps/pwa/src/views/auth/SignIn.vue"
      provides: "Email sign-in flow that redirects to /me on success"
      contains: "router.push('/me')"
    - path: "apps/pwa/src/views/auth/Boot.vue"
      provides: "Landing page that auto-redirects authenticated non-anonymous users to /me"
      contains: "onMounted"
  key_links:
    - from: "apps/pwa/src/views/auth/SignIn.vue"
      to: "/me route"
      via: "router.push('/me') after signInWithEmail"
      pattern: "router\\.push\\(['\"]\\/me['\"]\\)"
    - from: "apps/pwa/src/views/auth/Boot.vue"
      to: "/me route"
      via: "router.replace('/me') in onMounted when user && !user.isAnonymous"
      pattern: "router\\.replace\\(['\"]\\/me['\"]\\)"
---

<objective>
Fix post-login redirect: after `signInWithEmail` in SignIn.vue, send the user to `/me` instead of `/`. Make Boot.vue (mounted at `/`) auto-redirect already-authenticated non-anonymous users to `/me` so they don't see the brand stub.

Purpose: Currently a successful sign-in dumps the user on `/` which renders Boot.vue (brand + sign-up CTAs) — a confusing dead-end for someone who just authenticated. The dashboard at `/me` is the correct destination. The Boot.vue redirect handles the secondary case where an authenticated user navigates to `/` directly (e.g., bookmarked, manual URL, OAuth return).

Output: Two minimal edits — SignIn.vue redirect target, Boot.vue auto-redirect onMounted.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md

@apps/pwa/src/views/auth/SignIn.vue
@apps/pwa/src/views/auth/Boot.vue
@apps/pwa/src/router/index.ts

<interfaces>
<!-- Router meta on /me route (apps/pwa/src/router/index.ts:164-167):
  meta: { requiresAuth: true, requiresFullAuth: true, requiresAge: true }
  
  Guard chain (apps/pwa/src/router/index.ts:253-274):
  - requiresAuth + no user → redirect to /auth/signin
  - requiresFullAuth + user.isAnonymous → redirect to /auth/signup
  - requiresAge + !ageVerified claim → redirect to /auth/age-gate
  
  This means: after sign-in, if the user has not yet completed age-gate, the
  router guard will bounce them from /me → /auth/age-gate automatically.
  This is the correct behavior — we don't need to replicate the check in Boot.vue.
  
  SignIn.vue current behavior (line 63):
    await router.push('/');
  
  useAuth composable exports `signInWithEmail`; Firebase Auth user is available
  via `getAuth().currentUser` (already imported pattern in router/index.ts).
  
  Boot.vue is currently a pure-template SFC with empty <script setup> — needs
  onMounted lifecycle + getAuth() to inspect currentUser.
-->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix SignIn.vue post-login redirect target</name>
  <files>apps/pwa/src/views/auth/SignIn.vue</files>
  <action>
On line 63, change `await router.push('/');` to `await router.push('/me');`.

That is the only edit in this file. Do NOT:
- Refactor the function
- Add error-handling around the navigation
- Change the import block
- Touch the template

Rationale: `/me` is the authenticated dashboard; `/` is Boot.vue (brand stub for unauthenticated visitors). After `signInWithEmail` resolves, the user is non-anonymous and should land on the dashboard. The router guard chain on `/me` (requiresAuth + requiresFullAuth + requiresAge) will bounce them to `/auth/age-gate` if age claim is missing — that's the correct flow, no extra logic needed here.

Note: SignUp.vue is intentionally NOT modified — its redirect to `/auth/age-gate` is the correct next step for new accounts (they need age verification before they can hit `/me`).
  </action>
  <verify>
    <automated>cd apps/pwa &amp;&amp; npx tsc --noEmit</automated>
    Plus: grep confirms the change landed and the old path is gone:
      grep -n "router.push" apps/pwa/src/views/auth/SignIn.vue
      Expected: a single line containing `router.push('/me')`.
  </verify>
  <done>
SignIn.vue line 63 reads `await router.push('/me');`. TypeScript compiles. No other edits in the file. SignUp.vue untouched (still redirects to `/auth/age-gate`).
  </done>
</task>

<task type="auto">
  <name>Task 2: Add auto-redirect in Boot.vue for authenticated non-anonymous users</name>
  <files>apps/pwa/src/views/auth/Boot.vue</files>
  <action>
Replace the current empty `<script setup lang="ts">` block (lines 19-22) with a Composition-API setup that, on mount, redirects authenticated non-anonymous users to `/me`. Use `router.replace` (NOT `push`) so the history doesn't gain a `/` entry that the user can back-button into.

New `<script setup lang="ts">` content:

```ts
// Boot.vue — default landing.
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
  // We unsubscribe immediately after the first emission — single-shot check.
  const unsub = onAuthStateChanged(auth, (user) => {
    unsub();
    if (user && !user.isAnonymous) {
      router.replace('/me');
    }
    // else: stay on Boot — template renders brand + sign-up CTAs.
  });
});
```

Do NOT:
- Modify the `<template>` block — keep it exactly as is so unauthenticated/anonymous users still see the brand + CTAs.
- Add a loading spinner / suspense — the redirect resolves within one tick of auth hydration; flicker is acceptable for this fix.
- Add toast/error handling — `router.replace` is fire-and-forget here.
- Use `useAuth()` composable — direct `getAuth()` keeps this self-contained and matches the pattern already in `router/index.ts`.

Why `onAuthStateChanged` instead of `auth.currentUser`: on a hard refresh, `currentUser` may briefly be `null` while Firebase rehydrates the session from IndexedDB. Using the listener guarantees we evaluate against the settled auth state. The `unsub()` call inside the callback ensures we only act on the first emission (single-shot check) — we don't keep listening for future state changes on this mounted view.

Why `replace` not `push`: a user who lands on `/` after authenticating shouldn't be able to back-button into the brand stub. `replace` swaps the history entry so back-button goes to the page before `/`.
  </action>
  <verify>
    <automated>cd apps/pwa &amp;&amp; npx tsc --noEmit</automated>
    Plus structural grep:
      grep -c "onAuthStateChanged" apps/pwa/src/views/auth/Boot.vue   # expect: 1
      grep -c "router.replace('/me')" apps/pwa/src/views/auth/Boot.vue # expect: 1
      grep -c "isAnonymous" apps/pwa/src/views/auth/Boot.vue           # expect: 1
  </verify>
  <done>
Boot.vue `<script setup>` imports onMounted, useRouter, getAuth, onAuthStateChanged. On mount, sets up a single-shot auth listener that calls `router.replace('/me')` only when `user && !user.isAnonymous`. The `<template>` block is unchanged. TypeScript compiles. Anonymous users (Firebase anon session from app boot) still see the Boot template — they are not redirected.
  </done>
</task>

</tasks>

<verification>
Manual smoke checks (recorded in SUMMARY, not gating):

1. Fresh visit to `/` with no Firebase user (or only an anonymous user):
   - Boot.vue renders normally (brand text, "Crear cuenta" CTA, "Iniciar sesión" link).
   - No redirect, no flicker beyond first paint.

2. Sign in via `/auth/signin` with a valid email/password:
   - URL becomes `/me` (or `/auth/age-gate` if age claim is missing — both are correct outcomes).
   - URL is NOT `/`.

3. Hard refresh on `/` while signed in (non-anonymous, age verified):
   - Brief flash of Boot.vue may occur, then URL becomes `/me`.
   - Back button does NOT return to `/` (replace, not push).

4. SignUp flow unchanged:
   - `/auth/signup` still redirects new accounts to `/auth/age-gate` (verify by reading SignUp.vue — no edits made).

Automated:
   - `cd apps/pwa && npx tsc --noEmit` — full PWA typecheck passes.
   - `cd apps/pwa && npm run lint --silent 2>&1 || true` — no new ESLint errors in the two files touched.
</verification>

<success_criteria>
- SignIn.vue line 63 redirects to `/me` (was `/`).
- Boot.vue has an `onMounted` hook that calls `router.replace('/me')` only when `user && !user.isAnonymous`.
- Boot.vue template is unchanged.
- SignUp.vue is unchanged.
- `npx tsc --noEmit` passes in apps/pwa.
- No new files, no new composables, no new imports outside the two edited files.
</success_criteria>

<output>
After completion, create `.planning/quick/260507-gsx-fix-post-login-redirect-to-me-dashboard-/260507-gsx-01-SUMMARY.md` documenting:
- The two diffs (line 63 of SignIn.vue; new `<script setup>` body of Boot.vue).
- Confirmation that SignUp.vue was NOT modified.
- Typecheck result.
</output>
