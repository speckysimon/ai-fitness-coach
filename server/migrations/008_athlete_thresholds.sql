-- Migration 008: Athlete Thresholds
-- Purpose: Store athlete-level FTP and FTHR for consistent interpretation v4 computations
-- Replaces per-activity NP/avg_power usage with stable athlete-level thresholds

CREATE TABLE IF NOT EXISTS athlete_thresholds (
  user_id INTEGER PRIMARY KEY,
  ftp_w REAL NULL,
  fthr_bpm REAL NULL,
  ftp_source TEXT NULL,  -- 'manual', 'estimated', 'computed'
  fthr_source TEXT NULL, -- 'manual', 'estimated', 'computed'
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_athlete_thresholds_user 
  ON athlete_thresholds(user_id);
