-- Migration 018: Fix activity_stress schema drift
-- 
-- Problem: activity_stress was created with a simplified schema
-- (stress_type, confidence, evidence, computed_at) but the intended
-- Stress Classifier spec requires the full schema with block counts,
-- stochastic flag, sprint spikes, recovery score, and algo_version.
--
-- Approach (SQLite-safe):
-- 1. Rename existing table to activity_stress_legacy
-- 2. Create new activity_stress with correct schema
-- 3. Migrate legacy rows with sensible defaults
-- 4. Keep legacy table (do NOT drop)

-- Step 1: Rename existing table
ALTER TABLE activity_stress RENAME TO activity_stress_legacy;

-- Step 2: Create new activity_stress with full classifier schema
CREATE TABLE activity_stress (
  user_id              INTEGER NOT NULL,
  activity_id          TEXT    NOT NULL,
  computed_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  algo_version         TEXT    NOT NULL DEFAULT 'stress_v1',

  -- Classification
  primary_stress_type  TEXT    NOT NULL DEFAULT 'unknown',  -- 'steady', 'intervals', 'mixed', 'race', 'recovery', 'unknown'
  is_stochastic        INTEGER NOT NULL DEFAULT 0,          -- 1 if high variability / stochastic load

  -- Block counts (from stream analysis)
  sustained_threshold_blocks  INTEGER NOT NULL DEFAULT 0,   -- Number of sustained Z4 blocks
  longest_threshold_block_s   INTEGER NOT NULL DEFAULT 0,   -- Duration of longest Z4 block (seconds)
  vo2_blocks                  INTEGER NOT NULL DEFAULT 0,   -- Number of Z5/VO2max blocks
  longest_vo2_block_s         INTEGER NOT NULL DEFAULT 0,   -- Duration of longest Z5 block (seconds)
  sprint_spikes               INTEGER NOT NULL DEFAULT 0,   -- Count of short max-effort spikes

  -- Recovery & quality
  recovery_score       REAL,                                -- 0-1 recovery quality indicator (NULL if not computable)

  -- Evidence
  evidence             TEXT,                                -- JSON: detailed classification evidence

  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Step 3: Migrate legacy rows
INSERT INTO activity_stress (
  user_id, activity_id, computed_at, algo_version,
  primary_stress_type, is_stochastic,
  sustained_threshold_blocks, longest_threshold_block_s,
  vo2_blocks, longest_vo2_block_s, sprint_spikes,
  recovery_score, evidence
)
SELECT
  user_id,
  activity_id,
  computed_at,
  'stress_v1',
  COALESCE(stress_type, 'unknown'),   -- Map legacy stress_type -> primary_stress_type
  0,                                   -- is_stochastic default
  0,                                   -- sustained_threshold_blocks default
  0,                                   -- longest_threshold_block_s default
  0,                                   -- vo2_blocks default
  0,                                   -- longest_vo2_block_s default
  0,                                   -- sprint_spikes default
  NULL,                                -- recovery_score default
  evidence                             -- Preserve existing evidence JSON
FROM activity_stress_legacy;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_stress_type
  ON activity_stress(user_id, primary_stress_type);

CREATE INDEX IF NOT EXISTS idx_activity_stress_computed
  ON activity_stress(user_id, computed_at);

CREATE INDEX IF NOT EXISTS idx_activity_stress_algo
  ON activity_stress(algo_version);
