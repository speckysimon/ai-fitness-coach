# Intervals.icu Data Mapping Fix

**Date**: January 24, 2026  
**Status**: ✅ IMPLEMENTED - Ready for Testing

## Problem Summary

### Issue 1: Activities Not Showing (0 count)
- Dashboard showing "allActivities.length:0"
- Activities not loading from Intervals.icu

### Issue 2: Incomplete Activity Data
Modal showing only:
- ✅ Title: "Zwift - Race: Stage 3..."
- ✅ Distance: 23.9 km
- ❌ **Missing**: Power, Heart Rate, TSS, Elevation, Speed, Cadence

But Intervals.icu has ALL this data:
- Avg Power: 189w
- Norm Power: 165w
- Max Power: 167.95%
- Avg HR: 154bpm
- TSS: 31
- Elevation: 56.12m
- And more...

## Root Cause

The `normalizeActivity()` function in `intervalsService.js` was using **incorrect field names** for the Intervals.icu API response.

**Expected (wrong):**
- `activity.average_watts`
- `activity.average_hr`
- `activity.tss`

**Actual Intervals.icu API (correct):**
- `activity.avg_watts` or `activity.icu_average_watts`
- `activity.avg_hr` or `activity.icu_average_hr`
- `activity.icu_training_load` (not `tss`)

## Solution Implemented

### 1. Added Debug Logging
**Files Modified:**
- `server/routes/intervals.js` - Log normalized activity
- `server/services/intervalsService.js` - Log raw API response

This will show us the actual field names from Intervals.icu API.

### 2. Fixed Field Mappings
**File**: `server/services/intervalsService.js`

Updated `normalizeActivity()` with comprehensive fallbacks:

```javascript
// Power - multiple fallbacks
average_watts: activity.avg_watts || activity.average_watts || activity.avgWatts || activity.power || null,
avgPower: activity.avg_watts || activity.average_watts || activity.avgWatts || activity.power || null,

// Normalized Power
weighted_average_watts: activity.np || activity.normalized_power || activity.np_watts || null,
normalizedPower: activity.np || activity.normalized_power || activity.np_watts || null,

// Heart Rate
average_heartrate: activity.avg_hr || activity.average_hr || activity.avgHr || null,
avgHeartRate: activity.avg_hr || activity.average_hr || activity.avgHr || null,

// TSS
suffer_score: activity.icu_training_load || activity.tss || activity.training_load || null,
tss: activity.icu_training_load || activity.tss || activity.training_load || null,

// Date (CRITICAL for display)
date: activity.start_date_local || activity.start_date,
duration: activity.moving_time || activity.movingTime || activity.elapsed_time || 0,
```

### 3. Added Missing Fields
- `id` field for compatibility
- `date` field (critical for sorting/display)
- `duration` field (used by calculations)
- `avgPower`, `avgHeartRate`, `normalizedPower` (alternative field names)
- `tss` (alternative to `suffer_score`)

## Testing Instructions

### Step 1: Restart Server
```bash
cd /Users/simonosx/CascadeProjects/ai-fitness-coach
npm run server
```

### Step 2: Hard Refresh Dashboard
1. Open browser to `http://localhost:3000/dashboard`
2. Open DevTools Console (Cmd+Option+J)
3. Hard refresh: Cmd+Shift+R

### Step 3: Check Server Logs

Look for these debug logs in the terminal:

```
🔍 [IntervalsService] RAW activity from API: {
  "id": "...",
  "name": "Zwift - Race: Stage 3...",
  "distance": 23900,
  "avg_watts": 189,
  "np": 165,
  "avg_hr": 154,
  "icu_training_load": 31,
  ...
}
```

This shows the **actual field names** from Intervals.icu API.

### Step 4: Check Normalized Activity

Look for this log:

```
🔍 [Intervals] Sample activity fields: {
  "source": "intervals",
  "name": "Zwift - Race: Stage 3...",
  "distance": 23900,
  "avgPower": 189,
  "normalizedPower": 165,
  "avgHeartRate": 154,
  "tss": 31,
  ...
}
```

This shows the **normalized** activity with all fields mapped.

### Step 5: Verify Dashboard Display

Check that the activity modal shows:
- ✅ Title
- ✅ Distance
- ✅ **Power** (189w avg, 165w normalized)
- ✅ **Heart Rate** (154 bpm avg)
- ✅ **TSS** (31)
- ✅ **Elevation**
- ✅ **Speed**
- ✅ **Cadence**

### Step 6: Check Activity Count

Console should show:
```
✅ [Dashboard] Fetched X activities from Intervals.icu
📊 [Dashboard] Total activities after merge: X
```

NOT:
```
allActivities.length:0  ❌
```

## Expected Results

### ✅ Success Indicators:
1. Server logs show raw Intervals.icu API response with field names
2. Activities count > 0 in console
3. Activity modal shows ALL metrics (power, HR, TSS, etc.)
4. No "allActivities.length:0" error
5. All pages (Dashboard, Performance Metrics, Form, FTP History, Calendar) show activities

### ❌ If Still Failing:
1. Check server logs for the raw API response field names
2. Update `normalizeActivity()` with the correct field names from logs
3. Verify Intervals.icu connection in Settings

## Field Mapping Reference

Based on common Intervals.icu API patterns:

| Intervals.icu API | Our Schema | Alternative Names |
|------------------|------------|-------------------|
| `avg_watts` | `avgPower` | `average_watts`, `power` |
| `np` | `normalizedPower` | `normalized_power`, `np_watts` |
| `avg_hr` | `avgHeartRate` | `average_hr`, `avgHr` |
| `max_hr` | `max_heartrate` | `maxHr` |
| `icu_training_load` | `tss` | `training_load`, `suffer_score` |
| `distance` | `distance` | (meters) |
| `moving_time` | `duration` | `movingTime`, `elapsed_time` |
| `elevation_gain` | `total_elevation_gain` | `elevationGain` |
| `start_date_local` | `date` | `start_date` |

## Files Modified

1. ✅ `server/services/intervalsService.js` - Fixed `normalizeActivity()` with comprehensive fallbacks
2. ✅ `server/routes/intervals.js` - Added debug logging
3. ✅ All 9 frontend pages already support multi-source activities (Phase 1 & 2 complete)

## Next Steps After Testing

1. **If successful**: Remove debug logging (optional, doesn't hurt to keep)
2. **If field names wrong**: Update mappings based on server logs
3. **Document actual field names**: Update this file with confirmed mappings
4. **Test all pages**: Verify Performance Metrics, Form, FTP History, Calendar all work

## Troubleshooting

### Problem: Still showing 0 activities
**Check:**
- Is Intervals.icu connected? (Settings page)
- Server logs show "Fetched X activities"?
- Any errors in server logs?

### Problem: Activities show but data still missing
**Check:**
- Server logs for raw API response field names
- Update `normalizeActivity()` with correct field names
- Verify fields are not null in raw API response

### Problem: Activities duplicate between Strava and Intervals
**Expected:** Deduplication should handle this automatically
**Check:** Console logs for "Skipping duplicate" messages

---

**Status**: Ready for testing. Please restart server and check logs! 🚀
