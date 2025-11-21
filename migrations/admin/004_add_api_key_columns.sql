-- 004_add_api_key_columns.sql
-- Adds api_key/client_secret columns expected by admin services

-- Add api_key column if missing
ALTER TABLE api_keys ADD COLUMN api_key TEXT;

-- Add client_secret column if missing
ALTER TABLE api_keys ADD COLUMN client_secret TEXT;

-- Backfill api_key from encrypted_key (older schema)
UPDATE api_keys
  SET api_key = encrypted_key
  WHERE api_key IS NULL
    AND encrypted_key IS NOT NULL;

-- For OAuth rows that already had encrypted_key, mirror into client_secret
UPDATE api_keys
  SET client_secret = encrypted_key
  WHERE client_secret IS NULL
    AND encrypted_key IS NOT NULL
    AND provider IN ('google','strava');

-- Ensure provider index exists (idempotent)
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

