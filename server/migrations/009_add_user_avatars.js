import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'fitness-coach.db');
const db = new Database(dbPath);

console.log('Adding avatar_url column to users table...');

try {
  // Add avatar_url column to users table
  db.exec(`
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  `);
  
  console.log('✅ Avatar column added successfully');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('✅ Avatar column already exists');
  } else {
    console.error('❌ Error adding avatar column:', error);
    process.exit(1);
  }
}

// Create uploads directory if it doesn't exist
import fs from 'fs';
const uploadsDir = path.join(__dirname, '..', 'uploads', 'avatars');

try {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Uploads directory created/verified');
} catch (error) {
  console.error('❌ Error creating uploads directory:', error);
  process.exit(1);
}

db.close();
console.log('✅ Migration completed successfully');
