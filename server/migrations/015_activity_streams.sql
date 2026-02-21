-- Activity Streams Storage
-- Canonical stream data for power, HR, cadence, speed, elevation
-- Version: 1.0
-- Created: 2026-02-17

-- Create activity_streams table
CREATE TABLE IF NOT EXISTS activity_streams (
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'fit'|'intervals'|'strava'
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  algo_version TEXT NOT NULL DEFAULT 'streams_v1',
  
  -- Stream metadata
  sample_interval_s INTEGER,         -- Expected interval between samples (1 for 1Hz)
  start_time TEXT,                   -- ISO timestamp of first sample
  duration_s INTEGER,                -- Total duration
  stream_format TEXT NOT NULL,       -- 'json' or 'json_gzip_base64'
  
  -- Stream data (encoded)
  power TEXT,                        -- Watts array
  hr TEXT,                           -- BPM array
  cadence TEXT,                      -- RPM array
  speed TEXT,                        -- m/s array
  elevation TEXT,                    -- meters array
  time_s TEXT,                       -- seconds array (optional, for irregular sampling)
  
  -- Quality flags
  flags TEXT,                        -- JSON: { gaps, derived, completeness, etc }
  
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_activity_streams_user 
ON activity_streams(user_id);

-- Index for querying by user and source
CREATE INDEX IF NOT EXISTS idx_activity_streams_user_source 
ON activity_streams(user_id, source);

-- Index for querying by algo version (for migrations)
CREATE INDEX IF NOT EXISTS idx_activity_streams_algo_version 
ON activity_streams(algo_version);
