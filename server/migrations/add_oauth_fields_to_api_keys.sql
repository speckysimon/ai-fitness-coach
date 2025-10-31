-- Migration: Add OAuth credential fields to api_keys table
-- Date: 2025-10-30
-- Description: Adds client_id and redirect_uri fields to support OAuth providers like Strava and Google

-- Add client_id column (for OAuth providers)
ALTER TABLE api_keys ADD COLUMN client_id TEXT;

-- Add redirect_uri column (for OAuth providers)
ALTER TABLE api_keys ADD COLUMN redirect_uri TEXT;

-- Note: encrypted_key will store either:
-- - Simple API key (for OpenAI, Gemini, OpenWeather)
-- - Client Secret (for Strava, Google OAuth)
