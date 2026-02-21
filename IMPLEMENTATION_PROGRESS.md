# Rider Metrics Unification - Implementation Progress

**Date:** January 27, 2026  
**Status:** Phase 1 & Phase 3A Backend Complete (50%)

---

## ✅ Completed

### Phase 1: Backend Analytics Endpoints
- ✅ Created `server/services/riderAnalyticsService.js`
  - `calculatePowerCurve(activities, windowDays)` - Windowed power curve calculation
  - `classifyRiderType(activities, powerCurve, ftp, windowDays)` - Rider type with dual confidence
  - `calculateEvidence()` - Data quality assessment (High/Medium/Low)
  - `calculateCertainty()` - Model clarity assessment (High/Moderate/Low)
  
- ✅ Added new endpoints to `server/routes/analytics.js`
  - `POST /api/analytics/power-curve` - Calculate power curve with windowing
  - `POST /api/analytics/rider-type` - Classify rider type with dual confidence
  
### Phase 3A: Backend Activity Cache (Backend)
- ✅ Created `server/services/activityCacheService.js`
  - In-memory cache with 30-min TTL
  - Server-side fetch from Strava/Intervals/Manual
  - Deduplication logic (Strava > Intervals > Manual priority)
  - Field normalization for consistent data format
  - Cache invalidation by athlete ID
  - Automatic cleanup of expired entries
  
- ✅ Created `server/routes/activities.js`
  - `GET /api/activities?windowDays=42` - Fetch cached activities
  - `POST /api/activities/invalidate` - Clear cache for athlete
  - `GET /api/activities/cache-stats` - Monitor cache performance
  
- ✅ Registered routes in `server/index.js`

---

## 🚧 In Progress

### Phase 1.2: Update RiderProfile.jsx
Need to replace client-side calculations with backend API calls:
- Replace `calculatePowerCurve()` with `POST /api/analytics/power-curve`
- Replace `classifyRiderType()` with `POST /api/analytics/rider-type`
- Display evidence and certainty badges

---

## 📋 Remaining Tasks

### Phase 3A.3: Update Frontend Pages
Need to update 6 pages to use `/api/activities` instead of localStorage:

1. **Dashboard.jsx** (lines 430-490)
   - Remove client-side Strava/Intervals fetching
   - Remove localStorage caching
   - Call `GET /api/activities?windowDays=90`

2. **RiderProfile.jsx** (lines 101-279)
   - Remove localStorage.getItem('cached_activities_recent')
   - Call `GET /api/activities?windowDays=180`
   - Remove defensive normalization

3. **PerformanceMetrics.jsx** (lines 79-317)
   - Remove client-side fetching
   - Call `GET /api/activities?windowDays=168` (24 weeks)

4. **FTPHistory.jsx** (lines 66-257)
   - Remove client-side fetching
   - Call `GET /api/activities?windowDays=168`

5. **WeeklyReport.jsx** (lines 31-122)
   - Remove localStorage dependency
   - Call `GET /api/activities?windowDays=7`

6. **RaceDayPredictor.jsx** (lines 26-61)
   - Remove localStorage dependency
   - Call `GET /api/activities?windowDays=90`

### Phase 3A.4: Cache Invalidation
Update manual activity routes to invalidate cache:
- `server/routes/manualActivities.js`
  - Call `invalidateCache(athleteId)` on POST (create)
  - Call `invalidateCache(athleteId)` on DELETE

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- [x] Rider type calculated by backend
- [x] Power curve calculated by backend with windowing
- [x] Dual confidence model implemented (Evidence + Certainty)
- [ ] RiderProfile.jsx uses backend APIs
- [ ] Evidence and certainty displayed in UI

### Phase 3A Complete When:
- [x] Backend cache service created
- [x] `/api/activities` endpoint working
- [ ] All 6 pages use cached endpoint
- [ ] No more localStorage activity caching
- [ ] Cache invalidation on manual activity changes
- [ ] Cache hit rate > 80%
- [ ] Page load times < 1 second (cached)

---

## 📊 Architecture Changes

### Before (Current State)
```
Frontend Pages → localStorage cache → Client-side merge → Display
     ↓
Multiple independent Strava/Intervals/Manual fetches
```

### After (Target State)
```
Frontend Pages → GET /api/activities → Backend Cache → Display
                                            ↓
                        Server-side fetch + merge + dedup
                        (Strava + Intervals + Manual)
```

---

## 🔧 Technical Details

### Cache Strategy
- **TTL:** 30 minutes
- **Key Format:** `athleteId:windowDays`
- **Storage:** In-memory Map (can upgrade to Redis later)
- **Cleanup:** Automatic every 10 minutes

### Deduplication Logic
1. Create activity key: `roundedTimestamp:roundedDuration`
2. Priority: Strava > Intervals.icu > Manual
3. Keep highest priority source for each unique activity

### Field Normalization
All activities normalized to consistent format:
- `date` - ISO string
- `avgPower` - watts
- `avgHeartRate` - bpm
- `duration` - seconds
- `distance` - meters
- `elevation` - meters

---

## 📝 Next Steps

1. Update RiderProfile.jsx to use backend rider-type API
2. Update all 6 pages to use `/api/activities`
3. Add cache invalidation to manual activity routes
4. Test end-to-end with real data
5. Monitor cache performance
6. Proceed to Phase 2 (UI Polish) after validation

---

## 🐛 Known Issues / Considerations

1. **Token Management:** Need to pass Strava/Intervals tokens from frontend to backend
2. **Athlete ID:** Currently using email as identifier, may need proper user ID
3. **Error Handling:** Need graceful fallback if cache service fails
4. **Memory Usage:** Monitor cache size, may need max entries limit
5. **Race Conditions:** Test concurrent requests to same cache key

---

**Estimated Remaining Time:** 2-3 hours
**Priority:** HIGH - Blocks alpha testing
