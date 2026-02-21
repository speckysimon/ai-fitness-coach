/**
 * Migration: Create intervals_tokens table
 * Date: January 24, 2026
 * 
 * This migration creates the intervals_tokens table required for Intervals.icu integration
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../fitness-coach.db');

function migrate() {
  const db = new Database(dbPath);
  
  try {
    console.log('🔧 Starting intervals_tokens table migration...');
    
    // Create intervals_tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS intervals_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        scopes TEXT,
        athlete_id TEXT,
        athlete_name TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('✅ intervals_tokens table created');
    
    // Create index
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_intervals_tokens_user ON intervals_tokens(user_id);
    `);
    
    console.log('✅ Index created');
    
    // Create intervals_sync_state table
    db.exec(`
      CREATE TABLE IF NOT EXISTS intervals_sync_state (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        last_sync_at TEXT,
        last_activity_id TEXT,
        sync_status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    
    console.log('✅ intervals_sync_state table created');
    
    // Create index for sync state
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_intervals_sync_user ON intervals_sync_state(user_id);
    `);
    
    console.log('✅ All tables and indexes created successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    db.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
  console.log('✅ Migration complete');
}

module.exports = { migrate };
