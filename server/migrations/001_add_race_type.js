/**
 * Migration: Add race_type column to race_tags table
 * Date: October 24, 2025
 * 
 * This migration adds the race_type column to support different race categories
 * (Road Race, Time Trial, Criterium, Gran Fondo, Gravel, etc.)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: Add race_type column to race_tags');
  
  try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(race_tags)").all();
    const hasRaceType = tableInfo.some(col => col.name === 'race_type');
    
    if (hasRaceType) {
      console.log('✅ race_type column already exists, skipping migration');
      return;
    }
    
    // Add race_type column
    db.prepare(`
      ALTER TABLE race_tags ADD COLUMN race_type TEXT
    `).run();
    
    console.log('✅ Successfully added race_type column to race_tags table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Rolling back migration: Remove race_type column');
  
  try {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    db.exec(`
      -- Create temporary table without race_type
      CREATE TABLE race_tags_backup (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_id TEXT NOT NULL,
        is_race INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, activity_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Copy data (excluding race_type)
      INSERT INTO race_tags_backup (id, user_id, activity_id, is_race, created_at)
      SELECT id, user_id, activity_id, is_race, created_at FROM race_tags;
      
      -- Drop original table
      DROP TABLE race_tags;
      
      -- Rename backup to original
      ALTER TABLE race_tags_backup RENAME TO race_tags;
      
      -- Recreate index
      CREATE INDEX IF NOT EXISTS idx_race_tags_user_id ON race_tags(user_id);
    `);
    
    console.log('✅ Successfully removed race_type column from race_tags table');
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
