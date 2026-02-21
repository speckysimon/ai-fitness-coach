# Intervals.icu API Field Mapping

**Last Updated:** January 27, 2026

This document describes how Intervals.icu API fields are mapped to our unified activity schema.

## Overview

Intervals.icu uses different field names than Strava. Our system normalizes both to a common schema in two places:

1. **`server/services/intervalsService.js`** - Normalizes raw API response for frontend
2. **`server/services/activityImportService.js`** - Normalizes for database import

## Intervals.icu API Response Fields

Based on the [Intervals.icu API Cookbook](https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090):

### Activity List Endpoint
`GET /api/v1/athlete/{id}/activities?oldest=YYYY-MM-DD&newest=YYYY-MM-DD`

### Key Field Mappings

| Our Field | Intervals.icu Field(s) | Notes |
|-----------|------------------------|-------|
| `id` | `id` | Activity ID (e.g., "i120447626") |
| `name` | `name` | Activity name |
| `type` | `type` | "Ride", "VirtualRide", "Run", etc. |
| `start_time` | `start_date_local`, `start_date` | ISO 8601 format |
| `duration` | `moving_time`, `elapsed_time` | Seconds |
| `distance` | `distance` | Meters |
| `elevation` | `total_elevation_gain`, `elevation_gain` | Meters |
| `avg_power` | `icu_average_watts`, `average_watts` | Watts |
| `max_power` | `icu_max_watts`, `max_watts` | Watts |
| `normalized_power` | `icu_weighted_avg_watts`, `np` | Watts (NP) |
| `tss` | `icu_training_load`, `tss` | Training Stress Score |
| `avg_hr` | `avg_hr`, `average_hr`, `average_heartrate` | BPM |
| `max_hr` | `max_hr`, `max_heartrate` | BPM |
| `avg_cadence` | `avg_cadence`, `average_cadence` | RPM |

### Important Notes

1. **Activity ID Format**: Intervals.icu activity IDs start with `i` prefix (e.g., `i120447626`). Activities without this prefix are typically Strava-synced references.

2. **Strava-Synced Activities**: When Intervals.icu syncs from Strava, it may create "shell" activities with:
   - Numeric-only IDs (no `i` prefix)
   - No duration/distance/power data
   - Name = "Untitled Activity"
   
   These should be **skipped during import** as the actual data comes from Strava.

3. **Power Fields**: Intervals.icu prefixes many fields with `icu_`:
   - `icu_average_watts` (preferred over `average_watts`)
   - `icu_weighted_avg_watts` (normalized power)
   - `icu_training_load` (TSS)

4. **Heart Rate Fields**: Multiple possible field names:
   - `avg_hr` (most common)
   - `average_hr`
   - `average_heartrate` (Strava-style)

## Data Flow

```
Intervals.icu API
       ↓
intervalsService.normalizeActivity()  [server/services/intervalsService.js]
       ↓
Frontend receives normalized data
       ↓
POST /api/activities/import
       ↓
activityImportService.normalizeProviderActivity()  [server/services/activityImportService.js]
       ↓
Database (activities + activity_sources tables)
```

## Validation Rules

Activities are **skipped** during import if they have:
- `duration_s` = 0 or null
- AND `distance_m` = 0 or null
- AND `tss` = 0 or null
- AND `avg_power` = 0 or null

This filters out empty "shell" activities.

## Merge Priority

When the same activity exists in both Strava and Intervals.icu:

1. **Intervals.icu preferred for**:
   - Power metrics (`avg_power`, `normalized_power`, `max_power`)
   - TSS
   - HR metrics

2. **Strava preferred for**:
   - Activity name (more descriptive)
   - Activity type labels

3. **Safety rule**: Never overwrite a meaningful value with an empty/zero value.

## Troubleshooting

### "Untitled Activity" with 0 duration
- **Cause**: Intervals.icu shell activity (Strava reference)
- **Solution**: These are now automatically skipped during import

### Missing power/HR data
- **Check**: Is the activity ID prefixed with `i`?
- **Check**: Does the raw API response contain `icu_average_watts`?
- **Check**: Is `intervalsService.normalizeActivity()` mapping correctly?

### Duplicate activities
- **Cause**: Fuzzy matching failed (time/duration mismatch)
- **Check**: Are start times within ±5 minutes?
- **Check**: Are durations within ±20%?

## Related Files

- `server/services/intervalsService.js` - API client and normalization
- `server/services/activityImportService.js` - Import and merge logic
- `server/routes/intervals.js` - API endpoints
- `src/lib/activityMerger.js` - Frontend merge utilities
