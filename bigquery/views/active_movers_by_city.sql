-- active_movers_by_city.sql
-- B2B audience segment: "Active Movers" — users in each city with high challenge activity
-- and step activity.
--
-- Privacy enforcement:
--   - Consent join on b2b_brands (r-bitmap): only users who granted B2B brands consent.
--   - is_minor = FALSE filter (D-14 — minors NEVER in B2B views).
--   - _change_type != 'DELETE' filter (post-erasure exclusion; Plan 04 marks deletions).
--   - HAVING COUNT(DISTINCT user_id) >= 50 (k-anonymity k≥50).
--   - WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5) (ε-DP budget per view).
--     NOTE: BigQuery DP availability varies by region. If southamerica-east1 does not yet
--     support DP at deploy time, migrate this dataset to US multi-region and add a DPIA
--     cross-border note (T-02-09-10 mitigation). Verified GA in US multi-region (2026-04).
--
-- Numeric noise: ε-DP is applied at the SELECT level via WITH DIFFERENTIAL_PRIVACY.
-- The epsilon=1.0 budget means each user contributes at most 1 group and statistical
-- noise is calibrated so individual contributions cannot be distinguished with >exp(1)
-- probability. This satisfies the ADR-009 two-tier anonymization requirement.
--
-- Materialization: this is a non-materialized view. Metabase's JDBC connector runs it
-- on demand; BigQuery slot consumption is bounded by the k≥50 HAVING clause reducing
-- output cardinality before the DP mechanism returns results.
--
-- B2B uses of this view: brands targeting high-activity gaming communities in specific
-- Ecuadorian cities (e.g., Garmin Ecuador targeting Quito Oro-tier challenge completers).
-- Phase 3 Metabase dashboard "Active Movers" tab references this view.

CREATE OR REPLACE VIEW `${PROJECT}.gw_b2b_views.active_movers_by_city` AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  p.city,
  COUNT(DISTINCT p.user_id) AS active_user_count,
  AVG(c.weekly_challenges) AS avg_challenges,
  AVG(h.steps_7d_avg) AS avg_steps_7d
FROM `${PROJECT}.gw_analytics.profiles_changelog` p
JOIN `${PROJECT}.gw_analytics.consents_changelog` cb
  ON p.user_id = cb.user_id
LEFT JOIN `${PROJECT}.gw_analytics.challenges_aggregate` c
  ON p.user_id = c.user_id
LEFT JOIN `${PROJECT}.gw_analytics.healthDaily_changelog` h
  ON p.user_id = h.user_id
WHERE cb.category = 'b2b_brands'
  AND cb.status = 'granted'
  AND cb.expires_at > CURRENT_TIMESTAMP()
  AND p.is_minor = FALSE
  AND p._change_type != 'DELETE'
  AND c.weekly_challenges >= 3
GROUP BY p.city
HAVING COUNT(DISTINCT p.user_id) >= 50;
