/**
 * Migration: Add new fields to season_races table
 * - elevation (INTEGER)
 * - url (TEXT)
 * - registration_deadline (TEXT)
 * - entry_fee (TEXT)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, '../fitness-coach-admin.db'));

console.log('Starting migration: Add season_races fields...');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(season_races)").all();
  const existingColumns = tableInfo.map(col => col.name);
  
  const columnsToAdd = [
    { name: 'elevation', type: 'INTEGER' },
    { name: 'url', type: 'TEXT' },
    { name: 'registration_deadline', type: 'TEXT' },
    { name: 'entry_fee', type: 'TEXT' },
    { name: 'is_team_race', type: 'INTEGER DEFAULT 0' }
  ];
  
  let addedCount = 0;
  
  for (const column of columnsToAdd) {
    if (!existingColumns.includes(column.name)) {
      console.log(`Adding column: ${column.name} (${column.type})`);
      db.prepare(`ALTER TABLE season_races ADD COLUMN ${column.name} ${column.type}`).run();
      addedCount++;
    } else {
      console.log(`Column ${column.name} already exists, skipping`);
    }
  }
  
  console.log(`✅ Migration complete! Added ${addedCount} new columns.`);
  
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
