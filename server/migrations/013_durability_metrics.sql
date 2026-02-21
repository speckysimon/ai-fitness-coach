-- Durability & Fatigue Resistance Metrics
-- Measures late-ride power preservation, efficiency, and repeatability
-- Version: 1.0
-- Created: 2026-02-17

-- Create activity_durability table
CREATE TABLE IF NOT EXISTS activity_durability (
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  algo_version TEXT NOT NULL DEFAULT 'dur_v1',
  
  -- Fatigue resistance metrics
  fade_power_pct REAL,              -- Power drop: final third vs first third
  fade_hr_pct REAL,                 -- HR change: final third vs first third
  efficiency_drop_pct REAL,         -- (Power/HR) efficiency drop late vs early
  
  -- Late-ride performance
  late_threshold_score REAL,        -- % time >= threshold in final third
  late_zone_distribution TEXT,      -- JSON: zone distribution in final third
  
  -- Repeatability & stochasticity
  stochasticity_score REAL,         -- Power variability: stddev/mean
  repeat_hard_efforts INTEGER,      -- Count of Z5+ efforts with recovery
  surge_count INTEGER,              -- Count of power surges (>20% above avg)
  
  -- Quality & metadata
  has_sufficient_duration INTEGER,  -- Activity long enough for analysis (>30min)
  has_power_data INTEGER,           -- Power data available
  has_hr_data INTEGER,              -- HR data available
  notes TEXT,                       -- JSON: reason codes, warnings
  
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Index for querying by user and computation time
CREATE INDEX IF NOT EXISTS idx_activity_durability_user_computed 
ON activity_durability(user_id, computed_at);

-- Index for querying by user and fade metrics
CREATE INDEX IF NOT EXISTS idx_activity_durability_user_fade 
ON activity_durability(user_id, fade_power_pct);

-- Index for querying by algo version (for migrations)
CREATE INDEX IF NOT EXISTS idx_activity_durability_algo_version 
ON activity_durability(algo_version);
