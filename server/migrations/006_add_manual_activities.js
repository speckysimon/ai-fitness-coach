// Migration: Add manual_activities table for user-entered activities
// This allows users to log activities not tracked in Strava (gym, cross-training, etc.)

export const up = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS manual_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      
      -- Activity details
      activity_date TEXT NOT NULL,
      sport_type TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      distance REAL,
      
      -- Intensity and effort
      intensity_level TEXT NOT NULL,
      perceived_exertion INTEGER,
      avg_heart_rate INTEGER,
      
      -- Training metrics
      estimated_tss INTEGER,
      calories INTEGER,
      elevation_gain REAL,
      
      -- Additional context
      notes TEXT,
      location TEXT,
      indoor INTEGER DEFAULT 0,
      
      -- Metadata
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- Index for efficient date-based queries
    CREATE INDEX IF NOT EXISTS idx_manual_activities_user_date 
      ON manual_activities(user_id, activity_date DESC);
    
    -- Index for sport type filtering
    CREATE INDEX IF NOT EXISTS idx_manual_activities_sport 
      ON manual_activities(user_id, sport_type);
  `);
  
  console.log('✅ Created manual_activities table with indexes');
};

export const down = (db) => {
  db.exec(`
    DROP INDEX IF EXISTS idx_manual_activities_sport;
    DROP INDEX IF EXISTS idx_manual_activities_user_date;
    DROP TABLE IF EXISTS manual_activities;
  `);
  
  console.log('✅ Dropped manual_activities table and indexes');
};
