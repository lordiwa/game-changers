-- social_connectors_by_age_band.sql
-- B2B audience segment: "Social Connectors" — users attending 2+ events per month,
-- grouped by 5-year age band.
--
-- Privacy enforcement:
--   - Consent join on b2b_brands (r-bitmap): only users who granted B2B brands consent.
--   - is_minor = FALSE filter (D-14 — minors NEVER in B2B views).
--   - _change_type != 'DELETE' filter (post-erasure exclusion per Plan 04).
--   - HAVING COUNT(DISTINCT user_id) >= 50 (k-anonymity k≥50).
--   - WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5) (ε-DP budget).
--
-- Age band generalization: age is bucketed into 5-year ranges BEFORE grouping to
-- prevent age-based re-identification. Buckets: 16-20, 21-25, 26-30, 31-35, 36-40, 41+.
-- This ensures even in small cohorts, the age dimension is generalized.
--
-- B2B uses: telcos + consumer brands targeting socially active young adult gamers
-- who attend IRL events. Phase 3 Metabase "Social Connectors" tab.

CREATE OR REPLACE VIEW `${PROJECT}.gw_b2b_views.social_connectors_by_age_band` AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  -- 5-year age band generalization (D-14 + k-anonymity reinforcement)
  CASE
    WHEN p.age BETWEEN 16 AND 20 THEN '16-20'
    WHEN p.age BETWEEN 21 AND 25 THEN '21-25'
    WHEN p.age BETWEEN 26 AND 30 THEN '26-30'
    WHEN p.age BETWEEN 31 AND 35 THEN '31-35'
    WHEN p.age BETWEEN 36 AND 40 THEN '36-40'
    ELSE '41+'
  END AS age_band,
  COUNT(DISTINCT p.user_id) AS connector_count,
  AVG(a.events_last_30d) AS avg_events_per_month
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
  AND a.events_last_30d >= 2
GROUP BY age_band
HAVING COUNT(DISTINCT p.user_id) >= 50;
