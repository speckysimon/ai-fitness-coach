import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fitness-coach.db');
const db = new Database(dbPath);

console.log('🔍 Checking Intervals.icu tokens...\n');

// Check if table exists
const tableExists = db.prepare(`
  SELECT name FROM sqlite_master 
  WHERE type='table' AND name='intervals_tokens'
`).get();

if (!tableExists) {
  console.log('❌ intervals_tokens table does not exist!');
  process.exit(1);
}

console.log('✅ intervals_tokens table exists\n');

// Get all tokens
const tokens = db.prepare('SELECT * FROM intervals_tokens').all();

console.log(`Found ${tokens.length} Intervals.icu connection(s):\n`);

tokens.forEach((token, index) => {
  console.log(`Connection ${index + 1}:`);
  console.log(`  User ID: ${token.user_id}`);
  console.log(`  Athlete ID: ${token.athlete_id || '❌ MISSING'}`);
  console.log(`  Athlete Name: ${token.athlete_name || 'N/A'}`);
  console.log(`  Access Token: ${token.access_token ? '✅ Present' : '❌ Missing'}`);
  console.log(`  Scopes: ${token.scopes || 'N/A'}`);
  console.log(`  Created: ${token.created_at}`);
  console.log(`  Updated: ${token.updated_at}`);
  console.log('');
});

// Check for missing athlete_id
const missingAthleteId = tokens.filter(t => !t.athlete_id);

if (missingAthleteId.length > 0) {
  console.log(`⚠️  ${missingAthleteId.length} connection(s) missing athlete_id`);
  console.log('');
  console.log('📋 SOLUTION:');
  console.log('1. Go to Settings in the app');
  console.log('2. Disconnect Intervals.icu');
  console.log('3. Reconnect Intervals.icu');
  console.log('4. The athlete_id will be saved during the new OAuth flow');
} else {
  console.log('✅ All connections have athlete_id');
}

db.close();
