const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

console.log('🎨 Running migration: Add theme_configs table...');

try {
  // Create theme_configs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS theme_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER DEFAULT 0,
      config TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ theme_configs table created');

  // Create index on is_active for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_theme_configs_active 
    ON theme_configs(is_active);
  `);

  console.log('✅ Index on is_active created');

  console.log('✅ Migration completed successfully');
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}

db.close();
