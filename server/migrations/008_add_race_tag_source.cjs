/**
 * Migration 008: Add Multi-Source Support to Race Tags
 * 
 * Adds activity_source column to race_tags table to support tagging
 * activities from Strava, Intervals.icu, or manual sources.
 * 
 * Changes:
 * - Add activity_source column (defaults to 'strava' for existing tags)
 * - Update unique constraint to include source
 * - Add index for source queries
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database path (same as main app)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../fitness-coach.db');

console.log('🔄 Running Migration 008: Add Race Tag Source Support');
console.log(`📂 Database: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Start transaction
  db.exec('BEGIN TRANSACTION');
  
  console.log('📝 Step 1: Adding activity_source column...');
  
  // Add activity_source column (defaults to 'strava' for existing tags)
  db.exec(`
    ALTER TABLE race_tags 
    ADD COLUMN activity_source TEXT DEFAULT 'strava'
  `);
  
  console.log('✅ activity_source column added');
  
  console.log('📝 Step 2: Updating unique constraint...');
  
  // SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table
  // First, create a new table with the updated schema
  db.exec(`
    CREATE TABLE race_tags_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_id TEXT NOT NULL,
      activity_source TEXT NOT NULL DEFAULT 'strava',
      is_race INTEGER NOT NULL DEFAULT 1,
      race_type TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, activity_id, activity_source),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  
  console.log('✅ New table created with updated constraint');
  
  console.log('📝 Step 3: Copying existing data...');
  
  // Copy data from old table to new table
  db.exec(`
    INSERT INTO race_tags_new (id, user_id, activity_id, activity_source, is_race, race_type, created_at)
    SELECT id, user_id, activity_id, 'strava', is_race, race_type, created_at
    FROM race_tags
  `);
  
  console.log('✅ Data copied to new table');
  
  console.log('📝 Step 4: Replacing old table...');
  
  // Drop old table and rename new table
  db.exec('DROP TABLE race_tags');
  db.exec('ALTER TABLE race_tags_new RENAME TO race_tags');
  
  console.log('✅ Table replaced');
  
  console.log('📝 Step 5: Recreating indexes...');
  
  // Recreate indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_race_tags_user_id ON race_tags(user_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_race_tags_source ON race_tags(activity_source)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_race_tags_user_source ON race_tags(user_id, activity_source)');
  
  console.log('✅ Indexes created');
  
  // Commit transaction
  db.exec('COMMIT');
  
  // Verify migration
  console.log('📝 Verifying migration...');
  const tableInfo = db.prepare("PRAGMA table_info(race_tags)").all();
  const hasSourceColumn = tableInfo.some(col => col.name === 'activity_source');
  
  if (hasSourceColumn) {
    console.log('✅ Migration verified: activity_source column exists');
    
    // Show sample data
    const sampleTags = db.prepare('SELECT * FROM race_tags LIMIT 3').all();
    if (sampleTags.length > 0) {
      console.log('📊 Sample race tags:');
      sampleTags.forEach(tag => {
        console.log(`   - User ${tag.user_id}, Activity ${tag.activity_id}, Source: ${tag.activity_source}`);
      });
    } else {
      console.log('ℹ️  No existing race tags to display');
    }
  } else {
    throw new Error('Migration verification failed: activity_source column not found');
  }
  
  db.close();
  
  console.log('');
  console.log('✅ Migration 008 completed successfully!');
  console.log('');
  console.log('📋 Summary:');
  console.log('   - Added activity_source column to race_tags');
  console.log('   - Updated unique constraint: (user_id, activity_id, activity_source)');
  console.log('   - Created indexes for efficient source queries');
  console.log('   - All existing tags defaulted to "strava" source');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('❌ Migration 008 failed!');
  console.error('Error:', error.message);
  console.error('');
  console.error('The database has been rolled back to its previous state.');
  console.error('');
  process.exit(1);
}
