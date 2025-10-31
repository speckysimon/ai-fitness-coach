/**
 * Migration: Admin System
 * Creates tables for admin users, AI model configurations, and global settings
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  console.log('Running migration: 007_add_admin_system');

  // Admin users table
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      is_super_admin INTEGER DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating admin_users table:', err);
    } else {
      console.log('✓ Created admin_users table');
    }
  });

  // AI model configurations table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_name TEXT UNIQUE NOT NULL,
      model_provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      api_key_name TEXT,
      system_prompt TEXT,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER,
      parameters TEXT,
      is_active INTEGER DEFAULT 1,
      cost_per_1k_tokens REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating ai_model_configs table:', err);
    } else {
      console.log('✓ Created ai_model_configs table');
    }
  });

  // API keys table (encrypted storage)
  db.run(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key_name TEXT UNIQUE NOT NULL,
      provider TEXT NOT NULL,
      encrypted_key TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating api_keys table:', err);
    } else {
      console.log('✓ Created api_keys table');
    }
  });

  // Global settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS global_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      setting_type TEXT DEFAULT 'string',
      category TEXT,
      description TEXT,
      updated_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (updated_by) REFERENCES admin_users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating global_settings table:', err);
    } else {
      console.log('✓ Created global_settings table');
    }
  });

  // Admin activity log
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admin_users(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating admin_activity_log table:', err);
    } else {
      console.log('✓ Created admin_activity_log table');
    }
  });

  // Insert default AI model configurations
  const defaultConfigs = [
    {
      feature_name: 'training_plan_generation',
      model_provider: 'openai',
      model_name: 'gpt-4-turbo',
      api_key_name: 'OPENAI_API_KEY',
      temperature: 0.7,
      max_tokens: 4000,
      cost_per_1k_tokens: 0.01
    },
    {
      feature_name: 'plan_adjustment',
      model_provider: 'openai',
      model_name: 'gpt-4-turbo',
      api_key_name: 'OPENAI_API_KEY',
      temperature: 0.7,
      max_tokens: 3000,
      cost_per_1k_tokens: 0.01
    },
    {
      feature_name: 'workout_analysis',
      model_provider: 'openai',
      model_name: 'gpt-4-turbo',
      api_key_name: 'OPENAI_API_KEY',
      temperature: 0.7,
      max_tokens: 1000,
      cost_per_1k_tokens: 0.01
    },
    {
      feature_name: 'race_analysis',
      model_provider: 'openai',
      model_name: 'gpt-4-turbo',
      api_key_name: 'OPENAI_API_KEY',
      temperature: 0.7,
      max_tokens: 2000,
      cost_per_1k_tokens: 0.01
    }
  ];

  const insertConfig = db.prepare(`
    INSERT OR IGNORE INTO ai_model_configs 
    (feature_name, model_provider, model_name, api_key_name, temperature, max_tokens, cost_per_1k_tokens)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  defaultConfigs.forEach(config => {
    insertConfig.run(
      config.feature_name,
      config.model_provider,
      config.model_name,
      config.api_key_name,
      config.temperature,
      config.max_tokens,
      config.cost_per_1k_tokens
    );
  });

  insertConfig.finalize();
  console.log('✓ Inserted default AI model configurations');

  // Insert default global settings
  const defaultSettings = [
    {
      key: 'notifications_enabled',
      value: 'true',
      type: 'boolean',
      category: 'notifications',
      description: 'Enable/disable notifications for all users'
    },
    {
      key: 'notification_frequency_hours',
      value: '4',
      type: 'number',
      category: 'notifications',
      description: 'Default notification frequency in hours'
    },
    {
      key: 'max_users',
      value: '1000',
      type: 'number',
      category: 'system',
      description: 'Maximum number of registered users'
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      type: 'boolean',
      category: 'system',
      description: 'Enable maintenance mode (blocks user access)'
    },
    {
      key: 'registration_enabled',
      value: 'true',
      type: 'boolean',
      category: 'system',
      description: 'Allow new user registrations'
    },
    {
      key: 'ai_features_enabled',
      value: 'true',
      type: 'boolean',
      category: 'ai',
      description: 'Enable AI-powered features'
    },
    {
      key: 'max_plan_generations_per_day',
      value: '5',
      type: 'number',
      category: 'limits',
      description: 'Maximum training plans per user per day'
    }
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO global_settings 
    (setting_key, setting_value, setting_type, category, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultSettings.forEach(setting => {
    insertSetting.run(
      setting.key,
      setting.value,
      setting.type,
      setting.category,
      setting.description
    );
  });

  insertSetting.finalize();
  console.log('✓ Inserted default global settings');

  console.log('Migration 007_add_admin_system completed successfully');
});

db.close();
