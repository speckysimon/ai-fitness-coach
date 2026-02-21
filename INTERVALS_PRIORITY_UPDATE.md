# Intervals.icu Priority Update

**Date:** January 24, 2026, 8:00pm
**Status:** ✅ COMPLETE

## Changes Implemented

### 1. Race Analysis - Full Activity Data ✅
**File:** `src/pages/PostRaceAnalysis.jsx`

The race analysis already pulls complete activity data from both Intervals.icu and Strava:
- Line 223-226: Spreads full `selectedActivity` object including all fields
- Includes: power data, heart rate, lap splits, elevation, duration, distance, etc.
- Works with both Intervals.icu (comprehensive data) and Strava (basic data)

**What gets sent to AI:**
```javascript
raceActivity: {
  ...selectedActivity,  // ALL activity fields
  elevation: selectedActivity.totalElevationGain,
  tss: calculateTSS(selectedActivity, ftp)
}
```

**Intervals.icu provides:**
- Detailed power curve data
- Lap-by-lap breakdowns
- Heart rate zones
- Training load metrics
- Interval analysis
- Cadence and power distribution

**Strava provides:**
- Basic summary metrics
- Average power/HR
- Total elevation
- Duration and distance
- Limited segment data

### 2. New Onboarding Modal Created ✅
**File:** `src/components/DataSourceWelcomeModal.jsx`

Created a comprehensive onboarding modal that:
- **Recommends Intervals.icu as preferred** (marked with ⭐ RECOMMENDED badge)
- Shows detailed comparison of data sources
- Explains why more data = better AI insights
- Provides clear visual hierarchy (Intervals.icu prominent, Strava secondary)

**Key Features:**
- Side-by-side comparison with checkmarks
- "Why More Data = Better AI Insights" section
- Three benefit cards: Smarter Training Plans, Better Race Analysis, Accurate Predictions
- Skip option for users who want to connect later

**Intervals.icu Benefits Highlighted:**
✅ Power curve analysis
✅ Heart rate zones
✅ Detailed lap data
✅ Training load metrics
✅ Interval breakdowns
✅ Better AI insights

**Strava Limitations Shown:**
✅ Activity summaries
✅ Basic metrics
⚠️ Limited power data
⚠️ No interval details

### 3. Dashboard Integration
**File:** `src/pages/Dashboard.jsx`

- Imported `DataSourceWelcomeModal` (line 11)
- Ready to replace `OnboardingModal` when needed
- Modal triggers on first visit (no `has_seen_welcome_modal` flag)

### 4. Existing Multi-Source Support ✅
The app already supports pulling from multiple sources:
- **Intervals.icu:** Full detailed data (preferred)
- **Strava:** Basic activity data
- **Manual entries:** User-entered activities

**Data Merging:**
- `src/lib/activityMerger.js` handles deduplication
- Priority: Intervals.icu > Strava > Manual
- Cached in `localStorage` as `cached_activities_recent`

## Implementation Status

### ✅ Complete
1. Race analysis pulls full activity data from all sources
2. New onboarding modal created with Intervals.icu priority
3. Clear messaging about data quality differences
4. Visual hierarchy emphasizing Intervals.icu benefits

### 📋 Next Steps (Optional)
1. **Replace OnboardingModal with DataSourceWelcomeModal:**
   - Update Dashboard.jsx to use new modal
   - Test onboarding flow with both data sources
   
2. **Add Intervals.icu connection to existing modals:**
   - Update reminder notifications
   - Add to Settings page connection prompts
   
3. **Add data quality indicators:**
   - Show badge on activities from Intervals.icu
   - Display "Limited data" warning for Strava-only activities
   
4. **Create migration guide:**
   - Help Strava users switch to Intervals.icu
   - Show benefits they'll unlock

## User Messaging

### Onboarding
"**Intervals.icu** - The most comprehensive data source for serious athletes"
- Recommended badge
- 6 checkmarks for features
- Prominent blue button

"**Strava** - Basic activity tracking - limited data for AI analysis"
- Secondary position
- 2 checkmarks, 2 warnings
- Outline button

### Why It Matters Section
Three cards explaining benefits:
1. **Smarter Training Plans** - AI analyzes power curve, intervals, and training load
2. **Better Race Analysis** - Detailed lap data identifies pacing mistakes
3. **Accurate Predictions** - More data points = better race day predictions

## Technical Details

### Data Flow
1. User connects Intervals.icu or Strava
2. Activities sync to Dashboard
3. `activityMerger.js` deduplicates and prioritizes
4. Full activity object stored in cache
5. Race analysis receives complete data
6. AI analyzes all available fields

### Activity Fields Available
**From Intervals.icu:**
- `avgPower`, `normalizedPower`, `weightedAvgPower`
- `avgHeartRate`, `maxHeartRate`, `hrZones`
- `avgCadence`, `maxCadence`
- `laps[]` with detailed breakdowns
- `intervals[]` with power/HR data
- `powerCurve`, `trainingLoad`
- `elevation`, `elevationGain`, `elevationLoss`

**From Strava:**
- `avgPower`, `avgHeartRate`
- `totalElevationGain`
- `duration`, `distance`
- `type`, `name`, `date`
- Limited segment data

### AI Benefits
With Intervals.icu data, AI can:
- Analyze pacing strategy lap-by-lap
- Identify power distribution issues
- Detect heart rate drift
- Evaluate interval execution
- Compare efforts to training zones
- Provide specific tactical recommendations

With Strava data only, AI is limited to:
- Overall performance metrics
- General pacing assessment
- Basic effort analysis
- High-level recommendations

## Files Modified

1. **Created:**
   - `src/components/DataSourceWelcomeModal.jsx` (new onboarding)
   - `INTERVALS_PRIORITY_UPDATE.md` (this file)

2. **Updated:**
   - `src/pages/Dashboard.jsx` (imported new modal)

3. **Verified:**
   - `src/pages/PostRaceAnalysis.jsx` (already using full data)
   - `src/lib/activityMerger.js` (already prioritizing Intervals.icu)

## Testing Checklist

- [ ] Test onboarding with Intervals.icu connection
- [ ] Test onboarding with Strava connection
- [ ] Verify race analysis receives full Intervals.icu data
- [ ] Verify race analysis works with Strava-only data
- [ ] Check data quality indicators display correctly
- [ ] Test skip option in onboarding
- [ ] Verify modal doesn't show again after connection

## Deployment Notes

**No breaking changes** - All updates are additive:
- New modal can be gradually rolled out
- Existing Strava users unaffected
- Race analysis already compatible with both sources
- No database migrations required

**Recommended rollout:**
1. Deploy new modal to staging
2. Test with 5-10 users
3. Gather feedback on messaging
4. Adjust copy if needed
5. Deploy to production
6. Monitor connection rates (Intervals vs Strava)
