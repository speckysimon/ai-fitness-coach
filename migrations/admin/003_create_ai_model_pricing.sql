-- 003_create_ai_model_pricing.sql
-- Creates ai_model_pricing table and seeds default pricing for supported models

CREATE TABLE IF NOT EXISTS ai_model_pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_label TEXT NOT NULL,
  input_price_per_1m REAL NOT NULL DEFAULT 0,
  output_price_per_1m REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(model_provider, model_name)
);

-- Basic index for provider lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_pricing_provider
  ON ai_model_pricing (model_provider);

-- Seed pricing data (values from public pricing pages as of Nov 2025)
INSERT OR IGNORE INTO ai_model_pricing
  (model_provider, model_name, model_label, input_price_per_1m, output_price_per_1m)
VALUES
  ('openai', 'gpt-4o', 'GPT-4o', 5.00, 15.00),
  ('openai', 'gpt-4o-mini', 'GPT-4o Mini', 0.15, 0.60),
  ('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 10.00, 30.00),
  ('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 3.50, 10.50),
  ('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', 0.35, 1.05),
  ('gemini', 'gemini-2.0-flash', 'Gemini 2.0 Flash', 0.20, 0.60),
  ('gemini', 'gemini-2.0-flash-exp', 'Gemini 2.0 Flash (Experimental)', 0.25, 0.75);
