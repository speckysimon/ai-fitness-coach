-- Migration 004: Activity Interpretation Engine v1
-- Purpose: Store deterministic activity analysis signals for coaching logic
-- No AI, no persona bias, no planning - pure interpretation layer

CREATE TABLE IF NOT EXISTS activity_interpretation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id TEXT NOT NULL UNIQUE,
  interpretation_version INTEGER NOT NULL,
  computed_at TEXT NOT NULL DEFAULT (datetime('now')),
  payload_json TEXT NOT NULL,
  flags_json TEXT,
  source TEXT NOT NULL, -- 'import' | 'backfill' | 'manual'
  
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interpretation_activity 
  ON activity_interpretation(activity_id);

CREATE INDEX IF NOT EXISTS idx_interpretation_computed 
  ON activity_interpretation(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_interpretation_version 
  ON activity_interpretation(interpretation_version);
