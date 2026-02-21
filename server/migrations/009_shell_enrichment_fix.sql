-- Migration 009: Shell Activity Enrichment Fix
-- Purpose: Add fields for proper shell detection, canonical source tracking, and analytics filtering
-- Date: 2026-02-17

-- Add canonical_source to track which provider won for this activity
ALTER TABLE activities ADD COLUMN canonical_source TEXT DEFAULT NULL;

-- Add is_valid_for_analytics flag to exclude shells from analytics
ALTER TABLE activities ADD COLUMN is_valid_for_analytics INTEGER NOT NULL DEFAULT 1;

-- Add shell_strava_id to store the numeric Strava ID from Intervals shells
ALTER TABLE activity_sources ADD COLUMN shell_strava_id TEXT DEFAULT NULL;

-- Update existing activities to set canonical_source from primary_source
UPDATE activities SET canonical_source = primary_source WHERE canonical_source IS NULL;

-- Update existing activities to set is_valid_for_analytics based on shell status
UPDATE activities SET is_valid_for_analytics = CASE WHEN is_shell = 1 THEN 0 ELSE 1 END;

-- Create index for analytics queries (only non-shell activities)
CREATE INDEX IF NOT EXISTS idx_activities_analytics 
  ON activities(user_id, start_time DESC) 
  WHERE is_valid_for_analytics = 1;

-- Create index for shell enrichment lookups
CREATE INDEX IF NOT EXISTS idx_activity_sources_shell_strava_id 
  ON activity_sources(user_id, shell_strava_id) 
  WHERE shell_strava_id IS NOT NULL;

-- Create index for canonical source queries
CREATE INDEX IF NOT EXISTS idx_activities_canonical_source 
  ON activities(canonical_source, is_valid_for_analytics);
