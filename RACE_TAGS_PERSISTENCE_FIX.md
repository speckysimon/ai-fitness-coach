# Race Tags Persistence Fix

**Date:** October 10, 2025  
**Issue:** Race tags lost when reconnecting Strava  
**Status:** ✅ FIXED

---

## 🐛 Problem

Race tags were stored in browser `localStorage`, which meant:
- Tags were lost when reconnecting Strava
- Tags were lost when clearing browser data
- Tags were not synced across devices
- Had to manually retag all races after reconnection

---

## ✅ Solution

Moved race tags from `localStorage` to the **backend database** so they persist permanently.

---

## 🔧 Changes Made

### 1. Database Schema (`server/db.js`)

Added new `race_tags` table:
```sql
CREATE TABLE IF NOT EXISTS race_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  is_race INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, activity_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Added database operations:
- `raceTagDb.setRaceTag(userId, activityId, isRace)` - Set/unset race tag
- `raceTagDb.getAllForUser(userId)` - Get all race tags for user
- `raceTagDb.isRace(userId, activityId)` - Check if activity is a race
- `raceTagDb.deleteAllForUser(userId)` - Delete all race tags for user

### 2. API Endpoints (`server/routes/raceTags.js`)

Created new endpoints:
- `GET /api/race-tags` - Fetch all race tags for current user
- `POST /api/race-tags` - Set/unset a single race tag
- `POST /api/race-tags/bulk` - Bulk update race tags

All endpoints require authentication via session token.

### 3. Server Routes (`server/index.js`)

Added race tags route:
```javascript
import raceTagRoutes from './routes/raceTags.js';
app.use('/api/race-tags', raceTagRoutes);
```

### 4. Frontend Utilities (`src/lib/raceUtils.js`)

Replaced localStorage functions with API calls:
- `fetchRaceTags()` - Fetch from backend
- `setActivityRace(activityId, isRace)` - Save to backend
- `saveRaceTagsBulk(raceTags)` - Bulk save to backend

### 5. Edit Activity Modal (`src/components/EditActivityModal.jsx`)

Updated to use backend API:
- Load race tag from backend on mount
- Save race tag to backend on save
- Show error if save fails

### 6. Dashboard (`src/pages/Dashboard.jsx`)

Updated to fetch race tags from backend:
- Load race tags via API when activities load
- Reload race tags after editing activity

### 7. All Activities (`src/pages/AllActivities.jsx`)

Updated to fetch race tags from backend:
- Load race tags via API on component mount
- Reload race tags after editing activity

### 8. Race Analytics (`src/pages/RaceAnalytics.jsx`)

Updated to fetch race tags from backend:
- Load race tags via API before fetching race data

### 9. Calendar (`src/pages/Calendar.jsx`)

Updated to fetch race tags from backend:
- Load race tags via API when activities load

---

## 🎯 How It Works Now

### Tagging a Race

1. User clicks edit icon on activity
2. Toggles "Mark as Race" switch
3. Clicks "Save Changes"
4. Frontend calls `POST /api/race-tags` with activity ID
5. Backend saves to `race_tags` table
6. Race tag persists in database ✅

### Loading Race Tags

1. Page loads and fetches activities
2. Frontend calls `GET /api/race-tags`
3. Backend queries `race_tags` table for user
4. Returns object: `{ "12345": true, "67890": true }`
5. Frontend displays race icons on tagged activities

### Reconnecting Strava

1. User disconnects and reconnects Strava
2. New Strava tokens are saved
3. Activities are refetched
4. Race tags are loaded from database
5. **All race tags are still there!** ✅

---

## 🧪 Testing

### Test 1: Tag a Race
1. Go to All Activities or Dashboard
2. Click edit icon on an activity
3. Toggle "Mark as Race"
4. Click "Save Changes"
5. ✅ Activity shows race trophy icon

### Test 2: Reconnect Strava
1. Go to Settings
2. Disconnect Strava
3. Reconnect Strava
4. Go back to All Activities
5. ✅ Race tags are still there!

### Test 3: Check Database
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach/server
sqlite3 fitness-coach.db
SELECT * FROM race_tags;
```
Should show your race tags.

### Test 4: Multiple Devices
1. Tag races on one device
2. Login on another device
3. ✅ Race tags appear on both devices

---

## 📊 Before vs After

| Feature | Before (localStorage) | After (Database) |
|---------|----------------------|------------------|
| Persistence | ❌ Lost on reconnect | ✅ Permanent |
| Cross-device | ❌ Device-specific | ✅ Synced |
| Browser data | ❌ Lost on clear | ✅ Safe |
| Backup | ❌ No backup | ✅ In database |
| Multi-user | ❌ Shared storage | ✅ Per-user |

---

## 🔐 Security

- All API endpoints require authentication
- Session token verified on every request
- Race tags are user-specific (can't see others' tags)
- SQL injection protected (prepared statements)
- Foreign key constraints ensure data integrity

---

## 🚀 Benefits

1. **Permanent Storage** - Never lose race tags again
2. **Cross-Device Sync** - Tags available on all devices
3. **Backup Safe** - Stored in database backups
4. **Multi-User** - Each user has their own tags
5. **Scalable** - Can add more metadata later (race name, goal time, etc.)

---

## 📝 Migration Notes

**Existing users with localStorage race tags:**

The old localStorage tags won't automatically migrate. Users will need to retag their races once. After that, tags will persist forever.

**Optional: Add migration script** (future enhancement):
- Read localStorage `race_tags` on first load
- Bulk upload to backend
- Clear localStorage after successful upload

---

## 🎉 Result

Race tags now persist permanently in the database! You can:
- ✅ Reconnect Strava without losing tags
- ✅ Clear browser data without losing tags
- ✅ Access tags from multiple devices
- ✅ Never worry about losing race history

---

**Status:** ✅ COMPLETE  
**Date:** October 10, 2025  
**Time:** 18:14 CEST  
**Ready to Use:** YES - Restart server to apply changes!
