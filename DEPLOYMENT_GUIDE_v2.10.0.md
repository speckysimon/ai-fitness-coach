# Deployment Guide - Version 2.10.0

**Date**: November 18, 2025  
**Version**: 2.10.0 (App) / 1.4.0 (Admin)  
**Focus**: Feedback Management System + Production Polish

---

## 🚀 What's New in This Release

### Major Features
- ✅ **Feedback Management Admin Panel** - Complete dashboard for viewing, filtering, and managing user feedback
- ✅ **Feedback Widget** - User-facing feedback submission (already deployed)
- ✅ **DELETE Endpoint** - Added delete functionality for feedback management

### Admin Panel Enhancements
- Dashboard with 5 stat cards (Total, New, In Progress, Resolved, Avg Rating)
- Category breakdown visualization
- Advanced filtering (status, category, rating)
- Detail modal with full feedback information
- Status management (New, In Progress, Resolved)
- Delete functionality with confirmation

### Technical Changes
- New route: `/admin/feedback`
- New component: `FeedbackManagement.jsx`
- Updated: `AdminLayout.jsx` - Added feedback navigation
- Updated: `App.jsx` - Added feedback route
- Updated: `server/routes/feedback.js` - Added DELETE endpoint

---

## 📋 Pre-Deployment Checklist

### 1. Database Status
✅ **No new migrations required** - Feedback table already exists from previous deployment

**Verify feedback table exists:**
```bash
# On live server
sqlite3 /var/www/riderlabs.io/fitness-coach.db
sqlite> .schema feedback
sqlite> .exit
```

Expected output:
```sql
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rating INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT NOT NULL,
  email TEXT,
  user_email TEXT,
  timestamp TEXT NOT NULL,
  user_agent TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 2. New Files Created
- `src/pages/admin/FeedbackManagement.jsx` - Main feedback admin page (535 lines)
- `FEEDBACK_ADMIN_IMPLEMENTATION.md` - Feature documentation

### 3. Modified Files
- `src/App.jsx` - Added FeedbackManagement import and route
- `src/pages/admin/AdminLayout.jsx` - Added feedback nav item
- `server/routes/feedback.js` - Added DELETE endpoint

### 4. Environment Variables
✅ **No new environment variables required**

### 5. API Keys
✅ **No new API keys required** - Uses existing admin authentication

---

## 🔧 Deployment Steps

### Step 1: Backup Current Production

```bash
# SSH into live server
ssh riderlabs@riderlabs.io

# Navigate to app directory
cd /var/www/riderlabs.io

# Create backup directory if it doesn't exist
mkdir -p backups

# Backup database
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
cp fitness-coach.db backups/fitness-coach_$TIMESTAMP.db

# Backup current code
tar -czf backups/code_$TIMESTAMP.tar.gz \
  --exclude=node_modules \
  --exclude=backups \
  --exclude=.git \
  --exclude=dist \
  .

echo "✅ Backups created:"
echo "  - Database: backups/fitness-coach_$TIMESTAMP.db"
echo "  - Code: backups/code_$TIMESTAMP.tar.gz"
```

### Step 2: Pull Latest Code from Git

```bash
# On live server
cd /var/www/riderlabs.io

# Stash any local changes (if any)
git stash

# Pull latest code
git fetch origin
git pull origin main

# Check current version
git log -1 --oneline

echo "✅ Code updated to latest version"
```

### Step 3: Install Dependencies

```bash
# On live server
cd /var/www/riderlabs.io

# Install any new dependencies
npm install

echo "✅ Dependencies installed"
```

### Step 4: Build Frontend

```bash
# On live server
cd /var/www/riderlabs.io

# Build production bundle
npm run build

echo "✅ Frontend built successfully"
```

### Step 5: Restart Backend Service

```bash
# Check current service status
pm2 status

# Restart the service
pm2 restart riderlabs

# Or if using systemd:
# sudo systemctl restart riderlabs

# Check logs for any errors
pm2 logs riderlabs --lines 50

echo "✅ Service restarted"
```

### Step 6: Verify Deployment

```bash
# Check service is running
pm2 status riderlabs

# Test API health
curl https://riderlabs.io/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-18T..."}
```

---

## ✅ Post-Deployment Verification

### 1. Admin Panel Access
- [ ] Navigate to: https://riderlabs.io/admin/login
- [ ] Login with admin credentials
- [ ] Verify "Feedback" appears in sidebar navigation (4th item)

### 2. Feedback Management Page
- [ ] Click "Feedback" in sidebar
- [ ] Verify page loads without errors
- [ ] Check dashboard stats display correctly
- [ ] Verify category breakdown shows

### 3. Test Filtering
- [ ] Filter by Status (New, In Progress, Resolved)
- [ ] Filter by Category (General, Bug, Feature, UI, Other)
- [ ] Filter by Rating (1-5 stars)
- [ ] Verify feedback list updates correctly

### 4. Test Detail Modal
- [ ] Click on any feedback item
- [ ] Verify modal opens with full details
- [ ] Check all fields display correctly:
  - Message
  - Email
  - User Email
  - Timestamp
  - Page URL
  - User Agent
  - Admin Notes (if any)

### 5. Test Status Updates
- [ ] Open feedback detail modal
- [ ] Click "Mark as In Progress"
- [ ] Verify status updates immediately
- [ ] Click "Resolve"
- [ ] Verify status badge changes to green

### 6. Test Delete Function
- [ ] Open feedback detail modal
- [ ] Click "Delete" button
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Verify feedback removed from list

### 7. Test Refresh
- [ ] Click "Refresh" button
- [ ] Verify loading spinner appears
- [ ] Verify data reloads

### 8. User-Facing Feedback Widget
- [ ] Navigate to: https://riderlabs.io
- [ ] Verify feedback button appears (bottom right)
- [ ] Click feedback button
- [ ] Submit test feedback
- [ ] Verify it appears in admin panel

### 9. Mobile Responsiveness
- [ ] Open admin panel on mobile device
- [ ] Verify feedback page is readable
- [ ] Test filtering on mobile
- [ ] Test detail modal on mobile

### 10. Browser Console
- [ ] Open browser console (F12)
- [ ] Navigate through feedback management
- [ ] Verify no errors in console
- [ ] Check network tab for failed requests

---

## 🐛 Troubleshooting

### Issue: Feedback page shows 404
**Solution:**
```bash
# Verify route is registered
cd /var/www/riderlabs.io
grep -n "feedback" src/App.jsx
# Should show line with: <Route path="feedback" element={<FeedbackManagement />} />

# Rebuild frontend
npm run build
pm2 restart riderlabs
```

### Issue: "Feedback" not in sidebar
**Solution:**
```bash
# Verify AdminLayout has feedback nav item
cd /var/www/riderlabs.io
grep -n "feedback" src/pages/admin/AdminLayout.jsx
# Should show line with: { path: '/admin/feedback', icon: MessageSquare, label: 'Feedback' }

# Rebuild frontend
npm run build
pm2 restart riderlabs
```

### Issue: DELETE endpoint returns 404
**Solution:**
```bash
# Verify DELETE route exists
cd /var/www/riderlabs.io
grep -A 5 "router.delete" server/routes/feedback.js
# Should show DELETE endpoint

# Restart backend
pm2 restart riderlabs
```

### Issue: Feedback table doesn't exist
**Solution:**
```bash
# Check if table exists
sqlite3 /var/www/riderlabs.io/fitness-coach.db "SELECT name FROM sqlite_master WHERE type='table' AND name='feedback';"

# If empty, run schema
sqlite3 /var/www/riderlabs.io/fitness-coach.db < server/schema.sql

# Restart service
pm2 restart riderlabs
```

### Issue: Admin authentication fails
**Solution:**
```bash
# Create new admin user
cd /var/www/riderlabs.io
node server/scripts/create-first-admin.cjs

# Use credentials:
# Email: admin@riderlabs.io
# Password: ChangeThisPassword123!
```

---

## 📊 Monitoring

### Check Service Status
```bash
# PM2 status
pm2 status riderlabs

# View logs
pm2 logs riderlabs --lines 100

# Monitor in real-time
pm2 monit
```

### Check Database Size
```bash
# Check database file size
ls -lh /var/www/riderlabs.io/fitness-coach.db

# Count feedback entries
sqlite3 /var/www/riderlabs.io/fitness-coach.db "SELECT COUNT(*) FROM feedback;"
```

### Check Disk Space
```bash
# Check available disk space
df -h /var/www/riderlabs.io
```

---

## 🔄 Rollback Plan

If issues occur, rollback to previous version:

```bash
# Stop service
pm2 stop riderlabs

# Restore previous code
cd /var/www/riderlabs.io
LATEST_BACKUP=$(ls -t backups/code_*.tar.gz | head -1)
tar -xzf $LATEST_BACKUP

# Restore database
LATEST_DB=$(ls -t backups/fitness-coach_*.db | head -1)
cp $LATEST_DB fitness-coach.db

# Rebuild
npm install
npm run build

# Restart service
pm2 restart riderlabs

echo "✅ Rolled back to previous version"
```

---

## 📈 Success Metrics

After deployment, monitor these metrics:

### Week 1 (Nov 18-25)
- [ ] Number of feedback submissions
- [ ] Average rating
- [ ] Most common categories
- [ ] Admin response time (time to mark as resolved)

### Week 2-4 (Nov 25 - Dec 15)
- [ ] Feedback trends over time
- [ ] Bug reports vs feature requests ratio
- [ ] User engagement with feedback widget
- [ ] Admin panel usage frequency

---

## 🎯 Next Steps After Deployment

1. **Monitor Feedback Submissions**
   - Check admin panel daily for new feedback
   - Respond to critical issues within 24 hours
   - Track common themes and patterns

2. **Gather Test User Feedback**
   - Invite 5-10 test users to try the app
   - Ask them to submit feedback via the widget
   - Monitor their usage patterns

3. **Polish Based on Feedback**
   - Fix critical bugs reported by test users
   - Improve UX based on feedback
   - Add missing features if needed

4. **Prepare for Wider Launch**
   - Once foundational issues are resolved
   - Document known issues
   - Create user onboarding materials

---

## 📞 Support

**Issues during deployment?**
- Check logs: `pm2 logs riderlabs`
- Check service: `pm2 status riderlabs`
- Restart service: `pm2 restart riderlabs`
- Check database: `sqlite3 fitness-coach.db`

**Need to rollback?**
- Follow rollback plan above
- Restore from backups
- Contact development team

---

## ✅ Deployment Complete!

Once all verification steps pass:

1. ✅ Mark deployment as successful
2. ✅ Update changelog with deployment date
3. ✅ Notify test users that app is live
4. ✅ Begin monitoring feedback submissions
5. ✅ Plan next iteration based on user feedback

**Version 2.10.0 is now live!** 🚀

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Verification Status**: ⬜ All checks passed  
**Rollback Required**: ⬜ Yes / ⬜ No
