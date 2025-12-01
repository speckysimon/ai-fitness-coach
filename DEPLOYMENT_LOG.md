# Deployment Log

Track all deployments, migrations, and pending changes for production releases.

---

## 📋 Current Status

**Last Deployed Commit:** `74322be` - "docs: Add TODO for light/dark mode logo variants" (2025-11-24)

**Pending Changes:** ✅ Yes - Multiple uncommitted changes ready for deployment

**Next Deployment:** Planned - AI Coach Modal + User Preferences Schema Update

---

## 🚀 Deployment History

### Deployment #1 - Password Reset Feature
- **Date:** 2025-11-24
- **Commit:** `445f244` - "feat: Add email-based password reset for user and admin portals"
- **Database Changes:** 
  - Added `password_resets` table
  - Added indexes for performance
- **Features:**
  - Email-based password reset for users
  - Email-based password reset for admin portal
  - Secure token generation and validation
- **Status:** ✅ Deployed to Production

---

## 📦 Pending Deployments

### Deployment #2 - AI Coach Modal + User Preferences (READY)
- **Planned Date:** TBD
- **Database Changes:**
  - Add `long_term_goal TEXT` to `user_preferences` table
  - Add `week_start_day TEXT DEFAULT 'Monday'` to `user_preferences` table
- **Features:**
  - AI Coach available as popup modal throughout app
  - Layout improvements and fixes
  - User preferences for long-term goals
  - Week start day configuration
- **Migration Required:** ✅ Yes - `002_add_user_preferences_fields.sql`
- **Files Changed:** 67 files modified
- **Risk Level:** 🟡 Medium (schema changes + extensive UI updates)
- **Status:** 🟡 Ready for deployment

### Deployment #3 - Demo Mode for Testing (PLANNED)
- **Planned Date:** After Deployment #2
- **Database Changes:**
  - Add `is_demo INTEGER DEFAULT 0` to `users` table
- **Features:**
  - Demo user accounts with mock Strava data
  - Bypass Strava 1-athlete API limit
  - Visual demo mode indicators
  - Mock activity data generator
- **Migration Required:** ✅ Yes - `003_add_demo_mode.sql`
- **Risk Level:** 🟢 Low (isolated feature, no impact on existing users)
- **Status:** 📝 Planning complete, awaiting implementation

---

## 🔄 Migration Tracking

### Applied Migrations
1. ✅ `001_password_resets.sql` - Password reset tables (2025-11-24)

### Pending Migrations
1. 🟡 `002_add_user_preferences_fields.sql` - User preferences schema update (Ready)
2. 📝 `003_add_demo_mode.sql` - Demo mode flag (Planned)

### Admin Migrations (Separate Database)
- ✅ `001_admin_password_resets.sql` - Admin password resets (2025-11-24)
- 🔍 Other admin migrations need review

---

## 📊 Uncommitted Changes Summary

**Total Files Modified:** 67

**Categories:**
- **Backend (Server):** 4 files
  - `server/schema.sql` - Database schema updates
  - `server/routes/auth.js` - Authentication updates
  - `server/routes/coach.js` - AI coach endpoints
  - `server/routes/strava.js` - Strava integration
  - `server/routes/training.js` - Training plan routes

- **Frontend (Components):** 18 files
  - AI Coach modal implementation
  - Layout improvements
  - Theme and styling updates
  - Settings page enhancements

- **Frontend (Pages):** 29 files
  - Dashboard updates
  - Settings page
  - Admin pages
  - Various UI improvements

- **Services & Utils:** 6 files
  - Plan service updates
  - Preferences service
  - Theme service
  - Activity matching

- **Configuration:** 2 files
  - `.env.example` - Environment variable documentation
  - `TODO.md` - Project todos

**New Files:**
- `src/components/CoachChatWidget.jsx` - AI Coach popup widget

---

## 🎯 Deployment Checklist Template

Use this checklist for each deployment:

### Pre-Deployment
- [ ] Review all uncommitted changes
- [ ] Create migration files for schema changes
- [ ] Test migrations on local database copy
- [ ] Update this deployment log
- [ ] Create git commit with clear message
- [ ] Tag release (e.g., `v1.2.0`)

### Deployment
- [ ] Backup production database
- [ ] Run migrations on production
- [ ] Deploy code changes
- [ ] Verify application starts successfully
- [ ] Test critical user flows

### Post-Deployment
- [ ] Monitor error logs
- [ ] Test key features in production
- [ ] Update deployment log with results
- [ ] Notify team of deployment

---

## 📝 Notes

- **Database Backup Strategy:** Automatic backups before each migration
- **Rollback Plan:** Keep previous deployment available for quick rollback
- **Migration Testing:** Always test on local database copy first
- **Deployment Window:** Prefer off-peak hours for deployments

---

**Last Updated:** 2025-12-01
**Maintained By:** Development Team
