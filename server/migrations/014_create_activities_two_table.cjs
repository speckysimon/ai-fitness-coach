/**
 * Migration: Create two-table activity model
 * Date: January 27, 2026
 * 
 * Table 1: activities - One row per real ride (what UI and metrics use)
 * Table 2: activity_sources - Provider records (audit trail, re-import safe)
 * 
 * This is the correct architecture for a training app:
 * - CTL/ATL/TSS operate on activities (never double-counted)
 * - Provider rows are invisible to metrics
 * - UI queries activities only (no dedupe hacks)
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../fitness-coach.db');

function migrate() {
  const db = new Database(dbPath);
  
  try {
    console.log('🔧 Starting two-table activity model migration...');
    
    // =========================================
    // Table 1: activities (one row per real ride)
    // =========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,              -- Internal UUID
        user_id INTEGER NOT NULL,
        
        -- Identity
        name TEXT,                        -- Display name (best source wins)
        sport TEXT NOT NULL,              -- 'cycling', 'running', 'swimming'
        type TEXT,                        -- 'Ride', 'VirtualRide', 'Run', etc.
        
        -- Time
        start_time TEXT NOT NULL,         -- UTC ISO 8601
        timezone_offset_min INTEGER,
        
        -- Core metrics
        duration_s INTEGER,
        distance_m REAL,
        elevation_m REAL,
        
        -- Power metrics (Intervals > Strava priority)
        avg_power REAL,
        max_power REAL,
        normalized_power REAL,
        tss REAL,
        
        -- HR metrics
        avg_hr REAL,
        max_hr REAL,
        
        -- Other
        avg_cadence REAL,
        has_power INTEGER DEFAULT 0,
        
        -- Matching metadata
        match_method TEXT,                -- 'exact_id', 'fuzzy_time', 'manual'
        primary_source TEXT,              -- 'strava', 'intervals', 'manual'
        
        -- Timestamps
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
    console.log('✅ activities table created');
    
    // Primary index: user + time (most common query)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_user_time 
      ON activities(user_id, start_time DESC);
    `);
    console.log('✅ Index idx_activities_user_time created');
    
    // Sport filter index
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activities_user_sport 
      ON activities(user_id, sport);
    `);
    console.log('✅ Index idx_activities_user_sport created');
    
    // =========================================
    // Table 2: activity_sources (provider records)
    // =========================================
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_sources (
        id TEXT PRIMARY KEY,              -- 'strava:12345' or 'intervals:abc123'
        activity_id TEXT NOT NULL,        -- FK to activities.id
        
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,           -- 'strava', 'intervals', 'manual'
        provider_id TEXT NOT NULL,        -- Original ID from provider
        
        -- Provider's raw data
        name TEXT,
        type TEXT,
        
        raw_duration_s INTEGER,
        raw_distance_m REAL,
        raw_elevation_m REAL,
        
        raw_avg_power REAL,
        raw_max_power REAL,
        raw_np REAL,
        raw_tss REAL,
        
        raw_avg_hr REAL,
        raw_max_hr REAL,
        raw_avg_cadence REAL,
        
        raw_json TEXT,                    -- Full provider response (optional, for debugging)
        
        -- Timestamps
        imported_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        
        -- Constraints
        UNIQUE(user_id, provider, provider_id),
        FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ activity_sources table created');
    
    // Index for finding sources by activity
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sources_activity 
      ON activity_sources(activity_id);
    `);
    console.log('✅ Index idx_sources_activity created');
    
    // Index for provider lookups (re-import detection)
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sources_provider 
      ON activity_sources(user_id, provider, provider_id);
    `);
    console.log('✅ Index idx_sources_provider created');
    
    // Index for user's sources
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sources_user 
      ON activity_sources(user_id);
    `);
    console.log('✅ Index idx_sources_user created');
    
    console.log('✅ Two-table activity model migration complete');
    
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
