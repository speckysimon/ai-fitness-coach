/**
 * Migration Runner
 * 
 * Runs all pending database migrations in order.
 * Usage: node server/migrations/run-migrations.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'fitness-coach.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create migrations table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL
  );
`);

async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  // Get list of migration files
  const migrationFiles = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.js') && file !== 'run-migrations.js')
    .sort();
  
  if (migrationFiles.length === 0) {
    console.log('✅ No migrations found');
    return;
  }
  
  // Get already applied migrations
  const appliedMigrations = db.prepare('SELECT name FROM migrations').all();
  const appliedNames = new Set(appliedMigrations.map(m => m.name));
  
  let migrationsRun = 0;
  
  for (const file of migrationFiles) {
    const migrationName = file.replace('.js', '');
    
    if (appliedNames.has(migrationName)) {
      console.log(`⏭️  Skipping ${migrationName} (already applied)`);
      continue;
    }
    
    console.log(`▶️  Running ${migrationName}...`);
    
    try {
      // Import and run migration
      const migrationPath = path.join(__dirname, file);
      const migration = await import(`file://${migrationPath}`);
      
      // Run migration in a transaction
      const runMigration = db.transaction(() => {
        migration.up(db);
        
        // Record migration as applied
        db.prepare(`
          INSERT INTO migrations (name, applied_at)
          VALUES (?, ?)
        `).run(migrationName, new Date().toISOString());
      });
      
      runMigration();
      
      console.log(`✅ ${migrationName} completed\n`);
      migrationsRun++;
    } catch (error) {
      console.error(`❌ ${migrationName} failed:`, error.message);
      console.error('Rolling back and stopping migrations...\n');
      throw error;
    }
  }
  
  if (migrationsRun === 0) {
    console.log('✅ All migrations already applied');
  } else {
    console.log(`✅ Successfully ran ${migrationsRun} migration(s)`);
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('\n🎉 Migration process completed');
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    db.close();
    process.exit(1);
  });
