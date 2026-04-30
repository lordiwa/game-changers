---
phase: 02-platform-mvp
reviewed: 2026-04-29T00:00:00Z
depth: standard
files_reviewed: 115
files_reviewed_list:
  - .github/workflows/bigquery-views-audit.yml
  - .github/workflows/security-audit.yml
  - .github/workflows/tos-compliance-audit.yml
  - apps/discord-bot/src/commands/ayuda.ts
  - apps/discord-bot/src/commands/eventos.ts
  - apps/discord-bot/src/commands/index.ts
  - apps/discord-bot/src/commands/leaderboard.ts
  - apps/discord-bot/src/commands/link.ts
  - apps/discord-bot/src/commands/perfil.ts
  - apps/discord-bot/src/commands/reto.ts
  - apps/discord-bot/src/index.ts
  - apps/discord-bot/src/lib/firebaseAdmin.ts
  - apps/discord-bot/src/lib/functionClient.ts
  - apps/discord-bot/src/lib/intents.ts
  - apps/discord-bot/src/scheduledTasks/weeklyDigest.ts
  - apps/pwa/src/composables/useAuth.ts
  - apps/pwa/src/composables/useChallengeNarrative.ts
  - apps/pwa/src/composables/useChallenges.ts
  - apps/pwa/src/composables/useCheckIn.ts
  - apps/pwa/src/composables/useConsent.ts
  - apps/pwa/src/composables/useConsentGuard.ts
  - apps/pwa/src/composables/useContent.ts
  - apps/pwa/src/composables/useContentTracking.ts
  - apps/pwa/src/composables/useDiscordLink.ts
  - apps/pwa/src/composables/useEvents.ts
  - apps/pwa/src/composables/useGeolocation.ts
  - apps/pwa/src/composables/useInstallPrompt.ts
  - apps/pwa/src/composables/useOfflineQueue.ts
  - apps/pwa/src/composables/usePedometer.ts
  - apps/pwa/src/composables/usePosthog.ts
  - apps/pwa/src/composables/usePushNotifications.ts
  - apps/pwa/src/composables/useSentryScrub.ts
  - apps/pwa/src/composables/useStreak.ts
  - apps/pwa/src/composables/useTheme.ts
  - apps/pwa/src/composables/useWearables.ts
  - apps/pwa/src/composables/useXp.ts
  - apps/pwa/src/firebase.ts
  - apps/pwa/src/router/index.ts
  - apps/pwa/src/stores/auth.ts
  - apps/pwa/src/stores/consent.ts
  - apps/pwa/src/stores/profile.ts
  - bigquery/setup/create-datasets.sh
  - bigquery/setup/grant-metabase-readonly.sh
  - bigquery/setup/revoke-raw-access.sh
  - bigquery/views/active_movers_by_city.sql
  - bigquery/views/at_risk_segment.sql
  - bigquery/views/competitive_core_by_cluster.sql
  - bigquery/views/new_recruits.sql
  - bigquery/views/social_connectors_by_age_band.sql
  - firebase.json
  - firestore.rules
  - functions/auth/src/ageGate.ts
  - functions/auth/src/anonUpgrade.ts
  - functions/auth/src/botEndpoints.ts
  - functions/auth/src/discordExchange.ts
  - functions/auth/src/index.ts
  - functions/auth/src/unlinkDiscord.ts
  - functions/b2b/src/index.ts
  - functions/b2b/src/partnerEmbedJwt.ts
  - functions/challenges/src/antiCheat-challenge.ts
  - functions/challenges/src/botListEnrollments.ts
  - functions/challenges/src/createChallenge.ts
  - functions/challenges/src/enrollChallenge.ts
  - functions/challenges/src/index.ts
  - functions/challenges/src/leaderboardCompute.ts
  - functions/challenges/src/logProgress.ts
  - functions/challenges/src/seasonRollover.ts
  - functions/consent/src/dsarExport.ts
  - functions/consent/src/erasure.ts
  - functions/consent/src/expirySweeper.ts
  - functions/consent/src/grant.ts
  - functions/consent/src/index.ts
  - functions/consent/src/revoke.ts
  - functions/consent/src/seedConsentTexts.ts
  - functions/consent/src/wearableRevokeHandler.ts
  - functions/events/src/botListUpcoming.ts
  - functions/events/src/checkIn.ts
  - functions/events/src/createEvent.ts
  - functions/events/src/eventReminders.ts
  - functions/events/src/index.ts
  - functions/events/src/postEventCard.ts
  - functions/events/src/postEventFeedback.ts
  - functions/events/src/postRecapToDiscord.ts
  - functions/events/src/rsvp.ts
  - functions/events/src/waitlistPromote.ts
  - functions/events/src/walkInCapture.ts
  - functions/gamification/src/antiCheat.ts
  - functions/gamification/src/badgeAward.ts
  - functions/gamification/src/botGetProfile.ts
  - functions/gamification/src/botPostWeeklyDigest.ts
  - functions/gamification/src/contentCompleted.ts
  - functions/gamification/src/discordRoleSync.ts
  - functions/gamification/src/index.ts
  - functions/gamification/src/recomputeStats.ts
  - functions/gamification/src/streakAdvance.ts
  - functions/gamification/src/xpAward.ts
  - functions/shared/ConsentEnforcement.ts
  - functions/shared/botAuth.ts
  - functions/shared/hmac.ts
  - functions/shared/index.ts
  - functions/shared/kms.ts
  - functions/shared/sentry.ts
  - functions/shared/types.ts
  - functions/trustsafety/src/index.ts
  - functions/trustsafety/src/reportUser.ts
  - functions/wearables/src/aggregateDailyHealth.ts
  - functions/wearables/src/connectDevice.ts
  - functions/wearables/src/disconnectDevice.ts
  - functions/wearables/src/index.ts
  - functions/wearables/src/openWearablesWebhook.ts
  - packages/shared/src/index.ts
  - packages/shared/src/schemas/index.ts
  - packages/shared/src/types/index.ts
  - packages/shared/src/xp.ts
  - storage.rules
findings:
  critical: 8
  warning: 17
  info: 9
  total: 34
status: issues_found
---

# Phase 02-platform-mvp: Code Review Report

**Reviewed:** 2026-04-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 115
**Status:** issues_found

## Summary

Phase 02 covers the full LOPDP-compliant Vue 3 + Firebase platform MVP: progressive
consent engine with hash-chained ledger, Discord OAuth bridge with KMS-encrypted
refresh tokens, age gate, events with QR check-in, challenges with anti-cheat,
wearables via Open Wearables webhook, gamification (XP/streaks/badges), B2B BigQuery
views with k≥50 + epsilon-DP, and a read-only Discord bot bound to a viewer-only
service account.

The architectural invariants are largely well-enforced: ADR-001 firewall (bot
intents locked, no Firestore writes from the bot, viewer SA assertion at startup),
two-layer consent enforcement (Rules + `consentGate()` with audit), KMS encryption
of Discord refresh tokens, k≥50 + epsilon=1.0 + is_minor=FALSE + _change_type filter
on every B2B view, HMAC + IP allow-list on bot→Function endpoints with timing-safe
comparison.

However, several **execution-path bugs and security gaps** would block production:
the level-up → Discord role sync chain is broken (xpAward writes to a Firestore
queue collection but discordRoleSync subscribes to a Pub/Sub topic that nothing
publishes to); `accountErasure`'s erasure ledger forces every entry's prevHash to
"0"*64, breaking the hash-chain integrity claim from CNST-08; `partnerEmbedJwt`
and `postRecapToDiscord` both use CommonJS `require('node:crypto')` inside ESM
codebases (will throw `ReferenceError` at first invocation); `dsarExport`'s
projectId resolution has an operator-precedence bug that uploads to
`undefined.appspot.com` whenever `GCLOUD_PROJECT` is set; `useChallenges.ts`
imports `db, auth` from `firebase.ts` which only exports `firebaseApp`
(build-break); `useAuth.ts` `ageVerified`/`isMinor`/`hasDiscord` always return
`false` because they read non-existent fields rather than `getIdTokenResult().claims`;
and the Discord OAuth `state` parameter is parsed but never compared in
`discordExchange` (claimed defense-in-depth that does not exist).

Most warnings concern unsafe transactional patterns (`reportUser` rate-limit is
read-then-write outside any transaction; `xpAward`'s `levelUpQueue` and `auditLog`
writes are outside the runTransaction callback even though they appear inside it);
missing TTL on `reportRateLimit` accumulator; data-model inconsistency in the
`/events/{eventId}/attendance/{...}` doc-ID convention (RSVP uses `uid`, check-in
uses `jti`); and security rules gaps (no rule for `/users/{uid}/notifications`
even though three Functions write to it).

## Critical Issues

### CR-01: PWA build will fail — `useChallenges.ts` imports non-existent `db`/`auth` from `firebase.ts`

**File:** `apps/pwa/src/composables/useChallenges.ts:15`
**Issue:** `import { db, auth } from '../firebase.js';` — but `apps/pwa/src/firebase.ts` only exports `firebaseApp`. There are no `db` or `auth` exports in that module. This is a hard build/type error that will block PWA compilation.
**Fix:** Add the missing exports to `apps/pwa/src/firebase.ts`:
```ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = { /* ... */ };
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
```

### CR-02: Level-up → Discord role sync chain is broken (no Pub/Sub publish)

**File:** `functions/gamification/src/xpAward.ts:166-180`, `functions/gamification/src/discordRoleSync.ts:51`
**Issue:** `xpAward` writes to a Firestore `levelUpQueue` collection on level-up:
```ts
await db.collection('levelUpQueue').doc().set({ uid, oldLevel, newLevel, ... });
```
But `discordRoleSync` is subscribed to the `level-up-events` **Pub/Sub topic** via `onMessagePublished({ topic: 'level-up-events' })`. Nothing in the codebase publishes to that topic — the comment even acknowledges "we can't import @google-cloud/pubsub easily here". As a result, **Discord tier roles are never granted on level-up.** The `level-up-events` topic has zero publishers.
**Fix:** Publish to the Pub/Sub topic directly from `xpAward`:
```ts
import { PubSub } from '@google-cloud/pubsub';
// ...
if (newLevel > oldLevel) {
  const pubsub = new PubSub();
  await pubsub.topic('level-up-events').publishMessage({
    json: { uid, oldLevel, newLevel },
  });
}
```
Drop the `levelUpQueue` collection write (or keep it as a dead-letter trail, but it has no consumer today).

### CR-03: `accountErasure` ledger writes break the hash chain (always `prevHash="0"*64`)

**File:** `functions/consent/src/erasure.ts:116`
**Issue:** During erasure, every revoke ledger entry computes:
```ts
prevHash: payload.timestampMs === now.getTime() ? '0'.repeat(64) : prevHash,
```
`payload.timestampMs` is set to `now.getTime()` two lines above (`const timestampMs = now.getTime(); ... payload = { ..., timestampMs, ... }`), so this ternary **always** evaluates to `'0'.repeat(64)`. Every erasure ledger entry writes a genesis-hash prevHash, breaking the chain integrity guarantee from CNST-08 and corrupting the LOPDP audit trail used to prove revocation.

Note also that the local `prevHash` variable is reassigned earlier in the loop (`prevHash = ledgerHash`), but this is moot because the ternary always picks the genesis hash.
**Fix:**
```ts
ledgerRefs.push({
  ref: db.collection('consentLedger').doc(),
  data: {
    uid,
    category,
    action: 'revoke',
    version,
    textHash,
    timestamp: FieldValue.serverTimestamp(),
    hash: ledgerHash,
    prevHash, // already advanced via prevHash = ledgerHash above
    reason: 'account_erasure',
    source: 'erasure',
  },
});
```

### CR-04: `partnerEmbedJwt.verifyEmbedJwt` and `postRecapToDiscord` use CommonJS `require()` in ESM modules

**File:** `functions/b2b/src/partnerEmbedJwt.ts:105`, `functions/events/src/postRecapToDiscord.ts:29`
**Issue:** Both files are ESM (`import * from`, no `.cjs`, project uses `"type": "module"`). They call `require('node:crypto')` inline:
```ts
// partnerEmbedJwt.ts:105
!require('node:crypto').timingSafeEqual(expected, actual)
```
```ts
// postRecapToDiscord.ts:29-32
const sig = require('node:crypto')
  .createHmac('sha256', secret)
  ...
```
`require` is not defined in ESM scope and will throw `ReferenceError: require is not defined` at first invocation. `partnerEmbedJwt.verifyEmbedJwt` is the test-side helper but `postRecapToDiscord` is hit on every recap — this would break every event recap post.
**Fix:** Use the already-imported `createHmac` / `timingSafeEqual` from the top-level ESM import:
```ts
// partnerEmbedJwt.ts — already imports { createHmac, randomUUID } from 'node:crypto'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
// ...
if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
  throw new Error('Invalid signature');
}
```
```ts
// postRecapToDiscord.ts
import { createHmac } from 'node:crypto';
// ...
const sig = createHmac('sha256', secret).update(body).digest('hex');
```

### CR-05: `dsarExport` operator-precedence bug uploads to `undefined.appspot.com`

**File:** `functions/consent/src/dsarExport.ts:135-137`
**Issue:**
```ts
const projectId = process.env['GCLOUD_PROJECT'] ?? process.env['FIREBASE_CONFIG']
  ? JSON.parse(process.env['FIREBASE_CONFIG'] ?? '{}').projectId
  : 'gamechangers-prod';
```
JS evaluates as `(GCLOUD_PROJECT ?? FIREBASE_CONFIG) ? JSON.parse(FIREBASE_CONFIG).projectId : 'gamechangers-prod'`. So when `GCLOUD_PROJECT='gamechangers-prod'` is set (the normal case in Cloud Functions), the ternary's truthy branch parses `FIREBASE_CONFIG`, NOT `GCLOUD_PROJECT`. If `FIREBASE_CONFIG` is unset, `JSON.parse('{}').projectId` is `undefined`, producing the bucket name `undefined.appspot.com`. The DSAR ZIP upload fails or lands in the wrong bucket.

This is a P0 LOPDP failure: every DSAR export silently fails.
**Fix:**
```ts
const fbConfig = process.env['FIREBASE_CONFIG']
  ? (JSON.parse(process.env['FIREBASE_CONFIG']) as { projectId?: string })
  : null;
const projectId =
  process.env['GCLOUD_PROJECT'] ??
  fbConfig?.projectId ??
  'gamechangers-prod';
const bucket = storage.bucket(`${projectId}.appspot.com`);
```

### CR-06: Discord OAuth `state` parameter is parsed but NEVER verified server-side

**File:** `functions/auth/src/discordExchange.ts:72-77`
**Issue:**
```ts
const { code, state, pkceVerifier, ... } = Body.parse(req.data);
// State cookie verification is layered on at the HTTPS edge; PKCE verifier round-trip
// covers CSRF defense-in-depth (T-02-02-03). The state value is included in the
// OAuth URL and re-checked on this side as a sanity gate; if needed, downstream
// plans can wire a signed-cookie verifier here.
void state;
```
The comment claims defense-in-depth, but `state` is `void`'d — never compared. PKCE alone protects code interception, but **not** CSRF in the sense of an attacker tricking a victim into completing an OAuth flow against the attacker's pre-prepared `pendingDiscordId` (since `pendingDiscordId` is also caller-supplied). The PWA does verify state in `useDiscordLink.handleDiscordCallback`, but this is client-side and trivially bypassable by a malicious caller hitting the callable directly.

T-02-02-03 explicitly calls for state cookie verification — this is unimplemented.
**Fix:** Either:
1. Remove the misleading `void state` and the comment claiming defense-in-depth, OR
2. Bind `state` to a server-side session (e.g., write `discordOauthState/{uid}` doc with `state` + `expiresAt` when the PWA initiates flow, and assert `tx.delete()` of that doc here as proof of single-use).

### CR-07: `useAuth.ts` `ageVerified`, `isMinor`, `hasDiscord` always return `false`

**File:** `apps/pwa/src/composables/useAuth.ts:42-58`
**Issue:**
```ts
const hasDiscord = computed(() =>
  Boolean((auth.currentUser as ... & { customClaims?: ... } | null)?.customClaims?.['hasDiscord']),
);
const ageVerified = computed(() => false);  // ALWAYS false
const isMinor = computed(() => false);      // ALWAYS false
```
The Firebase Web SDK `User` object does **not** expose `customClaims` directly — claims must be read via `getIdTokenResult().claims`. The `ageVerified` and `isMinor` refs explicitly return literal `false` with a TODO comment.

Consequences:
- The router guard at `apps/pwa/src/router/index.ts:268` reads `idTokenResult.claims['ageVerified']` correctly, so route protection works.
- BUT all UI bound to `useAuth().ageVerified` / `isMinor` / `hasDiscord` (e.g., conditional rendering of "Vincula tu Discord" buttons, minor-specific messaging) is permanently in the `false` state.
- The `authState` Pinia store object surfaces these to the entire app.
**Fix:**
```ts
import { ref, watchEffect } from 'vue';
const claims = ref<Record<string, unknown>>({});
watchEffect(async () => {
  if (currentUser.value) {
    const tok = await currentUser.value.getIdTokenResult();
    claims.value = tok.claims;
  } else {
    claims.value = {};
  }
});
const hasDiscord  = computed(() => claims.value['hasDiscord']  === true);
const ageVerified = computed(() => claims.value['ageVerified'] === true);
const isMinor     = computed(() => claims.value['isMinor']     === true);
```

### CR-08: `useChallenges.ts` query violates Firestore inequality-on-multiple-fields rule

**File:** `apps/pwa/src/composables/useChallenges.ts:22-27`
**Issue:**
```ts
const challengesQuery = query(
  collection(db, 'challenges'),
  where('endsAt', '>', now),
  where('archived', '!=', true),
  orderBy('endsAt', 'asc'),
);
```
Firestore allows inequality on **only one field per query**. `>` on `endsAt` AND `!=` on `archived` is two inequality fields — Firestore will reject the query at runtime with `failed-precondition: Query requires a composite index OR Cannot have inequality filters on multiple fields`. `archived != true` is also semantically suspect: missing `archived` field documents pass `!= true` only if the field exists; documents without the field are excluded.
**Fix:**
```ts
const challengesQuery = query(
  collection(db, 'challenges'),
  where('archived', '==', false),  // explicit false; seasonRollover sets archived:true
  where('endsAt', '>', now),
  orderBy('endsAt', 'asc'),
);
// Also ensure createChallenge writes archived:false at creation, OR filter client-side for missing field.
```
And ensure `createChallenge.ts` writes `archived: false` at creation so the `==` filter matches.

## Warnings

### WR-01: `reportUser` rate-limit check is a non-transactional read-then-write race

**File:** `functions/trustsafety/src/reportUser.ts:69-113`
**Issue:** The 5-reports-per-day rate limit reads `rateLimitData[today]`, checks against 5, then later increments — but the check and increment are not in a transaction. A user firing 10 parallel `reportUser` calls each sees `todayCount=0`, all pass the gate, and all 10 reports succeed. Bypasses T-02-07-06.
**Fix:**
```ts
await db.runTransaction(async (tx) => {
  const snap = await tx.get(rateLimitRef);
  const todayCount = (snap.data()?.[today] as number | undefined) ?? 0;
  if (todayCount >= RATE_LIMIT_PER_DAY) {
    throw new HttpsError('resource-exhausted', 'RATE_LIMIT_EXCEEDED');
  }
  tx.set(reportRef, { /* ... */ });
  tx.set(rateLimitRef, { [today]: todayCount + 1 }, { merge: true });
});
```

### WR-02: `reportUser` rate-limit doc grows unbounded (one field per day, forever)

**File:** `functions/trustsafety/src/reportUser.ts:71-74,109-113`
**Issue:** `users/{uid}/private/reportRateLimit` accumulates `{ '2026-04-29': N, '2026-04-30': N, ... }` indefinitely. After a year of moderate use the doc exceeds Firestore's 1MB doc limit and writes start failing.
**Fix:** Either (a) use one doc per day (`users/{uid}/private/reportRateLimit/{yyyy-mm-dd}`) with Firestore TTL `expireAt = today + 30 days`, or (b) prune fields older than 7 days at write time.

### WR-03: `xpAward` `levelUpQueue` and `auditLog` writes are outside the transaction

**File:** `functions/gamification/src/xpAward.ts:174,183`
**Issue:** Inside `db.runTransaction(async (tx) => { ... })` the code calls `await db.collection('levelUpQueue').doc().set(...)` and `await db.collection('auditLog').doc().set(...)` — using the top-level `db` reference, not `tx`. These writes are NOT atomic with the XP+level update. If the `tx` retries (Firestore transactions retry on contention), the level-up audit fires multiple times.

This is broadly OK semantically (audit duplicates are tolerable; levelUpQueue is unused per CR-02) but breaks the documented atomicity claim and produces duplicate audit entries on contention.
**Fix:** Use `tx.set(...)` instead of `db.collection(...).doc().set(...)` for both writes — or move the audit/queue writes to after the transaction returns.

### WR-04: `checkIn` does not verify caller `uid` matches QR-claimed `uid`

**File:** `functions/events/src/checkIn.ts:53-110`
**Issue:** A check-in's QR JWT contains `{ eventId, uid, jti }` — the RSVP'd user's uid. The Function awards XP to `claims.uid` and writes attendance for `claims.uid`. But the **caller** is `callerUid` which can differ if Alice scans Bob's QR (or shares it). The `OUT_OF_VENUE` geofence is checked against the scanner's geo, but the attendance record + XP go to Bob.

Net effect:
- Alice scans Bob's QR at the venue → Bob gets XP and "checked_in" status without being there.
- Alice scans her own QR from home (geo gate fails) → no XP for anyone.

This makes XP/attendance trivially forgeable by sharing QRs. T-02-07-01's threat model (signature) is satisfied but identity-binding is not.
**Fix:**
```ts
if (callerUid !== claims.uid) {
  throw new HttpsError('permission-denied', 'QR_UID_MISMATCH');
}
```
(Reject scan if the authenticated caller is not the user the QR was issued for. If staff-assisted check-in is needed, gate this behind `role === 'organizer'`.)

### WR-05: Three Cloud Functions write `users/{uid}/notifications` but firestore.rules has no rule for this path → client cannot read

**File:** `firestore.rules`, `functions/consent/src/expirySweeper.ts:71`, `functions/events/src/waitlistPromote.ts:69`, `functions/trustsafety/src/reportUser.ts` (no notif write — withdrawn)
**Issue:** `expirySweeper` and `waitlistPromote` write to `/users/{uid}/notifications/{id}`, but `firestore.rules` has no `match /users/{uid}/notifications/{id}`. The deny-all default at line 203-205 then makes these notifications unreadable by the user. The PWA UI for "consent expired re-prompt" and "waitlist promotion" therefore has no way to surface notifications.
**Fix:** Add to `firestore.rules`:
```
match /users/{uid}/notifications/{notifId} {
  allow read: if isOwner(uid);
  allow update: if isOwner(uid)
    && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['read', 'readAt']); // user can mark as read
  allow create, delete: if false;
}
```

### WR-06: `recomputeStats` scans unbounded auditLog twice per user, every 6 hours

**File:** `functions/gamification/src/recomputeStats.ts:67-97`
**Issue:** Per-user, every 6 hours:
```ts
db.collection('auditLog').where('uid','==',uid).where('action','==','xp_awarded').where('type','==','event_attended').get()
db.collection('auditLog').where('uid','==',uid).where('action','==','xp_awarded').where('type','==','content_completed').get()
```
No `limit()`, no time window. As `auditLog` grows (it's append-only and pseudonymized rather than deleted on erasure), every `recomputeStats` run scans the entire historical auditLog twice for every user. At 1K DAU after 1 year, that's 2K queries scanning ~M documents each = O(B) reads per scheduled run. Cost and latency explode.

This is also incorrect: `eventAttendedCount` becomes monotonic-only — a deleted attendance record's audit entry still counts.
**Fix:** Maintain counters denormalized into `users/{uid}/profile/main` (e.g., `eventAttendedTotal`, `contentCompletedTotal`) that increment in `xpAward` itself, and read those counters in `recomputeStats`. Avoids the auditLog scan entirely.

### WR-07: `useConsent.grant()` sends placeholder `textHash` that may fail server-side validation

**File:** `apps/pwa/src/composables/useConsent.ts:87-91`
**Issue:**
```ts
const hash = textHash ?? 'client-placeholder-will-be-validated-server-side';
await callable({ category, version, textHash: hash, layer });
```
The server (`grant.ts:91-98`) only rejects on hash mismatch when `storedHash` is truthy:
```ts
if (storedHash && storedHash !== textHash) { throw ... }
```
Once `seedConsentTexts` runs (which always populates `textHash` from `data.es.purpose`), every `consentTexts/{cat}/v3` doc has a `textHash`. After that point, every PWA grant with the placeholder string fails with `failed-precondition: textHash mismatch`. This blocks all consent grants.
**Fix:** Compute the hash client-side from the rendered Spanish purpose text:
```ts
async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function grant(category, layer, version='v3') {
  // Read consentTexts/{category}/{version} from VueFire / cached store; hash es.purpose
  const purpose = consentTexts[category][version].es.purpose;
  const textHash = await sha256Hex(purpose);
  await callable({ category, version, textHash, layer });
}
```

### WR-08: `seedConsentTexts.ts` HMAC compare uses `!==` (timing attack) and has hardcoded fallback secret

**File:** `functions/consent/src/seedConsentTexts.ts:48-53`
**Issue:**
```ts
const adminSecret = process.env['SEED_ADMIN_SECRET'] ?? 'dev-seed-secret';
const expectedHmac = createHmac('sha256', adminSecret).update('seed-consent-texts').digest('hex');
if (!providedHmac || providedHmac !== expectedHmac) { ... }
```
Two issues:
1. **Timing attack:** `!==` on hex strings is not constant-time. T-02-01-10 exists exactly to mandate timing-safe comparison; this Function bypasses it.
2. **Fallback secret leaks auth in production:** If `SEED_ADMIN_SECRET` is missing in any environment (including production by misconfiguration), anyone who reads this file (it's open-source-compatible) can compute the HMAC for `'seed-consent-texts'` against `'dev-seed-secret'` and seed the consent texts. Fail-closed required.
**Fix:**
```ts
import { timingSafeEqual } from 'node:crypto';

const adminSecret = process.env['SEED_ADMIN_SECRET'];
if (!adminSecret) {
  res.status(500).json({ ok: false, error: 'SERVER_MISCONFIGURATION' });
  return;
}
const expected = Buffer.from(
  createHmac('sha256', adminSecret).update('seed-consent-texts').digest('hex'),
  'utf8',
);
const provided = Buffer.from(providedHmac ?? '', 'utf8');
if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
  res.status(403).json({ ok: false, error: 'Forbidden' });
  return;
}
```

### WR-09: `accountErasure` does not delete the `users/_lookup/discord/{discordId}` reverse-index

**File:** `functions/consent/src/erasure.ts` (whole file)
**Issue:** `discordExchange` writes `users/_lookup/discord/{id}` → `{ uid }` so the bot can resolve discordId → uid. After erasure, this reverse-index still maps to the deleted uid. Bot calls (botGetProfile, botListEnrollments) for that discordId will resolve to a uid whose profile/main is `displayName: '[deleted]'` and whose subcollections may still exist for 72h or be hard-deleted. After hard-delete, all those subcollections are gone but the lookup still points at a uid that no longer has data.

Also a privacy concern: anyone who knew the deleted user's discordId can keep checking and observe when the account hard-deletes (probing).
**Fix:** In `accountErasure` (soft-delete) and/or `performHardDelete`:
```ts
const discordSnap = await db.doc(`users/${uid}/private/discord`).get();
const discordId = discordSnap.data()?.['discordId'] as string | undefined;
if (discordId) {
  await db.doc(`users/_lookup/discord/${discordId}`).delete().catch(() => undefined);
}
```

### WR-10: `openWearablesWebhook` does not honor the `users/{uid}/private/wearable.disabled` flag

**File:** `functions/wearables/src/openWearablesWebhook.ts:127-224`, `functions/consent/src/wearableRevokeHandler.ts:30-42`
**Issue:** `wearableRevokeHandler` and `disconnectDevice` both write `users/{uid}/private/wearable.disabled = true` as belt-and-braces "openWearablesWebhook checks this flag on every request". The webhook's docstring at line 6 also claims this, but the implementation never reads `private/wearable`. The only consent gate is `consentGate('wearable_data')`, which works via custom-claim bitmap — but the bitmap is updated by `revoke.ts` at the same instant the disabled flag is written, so the safety net for "claim hasn't propagated yet" is missing.

In practice: a webhook arriving in the seconds between revoke commit and claim propagation could pass `consentGate` (which falls back to a doc read of `users/{uid}/consents/wearable_data` — that doc IS updated to `revoked` by `revoke.ts`, so it actually fails). So the gap is small, but the documented invariant is not enforced.
**Fix:**
```ts
// after consentGate succeeds:
const wearableDoc = await db.doc(`users/${uid}/private/wearable`).get();
if (wearableDoc.exists && wearableDoc.data()?.['disabled'] === true) {
  res.status(403).json({ error: 'Wearable ingestion disabled' });
  return;
}
```

### WR-11: HMAC body verification (`withBotAuth`) re-stringifies parsed body — fragile to key ordering

**File:** `functions/shared/botAuth.ts:54`, `apps/discord-bot/src/lib/functionClient.ts:34-39`
**Issue:**
```ts
// bot side:
const body = JSON.stringify({ botTimestamp: ts, payload });
const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
fetch(endpoint, { body });

// Function side:
const raw = JSON.stringify(req.body);  // re-stringify the parsed body
if (!verifyHmacSha256(raw, sig, secret)) { ... }
```
This works only if Express's `JSON.stringify(parsedBody)` produces byte-identical output to the bot's `JSON.stringify(...)`. JSON.stringify in V8 is deterministic for object literals with string keys but **key insertion order is preserved**, so a different runtime, different body parser, or a body proxy could re-order keys silently breaking HMAC. Also, `botTimestamp` field is signed but `withBotAuth` already enforces the `t=` query in the Authorization header — duplicated source of truth.

Industry standard: verify against `req.rawBody`. `openWearablesWebhook` does this correctly; `withBotAuth` should too.
**Fix:**
```ts
// withBotAuth.ts
const rawBody: Buffer | undefined = (req as { rawBody?: Buffer }).rawBody;
if (!rawBody) {
  res.status(400).json({ ok: false, error: 'MISSING_RAW_BODY' });
  return;
}
if (!verifyHmacSha256(rawBody, sig!, secret)) { ... }
```
And drop `botTimestamp` from the bot-side body since `t=` in the header is already authoritative.

### WR-12: `useDiscordLink.decodeLinkToken` silently bypasses signature verification in dev

**File:** `apps/pwa/src/composables/useDiscordLink.ts:106-125`
**Issue:**
```ts
try {
  const jwksResp = await fetch('/.well-known/bot-link-key.json');
  if (!jwksResp.ok) throw new Error('JWKS_FETCH_FAILED');
  // ...
} catch {
  if (import.meta.env.PROD) throw new Error('JWKS_UNAVAILABLE');
  return { discordId: payload.discordId };  // <-- accept unsigned payload
}
```
In dev mode, ANY forged JWT (or even a random base64 with valid JSON shape) passes `decodeLinkToken` because the catch swallows JWKS failures and returns the unverified payload. This degrades to "trust the user's input" silently. While not in prod, dev bypass enables developer machines to hit the live `discordExchange` callable with forged `pendingDiscordId`s — and `discordExchange` runs the same code in dev/prod (different secrets only).

Additionally, `discordExchange` does NOT verify the bot's JWT signature server-side either — it only uses `pendingDiscordId` value-equality against the OAuth-returned discord.id, which works only if the token's payload was honest. A malicious user can forge a JWT with `discordId=victim_id` and complete OAuth as themselves, but the assertion `oauthUser.id === pendingDiscordId` then fails. So the attack surface is closed by the OAuth-returned-id check — but the JWT signature claim ("verified upstream in PWA") is unenforced and the comment is misleading.
**Fix:**
1. Remove the dev-mode bypass — make signature verification mandatory.
2. Update the `discordExchange` comment to reflect that `pendingDiscordId` is trusted only because the OAuth-returned `discordUser.id` re-establishes identity, NOT because the JWT was verified.

### WR-13: `apps/discord-bot/src/lib/functionClient.ts` non-null assertion on env var

**File:** `apps/discord-bot/src/lib/functionClient.ts:37`
**Issue:** `process.env['BOT_TO_FUNCTION_HMAC']!` — non-null asserted. If the env var is missing, `createHmac('sha256', undefined)` throws `TypeError: secret must be a string`, which clobbers the `try/fetch` path with a non-recoverable runtime error. Bot crashes mid-command instead of returning a clean error.
**Fix:** Validate at module load:
```ts
const HMAC_SECRET = process.env['BOT_TO_FUNCTION_HMAC'];
if (!HMAC_SECRET) {
  throw new Error('[functionClient] BOT_TO_FUNCTION_HMAC is not set in /etc/gamechangers/bot.env');
}
// then use HMAC_SECRET (typed as string)
```

### WR-14: `firestore.rules` `consents` collection lookup fallback path bypasses ageVerified

**File:** `firestore.rules:72-95`, `functions/shared/ConsentEnforcement.ts:74-92`
**Issue:** Layer 1 (Rules) uses `hasConsentClaim(category)` which reads from the custom-claim bitmap. Layer 2 (`consentGate`) falls back to a doc read of `users/{uid}/consents/{category}` if the claim is missing. But `consentGate` checks `data.status === 'granted' && expiresAt > now` and does NOT check `ageVerified`. So in the small window between consent revoke (which removes the bitmap key but the doc still says `granted` momentarily — actually `revoke.ts` updates it to `revoked` transactionally, so this is fine) — the issue is **age verification**:

`consentGate` does NOT call `isAgeVerified` equivalent. So a Function gated only by `consentGate('basic_profile')` would let an under-16 caller through if their consent was somehow granted before age verification. Today this is prevented because grant.ts requires Layer 0 grant which is invoked only after age gate, but it's not enforced as an invariant in the gate itself.
**Fix:** In `consentGate`, after the doc fallback, also assert:
```ts
const userRecord = await getAuth().getUser(uid);
if (userRecord.customClaims?.['ageVerified'] !== true) {
  throw new HttpsError('failed-precondition', 'AGE_NOT_VERIFIED');
}
```
(Optional: only check when the category is in HOT_PATH_CATEGORIES to avoid extra Auth reads.)

### WR-15: `events/{eventId}/attendance/{...}` doc-ID convention is inconsistent (uid vs jti)

**File:** `functions/events/src/rsvp.ts:60-103`, `functions/events/src/checkIn.ts:103-113`, `functions/events/src/waitlistPromote.ts:46-64`
**Issue:** RSVP writes attendance at `events/{eventId}/attendance/{uid}` (line 60: `db.doc('events/${eventId}/attendance/${uid}')`). check-in writes at `events/{eventId}/attendance/{jti}` (jti is the QR's UUID-like ID). So the same eventId has TWO doc-ID conventions:
- One doc per user (RSVP'd, status='rsvp' or 'cancelled')
- One doc per check-in (status='checked_in', different doc-ID)

`waitlistPromote.ts:54-64` queries `where('status','==','waitlist')` → finds the RSVP-style doc. After promotion, status flips to 'rsvp' on the uid-keyed doc. But `checkIn.ts` then writes a SECOND doc with jti as ID. The user now has 2 docs in `attendance/`: one with `status='rsvp'` (uid-keyed) and one with `status='checked_in'` (jti-keyed). Counts and queries (e.g., `attendanceSnap.size` in `postRecapToDiscord`) double-count.

`postEventCard.ts:55-58` queries `where('status','==','checked_in')` on jti-keyed docs only — counts are correct there. But `postRecapToDiscord.ts:62-67` is the same pattern. The mismatch is more subtle: `eventReminders.ts:48-66` queries `where('status','==','rsvp')` to send reminders — that hits the uid-keyed doc, OK. But after check-in, the uid-keyed doc still says `status='rsvp'` (it's never updated to 'checked_in' — checkIn writes a separate doc). So if `eventReminders` runs after the event's start (it shouldn't, but if startsAt window is wrong), it sends a "remember to come" notification to people who already attended.
**Fix:** Pick one convention. Recommended: keep doc-ID = uid for the entire RSVP→check-in lifecycle. In `checkIn.ts`:
```ts
const attendanceRef = db.doc(`events/${claims.eventId}/attendance/${claims.uid}`);
await attendanceRef.set(
  {
    qrJti: claims.jti,
    status: 'checked_in',
    checkedInAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);
// idempotency: re-scanning the same QR is a merge no-op (qrJti unchanged + serverTimestamp re-stamps but no XP double-award).
```
For double-XP prevention, gate the xp-events publish on `if (snap.data()?.qrJti !== claims.jti) publish()` or use a separate idempotency key.

### WR-16: `useOfflineQueue.enqueue` is a non-atomic read-then-write (queue corruption under burst)

**File:** `apps/pwa/src/composables/useOfflineQueue.ts:29-32`
**Issue:**
```ts
async function enqueue(entry: OfflineCheckInEntry): Promise<void> {
  const current = queue.value ?? [];
  await setQueue([...current, entry]);
}
```
`useIDBKeyval` reads `queue.value` from in-memory ref, then writes the full array back. Two parallel `enqueue()` calls (e.g., user double-taps "scan") both read the same `current`, both write a 1-element-larger array. Net: one of the two entries is lost.

This is the offline check-in queue — losing scans means the user thinks they checked in but Background Sync replays nothing.
**Fix:** Use IDB transactions, or serialize via a mutex. With `idb-keyval`'s native API:
```ts
import { update } from 'idb-keyval';
async function enqueue(entry: OfflineCheckInEntry): Promise<void> {
  await update(QUEUE_KEY, (current) => [...(current ?? []), entry]);
}
```

### WR-17: `enrollChallenge` reads challenge in tx but checks `endsAt` against fresh `Date()` (TOCTOU)

**File:** `functions/challenges/src/enrollChallenge.ts:62-75`
**Issue:**
```ts
await db.runTransaction(async (tx) => {
  const [challengeSnap] = await Promise.all([tx.get(challengeRef)]);
  ...
  const now = new Date();  // local clock, NOT serverTimestamp
  const endsAt = (challenge['endsAt'] as { toDate: () => Date }).toDate?.() ?? new Date(challenge['endsAt'] as string);
  if (endsAt < now) {
    throw new HttpsError('failed-precondition', 'Challenge has already ended');
  }
  ...
});
```
Two issues:
1. `new Date()` is the Function's local clock — should be the same as Firestore server time within seconds, but technically not guaranteed.
2. The challenge `endsAt` cast `(... as { toDate }).toDate?.()` falls through to `new Date(string)` — but if `endsAt` is stored as Firestore Timestamp (serializes as `{seconds,nanoseconds}`), `new Date({seconds,...})` produces `Invalid Date` and the comparison silently passes (`Invalid Date < new Date()` is `false`, so the gate is bypassed).

Net effect: A challenge stored with a Timestamp `endsAt` may pass enrollment after expiry.
**Fix:**
```ts
const endsAtRaw = challenge['endsAt'];
const endsAt =
  endsAtRaw instanceof Timestamp ? endsAtRaw.toDate()
  : typeof endsAtRaw === 'object' && endsAtRaw && 'toDate' in endsAtRaw ? endsAtRaw.toDate()
  : typeof endsAtRaw === 'string' ? new Date(endsAtRaw)
  : null;
if (!endsAt || isNaN(endsAt.getTime())) {
  throw new HttpsError('internal', 'Challenge endsAt invalid');
}
if (endsAt < new Date()) {
  throw new HttpsError('failed-precondition', 'Challenge has already ended');
}
```

## Info

### IN-01: `useChallengeNarrative.getEventsNarrative` has unreachable duplicate condition

**File:** `apps/pwa/src/composables/useChallengeNarrative.ts:117-122`
**Issue:** Two consecutive `if (events >= 5)` blocks; the second is unreachable.
```ts
if (events >= 5) { return `${events} eventos — ya armaste tu propio scrim team`; }
if (events >= 5) { return `${events} eventos — ya juntaste un equipo de 5`; }
```
**Fix:** Remove the second block, or change one threshold (e.g., `>= 10`).

### IN-02: `discordRoleSync` reads `process.env[roleEnvKey]` but no env var is declared

**File:** `functions/gamification/src/discordRoleSync.ts:94-95`
**Issue:** `roleId = process.env[roleEnvKey]` (where `roleEnvKey` is e.g. `DISCORD_ROLE_INICIADO`) — the v2 SDK does not auto-populate plain env vars from Secret Manager unless declared in `secrets:` or `params`. So this lookup will always return `undefined` and write an audit `discord_role_sync_skipped` instead of granting the role. (Combined with CR-02, role sync is doubly broken.)
**Fix:** Use `defineSecret` for each tier role and reference `.value()`:
```ts
const ROLE_INICIADO = defineSecret('DISCORD_ROLE_INICIADO');
// ... declare for all 6 tiers
const TIER_ROLE_SECRETS = { Iniciado: ROLE_INICIADO, /* ... */ };
// in handler:
const roleId = TIER_ROLE_SECRETS[newTier]?.value();
```

### IN-03: `usePedometer` localStorage cleanup checks only one stored key

**File:** `apps/pwa/src/composables/usePedometer.ts:88-93`
**Issue:** `localStorage.find(k => k.startsWith('pedometer_steps_'))` returns the first match only; if there are multiple stale day-keys, only one is migrated. Stale entries accumulate.
**Fix:**
```ts
for (const k of Object.keys(localStorage)) {
  if (k.startsWith('pedometer_steps_') && k !== TODAY_KEY()) {
    localStorage.removeItem(k);
  }
}
```

### IN-04: `useGeolocation` ignores `vueUseGeolocation` `immediate: false` config (typo doesn't exist)

**File:** `apps/pwa/src/composables/useGeolocation.ts:46-50`
**Issue:** `@vueuse/core/useGeolocation` accepts `{ enableHighAccuracy, timeout, maximumAge, immediate, navigator }`. The `immediate: false` is valid. But the comment says "no persistence" — verify in PostHog/audit that lat/lng are not captured anywhere. Not a bug per se, more a documentation gap to confirm anti-feature.

### IN-05: `firestore.rules` allows partner R/W on entire `/partners/**` tree without resource owner check

**File:** `firestore.rules:196-198`
**Issue:**
```
match /partners/{document=**} {
  allow read, write: if isPartner();
}
```
Any partner with `partner_active==true` claim can read/write any partner's docs. Phase 3 spec calls for partner-scoped reads (each partner sees only their own slice). For Phase 2 scaffold this may be acceptable, but the comment "Phase 3 issues claims" doesn't change the rule scope.
**Fix (Phase 3):**
```
match /partners/{partnerId}/{document=**} {
  allow read, write: if isPartner() && request.auth.token.partner_id == partnerId;
}
```

### IN-06: `walkInCapture` accepts `cors: false` but PWA likely calls cross-origin from gamechangers.gg

**File:** `functions/events/src/walkInCapture.ts:26`
**Issue:** `onRequest({ cors: false })` blocks browser POSTs from the PWA origin. The PWA composable `useEvents.callWalkInCapture` calls `/api/events/walk-in` (rewritten by Hosting to the function) — if Hosting rewrites preserve the request as same-origin, this works. If not, the call fails CORS. Recommend explicit allow-list for the PWA origin.

### IN-07: `dsarRunner` exposed without auth — anyone who knows the URL can trigger an export

**File:** `functions/consent/src/dsarExport.ts:70-87`
**Issue:** `dsarRunner` is `onRequest` with no HMAC, no IAM check. An attacker with the function URL POST `{ uid: 'victim', requestId: '...' }` can trigger DSAR generation against any user. Even without read access to the resulting Storage path, this enables DoS (each call enumerates the user's full data) and may emit Resend emails to the victim.

The `dsarExport` (callable) handles auth correctly and triggers `setImmediate(() => runDsarExport(...))` — but `dsarRunner` is also exported in `index.ts` as a public-facing endpoint.
**Fix:** Either delete `dsarRunner` (use `setImmediate` only, or migrate to Cloud Tasks with OIDC auth), OR add an OIDC ID-token check that asserts the caller is the Cloud Tasks service account:
```ts
import { OAuth2Client } from 'google-auth-library';
const authToken = req.headers['authorization']?.replace('Bearer ', '');
const ticket = await new OAuth2Client().verifyIdToken({ idToken: authToken });
if (ticket.getPayload()?.email !== expectedTaskSAEmail) { res.status(403)...; return; }
```

### IN-08: `aggregateDailyHealth` exposed without auth — same risk pattern as IN-07

**File:** `functions/wearables/src/aggregateDailyHealth.ts:89-93`
**Issue:** Same as IN-07. The comment says "authenticated via Cloud Tasks service account" but the code does no verification of the caller's OIDC token. Anyone can POST `{uid: 'victim', day: '...'}` and force-generate a healthDaily aggregate. Less impactful than DSAR (idempotent merge write), but still a free DoS surface.
**Fix:** Same as IN-07 — verify the OIDC token from Cloud Tasks.

### IN-09: `useTheme` writes profile updates that violate basic_profile + ageVerified Rules gate

**File:** `apps/pwa/src/composables/useTheme.ts:35-41`, `firestore.rules:73-83`
**Issue:** `useTheme.persistTheme` writes `users/{uid}/profile/main` with `{theme, updatedAt}`. The Rules update gate requires `hasConsentClaim('basic_profile') && isAgeVerified()`. So users who haven't yet completed Layer 0 + age gate cannot persist theme — the write throws `permission-denied`. The composable doesn't catch it, so any pre-Layer-0 theme toggle silently logs a Firestore error. UX gap, not a security issue.
**Fix:** Either persist theme to localStorage until Layer 0 grant, then sync; or wrap `setDoc` in a `.catch(() => /* persist locally */)`.

---

_Reviewed: 2026-04-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
