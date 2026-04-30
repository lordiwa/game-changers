-- tests/bigquery/anonymized-views.test.sql
--
-- BigQuery anonymized views compliance test suite.
-- Run via: bq query --use_legacy_sql=false < tests/bigquery/anonymized-views.test.sql
--
-- These SQL tests verify three invariants across all 5 B2B views in gw_b2b_views:
--   1. All result rows have active_user_count (or equivalent count column) >= 50.
--   2. Metabase service account CANNOT SELECT from gw_analytics raw mirror
--      (this test must be run AS the metabase-readonly service account via `bq query
--       --service_account_key_file=...` to validate the permission boundary).
--   3. Every view definition in gw_b2b_views.INFORMATION_SCHEMA.VIEWS contains
--      the strings 'is_minor = FALSE' and 'HAVING COUNT(DISTINCT'.
--
-- HOW TO RUN (CI / quarterly audit):
--   # Test 1 & 3 — run as any authenticated account with BigQuery viewer on gw_b2b_views:
--   export PROJECT=gamechangers-prod
--   bq query --use_legacy_sql=false --project_id=$PROJECT \
--     "$(cat tests/bigquery/anonymized-views.test.sql | grep -v '^--' | head -n 80)"
--
--   # Test 2 — run as metabase-readonly service account to verify permission boundary:
--   bq query --use_legacy_sql=false \
--     --service_account_key_file=metabase-readonly-key.json \
--     "SELECT * FROM \`${PROJECT}.gw_analytics.profiles_changelog\` LIMIT 1"
--   # Expected: Access Denied error (exit code != 0 confirms the boundary is enforced)
--
-- The CI workflow bigquery-views-audit.yml automates all three tests quarterly.

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 1: All rows from active_movers_by_city have active_user_count >= 50
-- ══════════════════════════════════════════════════════════════════════════════
-- Expected: 0 rows returned (no violation rows found)
SELECT
  'active_movers_by_city' AS view_name,
  city,
  active_user_count,
  'FAIL: k < 50' AS violation
FROM `${PROJECT}.gw_b2b_views.active_movers_by_city`
WHERE active_user_count < 50;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 1b: All rows from social_connectors_by_age_band have connector_count >= 50
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  'social_connectors_by_age_band' AS view_name,
  age_band,
  connector_count,
  'FAIL: k < 50' AS violation
FROM `${PROJECT}.gw_b2b_views.social_connectors_by_age_band`
WHERE connector_count < 50;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 1c: All rows from competitive_core_by_cluster have competitive_user_count >= 50
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  'competitive_core_by_cluster' AS view_name,
  game_cluster,
  competitive_user_count,
  'FAIL: k < 50' AS violation
FROM `${PROJECT}.gw_b2b_views.competitive_core_by_cluster`
WHERE competitive_user_count < 50;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 1d: All rows from new_recruits have new_recruit_count >= 50
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  'new_recruits' AS view_name,
  city,
  age_band,
  new_recruit_count,
  'FAIL: k < 50' AS violation
FROM `${PROJECT}.gw_b2b_views.new_recruits`
WHERE new_recruit_count < 50;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 1e: All rows from at_risk_segment have at_risk_user_count >= 50
-- ══════════════════════════════════════════════════════════════════════════════
SELECT
  'at_risk_segment' AS view_name,
  city,
  at_risk_user_count,
  'FAIL: k < 50' AS violation
FROM `${PROJECT}.gw_b2b_views.at_risk_segment`
WHERE at_risk_user_count < 50;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 3: All view definitions include is_minor = FALSE and HAVING COUNT(DISTINCT
-- ══════════════════════════════════════════════════════════════════════════════
-- Expected: 5 rows with both assertions TRUE
SELECT
  table_name AS view_name,
  CASE
    WHEN STRPOS(view_definition, 'is_minor = FALSE') > 0 THEN 'PASS'
    ELSE 'FAIL: missing is_minor = FALSE'
  END AS minor_exclusion_check,
  CASE
    WHEN STRPOS(view_definition, 'HAVING COUNT(DISTINCT') > 0 THEN 'PASS'
    ELSE 'FAIL: missing HAVING COUNT(DISTINCT) >= 50'
  END AS k_anonymity_check,
  CASE
    WHEN STRPOS(view_definition, '_change_type != ''DELETE''') > 0 THEN 'PASS'
    ELSE 'FAIL: missing _change_type != DELETE (erasure exclusion)'
  END AS erasure_exclusion_check,
  CASE
    WHEN STRPOS(view_definition, 'epsilon = 1.0') > 0 THEN 'PASS'
    ELSE 'FAIL: missing epsilon = 1.0 (DP requirement)'
  END AS dp_epsilon_check
FROM `${PROJECT}.gw_b2b_views.INFORMATION_SCHEMA.VIEWS`
WHERE table_name IN (
  'active_movers_by_city',
  'social_connectors_by_age_band',
  'competitive_core_by_cluster',
  'new_recruits',
  'at_risk_segment'
)
ORDER BY table_name;

-- ══════════════════════════════════════════════════════════════════════════════
-- TEST 2: metabase-readonly permission boundary
-- (Run separately as metabase-readonly service account — see HOW TO RUN above)
-- ══════════════════════════════════════════════════════════════════════════════
-- The following query MUST fail with "Access Denied" when run as metabase-readonly.
-- If it succeeds, the permission boundary is broken — alert DPO immediately.
--
-- To test in CI (bigquery-views-audit.yml):
--   1. Activate metabase-readonly key: gcloud auth activate-service-account ...
--   2. Run: bq query --use_legacy_sql=false \
--        "SELECT COUNT(*) FROM \`${PROJECT}.gw_analytics.profiles_changelog\` LIMIT 1"
--   3. Expect exit code != 0 (Access Denied)
--   If exit code == 0: FAIL — raw access granted. Trigger revoke-raw-access.sh AND alert DPO.
--
-- This test is intentionally NOT included as runnable SQL here because it requires
-- service-account impersonation. See bigquery-views-audit.yml for the shell implementation.

-- Summary: all SELECT statements in tests 1a-1e should return 0 rows.
-- All assertions in test 3 should return 'PASS'.
-- Test 2 (permission boundary) is verified via CI shell script.
