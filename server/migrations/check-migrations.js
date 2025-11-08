#!/usr/bin/env node
/**
 * Migration Checker - Shows status of all migrations
 * Usage: node server/migrations/check-migrations.js
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database path
const dbPath = path.join(__dirname, '../fitness-coach.db');

console.log('🔍 Checking migration status...');
console.log('📁 Database:', dbPath);

// Check if database exists
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  process.exit(1);
}

// Open database
const db = new Database(dbPath);

// Check if migrations table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='migrations'
`).get();

if (!tableExists) {
  console.log('\n⚠️  Migrations table does not exist yet.');
  console.log('This is normal for a fresh database.');
  console.log('Run: node server/migrations/run-all-migrations.js');
  db.close();
  process.exit(0);
}

// Get applied migrations
const appliedMigrations = db.prepare(`
  SELECT name, applied_at 
  FROM migrations 
  ORDER BY applied_at DESC
`).all();

// Get all migration files
const migrationFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.cjs') && !file.includes('run-all') && !file.includes('check-migrations'))
  .sort();

// Calculate pending migrations
const appliedNames = appliedMigrations.map(m => m.name);
const pendingMigrations = migrationFiles
  .map(f => f.replace('.cjs', ''))
  .filter(name => !appliedNames.includes(name));

// Display results
console.log('\n' + '='.repeat(70));
console.log('📊 Migration Status Report');
console.log('='.repeat(70));

console.log(`\n✅ Applied Migrations: ${appliedMigrations.length}`);
if (appliedMigrations.length > 0) {
  appliedMigrations.forEach((m, i) => {
    const date = new Date(m.applied_at).toLocaleString();
    console.log(`   ${i + 1}. ${m.name}`);
    console.log(`      Applied: ${date}`);
  });
}

console.log(`\n⏳ Pending Migrations: ${pendingMigrations.length}`);
if (pendingMigrations.length > 0) {
  pendingMigrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m}`);
  });
  console.log('\n⚠️  You have pending migrations!');
  console.log('Run: node server/migrations/run-all-migrations.js');
} else {
  console.log('   None - all migrations are up to date! ✅');
}

console.log('\n' + '='.repeat(70));

// Check for important tables
console.log('\n🔍 Database Tables Check:');
const tables = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`).all();

const importantTables = [
  'users',
  'admin_users',
  'coach_personas',
  'training_plans',
  'token_usage_logs',
  'ai_model_pricing',
  'theme_configs',
  'api_keys'
];

importantTables.forEach(tableName => {
  const exists = tables.some(t => t.name === tableName);
  const status = exists ? '✅' : '❌';
  console.log(`   ${status} ${tableName}`);
});

console.log(`\n📊 Total tables: ${tables.length}`);

db.close();

// Exit with appropriate code
if (pendingMigrations.length > 0) {
  console.log('\n⚠️  Action required: Run pending migrations');
  process.exit(1);
} else {
  console.log('\n✅ Database is up to date!');
  process.exit(0);
}
