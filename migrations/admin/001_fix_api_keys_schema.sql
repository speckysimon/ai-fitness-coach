-- Migration: Fix API Keys Schema
-- Date: 2025-11-19
-- Description: Recreate api_keys table with correct schema (encrypted_key instead of api_key)

-- Drop old table
DROP TABLE IF EXISTS api_keys;

-- Create new table with correct schema
CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key_name TEXT UNIQUE NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  client_id TEXT,
  redirect_uri TEXT,
  is_active INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_api_keys_provider ON api_keys(provider);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);
