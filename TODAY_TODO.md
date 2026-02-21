# Today's TODO - January 27, 2026

**Focus:** Rider Metrics Unification - Phase 1 & Phase 3A

**Reference:** `RIDER_METRICS_UNIFICATION.md`

---

## 🎯 Today's Goal
Implement Phase 1 (Backend Endpoints) and start Phase 3A (Backend Activity Cache) to get a stable foundation for alpha testers.

---

## ✅ Phase 1: Stop the Bleeding (2-3 hours)

### 1.1 Backend Analytics Endpoints
- [ ] **Create `/api/analytics/rider-type` endpoint**
  - [ ] Add `windowDays` parameter (default: 42)
  - [ ] Implement Evidence Model (High/Medium/Low based on data quality)
  - [ ] Implement Certainty Model (Separation + Stability metrics)
  - [ ] Return both `dataEvidence` and `modelCertainty` in response
  - [ ] Test with sample activities

- [ ] **Create `/api/analytics/power-curve` endpoint**
  - [ ] Add `windowDays` parameter (default: 42)
  - [ ] Filter activities by date window
  - [ ] Calculate power curve for 8 durations (5s, 10s, 30s, 60s, 5m, 10m, 20m, 60m)
  - [ ] Return windowed power curve data

- [ ] **Update existing FTP/FTHR endpoints**
  - [ ] Verify they accept `windowDays` parameter
  - [ ] Ensure they return confidence data (already done, verify)

### 1.2 Frontend Integration
- [ ] **Update `RiderProfile.jsx`**
  - [ ] Replace client-side `classifyRiderType()` call with API call to `/api/analytics/rider-type`
  - [ ] Pass `windowDays: 42` for current profile
  - [ ] Pass `windowDays: 180` for baseline profile
  - [ ] Display evidence and certainty badges
  - [ ] Remove direct import of `classifyRiderType` from `riderAnalytics.js`

- [ ] **Update `RiderProfile.jsx` power curve**
  - [ ] Replace client-side `calculatePowerCurve()` with API call to `/api/analytics/power-curve`
  - [ ] Pass `windowDays: 42`
  - [ ] Update chart to use API response

### 1.3 Testing
- [ ] Test rider type endpoint with 10+ activities
- [ ] Test power curve endpoint with various window sizes
- [ ] Verify evidence levels match data quality
- [ ] Check that confidence scores are reasonable

---

## 🚀 Phase 3A: Backend Activity Cache (2-3 hours)

### 3A.1 Create Activity Cache Service
- [ ] **Create `server/services/activityCacheService.js`**
  - [ ] Implement in-memory Map cache with 30-min TTL
  - [ ] Create `getCacheKey(athleteId, windowDays)` function
  - [ ] Create `getActivities(athleteId, windowDays)` function
  - [ ] Implement cache hit/miss logic
  - [ ] Add server-side fetch from Strava/Intervals/Manual
  - [ ] Implement `deduplicateActivities()` function
  - [ ] Create `invalidateCache(athleteId)` function

### 3A.2 Create Activities API Route
- [ ] **Create `server/routes/activities.js`**
  - [ ] Create `GET /api/activities` endpoint
  - [ ] Accept `windowDays` query parameter (default: 42)
  - [ ] Call `activityCacheService.getActivities()`
  - [ ] Return merged activities with cache metadata
  - [ ] Add error handling

- [ ] **Register route in `server/index.js`**
  - [ ] Import activities route
  - [ ] Register with `app.use()`

### 3A.3 Update Frontend Pages
- [ ] **Update `Dashboard.jsx`**
  - [ ] Replace client-side activity fetching with `GET /api/activities?windowDays=90`
  - [ ] Remove localStorage caching logic
  - [ ] Remove client-side merge logic
  - [ ] Test that dashboard loads correctly

- [ ] **Update `RiderProfile.jsx`**
  - [ ] Replace localStorage read with `GET /api/activities?windowDays=180`
  - [ ] Remove defensive normalization (server handles it)
  - [ ] Test that profile loads correctly

- [ ] **Update `PerformanceMetrics.jsx`**
  - [ ] Replace client-side fetching with `GET /api/activities?windowDays=168` (24 weeks)
  - [ ] Remove merge logic
  - [ ] Test charts display correctly

- [ ] **Update `FTPHistory.jsx`**
  - [ ] Replace client-side fetching with `GET /api/activities?windowDays=168`
  - [ ] Remove merge logic
  - [ ] Test FTP history displays correctly

- [ ] **Update `WeeklyReport.jsx`**
  - [ ] Replace localStorage read with `GET /api/activities?windowDays=7`
  - [ ] Test weekly metrics display correctly

- [ ] **Update `RaceDayPredictor.jsx`**
  - [ ] Replace localStorage read with `GET /api/activities?windowDays=90`
  - [ ] Test form calculation works

### 3A.4 Cache Invalidation
- [ ] **Update manual activity endpoints**
  - [ ] Call `activityCacheService.invalidateCache()` on POST (create)
  - [ ] Call `activityCacheService.invalidateCache()` on DELETE
  - [ ] Test that cache clears correctly

### 3A.5 Testing
- [ ] Test cache hit (second load should be instant)
- [ ] Test cache miss (first load or after TTL)
- [ ] Test cache invalidation (add manual activity, verify cache clears)
- [ ] Test multi-device consistency (same data across tabs)
- [ ] Monitor for Strava rate limit errors (should be eliminated)
- [ ] Test with 0 activities, 5 activities, 100+ activities

---

## 📋 Success Criteria

### Phase 1 Complete When:
- [ ] Rider type calculated by backend, not frontend
- [ ] Power curve calculated by backend with windowing
- [ ] Evidence and certainty displayed in UI
- [ ] No more client-side `classifyRiderType()` calls

### Phase 3A Complete When:
- [ ] All pages load activities from `/api/activities`
- [ ] No more localStorage activity caching
- [ ] No more client-side merge logic
- [ ] Cache hit rate > 80% (check logs)
- [ ] Page load times < 1 second (cached)
- [ ] Strava rate limit errors eliminated

---

## 🐛 Known Issues to Watch For

1. **Token Refresh:** Ensure Strava token refresh works in cache service
2. **Cache Key Collision:** Verify athleteId is properly isolated
3. **Memory Leaks:** Monitor cache size (consider max entries limit)
4. **Race Conditions:** Test concurrent requests to same cache key
5. **Error Handling:** Ensure graceful fallback if cache service fails

---

## 📝 Notes

- **Don't implement Phase 2 (UI Polish) yet** - Focus on backend stability first
- **Don't implement Phase 3B (Persisted Store)** - Deferred until after alpha testing
- **Keep Phase 4 (Refinement)** for later - Get foundation solid first

---

## 🚦 Next Steps (Tomorrow)

After Phase 1 + Phase 3A are complete:
1. Monitor cache performance for 24 hours
2. Gather feedback on stability
3. Then proceed to Phase 2 (UI Polish) - Dual profile display, tooltips, window selectors
4. Invite 5-10 alpha testers once Phase 2 is complete

---

**Estimated Time:** 4-6 hours total
**Priority:** HIGH - Blocks alpha testing
**Status:** 🟡 In Progress
