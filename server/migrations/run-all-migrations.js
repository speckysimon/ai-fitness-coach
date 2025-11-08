#!/usr/bin/env node
/**
 * Migration Runner - Runs all pending database migrations
 * Usage: node server/migrations/run-all-migrations.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database path
const dbPath = path.join(__dirname, '../../data/riderlabs.db');

console.log('🔄 Starting migration process...');
console.log('📁 Database:', dbPath);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  process.exit(1);
}

// Open database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Ensure migrations table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Get list of applied migrations
const appliedMigrations = db.prepare('SELECT name FROM migrations').all().map(row => row.name);
console.log(`\n📊 Applied migrations: ${appliedMigrations.length}`);

// Get all migration files
const migrationFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.cjs') && !file.includes('run-all') && !file.includes('check-migrations'))
  .sort();

console.log(`📄 Total migration files: ${migrationFiles.length}\n`);

let appliedCount = 0;
let skippedCount = 0;
let errorCount = 0;

// Run each migration
for (const file of migrationFiles) {
  const migrationName = file.replace('.cjs', '');
  
  if (appliedMigrations.includes(migrationName)) {
    console.log(`⏭️  Skipping ${migrationName} (already applied)`);
    skippedCount++;
    continue;
  }
  
  try {
    console.log(`🔄 Running ${migrationName}...`);
    
    // Load and run migration
    const migrationPath = path.join(__dirname, file);
    const migration = require(migrationPath);
    
    // Run in transaction
    const runMigration = db.transaction(() => {
      // Execute migration
      if (typeof migration.up === 'function') {
        migration.up(db);
      } else if (typeof migration === 'function') {
        migration(db);
      } else {
        throw new Error('Migration must export an up() function or be a function itself');
      }
      
      // Record migration
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migrationName);
    });
    
    runMigration();
    console.log(`✅ Applied ${migrationName}`);
    appliedCount++;
    
  } catch (error) {
    console.error(`❌ Error running ${migrationName}:`, error.message);
    errorCount++;
    
    // Stop on error
    console.error('\n⚠️  Migration failed. Stopping to prevent data corruption.');
    console.error('Please fix the error and run again.');
    process.exit(1);
  }
}

// Close database
db.close();

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Migration Summary:');
console.log(`   ✅ Applied: ${appliedCount}`);
console.log(`   ⏭️  Skipped: ${skippedCount}`);
console.log(`   ❌ Errors: ${errorCount}`);
console.log('='.repeat(50));

if (errorCount === 0) {
  console.log('\n✅ All migrations completed successfully!');
  process.exit(0);
} else {
  console.log('\n❌ Some migrations failed. Please check errors above.');
  process.exit(1);
}
