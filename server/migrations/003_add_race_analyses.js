/**
 * Migration: Add race_analyses table
 * Date: October 24, 2025
 * 
 * This migration creates the race_analyses table to store post-race analysis data
 * including feedback, AI-generated insights, scores, and recommendations.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: Create race_analyses table');
  
  try {
    // Check if table already exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='race_analyses'
    `).get();
    
    if (tableExists) {
      console.log('✅ race_analyses table already exists, skipping migration');
      return;
    }
    
    // Create race_analyses table
    db.exec(`
      CREATE TABLE race_analyses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        activity_id TEXT NOT NULL,
        
        -- Race metadata
        race_name TEXT NOT NULL,
        race_date TEXT NOT NULL,
        race_type TEXT,
        
        -- Scores (0-100)
        overall_score INTEGER,
        pacing_score INTEGER,
        execution_score INTEGER,
        tactical_score INTEGER,
        
        -- Full analysis data (JSON)
        -- Contains: feedback, insights, recommendations, training_focus, etc.
        analysis_data TEXT NOT NULL,
        
        -- Timestamps
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        -- Foreign key
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        -- Unique constraint: one analysis per activity
        UNIQUE(user_id, activity_id)
      );
      
      -- Create indexes for faster lookups
      CREATE INDEX idx_race_analyses_user_id ON race_analyses(user_id);
      CREATE INDEX idx_race_analyses_race_date ON race_analyses(race_date DESC);
      CREATE INDEX idx_race_analyses_activity_id ON race_analyses(activity_id);
    `);
    
    console.log('✅ Successfully created race_analyses table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Rolling back migration: Drop race_analyses table');
  
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_race_analyses_activity_id;
      DROP INDEX IF EXISTS idx_race_analyses_race_date;
      DROP INDEX IF EXISTS idx_race_analyses_user_id;
      DROP TABLE IF EXISTS race_analyses;
    `);
    
    console.log('✅ Successfully dropped race_analyses table');
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
