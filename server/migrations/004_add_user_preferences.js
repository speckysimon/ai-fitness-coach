/**
 * Migration: Add user_preferences table
 * Date: October 24, 2025
 * 
 * This migration creates the user_preferences table to store user settings
 * like FTP, timezone, theme, and other preferences.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: Create user_preferences table');
  
  try {
    // Check if table already exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='user_preferences'
    `).get();
    
    if (tableExists) {
      console.log('✅ user_preferences table already exists, skipping migration');
      return;
    }
    
    // Create user_preferences table
    db.exec(`
      CREATE TABLE user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        
        -- Common preferences
        ftp INTEGER,
        timezone TEXT,
        theme TEXT DEFAULT 'system',
        
        -- Additional settings (JSON)
        other_settings TEXT,
        
        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        -- Foreign key
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Create index for faster lookups
      CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
    `);
    
    console.log('✅ Successfully created user_preferences table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Rolling back migration: Drop user_preferences table');
  
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_user_preferences_user_id;
      DROP TABLE IF EXISTS user_preferences;
    `);
    
    console.log('✅ Successfully dropped user_preferences table');
  } catch (error) {
    console.error('❌ Rollback failed:', error.message);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dbPath = path.join(__dirname, '..', 'fitness-coach.db');
  const db = new Database(dbPath);
  
  console.log('📦 Running migration on database:', dbPath);
  
  try {
    up(db);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}
