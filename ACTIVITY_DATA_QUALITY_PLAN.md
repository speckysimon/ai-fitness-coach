# Activity Data Quality Plan

## Problem Statement

Intervals.icu returns activities with varying data completeness:
- **Full data activities**: Have duration, distance, HR, power, TSS (native Intervals activities)
- **Partial data activities**: Have duration/distance but missing HR/power (Strava-synced without files)
- **Empty shell activities**: Have only metadata, no metrics (already filtered out)

Currently showing 49 activities instead of expected ~200 because:
1. Database was only populated once with limited date range
2. Some activities lack HR/power data but are still valid workouts
3. Need better handling of partial data

## Solution Strategy

### Phase 1: Data Import (Immediate - 5 min)

**Goal**: Get all 200 activities into the database

**Actions**:
1. Force refresh Dashboard to re-sync from providers
2. Verify activity count matches Intervals.icu
3. Check that activities with partial data are imported

**Validation**:
```sql
-- Should show ~200 activities
SELECT COUNT(*) FROM activities;

-- Check data quality distribution
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN avg_power > 0 THEN 1 ELSE 0 END) as with_power,
  SUM(CASE WHEN avg_hr > 0 THEN 1 ELSE 0 END) as with_hr,
  SUM(CASE WHEN tss > 0 THEN 1 ELSE 0 END) as with_tss
FROM activities;
```

### Phase 2: Data Quality Indicators (Short-term - 2 hours)

**Goal**: Show users which activities have complete vs. estimated data

**Database Changes**:
```sql
-- Add data quality flags
ALTER TABLE activities ADD COLUMN has_hr INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN data_quality TEXT; -- 'complete', 'partial', 'estimated'
```

**UI Changes**:
1. Add badges to ActivityCard:
   - 🔋 "Power data" (green) - has power metrics
   - 💓 "HR data" (red) - has HR data
   - 📊 "Estimated TSS" (yellow) - TSS calculated from duration/type
   - ⚠️ "Limited data" (gray) - only duration/distance

2. Add filter in AllActivities:
   - "Show only activities with power data"
   - "Show only activities with HR data"

**Files to modify**:
- `server/migrations/008_add_data_quality_flags.sql`
- `server/services/activityImportService.js` - Set flags during import
- `src/components/ActivityCard.jsx` - Add badges
- `src/pages/AllActivities.jsx` - Add filters

### Phase 3: Enhanced TSS Estimation (Medium-term - 3 hours)

**Goal**: Better TSS estimates for activities without power/HR

**Current logic** (in Dashboard.jsx:75-103):
```javascript
// Priority 1: Power-based (most accurate)
if (normalizedPower && ftp) {
  TSS = (duration * NP/FTP)^2 * 100
}
// Priority 2: HR-based (moderate accuracy)
else if (avgHeartRate) {
  TSS = duration * (HR/170)^2 * 100
}
// Priority 3: Duration-based (rough estimate)
else {
  TSS = duration * type_multiplier
}
```

**Improvements**:
1. Use activity type more intelligently:
   - "Zwift" prefix → higher intensity multiplier
   - "Recovery" in name → lower multiplier
   - "Group Ride" → moderate multiplier

2. Use distance/elevation for better estimates:
   - High elevation gain → higher TSS
   - Long distance + short duration → higher intensity

3. Learn from user's historical data:
   - Calculate average TSS/hour for similar activities
   - Use user's typical intensity patterns

**Implementation**:
- Create `server/services/tssEstimationService.js`
- Add smart estimation logic
- Use in `activityImportService.js` during import

### Phase 4: Data Enrichment System (Long-term - 1 day)

**Goal**: Backfill missing data when available from multiple sources

**Strategy**:
1. When Strava activity has HR/power but Intervals doesn't → copy to Intervals source
2. When user uploads .fit file → extract and backfill metrics
3. Periodic background job to check for enrichment opportunities

**Architecture**:
```
┌─────────────────┐
│ Activity Import │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check for       │
│ Enrichment      │
│ Opportunities   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Fetch Missing   │
│ Data from       │
│ Other Sources   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Update Activity │
│ Sources & Merge │
└─────────────────┘
```

**Files to create**:
- `server/services/dataEnrichmentService.js`
- `server/jobs/enrichActivities.js` (cron job)

### Phase 5: Admin Tools (Long-term - 4 hours)

**Goal**: Give admins visibility into data quality issues

**Features**:
1. Data quality dashboard:
   - % activities with power
   - % activities with HR
   - % activities with estimated TSS
   - Activities missing critical data

2. Bulk actions:
   - Re-import specific date range
   - Trigger enrichment for all activities
   - Recalculate TSS for all activities

3. Activity detail view:
   - Show all sources for an activity
   - Show merge decisions made
   - Manual override for bad merges

**Files to create**:
- `src/pages/admin/DataQuality.jsx`
- `server/routes/admin/dataQuality.js`

## Breaking Free from Strava

**Medium-term strategy** (3-6 months):

1. **Primary source: Intervals.icu**
   - Already has full integration
   - More flexible API
   - Better for power/training data

2. **File upload system**
   - Allow users to upload .fit/.tcx files directly
   - Parse and extract all metrics
   - No dependency on external APIs

3. **Device integrations**
   - Garmin Connect API
   - Wahoo API
   - Direct device sync

4. **Strava as optional**
   - Keep for social features
   - Use for activity discovery
   - Not required for core functionality

**Files to create**:
- `server/services/fitFileParser.js`
- `server/routes/fileUpload.js`
- `src/pages/UploadActivity.jsx`

## Success Metrics

### Immediate (Phase 1)
- ✅ All ~200 activities imported
- ✅ Activities with partial data retained
- ✅ No valid activities skipped

### Short-term (Phase 2)
- ✅ Users can see data quality at a glance
- ✅ Filters work for power/HR data
- ✅ No confusion about estimated vs. actual TSS

### Medium-term (Phase 3-4)
- ✅ TSS estimates within 10% of actual for 80% of activities
- ✅ 50% of partial data activities enriched with full metrics
- ✅ Admin tools provide clear visibility

### Long-term (Phase 5)
- ✅ File upload working for .fit/.tcx
- ✅ 80% of users don't need Strava
- ✅ Data quality consistently high

## Next Steps

1. **Right now**: Force refresh Dashboard to import all activities
2. **Today**: Verify activity count and data quality
3. **This week**: Implement Phase 2 (data quality indicators)
4. **Next week**: Implement Phase 3 (enhanced TSS estimation)
5. **This month**: Plan Phase 4-5 implementation
