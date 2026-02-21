# Intervals.icu Enrichment Fix Plan - REVISED

**Date:** January 30, 2026, 7:10pm  
**Status:** Ready for Implementation  
**Alignment:** Fully aligned with ACTIVITY_ARCHITECTURE.md

---

## Architecture Alignment Check

### ✅ Matches Architecture Guide

1. **Two-table model** - Fix preserves source/canonical separation
2. **Upsert strategy** - Enrichment updates existing lite sources (not duplicates)
3. **Field-level priority** - Speed/calories from Intervals.icu (correct priority)
4. **Validation split** - Need to implement `isStorableSource()` + `isCanonicalWorthy()`
5. **Sport inclusion** - Not yet implemented (future enhancement, doesn't block enrichment)
6. **External ID** - Not yet implemented (doesn't affect current enrichment bug)
7. **Invariants** - Fix maintains all 6 invariants

### ❌ Gaps Identified

1. **Missing field mapping** - `avg_speed`, `max_speed`, `calories` not in `normalizeProviderActivity()`
2. **Validation too strict** - Single `isValidActivity()` conflates storage vs canonical checks
3. **Enrichment UPDATE incomplete** - Doesn't store speed/calories in `activity_sources`
4. **No sport filtering** - All activities treated equally (future: implement sport inclusion)

---

## Root Cause Analysis (Updated)

### Primary Issue: Missing Field Mapping

**Evidence from code review:**

1. `intervalsService.normalizeActivity()` (lines 199-286) ✅ CORRECT
   - Maps `average_speed` → `avgSpeed`, `average_speed`
   - Maps `max_speed` → `maxSpeed`, `max_speed`
   - Maps `calories` → `calories`

2. `normalizeProviderActivity()` for Intervals (lines 895-926) ❌ MISSING
   - Does NOT map `avg_speed`, `max_speed`, `calories`
   - These fields are stripped during import normalization

3. Enrichment UPDATE (lines 744-775) ❌ INCOMPLETE
   - Updates `raw_duration_s`, `raw_distance_m`, etc.
   - Does NOT update `raw_avg_speed`, `raw_max_speed`, `raw_calories`

### Secondary Issue: Validation Logic

**Current:** Single `isValidActivity()` function
- Checks: duration > 0 OR distance > 0 OR tss > 0 OR power > 0 OR hr > 0
- Problem: Zero values (e.g., `duration: 0`) fail ALL checks
- Conflates "storable source" vs "canonical worthy"

**Per Architecture Guide:**
- Should be split into `isStorableSource()` + `isCanonicalWorthy()`
- Storable: Has `provider_id` + `start_time` (minimal)
- Canonical: Has meaningful metrics (duration > 60s, distance > 50m, etc.)

### Tertiary Issue: Potential Strava Duplicates

**Not blocking enrichment, but worth noting:**
- 135 lite activities might include Strava activities synced to Intervals.icu
- Without `external_id` checking, we can't detect these duplicates
- May explain why some activities have minimal data (they're manual Strava entries)

---

## Revised Fix Plan

### Phase 0: Minimal Diagnostic Logging (PROOF - 5 min)

**Purpose:** Confirm root cause hypothesis BEFORE making any logic changes

**File:** `server/routes/intervals.js` (lines 439-454)

**What to log per enrichment attempt:**

```javascript
for (const activityId of idsToEnrich) {
  try {
    console.log(`📥 [Intervals] Enriching activity ${activityId}...`);
    
    const fullActivity = await intervalsService.getActivity(
      token.access_token,
      token.athlete_id,
      activityId
    );
    
    // PHASE 0: PROOF LOG - Single compact diagnostic object
    const diagnostic = {
      runId: Date.now(), // or pass from frontend
      providerId: activityId,
      apiOk: true,
      apiHas: {
        dur: fullActivity.duration || fullActivity.moving_time || null,
        dist: fullActivity.distance || null,
        tss: fullActivity.tss || fullActivity.icu_training_load || null,
        pwr: fullActivity.avgPower || fullActivity.average_watts || null,
        hr: fullActivity.avgHeartRate || fullActivity.average_heartrate || null,
        speed: fullActivity.avgSpeed || fullActivity.average_speed || null,
        cal: fullActivity.calories || null
      }
    };
    
    console.log(`🔍 [Enrichment Diagnostic]`, JSON.stringify(diagnostic));
    
    enriched.push(fullActivity);
    console.log(`✅ [Intervals] Enriched ${activityId}`);
  } catch (error) {
    // PHASE 0: PROOF LOG - Failure case
    const diagnostic = {
      runId: Date.now(),
      providerId: activityId,
      apiOk: false,
      reason: error.message
    };
    console.log(`🔍 [Enrichment Diagnostic]`, JSON.stringify(diagnostic));
    
    console.error(`❌ [Intervals] Failed to enrich ${activityId}:`, error.message);
    failed.push({ id: activityId, error: error.message });
  }
}
```

**Then add logging AFTER normalization in `importActivity()`:**

**File:** `server/services/activityImportService.js` (around line 610)

```javascript
export function importActivity(userId, providerActivity, provider) {
  const normalized = normalizeProviderActivity(providerActivity, provider);
  const now = new Date().toISOString();

  // PHASE 0: PROOF LOG - After normalization
  if (provider === 'intervals') {
    const normDiag = {
      providerId: normalized.provider_id,
      norm: {
        dur: normalized.duration_s,
        dist: normalized.distance_m,
        tss: normalized.tss,
        pwr: normalized.avg_power,
        hr: normalized.avg_hr,
        speed: normalized.avg_speed,
        cal: normalized.calories
      }
    };
    console.log(`🔍 [After Normalization]`, JSON.stringify(normDiag));
  }

  const isLite = !isValidActivity(normalized);
  
  // PHASE 0: PROOF LOG - Validation result
  if (provider === 'intervals') {
    const worthyDiag = {
      providerId: normalized.provider_id,
      worthy: !isLite,
      reason: isLite ? 'no_threshold_met' : 'has_meaningful_metrics'
    };
    console.log(`🔍 [Canonical Worthy Check]`, JSON.stringify(worthyDiag));
  }
  
  // ... rest of function
}
```

**What this tells us:**

1. **API returns real values but normalization strips them** → `apiHas` shows values, `norm` shows nulls
2. **Normalization is fine but validation rejects it** → `norm` shows values, `worthy: false`
3. **API doesn't return usable data** → `apiHas` shows nulls
4. **Enrichment isn't even reaching import** → No `norm` or `worthy` logs

**Success Criteria for Phase 0:**
- Run one enrichment sync
- Grep logs: `grep "Enrichment Diagnostic" server.log`
- Identify which of the 3 failure modes is dominant
- Confirm or falsify "data loss during normalization" hypothesis

**Time:** 5 minutes to add, 2 minutes to test, 3 minutes to analyze logs

---

### Phase 1: Add Missing Field Mapping (TARGETED)

**File:** `server/services/activityImportService.js`

**Fix 1.1:** Add speed/calories to Intervals normalization (lines 895-926)

```javascript
if (provider === 'intervals') {
  return {
    // ... existing fields ...
    avg_cadence: raw.average_cadence || raw.avg_cadence || null,
    has_power: (raw.avgPower || raw.average_watts || raw.icu_average_watts) ? 1 : 0,
    // ADD THESE THREE LINES:
    avg_speed: raw.avgSpeed || raw.average_speed || null,
    max_speed: raw.maxSpeed || raw.max_speed || null,
    calories: raw.calories || null
  };
}
```

**Fix 1.2:** Update enrichment UPDATE statement (lines 744-775)

Add to UPDATE:
```sql
raw_avg_speed = ?,
raw_max_speed = ?,
raw_calories = ?,
```

Add to `.run()` parameters:
```javascript
normalized.avg_speed,
normalized.max_speed,
normalized.calories,
```

**Note from Phase 0 analysis:**
- Speed/calories won't fix "100% enrichment failure" unless validation hinges on these fields
- This closes a data gap and removes confusion, but may not be the unlock
- Real unlock is likely in Phase 2 (validation split)

**Expected Impact:** Enriched activities will have speed/calories data preserved

---

### Phase 2: Split Validation Functions (LIKELY UNLOCK - 20 min)

**File:** `server/services/activityImportService.js`

**Fix 2.1:** Create `isStorableSource()` function

```javascript
/**
 * Check if activity has minimum data to be stored as a source
 * Minimal check: has provider_id and start_time
 */
function isStorableSource(normalized) {
  const hasProviderId = normalized.provider_id && normalized.provider_id.length > 0;
  const hasStartTime = normalized.start_time && normalized.start_time.length > 0;
  return hasProviderId && hasStartTime;
}
```

**Fix 2.2:** Rename `isValidActivity()` to `isCanonicalWorthy()` with reason codes

```javascript
/**
 * Check if activity has meaningful data worth creating a canonical row
 * Requires at least one meaningful metric
 * Returns: { worthy: boolean, reason: string }
 */
function isCanonicalWorthy(normalized) {
  // Check each threshold
  if (normalized.duration_s > 60) {
    return { worthy: true, reason: 'worthy_by_duration' };
  }
  if (normalized.distance_m > 50) {
    return { worthy: true, reason: 'worthy_by_distance' };
  }
  if (normalized.avg_power > 10) {
    return { worthy: true, reason: 'worthy_by_power' };
  }
  if (normalized.avg_hr > 40) {
    return { worthy: true, reason: 'worthy_by_hr' };
  }
  // TSS is OPTIONAL - recovery rides can be 0 TSS
  // Only use TSS if nothing else qualifies
  if (normalized.tss > 0) {
    return { worthy: true, reason: 'worthy_by_tss' };
  }
  
  return { worthy: false, reason: 'no_threshold_met' };
}
```

**Note:** TSS is treated as optional (last resort) because recovery rides can legitimately have 0 TSS depending on source.

**Fix 2.3:** Update `importActivity()` to use both functions and handle reason codes

```javascript
// Line ~610: Check storability first
if (!isStorableSource(normalized)) {
  console.log(`[Import] Skipping unstable source: no provider_id or start_time`);
  return { activityId: null, created: false, matchMethod: 'skipped' };
}

// Check if canonical-worthy (returns { worthy, reason })
const worthyCheck = isCanonicalWorthy(normalized);
const isLite = !worthyCheck.worthy;

// Update Phase 0 logging to use reason code
if (provider === 'intervals') {
  const worthyDiag = {
    providerId: normalized.provider_id,
    worthy: worthyCheck.worthy,
    reason: worthyCheck.reason  // Now shows specific threshold hit
  };
  console.log(`🔍 [Canonical Worthy Check]`, JSON.stringify(worthyDiag));
}
```

**Expected Impact:** 
- Activities with minimal data can be stored as sources
- Only activities with meaningful metrics create canonical rows
- Matches staged import flow in architecture guide

---

### Phase 3: Structured Diagnostic Logging (BOUNDED - 5 min)

**Purpose:** Production-grade logging with run_id and bounded output

**File:** `server/routes/intervals.js` (lines 408-475)

**Fix 3.1:** Add run_id and structured logging (limit to first 10-20 items)

```javascript
router.post('/enrich', async (req, res) => {
  try {
    // ... auth checks ...
    
    const { activityIds = [], limit = 50 } = req.body;
    const idsToEnrich = activityIds.slice(0, limit);
    
    // Generate run_id for this enrichment batch
    const runId = `enrich_${Date.now()}`;
    console.log(`� [${runId}] Starting enrichment for ${idsToEnrich.length} activities`);
    
    const enriched = [];
    const failed = [];
    const LOG_LIMIT = 10; // Only log first 10 to avoid spam
    
    for (let i = 0; i < idsToEnrich.length; i++) {
      const activityId = idsToEnrich[i];
      const shouldLog = i < LOG_LIMIT;
      
      try {
        if (shouldLog) console.log(`📥 [${runId}] Enriching ${i+1}/${idsToEnrich.length}: ${activityId}`);
        
        const startTime = Date.now();
        const fullActivity = await intervalsService.getActivity(
          token.access_token,
          token.athlete_id,
          activityId
        );
        const apiTime = Date.now() - startTime;
        
        // Structured diagnostic for first N items
        if (shouldLog) {
          const diagnostic = {
            runId,
            idx: i,
            providerId: activityId,
            apiOk: true,
            apiTime: `${apiTime}ms`,
            apiHas: {
              dur: fullActivity.duration || fullActivity.moving_time || null,
              dist: fullActivity.distance || null,
              tss: fullActivity.tss || fullActivity.icu_training_load || null,
              pwr: fullActivity.avgPower || fullActivity.average_watts || null,
              hr: fullActivity.avgHeartRate || fullActivity.average_heartrate || null
            }
          };
          console.log(`🔍 [${runId}]`, JSON.stringify(diagnostic));
        }
        
        enriched.push(fullActivity);
      } catch (error) {
        // Compact failure object (always log failures)
        const failureDiag = {
          runId,
          idx: i,
          providerId: activityId,
          apiOk: false,
          reason: error.message,
          code: error.code || 'unknown'
        };
        console.error(`❌ [${runId}]`, JSON.stringify(failureDiag));
        failed.push({ id: activityId, error: error.message });
      }
    }
    
    console.log(`✅ [${runId}] Complete: ${enriched.length} enriched, ${failed.length} failed`);
    
    // ... response ...
  }
});
```

**Fix 3.2:** Add structured logging in `importActivity()` for enriched activities

```javascript
// In importActivity(), after enrichment UPDATE succeeds
if (isPendingEnrichment) {
  // ... enrichment logic ...
  
  // Log successful enrichment with DB write confirmation
  const enrichDiag = {
    providerId: normalized.provider_id,
    enriched: true,
    canonicalId: activity.id,
    dbWriteOk: true
  };
  console.log(`✅ [Enrichment Success]`, JSON.stringify(enrichDiag));
}
```

**What "good enough" looks like:**

For each enrichment attempt, logs answer:
1. Did `/activity/{id}` return successfully? → `apiOk: true/false`, `apiTime`
2. Did payload contain usable metrics? → `apiHas: {dur, dist, tss, pwr, hr}`
3. Did normalization keep those metrics? → Phase 0 logs show `norm` values
4. Did `isCanonicalWorthy()` accept/reject? → Phase 0 logs show `worthy` + `reason`
5. If accepted, did DB write succeed? → `dbWriteOk: true`

**Expected Impact:** 
- Grep one enrichment run: `grep "enrich_[0-9]*" server.log`
- See first 10 items in detail, summary for all
- Compact failure objects for all failures
- No log spam (bounded output)

---

### Phase 4: Test & Verify

**Test 4.1:** Single activity enrichment
```bash
# Get a lite activity ID
sqlite3 server/fitness-coach.db "SELECT provider_id FROM activity_sources WHERE provider = 'intervals' AND activity_id IS NULL LIMIT 1;"

# Check server logs during enrichment
# Should see diagnostic output with actual field values
```

**Test 4.2:** Verify database after enrichment
```sql
-- Check if speed/calories are stored
SELECT 
  provider_id,
  raw_avg_speed,
  raw_max_speed,
  raw_calories,
  is_enriched
FROM activity_sources 
WHERE provider = 'intervals' 
  AND is_enriched = 1
LIMIT 5;
```

**Test 4.3:** Verify canonical activities created
```sql
-- Check if canonical rows were created
SELECT 
  COUNT(*) as enriched_count
FROM activity_sources 
WHERE provider = 'intervals' 
  AND is_enriched = 1 
  AND activity_id IS NOT NULL;
```

**Test 4.4:** Verify pending count drops and enriched count rises
```sql
-- Before enrichment: Record baseline
SELECT 
  COUNT(*) as pending_before
FROM activity_sources 
WHERE provider = 'intervals' 
  AND activity_id IS NULL;

-- After enrichment: Verify drop
SELECT 
  COUNT(*) as pending_after
FROM activity_sources 
WHERE provider = 'intervals' 
  AND activity_id IS NULL;

-- Verify enriched count rose by approximately N (where N = processed count)
SELECT 
  COUNT(*) as enriched_after
FROM activity_sources 
WHERE provider = 'intervals' 
  AND is_enriched = 1;

-- Expected: pending_before - pending_after ≈ enriched_after (within a few)
```

**Success Criteria:**
- At least 40/50 activities enriched (80% success rate)
- Pending count drops by ~N (where N = successfully enriched)
- Enriched count rises by ~N
- `raw_avg_speed`, `raw_max_speed`, `raw_calories` populated
- Canonical activities created with speed/calories fields
- No console errors during enrichment
- Logs show specific `reason` codes (worthy_by_duration, worthy_by_power, etc.)

---

## Implementation Order (REVISED)

**Critical change:** Phase 0 FIRST to prove hypothesis before fixing anything

1. **Phase 0** (5 min) - Minimal diagnostic logging (PROOF - sanity anchor)
   - Add compact diagnostic objects to enrichment loop
   - Add normalization + validation logging
   - Run one sync, analyze logs
   - **STOP and analyze** - confirm which failure mode is dominant

2. **Phase 1** (15 min) - Add field mapping (targeted fix based on Phase 0 findings)
   - Only if Phase 0 shows normalization strips fields
   - Closes data gap regardless

3. **Phase 2** (20 min) - Split validation (likely unlock based on Phase 0 findings)
   - Only if Phase 0 shows validation rejects valid data
   - Add reason codes for debugging gold

4. **Phase 3** (5 min) - Structured logging (production-grade)
   - Add run_id and bounded output
   - Replace Phase 0 proof logs with production logs

5. **Phase 4** (15 min) - Test and verify
   - Verify pending count drops
   - Verify enriched count rises
   - Check reason codes in logs

**Total Time:** ~60 minutes (5 min added for Phase 0 analysis)

**Key Principle:** Don't chase ghosts - prove the failure mode first, then fix it.

---

## Alignment with Architecture Guide

### Matches All Invariants ✅

1. **User isolation** - No changes to user_id handling
2. **Source-to-canonical** - Enrichment updates existing sources, creates canonical
3. **Manual protection** - No changes to manual activity logic
4. **Lite lifecycle** - Enrichment converts lite → full (sets `activity_id`, `is_enriched = 1`)
5. **Provider identity** - No changes to provider_id stability
6. **Data quality** - Field mapping ensures meaningful values preserved

### Matches Validation Strategy ✅

- Implements `isStorableSource()` + `isCanonicalWorthy()` split
- Aligns with staged import flow (Stage A: store all, Stage B: enrich worthy)
- Uses meaningful thresholds (duration > 60s, distance > 50m, power > 10W, HR > 40 bpm)

### Matches Field-Level Priority ✅

- Speed/calories from Intervals.icu (correct source)
- Power/TSS from Intervals.icu (already working)
- No changes to GPS/route handling (Strava priority, future enhancement)

### Does NOT Implement (Future Enhancements)

1. **External ID deduplication** - Requires schema changes, separate task
2. **Sport inclusion policy** - Requires user preferences, separate task
3. **Field-level preference map** - Current simple priority works for now
4. **Per-metric meaningful thresholds** - Partially implemented in `isCanonicalWorthy()`

---

## Risk Assessment

**Low Risk:**
- Adding field mapping (straightforward, no breaking changes)
- Adding logging (diagnostic only, no side effects)

**Medium Risk:**
- Splitting validation functions (changes import logic, needs testing)
- Updating enrichment UPDATE (must match field order exactly)

**Mitigation:**
- Test with single activity first
- Verify database state after each enrichment
- Keep diagnostic logging to catch issues early

---

## Post-Fix: Next Steps

After enrichment is working:

1. **Implement external_id deduplication** (prevents Strava duplicates)
   - Add `external_id`, `manual`, `file_type` columns
   - Update deduplication logic
   - Estimated: 2-3 hours

2. **Implement sport inclusion policy** (sane coaching outputs)
   - Add `sport_preferences` to user schema
   - Create Settings UI
   - Update analytics endpoints
   - Estimated: 3-4 hours

3. **Migrate to field-level priority** (better data quality)
   - Create `FIELD_PREFERENCE` map
   - Update `applyBestDataWins()` logic
   - Estimated: 2 hours

---

## Ready to Proceed

All fixes are aligned with architecture guide. No conflicts with invariants or design principles. Implementation can proceed immediately.
