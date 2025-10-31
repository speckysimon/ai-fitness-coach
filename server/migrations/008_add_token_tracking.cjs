/**
 * Migration: Token Tracking and Model Pricing
 * Creates tables for tracking token usage and AI model pricing
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Running migration: 008_add_token_tracking');

  // Token usage logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS token_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      total_tokens INTEGER NOT NULL,
      request_type TEXT,
      user_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating token_usage_logs table:', err);
    } else {
      console.log('✓ Created token_usage_logs table');
    }
  });

  // Create indexes for faster queries
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_token_usage_created_at 
    ON token_usage_logs(created_at)
  `, (err) => {
    if (err) {
      console.error('Error creating index on created_at:', err);
    } else {
      console.log('✓ Created index on token_usage_logs.created_at');
    }
  });

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_token_usage_model 
    ON token_usage_logs(model_provider, model_name)
  `, (err) => {
    if (err) {
      console.error('Error creating index on model:', err);
    } else {
      console.log('✓ Created index on token_usage_logs.model');
    }
  });

  // AI model pricing table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_model_pricing (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      model_label TEXT NOT NULL,
      input_price_per_1m REAL NOT NULL,
      output_price_per_1m REAL NOT NULL,
      is_available INTEGER DEFAULT 1,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(model_provider, model_name)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating ai_model_pricing table:', err);
    } else {
      console.log('✓ Created ai_model_pricing table');
    }
  });

  // Insert default pricing data (as of Oct 2024)
  const defaultPricing = [
    // OpenAI models
    { provider: 'openai', name: 'gpt-4-turbo', label: 'GPT-4 Turbo', input: 10.00, output: 30.00 },
    { provider: 'openai', name: 'gpt-4', label: 'GPT-4', input: 30.00, output: 60.00 },
    { provider: 'openai', name: 'gpt-4o', label: 'GPT-4o', input: 5.00, output: 15.00 },
    { provider: 'openai', name: 'gpt-4o-mini', label: 'GPT-4o Mini', input: 0.15, output: 0.60 },
    { provider: 'openai', name: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', input: 0.50, output: 1.50 },
    
    // Gemini models
    { provider: 'gemini', name: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', input: 3.50, output: 10.50 },
    { provider: 'gemini', name: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', input: 0.35, output: 1.05 },
    { provider: 'gemini', name: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro', input: 0.50, output: 1.50 },
    { provider: 'gemini', name: 'gemini-pro', label: 'Gemini Pro', input: 0.50, output: 1.50 },
  ];

  const insertPricing = db.prepare(`
    INSERT OR IGNORE INTO ai_model_pricing 
    (model_provider, model_name, model_label, input_price_per_1m, output_price_per_1m)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultPricing.forEach(model => {
    insertPricing.run(
      model.provider,
      model.name,
      model.label,
      model.input,
      model.output
    );
  });

  insertPricing.finalize();
  console.log('✓ Inserted default AI model pricing');

  console.log('Migration 008_add_token_tracking completed successfully');
});

db.close();
