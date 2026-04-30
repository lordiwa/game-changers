-- at_risk_segment.sql
-- B2B audience segment: "At Risk" — users with declining event ATTENDANCE over the
-- last 30 days compared to the prior 30 days (churn-risk signal for re-engagement).
--
-- IMPORTANT DISCLAIMER (DPO sign-off required before activating this view in Metabase):
--   "At Risk" is a B2B churn/engagement notion — it is NOT a clinical health signal.
--   This view measures event attendance decline, NOT health metrics decline.
--   Providing this view to partners does NOT constitute health profiling.
--   This distinction is documented in ADR-009 and the DPIA §4.3.
--   DPO must confirm that "declining attendance = churn risk" framing is acceptable
--   under the LOPDP sensitive-data prohibition before exposing to brand partners.
--   Anti-feature WEAR-12 applies: NO clinical interpretation, NO health alerts.
--
-- Privacy enforcement:
--   - Consent join on b2b_brands (r-bitmap): only users who granted B2B brands consent.
--     NOTE: health_self_reports consent (h-bitmap) is NOT required here because
--     attendance data is event_participation category (e-bitmap), not health data.
--     The name "at_risk" refers to community churn risk, not health risk.
--   - is_minor = FALSE filter (D-14 — minors NEVER in B2B views).
--   - _change_type != 'DELETE' filter (post-erasure exclusion per Plan 04).
--   - HAVING COUNT(DISTINCT user_id) >= 50 (k-anonymity k≥50).
--   - WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5) (ε-DP budget).
--
-- Churn definition: events_last_30d < (events_prior_30d * 0.5) — i.e., attendance
-- dropped by 50%+ compared to the previous 30-day window.
--
-- Region collapse: grouped at city level only (not age_band) to further reduce
-- dimensionality for a sensitive-ish segment. DPO may require coarser grouping.
--
-- B2B uses: re-engagement campaign targeting — brands or event sponsors want to
-- reach lapsing community members with activation offers. Requires DPO sign-off.
-- Phase 3 Metabase "At Risk" tab (locked behind admin flag until DPO confirms).

CREATE OR REPLACE VIEW `${PROJECT}.gw_b2b_views.at_risk_segment` AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  p.city,
  COUNT(DISTINCT p.user_id) AS at_risk_user_count,
  AVG(a.events_last_30d) AS avg_events_recent,
  AVG(a.events_prior_30d) AS avg_events_prior
FROM `${PROJECT}.gw_analytics.profiles_changelog` p
JOIN `${PROJECT}.gw_analytics.consents_changelog` cb
  ON p.user_id = cb.user_id
JOIN `${PROJECT}.gw_analytics.attendance_aggregate` a
  ON p.user_id = a.user_id
WHERE cb.category = 'b2b_brands'
  AND cb.status = 'granted'
  AND cb.expires_at > CURRENT_TIMESTAMP()
  AND p.is_minor = FALSE
  AND p._change_type != 'DELETE'
  -- Churn signal: attendance dropped ≥50% in recent 30 days vs prior 30 days
  AND a.events_prior_30d > 0
  AND a.events_last_30d < (a.events_prior_30d * 0.5)
GROUP BY p.city
HAVING COUNT(DISTINCT p.user_id) >= 50;
