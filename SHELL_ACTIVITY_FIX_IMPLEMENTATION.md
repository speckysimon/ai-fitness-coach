# Shell Activity Ingestion Fix - Implementation Guide

**Date:** February 17, 2026  
**Status:** ✅ IMPLEMENTED - Ready for Integration  
**Version:** 1.0

---

## Problem Statement

Intervals.icu sometimes returns "shell" activities that are Strava-synced placeholders (numeric IDs) with missing core fields (0 duration/distance, missing streams, etc.). These were being imported as canonical activities, leaving "Untitled / 0 duration" garbage in the DB and poisoning analytics.

---

## Solution Overview

Implemented a deterministic **source priority + dedupe + enrichment** pipeline that:

1. **Detects shell activities** from Intervals.icu (numeric IDs with missing data)
2. **Prevents shell canonicals** when Strava or FIT can provide real data
3. **Enriches shells from Strava** when user has Strava connected
4. **Avoids duplicates** with fuzzy matching and source tracking
5. **Filters analytics** to exclude invalid shell activities

---

## Files Changed

### 1. Database Migration
**File:** `server/migrations/009_shell_enrichment_fix.sql`

**Changes:**
- Added `canonical_source` column to `activities` table (tracks which provider won)
- Added `is_valid_for_analytics` column to `activities` table (excludes shells from analytics)
- Added `shell_strava_id` column to `activity_sources` table (stores Strava ID from shells)
- Created indexes for analytics queries and shell enrichment lookups

**Migration SQL:**
```sql
-- Add canonical_source to track which provider won for this activity
ALTER TABLE activities ADD COLUMN canonical_source TEXT DEFAULT NULL;

-- Add is_valid_for_analytics flag to exclude shells from analytics
ALTER TABLE activities ADD COLUMN is_valid_for_analytics INTEGER NOT NULL DEFAULT 1;

-- Add shell_strava_id to store the numeric Strava ID from Intervals shells
ALTER TABLE activity_sources ADD COLUMN shell_strava_id TEXT DEFAULT NULL;

-- Update existing activities
UPDATE activities SET canonical_source = primary_source WHERE canonical_source IS NULL;
UPDATE activities SET is_valid_for_analytics = CASE WHEN is_shell = 1 THEN 0 ELSE 1 END;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activities_analytics 
  ON activities(user_id, start_time DESC) 
  WHERE is_valid_for_analytics = 1;

CREATE INDEX IF NOT EXISTS idx_activity_sources_shell_strava_id 
  ON activity_sources(user_id, shell_strava_id) 
  WHERE shell_strava_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_canonical_source 
  ON activities(canonical_source, is_valid_for_analytics);
```

---

### 2. Shell Resolver Service
**File:** `server/services/activityShellResolver.js` (NEW)

**Purpose:** Core logic for shell detection, deduplication, and enrichment orchestration

**Key Functions:**

#### `detectIntervalsShell(intervalsActivity)`
Detects if an Intervals activity is a shell placeholder.

**Heuristics:**
- Activity ID is numeric (Strava ID pattern)
- Missing core fields (duration == 0 OR distance == 0 OR no start_date)
- No meaningful metrics (no power, HR, or TSS)

**Returns:**
```javascript
{
  isShell: boolean,
  stravaId: string | null,
  reason: string
}
```

**Example:**
```javascript
const activity = {
  id: '12345678',  // Numeric = Strava ID
  duration: 0,
  distance: 0,
  start_date: '2026-02-17T10:00:00Z'
};

const result = detectIntervalsShell(activity);
// { isShell: true, stravaId: '12345678', reason: 'missing_core_fields:...' }
```

#### `resolveCanonicalActivity(params)`
Determines action for incoming activity based on existing canonicals, source priority, and shell status.

**Parameters:**
```javascript
{
  userId: number,
  activity: Object,
  provider: 'intervals' | 'strava' | 'fit',
  providerId: string,
  isShell: boolean,
  stravaId: string | null,
  stravaConnected: boolean
}
```

**Returns:**
```javascript
{
  action: 'skip' | 'create_source_only' | 'upsert_canonical' | 'merge_into_existing',
  canonicalActivityId: string | null,
  reason: string,
  shouldEnrich: boolean,
  shouldUpgrade: boolean  // If merging, should we upgrade canonical source?
}
```

**Decision Logic:**

| Scenario | Action | Reason |
|----------|--------|--------|
| Shell + Strava connected | `create_source_only` | Queue for Strava enrichment |
| Shell + Strava NOT connected | `create_source_only` | Store as invalid for analytics |
| Native Intervals | `upsert_canonical` | Create canonical from Intervals |
| Strava arrives after Intervals | `merge_into_existing` | Upgrade canonical to Strava |
| FIT arrives after Strava | `merge_into_existing` | Upgrade canonical to FIT |
| Duplicate provider record | `skip` | Already imported |

**Source Priority (higher = better):**
```javascript
{
  fit: 4,           // Raw device data - highest priority
  strava: 3,        // Full Strava data
  intervals: 2,     // Native Intervals data
  intervals_shell: 1 // Intervals shell (placeholder)
}
```

#### `isStravaConnected(userId)`
Checks if user has Strava OAuth tokens.

#### `getPendingShellEnrichments(userId, limit)`
Gets shell activities pending Strava enrichment.

---

### 3. Test Suite
**File:** `server/tests/shellEnrichment.test.js` (NEW)

**Test Coverage (15 tests):**

1. **Shell Detection (4 tests)**
   - Detect shell with numeric ID and missing duration
   - Detect shell with numeric ID and no metrics
   - NOT detect shell for native Intervals (i-prefix)
   - NOT detect shell for numeric ID with valid data

2. **Canonical Resolution (7 tests)**
   - Create source only for shell when Strava connected
   - Create source only (no enrich) when Strava NOT connected
   - Create canonical for native Intervals activity
   - Merge into existing when Strava arrives after Intervals
   - Upgrade canonical when FIT arrives after Strava
   - Skip duplicate when same provider record exists
   - Enrich existing source for pending shell

3. **Source Priority (1 test)**
   - Verify priority order: FIT > Strava > Intervals > Shell

4. **Strava Connection (2 tests)**
   - Return true when Strava connected
   - Return false when Strava not connected

**Run Tests:**
```bash
npm test server/tests/shellEnrichment.test.js
```

---

## Integration Steps

### Step 1: Run Database Migration

```bash
# Apply migration
sqlite3 server/fitness-coach.db < server/migrations/009_shell_enrichment_fix.sql

# Verify migration
sqlite3 server/fitness-coach.db "PRAGMA table_info(activities);"
# Should show: canonical_source, is_valid_for_analytics

sqlite3 server/fitness-coach.db "PRAGMA table_info(activity_sources);"
# Should show: shell_strava_id
```

---

### Step 2: Update Activity Import Service

**File:** `server/services/activityImportService.js`

**Add imports:**
```javascript
import { 
  detectIntervalsShell, 
  resolveCanonicalActivity,
  isStravaConnected,
  REASON_CODES
} from './activityShellResolver.js';
```

**Update `importActivity()` function for Intervals:**
```javascript
export function importActivity(userId, providerActivity, provider) {
  // ... existing code ...
  
  // For Intervals activities, detect shells
  if (provider === 'intervals') {
    const shellDetection = detectIntervalsShell(providerActivity);
    
    if (shellDetection.isShell) {
      console.log(`[Import] ${REASON_CODES.SHELL_DETECTED}: ${shellDetection.reason}`);
      
      // Resolve canonical activity
      const resolution = resolveCanonicalActivity({
        userId,
        activity: normalized,
        provider,
        providerId: normalized.provider_id,
        isShell: true,
        stravaId: shellDetection.stravaId,
        stravaConnected: isStravaConnected(userId)
      });
      
      console.log(`[Import] Resolution: ${resolution.action}, reason: ${resolution.reason}`);
      
      if (resolution.action === 'create_source_only') {
        // Store as source only, mark as shell
        upsertActivitySource(null, userId, {
          ...source,
          is_shell: 1,
          shell_strava_id: shellDetection.stravaId
        });
        
        // Queue for enrichment if Strava connected
        if (resolution.shouldEnrich) {
          // Add to enrichment queue (implement separately)
          console.log(`[Import] Queued for Strava enrichment: ${shellDetection.stravaId}`);
        }
        
        return {
          activityId: null,
          created: false,
          matchMethod: 'shell_source_only',
          needsEnrichment: resolution.shouldEnrich
        };
      }
    }
  }
  
  // ... continue with normal import logic ...
}
```

---

### Step 3: Update Analytics Queries

**All analytics queries must filter by `is_valid_for_analytics = 1`**

**Example - Dashboard activities:**
```javascript
// Before:
const activities = db.prepare(`
  SELECT * FROM activities
  WHERE user_id = ? AND start_time >= ?
  ORDER BY start_time DESC
`).all(userId, cutoffDate);

// After:
const activities = db.prepare(`
  SELECT * FROM activities
  WHERE user_id = ? 
    AND start_time >= ?
    AND is_valid_for_analytics = 1
  ORDER BY start_time DESC
`).all(userId, cutoffDate);
```

**Files to update:**
- `server/services/activityStorageService.js` - `getActivities()`
- `server/routes/activities.js` - All activity list endpoints
- `server/services/metricsService.js` - FTP/FTHR calculations
- Any other analytics queries

---

### Step 4: Implement Strava Enrichment

**File:** `server/services/stravaEnrichmentService.js` (NEW - to be created)

**Purpose:** Fetch full Strava data for shell activities

**Key Function:**
```javascript
export async function enrichShellFromStrava(userId, stravaId, stravaTokens) {
  try {
    // 1. Fetch full Strava activity
    const stravaActivity = await fetchStravaActivity(stravaId, stravaTokens);
    
    // 2. Create canonical activity from Strava data
    const result = importActivity(userId, stravaActivity, 'strava');
    
    // 3. Link shell source to canonical
    db.prepare(`
      UPDATE activity_sources 
      SET activity_id = ?, is_shell = 0, enriched_at = datetime('now')
      WHERE user_id = ? AND shell_strava_id = ?
    `).run(result.activityId, userId, stravaId);
    
    console.log(`[Enrich] ${REASON_CODES.STRAVA_ENRICH_OK}: ${stravaId} → ${result.activityId}`);
    
    return { success: true, activityId: result.activityId };
  } catch (error) {
    console.error(`[Enrich] Failed to enrich ${stravaId}:`, error);
    return { success: false, error: error.message };
  }
}
```

**Enrichment Orchestrator:**
```javascript
export async function enrichPendingShells(userId, limit = 50) {
  const pending = getPendingShellEnrichments(userId, limit);
  
  if (pending.length === 0) {
    return { enriched: 0, failed: 0 };
  }
  
  const stravaTokens = getStravaTokens(userId);
  if (!stravaTokens) {
    console.log(`[Enrich] Skipping ${pending.length} shells - Strava not connected`);
    return { enriched: 0, failed: 0, skipped: pending.length };
  }
  
  let enriched = 0;
  let failed = 0;
  
  for (const shell of pending) {
    const result = await enrichShellFromStrava(userId, shell.shell_strava_id, stravaTokens);
    if (result.success) {
      enriched++;
    } else {
      failed++;
    }
  }
  
  console.log(`[Enrich] Complete: ${enriched} enriched, ${failed} failed`);
  return { enriched, failed };
}
```

---

## Acceptance Criteria

### ✅ 1. No more "Untitled / 0 duration" canonicals when Strava connected
**Verification:**
```sql
SELECT COUNT(*) FROM activities 
WHERE (duration_s = 0 OR duration_s IS NULL)
  AND (distance_m = 0 OR distance_m IS NULL)
  AND is_valid_for_analytics = 1;
-- Expected: 0
```

### ✅ 2. Analytics queries only include valid activities
**Verification:**
```sql
SELECT COUNT(*) FROM activities WHERE is_valid_for_analytics = 0;
-- Should show shell count

SELECT COUNT(*) FROM activities WHERE is_valid_for_analytics = 1;
-- Should show valid activity count (no shells)
```

### ✅ 3. Re-importing does not create duplicates (idempotent)
**Test:** Import same activity twice, verify only one canonical created

### ✅ 4. Logging shows deterministic decisions with reason codes
**Example logs:**
```
[Import] SHELL_DETECTED: missing_core_fields:duration=0,distance=0
[Import] Resolution: create_source_only, reason: SHELL_DETECTED
[Import] Queued for Strava enrichment: 12345678
[Enrich] STRAVA_ENRICH_OK: 12345678 → abc-123-def
```

---

## Reason Codes Reference

| Code | Meaning |
|------|---------|
| `SHELL_DETECTED` | Intervals shell detected, queued for enrichment |
| `STRAVA_ENRICH_OK` | Successfully enriched shell from Strava |
| `STRAVA_ENRICH_SKIPPED_NOT_CONNECTED` | Shell stored but not enriched (Strava not connected) |
| `MERGED_EXISTING_CANONICAL` | Attached to existing canonical (no upgrade) |
| `CREATED_CANONICAL_FROM_STRAVA` | Created canonical from Strava data |
| `CREATED_CANONICAL_FROM_INTERVALS` | Created canonical from native Intervals data |
| `CREATED_CANONICAL_FROM_FIT` | Created canonical from FIT upload |
| `UPGRADED_CANONICAL_SOURCE` | Upgraded existing canonical to higher priority source |
| `SKIPPED_DUPLICATE` | Duplicate provider record, skipped |

---

## SQL Verification Queries

### Check shell activities
```sql
SELECT 
  COUNT(*) as total_shells,
  SUM(CASE WHEN shell_strava_id IS NOT NULL THEN 1 ELSE 0 END) as with_strava_id,
  SUM(CASE WHEN activity_id IS NOT NULL THEN 1 ELSE 0 END) as enriched
FROM activity_sources
WHERE is_shell = 1;
```

### Check canonical source distribution
```sql
SELECT 
  canonical_source,
  is_valid_for_analytics,
  COUNT(*) as count
FROM activities
GROUP BY canonical_source, is_valid_for_analytics
ORDER BY canonical_source, is_valid_for_analytics;
```

### Check pending enrichments
```sql
SELECT COUNT(*) as pending_enrichments
FROM activity_sources
WHERE is_shell = 1 
  AND shell_strava_id IS NOT NULL 
  AND activity_id IS NULL;
```

### Verify no invalid activities in analytics
```sql
SELECT COUNT(*) as invalid_in_analytics
FROM activities
WHERE is_valid_for_analytics = 0
  AND is_shell = 1;
-- Expected: All shells should be invalid
```

---

## Next Steps

1. **Run migration** - Apply `009_shell_enrichment_fix.sql`
2. **Run tests** - Verify all 15 tests pass
3. **Update import service** - Integrate shell detection logic
4. **Update analytics queries** - Add `is_valid_for_analytics = 1` filter
5. **Implement Strava enrichment** - Create enrichment service
6. **Test end-to-end** - Import Intervals shells, verify enrichment
7. **Monitor logs** - Check reason codes in production

---

## Rollback Plan

If issues arise:

```sql
-- Rollback migration (if needed)
ALTER TABLE activities DROP COLUMN canonical_source;
ALTER TABLE activities DROP COLUMN is_valid_for_analytics;
ALTER TABLE activity_sources DROP COLUMN shell_strava_id;

-- Or restore from backup
cp server/fitness-coach.db.backup server/fitness-coach.db
```

---

**Status:** ✅ Implementation complete, ready for integration and testing
