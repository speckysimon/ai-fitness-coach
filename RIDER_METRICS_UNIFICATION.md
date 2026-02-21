# Rider Metrics Unification Plan

**Version:** 2.0  
**Date:** January 26, 2026  
**Status:** Revised - Ready for Alpha Testing  
**Priority:** HIGH - Addresses critical issues blocking club tester deployment

---

## Executive Summary

This document outlines the **revised execution order** for unifying rider analytics (FTP, FTHR, Rider Type, Form & Fitness) with a focus on **immediate stability for alpha testers**. The key change from v1.0 is **splitting Phase 3** into:

- **Phase 3A:** Backend Activity Cache (30-60min TTL) - **PRIORITIZED**
- **Phase 3B:** Persisted Activity Store (full database) - **DEFERRED**

**Why this matters:** Phase 3A solves the immediate pain points (localStorage brittleness, Strava rate limits, multi-device inconsistency) without the complexity of a full activity store. This gets a stable alpha to club testers **faster**.

---

## 1. Critical Problems (Why We Need This)

### 1.1 localStorage is Brittle

**Current State:**
- Dashboard caches activities to `localStorage.cached_activities_recent`
- RiderProfile, WeeklyReport, RaceDayPredictor all depend on this cache
- Cache can be cleared by browser, user action, or privacy settings
- No cross-device sync
- No multi-tab consistency

**Impact on Alpha Testers:**
- "Why did my rider type change when I opened a new tab?"
- "I logged in on my phone and all my data is gone"
- "I cleared my cache and lost my profile"

### 1.2 Strava API Rate Limits

**Current State:**
- Each page fetches activities independently
- PerformanceMetrics: 24 weeks of activities
- Form.jsx: 90 days of activities
- Dashboard: Recent activities
- Multiple fetches per session = rate limit hell

**Impact on Alpha Testers:**
- "I can't load my profile, it says rate limit exceeded"
- "Why does it take 30 seconds to load each page?"
- Testers with lots of activities hit limits immediately

### 1.3 Inconsistent Data Across Pages

**Current State:**
- Dashboard shows FTP = 250W (cached from yesterday)
- RiderProfile shows FTP = 245W (fresh calculation)
- PerformanceMetrics shows FTP = 252W (different window)

**Impact on Alpha Testers:**
- "Which number is correct?"
- "Why does my rider type keep changing?"
- Loss of trust in the platform

---

## 2. Revised Execution Order

### Phase 1: Stop the Bleeding (2-3 days)

**Goal:** Windowing everywhere + Centralized calculations + Dual confidence

| Task | Acceptance Criteria |
|------|---------------------|
| 1.1 Add `windowDays` parameter to all analytics | Backend endpoints accept `windowDays` (default: 42) |
| 1.2 Create `/api/analytics/rider-type` endpoint | Returns current (42d) with dataEvidence and modelCertainty |
| 1.3 Create `/api/analytics/power-curve` endpoint | Returns windowed power curve |
| 1.4 Implement Evidence Model | High/Medium/Low based on data quality (rides, efforts, coverage) |
| 1.5 Implement Certainty Model | Separation + Stability metrics |
| 1.6 Update RiderProfile to call endpoints | No more frontend calculation of rider type |

**Done when:** Backend endpoints return windowed metrics with dual confidence (Evidence + Certainty).

**Bridge pattern:** Endpoints accept `{ activities, ftp, windowDays }`. Activities still sent from frontend.

---

### Phase 3A: Backend Activity Cache (1 day) **← CRITICAL FOR TESTERS**

**Goal:** Server-side fetch + merge + dedup with 30-60min TTL cache

**Why Phase 3A Before Phase 2:**
- ✅ Solves localStorage brittleness (server-side cache)
- ✅ Fixes Strava rate limits (single fetch, cached)
- ✅ Enables multi-device consistency (shared cache)
- ✅ Much simpler than full persistence (no schema migrations)
- ✅ Can be implemented in **1 day** vs 2-3 days for Phase 3B
- ✅ Gets alpha to testers **faster**

| Task | Acceptance Criteria |
|------|---------------------|
| 3A.1 Create `activityCacheService.js` | In-memory Map with TTL (30-60min) |
| 3A.2 Implement cache key strategy | `athleteId:windowDays` format |
| 3A.3 Add server-side merge/dedup | Strava + Intervals + Manual → unified array |
| 3A.4 Create `GET /api/activities` endpoint | Returns merged activities with cache headers |
| 3A.5 Update all pages to use cached endpoint | Dashboard, RiderProfile, PerformanceMetrics, etc. |
| 3A.6 Add cache invalidation on new activity | Manual activity triggers cache clear |
| 3A.7 Remove localStorage activity caching | Frontend becomes display-only |

**Implementation:**

```javascript
// server/services/activityCacheService.js
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30min

async function getActivities(athleteId, windowDays = 42) {
  const key = `${athleteId}:${windowDays}`;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.activities;
  }
  
  // Fetch from all sources in parallel
  const [strava, intervals, manual] = await Promise.all([
    fetchStravaActivities(athleteId, windowDays),
    fetchIntervalsActivities(athleteId, windowDays),
    fetchManualActivities(athleteId, windowDays)
  ]);
  
  // Server-side merge + dedup
  const merged = deduplicateActivities([...strava, ...intervals, ...manual]);
  
  cache.set(key, { activities: merged, timestamp: Date.now() });
  return merged;
}
```

**API Contract:**

```typescript
GET /api/activities?windowDays=42

Response:
{
  activities: Activity[],
  cached: true,
  fetchedAt: "2026-01-26T20:00:00Z",
  expiresAt: "2026-01-26T20:30:00Z",
  sources: ["strava", "intervals", "manual"],
  count: 45
}
```

**Done when:** All pages load activities from `/api/activities`. No more localStorage dependency. Strava rate limits resolved.

---

### Phase 2: UI Polish (1-2 days)

**Goal:** Dual profile display + Confidence tooltips + Window selectors

| Task | Acceptance Criteria |
|------|---------------------|
| 2.1 Implement dual profile cards | Side-by-side Current (42d) + Baseline (180d) |
| 2.2 Add evidence/certainty tooltips | Hover shows detailed reasoning |
| 2.3 Add window selector dropdown | 42d / 90d / 180d / Season options |
| 2.4 Hide baseline when insufficient | Graceful fallback for new users |
| 2.5 Show runner-up when mixed | "Puncheur / Climber" for close calls |
| 2.6 Add explicit threshold labels | "Evidence: High" / "Certainty: Moderate" |

**Done when:** RiderProfile shows polished dual profile with interactive tooltips and window selection.

---

### Phase 3B: Persisted Activity Store (2-3 days) **← DEFERRED**

**Goal:** Full database persistence for long-term storage

**Why Deferred:**
- Phase 3A solves the immediate alpha blocker issues
- Phase 3B is a **nice-to-have** for production scale
- Gives us time to validate Phase 3A with real testers
- Can design schema based on actual usage patterns

| Task | Acceptance Criteria |
|------|---------------------|
| 3B.1 Create `athlete_activities` table | MVP schema (only fields needed for metrics) |
| 3B.2 Implement background sync job | Runs every 6 hours, syncs last 90 days |
| 3B.3 Add activity webhook handlers | Strava/Intervals webhooks update DB |
| 3B.4 Update cache to use DB as source | Cache pulls from DB instead of APIs |
| 3B.5 Add activity deduplication logic | Cross-source matching by time + duration |

**MVP Schema:**

```sql
CREATE TABLE athlete_activities (
  id TEXT PRIMARY KEY,
  athlete_id INTEGER NOT NULL,
  source TEXT NOT NULL,              -- 'strava', 'intervals', 'manual'
  start_time INTEGER NOT NULL,       -- Unix timestamp
  duration INTEGER NOT NULL,         -- seconds
  distance REAL,                     -- meters
  elevation REAL,                    -- meters
  has_power BOOLEAN,
  has_hr BOOLEAN,
  strava_id TEXT,
  intervals_id TEXT,
  synced_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_athlete_activities_athlete_time 
  ON athlete_activities(athlete_id, start_time);
```

**Not storing:** Full streams, laps, segments, photos, kudos, etc. Just what's needed for metrics.

**Done when:** Activities persisted to database. Cache pulls from DB. Webhooks update DB in real-time.

---

### Phase 4: Rider Type Refinement (later)

**Goal:** Only after stable foundation

| Task | Acceptance Criteria |
|------|---------------------|
| 4.1 Refine scoring thresholds | Based on real tester data |
| 4.2 Add stability metric | Cheap version using rolling windows |
| 4.3 Integrate Form & Fitness | TSB < -20 degrades evidence |
| 4.4 Update AI coach integration | Down-weight low-evidence metrics |

**Stability Metric (Cheap Version):**

```javascript
function calculateStability(activities, windowDays) {
  // Recompute on 3 rolling subsets
  const windows = [
    windowDays * 0.7,  // 29 days for 42d window
    windowDays * 0.85, // 36 days
    windowDays         // 42 days
  ];
  
  const types = windows.map(w => {
    const subset = filterByWindow(activities, w);
    return classifyRiderType(subset).type;
  });
  
  const winner = types[0];
  const stability = types.filter(t => t === winner).length / 3;
  
  return {
    stable: stability >= 0.67,
    frequency: stability
  };
}
```

---

## 3. Current State Analysis

### Dashboard.jsx (lines 430-490)
- ✅ Already merges Strava + Intervals + Manual
- ❌ Merging happens client-side (line 489)
- ❌ localStorage cache (line 657)
- ❌ Each page does its own merge

### RiderProfile.jsx (lines 101-279)
- ❌ Loads from localStorage cache (line 123)
- ❌ Re-normalizes fields defensively (line 142)
- ✅ Fetches FTP from backend (line 167)
- ❌ Calculates rider type client-side (line 213)

### FTPHistory.jsx (lines 66-257)
- ❌ Fetches activities independently (lines 82-184)
- ❌ Does its own merge (line 180)
- ✅ Uses backend for FTP calculation (line 217)

**What This Means:**
- localStorage fragility - Already visible in code
- Rate limits - Will hit with club testers
- Inconsistency - Each page creates its own "activity world"

---

## 4. Why This Order Works

### Without Phase 3A:
- ❌ Club tester switches browser → loses all data
- ❌ 10 testers × 3 pages = 30 Strava API calls every refresh
- ❌ "Why did my FTP change between pages?"
- ❌ localStorage quota exceeded

### With Phase 3A:
- ✅ Server caches merged activities
- ✅ Single source of truth for all pages
- ✅ Rate limit protection
- ✅ Multi-device support
- ✅ Consistent data across pages

---

## 5. Phase 3A Implementation Details

### 5.1 Backend Service

**File:** `server/services/activityCacheService.js`

```javascript
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30min

function getCacheKey(athleteId, windowDays) {
  return `${athleteId}:${windowDays}`;
}

async function getActivities(athleteId, windowDays = 42) {
  const key = getCacheKey(athleteId, windowDays);
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.activities;
  }
  
  // Fetch from all sources
  const [strava, intervals, manual] = await Promise.all([
    fetchStravaActivities(athleteId, windowDays),
    fetchIntervalsActivities(athleteId, windowDays),
    fetchManualActivities(athleteId, windowDays)
  ]);
  
  // Server-side merge + dedup
  const merged = deduplicateActivities([...strava, ...intervals, ...manual]);
  
  cache.set(key, { activities: merged, timestamp: Date.now() });
  return merged;
}

function invalidateCache(athleteId) {
  // Clear all cache entries for this athlete
  for (const key of cache.keys()) {
    if (key.startsWith(`${athleteId}:`)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  getActivities,
  invalidateCache
};
```

### 5.2 Backend Route

**File:** `server/routes/activities.js`

```javascript
const express = require('express');
const router = express.Router();
const activityCacheService = require('../services/activityCacheService');

router.get('/api/activities', async (req, res) => {
  try {
    const { windowDays = 42 } = req.query;
    const athleteId = req.user.id;
    
    const activities = await activityCacheService.getActivities(athleteId, parseInt(windowDays));
    
    res.json({
      activities,
      cached: true,
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      sources: ['strava', 'intervals', 'manual'],
      count: activities.length
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### 5.3 Frontend Update

**All pages simplified:**

```javascript
// Dashboard, RiderProfile, FTPHistory all use same call
const response = await fetch('/api/activities?windowDays=42');
const { activities } = await response.json();

// No more merging, no more localStorage
// Just display the data
```

### 5.4 Cache Invalidation

```javascript
// When manual activity is added/deleted
router.post('/api/manual-activities', async (req, res) => {
  // ... save activity ...
  
  // Invalidate cache
  activityCacheService.invalidateCache(req.user.id);
  
  res.json({ success: true });
});
```

---

## 6. Success Metrics

### Phase 1 Success:
- [ ] Rider type changes < 5% when window is consistent
- [ ] Evidence tooltips show clear reasoning
- [ ] Backend endpoint responds < 500ms

### Phase 3A Success:
- [ ] **Zero localStorage errors reported by testers**
- [ ] **Strava rate limit errors reduced by 90%+**
- [ ] **Page load times < 1 second**
- [ ] **Multi-device consistency 100%**
- [ ] Cache hit rate > 80%

### Phase 2 Success:
- [ ] Evidence levels match data quality (no "high" with 3 activities)
- [ ] Certainty levels match classification clarity
- [ ] Dual profile shows meaningful differences

### Phase 3B Success:
- [ ] Activities persisted across sessions
- [ ] Webhooks update DB in real-time
- [ ] Historical analysis works for 12+ months

---

## 7. Deployment Timeline

### Days 1-3: Phase 1 (Backend Endpoints)
- Deploy windowed endpoints
- Implement dual confidence model
- Update RiderProfile to use backend
- Monitor for calculation consistency

### Day 4: Phase 3A (Backend Cache) **← ALPHA RELEASE**
- Deploy backend activity cache
- Update all pages to use cached endpoint
- **Invite 5-10 club testers**
- Monitor cache hit rates, error rates

### Days 5-6: Phase 2 (UI Polish)
- Deploy dual profile display
- Add confidence tooltips
- Add window selectors
- Gather tester feedback

### Days 7-10: Phase 3B (Optional)
- **Only proceed if Phase 3A validates well**
- Deploy persisted activity store
- Migrate cache to use DB as source

---

## 8. Rollback Plan

### If Phase 3A Fails:
1. Revert to localStorage pattern
2. Keep Phase 1 improvements (windowing, dual confidence)
3. Reassess Phase 3B approach

### If Phase 3B Fails:
1. Keep Phase 3A (backend cache)
2. Defer full persistence to later release
3. Focus on other features

---

## 9. Key Insights

### 1. Split Phase 3 into 3A/3B
Phase 3 as originally written is a cliff. Breaking it into:
- **3A (cache)** = Fast, low-risk, solves tester pain immediately
- **3B (persist)** = Proper store, can wait

### 2. Backend Cache is Critical
Without Phase 3A, club testers will experience:
- Data loss on browser switch
- Rate limit errors
- Inconsistent metrics across pages
- localStorage quota issues

### 3. Cheap Stability Metric
Avoid per-ride complexity. Use rolling window recomputation:
- 70% of window
- 85% of window
- 100% of window
- Frequency = how often top type stays #1

---

## 10. References

- `RIDER_TYPE_ARCHITECTURE_PLAN.md` — Original v1.0 plan
- `CALCULATIONS_ARCHITECTURE_UNIFICATION_SUMMARY.md` — FTP/FTHR methodology
- `ACTIVITY_DEDUPLICATION_STRATEGY.md` — Cross-source merging logic
- `SESSION_STARTUP.md` — Database architecture

---

**Document created:** January 26, 2026  
**Last updated:** January 26, 2026  
**Next review:** After Phase 3A alpha testing (Day 5)

---

## Summary

**The key insight:** Don't let perfect (Phase 3B: full persistence) be the enemy of good (Phase 3A: backend cache). Phase 3A solves the **immediate alpha blocker issues** in 1 day. Phase 3B is a **production optimization** that can wait until we validate the architecture with real users.

**Priority order:**
1. **Phase 1:** Backend endpoints with windowing + dual confidence (2-3 days)
2. **Phase 3A:** Backend activity cache (1 day) **← CRITICAL FOR ALPHA**
3. **Phase 2:** UI polish (1-2 days)
4. **Phase 3B:** Persisted activity store (2-3 days) **← DEFERRED**
5. **Phase 4:** Rider type refinement (later)

**Total time to alpha:** 4-5 days (Phase 1 + Phase 3A + Phase 2)
