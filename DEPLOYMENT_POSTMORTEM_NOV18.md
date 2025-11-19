# 🌙 Deployment Postmortem - November 18, 2025

## Summary

Attempted to deploy v2.10.0 (Feedback Management feature) to production. Deployment took 3+ hours due to database issues. App is running but API Keys admin panel is broken.

---

## What Went Wrong

### 1. Database WAL/SHM Issue
- **Problem**: Backed up only `.db` file, not `.db-wal` and `.db-shm` files
- **Impact**: WAL contained recent writes (admin users, API keys, persona edits)
- **Result**: After `git reset --hard`, WAL files were cleared → data loss
- **Root Cause**: SQLite was in WAL mode, backup didn't include uncommitted transactions

### 2. Schema Mismatch
- **Problem**: Restored DB had old schema (missing `encrypted_key`, `last_used_at` columns in `api_keys` table)
- **Impact**: Code expected new schema → "no such column" errors
- **Result**: Had to manually recreate tables with correct schema
- **Root Cause**: Backup was from before schema migrations were run

### 3. Mixed Database Libraries
- **Problem**: Some services use `better-sqlite3` (sync), `aiConfigService.cjs` was using `sqlite3` (async)
- **Impact**: Different APIs, different connection paths, different DB files
- **Result**: Schema fixes didn't apply to the right database
- **Root Cause**: Inconsistent database library usage across codebase

### 4. Time Lost
- **Duration**: 3+ hours troubleshooting instead of 30-minute deployment
- **Impact**: Feedback feature works but can't configure API keys
- **Frustration**: This has happened before and wasn't properly documented

---

## Current State

### ✅ Working
- App runs on production
- Admin login works
- Feedback page loads and displays
- Database schema is correct (`server/fitness-coach.db`)
- Feedback submission works
- All tables exist with correct columns

### ❌ Broken
- API Keys admin page (can't save keys)
- Error: `db.run is not a function` when saving API keys
- Must use `.env` file for API keys as workaround

### 🔧 Workaround
Add API keys directly to `.env` file:
```bash
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

---

## Root Causes Analysis

### Why This Happened

1. **No Standard Deployment Procedure**
   - Manual steps, easy to miss critical parts
   - No checklist or script
   - Different approach each time

2. **SQLite WAL Mode Not Understood**
   - WAL (Write-Ahead Logging) keeps recent writes in separate files
   - Copying only `.db` file misses uncommitted data
   - Need to use `sqlite3 .backup` or checkpoint before copying

3. **Inconsistent Database Access**
   - Mix of `sqlite3` (async) and `better-sqlite3` (sync)
   - Different connection paths in different services
   - Hard to track which DB file is being used

4. **No Deployment Documentation**
   - Previous issues not documented
   - No lessons learned captured
   - Same mistakes repeated

---

## Tomorrow's Action Plan

### Phase 1: Fix API Keys (30 min)

**Goal**: Get API Keys admin panel working

**Tasks**:
1. Debug the `db.run is not a function` error in `aiConfigService.cjs`
2. Verify all methods use `better-sqlite3` syntax correctly:
   - `db.prepare(sql).run(params)` not `db.run(sql, params, callback)`
   - `db.prepare(sql).get(params)` not `db.get(sql, params, callback)`
   - `db.prepare(sql).all(params)` not `db.all(sql, params, callback)`
3. Test API key creation, retrieval, and deletion
4. Commit and push fix
5. Deploy to production

**Success Criteria**:
- Can add API key via admin panel
- Can view API keys list
- Can delete API key
- No console errors

---

### Phase 2: Create Bulletproof Deployment Process (1 hour)

**Goal**: Never waste 3 hours on deployment again

#### 2.1 Create `PRODUCTION_DEPLOY_SOP.md`
- Step-by-step safe deployment procedure
- Pre-deployment checklist
- Proper DB backup (includes WAL/SHM)
- Verification checklist
- Rollback procedure
- Common issues and solutions

#### 2.2 Create `scripts/prod-deploy.sh`
- Automated script that does it right every time
- Uses `sqlite3 .backup` (atomic, includes WAL)
- Stops service → backup → pull → build → restart
- Verification steps built-in
- Rollback on failure

**Script flow**:
```bash
#!/bin/bash
# 1. Stop PM2
pm2 stop riderlabs

# 2. Backup DB (atomic, includes WAL)
sqlite3 server/fitness-coach.db ".backup 'backups/fitness-coach_$(date +%Y%m%d_%H%M%S).db'"

# 3. Pull code
git fetch origin
git reset --hard origin/main

# 4. Install & build
npm install
npm run build

# 5. Restart
pm2 start riderlabs

# 6. Verify
pm2 status riderlabs
curl http://localhost:5001/api/health
```

#### 2.3 Enhance `server/db.js`
- Support `DATABASE_PATH` env variable
- Prevents accidental DB path changes
- Single source of truth for DB location

**Example**:
```javascript
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'fitness-coach.db');
const db = new Database(dbPath);
```

---

### Phase 3: Test & Document (30 min)

**Goal**: Validate and document the new process

**Tasks**:
1. Test full deployment flow on production
2. Document rollback procedure
3. Add deployment section to README
4. Create quick reference card
5. Test rollback procedure

**Deliverables**:
- `PRODUCTION_DEPLOY_SOP.md` - Complete guide
- `scripts/prod-deploy.sh` - Automated script
- `QUICK_DEPLOY_REFERENCE.md` - One-page cheat sheet
- Updated `README.md` with deployment section

---

## Lessons Learned

### Technical Lessons

1. **Always backup WAL files** with the main DB
   - Use `sqlite3 .backup` command (atomic, includes WAL)
   - Or checkpoint WAL before copying: `PRAGMA wal_checkpoint(TRUNCATE);`
   - Or disable WAL: `PRAGMA journal_mode=DELETE;`

2. **Stop service before DB operations**
   - Prevents active connections during backup
   - Ensures clean state
   - Avoids corruption

3. **Use consistent database library**
   - Standardize on `better-sqlite3` (sync)
   - Remove `sqlite3` (async) completely
   - Single connection pattern

4. **Test deployment process in staging first**
   - Never test on production
   - Have a staging environment
   - Dry-run deployments

5. **Document everything immediately**
   - Write postmortems after incidents
   - Update SOPs after each deployment
   - Keep lessons learned visible

### Process Lessons

1. **Automation prevents mistakes**
   - Scripts are repeatable
   - Checklists get skipped
   - Automate the critical path

2. **Backups must be tested**
   - Verify backups work
   - Practice restore procedures
   - Don't assume backups are good

3. **Time pressure causes errors**
   - Slow down when things break
   - Don't rush fixes
   - Take breaks to think clearly

4. **Documentation is insurance**
   - Future you will thank present you
   - Team members need context
   - Reduces bus factor

---

## Prevention Checklist

Before next deployment, ensure:

- [ ] `PRODUCTION_DEPLOY_SOP.md` created
- [ ] `scripts/prod-deploy.sh` created and tested
- [ ] `DATABASE_PATH` env support added
- [ ] All services use `better-sqlite3`
- [ ] Backup procedure tested and verified
- [ ] Rollback procedure tested and verified
- [ ] Deployment tested in staging
- [ ] Team trained on new process

---

## Files to Create Tomorrow

1. **PRODUCTION_DEPLOY_SOP.md**
   - Complete deployment guide
   - Pre-flight checklist
   - Step-by-step instructions
   - Verification steps
   - Rollback procedure

2. **scripts/prod-deploy.sh**
   - Automated deployment script
   - Safe DB backup
   - Error handling
   - Verification built-in

3. **QUICK_DEPLOY_REFERENCE.md**
   - One-page cheat sheet
   - Common commands
   - Quick troubleshooting

4. **server/db.js** (update)
   - Add DATABASE_PATH support
   - Document DB connection

---

## Quick Reference for Tomorrow

### Fix API Keys Service

**File**: `server/services/aiConfigService.cjs`

**Issue**: Methods still using async `sqlite3` syntax

**Fix**: Convert all methods to sync `better-sqlite3`:
```javascript
// Wrong (async sqlite3)
db.run(sql, params, callback)

// Right (sync better-sqlite3)
const stmt = db.prepare(sql);
stmt.run(params);
```

### Safe DB Backup Command

```bash
# Stop service
pm2 stop riderlabs

# Atomic backup (includes WAL)
sqlite3 server/fitness-coach.db ".backup 'backups/fitness-coach_$(date +%Y%m%d_%H%M%S).db'"

# Continue with deployment
```

### Verify DB Schema

```bash
sqlite3 server/fitness-coach.db "PRAGMA table_info(api_keys);"
```

Should show: `encrypted_key` and `last_used_at` columns

---

## Timeline of Tonight's Events

- **8:10pm** - Started deployment, pushed v2.10.0 to GitHub
- **8:15pm** - SSH'd into production, began manual deployment
- **8:20pm** - Database backup failed (wrong path)
- **8:25pm** - Git pull failed (WAL/SHM conflicts)
- **8:30pm** - Git reset --hard (data loss occurred here)
- **8:35pm** - Discovered missing admin users and API keys
- **8:40pm** - Realized DB schema mismatch
- **8:50pm** - Manually recreated tables
- **9:00pm** - Fixed `aiConfigService.cjs` imports
- **9:10pm** - Still getting "no such column" errors
- **9:15pm** - Discovered mixed database libraries
- **9:20pm** - Converted `aiConfigService.cjs` to better-sqlite3
- **9:25pm** - New error: `db.run is not a function`
- **9:29pm** - Decided to stop for tonight, document issues

**Total Time**: 1 hour 19 minutes of active troubleshooting

---

## Success Metrics for Tomorrow

### Must Have
- [ ] API Keys admin panel works (can add/delete keys)
- [ ] Deployment script created and tested
- [ ] SOP document created
- [ ] No errors in production logs

### Should Have
- [ ] Rollback procedure tested
- [ ] Quick reference guide created
- [ ] README updated with deployment info

### Nice to Have
- [ ] Staging environment setup
- [ ] Automated deployment tests
- [ ] Monitoring alerts configured

---

## Contact & Resources

**Production Server**: riderlabs@riderlabs.io  
**App Directory**: `/home/riderlabs/ai-fitness-coach`  
**Database**: `/home/riderlabs/ai-fitness-coach/server/fitness-coach.db`  
**Service**: PM2 process named `riderlabs`  
**Logs**: `pm2 logs riderlabs`

**Key Files**:
- `server/db.js` - Database connection
- `server/services/aiConfigService.cjs` - API keys service (needs fix)
- `server/routes/feedback.js` - Feedback API (working)

---

**Status**: Documented and ready for tomorrow's fix. Get some rest! 🌙

**Next Session**: Fix API keys service, create deployment automation, never do this again.
