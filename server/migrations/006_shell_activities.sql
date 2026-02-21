-- Migration 006: Shell Activity Suppression
-- Purpose: Flag incomplete/shell activities to exclude from UI and aggregations
-- Shell activities have no meaningful metrics (no duration, distance, power, or HR)

-- Add is_shell flag to activities table
ALTER TABLE activities ADD COLUMN is_shell INTEGER NOT NULL DEFAULT 0;

-- Add optional reason for why activity is marked as shell
ALTER TABLE activities ADD COLUMN shell_reason TEXT NULL;

-- Create index for efficient shell filtering
CREATE INDEX IF NOT EXISTS idx_activities_is_shell 
  ON activities(is_shell, start_time) 
  WHERE is_shell = 0;

-- Create index for shell analysis
CREATE INDEX IF NOT EXISTS idx_activities_shells 
  ON activities(is_shell) 
  WHERE is_shell = 1;
