# 🚀 Production Deployment Guide v2.0

**Last Updated:** November 19, 2025  
**Status:** Production-Ready ✅

This guide covers the **NEW** bulletproof deployment process that prevents database corruption and data loss.

---

## 🎯 Quick Start (For Experienced Users)

```bash
# SSH into production
ssh riderlabs@riderlabs.io

# Navigate to app
cd /home/riderlabs/ai-fitness-coach

# Run automated deployment
./scripts/prod-deploy.sh
```

**That's it!** The script handles everything automatically.

---

## 📚 Table of Contents

1. [What's New in v2.0](#whats-new-in-v20)
2. [Two Database System](#two-database-system)
3. [Deployment Process](#deployment-process)
4. [Migration System](#migration-system)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## 🆕 What's New in v2.0

### Major Improvements

1. **Dual Migration System**
   - Separate migrations for main app DB and admin DB
   - Prevents schema mismatches
   - Automatic tracking of applied migrations

2. **Atomic Backups**
   - Uses `sqlite3 .backup` command
   - Includes WAL files automatically
   - Stops PM2 during backup for clean state

3. **Automated Deployment**
   - One-command deployment
   - Built-in verification
   - Automatic rollback instructions

4. **Zero Data Loss**
   - Proper backup before any changes
   - Transaction-based migrations
   - Fail-safe error handling

---

## 🗄️ Two Database System

The application uses **TWO separate databases**:

### 1. Main App Database (`fitness-coach.db`)

**Location:** `server/fitness-coach.db`

**Contains:**
- User accounts and profiles
- Training plans and workouts
- Activities and performance data
- Race tags and adaptation events
- OAuth tokens (Strava, Google)

**Migrations:**
- Directory: `migrations/` (root level)
- Runner: `scripts/migrate.js`
- Tracking table: `migrations`

### 2. Admin Database (`database.sqlite`)

**Location:** `server/database.sqlite`

**Contains:**
- Admin user accounts
- Admin sessions
- API keys (OpenAI, Anthropic, etc.)
- AI model configurations
- Theme configurations

**Migrations:**
- Directory: `migrations/admin/`
- Runner: `scripts/migrate-admin.js`
- Tracking table: `admin_migrations`

**⚠️ CRITICAL:** Never confuse these two databases! They have different schemas and purposes.

---

## 🚀 Deployment Process

### Automated Deployment (Recommended)

The `prod-deploy.sh` script handles everything:

```bash
./scripts/prod-deploy.sh
```

**What it does:**

1. ✅ **Pre-flight checks** - Verifies PM2, Node.js, SQLite3
2. 📦 **Backup databases** - Atomic backup with WAL files
3. 🔄 **Pull latest code** - Git fetch and reset
4. 📦 **Install dependencies** - npm install
5. 🏗️ **Build frontend** - Vite production build
6. 🗄️ **Run migrations** - Both main and admin DBs
7. 🔄 **Restart PM2** - Clean restart
8. ✅ **Verify deployment** - Health checks and log review

**Time:** 3-5 minutes  
**Risk:** Minimal (automatic backup + rollback)

### Manual Deployment (Not Recommended)

If you must deploy manually:

```bash
# 1. Stop PM2
pm2 stop riderlabs

# 2. Backup databases
./scripts/backup-db.sh

# 3. Pull code
git fetch origin
git reset --hard origin/main

# 4. Install dependencies
npm install

# 5. Build frontend
npm run build

# 6. Run migrations
node scripts/migrate.js
node scripts/migrate-admin.js

# 7. Restart PM2
pm2 restart riderlabs

# 8. Verify
pm2 logs riderlabs --lines 50
```

**⚠️ Warning:** Manual deployment is error-prone. Use the automated script!

---

## 🗄️ Migration System

### Creating Main App Migrations

1. **Create migration file:**
   ```bash
   # migrations/002_add_new_feature.sql
   ```

2. **Write SQL:**
   ```sql
   -- Add new column
   ALTER TABLE training_plans ADD COLUMN new_field TEXT;
   
   -- Create new table
   CREATE TABLE IF NOT EXISTS new_table (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     data TEXT NOT NULL
   );
   ```

3. **Test locally:**
   ```bash
   # Backup first
   cp server/fitness-coach.db server/fitness-coach.db.backup
   
   # Run migration
   node scripts/migrate.js
   
   # If it fails, restore
   cp server/fitness-coach.db.backup server/fitness-coach.db
   ```

4. **Deploy:**
   ```bash
   git add migrations/002_add_new_feature.sql
   git commit -m "Add new feature migration"
   git push origin main
   ./scripts/prod-deploy.sh
   ```

### Creating Admin Database Migrations

1. **Create migration file:**
   ```bash
   # migrations/admin/002_add_new_admin_feature.sql
   ```

2. **Write SQL:**
   ```sql
   -- Add new admin table
   CREATE TABLE IF NOT EXISTS admin_logs (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     action TEXT NOT NULL,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP
   );
   ```

3. **Test locally:**
   ```bash
   # Backup first
   cp server/database.sqlite server/database.sqlite.backup
   
   # Run migration
   node scripts/migrate-admin.js
   
   # If it fails, restore
   cp server/database.sqlite.backup server/database.sqlite
   ```

4. **Deploy:** Same as main app migrations

### Migration Best Practices

1. **Use IF NOT EXISTS** when creating tables
2. **Test locally first** - Never test in production
3. **One migration per feature** - Keep focused
4. **Add comments** - Explain what and why
5. **Use transactions** - The runner handles this
6. **Never modify applied migrations** - Create new ones instead

---

## 🔄 Rollback Procedures

### Quick Rollback (Code Only)

If the new code has issues but database is fine:

```bash
# Get previous commit hash from deployment log
git log --oneline -10

# Reset to previous commit
git reset --hard <PREVIOUS_COMMIT>

# Reinstall and rebuild
npm install
npm run build

# Restart
pm2 restart riderlabs
```

**Time:** 2 minutes

### Full Rollback (Code + Database)

If database migration failed or corrupted:

```bash
# 1. Stop PM2
pm2 stop riderlabs

# 2. List backups
ls -lh backups/

# 3. Restore databases (use latest timestamp)
cp backups/fitness-coach_TIMESTAMP.db server/fitness-coach.db
cp backups/database_TIMESTAMP.sqlite server/database.sqlite

# 4. Rollback code
git reset --hard <PREVIOUS_COMMIT>
npm install
npm run build

# 5. Restart
pm2 start riderlabs

# 6. Verify
pm2 logs riderlabs --lines 50
```

**Time:** 5 minutes

### Emergency Rollback (Nuclear Option)

If everything is broken:

```bash
# Kill all node processes
pkill -9 node

# Restore from backup
cp backups/fitness-coach_LATEST.db server/fitness-coach.db
cp backups/database_LATEST.sqlite server/database.sqlite

# Reset to known good commit
git reset --hard <KNOWN_GOOD_COMMIT>

# Clean install
rm -rf node_modules
npm install
npm run build

# Start fresh
pm2 delete riderlabs
pm2 start npm --name riderlabs -- run server

# Verify
pm2 logs riderlabs
```

**Time:** 10 minutes

---

## 🔧 Troubleshooting

### Deployment Script Fails

**Check logs:**
```bash
# View deployment log
cat deploy_TIMESTAMP.log

# Check PM2 logs
pm2 logs riderlabs --lines 100
```

**Common issues:**
- Vite build fails → Run `npm install` (not `--production`)
- Migration fails → Check SQL syntax, restore from backup
- PM2 won't start → Check port 5001 availability

### Database Schema Errors

**Symptom:** `no such column` or `no such table` errors

**Solution:**
```bash
# Check which migrations are applied
sqlite3 server/fitness-coach.db "SELECT * FROM migrations;"
sqlite3 server/database.sqlite "SELECT * FROM admin_migrations;"

# If migration is missing, run it
node scripts/migrate.js
node scripts/migrate-admin.js
```

### API Keys Not Working

**Symptom:** `db.run is not a function` or `no such column: encrypted_key`

**Solution:**
```bash
# Check admin database schema
sqlite3 server/database.sqlite ".schema api_keys"

# Should have: encrypted_key, last_used_at columns
# If not, run admin migration
node scripts/migrate-admin.js
```

### PM2 Process Crashes

**Check status:**
```bash
pm2 status
pm2 logs riderlabs --err --lines 50
```

**Common causes:**
- Port 5001 already in use
- Database file locked
- Missing environment variables
- Out of memory

**Solution:**
```bash
# Restart with fresh state
pm2 delete riderlabs
pm2 start npm --name riderlabs -- run server
pm2 save
```

---

## ✅ Best Practices

### Before Every Deployment

1. **Test locally first**
2. **Review all changes** - `git diff origin/main`
3. **Check migration files** - Ensure they're correct
4. **Backup manually** - `./scripts/backup-db.sh`
5. **Deploy during low traffic** - Early morning is best

### During Deployment

1. **Use the automated script** - Don't deploy manually
2. **Watch the logs** - Monitor for errors
3. **Don't interrupt** - Let it complete
4. **Verify immediately** - Check health endpoint

### After Deployment

1. **Test critical features** - Login, OAuth, API keys
2. **Monitor for 30 minutes** - Watch PM2 logs
3. **Check database** - Verify data integrity
4. **Document issues** - Note any problems
5. **Keep backup for 24 hours** - Don't delete immediately

### General Rules

1. **Never `git reset --hard` while PM2 is running**
2. **Always backup before schema changes**
3. **Test migrations locally first**
4. **Keep deployment logs** - They're useful for debugging
5. **Document custom changes** - Update this guide

---

## 📊 Deployment Checklist

Use this for every deployment:

- [ ] Code changes tested locally
- [ ] Migrations tested locally
- [ ] `.env` file backed up
- [ ] Deployment script is executable
- [ ] PM2 is running before deployment
- [ ] Run `./scripts/prod-deploy.sh`
- [ ] Watch deployment logs
- [ ] Verify PM2 status after
- [ ] Test admin panel
- [ ] Test API keys
- [ ] Test main app features
- [ ] Monitor logs for 30 minutes
- [ ] Document any issues

---

## 🆘 Emergency Contacts

**If deployment fails catastrophically:**

1. **Restore from backup** - See rollback procedures
2. **Check documentation** - This guide + `PRODUCTION_DEPLOY_SOP.md`
3. **Review logs** - `deploy_TIMESTAMP.log` and PM2 logs
4. **Don't panic** - We have backups!

---

## 📝 Deployment Log Template

Keep a log of all deployments:

```
Date: YYYY-MM-DD HH:MM
Commit: <git hash>
Changes: <brief description>
Migrations: <list migration files>
Duration: <X minutes>
Issues: <any problems encountered>
Status: ✅ Success / ❌ Failed / ⚠️ Partial
```

---

## 🎓 Learning from Past Failures

### November 18, 2025 - Database Corruption

**What happened:**
- Manual deployment without stopping PM2
- `git reset --hard` deleted WAL files
- Database corruption and data loss

**Lessons learned:**
1. Always stop PM2 before git operations
2. Backup WAL files (use `sqlite3 .backup`)
3. Automate deployments to prevent human error

**How we fixed it:**
- Created automated deployment script
- Implemented dual migration system
- Added atomic backup process
- Documented everything

**Result:** This guide and the new deployment system!

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ PM2 shows `online` status
- ✅ No errors in logs (last 50 lines)
- ✅ Health endpoint responds
- ✅ Admin panel loads
- ✅ API keys work
- ✅ Main app features work
- ✅ Database has correct schema
- ✅ Backups are created

---

**You're now ready to deploy with confidence! 🚀**

For detailed procedures, see `PRODUCTION_DEPLOY_SOP.md`.  
For migration details, see `migrations/README.md` and `migrations/admin/README.md`.
