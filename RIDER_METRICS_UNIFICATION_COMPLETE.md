# Rider Metrics Unification - Implementation Complete

**Date:** January 27, 2026  
**Status:** ✅ COMPLETE - Ready for Alpha Testing

---

## Summary

Successfully implemented the Rider Metrics Unification plan, migrating from fragmented client-side activity fetching to a unified backend-owned architecture.

---

## What Was Built

### Phase 1: Backend Analytics Endpoints

**New Files:**
- `server/services/riderAnalyticsService.js` - Windowed power curve + rider type with dual confidence

**New Endpoints:**
- `POST /api/analytics/power-curve` - Power curve with `windowDays` parameter (default: 42)
- `POST /api/analytics/rider-type` - Rider type classification with:
  - `dataEvidence` (High/Medium/Low) - Data quality assessment
  - `modelCertainty` (High/Moderate/Low) - Classification clarity
  - `windowDays` - Analysis window
  - `activitiesAnalyzed` - Count of activities used

### Phase 3A: Backend Activity Cache

**New Files:**
- `server/services/activityCacheService.js` - In-memory cache with 30-min TTL
- `server/routes/activities.js` - Activity API routes
- `src/lib/activityCache.js` - Client helper

**New Endpoints:**
- `GET /api/activities?windowDays=42` - Cached, merged, deduplicated activities
- `POST /api/activities/invalidate` - Clear cache for athlete
- `GET /api/activities/cache-stats` - Monitor cache performance

**Cache Features:**
- 30-minute TTL
- Server-side fetch from Strava + Intervals.icu + Manual
- Automatic deduplication (Strava > Intervals > Manual priority)
- Field normalization for consistent data format
- Structured logging: `[ActivityCache] HIT athlete=123 window=42d (age=12m)`

---

## Pages Migrated

All 6 pages now use the unified `getActivities()` helper:

| Page | Window | Status |
|------|--------|--------|
| PerformanceMetrics.jsx | 168d (24 weeks) | ✅ Migrated |
| RiderProfile.jsx | 180d (6 months) | ✅ Migrated |
| FTPHistory.jsx | 168d (24 weeks) | ✅ Migrated |
| WeeklyReport.jsx | 28d (4 weeks) | ✅ Migrated |
| Dashboard.jsx | 90d (3 months) | ✅ Migrated |
| RaceDayPredictor.jsx | 90d (3 months) | ✅ Migrated |

---

## What Was Removed

### From Each Page:
- ❌ Direct Strava API calls
- ❌ Direct Intervals.icu API calls
- ❌ Manual activity fetching
- ❌ Client-side merging logic
- ❌ localStorage activity caching (`cached_activities_recent`)
- ❌ Token refresh logic (handled by backend)
- ❌ Defensive field normalization (backend handles it)

### From RiderProfile.jsx:
- ❌ `calculatePowerCurve()` import
- ❌ `classifyRiderType()` import
- ❌ `calculateZoneDistribution()` import
- ❌ `generateSmartInsights()` fallback
- ❌ `calculateEfficiencyMetrics()` import

---

## Cache Invalidation

Added to `server/routes/manualActivities.js`:
- ✅ POST (create) → `invalidateCache(userId)`
- ✅ PUT (update) → `invalidateCache(userId)`
- ✅ DELETE → `invalidateCache(userId)`

**Why:** Manual activity changes now immediately visible to users.

---

## Window Context Labels

Added to RiderProfile.jsx rider type card:
- Shows "Current (42d)" badge on rider type classification
- Backend returns `windowDays` in response for display

---

## Architecture Before vs After

### Before (Fragmented)
```
Dashboard.jsx → Strava API → localStorage cache
RiderProfile.jsx → localStorage.getItem('cached_activities_recent')
PerformanceMetrics.jsx → Strava API + Intervals API + Manual API → merge
WeeklyReport.jsx → localStorage.getItem('cached_activities_recent')
FTPHistory.jsx → Strava API + Intervals API + Manual API → merge
RaceDayPredictor.jsx → localStorage.getItem('cached_activities_recent')
```

### After (Unified)
```
All Pages → getActivities(windowDays) → GET /api/activities → Backend Cache
                                                                    ↓
                                              Server-side fetch + merge + dedup
                                              (Strava + Intervals + Manual)
```

---

## Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Activity fetch locations | 6 pages | 1 backend service |
| localStorage activity reads | ~15 | 0 |
| Client-side merge functions | 3 | 0 |
| Lines removed | ~800 | - |
| Lines added | ~400 | - |
| Net reduction | ~400 lines | - |

---

## Testing Checklist for Alpha

### Per Page:
- [ ] Page loads without errors
- [ ] Activities display correctly
- [ ] No localStorage reads for activities in console
- [ ] Cache HIT logged on second load
- [ ] Cache MISS logged on first load

### Cache Behavior:
- [ ] Manual activity add → cache invalidates → new activity shows
- [ ] Page load < 1 second (cached)
- [ ] Page load < 3 seconds (uncached)
- [ ] No Strava rate limit errors

### Rider Type:
- [ ] Window label shows "Current (42d)"
- [ ] Dual confidence (evidence + certainty) returned
- [ ] Baseline (180d) profile loads correctly

---

## What NOT to Do Yet

❌ Tweak rider-type weights  
❌ Rebalance confidence thresholds  
❌ Optimize power curve maths  

**Reason:** Let the data settle for a few days with real users first.

---

## Files Modified

### Backend:
- `server/services/riderAnalyticsService.js` (NEW)
- `server/services/activityCacheService.js` (NEW)
- `server/routes/activities.js` (NEW)
- `server/routes/analytics.js` (added endpoints)
- `server/routes/manualActivities.js` (cache invalidation)
- `server/index.js` (registered routes)

### Frontend:
- `src/lib/activityCache.js` (NEW)
- `src/pages/PerformanceMetrics.jsx`
- `src/pages/RiderProfile.jsx`
- `src/pages/FTPHistory.jsx`
- `src/pages/WeeklyReport.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/RaceDayPredictor.jsx`

---

## Next Steps

1. **Test with real data** - Run the app and verify all pages load correctly
2. **Monitor cache logs** - Watch for HIT/MISS patterns
3. **Invite alpha testers** - 5-10 club members
4. **Gather feedback** - Focus on:
   - Page load times
   - Data consistency across pages
   - Manual activity visibility
5. **Phase 2 (UI Polish)** - After validation:
   - Dual profile display (current vs baseline)
   - Evidence/certainty badges
   - Window selectors

---

**Status:** Ready for alpha testing. The pipeline is complete.
