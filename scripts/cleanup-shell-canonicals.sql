-- Cleanup Shell Canonicals for simon@i-duna.com
-- Run with: sqlite3 server/fitness-coach.db < scripts/cleanup-shell-canonicals.sql
--
-- This script:
-- 1) Deletes canonical activities that are shells (duration=0, distance=0, untitled)
-- 2) Deletes their derived rows (streams, normalised, durability, stress, weekly)
-- 3) Classifies existing Intervals Strava shell sources retroactively
-- 4) Verifies cleanup

BEGIN TRANSACTION;

-- Step 1: Identify shell canonical IDs
-- Shell = duration_s IS NULL OR duration_s = 0 OR (distance_m IS NULL OR distance_m = 0) AND name = 'Untitled Activity'
CREATE TEMP TABLE shell_ids AS
  SELECT id FROM activities
  WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
    AND (
      (duration_s IS NULL OR duration_s = 0)
      OR (
        (distance_m IS NULL OR distance_m = 0)
        AND (avg_power IS NULL OR avg_power = 0)
        AND (avg_hr IS NULL OR avg_hr = 0)
        AND (tss IS NULL OR tss = 0)
      )
    );

-- Step 2: Delete derived rows for shell canonicals
DELETE FROM activity_streams WHERE activity_id IN (SELECT id FROM shell_ids);
DELETE FROM activity_normalised WHERE activity_id IN (SELECT id FROM shell_ids);
DELETE FROM activity_durability WHERE activity_id IN (SELECT id FROM shell_ids);
DELETE FROM activity_stress WHERE activity_id IN (SELECT id FROM shell_ids);

-- Step 3: Unlink activity_sources from shell canonicals (set activity_id = NULL)
UPDATE activity_sources SET activity_id = NULL
  WHERE activity_id IN (SELECT id FROM shell_ids);

-- Step 4: Delete shell canonical activities
DELETE FROM activities WHERE id IN (SELECT id FROM shell_ids);

-- Step 5: Delete weekly rollups (will be recomputed from clean data)
DELETE FROM athlete_weekly
  WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Step 6: Retroactively classify existing Intervals Strava shell sources
UPDATE activity_sources
SET source_kind = 'intervals_strava_shell',
    ignore_reason = 'strava_restricted_no_detail',
    strava_activity_id = provider_id
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND provider = 'intervals'
  AND provider_id NOT LIKE 'i%'
  AND (source_kind IS NULL OR source_kind != 'intervals_strava_shell');

-- Step 7: Classify native Intervals sources
UPDATE activity_sources
SET source_kind = 'intervals_native'
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND provider = 'intervals'
  AND provider_id LIKE 'i%'
  AND source_kind IS NULL;

DROP TABLE shell_ids;

COMMIT;

-- Verification
SELECT 'Shell canonicals remaining:' as description,
  COUNT(*) as count
FROM activities
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND (duration_s IS NULL OR duration_s = 0)
  AND (distance_m IS NULL OR distance_m = 0);

SELECT 'Valid canonicals remaining:' as description,
  COUNT(*) as count
FROM activities
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND duration_s > 0;

SELECT 'Intervals Strava shells (source-only):' as description,
  COUNT(*) as count
FROM activity_sources
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND source_kind = 'intervals_strava_shell';

SELECT 'Intervals native sources:' as description,
  COUNT(*) as count
FROM activity_sources
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
  AND source_kind = 'intervals_native';

SELECT 'Weekly rollups remaining:' as description,
  COUNT(*) as count
FROM athlete_weekly
WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
