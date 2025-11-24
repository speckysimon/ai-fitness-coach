-- Admin Password Resets Table
-- Migration: 001_admin_password_resets.sql
-- Created: 2025-11-24

CREATE TABLE IF NOT EXISTS admin_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  request_ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_admin_id ON admin_password_resets(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_token_hash ON admin_password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_password_resets_expires_at ON admin_password_resets(expires_at);
