-- Migration 011: Analytics Strava-Only Control
-- Add user-level setting to control whether Strava-only rides are included in analytics

-- Add analytics_include_strava_only column to users table
ALTER TABLE users ADD COLUMN analytics_include_strava_only INTEGER DEFAULT 1;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activities_analytics_source 
ON activities(user_id, is_valid_for_analytics, physiology_source);

-- Comment: This allows users to exclude Strava-only rides from analytics
-- while still including rides that have Intervals-native or FIT physiology
-- even if Strava metadata is attached.
