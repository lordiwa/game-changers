---
phase: 02-platform-mvp
fixed_at: 2026-04-29T00:00:00Z
review_path: .planning/phases/02-platform-mvp/02-REVIEW.md
iteration: 1
fix_scope: critical_warning
findings_in_scope: 25
fixed: 25
skipped: 0
status: all_fixed
---

# Phase 02-platform-mvp: Code Review Fix Report

**Fixed at:** 2026-04-29T00:00:00Z
**Source review:** .planning/phases/02-platform-mvp/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 25 (8 critical + 17 warning)
- Fixed: 25
- Skipped: 0
- Info-level findings (9): NOT fixed — out of scope (fix_scope = critical_warning)

## Fixed Issues

### CR-01: PWA build will fail — `useChallenges.ts` imports non-existent `db`/`auth` from `firebase.ts`

**Severity:** Critical
**Files modified:** `apps/pwa/src/firebase.ts`
**Commit:** d9fdb3d
**Applied fix:** Added `getFirestore` and `getAuth` imports from the Firebase SDK and exported initialized `db` and `auth` instances bound to `firebaseApp`.

### CR-02: Level-up → Discord role sync chain is broken (no Pub/Sub publish)

**Severity:** Critical
**Files modified:** `functions/gamification/src/xpAward.ts`
**Commit:** 387f3e5
**Applied fix:** Imported `PubSub` from `@google-cloud/pubsub` (already in package deps), added a lazy client, and on level-up publish a JSON message to the `level-up-events` topic. Also dropped the orphaned `levelUpQueue` write and moved post-write side effects (audit, publish) outside the Firestore transaction. Note: this commit also closes WR-03 (auditLog/levelUpQueue writes were outside the transaction).

### CR-03: `accountErasure` ledger writes break the hash chain (always `prevHash="0"*64`)

**Severity:** Critical
**Files modified:** `functions/consent/src/erasure.ts`
**Commit:** 0c34fe4
**Applied fix:** Captured `entryPrevHash` before advancing `prevHash` so each ledger entry references its predecessor's hash (or genesis on the first iteration). The previous ternary `payload.timestampMs === now.getTime() ? '0'.repeat(64) : prevHash` was tautologically true — every entry got the genesis hash. This commit also addresses WR-09 by deleting the `users/_lookup/discord/{discordId}` reverse-index in both `accountErasure` and `performHardDelete`.

### CR-04: `partnerEmbedJwt.verifyEmbedJwt` and `postRecapToDiscord` use CommonJS `require()` in ESM modules

**Severity:** Critical
**Files modified:** `functions/b2b/src/partnerEmbedJwt.ts`, `functions/events/src/postRecapToDiscord.ts`
**Commit:** 9ccdd57
**Applied fix:** Imported `timingSafeEqual` and `createHmac` at the top of each ESM file and replaced the inline `require('node:crypto').xxx()` calls. Both files are now pure ESM and will not throw `ReferenceError: require is not defined` on first invocation.

### CR-05: `dsarExport` operator-precedence bug uploads to `undefined.appspot.com`

**Severity:** Critical
**Files modified:** `functions/consent/src/dsarExport.ts`
**Commit:** ba88dc5
**Applied fix:** Restructured the projectId resolution chain: parse `FIREBASE_CONFIG` only once into a typed object; resolve `projectId` as `GCLOUD_PROJECT ?? fbConfig?.projectId ?? 'gamechangers-prod'`. Previously the `??` and `?` operators interacted such that when `GCLOUD_PROJECT` was set the parser branch parsed `FIREBASE_CONFIG` (often empty) and produced `undefined.appspot.com`.

### CR-06: Discord OAuth `state` parameter is parsed but NEVER verified server-side

**Severity:** Critical
**Files modified:** `functions/auth/src/discordExchange.ts`
**Commit:** e6b33b4
**Applied fix:** Replaced the misleading "defense-in-depth" comment with an accurate description of the actual CSRF posture. The Function still does not perform server-side state binding (option 2 from the review would have required PWA-side coordination too — minting a `discordOauthState/{nonce}` doc on flow init); applying option 1 (correct comment) clarifies that current CSRF protection rests on PKCE + the OAuth-returned `discordUser.id === pendingDiscordId` check + Firebase callable auth. **Status: fixed: requires human verification** — server-side state binding remains a known follow-up; the misleading comment was the immediate fix.

### CR-07: `useAuth.ts` `ageVerified`, `isMinor`, `hasDiscord` always return `false`

**Severity:** Critical
**Files modified:** `apps/pwa/src/composables/useAuth.ts`
**Commit:** 5c96710
**Applied fix:** Added a reactive `claims` ref populated by `watch(currentUser, ...)` calling `getIdTokenResult()`. The three computed refs now read from `claims.value['hasDiscord' | 'ageVerified' | 'isMinor']`. Also extended `verifyAge()` to refresh the ID token AND re-read claims into the ref so the UI updates immediately after age verification. **Status: fixed: requires human verification** — the watch fires asynchronously after the user object updates, so reactive consumers must tolerate a brief `false` window during the initial token read.

### CR-08: `useChallenges.ts` query violates Firestore inequality-on-multiple-fields rule

**Severity:** Critical
**Files modified:** `apps/pwa/src/composables/useChallenges.ts`, `functions/challenges/src/createChallenge.ts`
**Commit:** 9de8d37
**Applied fix:** Changed `where('archived', '!=', true)` to `where('archived', '==', false)` so only one inequality field (`endsAt`) remains. Updated `createChallenge` to write `archived: false` at creation time so newly-created challenges match the `==` filter. `seasonRollover` continues to flip `archived: true` on archival.

### WR-01: `reportUser` rate-limit check is a non-transactional read-then-write race

**Severity:** Warning
**Files modified:** `functions/trustsafety/src/reportUser.ts`
**Commit:** 8ffaff4
**Applied fix:** Wrapped the rate-limit read, the report-doc create, and the counter increment inside a single `db.runTransaction(...)`. The audit-log write was moved post-transaction (duplicates on retry are tolerable). Now N parallel calls cannot all observe `todayCount=0` and bypass the gate.

### WR-02: `reportUser` rate-limit doc grows unbounded (one field per day, forever)

**Severity:** Warning
**Files modified:** `functions/trustsafety/src/reportUser.ts`
**Commit:** ab9e47f
**Applied fix:** On each rate-limit increment, scan the doc for date-keys (`YYYY-MM-DD`) older than 7 days and `FieldValue.delete()` them in the same transaction set. Doc size is bounded to ~7 keys.

### WR-03: `xpAward` `levelUpQueue` and `auditLog` writes are outside the transaction

**Severity:** Warning
**Files modified:** `functions/gamification/src/xpAward.ts`
**Commit:** 387f3e5 (combined with CR-02)
**Applied fix:** The transaction now returns `{ oldXp, newXp, oldLevel, newLevel }` and side-effecting writes (Pub/Sub publish, audit log) happen post-transaction. The `levelUpQueue` write was removed entirely (replaced by the Pub/Sub publish from CR-02).

### WR-04: `checkIn` does not verify caller `uid` matches QR-claimed `uid`

**Severity:** Warning
**Files modified:** `functions/events/src/checkIn.ts`
**Commit:** 35eea3b
**Applied fix:** Added `if (callerUid !== claims.uid) throw new HttpsError('permission-denied', 'QR_UID_MISMATCH')` immediately after JWT decode. QRs are now strictly bearer tokens for the user they were issued to. (Staff-assisted scanning would require an explicit organizer-role gate, not implemented in Phase 02.)

### WR-05: Three Cloud Functions write `users/{uid}/notifications` but `firestore.rules` has no rule for this path → client cannot read

**Severity:** Warning
**Files modified:** `firestore.rules`
**Commit:** b138ccf
**Applied fix:** Added a `match /users/{uid}/notifications/{notifId}` block: owner read; owner update with `affectedKeys().hasOnly(['read', 'readAt'])` (so users can only mark as read); create/delete deny-all (Functions Admin SDK is the only writer).

### WR-06: `recomputeStats` scans unbounded auditLog twice per user, every 6 hours

**Severity:** Warning
**Files modified:** `functions/gamification/src/recomputeStats.ts`, `functions/gamification/src/xpAward.ts`
**Commit:** 26a6f8d
**Applied fix:** Maintained denormalized counters `eventAttendedTotal` and `contentCompletedTotal` on `users/{uid}/profile/main` via `FieldValue.increment(1)` inside the xpAward transaction. `recomputeStats` now reads these in O(1) instead of querying the unbounded auditLog twice per user. **Status: fixed: requires human verification** — historical counts will start from current values at deploy time; existing users will see stats compute on a smaller base until they accumulate new events. A one-shot backfill script may be needed.

### WR-07: `useConsent.grant()` sends placeholder `textHash` that may fail server-side validation

**Severity:** Warning
**Files modified:** `apps/pwa/src/composables/useConsent.ts`
**Commit:** 5b0d540
**Applied fix:** Added a `sha256Hex()` helper using Web Crypto and updated `grant()` to fetch `consentTexts/{category}/{version}` and compute the hash from `data.es.purpose` when no explicit `textHash` is supplied. Matches the canonical hash that `seedConsentTexts` writes via `sha256(data.es.purpose)`.

### WR-08: `seedConsentTexts.ts` HMAC compare uses `!==` (timing attack) and has hardcoded fallback secret

**Severity:** Warning
**Files modified:** `functions/consent/src/seedConsentTexts.ts`
**Commit:** 770fecf
**Applied fix:** Imported `timingSafeEqual`; refused to run when `SEED_ADMIN_SECRET` is unset (returns 500 SERVER_MISCONFIGURATION); replaced `!==` with length-check + `timingSafeEqual()` over UTF-8 buffers.

### WR-09: `accountErasure` does not delete the `users/_lookup/discord/{discordId}` reverse-index

**Severity:** Warning
**Files modified:** `functions/consent/src/erasure.ts`
**Commit:** 0c34fe4 (combined with CR-03)
**Applied fix:** Both `accountErasure` (soft-delete) and `performHardDelete` now read `users/{uid}/private/discord` and delete the reverse-index `users/_lookup/discord/{discordId}` if present. Closes the privacy-probing gap and prevents stale lookups after hard-delete.

### WR-10: `openWearablesWebhook` does not honor the `users/{uid}/private/wearable.disabled` flag

**Severity:** Warning
**Files modified:** `functions/wearables/src/openWearablesWebhook.ts`
**Commit:** 446ebe3
**Applied fix:** After `consentGate` succeeds, read `users/{uid}/private/wearable` and reject with 403 + `wearable_sample_dropped_disabled_flag` audit entry if `disabled === true`. Closes the propagation-gap window between revoke commit and custom-claim refresh.

### WR-11: HMAC body verification (`withBotAuth`) re-stringifies parsed body — fragile to key ordering

**Severity:** Warning
**Files modified:** `functions/shared/botAuth.ts`
**Commit:** 3397086
**Applied fix:** Replaced `JSON.stringify(req.body)` with `req.rawBody` (Buffer). Returns 400 MISSING_RAW_BODY if the rawBody is unavailable. The existing `verifyHmacSha256` already accepts `string | Buffer`. Aligns with the pattern used by `openWearablesWebhook`.

### WR-12: `useDiscordLink.decodeLinkToken` silently bypasses signature verification in dev

**Severity:** Warning
**Files modified:** `apps/pwa/src/composables/useDiscordLink.ts`
**Commit:** 9d67be6
**Applied fix:** Removed the `if (import.meta.env.PROD) throw ... else return { discordId: payload.discordId }` dev fallback. The catch block now always throws `JWKS_UNAVAILABLE`, making JWT signature verification mandatory in every environment.

### WR-13: `apps/discord-bot/src/lib/functionClient.ts` non-null assertion on env var

**Severity:** Warning
**Files modified:** `apps/discord-bot/src/lib/functionClient.ts`
**Commit:** a0fcdef
**Applied fix:** Validate `BOT_TO_FUNCTION_HMAC` at module load; throw with a configuration-pointing error message if missing. The bot now fails fast at startup instead of TypeError'ing mid-command.

### WR-14: `firestore.rules` `consents` collection lookup fallback path bypasses ageVerified

**Severity:** Warning
**Files modified:** `functions/shared/ConsentEnforcement.ts`
**Commit:** 0435d90
**Applied fix:** After `consentGate` decides `allowed = true` from either claim or doc, do an additional `userRecord.customClaims?.ageVerified !== true` assertion. The user record is loaded lazily (reused if already fetched on the hot-path branch). Throws `failed-precondition AGE_NOT_VERIFIED` distinctly from consent-denied. **Status: fixed: requires human verification** — adds at most one Auth `getUser` call to non-hot-path categories; verify performance impact in production.

### WR-15: `events/{eventId}/attendance/{...}` doc-ID convention is inconsistent (uid vs jti)

**Severity:** Warning
**Files modified:** `functions/events/src/checkIn.ts`
**Commit:** a667eb5
**Applied fix:** Changed the attendance write in `checkIn` from `attendance/{jti}` to `attendance/{uid}` (merge-set). The `qrJti` field is preserved for idempotency: re-scanning the same QR is a no-op merge AND suppresses re-publishing to `xp-events`. Single doc per user across the full RSVP→check-in lifecycle now matches `rsvp.ts` and `waitlistPromote.ts`.

### WR-16: `useOfflineQueue.enqueue` is a non-atomic read-then-write (queue corruption under burst)

**Severity:** Warning
**Files modified:** `apps/pwa/src/composables/useOfflineQueue.ts`, `apps/pwa/package.json`
**Commit:** 796db4f
**Applied fix:** Imported `update` from `idb-keyval` (added as a direct dependency since it was previously only a peer of `@vueuse/integrations`) and rewrote `enqueue`/`dequeue` to use the IDB-transactional `update()` API. After each update, the `next` array is also pushed into the reactive ref via `setQueue` so the UI's `pendingCount` reflects the change. Fixes silent loss of offline check-ins under burst.

### WR-17: `enrollChallenge` reads challenge in tx but checks `endsAt` against fresh `Date()` (TOCTOU)

**Severity:** Warning
**Files modified:** `functions/challenges/src/enrollChallenge.ts`
**Commit:** dd135c1
**Applied fix:** Added `coerceFirestoreDate()` helper that handles `Timestamp` instances, `{seconds, nanoseconds}` plain objects, ISO strings, and numeric millis. Returns `null` on garbage; the caller throws `internal Challenge endsAt is invalid`. Eliminates the silent bypass where `Invalid Date < new Date()` evaluated to `false`, letting expired challenges enroll.

## Skipped Issues

None — all 25 in-scope findings were applied successfully.

## Notes on Out-of-Scope (Info) Findings

Per `fix_scope = critical_warning`, the 9 info-level findings (IN-01 through IN-09) were NOT addressed in this fix iteration. They remain documented in REVIEW.md and may be addressed in a follow-up `/gsd-code-review-fix --scope all` run if desired:

- IN-01: unreachable duplicate condition in `useChallengeNarrative.getEventsNarrative`
- IN-02: `discordRoleSync` reads role IDs from undeclared env vars
- IN-03: `usePedometer` localStorage cleanup misses multiple stale keys
- IN-04: `useGeolocation` documentation gap on persistence anti-feature
- IN-05: `firestore.rules` allows partner R/W on entire `/partners/**` tree
- IN-06: `walkInCapture` `cors: false` may block PWA POSTs
- IN-07: `dsarRunner` exposed without auth
- IN-08: `aggregateDailyHealth` exposed without auth
- IN-09: `useTheme` write may violate basic_profile + ageVerified Rules gate (UX gap)

## Findings Requiring Human Verification

The following fixes were applied but contain logic or architectural decisions that warrant a human review before proceeding to verification:

- **CR-06** (Discord OAuth state): Underlying CSRF gap remains; only the misleading comment was corrected. Real fix requires PWA-coordinated server-side state binding (out of scope for a single-file fix).
- **CR-07** (useAuth claims): Reactive `watch` introduces a brief async window during initial token read. UI consumers should tolerate a momentary `false` for `ageVerified`/`isMinor`/`hasDiscord` until the watcher resolves.
- **WR-06** (recomputeStats counters): New denormalized counters start from zero at deploy; existing users will see stats compute on a smaller base until they accumulate new events. A one-shot Firestore backfill may be required to seed counters from historical auditLog data.
- **WR-14** (consentGate ageVerified): Adds at most one Auth `getUser` call for non-hot-path categories. Performance impact in high-throughput Functions should be confirmed.

---

_Fixed: 2026-04-29T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
