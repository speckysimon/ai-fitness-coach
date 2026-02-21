# Activity Import/Enrichment Audit - Findings & Fixes

**Date:** February 18, 2026  
**User:** simon@i-duna.com  
**Status:** 🔴 CRITICAL BUG IDENTIFIED - Fix implemented, testing pending

---

## Executive Summary

**CRITICAL BUG FOUND:** 124 out of 185 canonical activities (67%) are Intervals shells with `duration=0` and `distance=0`. These should NEVER be canonical.

**Root Cause:** Intervals shells (Strava placeholder activities with numeric IDs) were being created as canonical activities instead of source-only records pending enrichment.

**Impact:** 
- Dashboard shows incomplete/broken activities
- Analytics layers fail on shell activities
- Weekly rollups include invalid data
- User experience severely degraded

**Fix Status:** ✅ Implemented, ⏳ Testing pending

---

## Audit Results

### Current Database State (Before Fix)

```
Total canonical activities: 185
Total activity sources:     185

Provider breakdown:
  - Strava sources:    0 (Strava not connected)
  - Intervals sources: 185
  - FIT sources:       0

Shell activities as canonical: 124 (67%) ❌ CRITICAL
Valid activities:              61 (33%)

Average completeness: 87% (inflated by valid activities)
```

### Shell Activity Pattern

All 124 shell activities share these characteristics:

1. **Name:** "Untitled Activity"
2. **Duration:** 0 seconds
3. **Distance:** 0 meters
4. **Source:** Intervals.icu with numeric ID (Strava ID format)
5. **Strava presence:** None (Strava not connected)
6. **Why they exist:** Intervals.icu syncs from Strava and creates placeholder activities

**Example shell IDs:**
- `17235492556` (Jan 31, 2026)
- `16997048821` (Jan 9, 2026)
- `16863206892` (Dec 28, 2025)

These are Strava activity IDs. Intervals creates shells for them but doesn't populate the data because:
- User doesn't have Strava connected to RiderLabs
- OR Intervals API returns minimal data for these activities

---

## Root Cause Analysis

### The Bug

**File:** `server/services/canonicalActivitySelector.js` (before fix)

**Problem:** The canonical selector was NOT validating activities before creating canonical records. It would:

1. Receive Intervals shell activity with `duration=0`, `distance=0`
2. Check if it matches existing activity (no match)
3. **Create canonical activity** ❌ WRONG
4. Should have created **source-only** record

**Why it happened:**
- No validation layer before canonical creation
- `incomingType` was not being set to `'intervals_shell'` by import pipeline
- Shell detection logic existed but wasn't integrated into canonical selector

### The Fix

**Created 3 new components:**

#### 1. Activity Validation Service (`activityValidation.js`)

Deterministic validation with confidence scores:

```javascript
isShellActivity(activity, options) {
  // Returns: { isShell: boolean, reason: string, confidence: number }
  
  // High confidence shell detection:
  // - duration = 0 → confidence: 1.0
  // - distance = 0 AND no metrics → confidence: 0.95
  // - Intervals numeric ID + missing data → confidence: 0.98
}

isValidActivity(activity) {
  // Must have: duration > 0, start_time, distance OR power/HR
}

validateForCanonical(activity, options) {
  // Comprehensive validation with reasons
}
```

#### 2. Updated Canonical Selector

**Added validation before canonical creation:**

```javascript
// BEFORE (bug):
if (!existingActivity) {
  return { action: 'create_canonical', ... };
}

// AFTER (fixed):
const validation = validateForCanonical(providerActivity, { provider, providerId });
const isDefiniteShell = validation.shellCheck?.isShell && validation.shellCheck?.confidence >= 0.9;

if (isDefiniteShell || incomingType === 'intervals_shell') {
  return { action: 'create_source_only', shouldEnrich: true, ... };
}

if (!validation.valid) {
  return { action: 'error', reason: 'INVALID_FOR_CANONICAL', ... };
}

// Only create canonical if valid and not shell
return { action: 'create_canonical', ... };
```

#### 3. Audit Generator (`activityAuditGenerator.js`)

Comprehensive audit tool that outputs:
- Console summary with counts and warnings
- JSON file with per-activity details
- CSV file for analysis
- Shell activities section with reasons

**Usage:**
```bash
node scripts/run-activity-audit.js --user=simon@i-duna.com
```

---

## Remaining Work

### Immediate (Before Re-import)

- [ ] **C3:** Implement safe Strava backfill logic
  - Allow Strava to fill missing `distance_m`, `elevation_gain`, `avg_speed`
  - NEVER overwrite physiology (power, HR, TSS)
  - Only when canonical lacks these fields

- [ ] **C4:** Add canonical decision audit trail
  - Store `selection_reasons` JSON in activities table
  - Or create `activity_selection_audit` table
  - Makes debugging easier

### E2E Regression Runner

- [ ] **A1:** Create full regression script
  - Wipe user data (activities, sources, analytics, weekly)
  - Run provider sync (Intervals)
  - Verify 0 shell canonicals
  - Check streams, analytics layers, weekly rollups

- [ ] **A2:** Add comprehensive checks
  - Streams: decode, monotonic time_s, coverage %
  - Analytics: normalised, durability, stress counts
  - Weekly: athlete_weekly rows, no NULL drift
  - Trends: non-null when eligible
  - Insights: ≤7 insights, confidence rules

### Dashboard Investigation

- [ ] **D:** Why did dashboard only pull 4 activities?
  - Check endpoint called
  - Check date window (default 7 days?)
  - Check query limits
  - Document intended behavior

---

## Testing Plan

### Phase 1: Verify Fix (Current Session)

1. ✅ Run audit on current DB → Confirms 124 shells
2. ⏳ Wipe simon@i-duna.com data
3. ⏳ Re-import from Intervals with fix active
4. ⏳ Run audit again → Should show 0 shells
5. ⏳ Verify valid activities imported correctly

### Phase 2: Full E2E Regression

1. Create comprehensive E2E runner script
2. Run on clean slate
3. Verify all checks pass
4. Document results

### Phase 3: Production Readiness

1. Run secondary checks (grep canonical_source, UTC-only, etc.)
2. Update documentation
3. Create migration plan for existing users with shells
4. Deploy fix

---

## Files Created/Modified

### Created
- `server/services/activityValidation.js` - Shell detection & validation
- `server/services/activityAuditGenerator.js` - Audit report generator
- `scripts/run-activity-audit.js` - Audit runner CLI
- `IMPORT_AUDIT_FINDINGS.md` - This document

### Modified
- `server/services/canonicalActivitySelector.js` - Added validation, rejects shells

### Audit Artifacts
- `/tmp/activity-audit-1-2026-02-18T06-34-34-722Z.json` - Full audit JSON
- `/tmp/activity-audit-1-2026-02-18T06-34-34-722Z.csv` - Audit CSV

---

## Next Steps (Your Decision)

**Option 1: Continue Implementation (Recommended)**
- Implement safe Strava backfill (C3)
- Create E2E regression runner (A1, A2)
- Test the full fix end-to-end
- Time: ~2-3 hours

**Option 2: Test Current Fix Now**
- Wipe simon@i-duna.com
- Re-import from Intervals
- Run audit to verify 0 shells
- Time: ~30 minutes

**Option 3: Pause for Review**
- Review audit findings
- Review fix implementation
- Decide on next steps tomorrow

---

## Verification Commands

### Run audit on current DB
```bash
node scripts/run-activity-audit.js --user=simon@i-duna.com --output=/tmp
```

### Wipe user data (after backup)
```bash
sqlite3 server/fitness-coach.db < scripts/wipe-user-activities.sql
```

### Check for shell canonicals
```bash
sqlite3 server/fitness-coach.db "
  SELECT COUNT(*) as shell_count 
  FROM activities 
  WHERE user_id = 1 AND (duration_s = 0 OR distance_m = 0);
"
```

---

**Status:** Ready for your decision on next steps.
