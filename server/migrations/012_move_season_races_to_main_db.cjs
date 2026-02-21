/**
 * Migration: Move season_races table from admin database to main database
 * This fixes the architectural issue where user data was in the admin database
 */

const Database = require('better-sqlite3');
const path = require('path');

const adminDb = new Database(path.join(__dirname, '../fitness-coach-admin.db'));
const mainDb = new Database(path.join(__dirname, '../fitness-coach.db'));

console.log('🔄 Starting migration: Move season_races to main database...');

try {
  // 1. Create season_races table in main database
  console.log('Creating season_races table in fitness-coach.db...');
  mainDb.exec(`
    CREATE TABLE IF NOT EXISTS season_races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Provisional',
      priority TEXT DEFAULT 'B',
      location TEXT,
      distance INTEGER,
      elevation INTEGER,
      url TEXT,
      registration_deadline TEXT,
      entry_fee TEXT,
      race_type TEXT,
      is_team_race INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_season_races_user_date ON season_races(user_id, date);
  `);

  // 2. Copy data from admin database to main database
  const existingRaces = adminDb.prepare('SELECT * FROM season_races').all();
  
  if (existingRaces.length > 0) {
    console.log(`Copying ${existingRaces.length} races from admin database...`);
    
    const insert = mainDb.prepare(`
      INSERT INTO season_races (
        id, user_id, name, date, status, priority, location, distance, 
        elevation, url, registration_deadline, entry_fee, race_type, 
        is_team_race, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const race of existingRaces) {
      insert.run(
        race.id, race.user_id, race.name, race.date, race.status, race.priority,
        race.location, race.distance, race.elevation, race.url,
        race.registration_deadline, race.entry_fee, race.race_type,
        race.is_team_race, race.notes, race.created_at, race.updated_at
      );
    }
    
    console.log(`✅ Copied ${existingRaces.length} races successfully`);
  } else {
    console.log('No existing races to copy');
  }

  // 3. Drop table from admin database
  console.log('Removing season_races from admin database...');
  adminDb.exec('DROP TABLE IF EXISTS season_races');

  console.log('✅ Migration complete! season_races is now in fitness-coach.db');
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  adminDb.close();
  mainDb.close();
}
