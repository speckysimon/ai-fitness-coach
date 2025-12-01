-- Migration: Add long_term_goal and week_start_day to user_preferences
-- Date: 2025-12-01
-- Risk: Low - Adding columns with defaults
-- Description: Add user preference fields for long-term training goals and week start day configuration

-- Add long-term goal field
ALTER TABLE user_preferences ADD COLUMN long_term_goal TEXT;

-- Add week start day field with default
ALTER TABLE user_preferences ADD COLUMN week_start_day TEXT DEFAULT 'Monday';

-- Verify columns were added (should return 2)
SELECT COUNT(*) as verification_count 
FROM pragma_table_info('user_preferences') 
WHERE name IN ('long_term_goal', 'week_start_day');
