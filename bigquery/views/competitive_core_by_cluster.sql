-- competitive_core_by_cluster.sql
-- B2B audience segment: "Competitive Core" — high-engagement users on cluster-specific
-- challenges (LoL, Free Fire, general gaming), grouped by gameCluster.
--
-- Privacy enforcement:
--   - Consent join on b2b_brands (r-bitmap): only users who granted B2B brands consent.
--   - is_minor = FALSE filter (D-14 — minors NEVER in B2B views).
--   - _change_type != 'DELETE' filter (post-erasure exclusion per Plan 04).
--   - HAVING COUNT(DISTINCT user_id) >= 50 (k-anonymity k≥50).
--   - WITH DIFFERENTIAL_PRIVACY OPTIONS(epsilon=1.0, delta=1e-5) (ε-DP budget).
--
-- Cluster definition: gameCluster is the user's self-reported primary game cluster
-- (e.g., 'lol', 'free_fire', 'valorant', 'general'). Declared at profile creation;
-- never inferred from Discord activity (ADR-001 bot data prohibition).
--
-- B2B uses: gaming peripheral brands + esports sponsors targeting specific game
-- communities. Phase 3 Metabase "Competitive Core" tab. Riot Games / Sea Group
-- partnership prospecting.

CREATE OR REPLACE VIEW `${PROJECT}.gw_b2b_views.competitive_core_by_cluster` AS
SELECT WITH DIFFERENTIAL_PRIVACY
  OPTIONS(
    epsilon = 1.0,
    delta = 1e-5,
    privacy_unit_column = user_id,
    max_groups_contributed = 5
  )
  p.game_cluster,
  COUNT(DISTINCT p.user_id) AS competitive_user_count,
  AVG(c.challenges_completed_total) AS avg_challenges_completed,
  AVG(c.gold_tier_completions) AS avg_gold_completions
FROM `${PROJECT}.gw_analytics.profiles_changelog` p
JOIN `${PROJECT}.gw_analytics.consents_changelog` cb
  ON p.user_id = cb.user_id
JOIN `${PROJECT}.gw_analytics.challenges_aggregate` c
  ON p.user_id = c.user_id
WHERE cb.category = 'b2b_brands'
  AND cb.status = 'granted'
  AND cb.expires_at > CURRENT_TIMESTAMP()
  AND p.is_minor = FALSE
  AND p._change_type != 'DELETE'
  -- Competitive core: at least 3 completed challenges, of which at least 1 is Gold tier
  AND c.challenges_completed_total >= 3
  AND c.gold_tier_completions >= 1
GROUP BY p.game_cluster
HAVING COUNT(DISTINCT p.user_id) >= 50;
