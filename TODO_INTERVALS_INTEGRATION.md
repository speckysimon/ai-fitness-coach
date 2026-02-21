# TODO: Intervals.icu Integration - Activity Display Fix

## ✅ COMPLETED TODAY (Jan 23, 2026)

### API Key Storage System Fixed
- **Issue:** API keys were being saved through admin panel but not persisting to database
- **Root Cause:** SQLite WAL (Write-Ahead Logging) mode was preventing writes from being committed to main database file
- **Solution:** Changed database journal mode from WAL to DELETE mode in `server/adminDb.cjs`
- **Result:** All 6 API keys now successfully stored and loaded:
  - ✅ OpenAI
  - ✅ Gemini
  - ✅ Strava (OAuth)
  - ✅ Google (OAuth)
  - ✅ Intervals.icu (OAuth)
  - ✅ OpenWeather

### Files Modified
1. `server/adminDb.cjs` - Changed journal mode from WAL to DELETE
2. `server/services/aiConfigService.cjs` - Added detailed logging for debugging
3. `server/routes/intervals.js` - Fixed OAuth callback redirects and token exchange format

---

## 🔴 PRIORITY: Activity Display Integration (Next Session)

### Problem Statement
Currently, the app is hardcoded to only display Strava activities. With Intervals.icu now connected, we need to:
1. Support displaying activities from **either** Strava OR Intervals.icu (or both)
2. Implement deduplication when both sources are connected
3. Fix pages that are hanging or showing "Connect Strava" when Strava is disconnected

### Affected Pages/Components
1. **Dashboard** (`src/pages/Dashboard.jsx`)
   - Lines 321-506: `loadDashboardData()` - Only fetches from Strava
   - Currently hangs when Strava is disconnected
   
2. **All Activities** (`src/pages/AllActivities.jsx`)
   - Lines 129-165: `loadAllActivities()` - Only reads from Strava cache
   - Shows "Connect Strava" message when Strava is disconnected
   
3. **Plan Generator** (`src/pages/PlanGenerator.jsx`)
   - Lines 513-634: `loadActivities()` - Only fetches from Strava
   - Falls back to manual activities only

### Implementation Plan

#### Phase 1: Create Intervals.icu Activity Fetcher (Backend)
**File:** `server/routes/intervals.js`

Add new endpoint:
```javascript
/**
 * GET /api/intervals/activities
 * Fetch user's activities from Intervals.icu
 */
router.get('/activities', async (req, res) => {
  // 1. Get user's Intervals.icu token from database
  // 2. Fetch activities from Intervals.icu API
  // 3. Transform to match Strava activity format
  // 4. Return activities array
});
```

**Intervals.icu API Reference:**
- Endpoint: `https://intervals.icu/api/v1/athlete/{athleteId}/activities`
- Authentication: Bearer token
- Returns: Array of activity objects

**Activity Format Mapping:**
Map Intervals.icu fields to Strava-compatible format:
- `id` → `id`
- `start_date_local` → `date`
- `name` → `name`
- `type` → `type` (map: "Ride", "Run", "VirtualRide", etc.)
- `moving_time` → `duration`
- `distance` → `distance`
- `average_watts` → `avgPower`
- `average_hr` → `avgHeartRate`
- `normalized_power` → `normalizedPower`
- `trainer` → `trainer`

#### Phase 2: Create Activity Merger Utility
**File:** `src/lib/activityMerger.js` (NEW)

```javascript
/**
 * Merge activities from multiple sources with deduplication
 * @param {Array} stravaActivities - Activities from Strava
 * @param {Array} intervalsActivities - Activities from Intervals.icu
 * @param {Array} manualActivities - Manually entered activities
 * @returns {Array} Merged and deduplicated activities
 */
export function mergeMultiSourceActivities(stravaActivities, intervalsActivities, manualActivities) {
  // 1. Add source tag to each activity
  // 2. Deduplicate by date + duration + distance (within 5% tolerance)
  // 3. Prefer Strava over Intervals.icu over Manual (for duplicates)
  // 4. Sort by date descending
  // 5. Return merged array
}
```

**Deduplication Logic:**
- Match activities if:
  - Same date (within 1 hour)
  - Same duration (within 5%)
  - Same distance (within 5%)
- Priority: Strava > Intervals.icu > Manual

#### Phase 3: Update Dashboard to Support Multiple Sources
**File:** `src/pages/Dashboard.jsx`

**Changes to `loadDashboardData()`:**
```javascript
// 1. Check which sources are connected
const hasStrava = stravaTokens?.access_token;
const hasIntervals = await checkIntervalsConnection();

// 2. Fetch from available sources
let stravaActivities = [];
let intervalsActivities = [];

if (hasStrava) {
  stravaActivities = await fetchStravaActivities();
}

if (hasIntervals) {
  intervalsActivities = await fetchIntervalsActivities();
}

// 3. Load manual activities
const manualActivities = await fetchManualActivities();

// 4. Merge all sources
const allActivities = mergeMultiSourceActivities(
  stravaActivities,
  intervalsActivities,
  manualActivities
);

// 5. Continue with existing processing
```

**Add connection status check:**
```javascript
const checkIntervalsConnection = async () => {
  try {
    const sessionToken = localStorage.getItem('session_token');
    const response = await fetch('/api/intervals/status', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    const data = await response.json();
    return data.connected;
  } catch {
    return false;
  }
};
```

#### Phase 4: Update All Activities Page
**File:** `src/pages/AllActivities.jsx`

**Changes to `loadAllActivities()`:**
- Remove Strava-only logic
- Use same multi-source fetching as Dashboard
- Update UI to show source badges (Strava icon, Intervals icon, Manual icon)

#### Phase 5: Update Plan Generator
**File:** `src/pages/PlanGenerator.jsx`

**Changes to `loadActivities()`:**
- Use same multi-source fetching pattern
- Ensure FTP calculation works with activities from any source

#### Phase 6: Add Source Indicators to UI
**All activity lists should show:**
- 🟠 Strava icon for Strava activities
- 🔵 Intervals.icu icon for Intervals activities
- ✏️ Manual icon for manual activities

---

## 📋 Step-by-Step Implementation Order

### Session 1: Backend Foundation
1. ✅ Create `/api/intervals/activities` endpoint
2. ✅ Test fetching activities from Intervals.icu API
3. ✅ Implement activity format transformation
4. ✅ Test with real Intervals.icu connection

### Session 2: Deduplication Logic
1. ✅ Create `activityMerger.js` utility
2. ✅ Implement deduplication algorithm
3. ✅ Write unit tests for edge cases
4. ✅ Test with sample data from both sources

### Session 3: Dashboard Integration
1. ✅ Update `loadDashboardData()` to fetch from multiple sources
2. ✅ Add connection status checks
3. ✅ Test with Strava only, Intervals only, both, and neither
4. ✅ Verify no hanging when Strava disconnected

### Session 4: All Activities & Plan Generator
1. ✅ Update All Activities page
2. ✅ Update Plan Generator page
3. ✅ Add source badges to UI
4. ✅ Test all pages with different connection states

### Session 5: Polish & Edge Cases
1. ✅ Handle API errors gracefully
2. ✅ Add loading states for each source
3. ✅ Update cache strategy for multi-source
4. ✅ Final testing and bug fixes

---

## 🧪 Testing Checklist

### Connection States to Test
- [ ] Strava only connected
- [ ] Intervals.icu only connected
- [ ] Both connected (deduplication working)
- [ ] Neither connected (manual activities only)
- [ ] One source fails (graceful degradation)

### Pages to Test
- [ ] Dashboard loads without hanging
- [ ] All Activities shows correct activities
- [ ] Plan Generator loads activities
- [ ] Activity detail modals work
- [ ] Metrics (FTP, TSS) calculate correctly

### Edge Cases
- [ ] Duplicate activities handled correctly
- [ ] Activities from one source don't overwrite the other
- [ ] Cache invalidation works properly
- [ ] Token refresh works for both sources
- [ ] Manual activities merge correctly with both sources

---

## 📝 Notes

### Current Behavior
- Dashboard hangs when Strava disconnected (infinite loading)
- All Activities shows "Connect Strava" message
- Manual activities work but are separate from Strava

### Desired Behavior
- Dashboard loads activities from any connected source
- All Activities shows combined view with source badges
- Seamless experience regardless of which service is connected
- Deduplication prevents duplicate activities when both connected

### API Endpoints Needed
- ✅ `/api/intervals/status` - Check connection (already exists)
- 🔴 `/api/intervals/activities` - Fetch activities (TO DO)
- ✅ `/api/intervals/auth` - OAuth initiation (already exists)
- ✅ `/api/intervals/callback` - OAuth callback (already exists)

### Database Tables
- ✅ `api_keys` - Stores OAuth credentials (working)
- ✅ `intervals_tokens` - Stores user tokens (exists in `server/db/intervalsTokenDb.cjs`)

---

## 🎯 Success Criteria

1. **Dashboard loads successfully** with Strava disconnected
2. **All Activities shows activities** from any connected source
3. **No duplicate activities** when both sources connected
4. **Source badges** clearly indicate where each activity came from
5. **Graceful degradation** when one source fails
6. **Cache strategy** works with multiple sources
7. **Performance** remains fast (< 2 seconds load time)

---

## 🔗 Related Files

### Backend
- `server/routes/intervals.js` - Intervals.icu API routes
- `server/db/intervalsTokenDb.cjs` - Token storage
- `server/services/apiKeyLoader.cjs` - OAuth config loader

### Frontend
- `src/pages/Dashboard.jsx` - Main dashboard
- `src/pages/AllActivities.jsx` - Activity list
- `src/pages/PlanGenerator.jsx` - Training plan generator
- `src/lib/manualActivityUtils.js` - Manual activity utilities
- `src/lib/activityMerger.js` - NEW: Multi-source merger

### Utilities
- `src/lib/utils.js` - Formatting utilities
- `src/components/ActivityDetailModal.jsx` - Activity details

---

## 💡 Additional Improvements (Future)

1. **Activity Sync Direction**
   - Allow syncing activities FROM RiderLabs TO Intervals.icu
   - Useful for manual activities entered in RiderLabs

2. **Workout Push**
   - Push training plan workouts to Intervals.icu calendar
   - Two-way sync with Intervals.icu

3. **Advanced Deduplication**
   - Use activity IDs from source APIs
   - Store mapping of duplicate activities
   - Allow user to choose preferred source per activity

4. **Source Preferences**
   - Let user choose default source for metrics
   - Prefer one source over another for FTP calculation

---

**Last Updated:** Jan 23, 2026, 10:21 PM
**Status:** Ready for implementation
**Priority:** HIGH - Blocking user workflow
