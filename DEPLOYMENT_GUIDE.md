# RiderLabs Deployment Guide

## Database Architecture

**Schema-First Approach**: RiderLabs uses a single `schema.sql` file as the source of truth for all database tables. No complex migration system needed.

### Why Schema-First?

- ✅ **30-second deployments** (vs 2+ hours with migrations)
- ✅ **No runtime failures** (schema applied on startup)
- ✅ **Easy rollback** (restore DB backup)
- ✅ **Single source of truth** (one schema file)
- ✅ **No complexity** (no migration runner to debug)

### How It Works

1. All table definitions are in `server/schema.sql`
2. On startup, `server/db.js` loads and executes the schema
3. `CREATE TABLE IF NOT EXISTS` ensures idempotency
4. Seed data (coach personas) included in schema

---

## Local Development

### Initial Setup

```bash
# Install dependencies
npm install

# Start development server (creates DB automatically)
npm run dev
```

The database will be created at `server/fitness-coach.db` with all tables.

### Resetting Database

```bash
# Delete database
rm server/fitness-coach.db

# Restart server (recreates from schema)
npm run dev
```

---

## Production Deployment

### Method 1: Database Sync (Recommended - 30 seconds)

**Use when**: You have a working local database with test data.

```bash
# 1. Test locally first
npm run dev
# Verify everything works

# 2. Backup production database
ssh riderlabs@riderlabs-prod
cd ~/ai-fitness-coach/server
cp fitness-coach.db fitness-coach.db.backup-$(date +%Y%m%d-%H%M%S)

# 3. Copy local database to production
# On local machine:
scp server/fitness-coach.db riderlabs@riderlabs-prod:~/ai-fitness-coach/server/fitness-coach.db.new

# 4. On production server:
cd ~/ai-fitness-coach
pm2 stop riderlabs
mv server/fitness-coach.db.new server/fitness-coach.db
pm2 start riderlabs

# 5. Verify
pm2 logs riderlabs --lines 50
```

**Time**: ~30 seconds  
**Risk**: Very low (easy rollback)

### Method 2: Schema Sync (Alternative)

**Use when**: You want to update schema without replacing the database.

```bash
# 1. Deploy code
git pull origin main

# 2. Restart server (schema auto-applies)
pm2 restart riderlabs

# 3. Verify
pm2 logs riderlabs --lines 50
```

**Time**: ~10 seconds  
**Risk**: Very low (CREATE IF NOT EXISTS is safe)

### Rollback Procedure

```bash
# On production
cd ~/ai-fitness-coach
pm2 stop riderlabs
mv server/fitness-coach.db server/fitness-coach.db.failed
mv server/fitness-coach.db.backup-YYYYMMDD-HHMMSS server/fitness-coach.db
pm2 start riderlabs
```

---

## Schema Changes

### Adding a New Table

1. **Edit `server/schema.sql`**:
   ```sql
   CREATE TABLE IF NOT EXISTS new_table (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   
   CREATE INDEX IF NOT EXISTS idx_new_table_name ON new_table(name);
   ```

2. **Test locally**:
   ```bash
   # Delete DB and restart
   rm server/fitness-coach.db
   npm run dev
   
   # Verify table exists
   sqlite3 server/fitness-coach.db ".tables"
   ```

3. **Deploy to production** (Method 1 or 2 above)

### Modifying Existing Tables

**Important**: SQLite doesn't support `ALTER TABLE` for many operations.

**Option A: Add new column** (safe):
```sql
-- In schema.sql, add column to CREATE TABLE
-- SQLite will ignore if table exists
-- Then manually add column on production:
sqlite3 ~/ai-fitness-coach/server/fitness-coach.db
ALTER TABLE users ADD COLUMN new_field TEXT;
```

**Option B: Recreate table** (requires data migration):
1. Export data: `sqlite3 db ".dump table_name" > backup.sql`
2. Drop table: `DROP TABLE table_name;`
3. Restart server (recreates from schema)
4. Import data: `sqlite3 db < backup.sql`

**Option C: Replace database** (easiest):
1. Update schema.sql
2. Test locally with real data
3. Deploy database using Method 1

---

## Database Maintenance

### Backup Strategy

**Automated backups** (recommended):
```bash
# Add to crontab on production
0 2 * * * cp ~/ai-fitness-coach/server/fitness-coach.db ~/backups/fitness-coach-$(date +\%Y\%m\%d).db

# Keep last 30 days
0 3 * * * find ~/backups -name "fitness-coach-*.db" -mtime +30 -delete
```

**Manual backup**:
```bash
sqlite3 server/fitness-coach.db ".backup backup.db"
```

### Vacuum Database

```bash
# Reclaim space and optimize
sqlite3 server/fitness-coach.db "VACUUM;"
```

### Check Database Integrity

```bash
sqlite3 server/fitness-coach.db "PRAGMA integrity_check;"
```

---

## Troubleshooting

### Server Won't Start

**Error**: `Error: SQLITE_CANTOPEN: unable to open database file`

**Solution**:
```bash
# Check file permissions
ls -la server/fitness-coach.db

# Fix permissions
chmod 644 server/fitness-coach.db
chown riderlabs:riderlabs server/fitness-coach.db
```

### Schema Changes Not Applied

**Issue**: Added new table but it doesn't exist.

**Solution**:
```bash
# Check if table exists
sqlite3 server/fitness-coach.db ".tables"

# If missing, restart server
pm2 restart riderlabs

# If still missing, check logs
pm2 logs riderlabs --err
```

### Database Locked

**Error**: `Error: SQLITE_BUSY: database is locked`

**Solution**:
```bash
# Check for other processes
lsof server/fitness-coach.db

# Kill if needed
pm2 restart riderlabs

# Enable WAL mode (already in db.js)
sqlite3 server/fitness-coach.db "PRAGMA journal_mode=WAL;"
```

---

## Migration from Old System

If you have an existing database with the old migration system:

### One-Time Migration

```bash
# 1. Backup existing database
cp server/fitness-coach.db server/fitness-coach.db.pre-schema

# 2. Check existing tables
sqlite3 server/fitness-coach.db ".tables"

# 3. If missing admin tables, add them manually:
sqlite3 server/fitness-coach.db < server/schema.sql

# 4. Restart server
pm2 restart riderlabs

# 5. Verify all tables exist
sqlite3 server/fitness-coach.db ".tables"
```

Expected tables (19 total):
- adaptation_events
- admin_users
- ai_model_configs
- api_keys
- coach_personas
- feedback
- global_settings
- google_tokens
- manual_activities
- plan_adjustments
- race_analyses
- race_tags
- sessions
- strava_tokens
- theme_configs
- training_plans
- user_preferences
- users
- wellness_log
- workout_comparisons

---

## Performance Optimization

### Enable WAL Mode

Already enabled in `db.js`:
```javascript
db.pragma('journal_mode = WAL');
```

**Benefits**:
- Better concurrency
- Faster writes
- Reduced locking

### Analyze Query Performance

```bash
sqlite3 server/fitness-coach.db
EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = 'test@example.com';
```

### Add Indexes

Already included in `schema.sql`. To add more:
```sql
CREATE INDEX IF NOT EXISTS idx_custom ON table_name(column_name);
```

---

## Production Checklist

Before deploying:

- [ ] Test locally with fresh database
- [ ] Verify all tables created
- [ ] Check seed data (coach personas)
- [ ] Backup production database
- [ ] Deploy code changes
- [ ] Deploy database (Method 1 or 2)
- [ ] Verify server starts
- [ ] Check logs for errors
- [ ] Test admin panel login
- [ ] Test main app functionality
- [ ] Monitor for 10 minutes

---

## Quick Reference

### Common Commands

```bash
# Start development
npm run dev

# Deploy to production (code only)
git pull && pm2 restart riderlabs

# Deploy database
scp server/fitness-coach.db riderlabs@riderlabs-prod:~/ai-fitness-coach/server/

# View logs
pm2 logs riderlabs

# Database backup
sqlite3 server/fitness-coach.db ".backup backup.db"

# List tables
sqlite3 server/fitness-coach.db ".tables"

# Check schema
sqlite3 server/fitness-coach.db ".schema table_name"
```

### File Locations

- **Schema**: `server/schema.sql`
- **Database**: `server/fitness-coach.db`
- **DB Loader**: `server/db.js`
- **Backups**: `server/*.db.backup*`

---

## Support

If you encounter issues:

1. Check logs: `pm2 logs riderlabs --err`
2. Verify schema file exists: `ls -la server/schema.sql`
3. Check database file: `ls -la server/fitness-coach.db`
4. Test schema manually: `sqlite3 server/fitness-coach.db < server/schema.sql`
5. Restore from backup if needed

---

**Last Updated**: November 8, 2025  
**Schema Version**: 2.8.3
