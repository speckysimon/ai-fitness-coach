# 🚀 Deployment Guide - v2.11.1

**Date:** November 20, 2025  
**Version:** 2.11.1  
**Type:** Bug Fix Release  
**Estimated Time:** 3-5 minutes

---

## 📋 What's Being Deployed

### **v2.11.1 - Critical Timezone Bug Fix** 🐛

**Issue Fixed:**
- Activity Match Modal was showing wrong date (Friday instead of Thursday)
- Activities were being matched correctly but modal displayed "No Activities Found"
- Root cause: JavaScript timezone conversion when parsing `YYYY-MM-DD` date strings

**Solution:**
- Parse dates explicitly as UTC to prevent timezone shifts
- Match Strava date field handling with `activityMatching.js` logic
- Display dates with `timeZone: 'UTC'` option

**Impact:**
- ✅ Modal shows correct date matching the session
- ✅ Activities display properly in modal
- ✅ Works correctly across all timezones

**Files Changed:**
- `src/components/ActivityMatchModal.jsx` (3 fixes)
- `CHANGELOG.md` (added v2.11.1 entry)
- `package.json` (bumped to 2.11.1)

---

### **v2.11.0 - Features from Yesterday** ✨

These were deployed yesterday but are included for reference:

1. **Ideas & Improvements Admin Panel**
   - Complete CRUD system for feature tracking
   - 5 stat cards, advanced filtering
   - Database: `ideas` table in `database.sqlite`

2. **AI Coach Activity Analysis**
   - Brain icon opens detail modal with AI section
   - Uses selected coach persona
   - Endpoint: `POST /api/coach/chat`

3. **Training Plan Cross-Device Sync**
   - Backend-first loading priority
   - Comprehensive logging

4. **Edit Button on All Activities**
   - Consistent UX with Dashboard

---

## 🎯 Deployment Steps

### **Step 1: SSH into Production**
```bash
ssh riderlabs@riderlabs.io
```

### **Step 2: Navigate to App Directory**
```bash
cd /home/riderlabs/ai-fitness-coach
```

### **Step 3: Run Automated Deployment**
```bash
./scripts/prod-deploy.sh
```

The script will automatically:
1. ✅ Check prerequisites (PM2, Node.js, SQLite3)
2. 📦 Backup databases (atomic, includes WAL)
3. 🔄 Pull latest code (commit `9aedc82`)
4. 📦 Install dependencies
5. 🏗️  Build frontend
6. 🗄️  Run migrations (none for this release)
7. 🔄 Restart PM2
8. ✅ Verify deployment

**Estimated Time:** 3-5 minutes

---

## ✅ Post-Deployment Verification

### **1. Check PM2 Status**
```bash
pm2 status riderlabs
```
Should show: `status: online` ✅

### **2. Check Logs (No Errors)**
```bash
pm2 logs riderlabs --lines 50
```
Look for:
- ✅ "Server running on port 5001"
- ✅ "Database initialized"
- ❌ No error messages

### **3. Test the Timezone Fix** ⭐ CRITICAL TEST

Visit: https://riderlabs.io

1. **Login** to your account
2. **Go to Training Plan** (AI Coach page)
3. **Find a session with an automatic match** (yellow "Activity found" badge)
4. **Click "View Match"** button
5. **Verify:**
   - ✅ Modal shows **correct date** (matches session day)
   - ✅ Matched activity **appears in the list**
   - ✅ Activity details are visible
   - ✅ Can select/confirm the match

**Before Fix:** Modal showed Friday, Nov 20 (wrong date), "No Activities Found"  
**After Fix:** Modal shows Thursday, Nov 19 (correct date), activity visible

### **4. Test Other Features**

Quick smoke tests:
- [ ] Dashboard loads
- [ ] Activities page loads
- [ ] Training plan displays
- [ ] AI Coach works
- [ ] Admin panel loads (if admin)
- [ ] No console errors

---

## 🔄 If Something Goes Wrong

### **Quick Rollback**
```bash
# Get previous commit (before timezone fix)
git log --oneline -5

# Reset to previous commit (6e20e77)
git reset --hard 6e20e77

# Reinstall and rebuild
npm install --production
npm run build

# Restart
pm2 restart riderlabs
```

### **Restore Database Backup**
```bash
# Stop PM2
pm2 stop riderlabs

# List backups
ls -lh backups/

# Restore from backup (use latest timestamp)
cp backups/fitness-coach_TIMESTAMP.db server/fitness-coach.db
cp backups/database_TIMESTAMP.sqlite server/database.sqlite

# Restart
pm2 start riderlabs
```

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ PM2 shows `online` status
- ✅ No errors in logs
- ✅ Activity Match Modal shows **correct date**
- ✅ Matched activities **appear in modal**
- ✅ Modal works across all timezones
- ✅ All other features work normally

---

## 📊 Deployment Checklist

**Pre-Deployment:**
- [x] Code committed and pushed to GitHub
- [x] Version bumped to 2.11.1
- [x] CHANGELOG.md updated
- [x] Local testing complete
- [x] Deployment guide created

**During Deployment:**
- [ ] SSH into production
- [ ] Run deployment script
- [ ] Monitor for errors
- [ ] Verify PM2 status

**Post-Deployment:**
- [ ] Test timezone fix (critical)
- [ ] Test activity matching
- [ ] Test other features
- [ ] Monitor logs for 15 minutes
- [ ] Update deployment log

---

## 📝 Deployment Log Template

```
Date: 2025-11-20
Time: [HH:MM]
Version: 2.11.1
Deployed by: [Name]
Commit: 9aedc82

Changes:
- Fixed timezone bug in Activity Match Modal
- Modal now shows correct date across all timezones
- Activities display properly in modal

Pre-deployment checks: ✅
Backup created: ✅
Deployment successful: ✅
Verification passed: ✅

Timezone fix tested: ✅
Issues encountered: [None / Description]
Rollback needed: [No / Yes + Reason]

Notes:
[Any additional observations]
```

---

## 🆘 Need Help?

**Documentation:**
- `DEPLOY_NOW.md` - Quick deployment reference
- `PRODUCTION_DEPLOY_SOP.md` - Complete SOP
- `DEPLOYMENT_GUIDE_V2.md` - Comprehensive guide

**Server Info:**
- SSH: `ssh riderlabs@riderlabs.io`
- App Dir: `/home/riderlabs/ai-fitness-coach`
- PM2 Process: `riderlabs`
- Logs: `pm2 logs riderlabs`

**Commit Info:**
- Previous: `6e20e77` (v2.11.0)
- Current: `9aedc82` (v2.11.1)
- Branch: `main`

---

## 🎯 Ready to Deploy!

```bash
ssh riderlabs@riderlabs.io
cd /home/riderlabs/ai-fitness-coach
./scripts/prod-deploy.sh
```

**Time:** 3-5 minutes  
**Risk:** Minimal (bug fix only, no database changes)  
**Confidence:** HIGH ✅

---

**Good luck! 🚀**
