# Deployment Guide - Version 2.9.0

**Date**: November 8, 2025  
**Version**: 2.9.0 (App) / 1.3.0 (Admin)

---

## 🚀 What's New in This Release

### Major Features
- ✅ **Onboarding Modal** - 5-step guided flow for new users
- ✅ **Mobile-Ready Dashboard** - Fully responsive design (320px+)
- ✅ **Admin Panel UI Separation** - Dedicated light-theme components
- ✅ **Coach Selection** - Choose from 5 AI personas during onboarding

### Critical Fixes
- ✅ Admin panel dark mode styling issues resolved
- ✅ Dashboard userProfile undefined error fixed
- ✅ Mobile layout issues fixed
- ✅ Button text visibility in admin panel fixed

---

## 📋 Pre-Deployment Checklist

### 1. Database Migrations Required
The following migrations need to be run on the live database:

**Existing Migrations (if not already run):**
- `007_add_admin_system.cjs` - Admin user system
- `007_add_coach_personas.cjs` - Coach personas table
- `008_add_season_races.cjs` - Season and races tracking
- `008_add_token_tracking.cjs` - AI token usage tracking
- `009_add_plan_templates.cjs` - Training plan templates
- `010_add_more_plan_templates.cjs` - Additional templates
- `010_add_theme_configs.cjs` - Theme configuration system
- `run-oauth-migration.cjs` - OAuth credentials migration

**Check Migration Status:**
```bash
# On live server
cd /var/www/riderlabs.io
node server/migrations/check-migrations.js
```

**Run Pending Migrations:**
```bash
# On live server
cd /var/www/riderlabs.io
node server/migrations/run-all-migrations.js
```

### 2. New Files Created
The following new files will be deployed:

**Components:**
- `src/components/ui/AdminCard.jsx` - Admin-only card component
- `src/components/ui/AdminButton.jsx` - Admin-only button component
- `src/components/OnboardingModal.jsx` - New user onboarding flow

**Documentation:**
- `ADMIN_UI_SEPARATION.md` - Admin UI implementation details
- `DEPLOYMENT_GUIDE_v2.9.0.md` - This file

### 3. Modified Files (Key Changes)
- `src/pages/Dashboard.jsx` - Added userProfile state, mobile responsive
- `src/pages/ChangelogPage.jsx` - Updated to v2.9.0
- `src/pages/admin/AdminChangelog.jsx` - Updated to v1.3.0
- All 14 admin pages - Now use AdminCard/AdminButton

---

## 🔧 Deployment Steps

### Step 1: Backup Current Production

```bash
# SSH into live server
ssh user@riderlabs.io

# Backup database
cd /var/www/riderlabs.io
mysqldump -u [username] -p riderlabs_db > backups/riderlabs_$(date +%Y%m%d_%H%M%S).sql

# Backup current code
tar -czf backups/code_$(date +%Y%m%d_%H%M%S).tar.gz .
```

### Step 2: Pull Latest Code from Git

```bash
# On live server
cd /var/www/riderlabs.io
git fetch origin
git pull origin main
```

### Step 3: Install Dependencies

```bash
# Check for new npm packages
npm install

# If any new dependencies were added
npm ci --production
```

### Step 4: Run Database Migrations

```bash
# Run migration script
node server/migrations/run-all-migrations.js

# Verify migrations completed
node server/migrations/check-migrations.js
```

### Step 5: Build Frontend

```bash
# Build production assets
npm run build

# Verify build completed successfully
ls -la dist/
```

### Step 6: Restart Services

```bash
# Restart Node.js application
pm2 restart riderlabs

# Or if using systemd
sudo systemctl restart riderlabs

# Check status
pm2 status
# or
sudo systemctl status riderlabs
```

### Step 7: Clear Caches

```bash
# Clear any cached data
redis-cli FLUSHALL  # If using Redis

# Clear browser cache recommendation for users
# (Add notice in app if needed)
```

---

## ✅ Post-Deployment Verification

### 1. Test Core Functionality

**Dashboard:**
- [ ] Dashboard loads without errors
- [ ] Metrics display correctly
- [ ] Mobile view works (test on phone)
- [ ] Onboarding modal shows for new users

**Admin Panel:**
- [ ] Admin login works
- [ ] All admin pages display with light theme
- [ ] No dark mode styling visible
- [ ] Buttons are readable and functional

**Onboarding Flow:**
- [ ] Modal appears for new users
- [ ] Step 1: Welcome screen displays
- [ ] Step 2: Strava connection works
- [ ] Step 3: Coach selection works
- [ ] Step 4: Plan generation works
- [ ] Step 5: Success and navigation to plan

### 2. Check Browser Console

```javascript
// Should see no errors related to:
// - userProfile is not defined
// - planService import errors
// - Component rendering errors
```

### 3. Test Mobile Responsiveness

**Devices to Test:**
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad)
- [ ] Desktop (Chrome, Firefox, Safari)

**Key Areas:**
- [ ] Dashboard metrics cards
- [ ] Navigation menu
- [ ] Buttons (min 44px touch targets)
- [ ] Forms and inputs
- [ ] Onboarding modal

### 4. Database Verification

```sql
-- Check migrations table
SELECT * FROM migrations ORDER BY id DESC LIMIT 10;

-- Check coach personas exist
SELECT COUNT(*) FROM coach_personas;
-- Should return 5

-- Check admin users
SELECT COUNT(*) FROM admin_users;
-- Should return at least 1

-- Check theme configs
SELECT COUNT(*) FROM theme_configs;
-- Should return at least 1
```

---

## 🐛 Rollback Plan (If Needed)

### Quick Rollback

```bash
# On live server
cd /var/www/riderlabs.io

# Restore previous code
git reset --hard HEAD~1

# Restore database (if migrations were run)
mysql -u [username] -p riderlabs_db < backups/riderlabs_[timestamp].sql

# Rebuild and restart
npm run build
pm2 restart riderlabs
```

---

## 📊 Monitoring

### Key Metrics to Watch

**First 24 Hours:**
- Error rates in logs
- User registration completion rate
- Onboarding modal completion rate
- Mobile vs desktop traffic
- Admin panel usage

**Log Locations:**
```bash
# Application logs
tail -f /var/www/riderlabs.io/logs/app.log

# PM2 logs
pm2 logs riderlabs

# Nginx logs
tail -f /var/log/nginx/riderlabs-access.log
tail -f /var/log/nginx/riderlabs-error.log
```

---

## 🔍 Known Issues (Post-Deployment)

### None Currently Identified

All issues from previous version have been resolved:
- ✅ Admin panel styling
- ✅ Mobile readiness
- ✅ Onboarding modal
- ✅ Dashboard errors

---

## 📞 Support Contacts

**If Issues Arise:**
1. Check logs first (see Monitoring section)
2. Verify all migrations ran successfully
3. Check browser console for client-side errors
4. Review this deployment guide for missed steps

**Emergency Rollback:**
If critical issues occur, follow the Rollback Plan immediately.

---

## 📝 Post-Deployment Tasks

### Immediate (Within 1 Hour)
- [ ] Verify all tests pass
- [ ] Check error logs
- [ ] Test onboarding flow with test account
- [ ] Verify admin panel accessibility

### Within 24 Hours
- [ ] Monitor user feedback
- [ ] Check analytics for errors
- [ ] Review completion rates
- [ ] Test on various devices

### Within 1 Week
- [ ] Gather user feedback on onboarding
- [ ] Review mobile usage patterns
- [ ] Check admin panel usage
- [ ] Plan next iteration improvements

---

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All services running without errors
- ✅ Dashboard loads on mobile and desktop
- ✅ Onboarding modal works for new users
- ✅ Admin panel displays correctly
- ✅ No increase in error rates
- ✅ All database migrations completed

---

**Deployment Prepared By**: Cascade AI  
**Deployment Date**: November 8, 2025  
**Version**: 2.9.0 / 1.3.0  
**Status**: Ready for Production ✅
