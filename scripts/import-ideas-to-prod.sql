-- ============================================================================
-- Import Ideas from Local to Production
-- Run this on production: sqlite3 server/database.sqlite < scripts/import-ideas-to-prod.sql
-- ============================================================================

-- Clear existing ideas (optional - comment out if you want to keep existing)
-- DELETE FROM ideas;

-- Reset auto-increment counter (optional)
-- DELETE FROM sqlite_sequence WHERE name='ideas';

-- Import all ideas
INSERT INTO ideas (id, title, description, category, priority, scale, status, estimated_hours, tags, source, created_by, created_at, updated_at, completed_at) VALUES
(1, 'Complete Onboarding Modal Testing', 'Test multi-step onboarding flow end-to-end including Strava OAuth, coach selection, and plan generation', 'bug_fix', 'high', 'small', 'planned', 4, '["onboarding","testing","ux"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(2, 'Training Plan Generation - Production Testing', 'Verify training plan generation works on production with different plan parameters and event types', 'bug_fix', 'high', 'small', 'planned', 3, '["production","testing","ai"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(3, 'AI Coach - Post-Training Chat Experience', 'Make "Talk to AI Coach" more general purpose for post-training debriefs, Q&A, and discussions beyond just plan adjustments', 'enhancement', 'high', 'large', 'backlog', 40, '["ai","coach","chat","ux"]', 'user_feedback', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(4, 'Activity Analysis Button', 'Add "Analyze Activity" button to individual activity modals for one-time analysis against plan/history/goals', 'feature', 'high', 'medium', 'backlog', 16, '["ai","activities","analysis"]', 'user_feedback', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(5, 'Long-term Goal Field', 'Add long-term goal field to user settings to help AI understand athlete''s ultimate objective', 'feature', 'medium', 'small', 'backlog', 6, '["settings","goals","ai"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(6, 'Forgot Password Feature', 'Implement password reset flow with secure tokens and email integration', 'feature', 'critical', 'medium', 'backlog', 20, '["auth","security","email"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:25:30', NULL),
(7, 'Email Setup for riderlabs.io', 'Configure transactional email service (SendGrid/Mailgun) and professional email', 'integration', 'medium', 'small', 'backlog', 8, '["email","infrastructure"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(8, 'Rate Limiting for API Endpoints', 'Add rate limiting to protect API endpoints from abuse', 'enhancement', 'medium', 'small', 'backlog', 6, '["security","api"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(9, 'Help/FAQ Page', 'Create comprehensive help and FAQ page for users', 'feature', 'low', 'medium', 'backlog', 16, '["documentation","ux"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(10, 'Progressive Web App (PWA)', 'Add PWA support for offline functionality and app-like experience', 'enhancement', 'low', 'large', 'backlog', 60, '["pwa","mobile","offline"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(11, 'Push Notifications for Workouts', 'Implement push notifications to remind athletes of upcoming workouts', 'feature', 'low', 'medium', 'backlog', 24, '["notifications","mobile"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(12, 'Garmin Connect Integration', 'Integrate with Garmin Connect for activity sync and workout export', 'integration', 'low', 'epic', 'backlog', 100, '["integration","garmin","activities"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(13, 'Zwift Workout Export', 'Enable direct export of training sessions to Zwift format', 'integration', 'low', 'large', 'backlog', 40, '["integration","zwift","export"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(14, 'Advanced Analytics Dashboard', 'Create comprehensive analytics dashboard with predictive modeling and insights', 'feature', 'low', 'epic', 'backlog', 120, '["analytics","ai","dashboard"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(15, 'Mobile App (React Native)', 'Develop native mobile app for iOS and Android', 'feature', 'low', 'epic', 'backlog', 400, '["mobile","ios","android"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(16, 'Manual Activity Edit Not Saving', 'Fix bug where manual activity edits are not being saved to database', 'bug_fix', 'critical', 'small', 'backlog', 4, '["bug","activities","database"]', 'user_feedback', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(17, 'WCAG AA Contrast Compliance', 'Ensure all dark mode colors meet WCAG AA contrast requirements', 'bug_fix', 'medium', 'small', 'backlog', 8, '["accessibility","dark-mode","ui"]', 'roadmap', 'system', '2025-11-19 16:22:32', '2025-11-19 16:22:32', NULL),
(18, 'Add email and activate so we can use for password restore.', 'We need to add a ''forgot password'' email recovery function or login process isn''t great.', 'feature', 'medium', 'medium', 'backlog', NULL, '[]', 'team', 'admin', '2025-11-19 16:25:07', '2025-11-19 16:25:07', NULL)
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  priority = excluded.priority,
  scale = excluded.scale,
  status = excluded.status,
  estimated_hours = excluded.estimated_hours,
  tags = excluded.tags,
  source = excluded.source,
  created_by = excluded.created_by,
  updated_at = datetime('now');

-- Verify import
SELECT COUNT(*) as total_ideas FROM ideas;
SELECT category, COUNT(*) as count FROM ideas GROUP BY category;
SELECT priority, COUNT(*) as count FROM ideas GROUP BY priority ORDER BY 
  CASE priority 
    WHEN 'critical' THEN 1 
    WHEN 'high' THEN 2 
    WHEN 'medium' THEN 3 
    WHEN 'low' THEN 4 
  END;
