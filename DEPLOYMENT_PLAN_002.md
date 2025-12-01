# Deployment Plan #002 - AI Coach Modal + User Preferences

**Deployment Date:** TBD  
**Prepared:** 2025-12-01  
**Risk Level:** 🟡 Medium  
**Estimated Downtime:** < 5 minutes

---

## 📋 Overview

Deploy AI Coach modal feature and user preferences schema updates. This includes extensive UI improvements and two new database columns.

---

## 🎯 Objectives

1. ✅ Add AI Coach popup modal throughout the application
2. ✅ Update user preferences schema for long-term goals and week start day
3. ✅ Deploy layout improvements and fixes
4. ✅ Ensure zero data loss and backward compatibility

---

## 🗄️ Database Changes

### Schema Modifications

**Table:** `user_preferences`

**Changes:**
```sql
ALTER TABLE user_preferences ADD COLUMN long_term_goal TEXT;
ALTER TABLE user_preferences ADD COLUMN week_start_day TEXT DEFAULT 'Monday';
```

**Impact:**
- ✅ **Safe:** Only adding columns with defaults
- ✅ **Backward Compatible:** Existing code will work
- ✅ **No Data Loss:** All existing data preserved
- ✅ **Automatic Defaults:** New columns auto-populate for existing users

### Migration File

**File:** `migrations/002_add_user_preferences_fields.sql`

**Content:**
```sql
-- Migration: Add long_term_goal and week_start_day to user_preferences
-- Date: 2025-12-01
-- Risk: Low - Adding columns with defaults

-- Add long-term goal field
ALTER TABLE user_preferences ADD COLUMN long_term_goal TEXT;

-- Add week start day field with default
ALTER TABLE user_preferences ADD COLUMN week_start_day TEXT DEFAULT 'Monday';

-- Verify columns were added
SELECT COUNT(*) as verification 
FROM pragma_table_info('user_preferences') 
WHERE name IN ('long_term_goal', 'week_start_day');
-- Expected result: 2
```

---

## 📦 Code Changes

### Backend Changes (4 files)

1. **server/schema.sql**
   - Add `long_term_goal` and `week_start_day` columns
   - Update schema version to 2.8.4

2. **server/routes/auth.js**
   - Authentication improvements

3. **server/routes/coach.js**
   - AI coach endpoint updates
   - Support for coach modal

4. **server/routes/strava.js**
   - Strava integration improvements

### Frontend Changes (63 files)

**New Components:**
- `src/components/CoachChatWidget.jsx` - AI Coach popup modal

**Modified Components (18 files):**
- AI Coach modal integration
- Layout improvements
- Theme and styling updates
- Settings page enhancements

**Modified Pages (29 files):**
- Dashboard, Settings, Admin pages
- Various UI improvements

**Services & Utils (6 files):**
- Plan service, Preferences service
- Theme service, Activity matching

---

## 🚀 Deployment Steps

### Phase 1: Pre-Deployment (Local Testing)

1. **Create Migration File**
   ```bash
   # Create migration file
   cat > migrations/002_add_user_preferences_fields.sql << 'EOF'
   -- Migration content here
   EOF
   ```

2. **Test Migration Locally**
   ```bash
   # Backup local database
   cp server/fitness-coach.db server/fitness-coach.db.backup
   
   # Test migration
   sqlite3 server/fitness-coach.db < migrations/002_add_user_preferences_fields.sql
   
   # Verify columns added
   sqlite3 server/fitness-coach.db "PRAGMA table_info(user_preferences);"
   ```

3. **Test Application Locally**
   ```bash
   # Start dev server
   npm run dev
   
   # Test:
   # - AI Coach modal opens
   # - Settings page loads
   # - Long-term goal can be saved
   # - Week start day can be changed
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add AI Coach modal and user preferences updates

   - Add AI Coach popup modal throughout app
   - Add long_term_goal and week_start_day to user_preferences
   - Improve layouts and UI consistency
   - Update Settings page with new preferences
   
   Database changes:
   - Migration 002: Add user_preferences fields
   
   Closes #XXX"
   
   git tag v1.3.0
   ```

### Phase 2: Production Deployment

1. **Backup Production Database**
   ```bash
   # SSH to production server
   ssh user@production-server
   
   # Create timestamped backup
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   cp /path/to/fitness-coach.db /path/to/backups/fitness-coach_${TIMESTAMP}.db
   
   # Verify backup
   ls -lh /path/to/backups/fitness-coach_${TIMESTAMP}.db
   ```

2. **Run Migration**
   ```bash
   # Apply migration
   sqlite3 /path/to/fitness-coach.db < migrations/002_add_user_preferences_fields.sql
   
   # Verify migration
   sqlite3 /path/to/fitness-coach.db "PRAGMA table_info(user_preferences);"
   ```

3. **Deploy Code**
   ```bash
   # Pull latest code
   git pull origin main
   
   # Install dependencies (if any new ones)
   npm install
   
   # Build frontend
   npm run build
   
   # Restart server
   pm2 restart fitness-coach
   # OR
   systemctl restart fitness-coach
   ```

4. **Verify Deployment**
   ```bash
   # Check server is running
   pm2 status
   
   # Check logs for errors
   pm2 logs fitness-coach --lines 50
   
   # Test application
   curl https://your-domain.com/api/health
   ```

### Phase 3: Post-Deployment Verification

1. **Test Critical Flows**
   - [ ] Login works
   - [ ] Dashboard loads
   - [ ] AI Coach modal opens and responds
   - [ ] Settings page loads
   - [ ] Long-term goal can be saved
   - [ ] Week start day can be changed
   - [ ] Strava integration still works

2. **Monitor Logs**
   ```bash
   # Watch logs for 5 minutes
   pm2 logs fitness-coach --lines 100
   ```

3. **Update Deployment Log**
   - Mark deployment as complete in `DEPLOYMENT_LOG.md`
   - Note any issues encountered
   - Document resolution steps

---

## 🔄 Rollback Plan

If issues occur, rollback using these steps:

### Option 1: Quick Rollback (Code Only)
```bash
# Revert to previous commit
git revert HEAD
npm run build
pm2 restart fitness-coach
```

### Option 2: Full Rollback (Code + Database)
```bash
# Restore database backup
TIMESTAMP=<backup_timestamp>
cp /path/to/backups/fitness-coach_${TIMESTAMP}.db /path/to/fitness-coach.db

# Revert code
git revert HEAD
npm run build
pm2 restart fitness-coach
```

**Note:** Database rollback is safe because we only added columns. Removing them won't break existing functionality.

---

## ⚠️ Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration fails | High | Test locally first, have backup ready |
| New columns cause errors | Medium | Use defaults, test thoroughly |
| UI breaks on mobile | Low | Responsive design tested locally |
| AI Coach modal doesn't load | Medium | Graceful fallback, error handling |

---

## 📊 Success Criteria

- ✅ Migration completes without errors
- ✅ All existing users can login
- ✅ AI Coach modal works on all pages
- ✅ Settings page shows new preferences
- ✅ No errors in production logs
- ✅ Database backup created successfully

---

## 📞 Emergency Contacts

- **Developer:** [Your contact]
- **Server Admin:** [Admin contact]
- **Backup Location:** `/path/to/backups/`

---

## 📝 Post-Deployment Notes

_To be filled after deployment:_

**Deployment Date:** ___________  
**Deployment Time:** ___________  
**Deployed By:** ___________  
**Issues Encountered:** ___________  
**Resolution Steps:** ___________  
**Final Status:** ⬜ Success ⬜ Partial ⬜ Rolled Back

---

**Prepared By:** AI Assistant  
**Reviewed By:** ___________  
**Approved By:** ___________
