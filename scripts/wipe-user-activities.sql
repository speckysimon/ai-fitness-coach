-- Wipe Activity Data for simon@i-duna.com
-- Run with: sqlite3 server/fitness-coach.db < scripts/wipe-user-activities.sql
-- 
-- This script deletes ALL activity-related data but preserves:
-- - User account
-- - OAuth tokens (Strava, Google, Intervals)
-- - Training plans
-- - Race tags and analyses
-- - Wellness log
-- - Settings

-- First, get the user_id (for verification)
-- SELECT id, email, name FROM users WHERE email = 'simon@i-duna.com';

-- Delete activity data (in dependency order)
BEGIN TRANSACTION;

-- Weekly rollups
DELETE FROM athlete_weekly WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Analytics layers
DELETE FROM activity_stress WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
DELETE FROM activity_durability WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
DELETE FROM activity_normalised WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Activity streams (GPS, power, HR data)
DELETE FROM activity_streams WHERE activity_id IN (
  SELECT id FROM activities WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com')
);

-- Activity sources (provider-specific data)
DELETE FROM activity_sources WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Canonical activities
DELETE FROM activities WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Manual activities (if any)
DELETE FROM manual_activities WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

-- Workout comparisons (planned vs actual)
DELETE FROM workout_comparisons WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');

COMMIT;

-- Verify deletion
SELECT 'Activities remaining:' as description, COUNT(*) as count FROM activities WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
SELECT 'Activity sources remaining:' as description, COUNT(*) as count FROM activity_sources WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
SELECT 'Weekly rollups remaining:' as description, COUNT(*) as count FROM athlete_weekly WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
SELECT 'Normalised remaining:' as description, COUNT(*) as count FROM activity_normalised WHERE user_id = (SELECT id FROM users WHERE email = 'simon@i-duna.com');
