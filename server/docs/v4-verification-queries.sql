-- ============================================================================
-- Interpretation v4 Verification SQL Queries
-- ============================================================================
-- Purpose: Verify correct FTP/FTHR sourcing and v4 metric computation
-- Usage: Run these queries to verify interpretation v4 is working correctly
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Show current athlete thresholds
-- ----------------------------------------------------------------------------
-- Expected: Shows manual FTP/FTHR settings for all athletes
-- Before setting thresholds: (no rows)
-- After setting thresholds: Shows user_id, ftp_w, fthr_bpm, sources

SELECT 
  user_id,
  ftp_w,
  fthr_bpm,
  ftp_source,
  fthr_source,
  updated_at
FROM athlete_thresholds
ORDER BY user_id;

-- ----------------------------------------------------------------------------
-- 2. Count v4 interpretations with missing_ftp_or_fthr flag
-- ----------------------------------------------------------------------------
-- Expected BEFORE setting FTP: All v4 activities have this flag
-- Expected AFTER setting FTP: 0 activities have this flag

SELECT 
  COUNT(*) as total_v4,
  SUM(CASE 
    WHEN json_extract(flags_json, '$') LIKE '%missing_ftp_or_fthr%' 
    THEN 1 ELSE 0 
  END) as with_missing_ftp_flag,
  SUM(CASE 
    WHEN json_extract(flags_json, '$') NOT LIKE '%missing_ftp_or_fthr%' 
    THEN 1 ELSE 0 
  END) as without_flag
FROM activity_interpretation
WHERE interpretation_version = 4;

-- ----------------------------------------------------------------------------
-- 3. Count v4 interpretations with decoupling_pct not null
-- ----------------------------------------------------------------------------
-- Expected BEFORE setting FTP: 0 activities have decoupling
-- Expected AFTER setting FTP: Many activities have decoupling (if streams available)

SELECT 
  COUNT(*) as total_v4,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.decoupling_pct') IS NOT NULL 
    THEN 1 ELSE 0 
  END) as with_decoupling,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.decoupling_pct') IS NULL 
    THEN 1 ELSE 0 
  END) as without_decoupling
FROM activity_interpretation
WHERE interpretation_version = 4;

-- ----------------------------------------------------------------------------
-- 4. Count v4 interpretations with interval detection
-- ----------------------------------------------------------------------------
-- Expected BEFORE setting FTP: All have interval_count = 0
-- Expected AFTER setting FTP: Some have interval_count > 0 (if high-intensity rides)

SELECT 
  COUNT(*) as total_v4,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.interval_count') > 0 
    THEN 1 ELSE 0 
  END) as with_intervals,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.interval_count') = 0 
    THEN 1 ELSE 0 
  END) as without_intervals
FROM activity_interpretation
WHERE interpretation_version = 4;

-- ----------------------------------------------------------------------------
-- 5. Show v4 metrics summary (decoupling, coasting, intervals)
-- ----------------------------------------------------------------------------
-- Expected: Shows distribution of v4 metrics across all activities

SELECT 
  COUNT(*) as total,
  AVG(CAST(json_extract(payload_json, '$.decoupling_pct') AS REAL)) as avg_decoupling,
  AVG(CAST(json_extract(payload_json, '$.coasting_pct') AS REAL)) as avg_coasting,
  AVG(CAST(json_extract(payload_json, '$.interval_count') AS REAL)) as avg_interval_count,
  SUM(CASE WHEN json_extract(flags_json, '$') LIKE '%stream_unavailable%' THEN 1 ELSE 0 END) as stream_unavailable,
  SUM(CASE WHEN json_extract(flags_json, '$') LIKE '%steady_block_not_found%' THEN 1 ELSE 0 END) as no_steady_block,
  SUM(CASE WHEN json_extract(flags_json, '$') LIKE '%high_coasting%' THEN 1 ELSE 0 END) as high_coasting,
  SUM(CASE WHEN json_extract(flags_json, '$') LIKE '%high_interval_density%' THEN 1 ELSE 0 END) as high_interval_density
FROM activity_interpretation
WHERE interpretation_version = 4;

-- ----------------------------------------------------------------------------
-- 6. Sample v4 interpretations (detailed view)
-- ----------------------------------------------------------------------------
-- Expected: Shows actual v4 metric values for inspection

SELECT 
  a.name,
  a.duration_s,
  a.avg_power,
  json_extract(i.payload_json, '$.decoupling_pct') as decoupling,
  json_extract(i.payload_json, '$.steady_block_duration_s') as steady_block_s,
  json_extract(i.payload_json, '$.coasting_pct') as coasting,
  json_extract(i.payload_json, '$.interval_count') as intervals,
  json_extract(i.payload_json, '$.interval_total_time_s') as interval_time_s,
  i.flags_json
FROM activity_interpretation i
JOIN activities a ON a.id = i.activity_id
WHERE i.interpretation_version = 4
ORDER BY a.start_time DESC
LIMIT 10;

-- ----------------------------------------------------------------------------
-- 7. Verify no per-activity NP/avg_power usage (indirect check)
-- ----------------------------------------------------------------------------
-- Expected: Activities with same user_id should use same FTP threshold
-- If FTP varied per activity, decoupling/intervals would be inconsistent

SELECT 
  a.user_id,
  COUNT(*) as activity_count,
  COUNT(DISTINCT CASE 
    WHEN json_extract(i.payload_json, '$.decoupling_pct') IS NOT NULL 
    THEN 1 
  END) as activities_with_decoupling,
  SUM(CASE 
    WHEN json_extract(i.flags_json, '$') LIKE '%missing_ftp_or_fthr%' 
    THEN 1 ELSE 0 
  END) as missing_ftp_count
FROM activities a
JOIN activity_interpretation i ON i.activity_id = a.id
WHERE i.interpretation_version = 4
GROUP BY a.user_id;

-- ----------------------------------------------------------------------------
-- 8. Check estimated FTP fallback (if monthly bests table exists)
-- ----------------------------------------------------------------------------
-- Expected: Shows most recent estimated_ftp per user

SELECT 
  user_id,
  year,
  month,
  estimated_ftp,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY year DESC, month DESC) as recency_rank
FROM athlete_monthly_bests
WHERE estimated_ftp IS NOT NULL AND estimated_ftp > 0
QUALIFY recency_rank = 1;

-- Note: If athlete_monthly_bests doesn't exist yet, this query will fail
-- That's expected - estimated FTP fallback only works if table exists

-- ----------------------------------------------------------------------------
-- 9. Sample thresholds_source from activity_interpretation (v4.2)
-- ----------------------------------------------------------------------------
-- Expected: Shows distribution of threshold sources (manual, estimated, null)

SELECT 
  json_extract(payload_json, '$.thresholds_source') as thresholds_source,
  COUNT(*) as count
FROM activity_interpretation
WHERE interpretation_version = 4
GROUP BY thresholds_source;

-- Expected output:
-- thresholds_source | count
-- manual            | 60     (if manual FTP set)
-- estimated         | 45     (if using monthly bests)
-- null              | 60     (if no thresholds available)

-- ----------------------------------------------------------------------------
-- 10. Verify thresholds_source exists on ALL v4 rows (v4.3 stability check)
-- ----------------------------------------------------------------------------
-- Expected: 0 rows missing thresholds_source (100% coverage)

SELECT 
  COUNT(*) as total_v4,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.thresholds_source') IS NULL 
    AND json_type(payload_json, '$.thresholds_source') IS NULL
    THEN 1 ELSE 0 
  END) as missing_key,
  SUM(CASE 
    WHEN json_extract(payload_json, '$.thresholds_source') IS NOT NULL 
    OR json_type(payload_json, '$.thresholds_source') = 'null'
    THEN 1 ELSE 0 
  END) as has_key
FROM activity_interpretation
WHERE interpretation_version = 4;

-- Expected output:
-- total_v4 | missing_key | has_key
-- 60       | 0           | 60

-- Interpretation: All v4 rows have thresholds_source field (even if value is null)

-- ============================================================================
-- Expected Outputs Summary
-- ============================================================================

-- BEFORE setting athlete thresholds (FTP=null):
-- Query 1: (no rows)
-- Query 2: total_v4=60, with_missing_ftp_flag=60, without_flag=0
-- Query 3: total_v4=60, with_decoupling=0, without_decoupling=60
-- Query 4: total_v4=60, with_intervals=0, without_intervals=60

-- AFTER setting athlete thresholds (FTP=250):
-- Query 1: Shows user_id=1, ftp_w=250, ftp_source='manual'
-- Query 2: total_v4=60, with_missing_ftp_flag=0, without_flag=60
-- Query 3: total_v4=60, with_decoupling=~45, without_decoupling=~15
-- Query 4: total_v4=60, with_intervals=~10, without_intervals=~50

-- ============================================================================
