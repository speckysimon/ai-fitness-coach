# TODO: Fix Intervals.icu Enrichment Failure

**Priority:** 🔴 HIGH  
**Date Created:** January 28, 2026, 9:04pm  
**Status:** Not Started

---

## Issue Summary

Intervals.icu enrichment is completely failing with a **100% failure rate**. All 50 enrichment attempts failed during Stage B of the sync process.

### Console Output
```
[ActivitySync] 📥 Stage A: Importing 187 Intervals activities...
[ActivitySync] Import complete: {sources_upserted: 187, canonicals_created: 0, canonicals_updated: 52, lite_stored: 135, enriched: 0, ...}

[ActivitySync] 🔄 Stage B: Enriching 135 lite activities (limit: 50)...
[ActivitySync] Enrichment complete: {requested: 135, processed: 50, enriched: 0, failed: 50, remaining: 85}

Intervals enrichment: 0 enriched, 85 remaining
85 activities will be enriched on next sync
```

---

## What's Working ✅

- ✅ Fetching 187 activities from Intervals.icu `/activities` API
- ✅ Storing all 187 as `activity_sources` (52 full, 135 lite)
- ✅ Database schema updated with `avg_speed`, `max_speed`, `calories` fields
- ✅ Import logic correctly identifies and stores lite activities
- ✅ Lite activities stored with `activity_id = NULL` and `is_enriched = 0`

---

## What's Failing ❌

- ❌ **Enrichment stage - ALL 50 enrichment attempts failed**
- ❌ No activities being enriched from lite to full
- ❌ `enriched` count = 0, `failed` count = 50

---

## Likely Root Causes

### 1. API Call Failure
The `/api/intervals/enrich` endpoint may be failing to call Intervals.icu API:
- Intervals.icu `/activity/{id}` API calls may be returning errors
- Authentication token might be invalid or expired
- Rate limiting (50 rapid API calls in succession)
- Network/timeout issues

### 2. Normalization Error
Enriched data may not be passing the `isValidActivity()` validation:
- Even with full data from `/activity/{id}`, validation might fail
- Normalized fields may not be set correctly
- Field mapping issues between Intervals.icu response and our schema

### 3. Import Error
Re-importing enriched activities may be throwing errors:
- `importActivities()` function may be rejecting enriched data
- Data structure mismatch between enriched response and expected format
- Database constraint violations

---

## Investigation Steps

### Step 1: Check Server Logs
Look for detailed error messages in server console:
```bash
# Check for enrichment endpoint errors
grep "enrich" server/logs/*.log
grep "Intervals" server/logs/*.log
```

### Step 2: Test Single Activity Enrichment
Manually test enriching one activity:
```bash
# Get a lite activity ID from database
sqlite3 server/fitness-coach.db "SELECT provider_id FROM activity_sources WHERE provider = 'intervals' AND activity_id IS NULL LIMIT 1;"

# Test the API endpoint directly
curl -X GET "http://localhost:5001/api/intervals/activity/{id}/details" \
  -H "Authorization: Bearer {session_token}"
```

### Step 3: Add Detailed Error Logging
Update enrichment endpoint to log detailed errors:
- Log each activity ID being enriched
- Log API response status and body
- Log normalization results
- Log import results

### Step 4: Verify API Token
Check if Intervals.icu token is valid:
```bash
# Test authentication
curl -X GET "https://intervals.icu/api/v1/athlete/0" \
  -H "Authorization: Bearer {intervals_token}"
```

### Step 5: Check Rate Limiting
Add delays between enrichment calls if rate limiting is the issue:
```javascript
// In enrichIntervalsActivities function
for (const activityId of idsToEnrich) {
  await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
  // ... enrichment logic
}
```

### Step 6: Test Data Normalization
Verify enriched activity data is being normalized correctly:
- Check if `intervalsService.normalizeActivity()` is working
- Verify all required fields are present
- Test `isValidActivity()` with enriched data

---

## Files to Investigate

### Backend Files
1. **`server/routes/intervals.js`** (lines 408-475)
   - `/api/intervals/enrich` POST endpoint
   - Loop that processes enrichment requests
   - Error handling and response structure

2. **`server/services/intervalsService.js`**
   - `getActivity(accessToken, athleteId, activityId)` method
   - API URL construction
   - Response normalization
   - Error handling

3. **`server/services/activityImportService.js`**
   - `importActivity()` function
   - `isValidActivity()` validation
   - Enrichment detection logic

### Frontend Files
4. **`src/lib/activitySync.js`**
   - `enrichIntervalsActivities(activityIds, limit)` function
   - API call to `/api/intervals/enrich`
   - Error handling and retry logic

---

## Expected Behavior

1. **Stage A:** Import 187 activities (52 full, 135 lite) ✅ WORKING
2. **Stage B:** Enrich 50 lite activities per sync
   - Fetch full data from `/activity/{id}` for each lite activity
   - Normalize the enriched data
   - Re-import with full metrics
   - Update `activity_sources` with `is_enriched = 1`
   - Create canonical activities in `activities` table
3. **Result:** `enriched` count should be 50, `failed` should be 0

---

## Current Database State

```sql
-- Check current state
SELECT 
  COUNT(*) AS total_sources,
  SUM(CASE WHEN activity_id IS NULL THEN 1 ELSE 0 END) AS pending,
  SUM(CASE WHEN activity_id IS NOT NULL THEN 1 ELSE 0 END) AS with_canonical,
  SUM(CASE WHEN is_enriched = 1 THEN 1 ELSE 0 END) AS enriched
FROM activity_sources 
WHERE provider = 'intervals';

-- Expected: total_sources: 187, pending: 135, with_canonical: 52, enriched: 52
```

---

## Debug Checklist

- [ ] Check server console for enrichment errors
- [ ] Test single activity enrichment manually
- [ ] Verify Intervals.icu API token is valid
- [ ] Check for rate limiting issues
- [ ] Add detailed error logging to enrichment endpoint
- [ ] Test data normalization with sample enriched activity
- [ ] Verify `isValidActivity()` passes for enriched data
- [ ] Check database constraints aren't blocking inserts
- [ ] Test enrichment with delay between API calls
- [ ] Review Intervals.icu API documentation for changes

---

## Success Criteria

- ✅ Enrichment succeeds for at least 45/50 activities (90% success rate)
- ✅ `enriched` count increases with each sync
- ✅ Enriched activities appear in UI with full metrics
- ✅ `avg_speed`, `max_speed`, `calories` fields populated
- ✅ Advanced metrics (Variability Index, Power Zones, etc.) display correctly

---

## Notes

- Database schema is correct and ready
- Import logic is correct and tested
- The issue is specifically in the enrichment API call or data processing
- This is blocking 135 activities from displaying full data
- High priority as it affects user experience significantly
