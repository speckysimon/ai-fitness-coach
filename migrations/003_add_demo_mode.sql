-- Migration: Add is_demo column to users table
-- Date: 2025-12-01
-- Description: Add flag to identify demo users who should use mock Strava data

-- Add is_demo column with default 0 (false)
ALTER TABLE users ADD COLUMN is_demo INTEGER DEFAULT 0;

-- Verify column was added
SELECT COUNT(*) as verification_count 
FROM pragma_table_info('users') 
WHERE name = 'is_demo';
