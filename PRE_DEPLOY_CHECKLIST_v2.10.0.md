# Pre-Deployment Checklist - v2.10.0

**Version**: 2.10.0  
**Date**: November 18, 2025  
**Feature**: Feedback Management System

---

## ✅ Code Preparation

### 1. Git Status
- [ ] All changes committed
- [ ] Working directory clean
- [ ] No untracked files (except local configs)
- [ ] Branch is up to date with remote

**Run:**
```bash
git status
git log -1 --oneline
```

### 2. Version Numbers Updated
- [ ] `package.json` version: 2.10.0
- [ ] `ChangelogPage.jsx` updated with v2.10.0
- [ ] `AdminChangelog.jsx` updated (if exists)

**Verify:**
```bash
grep '"version"' package.json
grep "version: '2.10" src/pages/ChangelogPage.jsx
```

### 3. New Files Included
- [ ] `src/pages/admin/FeedbackManagement.jsx` exists
- [ ] `FEEDBACK_ADMIN_IMPLEMENTATION.md` exists
- [ ] `DEPLOYMENT_GUIDE_v2.10.0.md` exists
- [ ] `deploy-v2.10.0.sh` exists and is executable

**Verify:**
```bash
ls -la src/pages/admin/FeedbackManagement.jsx
ls -la FEEDBACK_ADMIN_IMPLEMENTATION.md
ls -la DEPLOYMENT_GUIDE_v2.10.0.md
ls -la deploy-v2.10.0.sh
```

### 4. Modified Files Correct
- [ ] `src/App.jsx` has FeedbackManagement import and route
- [ ] `src/pages/admin/AdminLayout.jsx` has feedback nav item
- [ ] `server/routes/feedback.js` has DELETE endpoint

**Verify:**
```bash
grep "FeedbackManagement" src/App.jsx
grep "feedback" src/pages/admin/AdminLayout.jsx
grep "router.delete" server/routes/feedback.js
```

---

## 🧪 Local Testing

### 5. Development Build Works
- [ ] `npm run dev` starts without errors
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:5001
- [ ] No console errors

**Run:**
```bash
npm run dev
# Open http://localhost:3000
# Check browser console (F12)
```

### 6. Production Build Works
- [ ] `npm run build` completes successfully
- [ ] No build errors or warnings
- [ ] `dist/` directory created
- [ ] Assets properly bundled

**Run:**
```bash
npm run build
ls -la dist/
```

### 7. Admin Panel Accessible
- [ ] Can login to admin panel
- [ ] Feedback nav item visible in sidebar
- [ ] Feedback page loads without errors
- [ ] All components render correctly

**Test:**
```
1. Navigate to http://localhost:3000/admin/login
2. Login with admin credentials
3. Click "Feedback" in sidebar
4. Verify page loads
```

### 8. Feedback Management Features Work
- [ ] Dashboard stats display correctly
- [ ] Category breakdown shows
- [ ] Filters work (status, category, rating)
- [ ] Can click feedback to open detail modal
- [ ] Can update status
- [ ] Can delete feedback
- [ ] Refresh button works

**Test each feature manually**

### 9. User Feedback Widget Works
- [ ] Feedback button visible on main site
- [ ] Can open feedback modal
- [ ] Can submit feedback
- [ ] Feedback appears in admin panel

**Test:**
```
1. Navigate to http://localhost:3000
2. Click feedback button (bottom right)
3. Submit test feedback
4. Check admin panel for new feedback
```

---

## 🗄️ Database Preparation

### 10. Database Schema Verified
- [ ] Feedback table exists in local database
- [ ] All required columns present
- [ ] Can query feedback table successfully

**Verify:**
```bash
sqlite3 fitness-coach.db "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback';"
sqlite3 fitness-coach.db "PRAGMA table_info(feedback);"
```

### 11. Test Data Present
- [ ] At least 5 test feedback entries exist
- [ ] Different statuses represented (new, in_progress, resolved)
- [ ] Different categories represented
- [ ] Different ratings represented

**Verify:**
```bash
sqlite3 fitness-coach.db "SELECT COUNT(*) FROM feedback;"
sqlite3 fitness-coach.db "SELECT status, COUNT(*) FROM feedback GROUP BY status;"
```

---

## 📦 Dependencies

### 12. Dependencies Up to Date
- [ ] `npm install` runs without errors
- [ ] No security vulnerabilities (or acceptable)
- [ ] No deprecated packages (or acceptable)

**Run:**
```bash
npm install
npm audit
```

### 13. Node Version Compatible
- [ ] Node version >= 18.0.0
- [ ] npm version >= 9.0.0

**Verify:**
```bash
node --version
npm --version
```

---

## 🔐 Security

### 14. No Sensitive Data in Code
- [ ] No API keys hardcoded
- [ ] No passwords in code
- [ ] No database credentials in code
- [ ] `.env` file not committed

**Verify:**
```bash
git log --all --full-history -- .env
grep -r "sk-" src/ server/ --exclude-dir=node_modules
```

### 15. Admin Authentication Working
- [ ] Admin login requires valid credentials
- [ ] JWT tokens expire correctly
- [ ] Cannot access admin without token
- [ ] Logout clears tokens

**Test manually**

---

## 📝 Documentation

### 16. Documentation Complete
- [ ] `DEPLOYMENT_GUIDE_v2.10.0.md` complete
- [ ] `FEEDBACK_ADMIN_IMPLEMENTATION.md` complete
- [ ] `README.md` updated (if needed)
- [ ] Changelog updated

**Verify:**
```bash
ls -la DEPLOYMENT_GUIDE_v2.10.0.md
ls -la FEEDBACK_ADMIN_IMPLEMENTATION.md
```

### 17. Deployment Scripts Ready
- [ ] `deploy-v2.10.0.sh` executable
- [ ] Script paths correct for production
- [ ] Backup commands included
- [ ] Rollback plan documented

**Verify:**
```bash
ls -la deploy-v2.10.0.sh
head -20 deploy-v2.10.0.sh
```

---

## 🚀 Git & GitHub

### 18. Git Repository Clean
- [ ] All changes committed
- [ ] Commit messages clear and descriptive
- [ ] No merge conflicts
- [ ] Branch up to date

**Run:**
```bash
git status
git log -5 --oneline
```

### 19. Ready to Push
- [ ] Changes reviewed
- [ ] Tests passed
- [ ] Ready to push to main branch

**Run:**
```bash
git diff origin/main
```

---

## 🎯 Final Checks

### 20. Deployment Plan Clear
- [ ] Know which server to deploy to
- [ ] Have SSH access to server
- [ ] Know service restart command
- [ ] Have rollback plan ready

### 21. Backup Plan Ready
- [ ] Know how to backup database
- [ ] Know how to backup code
- [ ] Know where backups are stored
- [ ] Tested restore process

### 22. Monitoring Plan
- [ ] Know how to check logs
- [ ] Know how to check service status
- [ ] Have error alerting set up (or manual check plan)
- [ ] Know who to contact if issues arise

### 23. Test User Plan
- [ ] List of 5-10 test users ready
- [ ] Test user invitation message prepared
- [ ] Feedback collection method ready
- [ ] Timeline for test period defined

---

## ✅ Ready to Deploy?

**All checkboxes checked?**

- [ ] **YES** - Proceed with deployment
- [ ] **NO** - Complete remaining items first

---

## 🚀 Deployment Commands

Once all checks pass, run these commands:

### On Local Machine:
```bash
# Commit and push
git add .
git commit -m "Release v2.10.0 - Feedback Management System"
git push origin main
```

### On Production Server:
```bash
# SSH into server
ssh riderlabs@riderlabs.io

# Run deployment script
cd /var/www/riderlabs.io
./deploy-v2.10.0.sh
```

---

## 📋 Post-Deployment

After deployment, complete these tasks:

- [ ] Run full verification checklist (see DEPLOYMENT_GUIDE_v2.10.0.md)
- [ ] Test all features on live site
- [ ] Invite test users
- [ ] Monitor for first 24 hours
- [ ] Document any issues found
- [ ] Plan next iteration based on feedback

---

**Checklist Completed By**: _______________  
**Date**: _______________  
**Ready to Deploy**: ⬜ Yes / ⬜ No  
**Notes**: _______________
