-- Migration 005: Metric Provenance Tracking
-- Purpose: Track which provider supplied each metric value in canonical activities
-- Enables debugging "why is this number here?" questions

-- Add metric_provenance_json column to activities table
-- Stores JSON object mapping metric name -> provider name
-- Example: {"avg_hr": "intervals", "avg_power": "strava", "tss": "intervals"}
ALTER TABLE activities ADD COLUMN metric_provenance_json TEXT NULL;

-- Create index for querying provenance
CREATE INDEX IF NOT EXISTS idx_activities_provenance 
  ON activities(metric_provenance_json) 
  WHERE metric_provenance_json IS NOT NULL;
