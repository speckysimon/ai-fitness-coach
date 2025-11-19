-- ============================================================================
-- RiderLabs Database Schema
-- Complete schema for all application tables
-- Version: 2.8.3
-- Last Updated: November 8, 2025
-- ============================================================================

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table - Core user accounts
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  height REAL,
  weight REAL,
  gender TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sessions table - User authentication sessions
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- OAUTH & INTEGRATIONS
-- ============================================================================

-- Strava OAuth tokens
CREATE TABLE IF NOT EXISTS strava_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  athlete_id TEXT,
  athlete_data TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS google_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- TRAINING & ACTIVITIES
-- ============================================================================

-- Training plans - AI-generated training plans
CREATE TABLE IF NOT EXISTS training_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  days_per_week INTEGER NOT NULL,
  max_hours_per_week REAL,
  goals TEXT,
  plan_data TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Manual activities - User-logged activities (gym, cross-training, etc.)
CREATE TABLE IF NOT EXISTS manual_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_date TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  distance REAL,
  intensity_level TEXT NOT NULL,
  perceived_exertion INTEGER,
  avg_heart_rate INTEGER,
  estimated_tss INTEGER,
  calories INTEGER,
  elevation_gain REAL,
  notes TEXT,
  location TEXT,
  indoor INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- RACE MANAGEMENT
-- ============================================================================

-- Race tags - Mark activities as races with type
CREATE TABLE IF NOT EXISTS race_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  is_race INTEGER NOT NULL DEFAULT 1,
  race_type TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Race analyses - Post-race AI analysis and feedback
CREATE TABLE IF NOT EXISTS race_analyses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  race_name TEXT NOT NULL,
  race_date TEXT NOT NULL,
  race_type TEXT,
  overall_score INTEGER,
  pacing_score INTEGER,
  execution_score INTEGER,
  tactical_score INTEGER,
  analysis_data TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, activity_id)
);

-- ============================================================================
-- ADAPTATION & WELLNESS
-- ============================================================================

-- Adaptation events - Track illness, injury, life events
CREATE TABLE IF NOT EXISTS adaptation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  category TEXT,
  notes TEXT,
  data_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Plan adjustments - AI-suggested plan modifications
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  adaptation_event_id INTEGER,
  adjustment_type TEXT NOT NULL,
  changes_json TEXT NOT NULL,
  ai_reasoning TEXT,
  user_accepted INTEGER,
  applied_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (adaptation_event_id) REFERENCES adaptation_events(id) ON DELETE SET NULL
);

-- Wellness log - Daily wellness tracking
CREATE TABLE IF NOT EXISTS wellness_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  feeling TEXT,
  sleep_quality INTEGER,
  stress_level INTEGER,
  soreness INTEGER,
  motivation INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Workout comparisons - Planned vs actual workout analysis
CREATE TABLE IF NOT EXISTS workout_comparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  planned_tss REAL,
  actual_tss REAL,
  planned_duration INTEGER,
  actual_duration INTEGER,
  planned_power REAL,
  actual_power REAL,
  deviation_severity TEXT,
  strava_activity_id TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================

-- User preferences - FTP, timezone, theme, etc.
CREATE TABLE IF NOT EXISTS user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  ftp INTEGER,
  timezone TEXT,
  theme TEXT DEFAULT 'system',
  other_settings TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================================
-- ADMIN TABLES
-- ============================================================================

-- Admin users - Admin panel authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_super_admin INTEGER DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- AI model configurations - Per-feature AI model settings
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_name TEXT UNIQUE NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_key_name TEXT,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER,
  parameters TEXT,
  is_active INTEGER DEFAULT 1,
  cost_per_1k_tokens REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API keys - Encrypted API keys for external services
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  redirect_uri TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Global settings - Application-wide configuration
CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string',
  category TEXT DEFAULT 'general',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Coach personas - AI coach personalities
CREATE TABLE IF NOT EXISTS coach_personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL,
  catchphrase TEXT,
  color TEXT,
  personality TEXT,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Theme configurations - UI theme settings
CREATE TABLE IF NOT EXISTS theme_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_name TEXT UNIQUE NOT NULL,
  colors TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Admin activity log - Track admin actions
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- ============================================================================
-- FEEDBACK & ANALYTICS
-- ============================================================================

-- Feedback - User feedback submissions
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rating INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  email TEXT,
  user_email TEXT,
  timestamp TEXT NOT NULL,
  user_agent TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Training indexes
CREATE INDEX IF NOT EXISTS idx_training_plans_user_id ON training_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_training_plans_created_at ON training_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_activities_user_date ON manual_activities(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_activities_sport ON manual_activities(user_id, sport_type);

-- Race indexes
CREATE INDEX IF NOT EXISTS idx_race_tags_user_id ON race_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_race_analyses_user_id ON race_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_race_analyses_race_date ON race_analyses(race_date DESC);
CREATE INDEX IF NOT EXISTS idx_race_analyses_activity_id ON race_analyses(activity_id);

-- Adaptation indexes
CREATE INDEX IF NOT EXISTS idx_adaptation_events_user_id ON adaptation_events(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user_id ON plan_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_wellness_log_user_date ON wellness_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_workout_comparisons_user_date ON workout_comparisons(user_id, date);

-- Preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Admin indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_ai_configs_feature ON ai_model_configs(feature_name);
CREATE INDEX IF NOT EXISTS idx_settings_key ON global_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_personas_active ON coach_personas(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_theme_active ON theme_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_user_email ON feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_feedback_timestamp ON feedback(timestamp DESC);

-- ============================================================================
-- IDEAS & IMPROVEMENTS
-- ============================================================================

-- Ideas and improvements tracking
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'feature', 'improvement', 'bug_fix', 'enhancement', 'integration'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  scale TEXT NOT NULL DEFAULT 'medium', -- 'small', 'medium', 'large', 'epic'
  status TEXT NOT NULL DEFAULT 'backlog', -- 'backlog', 'planned', 'in_progress', 'completed', 'archived'
  estimated_hours INTEGER,
  tags TEXT, -- JSON array of tags
  source TEXT, -- Where the idea came from: 'user_feedback', 'team', 'analytics', 'roadmap'
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Ideas indexes
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON ideas(priority);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);

-- ============================================================================
-- SEED DATA - Default Coach Personas
-- ============================================================================

INSERT OR IGNORE INTO coach_personas (id, name, style, description, tone, catchphrase, color, personality, is_active, sort_order)
VALUES 
  ('motivator', 'Coach Alex', 'Motivational', 'High-energy motivator who pushes you to exceed your limits', 'enthusiastic', 'Let''s crush this!', 'from-orange-400 to-red-500', 'Energetic, encouraging, and always positive. Uses lots of exclamation marks and motivational language.', 1, 1),
  ('analytical', 'Coach Jordan', 'Analytical', 'Data-driven coach focused on metrics and progressive overload', 'analytical', 'The numbers don''t lie', 'from-blue-400 to-indigo-600', 'Precise, methodical, and detail-oriented. Focuses on data, percentages, and scientific training principles.', 1, 2),
  ('supportive', 'Coach Sam', 'Supportive', 'Empathetic coach who listens and adapts to your needs', 'supportive', 'We''re in this together', 'from-green-400 to-emerald-600', 'Understanding, patient, and empathetic. Emphasizes recovery, listening to your body, and sustainable progress.', 1, 3),
  ('strategic', 'Coach Taylor', 'Strategic', 'Tactical coach who plans every detail for race success', 'strategic', 'Every session has a purpose', 'from-purple-400 to-pink-500', 'Focused, goal-oriented, and strategic. Emphasizes race preparation, pacing strategies, and long-term planning.', 1, 4),
  ('experienced', 'Coach Morgan', 'Experienced', 'Veteran coach with decades of racing and coaching wisdom', 'experienced', 'I''ve seen it all', 'from-yellow-400 to-amber-600', 'Wise, experienced, and pragmatic. Shares insights from years of coaching, focuses on what works in real-world racing.', 1, 5);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
