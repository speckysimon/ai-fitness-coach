-- 002_create_token_usage_logs.sql
-- Creates token_usage_logs table for tracking AI token consumption

CREATE TABLE IF NOT EXISTS token_usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  request_type TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost REAL,
  user_id INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_token_logs_created_at
  ON token_usage_logs (created_at);

CREATE INDEX IF NOT EXISTS idx_token_logs_model
  ON token_usage_logs (model_provider, model_name);

CREATE INDEX IF NOT EXISTS idx_token_logs_feature
  ON token_usage_logs (feature_name);
