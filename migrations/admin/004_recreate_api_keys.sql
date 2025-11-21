
CREATE TABLE IF NOT EXISTS api_keys_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT UNIQUE NOT NULL,
  api_key TEXT NOT NULL,
  client_id TEXT,
  client_secret TEXT,
  redirect_uri TEXT,
  is_active INTEGER DEFAULT 1,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO api_keys_new (provider, api_key, client_id, client_secret, redirect_uri, is_active, last_used_at, created_at, updated_at)
SELECT
  COALESCE(provider, key_name),
  COALESCE(api_key, encrypted_key),
  client_id,
  client_secret,
  redirect_uri,
  is_active,
  last_used_at,
  created_at,
  updated_at
FROM api_keys;

DROP TABLE api_keys;
ALTER TABLE api_keys_new RENAME TO api_keys;

CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

