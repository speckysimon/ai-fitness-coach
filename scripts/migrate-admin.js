#!/usr/bin/env node
/**
 * Admin Database Migration Runner
 * Applies pending SQL migrations to the admin database (database.sqlite)
 */

import Database from 'better-sqlite3';
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Admin database path
const ADMIN_DB_PATH = path.join(__dirname, '../server/database.sqlite');
const MIGRATIONS_DIR = path.join(__dirname, '../migrations/admin');

console.log('🗄️  Admin Database Migration Runner');
console.log('=====================================\n');
console.log(`Database: ${ADMIN_DB_PATH}`);
console.log(`Migrations: ${MIGRATIONS_DIR}\n`);

// Connect to admin database
const db = new Database(ADMIN_DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

console.log('✅ Admin migrations table ready\n');

// Get applied migrations
const applied = db.prepare('SELECT name FROM admin_migrations ORDER BY id').all();
const appliedNames = new Set(applied.map(m => m.name));

console.log(`📋 Applied migrations: ${applied.length}`);
if (applied.length > 0) {
  applied.forEach(m => console.log(`   ✓ ${m.name}`));
  console.log();
}

// Get migration files
let files;
try {
  files = await readdir(MIGRATIONS_DIR);
} catch (error) {
  if (error.code === 'ENOENT') {
    console.log('📁 No admin migrations directory found. Creating it...');
    await import('fs/promises').then(fs => fs.mkdir(MIGRATIONS_DIR, { recursive: true }));
    console.log('✅ Admin migrations directory created\n');
    console.log('ℹ️  No migrations to apply\n');
    process.exit(0);
  }
  throw error;
}

// Filter and sort migration files
const pending = files
  .filter(f => f.endsWith('.sql') && !appliedNames.has(f))
  .sort();

if (pending.length === 0) {
  console.log('✅ No pending admin migrations\n');
  process.exit(0);
}

console.log(`📦 Pending migrations: ${pending.length}`);
pending.forEach(f => console.log(`   • ${f}`));
console.log();

// Apply pending migrations
let successCount = 0;
let errorCount = 0;

for (const file of pending) {
  try {
    console.log(`⏳ Applying: ${file}`);
    
    // Read migration file
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    
    // Apply migration in transaction
    const applyMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO admin_migrations (name) VALUES (?)').run(file);
    });
    
    applyMigration();
    
    console.log(`✅ Applied: ${file}\n`);
    successCount++;
  } catch (error) {
    console.error(`❌ Failed: ${file}`);
    console.error(`   Error: ${error.message}\n`);
    errorCount++;
    
    // Stop on first error
    console.error('🛑 Migration failed. Stopping to prevent data corruption.\n');
    process.exit(1);
  }
}

// Summary
console.log('=====================================');
console.log('📊 Admin Migration Summary');
console.log('=====================================');
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);
console.log(`📋 Total applied: ${applied.length + successCount}`);
console.log();

if (errorCount === 0) {
  console.log('✅ All admin migrations applied successfully!\n');
  process.exit(0);
} else {
  console.log('❌ Some migrations failed. Please fix and retry.\n');
  process.exit(1);
}
