/**
 * Debug Script - Check Raw Intervals.icu API Response
 * 
 * This will show us what field names Intervals.icu actually uses
 * Run with: node scripts/debug-intervals-raw.js
 */

console.log(`
🔍 DEBUGGING INTERVALS.ICU DATA LOSS

The problem: Intervals.icu UI shows activities with data, but our import sees them as empty.

Hypothesis: Field name mismatch between what Intervals.icu API returns vs what we're reading.

To debug:
1. Check browser console for the RAW activity log from IntervalsService
2. Look for: "🔍 [IntervalsService] RAW activity from API:"
3. Compare field names to what we're reading in normalizeActivity()

Expected fields from Intervals.icu API:
- moving_time (seconds)
- distance (meters)
- icu_training_load (TSS)
- icu_average_watts (power)
- avg_hr (heart rate)

If these are null/undefined in the raw response, then Intervals.icu API isn't returning them.
If these have values in raw response but are null after normalization, then field mapping is wrong.

Next step: Refresh AllActivities and check console for the RAW activity JSON.
`);
