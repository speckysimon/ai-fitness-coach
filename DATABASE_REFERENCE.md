# Database & Routing Reference Guide

**Version**: 2.9.0  
**Last Updated**: November 8, 2025  
**Purpose**: Quick reference to avoid database confusion during deployments

---

## 🗄️ Database Files

### Local Development
```
/Users/simonosx/CascadeProjects/ai-fitness-coach/server/fitness-coach.db
```

### Production
```
/home/riderlabs/ai-fitness-coach/server/fitness-coach.db
```

### ⚠️ IMPORTANT: Single Database System
- **Only ONE database file**: `fitness-coach.db`
- **Old file (DELETED)**: `database.sqlite` - No longer used!
- All services must point to `fitness-coach.db`

---

## 📊 Database Tables (19 Total)

### Core User Tables (3)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | User accounts | id, email, password, name, age, height, weight, gender |
| `sessions` | Auth sessions | id, user_id, token, expires_at |
| `user_preferences` | User settings | id, user_id, ftp, timezone, theme |

### OAuth & Integrations (2)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `strava_tokens` | Strava OAuth | id, user_id, access_token, refresh_token, expires_at |
| `google_tokens` | Google OAuth | id, user_id, access_token, refresh_token, expires_at |

### Training & Activities (3)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `training_plans` | AI training plans | id, user_id, event_type, duration_weeks, plan_data |
| `manual_activities` | User-logged activities | id, user_id, activity_date, sport_type, duration, tss |
| `workout_comparisons` | Planned vs actual | id, user_id, date, planned_tss, actual_tss |

### Race Management (2)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `race_tags` | Mark races | id, user_id, activity_id, race_type |
| `race_analyses` | Post-race analysis | id, user_id, activity_id, overall_score, analysis_data |

### Adaptation & Wellness (3)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `adaptation_events` | Illness/injury tracking | id, user_id, event_type, severity, start_date, end_date |
| `plan_adjustments` | AI plan modifications | id, user_id, adjustment_type, changes_json, ai_reasoning |
| `wellness_log` | Daily wellness | id, user_id, date, sleep_quality, stress_level, soreness |

### Admin Tables (6)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `admin_users` | Admin accounts | id, email, password_hash, name, is_super_admin |
| `admin_activity_log` | Admin audit trail | id, admin_id, action, resource_type, details |
| `ai_model_configs` | AI model settings | id, feature_name, model_provider, model_name, temperature |
| `api_keys` | Encrypted API keys | id, provider, api_key, client_id, client_secret |
| `global_settings` | App-wide config | id, setting_key, setting_value, category |
| `theme_configs` | UI themes | id, theme_name, colors, is_active |
| `coach_personas` | AI coach personalities | id, name, style, tone, avatar_url, personality |

### Feedback (1)
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `feedback` | User feedback | id, rating, category, message, status |

---

## 🔌 Database Connections by Service

### Main App (ES6 Modules)
**File**: `server/db.js`  
**Database**: `fitness-coach.db`  
**Library**: `better-sqlite3` (synchronous)  
**Used by**: All main app routes

```javascript
import Database from 'better-sqlite3';
const db = new Database(path.join(__dirname, 'fitness-coach.db'));
```

### Admin Services (CommonJS)
**File**: `server/services/adminService.cjs`  
**Database**: `fitness-coach.db` ✅ (FIXED!)  
**Library**: `sqlite3` (async with callbacks)  
**Used by**: Admin authentication, user management

```javascript
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '../fitness-coach.db');
const db = new sqlite3.Database(dbPath);
```

### ⚠️ Critical: Both Must Use Same Database!
- Main app: `fitness-coach.db`
- Admin service: `fitness-coach.db`
- **Never** use `database.sqlite`

---

## 🛣️ API Routes

### Public Routes
```
POST   /api/auth/register          - User registration
POST   /api/auth/login             - User login
GET    /api/auth/check             - Check session
POST   /api/auth/logout            - Logout
```

### User Routes (Require Auth)
```
GET    /api/user/profile           - Get user profile
PUT    /api/user/profile           - Update profile
GET    /api/user/preferences       - Get preferences
PUT    /api/user/preferences       - Update preferences
```

### Strava Routes
```
GET    /api/strava/auth            - OAuth redirect
GET    /api/strava/callback        - OAuth callback
GET    /api/strava/activities      - Fetch activities
POST   /api/strava/refresh         - Refresh token
```

### Google Routes
```
GET    /api/google/auth            - OAuth redirect
GET    /api/google/callback        - OAuth callback
GET    /api/google/events          - Fetch calendar
```

### Training Plan Routes
```
POST   /api/training-plan/generate - Generate plan (AI)
GET    /api/training-plan          - Get current plan
PUT    /api/training-plan          - Update plan
DELETE /api/training-plan          - Delete plan
POST   /api/training-plan/adjust   - AI adjustments
```

### Race Routes
```
POST   /api/race/tag               - Tag as race
GET    /api/race/tags              - Get race tags
POST   /api/race/analyze           - Post-race analysis
GET    /api/race/analyses          - Get analyses
```

### Admin Routes (Require Admin Auth)
```
POST   /api/admin/login            - Admin login
GET    /api/admin/dashboard        - Dashboard stats
GET    /api/admin/users            - List users
GET    /api/admin/admins           - List admins
POST   /api/admin/admins           - Create admin
DELETE /api/admin/admins/:id       - Delete admin
GET    /api/admin/ai-configs       - AI model configs
PUT    /api/admin/ai-configs/:name - Update AI config
GET    /api/admin/api-keys         - List API keys
POST   /api/admin/api-keys         - Create API key
PUT    /api/admin/api-keys/:id     - Update API key
GET    /api/admin/settings         - Global settings
PUT    /api/admin/settings/:key    - Update setting
GET    /api/admin/activity-log     - Admin activity log
GET    /api/admin/theme-configs    - Theme configs
POST   /api/admin/theme-configs    - Create theme
GET    /api/personas/admin/all     - Coach personas
POST   /api/personas/admin/create  - Create persona
PUT    /api/personas/admin/update/:id - Update persona
DELETE /api/personas/admin/delete/:id - Delete persona
```

---

## 📝 Schema Management (Schema-First Approach)

### Schema File
```
server/schema.sql
```

### How It Works
1. **Single source of truth**: All table definitions in `schema.sql`
2. **Auto-applied on startup**: `db.js` loads and executes schema
3. **Safe operations**: Uses `CREATE TABLE IF NOT EXISTS`
4. **Preserves data**: Never deletes existing tables or data

### Making Schema Changes

#### Adding a New Table
```sql
-- 1. Edit server/schema.sql
CREATE TABLE IF NOT EXISTS new_feature (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2. Add index
CREATE INDEX IF NOT EXISTS idx_new_feature_user_id ON new_feature(user_id);
```

#### Adding a Column (Requires Migration Script)
```javascript
// server/migrations/add_column.js (one-time script)
import db from './db.js';

// Check if column exists first
const tableInfo = db.pragma('table_info(users)');
const hasColumn = tableInfo.some(col => col.name === 'new_column');

if (!hasColumn) {
  db.exec(`ALTER TABLE users ADD COLUMN new_column TEXT DEFAULT NULL`);
  console.log('✅ Column added');
}
```

---

## 🚀 Deployment Workflow

### Local to Production (Code Changes)
```bash
# 1. Local: Commit changes
git add .
git commit -m "feat: Add new feature"
git push origin main

# 2. Production: Pull and restart
ssh riderlabs@riderlabs.io
cd ~/ai-fitness-coach
git pull origin main
pm2 restart riderlabs
```

### Schema Changes (New Tables)
```bash
# 1. Local: Update schema.sql
# 2. Local: Test by restarting server
npm run dev

# 3. Local: Commit
git add server/schema.sql
git commit -m "feat: Add new_table to schema"
git push origin main

# 4. Production: Deploy
ssh riderlabs@riderlabs.io
cd ~/ai-fitness-coach
git pull origin main
pm2 restart riderlabs  # Schema auto-applies on startup
```

### Data Changes (Existing Tables)
```bash
# 1. Create migration script (one-time)
# 2. Test locally
# 3. Run on production manually
ssh riderlabs@riderlabs.io
cd ~/ai-fitness-coach
node server/migrations/your_migration.js

# 4. Update schema.sql to reflect change
# 5. Deploy schema update
```

---

## ⚠️ Common Pitfalls & Solutions

### Problem 1: "No such table" Error
**Cause**: Schema not applied to database  
**Solution**:
```bash
# Restart server to auto-apply schema
pm2 restart riderlabs

# Or manually apply
sqlite3 server/fitness-coach.db < server/schema.sql
```

### Problem 2: Service Using Wrong Database
**Check**: All services point to `fitness-coach.db`  
**Fix**: Update database path in service file
```javascript
// ❌ WRONG
const dbPath = path.join(__dirname, '../database.sqlite');

// ✅ CORRECT
const dbPath = path.join(__dirname, '../fitness-coach.db');
```

### Problem 3: Lost Production Data
**Cause**: Copied local DB to production  
**Prevention**: NEVER do this:
```bash
# ❌ NEVER RUN THIS
scp server/fitness-coach.db riderlabs@riderlabs.io:~/ai-fitness-coach/server/
```

### Problem 4: Admin Login 401 Error
**Check**:
1. Admin users exist in database
2. Admin service uses correct database
3. `admin_activity_log` table exists

**Verify**:
```bash
sqlite3 server/fitness-coach.db "SELECT * FROM admin_users;"
sqlite3 server/fitness-coach.db ".tables" | grep admin
```

---

## 🔍 Quick Verification Commands

### Check All Tables
```bash
sqlite3 server/fitness-coach.db ".tables"
```

### Count Records
```bash
sqlite3 server/fitness-coach.db "
SELECT 
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM training_plans) as plans,
  (SELECT COUNT(*) FROM admin_users) as admins;
"
```

### Check Database File
```bash
# Local
ls -lh /Users/simonosx/CascadeProjects/ai-fitness-coach/server/fitness-coach.db

# Production
ssh riderlabs@riderlabs.io "ls -lh ~/ai-fitness-coach/server/fitness-coach.db"
```

### Verify Schema Version
```bash
sqlite3 server/fitness-coach.db "
SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';
"
# Should return: 21 (19 app tables + 2 SQLite internal)
```

---

## 📋 Pre-Deployment Checklist

Before deploying database changes:

- [ ] Schema changes in `server/schema.sql`
- [ ] Tested locally (delete DB, restart, verify)
- [ ] All services use `fitness-coach.db`
- [ ] No hardcoded database paths
- [ ] Migration script created (if needed)
- [ ] Backup production database
- [ ] Documented in CHANGELOG.md

---

## 🆘 Emergency Rollback

If deployment fails:

```bash
# 1. Restore database backup
cp server/fitness-coach.db.backup-YYYYMMDD-HHMMSS server/fitness-coach.db

# 2. Revert code
git revert HEAD
git push origin main

# 3. Pull on production
cd ~/ai-fitness-coach
git pull origin main
pm2 restart riderlabs
```

---

## 📞 Support

**Issues?** Check:
1. This document first
2. `DEPLOYMENT_GUIDE.md` for detailed procedures
3. `DATABASE_OVERHAUL_SUMMARY.md` for architecture overview
4. PM2 logs: `pm2 logs riderlabs --lines 100`

**Database corruption?**
```bash
# Check integrity
sqlite3 server/fitness-coach.db "PRAGMA integrity_check;"

# Vacuum (optimize)
sqlite3 server/fitness-coach.db "VACUUM;"
```

---

**Remember**: Schema-first approach = Fast, reliable, zero-downtime deployments! 🚀
