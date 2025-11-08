# 🚨 CRITICAL MIGRATION ISSUE - November 8, 2025

## Problem Summary
Production deployment is blocked by migration system errors. The `007_add_coach_personas` migration fails with:
```
❌ Error running 007_add_coach_personas: NOT NULL constraint failed: migrations.applied_at
```

## Current Status
- ✅ Code deployed to production (v2.9.0)
- ✅ App is running on riderlabs.io
- ✅ Frontend built successfully
- ❌ Admin tables missing (cannot login to admin panel)
- ❌ Migration system broken

## Root Cause
**Database Schema Mismatch:**
- Production database: `server/fitness-coach.db` (6 migrations applied)
- Migration runner expects: `server/database.sqlite` OR `server/fitness-coach.db`
- Migrations table schema requires `applied_at TEXT NOT NULL`
- Migration runner tries to insert with `datetime('now')` but still fails

**Migration Format Issues:**
- Old migrations use `sqlite3` library (async, callback-based)
- New migration runner uses `better-sqlite3` (sync)
- Incompatible formats causing errors

## What We Tried

### Attempt 1: Fix Database Path
- Updated migration runner to check both `database.sqlite` and `fitness-coach.db`
- Result: Found correct database but still failed

### Attempt 2: Fix Timestamp Format
- Changed from `CURRENT_TIMESTAMP` to `datetime('now')`
- Result: Still failed with NOT NULL constraint

### Attempt 3: Convert Migration Format
- Converted `007_add_coach_personas.cjs` from sqlite3 to better-sqlite3
- Removed async/Promise code
- Made it synchronous with `module.exports = { up: (db) => {...} }`
- Result: **Still fails with same error**

### Attempt 4: Clean Up Old Migrations
- Deleted 6 incompatible old migration files
- Kept only: `007_add_coach_personas.cjs`, `011_add_admin_tables.cjs`, `run-oauth-migration.cjs`
- Result: Still fails

## Current Migration Files
```
server/migrations/
├── 007_add_coach_personas.cjs (CONVERTED - still fails)
├── 011_add_admin_tables.cjs (NEW - not reached yet)
├── run-oauth-migration.cjs (OLD)
├── run-all-migrations.cjs (RUNNER)
└── check-migrations.cjs (CHECKER)
```

## Database State
**Production (`server/fitness-coach.db`):**
- 6 migrations already applied
- Missing tables: `admin_users`, `ai_model_configs`, `global_settings`, `coach_personas`, `theme_configs`
- Has table: `api_keys` (manually created)

**Migrations Table Schema:**
```sql
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL
);
```

## The Mystery
The migration runner code looks correct:
```javascript
db.prepare("INSERT INTO migrations (name, applied_at) VALUES (?, datetime('now'))").run(migrationName);
```

But it still fails with `NOT NULL constraint failed: migrations.applied_at`

**Possible causes:**
1. `datetime('now')` returns NULL in better-sqlite3 context?
2. Transaction issue preventing the insert?
3. Database file permissions?
4. SQLite version mismatch?
5. The migration itself is trying to insert into migrations table?

## Temporary Workaround Used
Manually created `api_keys` table via sqlite3 CLI:
```bash
sqlite3 ~/ai-fitness-coach/server/database.sqlite << 'EOF'
CREATE TABLE IF NOT EXISTS api_keys (...);
EOF
```

This worked, but migrations should handle this automatically.

## What Needs to Happen Next

### Option A: Debug the Migration Runner (Recommended)
1. Add verbose logging to see what's actually being inserted
2. Test `datetime('now')` in better-sqlite3 REPL
3. Check if transaction is the issue
4. Verify database file isn't corrupted

### Option B: Manual Table Creation (Quick Fix)
1. Create all missing admin tables via sqlite3 CLI
2. Manually insert migration records
3. Skip migration system for now
4. Fix migration system later

### Option C: Fresh Database Migration System
1. Create new migration system from scratch
2. Use a proven library (knex, umzug, etc.)
3. Migrate existing data
4. Start fresh with clean migrations

## Missing Tables to Create Manually

If we go with Option B, run this on production:

```sql
-- admin_users
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_super_admin INTEGER DEFAULT 0,
  last_login_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ai_model_configs
CREATE TABLE IF NOT EXISTS ai_model_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feature_name TEXT UNIQUE NOT NULL,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  api_key_name TEXT,
  system_prompt TEXT,
  temperature REAL DEFAULT 0.7,
  max_tokens INTEGER,
  parameters TEXT,
  is_active INTEGER DEFAULT 1,
  cost_per_1k_tokens REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- global_settings
CREATE TABLE IF NOT EXISTS global_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string',
  category TEXT DEFAULT 'general',
  description TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- coach_personas
CREATE TABLE IF NOT EXISTS coach_personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  style TEXT NOT NULL,
  description TEXT,
  tone TEXT NOT NULL,
  catchphrase TEXT,
  color TEXT,
  personality TEXT,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- theme_configs
CREATE TABLE IF NOT EXISTS theme_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_name TEXT UNIQUE NOT NULL,
  colors TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_ai_configs_feature ON ai_model_configs(feature_name);
CREATE INDEX IF NOT EXISTS idx_settings_key ON global_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_personas_active ON coach_personas(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_theme_active ON theme_configs(is_active);
```

## Git Commits Made
1. `b34ffa3` - Fix database path in migration scripts
2. `daab5b5` - Remove incompatible old migration files
3. `937e8b2` - Fix migration timestamp - add applied_at to INSERT
4. `8f95025` - Fix migration timestamp - use datetime('now') for SQLite
5. `c2e7b88` - Fix 007_add_coach_personas migration - convert to better-sqlite3 sync API

## Files Modified
- `server/migrations/run-all-migrations.js` - Database path detection, timestamp fix
- `server/migrations/check-migrations.js` - Database path detection
- `server/migrations/007_add_coach_personas.cjs` - Converted to better-sqlite3
- `server/migrations/011_add_admin_tables.cjs` - Created (new)
- Deleted: 6 old incompatible migration files

## Next Session Action Items
1. **PRIORITY 1**: Get admin panel working (create tables manually if needed)
2. **PRIORITY 2**: Debug why datetime('now') fails in migration runner
3. **PRIORITY 3**: Consider switching to established migration library
4. Test migration system in development before deploying
5. Document proper migration workflow

## Lessons Learned
- Don't mix sqlite3 and better-sqlite3 in same project
- Test migrations in production-like environment before deploying
- Have rollback plan for database changes
- Consider using established migration libraries (knex, umzug)
- Manual SQL execution is sometimes faster than debugging

## Contact Info
- Production URL: https://riderlabs.io
- Admin Panel: https://riderlabs.io/admin (currently broken)
- Server: riderlabs@riderlabs-prod
- Database: `/home/riderlabs/ai-fitness-coach/server/fitness-coach.db`

---

**Status**: BLOCKED - Need to resolve migration issue before admin panel is usable
**Time Spent**: ~2 hours on migration debugging
**Recommendation**: Use Option B (manual table creation) to unblock, fix migration system later
