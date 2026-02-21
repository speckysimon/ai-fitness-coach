# Frontend Migration Strategy - Rider Metrics Unification

**Date:** January 27, 2026  
**Status:** Ready to Execute

---

## Migration Order (STRICT)

1. **PerformanceMetrics.jsx** - Establish the pattern
2. **RiderProfile.jsx** - Remove riderAnalytics.js logic  
3. **FTPHistory.jsx**
4. **WeeklyReport.jsx**
5. **Dashboard.jsx**
6. **RaceDayPredictor.jsx** - Last (most assumptions)

**Why this order?**
- PerformanceMetrics already expects windowing + consistency
- It'll flush out edge cases before touching RiderProfile or WeeklyReport
- Dashboard last because everything else will fight you if you do it first

---

## Migration Pattern (Apply to Each Page)

### Step 1: Import the Helper
```javascript
import { getActivities } from '../lib/activityCache';
```

### Step 2: Replace Activity Loading
**REMOVE:**
- All Strava fetching code
- All Intervals.icu fetching code
- All manual activity fetching code
- All merging logic
- All localStorage reads for activities

**REPLACE WITH:**
```javascript
const loadActivities = async () => {
  setLoading(true);
  try {
    const { activities } = await getActivities(windowDays);
    setActivities(activities);
    // ... rest of logic
  } catch (error) {
    console.error('Error loading activities:', error);
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Kill localStorage Decisively
**REMOVE these lines completely:**
- `localStorage.getItem('cached_activities_recent')`
- `localStorage.setItem('cached_activities_recent', ...)`
- Any defensive normalization (backend handles it)

**Rule:** If a page still reads localStorage for activities, it's not done.

---

## Page-Specific Notes

### PerformanceMetrics.jsx
- Window: 168 days (24 weeks)
- Already expects windowing
- Remove: Lines 90-201 (all fetching + merging)
- Keep: Backend FTP/FTHR history calls (lines 234-295)

### RiderProfile.jsx
- Window: 180 days (6 months for full profile)
- Remove: `calculatePowerCurve()` import
- Remove: `classifyRiderType()` import
- Replace with: Backend `/api/analytics/rider-type` call
- Remove: Lines 123-148 (localStorage + normalization)

### FTPHistory.jsx
- Window: 168 days (24 weeks)
- Already uses backend for FTP calculation
- Just needs activity loading simplified

### WeeklyReport.jsx
- Window: 7 days
- Remove: Lines 35-43 (localStorage read)
- Simple replacement

### Dashboard.jsx
- Window: 90 days (3 months)
- Most complex - has caching logic
- Remove: Lines 240-490 (entire activity loading section)
- Keep: TSS calculation, metrics calculation

### RaceDayPredictor.jsx
- Window: 90 days
- Remove: Lines 30-41 (localStorage read)
- Simplest migration

---

## Cache Invalidation (Non-Optional)

Add to `server/routes/manualActivities.js`:

```javascript
import { invalidateCache } from '../services/activityCacheService.js';

// In POST route (create):
invalidateCache(userId);

// In DELETE route:
invalidateCache(userId);

// In PUT route (update):
invalidateCache(userId);
```

**Why:** Otherwise testers will immediately distrust the system when manual activities don't show up.

---

## Testing Checklist (Per Page)

- [ ] Page loads without errors
- [ ] Activities display correctly
- [ ] No localStorage reads for activities in console
- [ ] Cache HIT logged on second load
- [ ] Cache MISS logged on first load
- [ ] Manual activity add → cache invalidates → new activity shows
- [ ] Page load < 1 second (cached)
- [ ] Page load < 3 seconds (uncached)

---

## What NOT to Do Yet

❌ Do NOT tweak rider-type weights  
❌ Do NOT rebalance confidence thresholds  
❌ Do NOT optimize power curve maths  

**Why:** Finish the pipeline first and let the data settle for a few days.

---

## Success Criteria

### Phase Complete When:
- All 6 pages use `getActivities()` helper
- Zero localStorage reads for activities
- Cache hit rate > 80% (check logs)
- All pages load < 1 second (cached)
- Manual activity changes immediately visible
- No Strava rate limit errors

---

## Rollback Plan

If something breaks:
1. Revert the page file
2. Check console for errors
3. Verify backend cache service is running
4. Check cache stats: `GET /api/activities/cache-stats`
5. Clear cache: `POST /api/activities/invalidate`

---

**Estimated Time:** 2-3 hours total (20-30 min per page)
