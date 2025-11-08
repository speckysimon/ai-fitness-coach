/**
 * Migration 011: Add Admin Tables
 * Creates all admin-related tables for production deployment
 */

module.exports = {
  up: (db) => {
    console.log('Running migration: 011_add_admin_tables');

    // Admin users table
    db.exec(`
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
    `);
    console.log('✓ Created admin_users table');

    // AI model configurations table
    db.exec(`
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
    `);
    console.log('✓ Created ai_model_configs table');

    // Global settings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type TEXT DEFAULT 'string',
        category TEXT DEFAULT 'general',
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created global_settings table');

    // Coach personas table
    db.exec(`
      CREATE TABLE IF NOT EXISTS coach_personas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        persona_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        avatar_url TEXT,
        description TEXT NOT NULL,
        tone TEXT NOT NULL,
        color_gradient TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created coach_personas table');

    // Theme configs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS theme_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme_name TEXT UNIQUE NOT NULL,
        colors TEXT NOT NULL,
        is_active INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Created theme_configs table');

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ai_configs_feature ON ai_model_configs(feature_name)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_settings_key ON global_settings(setting_key)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_personas_active ON coach_personas(is_active)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_theme_active ON theme_configs(is_active)');
    console.log('✓ Created indexes');

    console.log('Migration 011_add_admin_tables completed successfully');
  }
};
