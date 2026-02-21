-- Migration: Weekly Rollups for Normalised + Durability + Stress Metrics
-- Purpose: Create stable weekly aggregates per user for dashboards and coaching logic
-- Date: 2026-02-17

CREATE TABLE IF NOT EXISTS athlete_weekly (
  user_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,              -- ISO Monday start (YYYY-MM-DD)
  computed_at TEXT NOT NULL,
  algo_version TEXT DEFAULT 'week_v1',

  -- Coverage / quality
  activities_total INTEGER DEFAULT 0,
  activities_analysed INTEGER DEFAULT 0,  -- included in analyticsQueryBuilder
  activities_with_streams INTEGER DEFAULT 0,
  activities_with_power INTEGER DEFAULT 0,
  activities_with_hr INTEGER DEFAULT 0,
  avg_quality_score REAL,

  -- Load / volume
  total_duration_s INTEGER DEFAULT 0,
  total_distance_m REAL DEFAULT 0,

  -- Time in zones (power + hr)
  tiz_power TEXT,                        -- JSON seconds per zone aggregated
  tiz_hr TEXT,                           -- JSON seconds per zone aggregated

  -- Key "work" markers
  threshold_minutes REAL,                -- Z4 time (power preferred)
  vo2_minutes REAL,                      -- Z5 time
  sprint_spikes INTEGER DEFAULT 0,       -- from stress
  stochastic_sessions INTEGER DEFAULT 0, -- count stress.is_stochastic=1

  -- Durability summaries (only where sufficient duration + has power)
  avg_power_fade REAL,
  p25_power_fade REAL,
  best_late_threshold_score REAL,
  avg_efficiency_drop REAL,
  repeat_hard_efforts_total INTEGER DEFAULT 0,

  -- Stress distribution
  stress_dist TEXT,                      -- JSON counts by type

  -- Metadata
  notes TEXT,                            -- JSON for missing-data reason codes

  PRIMARY KEY (user_id, week_start)
);

-- Index for efficient querying by user and date range
CREATE INDEX IF NOT EXISTS idx_athlete_weekly_user_week 
  ON athlete_weekly(user_id, week_start);

-- Index for querying recent weeks
CREATE INDEX IF NOT EXISTS idx_athlete_weekly_computed 
  ON athlete_weekly(computed_at);
