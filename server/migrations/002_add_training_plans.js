/**
 * Migration: Add training_plans table
 * Date: October 24, 2025
 * 
 * This migration creates the training_plans table to store user training plans
 * with all plan data, metadata, and completion tracking.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function up(db) {
  console.log('Running migration: Create training_plans table');
  
  try {
    // Check if table already exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='training_plans'
    `).get();
    
    if (tableExists) {
      console.log('✅ training_plans table already exists, skipping migration');
      return;
    }
    
    // Create training_plans table
    db.exec(`
      CREATE TABLE training_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        
        -- Plan metadata
        event_type TEXT NOT NULL,
        duration_weeks INTEGER NOT NULL,
        days_per_week INTEGER NOT NULL,
        max_hours_per_week REAL,
        goals TEXT,
        
        -- Full plan data (JSON)
        plan_data TEXT NOT NULL,
        
        -- Timestamps
        generated_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        
        -- Foreign key
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      
      -- Create index for faster lookups
      CREATE INDEX idx_training_plans_user_id ON training_plans(user_id);
      CREATE INDEX idx_training_plans_created_at ON training_plans(created_at DESC);
    `);
    
    console.log('✅ Successfully created training_plans table');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

export function down(db) {
  console.log('Rolling back migration: Drop training_plans table');
  
  try {
    db.exec(`
      DROP INDEX IF EXISTS idx_training_plans_created_at;
      DROP INDEX IF EXISTS idx_training_plans_user_id;
      DROP TABLE IF EXISTS training_plans;
    `);
    
    console.log('✅ Successfully dropped training_plans table');
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
