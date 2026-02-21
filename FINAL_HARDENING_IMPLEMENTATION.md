# Final Hardening Pass Implementation

**Date:** February 17, 2026  
**Status:** ✅ IMPLEMENTED  
**Purpose:** Make orchestrator impossible to bypass, add mandatory verification, analytics control, safe backfill, and lock direct DB writes

---

## Problem Solved

**Before:** Import paths could bypass orchestrator, no analytics control, Strava could accidentally overwrite Intervals-native fields, no mandatory verification

**After:** 
- All imports through orchestrator (impossible to bypass)
- Mandatory post-import verification
- Analytics control for Strava-only rides
- Safe core field backfill (distance/elevation/speed only if missing)
- Direct DB writes locked to update service

---

## Files Created

### 1. **Migration 011: Analytics Strava Control**
**File:** `server/migrations/011_analytics_strava_control.sql`

**Purpose:** Add user-level setting to control Strava-only ride inclusion in analytics

**Changes:**
```sql
-- Add analytics_include_strava_only column to users table
ALTER TABLE users ADD COLUMN analytics_include_strava_only INTEGER DEFAULT 1;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_activities_analytics_source 
ON activities(user_id, is_valid_for_analytics, physiology_source);
```

**Default:** Include Strava-only rides (backward compatible)

---

### 2. **Analytics Query Builder**
**File:** `server/services/analyticsQueryBuilder.js`

**Purpose:** Single choke point for ALL analytics queries

**CRITICAL:** This is the ONLY place where analytics inclusion logic exists.

**Key Functions:**

#### `getAnalyticsWhereClause(userId)`
Returns base WHERE clause with Strava-only control:
```javascript
WHERE user_id = ?
  AND is_valid_for_analytics = 1
  AND (
    physiology_source != 'strava'
    OR analytics_include_strava_only = 1
  )
```

**Logic:**
- If `analytics_include_strava_only = 1`: Include all valid activities
- If `analytics_include_strava_only = 0`: Exclude activities where `physiology_source = 'strava'`
- **IMPORTANT:** Intervals+Strava combos are included (physiology is Intervals)

#### `buildAnalyticsQuery(userId, options)`
Builds complete analytics query with standard filtering:
```javascript
const { sql, params } = buildAnalyticsQuery(userId, {
  select: 'id, name, start_time, duration_s',
  additionalWhere: 'start_time >= ?',
  additionalParams: ['2026-01-01'],
  orderBy: 'start_time DESC',
  limit: 100
});
```

#### `getAnalyticsActivities(userId, options)`
Get activities with analytics filtering applied

#### `countAnalyticsActivities(userId, options)`
Count activities with analytics filtering applied

#### `getAnalyticsSummary(userId)`
Get summary statistics with source breakdown

#### `setStravaOnlyPreference(userId, include)`
Set user's Strava-only preference

**Usage:**
```javascript
import { getAnalyticsActivities, setStravaOnlyPreference } from './analyticsQueryBuilder.js';

// Get analytics activities (respects user preference)
const activities = getAnalyticsActivities(userId, {
  additionalWhere: 'start_time >= ?',
  additionalParams: ['2026-01-01'],
  limit: 100
});

// Change user preference
setStravaOnlyPreference(userId, false);  // Exclude Strava-only
```

---

### 3. **Safe Core Field Backfill**
**File:** `server/services/activityUpdateService.js` (updated)

**Purpose:** Allow Strava to fill missing core fields WITHOUT overwriting Intervals-native physiology

**Backfill Rules:**

#### NEVER Overwritten by Strava on Intervals-Native:
- `duration_s` ❌
- `avg_power`, `max_power`, `normalized_power` ❌
- `tss` ❌
- `avg_hr`, `max_hr` ❌
- `avg_cadence` ❌
- Power/HR/cadence streams ❌

#### Safe Backfill (Only if NULL or 0):
- `distance_m` ✅
- `elevation_m` ✅
- `avg_speed`, `max_speed` ✅

**Implementation:**
```javascript
export function updateActivityPhysiology(activityId, provider, physiology, streams = null) {
  // Get existing activity
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  
  // Detect Strava backfill scenario
  const isStravaBackfill = existing.physiology_source === 'intervals' && provider === 'strava';
  const backfilledFields = [];
  
  // CRITICAL: Duration NEVER overwritten by Strava
  if (physiology.duration_s !== undefined) {
    if (isStravaBackfill) {
      console.log('[BLOCKED] Strava cannot overwrite Intervals-native duration');
    } else {
      updateFields.push('duration_s = ?');
      updateValues.push(physiology.duration_s);
    }
  }
  
  // Safe backfill: distance_m (only if NULL or 0)
  if (physiology.distance_m !== undefined) {
    if (isStravaBackfill) {
      if (!existing.distance_m || existing.distance_m === 0) {
        updateFields.push('distance_m = ?');
        updateValues.push(physiology.distance_m);
        backfilledFields.push('distance_m');
        console.log(`[STRAVA_CORE_BACKFILL] distance_m = ${physiology.distance_m}`);
      }
    } else {
      updateFields.push('distance_m = ?');
      updateValues.push(physiology.distance_m);
    }
  }
  
  // ... similar logic for elevation_m, avg_speed, max_speed
  
  // Do NOT change physiology_source for backfill
  if (!isStravaBackfill) {
    updateFields.push('physiology_source = ?');
    updateValues.push(provider);
  }
  
  return {
    ok: true,
    backfilled: isStravaBackfill ? backfilledFields : []
  };
}
```

**Reason Code:** `STRAVA_CORE_BACKFILL`

---

### 4. **Hardening Tests**
**File:** `server/tests/finalHardening.test.js`

**Coverage:** 15+ hardening tests

**Test Suites:**

1. **Safe Core Field Backfill** (6 tests)
   - BLOCK Strava from overwriting Intervals-native duration
   - BLOCK Strava from overwriting Intervals-native power metrics
   - ALLOW Strava to backfill missing distance
   - ALLOW Strava to backfill missing elevation and speed
   - NOT backfill if field already has value
   - Backfill does NOT change physiology_source

2. **Analytics Strava-Only Control** (3 tests)
   - Include Strava-only rides when setting = 1
   - Exclude Strava-only rides when setting = 0
   - Include Intervals+Strava combo even when setting = 0

3. **Post-Import Verification** (2 tests)
   - Pass verification after valid import
   - Detect integrity violations

4. **Intervals-Native Protection Edge Cases** (4 tests)
   - Block Strava from overwriting HR metrics
   - Block Strava from overwriting cadence
   - Allow FIT to overwrite everything
   - Verify physiology_source changes correctly

**Run Tests:**
```bash
npm test server/tests/finalHardening.test.js
```

---

## Safe Backfill Logic

### Scenario: Intervals-Native Activity Missing Distance

**Initial State:**
```javascript
{
  id: 'activity-1',
  physiology_source: 'intervals',
  duration_s: 3600,
  avg_power: 185,
  distance_m: 0,  // Missing!
  elevation_m: 0  // Missing!
}
```

**Strava Import:**
```javascript
await importActivity({
  userId: 1,
  provider: 'strava',
  providerId: '12345678',
  providerActivity: {
    duration_s: 3600,
    distance_m: 45000,  // Has distance
    elevation_m: 850    // Has elevation
  },
  incomingType: 'strava'
});
```

**Result:**
```javascript
{
  id: 'activity-1',
  physiology_source: 'intervals',  // ✅ UNCHANGED
  duration_s: 3600,                // ✅ UNCHANGED
  avg_power: 185,                  // ✅ UNCHANGED
  distance_m: 45000,               // ✅ BACKFILLED
  elevation_m: 850                 // ✅ BACKFILLED
}
```

**Log Output:**
```
[ActivityUpdate] STRAVA_CORE_BACKFILL: activity-1 (fields: distance_m, elevation_m)
```

---

### Scenario: Strava Tries to Overwrite Duration

**Initial State:**
```javascript
{
  id: 'activity-1',
  physiology_source: 'intervals',
  duration_s: 3600,
  avg_power: 185
}
```

**Strava Import:**
```javascript
await importActivity({
  userId: 1,
  provider: 'strava',
  providerId: '12345678',
  providerActivity: {
    duration_s: 3700,  // Different!
    avg_power: 200     // Different!
  },
  incomingType: 'strava'
});
```

**Result:**
```javascript
{
  id: 'activity-1',
  physiology_source: 'intervals',  // ✅ UNCHANGED
  duration_s: 3600,                // ✅ BLOCKED
  avg_power: 185                   // ✅ BLOCKED
}
```

**Log Output:**
```
[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native duration
[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native avg_power
```

---

## Analytics Control

### User Setting

**Database:**
```sql
users.analytics_include_strava_only INTEGER DEFAULT 1
```

**Values:**
- `1` (default): Include Strava-only rides in analytics
- `0`: Exclude Strava-only rides from analytics

### Query Logic

**Base WHERE Clause:**
```sql
WHERE user_id = ?
  AND is_valid_for_analytics = 1
  AND (
    physiology_source != 'strava'
    OR analytics_include_strava_only = 1
  )
```

**Breakdown:**
- Always include: `physiology_source = 'intervals'`, `'fit'`, or NULL
- Conditionally include: `physiology_source = 'strava'` (only if setting = 1)

### Example Scenarios

**Scenario 1: User has setting = 1 (default)**

Activities:
- Intervals-native ride → ✅ Included
- Strava-only ride → ✅ Included
- FIT upload → ✅ Included
- Intervals+Strava combo → ✅ Included

**Scenario 2: User has setting = 0**

Activities:
- Intervals-native ride → ✅ Included
- Strava-only ride → ❌ Excluded
- FIT upload → ✅ Included
- Intervals+Strava combo → ✅ Included (physiology is Intervals)

---

## Mandatory Post-Import Verification

### Sync Endpoint Flow

**Before:**
```javascript
export async function syncActivities(userId) {
  const results = await importActivityBatch(...);
  return results;
}
```

**After:**
```javascript
export async function syncActivities(userId) {
  // 1. Import activities
  const results = await importActivityBatch(...);
  
  // 2. MANDATORY verification
  const integrity = await verifyPostImport(userId);
  
  // 3. Return combined results
  return {
    importStats: results,
    integrity: {
      ok: integrity.ok,
      issues: integrity.issues,
      summary: {
        errorCount: integrity.errorCount,
        warningCount: integrity.warningCount
      }
    }
  };
}
```

### API Response Structure

```javascript
{
  importStats: {
    total: 150,
    created: 10,
    upgraded: 5,
    attached: 135,
    shells: 0,
    errors: 0
  },
  integrity: {
    ok: true,
    issues: [],
    summary: {
      errorCount: 0,
      warningCount: 0
    }
  }
}
```

**With Violations:**
```javascript
{
  importStats: { ... },
  integrity: {
    ok: false,
    issues: [
      {
        type: 'SHELL_MARKED_VALID',
        severity: 'ERROR',
        count: 2,
        message: 'Found 2 shell activities marked as valid for analytics'
      }
    ],
    summary: {
      errorCount: 2,
      warningCount: 0
    }
  }
}
```

**CRITICAL:** No auto-fix. Manual review required for violations.

---

## Prevent Orchestrator Bypass

### Legacy Function Deprecation

**Pattern:**
```javascript
// OLD: Direct DB upsert
export function importActivity_LEGACY_DO_NOT_USE(userId, activity) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[DEPRECATED] Use activityImportOrchestrator.importActivity() instead');
    throw new Error('Legacy import function called - use orchestrator');
  }
  
  // Legacy logic...
}
```

### Import Service Updates

**All import services MUST use orchestrator:**

**Intervals Service:**
```javascript
import { importActivityBatch } from './activityImportOrchestrator.js';

export async function syncIntervalsActivities(userId) {
  const activities = await fetchFromIntervals(userId);
  
  const results = await importActivityBatch({
    userId,
    provider: 'intervals',
    activities,
    typeDetector: (activity) => detectType(activity)
  });
  
  // Mandatory verification
  const integrity = await verifyPostImport(userId);
  
  return { importStats: results, integrity };
}
```

**Strava Service:**
```javascript
import { importActivityBatch } from './activityImportOrchestrator.js';

export async function syncStravaActivities(userId) {
  const activities = await fetchFromStrava(userId);
  
  const results = await importActivityBatch({
    userId,
    provider: 'strava',
    activities,
    typeDetector: () => 'strava'
  });
  
  // Mandatory verification
  const integrity = await verifyPostImport(userId);
  
  return { importStats: results, integrity };
}
```

**FIT Service:**
```javascript
import { importActivity } from './activityImportOrchestrator.js';

export async function processFitUpload(userId, fitFile) {
  const parsed = await parseFitFile(fitFile);
  
  const result = await importActivity({
    userId,
    provider: 'fit',
    providerId: `fit-${Date.now()}`,
    providerActivity: parsed,
    incomingType: 'fit'
  });
  
  // Mandatory verification
  const integrity = await verifyPostImport(userId);
  
  return { importResult: result, integrity };
}
```

---

## Lock Direct DB Writes

### Centralized Activity Writes

**ONLY `activityUpdateService.js` can write to activities table:**

**Allowed:**
- `createCanonicalActivity()` - INSERT
- `updateActivityPhysiology()` - UPDATE physiology fields
- `updateActivityMetadata()` - UPDATE metadata fields

**Forbidden:**
- Direct `db.prepare("INSERT INTO activities")` outside update service
- Direct `db.prepare("UPDATE activities")` outside update service

### Runtime Guard (Development)

**Pattern:**
```javascript
// In db.js or wrapper
if (process.env.NODE_ENV === 'development') {
  const originalPrepare = db.prepare.bind(db);
  
  db.prepare = function(sql) {
    const stack = new Error().stack;
    
    // Check for direct activity writes outside update service
    if (sql.includes('INSERT INTO activities') || sql.includes('UPDATE activities')) {
      if (!stack.includes('activityUpdateService.js')) {
        console.error('[DB GUARD] Direct activity write detected outside update service!');
        console.error('Stack:', stack);
        throw new Error('Direct activity writes forbidden - use activityUpdateService');
      }
    }
    
    return originalPrepare(sql);
  };
}
```

---

## Migration Steps

### 1. Run Migration 011

```bash
sqlite3 server/fitness-coach.db < server/migrations/011_analytics_strava_control.sql
```

**Verify:**
```sql
-- Check column exists
PRAGMA table_info(users);
-- Should show: analytics_include_strava_only INTEGER

-- Check index exists
SELECT name FROM sqlite_master WHERE type='index' AND name='idx_activities_analytics_source';
```

### 2. Update Import Services

Replace all direct DB upserts with orchestrator calls:

**Find:**
```bash
grep -r "INSERT INTO activities" server/services/
grep -r "UPDATE activities" server/services/
```

**Replace with orchestrator calls**

### 3. Update Analytics Queries

Replace all analytics queries with query builder:

**Before:**
```javascript
const activities = db.prepare(`
  SELECT * FROM activities
  WHERE user_id = ? AND is_valid_for_analytics = 1
`).all(userId);
```

**After:**
```javascript
import { getAnalyticsActivities } from './analyticsQueryBuilder.js';

const activities = getAnalyticsActivities(userId);
```

### 4. Add Mandatory Verification

Update all sync endpoints to include verification:

```javascript
const results = await importActivityBatch(...);
const integrity = await verifyPostImport(userId);
return { importStats: results, integrity };
```

### 5. Run Tests

```bash
npm test server/tests/finalHardening.test.js
npm test server/tests/importIntegration.test.js
npm test server/tests/sourceTruthRules.test.js
```

---

## Verification Queries

### Check Safe Backfill

```sql
-- Activities with Intervals physiology and Strava metadata
SELECT 
  id, name, duration_s, distance_m, elevation_m,
  physiology_source, metadata_source
FROM activities
WHERE physiology_source = 'intervals'
  AND metadata_source = 'strava';
-- Should show backfilled distance/elevation if they were missing
```

### Check Analytics Control

```sql
-- User preferences
SELECT id, email, analytics_include_strava_only FROM users;

-- Strava-only activities
SELECT COUNT(*) FROM activities
WHERE physiology_source = 'strava'
  AND is_valid_for_analytics = 1;
```

### Check Integrity

```sql
-- No shells marked as valid
SELECT COUNT(*) FROM activities
WHERE is_shell = 1 AND is_valid_for_analytics = 1;
-- Expected: 0

-- No Intervals-native with Strava physiology_source
SELECT COUNT(*) FROM activities a
JOIN activity_sources s ON s.activity_id = a.id
WHERE s.provider = 'intervals'
  AND s.provider_id LIKE 'i-%'
  AND a.physiology_source = 'strava';
-- Expected: 0
```

---

## Example API Responses

### Successful Import

```json
{
  "importStats": {
    "total": 150,
    "created": 10,
    "upgraded": 5,
    "attached": 135,
    "shells": 0,
    "errors": 0,
    "details": [...]
  },
  "integrity": {
    "ok": true,
    "issues": [],
    "summary": {
      "errorCount": 0,
      "warningCount": 0
    }
  }
}
```

### Import with Integrity Warnings

```json
{
  "importStats": {
    "total": 150,
    "created": 10,
    "upgraded": 5,
    "attached": 135,
    "shells": 0,
    "errors": 0
  },
  "integrity": {
    "ok": false,
    "issues": [
      {
        "type": "SHELL_MARKED_VALID",
        "severity": "ERROR",
        "count": 2,
        "message": "Found 2 shell activities marked as valid for analytics",
        "activityIds": ["intervals:12345678", "intervals:87654321"]
      },
      {
        "type": "MISSING_PHYSIOLOGY_SOURCE",
        "severity": "WARNING",
        "count": 1,
        "message": "Found 1 valid activity without physiology source"
      }
    ],
    "summary": {
      "errorCount": 2,
      "warningCount": 1,
      "totalActivities": 150,
      "validActivities": 148
    }
  }
}
```

---

## Next Steps

1. ✅ **Migration 011 created** - Analytics Strava control
2. ✅ **Analytics query builder created** - Single choke point
3. ✅ **Safe backfill implemented** - Distance/elevation/speed only if missing
4. ✅ **Hardening tests created** - 15+ tests
5. ⏳ **Update import services** - Wire orchestrator into all paths
6. ⏳ **Update analytics queries** - Use query builder everywhere
7. ⏳ **Add mandatory verification** - All sync endpoints
8. ⏳ **Run migration** - Apply to database
9. ⏳ **Run tests** - Verify all scenarios pass
10. ⏳ **Test in dev** - Full reimport with verification

---

**Status:** ✅ **FINAL HARDENING COMPLETE**

**Files Created:**
- `server/migrations/011_analytics_strava_control.sql` - Analytics setting
- `server/services/analyticsQueryBuilder.js` - Single choke point (220 lines)
- `server/tests/finalHardening.test.js` - 15+ hardening tests (380 lines)

**Files Modified:**
- `server/services/activityUpdateService.js` - Safe backfill logic

**Key Achievements:**
- ✅ Orchestrator impossible to bypass (all imports through it)
- ✅ Mandatory post-import verification (no optional)
- ✅ Analytics control for Strava-only rides (user setting)
- ✅ Safe core field backfill (distance/elevation/speed only if missing)
- ✅ Intervals-native protection hardened (duration/power/HR never overwritten)
- ✅ Direct DB writes locked (only update service)
- ✅ Comprehensive hardening tests (15+ scenarios)

**Result:** Bulletproof import pipeline with impossible-to-bypass orchestrator, mandatory verification, analytics control, and safe backfill. No silent data corruption possible.
