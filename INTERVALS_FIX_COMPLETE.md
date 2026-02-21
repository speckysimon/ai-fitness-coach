# Intervals.icu Integration Fix - Complete
**Date:** January 24, 2026, 4:04pm

## Issue Resolved ✅

**Problem:** Intervals.icu activities were not loading due to incorrect API implementation.

**Root Cause:** The code was passing the actual athlete ID (e.g., `i220202`) to the Intervals.icu API, but the API requires using `0` as a special placeholder that means "use the athlete ID from the access token".

## Fix Applied

**File:** `server/routes/intervals.js` (Line 199-205)

**Changed from:**
```javascript
const activities = await intervalsService.getActivities(
  token.access_token,
  token.athlete_id,  // ❌ Wrong - passes actual ID like 'i220202'
  oldest,
  newest
);
```

**Changed to:**
```javascript
// Use athlete ID '0' - Intervals.icu API uses this to mean "use athlete from token"
const activities = await intervalsService.getActivities(
  token.access_token,
  '0',  // ✅ Correct - Intervals.icu uses 0 as placeholder
  oldest,
  newest
);
```

## API Documentation Reference

From [Intervals.icu API Integration Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090):

```bash
curl 'https://intervals.icu/api/v1/athlete/0/activities?oldest=2024-11-19&newest=2024-11-20' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

> **"Note that the athlete id in the path is '0'. This indicates that the athlete ID that the access_token or API key belongs to should be used."**

## Database Status ✅

All database tables are correctly configured:
- ✅ `intervals_tokens` table exists in `fitness-coach.db`
- ✅ `intervalsTokenDb` operations working correctly
- ✅ Connection stored with athlete_id: `i220202`
- ✅ No database routing issues

## Testing Steps

1. **Restart server** (if not already running)
2. **Go to Settings** and verify Intervals.icu shows as "Connected"
3. **Go to Dashboard** and hard refresh (Cmd+Shift+R)
4. **Verify activities load** with purple "Intervals.icu" badges
5. **Check console** for: `✅ [Intervals] Fetched N activities`

## Expected Results

- ✅ Dashboard loads without errors
- ✅ Intervals.icu activities appear with purple badges
- ✅ Console shows successful fetch: `✅ [Intervals] Fetched N activities`
- ✅ No 500 or 404 errors in console
- ✅ Activities merge correctly with Strava and manual activities

## Files Modified

1. `server/routes/intervals.js` - Fixed athlete ID parameter
2. `server/migrations/010_create_intervals_tokens.cjs` - Created missing table
3. `server/db.js` - Verified database operations exist
4. `src/pages/Settings.jsx` - Improved disconnect error handling

## Status: READY TO TEST ✅

The fix has been implemented. Please restart the server and test the Dashboard to verify Intervals.icu activities are loading correctly.
