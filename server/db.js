import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database (configurable via environment variable)
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'fitness-coach.db');
console.log(`📂 Database path: ${dbPath}`);
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Load and execute schema from file
console.log('📦 Loading database schema...');
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf8');
db.exec(schema);
console.log('✅ Database schema loaded successfully');

// ---------------------------------------------------------------------------
// Safe migrations (idempotent — silently skip if column already exists)
// ---------------------------------------------------------------------------
const safeMigrations = [
  // 2026-02-18: Intervals Strava shell classification
  `ALTER TABLE activity_sources ADD COLUMN source_kind TEXT DEFAULT NULL`,
  `ALTER TABLE activity_sources ADD COLUMN ignore_reason TEXT DEFAULT NULL`,
  `ALTER TABLE activity_sources ADD COLUMN strava_activity_id TEXT DEFAULT NULL`,
  // 2026-02-18: Stream coverage flags on activity_sources
  `ALTER TABLE activity_sources ADD COLUMN has_time_stream INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN has_power_stream INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN has_hr_stream INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN has_cadence_stream INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN has_speed_stream INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN stream_points INTEGER DEFAULT 0`,
  `ALTER TABLE activity_sources ADD COLUMN summary_only INTEGER DEFAULT 1`,
  `ALTER TABLE activity_sources ADD COLUMN streams_unavailable INTEGER DEFAULT 0`,
  // 2026-02-18: Streams backfill progress tracking on provider_sync_state
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_enabled INTEGER DEFAULT 0`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_total_candidates INTEGER DEFAULT 0`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_completed INTEGER DEFAULT 0`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_failed INTEGER DEFAULT 0`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_cursor TEXT DEFAULT NULL`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_last_run_at TEXT DEFAULT NULL`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_is_complete INTEGER DEFAULT 0`,
  `ALTER TABLE provider_sync_state ADD COLUMN streams_backfill_last_error TEXT DEFAULT NULL`,
];

for (const sql of safeMigrations) {
  try { db.exec(sql); } catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
  }
}

// Safe index creation (IF NOT EXISTS handles idempotency)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sources_strava_shells
    ON activity_sources(user_id, source_kind)
    WHERE source_kind = 'intervals_strava_shell';
`);

// Seed Strava streams config (idempotent)
db.exec(`
  INSERT OR IGNORE INTO global_settings (setting_key, setting_value, setting_type, category, description)
  VALUES
    ('strava_streams_enabled', 'false', 'boolean', 'sync', 'Enable Strava stream ingestion during sync'),
    ('strava_streams_allowlist', '', 'string', 'sync', 'Comma-separated email allowlist for Strava streams (empty = all users when enabled)');
`);

// ── Limiter Engine v1 tables (2026-02-20) ──────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS race_debrief (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id  INTEGER NOT NULL,
    activity_id TEXT    NOT NULL,
    answers_json TEXT   NOT NULL DEFAULT '{}',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(activity_id),
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS limiter_profile_current (
    athlete_id   INTEGER PRIMARY KEY,
    profile_json TEXT    NOT NULL DEFAULT '{}',
    updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS limiter_profile_snapshots (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id         INTEGER NOT NULL,
    source_activity_id TEXT    NOT NULL,
    profile_json       TEXT    NOT NULL DEFAULT '{}',
    created_at         TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(source_activity_id),
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS limiter_race_updates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    athlete_id  INTEGER NOT NULL,
    activity_id TEXT    NOT NULL,
    update_json TEXT    NOT NULL DEFAULT '{}',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(activity_id),
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_race_debrief_athlete    ON race_debrief(athlete_id);
  CREATE INDEX IF NOT EXISTS idx_limiter_snapshots_athlete ON limiter_profile_snapshots(athlete_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_limiter_race_updates_athlete ON limiter_race_updates(athlete_id, created_at DESC);
`);

// ── Training Quality v1 table (2026-02-20) ─────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS training_quality_week (
    athlete_id   INTEGER NOT NULL,
    week_start   TEXT    NOT NULL,
    score_json   TEXT    NOT NULL DEFAULT '{}',
    computed_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    algo_version TEXT    NOT NULL DEFAULT 'tq_v1',
    PRIMARY KEY (athlete_id, week_start),
    FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_tq_week_athlete ON training_quality_week(athlete_id, week_start DESC);
`);

console.log('✅ Database migrations applied');

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
  create: (email, password, name, isDemo = false) => {
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, is_demo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(email, hashedPassword, name, isDemo ? 1 : 0, now, now);
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
  },

  // Update user avatar
  updateAvatar: (userId, avatarUrl) => {
    const stmt = db.prepare(`
      UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?
    `);

    return stmt.run(avatarUrl, new Date().toISOString(), userId);
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

// Intervals.icu token operations
export const intervalsTokenDb = {
  // Save or update Intervals.icu tokens (NO refresh tokens - they don't expire!)
  upsert: ({ userId, accessToken, scopes, athleteId, athleteName }) => {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO intervals_tokens (user_id, access_token, scopes, athlete_id, athlete_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        scopes = excluded.scopes,
        athlete_id = excluded.athlete_id,
        athlete_name = excluded.athlete_name,
        updated_at = excluded.updated_at
    `);

    return stmt.run(userId, accessToken, scopes, athleteId, athleteName, now, now);
  },

  // Get Intervals.icu tokens for user
  findByUserId: (userId) => {
    const stmt = db.prepare('SELECT * FROM intervals_tokens WHERE user_id = ?');
    return stmt.get(userId);
  },

  // Delete Intervals.icu tokens
  delete: (userId) => {
    const stmt = db.prepare('DELETE FROM intervals_tokens WHERE user_id = ?');
    return stmt.run(userId);
  }
};

// Intervals.icu sync state operations
export const intervalsSyncStateDb = {
  // Update sync state
  upsert: ({ userId, lastSyncedDate, backfillComplete }) => {
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO intervals_sync_state (user_id, last_synced_date, backfill_complete, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        last_synced_date = excluded.last_synced_date,
        backfill_complete = excluded.backfill_complete,
        updated_at = excluded.updated_at
    `);

    return stmt.run(userId, lastSyncedDate, backfillComplete ? 1 : 0, now, now);
  },

  // Get sync state for user
  findByUserId: (userId) => {
    const stmt = db.prepare('SELECT * FROM intervals_sync_state WHERE user_id = ?');
    return stmt.get(userId);
  },

  // Delete sync state
  delete: (userId) => {
    const stmt = db.prepare('DELETE FROM intervals_sync_state WHERE user_id = ?');
    return stmt.run(userId);
  }
};

// Race tag operations (multi-source support: Strava, Intervals.icu, Manual)
export const raceTagDb = {
  // Set race tag for an activity
  setRaceTag: (userId, activityId, isRace, raceType = null, activitySource = 'strava') => {
    const now = new Date().toISOString();

    if (isRace) {
      const stmt = db.prepare(`
        INSERT INTO race_tags (user_id, activity_id, activity_source, is_race, race_type, created_at)
        VALUES (?, ?, ?, 1, ?, ?)
        ON CONFLICT(user_id, activity_id, activity_source) DO UPDATE SET
          is_race = 1,
          race_type = ?
      `);
      return stmt.run(userId, activityId.toString(), activitySource, raceType, now, raceType);
    } else {
      const stmt = db.prepare('DELETE FROM race_tags WHERE user_id = ? AND activity_id = ? AND activity_source = ?');
      return stmt.run(userId, activityId.toString(), activitySource);
    }
  },

  // Get all race tags for a user (with race types and sources)
  getAllForUser: (userId) => {
    const stmt = db.prepare('SELECT activity_id, activity_source, race_type FROM race_tags WHERE user_id = ? AND is_race = 1');
    const rows = stmt.all(userId);

    // Return as object with composite key (activityId_source) and race info
    const raceTags = {};
    rows.forEach(row => {
      // Use composite key for multi-source support
      const key = `${row.activity_id}_${row.activity_source}`;
      raceTags[key] = {
        isRace: true,
        raceType: row.race_type,
        source: row.activity_source
      };
      // Also add simple key for backward compatibility
      raceTags[row.activity_id] = {
        isRace: true,
        raceType: row.race_type,
        source: row.activity_source
      };
    });
    return raceTags;
  },

  // Check if activity is tagged as race
  isRace: (userId, activityId, activitySource = 'strava') => {
    const stmt = db.prepare('SELECT 1 FROM race_tags WHERE user_id = ? AND activity_id = ? AND activity_source = ? AND is_race = 1');
    return !!stmt.get(userId, activityId.toString(), activitySource);
  },

  // Get race type for an activity
  getRaceType: (userId, activityId, activitySource = 'strava') => {
    const stmt = db.prepare('SELECT race_type FROM race_tags WHERE user_id = ? AND activity_id = ? AND activity_source = ? AND is_race = 1');
    const row = stmt.get(userId, activityId.toString(), activitySource);
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

// Provider sync state operations
export const providerSyncStateDb = {
  get: (userId, provider) => {
    const stmt = db.prepare('SELECT * FROM provider_sync_state WHERE user_id = ? AND provider = ?');
    return stmt.get(userId, provider);
  },

  upsertIncremental: (userId, provider) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO provider_sync_state (user_id, provider, last_incremental_sync_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        last_incremental_sync_at = excluded.last_incremental_sync_at,
        updated_at = excluded.updated_at
    `);
    return stmt.run(userId, provider, now, now);
  },

  upsertFullSync: (userId, provider, activitiesFetched) => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO provider_sync_state (user_id, provider, last_full_sync_at, last_full_sync_activities_fetched, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        last_full_sync_at = excluded.last_full_sync_at,
        last_full_sync_activities_fetched = excluded.last_full_sync_activities_fetched,
        updated_at = excluded.updated_at
    `);
    return stmt.run(userId, provider, now, activitiesFetched, now);
  },

  // Initialize streams backfill state (called on first full sync when streams enabled)
  initStreamsBackfill: (userId, provider, totalCandidates) => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO provider_sync_state (user_id, provider, streams_backfill_enabled, streams_backfill_total_candidates, streams_backfill_completed, streams_backfill_failed, streams_backfill_cursor, streams_backfill_is_complete, streams_backfill_last_run_at, updated_at)
      VALUES (?, ?, 1, ?, 0, 0, NULL, 0, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        streams_backfill_enabled = 1,
        streams_backfill_total_candidates = excluded.streams_backfill_total_candidates,
        streams_backfill_last_run_at = excluded.streams_backfill_last_run_at,
        updated_at = excluded.updated_at
    `).run(userId, provider, totalCandidates, now, now);
  },

  // Update streams backfill progress (called every N activities)
  updateStreamsProgress: (userId, provider, { completed, failed, cursor, isComplete, lastError }) => {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO provider_sync_state (user_id, provider, streams_backfill_completed, streams_backfill_failed, streams_backfill_cursor, streams_backfill_is_complete, streams_backfill_last_run_at, streams_backfill_last_error, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        streams_backfill_completed = excluded.streams_backfill_completed,
        streams_backfill_failed = excluded.streams_backfill_failed,
        streams_backfill_cursor = excluded.streams_backfill_cursor,
        streams_backfill_is_complete = excluded.streams_backfill_is_complete,
        streams_backfill_last_run_at = excluded.streams_backfill_last_run_at,
        streams_backfill_last_error = excluded.streams_backfill_last_error,
        updated_at = excluded.updated_at
    `).run(userId, provider, completed, failed, cursor || null, isComplete ? 1 : 0, now, lastError || null, now);
  },

  // Reset streams backfill (force restart from scratch)
  resetStreamsBackfill: (userId, provider) => {
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE provider_sync_state SET
        streams_backfill_enabled = 0,
        streams_backfill_total_candidates = 0,
        streams_backfill_completed = 0,
        streams_backfill_failed = 0,
        streams_backfill_cursor = NULL,
        streams_backfill_is_complete = 0,
        streams_backfill_last_error = NULL,
        updated_at = ?
      WHERE user_id = ? AND provider = ?
    `).run(now, userId, provider);
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
