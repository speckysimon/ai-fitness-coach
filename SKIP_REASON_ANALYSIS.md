# Skip Reason Analysis - January 27, 2026

## Console Output Summary

**Import Results:**
- Fetched: 186 activities from Intervals.icu
- Imported: 51 activities (0 new, 51 updated)
- Skipped: 135 activities
- Errors: 0

## Skip Reasons Breakdown

```javascript
skipReasons: {
  shell: { count: 135, samples: Array(5) }  // ALL skips are "shell" activities
  duplicate_fuzzy: { count: 0 }
  duplicate_source: { count: 0 }
  invalid_units: { count: 0 }
  missing_required_field: { count: 0 }
  outside_date_window: { count: 0 }
  parse_error: { count: 0 }
}
```

## Diagnosis

**Problem:** All 135 skipped activities are classified as "shell" activities.

**What "shell" means:** Activities that fail the `isValidActivity()` check because they have:
- `duration_s`: null or 0
- `distance_m`: null or 0
- `tss`: null or 0
- `avg_power`: null or 0
- `avg_hr`: null or 0

**Root Cause:** The normalization logic in `activityImportService.js` converts `null` values to `0`:

```javascript
// Lines 645-649 (Intervals normalization)
duration_s: raw.duration || raw.moving_time || raw.elapsed_time || 0,  // ← null becomes 0
distance_m: raw.distance || 0,  // ← null becomes 0
elevation_m: raw.elevation || raw.total_elevation_gain || 0,  // ← null becomes 0
```

**Why this happens:**
1. Intervals.icu API returns activities with `moving_time: null`, `distance: null`
2. Normalization converts these to `duration_s: 0`, `distance_m: 0`
3. Validation checks `value > 0`, which fails for `0`
4. Activity is skipped as "shell"

**The 135 activities are likely:**
- Strava-synced reference activities in Intervals.icu
- Have basic metadata (name, date, type) but no detailed metrics
- Intervals.icu doesn't have the underlying data files for these activities

## Solution

**Option 1: Preserve NULL values (Recommended)**

Change normalization to preserve `null` instead of defaulting to `0`:

```javascript
// server/services/activityImportService.js:645-649
duration_s: raw.duration || raw.moving_time || raw.elapsed_time || null,  // Changed
distance_m: raw.distance || null,  // Changed
elevation_m: raw.elevation || raw.total_elevation_gain || null,  // Changed
```

**Why this works:**
- `null` means "no data available"
- `0` means "zero value" (e.g., 0 seconds duration)
- Validation already handles `null` correctly
- Activities with ANY meaningful data (TSS, power, HR) will be imported
- Activities with ALL null values will still be skipped (correct behavior)

**Expected Result:**
- If the 135 activities truly have ALL null values → Still skipped (correct)
- If some have TSS/power/HR but null duration/distance → Now imported (fixed)

## Next Steps

1. **Check sample data** - Expand `shell.samples` in console to see actual values
2. **Verify hypothesis** - Do the skipped activities have ANY meaningful data?
3. **Apply fix** - If confirmed, change 3 lines in normalization
4. **Test** - Re-import and verify ~180-186 activities imported

## Sample Data Needed

To confirm the fix, we need to see the actual values in `shell.samples[0]`:
- `id`
- `start_date`
- `type`
- `moving_time` (from raw API)
- `distance` (from raw API)
- `tss` / `icu_training_load` (from raw API)
- `details` (which fields are missing)

This will tell us if these activities have ANY data worth preserving.
