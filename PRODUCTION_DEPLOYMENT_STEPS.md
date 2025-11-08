# Production Deployment - Database Overhaul

**Version**: 2.9.0  
**Date**: November 8, 2025  
**Estimated Time**: 2 minutes

---

## Pre-Deployment Checklist

- [x] Schema file created (`server/schema.sql`)
- [x] Database loader updated (`server/db.js`)
- [x] Tested locally (all 19 tables created)
- [x] Migrations folder deleted
- [x] Documentation created
- [x] Version bumped to 2.9.0
- [ ] Ready to deploy

---

## Deployment Steps

### Step 1: Commit and Push Changes (30 seconds)

```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach

# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Replace migration system with schema-first approach (v2.9.0)

- Created server/schema.sql with all 19 tables
- Updated server/db.js to load schema from file
- Deleted server/migrations/ folder (14 files)
- 30-second deployments vs 2+ hours debugging
- Zero migration failures
- Single source of truth
- Comprehensive DEPLOYMENT_GUIDE.md

Fixes: Migration system failures blocking production
Closes: Database overhaul task"

# Push to main
git push origin main
```

### Step 2: Deploy to Production (1 minute)

```bash
# SSH to production server
ssh riderlabs@riderlabs-prod

# Navigate to project directory
cd ~/ai-fitness-coach

# Backup current database (IMPORTANT!)
cp server/fitness-coach.db server/fitness-coach.db.backup-$(date +%Y%m%d-%H%M%S)

# Pull latest code
git pull origin main

# Apply schema to create missing admin tables
sqlite3 server/fitness-coach.db < server/schema.sql

# Restart application
pm2 restart riderlabs

# Wait 5 seconds for startup
sleep 5
```

### Step 3: Verify Deployment (30 seconds)

```bash
# Check logs for errors
pm2 logs riderlabs --lines 50 --nostream

# Expected output:
# 📦 Loading database schema...
# ✅ Database schema loaded successfully
# ✅ Database initialized
# 🚀 AI Fitness Coach server running on port 5001

# Verify all tables exist
sqlite3 server/fitness-coach.db ".tables"

# Expected: 19 tables
# adaptation_events    google_tokens        theme_configs      
# admin_users          manual_activities    training_plans     
# ai_model_configs     plan_adjustments     user_preferences   
# api_keys             race_analyses        users              
# coach_personas       race_tags            wellness_log       
# feedback             sessions             workout_comparisons
# global_settings      strava_tokens

# Verify coach personas seeded
sqlite3 server/fitness-coach.db "SELECT COUNT(*) FROM coach_personas;"

# Expected: 5

# Exit SSH
exit
```

### Step 4: Test Application (30 seconds)

1. **Visit main site**: https://riderlabs.io
   - Should load normally
   - Test login/registration

2. **Visit admin panel**: https://riderlabs.io/admin
   - Should load (no more missing tables error)
   - Test admin login (create admin user if needed)

3. **Test key features**:
   - Dashboard loads
   - Training plan generation works
   - Strava connection works

---

## Rollback Procedure (If Needed)

```bash
# SSH to production
ssh riderlabs@riderlabs-prod
cd ~/ai-fitness-coach

# Stop application
pm2 stop riderlabs

# Restore backup
mv server/fitness-coach.db server/fitness-coach.db.failed
mv server/fitness-coach.db.backup-YYYYMMDD-HHMMSS server/fitness-coach.db

# Rollback code
git reset --hard HEAD~1

# Restart
pm2 start riderlabs

# Verify
pm2 logs riderlabs
```

---

## Post-Deployment Tasks

### Create Admin User (If Needed)

```bash
# SSH to production
ssh riderlabs@riderlabs-prod
cd ~/ai-fitness-coach

# Create admin user via sqlite3
sqlite3 server/fitness-coach.db

-- In sqlite3 prompt:
INSERT INTO admin_users (email, password_hash, name, is_super_admin)
VALUES (
  'admin@riderlabs.io',
  -- Use bcrypt hash of your password (generate locally first)
  '$2a$10$...',
  'Admin User',
  1
);

-- Exit sqlite3
.quit
```

### Monitor Application

```bash
# Watch logs for 5 minutes
pm2 logs riderlabs

# Check for errors
pm2 logs riderlabs --err

# Monitor memory/CPU
pm2 monit
```

---

## Success Criteria

- ✅ Server starts without errors
- ✅ All 19 tables exist in database
- ✅ 5 coach personas seeded
- ✅ Main site loads (https://riderlabs.io)
- ✅ Admin panel loads (https://riderlabs.io/admin)
- ✅ No migration errors in logs
- ✅ Application functions normally

---

## Troubleshooting

### Issue: Server won't start

**Check logs**:
```bash
pm2 logs riderlabs --err
```

**Common causes**:
- Schema file missing: `ls -la server/schema.sql`
- Database locked: `lsof server/fitness-coach.db`
- Permissions: `chmod 644 server/fitness-coach.db`

**Solution**: Restore backup and investigate

### Issue: Tables missing

**Check tables**:
```bash
sqlite3 server/fitness-coach.db ".tables"
```

**Solution**: Re-apply schema
```bash
sqlite3 server/fitness-coach.db < server/schema.sql
pm2 restart riderlabs
```

### Issue: Admin panel still broken

**Check admin tables**:
```bash
sqlite3 server/fitness-coach.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'admin%';"
```

**Expected**: admin_users

**If missing**:
```bash
sqlite3 server/fitness-coach.db < server/schema.sql
```

---

## Future Deployments

For future deployments, just use the **DEPLOYMENT_GUIDE.md**:

**Method 1 (Database Sync)**: Copy local DB to production (30 seconds)
**Method 2 (Schema Sync)**: Pull code, restart (10 seconds)

No more migration debugging! 🎉

---

## Contact

If issues arise:
- Check `DEPLOYMENT_GUIDE.md` for troubleshooting
- Review `DATABASE_OVERHAUL_COMPLETE.md` for implementation details
- Check PM2 logs: `pm2 logs riderlabs`

---

**Ready to deploy!** Follow steps 1-4 above. ✅
