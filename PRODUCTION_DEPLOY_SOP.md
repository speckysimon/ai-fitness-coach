# 🚀 Production Deployment Standard Operating Procedure (SOP)

**Version:** 2.0  
**Last Updated:** November 19, 2025  
**Status:** ACTIVE

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code changes committed and pushed to `main` branch
- [ ] Local testing completed successfully
- [ ] No breaking changes in dependencies
- [ ] Database migrations tested locally (if any)
- [ ] API keys configured (if needed)
- [ ] Changelog updated
- [ ] Version bumped in `package.json`

---

## 🎯 Deployment Process

### Option 1: Automated Deployment (Recommended)

```bash
# SSH into production server
ssh riderlabs@riderlabs.io

# Navigate to app directory
cd /home/riderlabs/ai-fitness-coach

# Run deployment script
./scripts/prod-deploy.sh
```

The script will:
1. ✅ Check prerequisites
2. 📦 Backup databases (with WAL files)
3. 🔄 Pull latest code
4. 📦 Install dependencies
5. 🏗️  Build frontend
6. 🗄️  Run migrations
7. 🔄 Restart PM2
8. ✅ Verify deployment

**Estimated Time:** 3-5 minutes

### Option 2: Manual Deployment (Not Recommended)

Only use if automated script fails.

```bash
# 1. SSH into server
ssh riderlabs@riderlabs.io
cd /home/riderlabs/ai-fitness-coach

# 2. Backup databases
./scripts/backup-db.sh

# 3. Pull code
git fetch origin
git reset --hard origin/main

# 4. Install dependencies
npm install --production

# 5. Build frontend
npm run build

# 6. Run migrations (if any)
node scripts/migrate.js

# 7. Restart PM2
pm2 restart riderlabs

# 8. Verify
pm2 status riderlabs
pm2 logs riderlabs --lines 50
```

---

## ✅ Post-Deployment Verification

### 1. Check PM2 Status
```bash
pm2 status riderlabs
```
Should show: `status: online`

### 2. Check Logs
```bash
pm2 logs riderlabs --lines 50
```
Look for:
- ✅ "Server running on port 5001"
- ✅ "Database initialized"
- ❌ No error messages

### 3. Test Critical Endpoints

```bash
# Health check (if exists)
curl http://localhost:5001/api/health

# Test API response
curl http://localhost:5001/api/auth/me
```

### 4. Test in Browser

Visit: https://riderlabs.io

Test:
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard loads
- [ ] Strava connection works
- [ ] Training plan generation works
- [ ] No console errors

---

## 🔄 Rollback Procedure

If deployment fails or introduces bugs:

### Quick Rollback

```bash
# 1. Get previous commit hash (from deployment log or git)
git log --oneline -10

# 2. Reset to previous commit
git reset --hard <PREVIOUS_COMMIT_HASH>

# 3. Reinstall dependencies
npm install --production

# 4. Rebuild frontend
npm run build

# 5. Restart PM2
pm2 restart riderlabs

# 6. Verify
pm2 status riderlabs
```

### Database Rollback

If database migration failed:

```bash
# 1. Stop PM2
pm2 stop riderlabs

# 2. Restore database from backup
cp backups/fitness-coach_TIMESTAMP.db server/fitness-coach.db
cp backups/database_TIMESTAMP.sqlite server/database.sqlite

# 3. Restart PM2
pm2 start riderlabs
```

---

## 🐛 Troubleshooting

### Issue: PM2 Won't Start

**Symptoms:** `pm2 status` shows `errored` or `stopped`

**Solution:**
```bash
# Check logs
pm2 logs riderlabs --lines 100

# Common fixes:
# 1. Port already in use
lsof -i :5001
kill -9 <PID>

# 2. Missing dependencies
npm install

# 3. Database locked
rm server/*.db-shm server/*.db-wal

# Restart
pm2 restart riderlabs
```

### Issue: Database Errors

**Symptoms:** "SQLITE_ERROR: no such table" or "no such column"

**Solution:**
```bash
# Check database schema
sqlite3 server/fitness-coach.db ".schema"

# Run migrations
node scripts/migrate.js

# If migrations fail, restore backup
cp backups/fitness-coach_LATEST.db server/fitness-coach.db
```

### Issue: Frontend Not Updating

**Symptoms:** Old UI showing after deployment

**Solution:**
```bash
# Clear build and rebuild
rm -rf dist/
npm run build

# Clear browser cache
# Or force refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
```

### Issue: API Keys Not Working

**Symptoms:** "API key not found" errors

**Solution:**
```bash
# Check if keys exist in database
sqlite3 server/database.sqlite "SELECT key_name, provider FROM api_keys;"

# If missing, add via admin panel or .env file
# Admin panel: https://riderlabs.io/admin
# Or add to .env:
echo "OPENAI_API_KEY=sk-..." >> .env
pm2 restart riderlabs
```

---

## 📊 Monitoring

### Daily Checks

```bash
# Check PM2 status
pm2 status riderlabs

# Check recent logs
pm2 logs riderlabs --lines 50

# Check disk space
df -h

# Check database size
du -h server/*.db
```

### Weekly Checks

```bash
# Check backup count
ls -lh backups/ | wc -l

# Check PM2 memory usage
pm2 monit

# Check for errors in logs
pm2 logs riderlabs --lines 1000 | grep -i error

# Update dependencies (if needed)
npm outdated
```

---

## 🔒 Security Checklist

- [ ] API keys stored in database (encrypted) or .env (not in code)
- [ ] Database files not publicly accessible
- [ ] SSL certificate valid and auto-renewing
- [ ] PM2 running as non-root user
- [ ] Firewall configured (ports 80, 443, 22 only)
- [ ] Regular backups (automated)
- [ ] Logs rotated (PM2 handles this)

---

## 📁 Important File Locations

### Production Server

```
/home/riderlabs/ai-fitness-coach/
├── server/
│   ├── fitness-coach.db          # Main database
│   ├── database.sqlite            # Admin database
│   └── uploads/                   # User uploads
├── dist/                          # Built frontend
├── backups/                       # Database backups
├── scripts/                       # Deployment scripts
└── .env                          # Environment variables
```

### Key Commands

```bash
# PM2 Management
pm2 status riderlabs              # Check status
pm2 logs riderlabs                # View logs
pm2 restart riderlabs             # Restart app
pm2 stop riderlabs                # Stop app
pm2 start riderlabs               # Start app
pm2 monit                         # Monitor resources

# Database
sqlite3 server/fitness-coach.db   # Open database
sqlite3 server/database.sqlite    # Open admin database

# Backups
./scripts/backup-db.sh            # Manual backup
ls -lh backups/                   # List backups

# Logs
pm2 logs riderlabs --lines 100    # Recent logs
pm2 logs riderlabs --err          # Error logs only
tail -f ~/.pm2/logs/riderlabs-error.log  # Follow errors
```

---

## 🆘 Emergency Contacts

**Server:** riderlabs@riderlabs.io  
**SSH:** `ssh riderlabs@riderlabs.io`  
**App Directory:** `/home/riderlabs/ai-fitness-coach`  
**PM2 Process:** `riderlabs`

---

## 📝 Deployment Log Template

Copy this for each deployment:

```
Date: YYYY-MM-DD HH:MM
Version: X.X.X
Deployed by: [Name]
Commit: [hash]

Changes:
- Feature 1
- Bug fix 2
- Update 3

Pre-deployment checks: ✅
Backup created: ✅
Deployment successful: ✅
Verification passed: ✅

Issues encountered: None / [Description]
Rollback needed: No / Yes [Reason]

Notes:
[Any additional notes]
```

---

## 🎓 Best Practices

1. **Always backup before deployment** - Automated in script
2. **Test locally first** - Catch issues early
3. **Deploy during low-traffic hours** - Minimize user impact
4. **Monitor for 30 minutes after deployment** - Catch issues quickly
5. **Keep deployment logs** - Useful for debugging
6. **Document issues** - Learn from mistakes
7. **Test rollback procedure** - Be prepared
8. **Keep backups for 30 days** - Safety net

---

## 🔄 Continuous Improvement

After each deployment, ask:
- What went well?
- What could be improved?
- Were there any surprises?
- How can we prevent issues?

Update this SOP with lessons learned.

---

**Last Successful Deployment:** [Date]  
**Next Scheduled Deployment:** [Date]  
**SOP Version:** 2.0
