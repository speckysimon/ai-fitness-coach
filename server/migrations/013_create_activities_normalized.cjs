/**
 * Migration: Create activities_normalized table
 * Date: January 27, 2026
 * 
 * This migration creates the activities_normalized table for unified activity storage.
 * All activities from Strava, Intervals.icu, and Manual sources are stored here.
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../fitness-coach.db');

function migrate() {
  const db = new Database(dbPath);
  
  try {
    console.log('🔧 Starting activities_normalized table migration...');
    
    // Create activities_normalized table
    db.exec(`
      CREATE TABLE IF NOT EXISTS activities_normalized (
        id TEXT PRIMARY KEY,                    -- 'strava:12345' or 'intervals:abc123' or 'manual:99'
        user_id INTEGER NOT NULL,               -- Numeric user ID from auth
        provider TEXT NOT NULL,                 -- 'strava', 'intervals', 'manual'
        provider_id TEXT NOT NULL,              -- Original ID from provider
        name TEXT,
        type TEXT,                              -- 'Ride', 'Run', 'VirtualRide', etc.
        sport TEXT,                             -- Normalized: 'cycling', 'running', 'swimming', etc.
        start_time TEXT NOT NULL,               -- ISO 8601 UTC
        timezone_offset_min INTEGER,            -- Offset from UTC in minutes (optional)
        duration_s INTEGER,                     -- Duration in seconds
        distance_m REAL,                        -- Distance in meters
        elevation_m REAL,                       -- Elevation gain in meters
        avg_power REAL,
        max_power REAL,
        normalized_power REAL,
        avg_hr REAL,
        max_hr REAL,
        avg_cadence REAL,
        tss REAL,                               -- Training Stress Score
        has_power INTEGER DEFAULT 0,            -- Boolean: 1 if has power data
        imported_at TEXT NOT NULL,              -- When this record was created
        updated_at TEXT NOT NULL,               -- When this record was last updated
        
        UNIQUE(user_id, provider, provider_id)
      );
    `);
    
    console.log('✅ activities_normalized table created');
    
    // Create indexes for common queries
    // Primary query: WHERE user_id = ? AND start_time >= ? ORDER BY start_time DESC
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_user_time 
      ON activities_normalized(user_id, start_time DESC);
    `);
    console.log('✅ Index idx_activities_user_time created');
    
    // Provider filtering: WHERE user_id = ? AND provider IN (...)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_user_provider 
      ON activities_normalized(user_id, provider);
    `);
    console.log('✅ Index idx_activities_user_provider created');
    
    // Sport filtering (for future use)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_user_sport 
      ON activities_normalized(user_id, sport);
    `);
    console.log('✅ Index idx_activities_user_sport created');
    
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
