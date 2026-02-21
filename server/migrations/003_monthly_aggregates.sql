-- Migration 003: Monthly Aggregates for Long-Term History
-- Purpose: Store monthly rollups to enable pruning of old detailed activities
-- while preserving long-term training history for AI context and analytics.

-- athlete_monthly_summary: Aggregate training metrics per month
CREATE TABLE IF NOT EXISTS athlete_monthly_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  
  -- Activity counts
  total_activities INTEGER DEFAULT 0,
  ride_count INTEGER DEFAULT 0,
  run_count INTEGER DEFAULT 0,
  other_count INTEGER DEFAULT 0,
  
  -- Volume metrics
  total_duration_s INTEGER DEFAULT 0,
  total_distance_m INTEGER DEFAULT 0,
  total_elevation_m INTEGER DEFAULT 0,
  total_tss REAL DEFAULT 0,
  
  -- Intensity distribution (seconds in each zone)
  z1_time_s INTEGER DEFAULT 0,
  z2_time_s INTEGER DEFAULT 0,
  z3_time_s INTEGER DEFAULT 0,
  z4_time_s INTEGER DEFAULT 0,
  z5_time_s INTEGER DEFAULT 0,
  z6_time_s INTEGER DEFAULT 0,
  z7_time_s INTEGER DEFAULT 0,
  
  -- Average metrics
  avg_power REAL,
  avg_hr REAL,
  avg_cadence REAL,
  
  -- Weekly ramp (for fatigue tracking)
  avg_weekly_tss REAL,
  max_weekly_tss REAL,
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  UNIQUE(user_id, year, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monthly_summary_user_date 
  ON athlete_monthly_summary(user_id, year DESC, month DESC);

-- athlete_monthly_bests: Best efforts per month for power curve tracking
CREATE TABLE IF NOT EXISTS athlete_monthly_bests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  
  -- Power bests (watts) for standard durations
  best_5s INTEGER,
  best_10s INTEGER,
  best_20s INTEGER,
  best_30s INTEGER,
  best_1min INTEGER,
  best_2min INTEGER,
  best_5min INTEGER,
  best_10min INTEGER,
  best_20min INTEGER,
  best_30min INTEGER,
  best_60min INTEGER,
  
  -- Activity IDs where bests occurred (for reference)
  best_5s_activity_id TEXT,
  best_1min_activity_id TEXT,
  best_5min_activity_id TEXT,
  best_20min_activity_id TEXT,
  best_60min_activity_id TEXT,
  
  -- FTP estimate for the month
  estimated_ftp INTEGER,
  
  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  UNIQUE(user_id, year, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monthly_bests_user_date 
  ON athlete_monthly_bests(user_id, year DESC, month DESC);

-- Optional: activity_archive_index for pruned activities
-- Lightweight index of pruned activities for historical reference
CREATE TABLE IF NOT EXISTS activity_archive_index (
  id TEXT PRIMARY KEY, -- Original activity ID
  user_id INTEGER NOT NULL,
  name TEXT,
  type TEXT,
  start_time TEXT NOT NULL,
  duration_s INTEGER,
  distance_m INTEGER,
  tss REAL,
  is_race INTEGER DEFAULT 0,
  
  -- Month aggregate reference
  archive_year INTEGER NOT NULL,
  archive_month INTEGER NOT NULL,
  
  pruned_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_archive_user_date 
  ON activity_archive_index(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_archive_month 
  ON activity_archive_index(user_id, archive_year DESC, archive_month DESC);
