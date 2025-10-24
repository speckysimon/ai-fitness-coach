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

  CREATE TABLE IF NOT EXISTS race_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_id TEXT NOT NULL,
    is_race INTEGER NOT NULL DEFAULT 1,
    race_type TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, activity_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS adaptation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    category TEXT,
    notes TEXT,
    data_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plan_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    adaptation_event_id INTEGER,
    adjustment_type TEXT NOT NULL,
    changes_json TEXT NOT NULL,
    ai_reasoning TEXT,
    user_accepted INTEGER,
    applied_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (adaptation_event_id) REFERENCES adaptation_events(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS wellness_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    feeling TEXT,
    sleep_quality INTEGER,
    stress_level INTEGER,
    soreness INTEGER,
    motivation INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    planned_tss REAL,
    actual_tss REAL,
    planned_duration INTEGER,
    actual_duration INTEGER,
    planned_power REAL,
    actual_power REAL,
    deviation_severity TEXT,
    strava_activity_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_race_tags_user_id ON race_tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_adaptation_events_user_id ON adaptation_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_plan_adjustments_user_id ON plan_adjustments(user_id);
  CREATE INDEX IF NOT EXISTS idx_wellness_log_user_date ON wellness_log(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_workout_comparisons_user_date ON workout_comparisons(user_id, date);
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

// Race tag operations
export const raceTagDb = {
  // Set race tag for an activity
  setRaceTag: (userId, activityId, isRace, raceType = null) => {
    const now = new Date().toISOString();
    
    if (isRace) {
      const stmt = db.prepare(`
        INSERT INTO race_tags (user_id, activity_id, is_race, race_type, created_at)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(user_id, activity_id) DO UPDATE SET
          is_race = 1,
          race_type = ?
      `);
      return stmt.run(userId, activityId.toString(), raceType, now, raceType);
    } else {
      const stmt = db.prepare('DELETE FROM race_tags WHERE user_id = ? AND activity_id = ?');
      return stmt.run(userId, activityId.toString());
    }
  },

  // Get all race tags for a user (with race types)
  getAllForUser: (userId) => {
    const stmt = db.prepare('SELECT activity_id, race_type FROM race_tags WHERE user_id = ? AND is_race = 1');
    const rows = stmt.all(userId);
    
    // Return as object with activity_id as keys and race_type as values
    const raceTags = {};
    rows.forEach(row => {
      raceTags[row.activity_id] = {
        isRace: true,
        raceType: row.race_type
      };
    });
    return raceTags;
  },

  // Check if activity is tagged as race
  isRace: (userId, activityId) => {
    const stmt = db.prepare('SELECT 1 FROM race_tags WHERE user_id = ? AND activity_id = ? AND is_race = 1');
    return !!stmt.get(userId, activityId.toString());
  },

  // Get race type for an activity
  getRaceType: (userId, activityId) => {
    const stmt = db.prepare('SELECT race_type FROM race_tags WHERE user_id = ? AND activity_id = ? AND is_race = 1');
    const row = stmt.get(userId, activityId.toString());
    return row?.race_type || null;
  },

  // Delete all race tags for a user
  deleteAllForUser: (userId) => {
    const stmt = db.prepare('DELETE FROM race_tags WHERE user_id = ?');
    return stmt.run(userId);
  }
};

// Adaptation events operations
export const adaptationEventDb = {
  // Create new adaptation event
  create: (userId, eventData) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO adaptation_events (user_id, event_type, severity, start_date, end_date, category, notes, data_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      eventData.type,
      eventData.severity,
      eventData.startDate,
      eventData.endDate || null,
      eventData.category || null,
      eventData.notes || null,
      eventData.data ? JSON.stringify(eventData.data) : null,
      now
    );
    
    return result.lastInsertRowid;
  },

  // Get all events for user
  getAllForUser: (userId, limit = 50) => {
    const stmt = db.prepare(`
      SELECT * FROM adaptation_events 
      WHERE user_id = ? 
      ORDER BY start_date DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit);
  },

  // Get active events (no end date OR end date in future)
  getActiveForUser: (userId) => {
    const now = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      SELECT * FROM adaptation_events 
      WHERE user_id = ? 
      AND (end_date IS NULL OR end_date >= ?)
      ORDER BY start_date DESC
    `);
    return stmt.all(userId, now);
  },

  // Update event
  update: (eventId, updates) => {
    const fields = [];
    const values = [];
    
    if (updates.endDate !== undefined) {
      fields.push('end_date = ?');
      values.push(updates.endDate);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.severity !== undefined) {
      fields.push('severity = ?');
      values.push(updates.severity);
    }
    
    if (fields.length === 0) {
      console.log('No fields to update');
      return { changes: 0 };
    }
    
    values.push(eventId);
    
    const stmt = db.prepare(`
      UPDATE adaptation_events SET ${fields.join(', ')} WHERE id = ?
    `);
    
    return stmt.run(...values);
  },

  // Delete event
  delete: (eventId) => {
    const stmt = db.prepare('DELETE FROM adaptation_events WHERE id = ?');
    return stmt.run(eventId);
  }
};

// Plan adjustments operations
export const planAdjustmentDb = {
  // Create new adjustment
  create: (userId, adjustmentData) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO plan_adjustments (user_id, adaptation_event_id, adjustment_type, changes_json, ai_reasoning, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      adjustmentData.eventId || null,
      adjustmentData.type,
      JSON.stringify(adjustmentData.changes),
      adjustmentData.reasoning || null,
      now
    );
    
    return result.lastInsertRowid;
  },

  // Get all adjustments for user
  getAllForUser: (userId, limit = 50) => {
    const stmt = db.prepare(`
      SELECT pa.*, ae.event_type, ae.start_date as event_date
      FROM plan_adjustments pa
      LEFT JOIN adaptation_events ae ON pa.adaptation_event_id = ae.id
      WHERE pa.user_id = ?
      ORDER BY pa.created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(userId, limit);
    
    return rows.map(row => ({
      ...row,
      changes: JSON.parse(row.changes_json)
    }));
  },

  // Get pending adjustments (not accepted/rejected)
  getPendingForUser: (userId) => {
    const stmt = db.prepare(`
      SELECT * FROM plan_adjustments 
      WHERE user_id = ? AND user_accepted IS NULL
      ORDER BY created_at DESC
    `);
    const rows = stmt.all(userId);
    
    return rows.map(row => ({
      ...row,
      changes: JSON.parse(row.changes_json)
    }));
  },

  // Accept adjustment
  accept: (adjustmentId) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE plan_adjustments 
      SET user_accepted = 1, applied_at = ?
      WHERE id = ?
    `);
    return stmt.run(now, adjustmentId);
  },

  // Reject adjustment
  reject: (adjustmentId) => {
    const stmt = db.prepare(`
      UPDATE plan_adjustments 
      SET user_accepted = 0
      WHERE id = ?
    `);
    return stmt.run(adjustmentId);
  }
};

// Wellness log operations
export const wellnessLogDb = {
  // Create or update wellness entry
  upsert: (userId, wellnessData) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO wellness_log (user_id, date, feeling, sleep_quality, stress_level, soreness, motivation, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        feeling = excluded.feeling,
        sleep_quality = excluded.sleep_quality,
        stress_level = excluded.stress_level,
        soreness = excluded.soreness,
        motivation = excluded.motivation,
        notes = excluded.notes
    `);
    
    return stmt.run(
      userId,
      wellnessData.date,
      wellnessData.feeling || null,
      wellnessData.sleepQuality || null,
      wellnessData.stressLevel || null,
      wellnessData.soreness || null,
      wellnessData.motivation || null,
      wellnessData.notes || null,
      now
    );
  },

  // Get wellness entries for user
  getForUser: (userId, days = 30) => {
    const stmt = db.prepare(`
      SELECT * FROM wellness_log 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT ?
    `);
    return stmt.all(userId, days);
  },

  // Get wellness for specific date
  getForDate: (userId, date) => {
    const stmt = db.prepare(`
      SELECT * FROM wellness_log 
      WHERE user_id = ? AND date = ?
    `);
    return stmt.get(userId, date);
  }
};

// Workout comparisons operations
export const workoutComparisonDb = {
  // Create comparison
  create: (userId, comparisonData) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO workout_comparisons 
      (user_id, date, planned_tss, actual_tss, planned_duration, actual_duration, planned_power, actual_power, deviation_severity, strava_activity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    return stmt.run(
      userId,
      comparisonData.date,
      comparisonData.plannedTss || null,
      comparisonData.actualTss || null,
      comparisonData.plannedDuration || null,
      comparisonData.actualDuration || null,
      comparisonData.plannedPower || null,
      comparisonData.actualPower || null,
      comparisonData.deviationSeverity || null,
      comparisonData.stravaActivityId || null,
      now
    );
  },

  // Get comparisons for user
  getForUser: (userId, days = 14) => {
    const stmt = db.prepare(`
      SELECT * FROM workout_comparisons 
      WHERE user_id = ? 
      ORDER BY date DESC 
      LIMIT ?
    `);
    return stmt.all(userId, days);
  },

  // Get significant deviations
  getSignificantDeviations: (userId, days = 7) => {
    const stmt = db.prepare(`
      SELECT * FROM workout_comparisons 
      WHERE user_id = ? 
      AND deviation_severity IN ('moderate', 'severe')
      AND date >= date('now', '-' || ? || ' days')
      ORDER BY date DESC
    `);
    return stmt.all(userId, days);
  }
};

// Clean up expired sessions periodically
setInterval(() => {
  sessionDb.cleanExpired();
}, 60 * 60 * 1000); // Every hour

console.log('✅ Database initialized');

// Export getDb function for CRUD operations
export const getDb = () => db;

export default db;
