/**
 * Migration Script: Add OAuth Fields to API Keys Table
 * Run this to add client_id and redirect_uri columns
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Running OAuth fields migration...');
console.log(`📁 Database: ${dbPath}`);

// Check if columns already exist
db.get("PRAGMA table_info(api_keys)", (err, row) => {
  if (err) {
    console.error('❌ Error checking table:', err);
    process.exit(1);
  }
});

// Add client_id column
db.run(`ALTER TABLE api_keys ADD COLUMN client_id TEXT`, (err) => {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('✅ client_id column already exists');
    } else {
      console.error('❌ Error adding client_id:', err.message);
      process.exit(1);
    }
  } else {
    console.log('✅ Added client_id column');
  }

  // Add redirect_uri column
  db.run(`ALTER TABLE api_keys ADD COLUMN redirect_uri TEXT`, (err) => {
    if (err) {
      if (err.message.includes('duplicate column name')) {
        console.log('✅ redirect_uri column already exists');
      } else {
        console.error('❌ Error adding redirect_uri:', err.message);
        db.close();
        process.exit(1);
      }
    } else {
      console.log('✅ Added redirect_uri column');
    }

    // Verify the schema
    db.all("PRAGMA table_info(api_keys)", (err, rows) => {
      if (err) {
        console.error('❌ Error verifying schema:', err);
        db.close();
        process.exit(1);
      }

      console.log('\n📋 Current api_keys schema:');
      rows.forEach(row => {
        console.log(`  - ${row.name} (${row.type})`);
      });

      console.log('\n✅ Migration complete!');
      console.log('🎉 OAuth credentials are now supported');
      console.log('\n📝 Next steps:');
      console.log('  1. Restart your server');
      console.log('  2. Go to Admin Panel → API Keys');
      console.log('  3. Add Strava/Google credentials with Client ID, Secret, and Redirect URI');
      
      db.close();
    });
  });
});
