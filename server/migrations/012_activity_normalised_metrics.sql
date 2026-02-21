-- Activity Normalised Metrics
-- Stores derived physiology features for coaching logic
-- Version: 1.0
-- Created: 2026-02-17

-- Create activity_normalised table
CREATE TABLE IF NOT EXISTS activity_normalised (
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  algo_version TEXT NOT NULL DEFAULT 'norm_v1',
  
  -- Data availability flags
  has_power INTEGER NOT NULL DEFAULT 0,
  has_hr INTEGER NOT NULL DEFAULT 0,
  has_cadence INTEGER NOT NULL DEFAULT 0,
  has_streams INTEGER NOT NULL DEFAULT 0,
  
  -- Basic metrics (from canonical activity)
  duration_s INTEGER,
  distance_m REAL,
  avg_power REAL,
  np REAL,
  avg_hr REAL,
  
  -- Derived metrics: Power
  power_fade_pct REAL,              -- Fatigue: final third vs first third
  vi REAL,                          -- Variability Index: NP/avgP
  time_in_zones_power TEXT,         -- JSON: {z1: seconds, z2: seconds, ...}
  longest_efforts_power TEXT,       -- JSON: {z2: {duration_s, avg_power}, z3: {...}, ...}
  
  -- Derived metrics: HR
  hr_drift_pct REAL,                -- Decoupling: HR drift over time
  time_in_zones_hr TEXT,            -- JSON: {z1: seconds, z2: seconds, ...}
  longest_efforts_hr TEXT,          -- JSON: {z2: {duration_s, avg_hr}, z3: {...}, ...}
  
  -- Quality assessment
  quality_score INTEGER,            -- 0-100: data completeness/quality
  notes TEXT,                       -- JSON: reason codes, gaps, warnings
  
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Index for querying by user and computation time
CREATE INDEX IF NOT EXISTS idx_activity_normalised_user_computed 
ON activity_normalised(user_id, computed_at);

-- Index for querying by user and quality
CREATE INDEX IF NOT EXISTS idx_activity_normalised_user_quality 
ON activity_normalised(user_id, quality_score);

-- Index for querying by algo version (for migrations)
CREATE INDEX IF NOT EXISTS idx_activity_normalised_algo_version 
ON activity_normalised(algo_version);
