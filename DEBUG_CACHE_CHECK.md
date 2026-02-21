# Debug: Check Cached Activities

## Instructions

Open your browser console and run these commands to see what's actually cached:

```javascript
// 1. Check what's in the cache
const cached = localStorage.getItem('cached_activities_recent');
const activities = JSON.parse(cached);

// 2. Find an Intervals.icu activity
const intervalsActivity = activities.find(a => a.source === 'intervals');

// 3. Check the field names
console.log('Intervals.icu activity fields:', {
  id: intervalsActivity?.id,
  name: intervalsActivity?.name,
  source: intervalsActivity?.source,
  
  // Check power fields
  avgPower: intervalsActivity?.avgPower,
  average_watts: intervalsActivity?.average_watts,
  icu_average_watts: intervalsActivity?.icu_average_watts,
  
  // Check HR fields
  avgHeartRate: intervalsActivity?.avgHeartRate,
  average_hr: intervalsActivity?.average_hr,
  icu_average_hr: intervalsActivity?.icu_average_hr,
  
  // Check duration
  duration: intervalsActivity?.duration,
  moving_time: intervalsActivity?.moving_time,
  elapsed_time: intervalsActivity?.elapsed_time
});

// 4. Count activities with avgPower
const withAvgPower = activities.filter(a => a.avgPower && a.avgPower > 0);
console.log('Activities with avgPower:', withAvgPower.length);

// 5. Count activities with avgHeartRate
const withAvgHR = activities.filter(a => a.avgHeartRate && a.avgHeartRate > 0);
console.log('Activities with avgHeartRate:', withAvgHR.length);

// 6. Count by source
const bySource = activities.reduce((acc, a) => {
  acc[a.source] = (acc[a.source] || 0) + 1;
  return acc;
}, {});
console.log('Activities by source:', bySource);
```

## Expected Output

If normalization is working:
- `avgPower` should have a value (not undefined/null)
- `avgHeartRate` should have a value (not undefined/null)
- Both counts should be > 0

If normalization is NOT working:
- `avgPower` will be undefined/null
- `icu_average_watts` or `average_watts` will have the value
- Same for HR fields

## Next Steps

Based on the output, we'll know if:
1. Cache needs to be cleared and Dashboard re-visited
2. Normalization code isn't running
3. Field names are different than expected
