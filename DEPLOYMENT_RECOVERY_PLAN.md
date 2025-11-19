# 🚨 Production Deployment Recovery Plan
**Date:** November 19, 2025  
**Status:** IN PROGRESS  
**Incident:** Database corruption during deployment, user data lost, API Keys broken

---

## 🔍 Root Cause Analysis

### What Went Wrong

1. **Module System Mismatch**
   - `aiConfigService.cjs` (CommonJS) tries to import `db.js` (ES6 modules)
   - Results in `db.run is not a function` error
   - Admin system uses CommonJS, main app uses ES6

2. **Database File Confusion**
   - Admin tables in `database.sqlite`
   - Main app tables in `fitness-coach.db`
   - `aiConfigService.cjs` tries to use `db.js` which connects to `fitness-coach.db`
   - But API keys are stored in `database.sqlite`

3. **WAL Backup Failure**
   - Only backed up `.db` file
   - Didn't backup `.db-wal` and `.db-shm` files
   - Lost uncommitted transactions

4. **No Deployment Automation**
   - Manual process prone to errors
   - No verification steps
   - No rollback capability

---

## 🎯 Solution Strategy

### Phase 1: Fix API Keys Service (IMMEDIATE)

**Problem:** `aiConfigService.cjs` uses wrong database connection

**Solution:** Make it use `database.sqlite` directly (like `apiKeyLoader.cjs` does)

**Files to modify:**
- `server/services/aiConfigService.cjs` - Use direct sqlite3 connection to `database.sqlite`

### Phase 2: Create Deployment Automation

**Create 3 scripts:**
1. `scripts/backup-db.sh` - Safe database backup (includes WAL)
2. `scripts/prod-deploy.sh` - Automated deployment
3. `scripts/verify-deployment.sh` - Post-deployment verification

### Phase 3: Database Migration System

**Create migration runner:**
- `scripts/migrate.js` - Run pending migrations
- `migrations/` folder - Store migration files
- Track applied migrations in database

### Phase 4: Environment Parity

**Add DATABASE_PATH support:**
- Local: `./server/fitness-coach.db`
- Production: `/home/riderlabs/ai-fitness-coach/server/fitness-coach.db`
- Configurable via `.env`

---

## 📋 Implementation Steps

### Step 1: Fix aiConfigService.cjs ✅

Change from:
```javascript
const db = require('../db.js'); // WRONG - ES6 module
```

To:
```javascript
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);
```

### Step 2: Create Backup Script

```bash
#!/bin/bash
# scripts/backup-db.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups"
mkdir -p $BACKUP_DIR

# Stop PM2 to ensure clean backup
pm2 stop riderlabs

# Backup both databases with WAL files
sqlite3 server/database.sqlite ".backup '$BACKUP_DIR/database_$TIMESTAMP.sqlite'"
sqlite3 server/fitness-coach.db ".backup '$BACKUP_DIR/fitness-coach_$TIMESTAMP.db'"

echo "✅ Backup complete: $BACKUP_DIR/*_$TIMESTAMP.*"
```

### Step 3: Create Deployment Script

```bash
#!/bin/bash
# scripts/prod-deploy.sh

set -e  # Exit on error

echo "🚀 Starting deployment..."

# 1. Backup databases
./scripts/backup-db.sh

# 2. Pull latest code
git fetch origin
git reset --hard origin/main

# 3. Install dependencies
npm install

# 4. Build frontend
npm run build

# 5. Run migrations (if any)
node scripts/migrate.js

# 6. Restart PM2
pm2 restart riderlabs

# 7. Verify deployment
./scripts/verify-deployment.sh

echo "✅ Deployment complete!"
```

### Step 4: Create Migration System

```javascript
// scripts/migrate.js
import Database from 'better-sqlite3';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

const db = new Database('./server/fitness-coach.db');

// Create migrations table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL
  )
`);

// Get applied migrations
const applied = db.prepare('SELECT name FROM migrations').all();
const appliedNames = new Set(applied.map(m => m.name));

// Get migration files
const migrationsDir = './migrations';
const files = await readdir(migrationsDir);
const pending = files
  .filter(f => f.endsWith('.sql') && !appliedNames.has(f))
  .sort();

// Apply pending migrations
for (const file of pending) {
  console.log(`Applying migration: ${file}`);
  const sql = await readFile(path.join(migrationsDir, file), 'utf8');
  db.exec(sql);
  db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(
    file,
    new Date().toISOString()
  );
  console.log(`✅ Applied: ${file}`);
}

console.log(`✅ All migrations applied (${pending.length} new)`);
```

---

## 🔧 Immediate Actions (Next 30 min)

1. ✅ Fix `aiConfigService.cjs` to use correct database
2. ✅ Test API Keys admin panel locally
3. ✅ Create deployment scripts
4. ✅ Test deployment process locally
5. ✅ Deploy to production
6. ✅ Verify everything works

---

## 🎯 Success Criteria

- [ ] API Keys admin panel works (can save/delete keys)
- [ ] Admin login works
- [ ] User registration works
- [ ] Strava OAuth works
- [ ] Training plan generation works
- [ ] Feedback system works
- [ ] No console errors
- [ ] Deployment takes < 5 minutes
- [ ] Automated backup before deployment
- [ ] Rollback capability if deployment fails

---

## 📝 Post-Deployment Checklist

- [ ] Recreate admin user
- [ ] Add API keys via admin panel
- [ ] Test Strava connection
- [ ] Generate test training plan
- [ ] Submit test feedback
- [ ] Check PM2 logs for errors
- [ ] Verify database has all tables
- [ ] Document any issues

---

## 🚀 Future Improvements

1. **Staging Environment**
   - Test deployments before production
   - Catch issues early

2. **Database Consolidation**
   - Merge `database.sqlite` and `fitness-coach.db`
   - Single source of truth

3. **Automated Testing**
   - Pre-deployment tests
   - Post-deployment verification

4. **Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring
   - Uptime monitoring

---

**Next Step:** Fix aiConfigService.cjs and test locally
