-- ============================================================================
-- Add Rate Limit Setting for AI Coach Chats
-- Run this on both local and production: sqlite3 server/database.sqlite < server/add-rate-limit-setting.sql
-- ============================================================================

-- Add max_ai_chats_per_day setting
INSERT INTO global_settings (
  setting_key,
  setting_value,
  setting_type,
  category,
  description,
  created_at,
  updated_at
) VALUES (
  'max_ai_chats_per_day',
  '10',
  'number',
  'limits',
  'Maximum AI coach chats per user per day (activity questions, fitness advice, etc.)',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT(setting_key) DO UPDATE SET
  setting_value = excluded.setting_value,
  description = excluded.description,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the setting was added
SELECT 
  setting_key,
  setting_value,
  setting_type,
  category,
  description
FROM global_settings 
WHERE setting_key = 'max_ai_chats_per_day';
