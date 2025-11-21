# Clean Deployment Plan - RiderLabs

## 🎯 Goal
Zero-downtime deployments with no schema mismatches, cache issues, or data loss.

---

## 📋 Pre-Deployment Checklist

### 1. **Code Review**
- [ ] All tests passing locally
- [ ] No console errors in browser DevTools
- [ ] Database migrations reviewed and tested locally
- [ ] Schema changes documented

### 2. **Database Schema Alignment**
- [ ] Run this command to find potential mismatches:
  ```bash
  # Check for old column names in code
  grep -r "key_name\|encrypted_key" server/
  grep -r "theme_name\|colors" server/routes/
  ```
- [ ] Verify schema.sql matches actual database structure
- [ ] Test migrations on local copy of production database

### 3. **Dependency Check**
- [ ] `package.json` dependencies up to date
- [ ] No security vulnerabilities: `npm audit`
- [ ] Lock file committed: `package-lock.json`

### 4. **Environment Variables**
- [ ] All required env vars documented in `.env.example`
- [ ] Production `.env` file has all required keys
- [ ] No hardcoded secrets in code

---

## 🚀 Deployment Steps

### **Phase 1: Backup** (5 minutes)

```bash
# SSH into production
ssh riderlabs@riderlabs.io

# Navigate to project
cd ~/ai-fitness-coach

# Backup databases
./scripts/backup-db.sh

# Verify backup created
ls -lh backups/ | tail -5

# Optional: Download backup to local machine
# (Run on local machine)
scp riderlabs@riderlabs.io:~/ai-fitness-coach/backups/backup-YYYY-MM-DD-*.tar.gz ~/Downloads/
```

---

### **Phase 2: Update Code** (2 minutes)

```bash
# Still on production server

# Check current status
pm2 status

# Pull latest code
git fetch origin
git status
git pull origin main

# Verify correct branch and commit
git log -1 --oneline
```

---

### **Phase 3: Dependencies** (3 minutes)

```bash
# Install/update dependencies
npm install

# Verify installation
npm list --depth=0
```

---

### **Phase 4: Database Migrations** (2 minutes)

```bash
# Check if migrations are needed
ls -l server/migrations/

# Run migrations (if any)
# NOTE: Migrations run automatically on server start
# But you can run manually if needed:
# node server/migrations/run-migrations.js

# Verify database schema
sqlite3 server/fitness-coach.db ".schema api_keys"
sqlite3 server/fitness-coach.db ".schema theme_configs"
```

---

### **Phase 5: Build Frontend** (1 minute)

```bash
# Build production bundle
npm run build

# Verify build output
ls -lh dist/assets/

# Note the new hash in filename (e.g., index-ABC123.js)
ls dist/assets/index-*.js
```

---

### **Phase 6: Restart Server** (1 minute)

```bash
# For MAJOR changes (schema, dependencies):
pm2 stop riderlabs
pm2 delete riderlabs
pm2 start server/index.js --name riderlabs --node-args="--max-old-space-size=2048"
pm2 save

# For MINOR changes (code only):
pm2 restart riderlabs --update-env

# Verify server started
pm2 status
```

---

### **Phase 7: Verify Deployment** (5 minutes)

```bash
# Check logs for errors
pm2 logs riderlabs --lines 50

# Look for success indicators:
# ✅ Database initialized
# ✅ Loaded X active API keys (X > 0)
# 🚀 AI Fitness Coach server running on port 5001

# Check for error indicators:
# ❌ SQLITE_ERROR
# ✗ Failed to decrypt
# ❌ No API key found

# Test health endpoint
curl http://localhost:5001/api/health

# Expected response: {"status":"ok"}
```

---

### **Phase 8: Frontend Verification** (3 minutes)

**On your local machine:**

1. **Open site:** https://riderlabs.io
2. **Hard refresh:** `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
3. **Open DevTools:** F12 → Network tab
4. **Verify new bundle loaded:**
   - Look for `index-[NEW_HASH].js`
   - Should match hash from build step
5. **Test critical paths:**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] Admin panel accessible
   - [ ] API Keys page works (view, add, delete)
   - [ ] No console errors

---

### **Phase 9: Smoke Tests** (5 minutes)

Test these critical features:

- [ ] **User Login:** Can log in with existing account
- [ ] **Strava Auth:** OAuth flow works
- [ ] **Training Plan:** Can generate a plan
- [ ] **Activities:** Can view activities
- [ ] **Admin Login:** Can access admin panel
- [ ] **API Keys:** Can view/add/delete keys
- [ ] **Theme Config:** Theme loads correctly

---

### **Phase 10: Monitor** (30 minutes)

```bash
# Watch logs for errors
pm2 logs riderlabs --lines 100

# Monitor server resources
pm2 monit

# Check for memory leaks or crashes
pm2 status
```

---

## 🔄 Rollback Plan

If deployment fails, rollback immediately:

```bash
# On production server

# Stop current version
pm2 stop riderlabs

# Rollback code
git log --oneline -10  # Find previous commit hash
git reset --hard <PREVIOUS_COMMIT_HASH>

# Restore database (if schema changed)
cd ~/ai-fitness-coach
tar -xzf backups/backup-YYYY-MM-DD-HHMMSS.tar.gz
# This extracts to ./backup-restore/

# Copy databases back
cp backup-restore/fitness-coach.db server/
cp backup-restore/database.sqlite server/

# Rebuild and restart
npm install
npm run build
pm2 delete riderlabs
pm2 start server/index.js --name riderlabs
pm2 save

# Verify rollback
pm2 logs riderlabs --lines 50
```

---

## 🛡️ Safety Measures

### 1. **Database Backups**
- **Before every deployment:** Run `./scripts/backup-db.sh`
- **Retention:** Keep last 7 days of backups
- **Location:** `~/ai-fitness-coach/backups/`
- **Download critical backups** to local machine

### 2. **Git Workflow**
- **Never commit directly to main** on production
- **Always pull from main** on production
- **Tag releases:** `git tag v2.11.2 && git push --tags`

### 3. **PM2 Configuration**
- **Save PM2 state:** `pm2 save` after every change
- **Auto-restart on crash:** Already configured
- **Log rotation:** Configure to prevent disk fill

### 4. **Monitoring**
- **Set up alerts:** PM2 Plus or custom monitoring
- **Log aggregation:** Consider centralized logging
- **Uptime monitoring:** Use external service (UptimeRobot, Pingdom)

---

## 📊 Deployment Frequency

### **Recommended Schedule:**

- **Hotfixes:** As needed (critical bugs)
- **Minor updates:** Weekly (Fridays, 10 AM)
- **Major updates:** Bi-weekly (after thorough testing)
- **Schema changes:** Monthly (with extra caution)

### **Best Times to Deploy:**

- ✅ **Friday mornings** (10 AM - 12 PM) - Weekend to fix issues
- ✅ **Tuesday/Wednesday** (low traffic days)
- ❌ **Monday mornings** (start of week, high activity)
- ❌ **Friday evenings** (no time to fix issues)

---

## 🔍 Schema Change Protocol

When making database schema changes:

### **Step 1: Plan**
1. Document the change in migration file
2. List all affected code files
3. Create rollback migration

### **Step 2: Test Locally**
1. Apply migration to local database
2. Test all affected features
3. Verify rollback works

### **Step 3: Update Code**
1. Update ALL files that reference changed columns
2. Search codebase for old column names:
   ```bash
   grep -r "old_column_name" server/ src/
   ```
3. Update schema.sql to match

### **Step 4: Deploy**
1. Follow standard deployment plan
2. Monitor logs closely for SQLITE_ERROR
3. Test affected features immediately

### **Step 5: Verify**
1. Check database schema:
   ```bash
   sqlite3 server/fitness-coach.db ".schema table_name"
   ```
2. Verify data integrity:
   ```bash
   sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM table_name;"
   ```

---

## 🚨 Common Pitfalls to Avoid

1. **❌ Don't skip backups** - Always backup before deployment
2. **❌ Don't deploy on Fridays after 2 PM** - No time to fix issues
3. **❌ Don't use `pm2 restart` for major changes** - Use `pm2 delete` + `pm2 start`
4. **❌ Don't forget to hard refresh browser** - Old JS bundle will cause errors
5. **❌ Don't deploy schema changes without code updates** - Will cause SQLITE_ERROR
6. **❌ Don't skip smoke tests** - Catch issues before users do
7. **❌ Don't deploy without checking logs** - Silent failures are the worst
8. **❌ Don't forget to run `npm install`** - Missing dependencies break builds

---

## 📝 Deployment Checklist (Quick Reference)

```bash
# 1. BACKUP
ssh riderlabs@riderlabs.io
cd ~/ai-fitness-coach
./scripts/backup-db.sh

# 2. UPDATE
git pull origin main
npm install

# 3. BUILD
npm run build

# 4. RESTART
pm2 stop riderlabs
pm2 delete riderlabs
pm2 start server/index.js --name riderlabs --node-args="--max-old-space-size=2048"
pm2 save

# 5. VERIFY
pm2 logs riderlabs --lines 50
curl http://localhost:5001/api/health

# 6. TEST
# Open https://riderlabs.io
# Hard refresh (Cmd+Shift+R)
# Test critical features
```

---

## 🎯 Success Criteria

Deployment is successful when:

- ✅ No SQLITE_ERROR in logs
- ✅ API keys loading correctly (count > 0)
- ✅ Frontend loads new bundle (check hash)
- ✅ All smoke tests pass
- ✅ No console errors in browser
- ✅ Server uptime > 5 minutes without crashes
- ✅ Memory usage stable

---

## 📞 Emergency Contacts

- **Server Issues:** Check PM2 logs first
- **Database Issues:** Restore from backup
- **Frontend Issues:** Hard refresh, check bundle hash
- **Critical Bugs:** Rollback immediately

---

**Last Updated:** November 20, 2025  
**Version:** 1.0  
**Next Review:** After next deployment
