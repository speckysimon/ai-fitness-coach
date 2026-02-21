# Intervals.icu API Fix - TODO for Tomorrow

**Date Created:** January 27, 2026, 9:13pm  
**Status:** 🔴 BLOCKED - Needs Investigation Tomorrow

---

## Problem Summary

Getting **500 Internal Server Error** when fetching from Intervals.icu API.

**Error in Console:**
```
GET http://localhost:3000/api/intervals/activities?oldest=2025-01-27&newest=2026-01-27 500 (Internal Server Error)
❌ [Intervals] Fetch failed: 500 Internal Server Error
```

**KEY INSIGHT:** The 51 activities currently in the database are ALL from Intervals.icu and ALL have full data (duration, distance, TSS, power, HR). This proves the API worked correctly before the rearchitecture. The problem is a **backend route issue**, not an API endpoint or data format issue.

---

## What We Know

1. **Before Rearchitecture:** We were successfully fetching activity data from Intervals.icu
2. **Current Issue:** `/events` endpoint returns 500 error
3. **Root Cause of Original Problem:** `/activities` endpoint only returns minimal data (distance=0, tss=null)
4. **What We Need:** Full activity data with metrics (distance, TSS, power, HR)

---

## Investigation Steps for Tomorrow

### 1. Fix the 500 Internal Server Error (PRIMARY ISSUE)

The backend route `/api/intervals/activities` is returning 500 error. Check:
- `server/routes/intervals.js` or similar - does the route exist?
- Is the route properly registered in `server/index.js`?
- Are there any errors in the server console?
- Did rearchitecture break the route handler?

### 2. Check Official Intervals.icu API Documentation (SECONDARY)

**RESOURCE:** https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090

Only needed if the route is working but still getting errors from Intervals.icu API.

### 3. Review What Worked Before Rearchitecture

Check git history for:
- `server/services/intervalsService.js` - What endpoint did we use?
- What parameters did we pass?
- How did we authenticate?

```bash
git log --all --oneline -- server/services/intervalsService.js
git show <commit-hash>:server/services/intervalsService.js
```

### 3. Test Endpoints Manually

Use curl or Postman to test:

```bash
# Test /activities endpoint (minimal data)
curl -H "Authorization: Bearer <token>" \
  "https://intervals.icu/api/v1/athlete/<id>/activities?oldest=2025-01-01&newest=2026-01-27"

# Test /events endpoint (current 500 error)
curl -H "Authorization: Bearer <token>" \
  "https://intervals.icu/api/v1/athlete/<id>/events?oldest=2025-01-01&newest=2026-01-27"

# Check API cookbook for correct endpoint
```

### 4. Possible Solutions

Based on API documentation, try:

**Option A: Different endpoint**
- Maybe `/activities` with different parameters returns full data
- Maybe there's a `/activities/detailed` or similar endpoint

**Option B: Fetch individual activity details**
- Use `/activities` to get list of IDs
- Fetch `/activities/{id}` for each activity (slow but reliable)
- Implement batching/caching to minimize API calls

**Option C: Use correct events endpoint**
- `/events` might require different parameters
- Check if we need to filter by event type
- Verify authentication is correct

---

## Files to Check

1. **`server/services/intervalsService.js`** - Current implementation
2. **`src/pages/lib/activityMerger.js`** - Frontend fetch logic
3. **Git history** - What worked before

---

## Current Code State

**File:** `server/services/intervalsService.js:44`

```javascript
// Current (BROKEN - 500 error)
const response = await axios.get(
  `${INTERVALS_API_BASE}/athlete/${athleteId}/events`,
  {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    params: { oldest, newest }
  }
);
```

**Previous (minimal data but worked):**
```javascript
const response = await axios.get(
  `${INTERVALS_API_BASE}/athlete/${athleteId}/activities`,
  {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    params: { oldest, newest }
  }
);
```

---

## Expected Outcome

After fix, we should see:
- ✅ 186 activities fetched from Intervals.icu
- ✅ All activities have full data (distance, TSS, power, HR)
- ✅ Import count: ~186 imported, ~0 skipped
- ✅ Skip reasons: `shell: { count: 0 }`

---

## Resources

- **API Cookbook:** https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090
- **Intervals.icu Forum:** https://forum.intervals.icu/
- **API Base URL:** https://intervals.icu/api/v1

---

## Notes

- We were on the right track - the `/activities` endpoint truly does return minimal data
- The `/events` endpoint might be correct but we're using it wrong
- **DO NOT GUESS** - Read the official API documentation first
- The API cookbook should have examples of fetching activities with full metrics

---

## Action Items for Tomorrow

- [ ] Read Intervals.icu API cookbook thoroughly
- [ ] Check git history for working implementation
- [ ] Test endpoints manually with curl
- [ ] Identify correct endpoint and parameters
- [ ] Update `intervalsService.js` with correct implementation
- [ ] Test import and verify all 186 activities imported
- [ ] Document the correct approach for future reference

---

**Status:** Ready for investigation tomorrow morning 🌅
