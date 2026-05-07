---
quick_id: 260507-hvf
description: Skip requiresAge route guard in dev mode to unblock /me access without verifyAge function
date: 2026-05-07
status: planned
---

# 260507-hvf-PLAN — Dev-only bypass for `requiresAge` route guard

## Objective

Unblock local development by short-circuiting the `requiresAge` route guard
when `import.meta.env.DEV` is `true`. The guard currently redirects users
without an `ageVerified` custom claim to `/auth/age-gate`, where AgeGate.vue
calls the `verifyAge` Cloud Function — which is not deployable yet (workspace
protocol blocker, tracked separately as Camino B).

In production builds, the guard remains intact: anyone without the claim is
still routed to age-gate. The bypass is gated behind Vite's `import.meta.env.DEV`,
which is `true` for `vite dev` and `false` for `vite build` / production.

## Out of scope

- Fixing the workspace-protocol Cloud Build failure (Camino B — separate task)
- Modifying AgeGate.vue
- Modifying any other guard (`requiresAuth`, `requiresFullAuth`)
- Adding similar bypasses for other functions (only the age-gate is blocking now)

## Tasks

### Task 1: Add DEV bypass to `requiresAge` guard

**File:** `apps/pwa/src/router/index.ts`

**Action:** Modify the `requiresAge` block (currently at lines 268-273) so it
returns early without redirecting when `import.meta.env.DEV === true`. Add a
single `console.warn` so the bypass is loud in the dev tools (no silent skipping).

**Verify:** `pnpm --filter @gamechangers/pwa typecheck` exits 0 (this is the
only meaningful gate; the existing pre-existing test errors in PWA are out of
scope and unrelated to this change).

**Done when:**
- Loading `localhost:5175/me` with a signed-in non-anonymous user lands on Me.vue
  (not on /auth/age-gate)
- Production build (`pnpm --filter @gamechangers/pwa build`) still calls the
  guard's age check (verified by inspecting the bundled output OR by reading
  the diff and confirming the bypass is gated by `import.meta.env.DEV`)

## Files modified

- `apps/pwa/src/router/index.ts` — single `if (import.meta.env.DEV)` early-return
  inside the `requiresAge` block

## Notes

This is a temporary dev-only escape hatch. When the deploy issue is resolved
and `verifyAge` runs on Cloud Run, this bypass should be revisited. A follow-up
todo will be added in STATE.md.
