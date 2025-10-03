import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const db = new Database(path.join(__dirname, 'fitness-coach.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    height REAL,
    weight REAL,
    gender TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS strava_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    athlete_id TEXT,
    athlete_data TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS google_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Helper function to hash passwords
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to generate session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// User operations
export const userDb = {
  // Create new user
  create: (email, password, name) => {
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(email, hashedPassword, name, now, now);
    return result.lastInsertRowid;
  },

  // Find user by email
  findByEmail: (email) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  // Find user by ID
  findById: (id) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id);
  },

  // Update user profile
  updateProfile: (userId, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.age !== undefined) {
      fields.push('age = ?');
      values.push(updates.age);
    }
    if (updates.height !== undefined) {
      fields.push('height = ?');
      values.push(updates.height);
    }
    if (updates.weight !== undefined) {
      fields.push('weight = ?');
      values.push(updates.weight);
    }
    if (updates.gender !== undefined) {
      fields.push('gender = ?');
      values.push(updates.gender);
    }
    
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(userId);
    
    const stmt = db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);
    
    return stmt.run(...values);
  },

  // Verify password
  verifyPassword: (email, password) => {
    const user = userDb.findByEmail(email);
    if (!user) return null;
    
    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) return null;
    
    return user;
  }
};

// Session operations
export const sessionDb = {
  // Create new session
  create: (userId) => {
    const token = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const stmt = db.prepare(`
      INSERT INTO sessions (user_id, token, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    
    stmt.run(userId, token, now.toISOString(), expiresAt.toISOString());
    return token;
  },

  // Find session by token
  findByToken: (token) => {
    const stmt = db.prepare(`
      SELECT s.*, u.* 
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `);
    return stmt.get(token);
  },

  // Delete session
  delete: (token) => {
    const stmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    return stmt.run(token);
  },

  // Clean expired sessions
  cleanExpired: () => {
    const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
    return stmt.run();
  }
};

// Strava token operations
export const stravaTokenDb = {
  // Save or update Strava tokens
  upsert: (userId, tokens) => {
    const now = new Date().toISOString();
    const athleteData = tokens.athlete ? JSON.stringify(tokens.athlete) : null;
    
    const stmt = db.prepare(`
      INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at, athlete_id, athlete_data, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        athlete_id = excluded.athlete_id,
        athlete_data = excluded.athlete_data,
        updated_at = excluded.updated_at
    `);
    
    return stmt.run(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_at,
      tokens.athlete?.id?.toString() || null,
      athleteData,
      now
    );
  },

  // Get Strava tokens for user
  findByUserId: (userId) => {
    const stmt = db.prepare('SELECT * FROM strava_tokens WHERE user_id = ?');
    const row = stmt.get(userId);
    
    if (row && row.athlete_data) {
      row.athlete = JSON.parse(row.athlete_data);
    }
    
    return row;
  },

  // Delete Strava tokens
  delete: (userId) => {
    const stmt = db.prepare('DELETE FROM strava_tokens WHERE user_id = ?');
    return stmt.run(userId);
  }
};

// Google token operations
export const googleTokenDb = {
  // Save or update Google tokens
  upsert: (userId, tokens) => {
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO google_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
    `);
    
    return stmt.run(
      userId,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_at,
      now
    );
  },

  // Get Google tokens for user
  findByUserId: (userId) => {
    const stmt = db.prepare('SELECT * FROM google_tokens WHERE user_id = ?');
    return stmt.get(userId);
  },

  // Delete Google tokens
  delete: (userId) => {
    const stmt = db.prepare('DELETE FROM google_tokens WHERE user_id = ?');
    return stmt.run(userId);
  }
};

// Clean up expired sessions periodically
setInterval(() => {
  sessionDb.cleanExpired();
}, 60 * 60 * 1000); // Every hour

console.log('✅ Database initialized');

export default db;
