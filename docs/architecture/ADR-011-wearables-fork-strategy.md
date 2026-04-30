# ADR-011: Open Wearables Fork Strategy

**Status:** Accepted
**Date:** 2026-04-30
**Deciders:** Engineering Lead, DPO
**WEAR-04 + Phase 2 Plan 09**

---

## Context

Open Wearables 0.4.3 (the-momentum/open-wearables) is the self-hosted wearable normalization
hub used in Phase 2 to receive fitness data from Garmin, Fitbit, Polar, Whoop, and Oura via
HTTPS webhook. It is a pre-1.0 Python/FastAPI project and carries maintenance risk:

- Pre-1.0 versioning signals API instability
- The project has a small contributor base
- Provider OAuth specs (Garmin Connect IQ, Polar AccessLink, etc.) change without notice
- If the project is abandoned, our wearable integration breaks

At Phase 2 launch (Ecuador, ~1K wearable users), the risk is acceptable. At Phase 4 scale
(LATAM, 100K+ wearable users), it is not.

## Decision

**Fork `the-momentum/open-wearables` to `gamechangers/open-wearables` at Phase 2 launch.**

- Pin to commit `v0.4.3` at fork time.
- Subscribe to upstream releases via GitHub Watch (releases only).
- Cherry-pick upstream security patches quarterly; apply with CI validation.
- Budget Phase 4 for fork-and-maintain (estimated: 0.5 FTE-month per year).

## Mitigations

1. **Fallback path always exists**: Plan 08 delivered manual entry + phone pedometer as the
   primary wellness data input (Pitfall #9). If Open Wearables breaks entirely:
   - The platform continues to operate at full feature parity for non-wearable users.
   - Character sheet stays full-color (Pitfall #9 floor of 1).
   - Challenges are unaffected (manual/pedometer sources remain fully functional).
   - Only the `wearable` source tab in ChallengeProgress.vue shows a "temporarily unavailable"
     banner instead of the connect flow.

2. **Deploy procedure is documented**: `docs/wearables/open-wearables-deploy.md` captures
   the exact Hetzner CX22 + Docker Compose setup, provider OAuth registration steps, and
   HMAC secret rotation procedure.

3. **Version pinned in both fork and docker-compose**: `image: gamechangers/open-wearables:0.4.3`
   prevents unintended upgrades in CI/CD.

4. **HMAC secret rotation scheduled quarterly**: rotate `OW_HMAC_SECRET` in GCP Secret Manager
   and update in Open Wearables admin UI on the same day.

## Rationale

Forking is preferred over vendoring because:
- The FastAPI server is deployed independently on Hetzner (not inside the Firebase monorepo).
- We need to apply provider-specific patches (e.g., Garmin Connect IQ API changes) faster
  than the upstream release cadence.
- The fork keeps our LOPDP data-residency story clean: all data flows through our infra,
  not through third-party SaaS.

## Alternatives Considered

| Option | Why rejected |
|--------|-------------|
| Terra ($0.20/user/mo) | Vendor lock-in + LOPDP data-residency concern |
| ROOK ($0.15/user/mo) | Same concerns as Terra + less LATAM support |
| Upstream only (no fork) | Unacceptable if project is abandoned or breaks before Phase 4 |
| Replace with Capacitor HealthKit | Only covers Phase 3+ mobile-native path; webhook providers needed now |

## Native HealthKit + Health Connect — Phase 3 DEFERRAL (D-11)

Apple HealthKit and Android Health Connect are **explicitly deferred to Phase 3** because:
- They require a Capacitor 8.x mobile-native shell (not the Phase 2 PWA).
- The `@perfood/capacitor-healthkit` + Health Connect plugin ecosystem is in active flux.
- Ecuador's smartphone penetration is 72% Android; iOS-only HealthKit is not LATAM-first.
- The webhook path (Garmin/Fitbit/Polar/Whoop/Oura) covers the most popular wearables in
  Ecuador's gamer market without requiring a native app install.

**Phase 3 plan:** Wrap the PWA via Capacitor 8.3.x → add @perfood/capacitor-healthkit (iOS)
and a Health Connect plugin (Android) → bridge to the Open Wearables server-side schema
(same HealthSample shape) → store in the same monthly-bucketed Firestore path.

## Consequences

- **Positive:** Full control over provider integration cadence; no vendor LOPDP risk.
- **Positive:** Fallback path ensures platform always functional without wearables.
- **Negative:** Maintenance burden at Phase 4; mitigated by 0.5 FTE-month/year budget line.
- **Negative:** Security patches must be cherry-picked manually; quarterly rotation cadence.

## Review Cadence

- **Phase 2 launch:** Fork executed, v0.4.3 pinned.
- **Phase 3 planning:** Evaluate upstream adoption (stars, contributors, release frequency).
  If upstream has ≥3 active maintainers and monthly releases, consider merging back.
- **Phase 4 launch:** Full fork-and-maintain budget allocated.
