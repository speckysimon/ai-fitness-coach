-- Migration 010: Split Physiology vs Metadata Source Truth
-- 
-- Purpose: Clean separation of physiology and metadata source-of-truth
-- 
-- Rationale:
-- - Intervals-native physiology must be protected from Strava overwrites
-- - Strava provides metadata (name, description, map) but not always best physiology
-- - FIT provides highest quality physiology but no metadata
-- - Single "canonical_source" is ambiguous and error-prone
--
-- New Model:
-- - physiology_source: Controls duration, power, HR, streams, derived metrics
-- - metadata_source: Controls name, description, URLs, display fields
-- - Separate concerns = deterministic behavior

-- Add physiology_source column
ALTER TABLE activities ADD COLUMN physiology_source TEXT 
  CHECK (physiology_source IN ('fit', 'intervals', 'strava', NULL));

-- Add metadata_source column  
ALTER TABLE activities ADD COLUMN metadata_source TEXT
  CHECK (metadata_source IN ('fit', 'intervals', 'strava', NULL));

-- Migrate existing data from canonical_source
-- Priority: FIT > Intervals > Strava
UPDATE activities 
SET physiology_source = CASE
  WHEN canonical_source = 'fit_upload' THEN 'fit'
  WHEN canonical_source = 'fit' THEN 'fit'
  WHEN canonical_source = 'intervals' THEN 'intervals'
  WHEN canonical_source = 'strava' THEN 'strava'
  WHEN primary_source = 'fit_upload' THEN 'fit'
  WHEN primary_source = 'fit' THEN 'fit'
  WHEN primary_source = 'intervals' THEN 'intervals'
  WHEN primary_source = 'strava' THEN 'strava'
  ELSE NULL
END
WHERE physiology_source IS NULL;

-- Metadata source defaults to same as physiology for now
UPDATE activities 
SET metadata_source = physiology_source
WHERE metadata_source IS NULL;

-- Ensure shells have no physiology source (they're placeholders)
UPDATE activities
SET physiology_source = NULL,
    is_valid_for_analytics = 0
WHERE is_shell = 1;

-- Create indexes for efficient source queries
CREATE INDEX IF NOT EXISTS idx_activities_physiology_source 
  ON activities(user_id, physiology_source) 
  WHERE physiology_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_metadata_source
  ON activities(user_id, metadata_source)
  WHERE metadata_source IS NOT NULL;

-- Create composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activities_valid_with_sources
  ON activities(user_id, is_valid_for_analytics, physiology_source, start_time DESC)
  WHERE is_valid_for_analytics = 1;

-- Add integrity constraint check
-- Shell activities must not be valid for analytics
CREATE TRIGGER IF NOT EXISTS check_shell_not_valid
BEFORE UPDATE ON activities
FOR EACH ROW
WHEN NEW.is_shell = 1 AND NEW.is_valid_for_analytics = 1
BEGIN
  SELECT RAISE(ABORT, 'Shell activities cannot be marked as valid for analytics');
END;

-- Add integrity constraint check
-- Valid activities must have physiology source
CREATE TRIGGER IF NOT EXISTS check_valid_has_physiology
BEFORE UPDATE ON activities
FOR EACH ROW
WHEN NEW.is_valid_for_analytics = 1 AND NEW.physiology_source IS NULL
BEGIN
  SELECT RAISE(ABORT, 'Valid activities must have a physiology source');
END;

-- Add integrity constraint check
-- Intervals-native physiology protection
-- This trigger prevents Strava from overwriting Intervals-native physiology
-- (Note: This is a safeguard; proper logic should prevent this at service layer)
CREATE TRIGGER IF NOT EXISTS protect_intervals_physiology
BEFORE UPDATE ON activities
FOR EACH ROW
WHEN OLD.physiology_source = 'intervals' 
  AND NEW.physiology_source = 'strava'
  AND (
    NEW.duration_s != OLD.duration_s OR
    NEW.distance_m != OLD.distance_m OR
    NEW.avg_power != OLD.avg_power OR
    NEW.normalized_power != OLD.normalized_power OR
    NEW.tss != OLD.tss OR
    NEW.avg_hr != OLD.avg_hr
  )
BEGIN
  SELECT RAISE(ABORT, 'Cannot overwrite Intervals-native physiology with Strava data');
END;

-- Verification queries (run after migration)
-- 
-- Check for invalid states:
-- SELECT COUNT(*) FROM activities WHERE is_shell = 1 AND is_valid_for_analytics = 1;
-- Expected: 0
--
-- SELECT COUNT(*) FROM activities WHERE is_valid_for_analytics = 1 AND physiology_source IS NULL;
-- Expected: 0
--
-- Check source distribution:
-- SELECT physiology_source, COUNT(*) FROM activities GROUP BY physiology_source;
-- SELECT metadata_source, COUNT(*) FROM activities GROUP BY metadata_source;
