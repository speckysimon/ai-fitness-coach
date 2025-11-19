# Database Architecture - Two Database System

## Overview

RiderLabs uses **TWO separate SQLite databases** for security and organizational purposes:

### 1. Main App Database: `fitness-coach.db`
**Technology**: better-sqlite3 (synchronous)  
**Purpose**: User data, training plans, activities, race data

**Tables**:
- `users` - User accounts
- `sessions` - User authentication sessions
- `strava_tokens` - Strava OAuth tokens
- `google_tokens` - Google Calendar OAuth tokens
- `training_plans` - AI-generated training plans
- `manual_activities` - User-logged activities
- `race_analyses` - Post-race analysis data
- `race_tags` - Race activity tags
- `user_preferences` - User settings
- `adaptation_events` - Training adaptations
- `plan_adjustments` - Plan modification history
- `wellness_log` - Daily wellness tracking
- `workout_comparisons` - Planned vs actual comparisons
- `season_races` - Season race planning

**Schema File**: `server/schema.sql`  
**Access**: `server/db.js` (ES modules)

### 2. Admin Database: `database.sqlite`
**Technology**: sqlite3 (async/callback-based)  
**Purpose**: Admin panel, API keys, configuration

**Tables**:
- `admin_users` - Admin accounts
- `admin_sessions` - Admin authentication
- `api_keys` - Encrypted API keys (OpenAI, Strava, etc.)
- `ai_configs` - AI model configurations
- `ai_prompts` - AI prompt templates
- `global_settings` - System-wide settings
- `coach_personas` - AI coach personalities
- `theme_configs` - Theme customization
- `plan_templates` - Training plan templates
- `admin_activity_log` - Admin action audit log
- `feedback` - User feedback submissions
- `token_tracking` - AI token usage tracking
- `model_pricing` - AI model pricing data
- `ideas` - Ideas and improvements tracking ⭐ NEW

**Schema**: Created via migrations in admin routes  
**Access**: `server/routes/admin.cjs` and admin services

## Why Two Databases?

### Security
- Admin credentials and API keys are isolated from user data
- Compromised user database doesn't expose admin access
- Different backup/restore strategies

### Performance
- User queries don't lock admin operations
- Admin operations don't impact user experience
- Separate WAL (Write-Ahead Logging) files

### Organization
- Clear separation of concerns
- Easier to manage permissions
- Simpler backup strategies

## Database Connections

### Main App Database
```javascript
// server/db.js (ES modules)
import Database from 'better-sqlite3';
const db = new Database('server/fitness-coach.db');

// Synchronous API
const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
```

### Admin Database
```javascript
// server/routes/admin.cjs (CommonJS)
const sqlite3 = require('sqlite3').verbose();
const adminDb = new sqlite3.Database('server/database.sqlite');

// Async/callback API
adminDb.get('SELECT * FROM admin_users WHERE id = ?', [id], (err, row) => {
  // Handle result
});
```

## Ideas Table Location

**Database**: `database.sqlite` (Admin Database)  
**Reason**: Ideas are an admin-only feature for tracking development roadmap

**Migration**: `server/admin-schema-ideas.sql`  
**Service**: `server/services/ideasService.cjs` (uses admin database)  
**Routes**: `server/routes/ideas.cjs` (admin authentication required)

## Production Deployment

Both databases are backed up and deployed together:

```bash
# Backup both databases
cp server/fitness-coach.db backups/fitness-coach_$(date +%Y%m%d_%H%M%S).db
cp server/database.sqlite backups/database_$(date +%Y%m%d_%H%M%S).sqlite

# Include WAL files for atomic backups
cp server/fitness-coach.db-wal backups/ 2>/dev/null || true
cp server/database.sqlite-wal backups/ 2>/dev/null || true
```

## Common Pitfalls

### ❌ Wrong Database
```javascript
// DON'T: Use main app db for admin features
const db = require('../db'); // This is fitness-coach.db!
```

### ✅ Correct Database
```javascript
// DO: Use admin db for admin features
const sqlite3 = require('sqlite3').verbose();
const adminDb = new sqlite3.Database('server/database.sqlite');
```

### ❌ Wrong API
```javascript
// DON'T: Use better-sqlite3 API on sqlite3 database
const stmt = adminDb.prepare('SELECT * FROM ideas'); // Error!
```

### ✅ Correct API
```javascript
// DO: Use sqlite3 callback API
adminDb.all('SELECT * FROM ideas', [], (err, rows) => {
  // Handle results
});
```

## Migration Guide

### Adding Table to Main App Database
1. Add SQL to `server/schema.sql`
2. Schema is auto-loaded on server start
3. Use `server/db.js` for access

### Adding Table to Admin Database
1. Create migration SQL file (e.g., `admin-schema-ideas.sql`)
2. Run: `sqlite3 server/database.sqlite < migration.sql`
3. Use `sqlite3` module for access (callback API)
4. Document in admin routes

## Verification

### Check Main App Database
```bash
sqlite3 server/fitness-coach.db ".tables"
# Should show: users, training_plans, activities, etc.
```

### Check Admin Database
```bash
sqlite3 server/database.sqlite ".tables"
# Should show: admin_users, api_keys, ideas, etc.
```

### Verify Ideas Table
```bash
sqlite3 server/database.sqlite "SELECT COUNT(*) FROM ideas;"
# Should show: 17 (after seeding)
```

## Summary

- **Main App**: `fitness-coach.db` (better-sqlite3, user data)
- **Admin Panel**: `database.sqlite` (sqlite3, admin data)
- **Ideas Table**: In admin database (admin-only feature)
- **Both databases**: Backed up together, deployed together
- **Different APIs**: better-sqlite3 (sync) vs sqlite3 (async)

This architecture provides security, performance, and clear separation of concerns.
