-- new_recruits.sql
-- B2B audience segment: "New Recruits" — users who joined within the last 30 days,
-- grouped by city and 5-year age band. Useful for onboarding-focused brand activations.
--
-- Privacy enforcement:
--   - Consent join on b2b_brands (r-bitmap): only users who granted B2B brands consent.
--   - is_minor = FALSE filter (D-14 — minors NEVER in B2B views).
--   - _change_type != 'DELETE' filter (post-erasure exclusion per Plan 04).
--   - HAVING COUNT(DISTINCT user_id) >= 50 (k-anonymity k≥50).
--   - WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5) (ε-DP budget).
--
-- "New" definition: account created_at >= 30 days ago from query time. This is a
-- sliding window — the view is always current-as-of-query-time (no materialization).
-- Partners using this for activation campaigns should cache results for ≤24h to
-- prevent stale-window confusion (recommended in Metabase dashboard notes).
--
-- Age band: same 5-year generalization as social_connectors_by_age_band.
--
-- B2B uses: welcome campaign targeting for brands that want to reach newly arrived
-- community members. Phase 3 Metabase "New Recruits" tab.

CREATE OR REPLACE VIEW `${PROJECT}.gw_b2b_views.new_recruits` AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  p.city,
  -- 5-year age band generalization
  CASE
    WHEN p.age BETWEEN 16 AND 20 THEN '16-20'
    WHEN p.age BETWEEN 21 AND 25 THEN '21-25'
    WHEN p.age BETWEEN 26 AND 30 THEN '26-30'
    WHEN p.age BETWEEN 31 AND 35 THEN '31-35'
    WHEN p.age BETWEEN 36 AND 40 THEN '36-40'
    ELSE '41+'
  END AS age_band,
  COUNT(DISTINCT p.user_id) AS new_recruit_count
FROM `${PROJECT}.gw_analytics.profiles_changelog` p
JOIN `${PROJECT}.gw_analytics.consents_changelog` cb
  ON p.user_id = cb.user_id
WHERE cb.category = 'b2b_brands'
  AND cb.status = 'granted'
  AND cb.expires_at > CURRENT_TIMESTAMP()
  AND p.is_minor = FALSE
  AND p._change_type != 'DELETE'
  -- Joined within last 30 days (sliding window)
  AND p.created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY p.city, age_band
HAVING COUNT(DISTINCT p.user_id) >= 50;
