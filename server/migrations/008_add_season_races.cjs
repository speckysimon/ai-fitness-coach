const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(dbPath);

console.log('Running migration: 008_add_season_races');

try {
  // Create season_races table
  db.exec(`
    CREATE TABLE IF NOT EXISTS season_races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT,
      distance REAL,
      race_type TEXT DEFAULT 'road_race',
      status TEXT DEFAULT 'provisional',
      priority TEXT DEFAULT 'B',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_season_races_user_id ON season_races(user_id);
    CREATE INDEX IF NOT EXISTS idx_season_races_date ON season_races(date);
    CREATE INDEX IF NOT EXISTS idx_season_races_status ON season_races(status);
  `);

  console.log('✅ Migration 008_add_season_races completed successfully');
  console.log('   - Created season_races table');
  console.log('   - Created indexes on user_id, date, and status');
} catch (error) {
  console.error('❌ Migration 008_add_season_races failed:', error.message);
  throw error;
} finally {
  db.close();
}
