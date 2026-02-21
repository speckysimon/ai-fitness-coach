# Rider Profile Calculations Fix

**Date:** January 26, 2026  
**Status:** ✅ COMPLETE - Ready for Testing

## Problem Summary

Rider Profile calculations (FTP, FTHR, W/kg, BMI) stopped working after adding Intervals.icu integration. Previously worked correctly with Strava-only data.

## Root Cause

**Field Name Mismatch**: Intervals.icu uses different field names than Strava:

| Metric | Strava Field | Intervals.icu Field |
|--------|--------------|---------------------|
| Average Power | `avgPower` | `icu_average_watts` or `average_watts` |
| Normalized Power | `normalizedPower` | `icu_np` or `np` |
| Average HR | `avgHeartRate` | `icu_average_hr` or `average_hr` |
| Max HR | `maxHeartRate` | `icu_max_hr` or `max_hr` |
| TSS | `tss` | `icu_training_load` |
| Elevation | `elevation` | `icu_elevation_gain` |

**The Issue**: 
- Dashboard merged activities and cached them with raw Intervals.icu field names
- RiderProfile tried to normalize after loading from cache
- FTP/FTHR calculations failed because they looked for `avgPower`/`avgHeartRate` which didn't exist on Intervals.icu activities

## Solution Implemented

### 1. Dashboard.jsx - Normalize at Source (Primary Fix)

**Location:** Lines 533-585

Added comprehensive field normalization **after** `mergeMultiSourceActivities()` and **before** caching to localStorage.

**What it does:**
- Maps all Intervals.icu field names to standard Strava field names
- Logs sample activities before/after normalization for debugging
- Ensures all activities have consistent field names before caching
- Preserves TSS from Intervals.icu (`icu_training_load`)

**Key normalization:**
```javascript
avgPower: activity.avgPower || activity.average_watts || activity.icu_average_watts || null
avgHeartRate: activity.avgHeartRate || activity.average_hr || activity.icu_average_hr || null
normalizedPower: activity.normalizedPower || activity.icu_np || activity.np || null
tss: activity.tss || activity.icu_training_load || null
```

### 2. RiderProfile.jsx - Simplified Safety Fallback

**Location:** Lines 144-160

Simplified normalization to act as defensive programming only. Dashboard should handle normalization, but this provides a safety net.

**What changed:**
- Removed verbose normalization (Dashboard handles it)
- Kept minimal fallback for critical fields
- Added clear logging to verify data is already normalized
- Reduced code duplication

## Testing Instructions

### Step 1: Clear Cache and Restart
```bash
# In browser console
localStorage.removeItem('cached_activities_recent');
localStorage.removeItem('cached_metrics');
```

### Step 2: Visit Dashboard
1. Go to Dashboard
2. Wait for activities to load
3. Open browser console
4. Look for these log messages:
   - `🔍 [Dashboard] Sample Intervals.icu activity before normalization`
   - `✅ [Dashboard] Sample Intervals.icu activity after normalization`
   - Verify `avgPower` and `avgHeartRate` are populated

### Step 3: Visit Rider Profile
1. Go to Rider Profile page
2. Open browser console
3. Look for:
   - `📊 [Rider Profile] Sample activity (should already be normalized)`
   - Verify calculations display correctly:
     - **FTP**: Should show watts (not N/A)
     - **FTHR**: Should show BPM (not N/A or incorrect value)
     - **W/kg**: Should calculate (FTP ÷ weight)
     - **BMI**: Should calculate (weight ÷ height²)

### Step 4: Verify Calculations

**Expected Results:**
- ✅ FTP displays from power data
- ✅ FTHR displays from HR data  
- ✅ W/kg calculates correctly (requires weight in profile)
- ✅ BMI calculates correctly (requires weight + height)

**If Still Showing N/A:**
1. Check console for errors
2. Verify activities have power/HR data
3. Ensure user profile has weight/height saved
4. Check that Dashboard normalization logs show correct field mapping

## Files Modified

1. **`src/pages/Dashboard.jsx`** (Lines 524-585)
   - Added comprehensive field normalization after merge
   - Added debug logging for Intervals.icu activities
   - Ensures normalized data is cached

2. **`src/pages/RiderProfile.jsx`** (Lines 144-160)
   - Simplified normalization to safety fallback only
   - Reduced code duplication
   - Added verification logging

## Additional Notes

### User Profile Save Issue
Separate issue: Backend server needs restart to load `/api/user/profile` endpoint for saving weight/height to database.

**Fix:**
1. Restart backend server
2. Go to Settings → User Profile
3. Re-enter weight: 67kg, height: 168cm
4. Click Save
5. Verify no 401 error in console

### Why This Approach Works

**Before:**
- Dashboard: Merge → Cache (raw Intervals.icu fields)
- RiderProfile: Load cache → Normalize → Calculate (too late!)
- FTP calculation: Looks for `avgPower` → Not found → N/A

**After:**
- Dashboard: Merge → **Normalize** → Cache (standardized fields)
- RiderProfile: Load cache → Calculate (works!)
- FTP calculation: Looks for `avgPower` → Found → Displays correctly

## Success Criteria

- [x] Dashboard normalizes Intervals.icu fields before caching
- [x] RiderProfile simplified to use normalized cache
- [ ] FTP displays correctly (test with real data)
- [ ] FTHR displays correctly (test with real data)
- [ ] W/kg calculates correctly (test with real data)
- [ ] BMI calculates correctly (test with real data)

## Next Steps

1. Test with real Intervals.icu data
2. Verify all calculations work
3. If issues persist, check backend analytics endpoints
4. Consider adding field mapping documentation

---

**Implementation Complete:** January 26, 2026, 5:20pm  
**Ready for User Testing**
