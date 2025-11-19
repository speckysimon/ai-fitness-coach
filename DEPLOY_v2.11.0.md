# Deployment Guide - v2.11.0
**Date:** November 20, 2025  
**Version:** 2.11.0  
**Status:** Ready for Production Deployment

---

## 📋 Pre-Deployment Checklist

- [x] Code committed and pushed to GitHub
- [x] Version bumped to 2.11.0 in package.json
- [x] Changelog updated with all changes
- [x] Local testing completed
- [ ] Production backup created
- [ ] Database migration prepared
- [ ] Deployment script ready

---

## 🎯 What's Being Deployed

### **New Features**
1. **Ideas & Improvements Admin Panel**
   - Complete CRUD system for tracking feature requests
   - 5 stat cards (Total, Backlog, Planned, In Progress, Critical)
   - Advanced filtering by status, priority, category
   - Collapsible descriptions and tag display

2. **AI Coach Activity Analysis**
   - Analyze any ride with personalized AI coaching
   - Embedded in activity detail modal
   - Uses selected coach persona for personalized responses
   - Collapsible AI section with activity summary

3. **Training Plan Cross-Device Sync**
   - Fixed backend-first loading
   - Proper multi-device synchronization
   - Better logging for debugging

4. **Edit Button on All Activities**
   - Added edit functionality to all activities page
   - Consistent with dashboard UX

### **Technical Changes**
- Refactored `ideasService.cjs` from `sqlite3` to `better-sqlite3`
- Created `/api/coach/chat` endpoint with persona integration
- Added `coach.js` route with GPT-4o-mini
- Updated `ActivityDetailModal` with collapsible AI section
- Enhanced `planService.js` with backend-first loading
- Database: `ideas` table in admin database (`database.sqlite`)

### **Bug Fixes**
- Fixed 404 error when clicking "Ask AI Coach" button
- Fixed dark mode readability in AI response sections
- Fixed training plans not syncing across devices
- Fixed missing Edit button on All Activities page

---

## 🗄️ Database Changes

### **New Table: `ideas`**
**Location:** `server/database.sqlite` (admin database)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  scale TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'backlog',
  estimated_hours INTEGER,
  tags TEXT,
  source TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_priority ON ideas(priority);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
```

**Migration File:** `server/admin-schema-ideas.sql`

---

## 🚀 Deployment Steps

### **1. Backup Production Database**
```bash
ssh riderlabs@riderlabs.io
cd /home/riderlabs/ai-fitness-coach
cp server/database.sqlite server/database.sqlite.backup-$(date +%Y%m%d-%H%M%S)
cp server/fitness-coach.db server/fitness-coach.db.backup-$(date +%Y%m%d-%H%M%S)
```

### **2. Pull Latest Code**
```bash
cd /home/riderlabs/ai-fitness-coach
git fetch origin
git pull origin main
```

### **3. Install Dependencies**
```bash
npm install
```

### **4. Run Database Migration**
```bash
sqlite3 server/database.sqlite < server/admin-schema-ideas.sql
```

**Verify migration:**
```bash
sqlite3 server/database.sqlite "SELECT name FROM sqlite_master WHERE type='table' AND name='ideas';"
```

Expected output: `ideas`

### **5. Seed Initial Ideas**
```bash
node server/seedIdeas.cjs
```

**Verify seed:**
```bash
sqlite3 server/database.sqlite "SELECT COUNT(*) FROM ideas;"
```

Expected output: `17` (or number of ideas in TODO.md)

### **6. Build Frontend**
```bash
npm run build
```

### **7. Restart Server**
```bash
pm2 restart riderlabs
```

### **8. Verify Deployment**
```bash
pm2 status riderlabs
pm2 logs riderlabs --lines 50
```

**Check for:**
- ✅ Server running on port 5001
- ✅ Database initialized
- ✅ API keys loaded
- ✅ No errors in logs

### **9. Test in Browser**
Visit: https://riderlabs.io

**Test:**
1. **Ideas Admin Panel** - https://riderlabs.io/admin/ideas
   - Should show 17 ideas
   - Test filtering by status, priority, category
   - Test editing an idea
   - Test creating a new idea

2. **Activity Analysis**
   - Click on any activity
   - Click Brain icon
   - AI Coach Analysis section should expand
   - Ask a question
   - Should get personalized response from selected coach

3. **Training Plan Sync**
   - Check browser console for sync logs
   - Verify plan loads from backend
   - Test on mobile device (should sync)

4. **All Activities Edit**
   - Go to /activities
   - Verify Edit button appears on Strava activities
   - Test editing an activity

---

## 🔄 Rollback Plan

If issues occur:

### **1. Rollback Code**
```bash
cd /home/riderlabs/ai-fitness-coach
git reset --hard HEAD~1
npm run build
pm2 restart riderlabs
```

### **2. Rollback Database**
```bash
cd /home/riderlabs/ai-fitness-coach
# Find latest backup
ls -lh server/*.backup-*

# Restore (replace TIMESTAMP with actual timestamp)
cp server/database.sqlite.backup-TIMESTAMP server/database.sqlite
```

### **3. Verify Rollback**
```bash
pm2 logs riderlabs --lines 20
```

---

## 📊 Post-Deployment Monitoring

### **Check Logs**
```bash
pm2 logs riderlabs --lines 100
```

### **Monitor Performance**
```bash
pm2 monit
```

### **Check Database Size**
```bash
ls -lh server/database.sqlite
ls -lh server/fitness-coach.db
```

### **Test API Endpoints**
```bash
# Health check
curl https://riderlabs.io/api/health

# Ideas endpoint (requires admin auth)
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://riderlabs.io/api/admin/ideas

# Coach chat endpoint (requires user auth)
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -d '{"message":"Test","coachId":"coach-alex"}' \
  https://riderlabs.io/api/coach/chat
```

---

## 🐛 Known Issues

None at this time.

---

## 📝 Notes

- **Database Parity:** All services now use `better-sqlite3` for consistency
- **Coach Personas:** AI responses use selected coach persona for personalization
- **Cross-Device Sync:** Training plans now properly sync via backend database
- **Admin Panel:** Ideas panel is fully functional and ready for production use

---

## ✅ Success Criteria

- [ ] Server starts without errors
- [ ] Ideas admin panel loads with 17 seeded ideas
- [ ] Activity analysis works with AI coach responses
- [ ] Training plans sync across devices
- [ ] Edit button appears on all activities page
- [ ] No console errors in browser
- [ ] Dark mode works correctly
- [ ] All API endpoints respond correctly

---

## 📞 Support

If issues arise:
1. Check PM2 logs: `pm2 logs riderlabs`
2. Check browser console for errors
3. Verify database migration completed
4. Test API endpoints individually
5. Rollback if necessary

---

**Deployment prepared by:** Cascade AI  
**Deployment date:** November 20, 2025  
**Estimated time:** 15-20 minutes
