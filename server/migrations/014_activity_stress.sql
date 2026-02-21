-- Migration 014: Activity Stress Classification
-- Creates table for storing activity stress type classification

CREATE TABLE IF NOT EXISTS activity_stress (
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  stress_type TEXT NOT NULL, -- 'steady', 'intervals', 'mixed', 'race'
  confidence REAL NOT NULL, -- 0-1 confidence score
  evidence TEXT, -- JSON evidence for classification
  computed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

-- Index for querying by stress type
CREATE INDEX IF NOT EXISTS idx_activity_stress_type ON activity_stress(user_id, stress_type);

-- Index for querying by computed_at
CREATE INDEX IF NOT EXISTS idx_activity_stress_computed ON activity_stress(user_id, computed_at);
