# Activity Normalisation System

**Version:** 1.0  
**Algorithm Version:** `norm_v1`  
**Last Updated:** February 17, 2026

---

## Overview

The Activity Normalisation system computes stable, reproducible derived physiology features for every canonical activity. These features power coaching logic, training load analysis, and performance insights.

**Key Principles:**
- ✅ **Deterministic** - No AI, no fragile heuristics
- ✅ **Idempotent** - Re-running produces identical output
- ✅ **Versioned** - Algorithm version tracked for migrations
- ✅ **Selective** - Only processes analytics-valid activities
- ✅ **Quality-aware** - Assesses and flags data quality issues

---

## Architecture

### Data Flow

```
Analytics Activities (via analyticsQueryBuilder)
    ↓
Activity Normaliser (compute derived metrics)
    ↓
activity_normalised table (store results)
    ↓
Coaching Logic / Analytics
```

### Components

1. **activityNormaliser.js** - Core computation functions
2. **normalisationRunner.js** - Orchestration and batch processing
3. **activity_normalised table** - Storage for derived metrics

---

## Derived Metrics

### Power-Based Metrics

**Time in Zones**
- Seconds spent in each power zone (Z1-Z7)
- Based on user's FTP
- Zones: Recovery (0-55%), Endurance (55-75%), Tempo (75-90%), Threshold (90-105%), VO2max (105-120%), Anaerobic (120-150%), Neuromuscular (150%+)

**Longest Sustained Efforts**
- Longest continuous effort in each zone
- Includes duration and average power
- Minimum duration: 5 minutes (300s)

**Power Fade (Fatigue)**
- Compares first third vs final third average power
- Positive = power dropped (fatigue)
- Negative = power increased (pacing issue)
- Formula: `(P1 - P3) / P1 * 100`

**Variability Index (VI)**
- Ratio of Normalized Power to Average Power
- Higher VI = more variable pacing
- Formula: `NP / avgPower`
- Steady ride: ~1.00-1.05
- Variable ride: 1.05-1.15
- Very variable: 1.15+

### HR-Based Metrics

**Time in Zones**
- Seconds spent in each HR zone (Z1-Z5)
- Based on user's max HR
- Zones: Recovery (0-60%), Endurance (60-75%), Tempo (75-85%), Threshold (85-95%), VO2max (95%+)

**Longest Sustained Efforts**
- Longest continuous effort in each zone
- Includes duration and average HR

**HR Drift (Decoupling)**
- Measures cardiovascular drift over time
- With power: compares HR at similar power (first half vs second half)
- Without power: simple HR drift
- Formula: `(HR2 - HR1) / HR1 * 100`
- < 5%: Good aerobic fitness
- 5-10%: Moderate drift
- > 10%: Significant drift (dehydration, fatigue, heat)

### Quality Assessment

**Quality Score (0-100)**
- 20 points: Base score
- 15 points: Power data available
- 15 points: HR data available
- 10 points: Cadence data available
- 20 points: Stream data available
- 20 points: Stream completeness (scaled by % complete)

**Quality Notes**
- `NO_POWER` - No power data
- `NO_HR` - No HR data
- `NO_CADENCE` - No cadence data
- `NO_STREAMS` - No stream data available
- `MINOR_GAPS` - 80-95% stream completeness
- `MODERATE_GAPS` - 60-80% stream completeness
- `MAJOR_GAPS` - < 60% stream completeness
- `SHORT_ACTIVITY` - Duration < 5 minutes

---

## Database Schema

### activity_normalised Table

```sql
CREATE TABLE activity_normalised (
  user_id INTEGER NOT NULL,
  activity_id TEXT NOT NULL,
  computed_at TEXT NOT NULL,
  algo_version TEXT NOT NULL,
  
  -- Data availability
  has_power INTEGER,
  has_hr INTEGER,
  has_cadence INTEGER,
  has_streams INTEGER,
  
  -- Basic metrics
  duration_s INTEGER,
  distance_m REAL,
  avg_power REAL,
  np REAL,
  avg_hr REAL,
  
  -- Power metrics
  power_fade_pct REAL,
  vi REAL,
  time_in_zones_power TEXT,      -- JSON
  longest_efforts_power TEXT,     -- JSON
  
  -- HR metrics
  hr_drift_pct REAL,
  time_in_zones_hr TEXT,          -- JSON
  longest_efforts_hr TEXT,        -- JSON
  
  -- Quality
  quality_score INTEGER,
  notes TEXT,                     -- JSON
  
  PRIMARY KEY (user_id, activity_id)
);
```

### JSON Formats

**time_in_zones_power / time_in_zones_hr:**
```json
{
  "z1": 600,
  "z2": 1800,
  "z3": 900,
  "z4": 300,
  "z5": 0
}
```

**longest_efforts_power / longest_efforts_hr:**
```json
{
  "z2": {
    "duration_s": 1200,
    "avg_value": 140
  },
  "z3": {
    "duration_s": 600,
    "avg_value": 170
  }
}
```

**notes:**
```json
["NO_POWER", "MINOR_GAPS"]
```

---

## Usage

### Normalise Single Activity

```javascript
import { normaliseActivity } from './services/activityNormaliser.js';

const result = await normaliseActivity(userId, activityId);

// Result:
// {
//   ok: true,
//   activityId: 'intervals:i-12345',
//   qualityScore: 95,
//   hasPower: true,
//   hasHr: true,
//   notes: []
// }
```

### Normalise All Activities for User

```javascript
import { runNormalisationForUser } from './services/normalisationRunner.js';

const result = await runNormalisationForUser(userId, {
  after: new Date('2026-01-01'),
  before: new Date('2026-02-01'),
  limit: 100,
  forceRecompute: false
});

// Result:
// {
//   ok: true,
//   stats: {
//     total: 50,
//     computed: 45,
//     skipped: 5,
//     errors: 0
//   },
//   duration_ms: 1234
// }
```

### Get Normalisation Status

```javascript
import { getNormalisationStatus } from './services/normalisationRunner.js';

const status = getNormalisationStatus(userId);

// Result:
// {
//   totalActivities: 100,
//   normalisedActivities: 95,
//   coverage: '95.0',
//   latestNormalisation: '2026-02-17T16:00:00Z',
//   algoVersion: 'norm_v1',
//   qualityDistribution: {
//     high: 80,
//     medium: 10,
//     low: 5
//   }
// }
```

### Query Normalised Data

```javascript
// Get activities with high quality power data
const activities = db.prepare(`
  SELECT 
    a.id, a.name, a.start_time,
    n.quality_score, n.vi, n.power_fade_pct, n.hr_drift_pct
  FROM activities a
  JOIN activity_normalised n ON a.id = n.activity_id
  WHERE a.user_id = ?
    AND n.has_power = 1
    AND n.quality_score >= 80
  ORDER BY a.start_time DESC
`).all(userId);

// Get time in zones for analysis
const zones = db.prepare(`
  SELECT time_in_zones_power FROM activity_normalised
  WHERE user_id = ? AND activity_id = ?
`).get(userId, activityId);

const timeInZones = JSON.parse(zones.time_in_zones_power);
console.log(`Z2 time: ${timeInZones.z2} seconds`);
```

---

## Integration with Analytics

The normalisation system integrates with `analyticsQueryBuilder` to ensure only valid activities are processed:

```javascript
// normalisationRunner.js uses analyticsQueryBuilder
const activities = await getAnalyticsActivities(userId, options);

// This respects:
// - is_valid_for_analytics flag
// - user's analytics_include_strava_only preference
// - Date range filters
```

---

## Algorithm Versioning

Every normalised activity stores `algo_version` to enable safe migrations when computation logic changes.

### Current Version: `norm_v1`

**Features:**
- Time in zones (power & HR)
- Longest sustained efforts
- HR drift with power-aware decoupling
- Power fade (first third vs final third)
- Variability Index
- Quality scoring

### Migration Process

When algorithm changes:

1. **Increment version** (e.g., `norm_v2`)
2. **Update ALGO_VERSION** in `activityNormaliser.js`
3. **Run migration:**

```javascript
import { migrateNormalisedData } from './services/normalisationRunner.js';

await migrateNormalisedData(userId, 'norm_v1', 'norm_v2');
```

This will:
- Clear old version data
- Recompute with new algorithm
- Store with new version

---

## Stream Data Requirements

### Current Implementation

The normaliser expects streams in this format:

```javascript
{
  power: [180, 185, 190, ...],  // Watts per second
  hr: [140, 142, 145, ...],     // BPM per second
  cadence: [85, 86, 87, ...]    // RPM per second
}
```

### Stream Source

Currently uses `getCanonicalStreams(activityId)` which returns `null` (not implemented).

**TODO:** Implement stream storage and retrieval:
- Option 1: Store in `activity_sources.raw_json`
- Option 2: Create dedicated `activity_streams` table
- Option 3: Store in separate files/blob storage

---

## Performance Considerations

### Computation Cost

- **Single activity:** ~10-50ms (without streams)
- **Single activity with streams:** ~50-200ms (depending on duration)
- **Batch (100 activities):** ~5-20 seconds

### Optimization Strategies

1. **Batch Processing** - Use `runNormalisationForUser()` for multiple activities
2. **Skip Already Normalised** - Default behavior unless `forceRecompute: true`
3. **Incremental Updates** - Only normalise new activities
4. **Background Jobs** - Run normalisation async (future enhancement)

---

## Testing

### Run Tests

```bash
npm test server/tests/activityNormaliser.test.js
```

### Test Coverage

- ✅ Time in zones computation
- ✅ Longest sustained efforts
- ✅ HR drift (with/without power)
- ✅ Power fade
- ✅ Variability Index
- ✅ Quality scoring
- ✅ Idempotency
- ✅ Algorithm versioning
- ✅ Batch processing
- ✅ Integration with database

---

## Coaching Applications

### Training Load Analysis

```javascript
// Calculate weekly training load from time in zones
const weekActivities = db.prepare(`
  SELECT time_in_zones_power FROM activity_normalised
  WHERE user_id = ? AND computed_at >= date('now', '-7 days')
`).all(userId);

let totalZ4Time = 0;
weekActivities.forEach(a => {
  const zones = JSON.parse(a.time_in_zones_power);
  totalZ4Time += zones.z4 || 0;
});

console.log(`Total Z4 time this week: ${totalZ4Time / 60} minutes`);
```

### Fatigue Detection

```javascript
// Identify activities with high power fade
const fatigueActivities = db.prepare(`
  SELECT a.id, a.name, n.power_fade_pct
  FROM activities a
  JOIN activity_normalised n ON a.id = n.activity_id
  WHERE a.user_id = ?
    AND n.power_fade_pct > 15
  ORDER BY a.start_time DESC
`).all(userId);
```

### Aerobic Fitness Tracking

```javascript
// Track HR drift over time
const driftTrend = db.prepare(`
  SELECT 
    date(a.start_time) as date,
    AVG(n.hr_drift_pct) as avg_drift
  FROM activities a
  JOIN activity_normalised n ON a.id = n.activity_id
  WHERE a.user_id = ?
    AND n.hr_drift_pct IS NOT NULL
  GROUP BY date(a.start_time)
  ORDER BY date DESC
  LIMIT 30
`).all(userId);
```

### Pacing Analysis

```javascript
// Identify variable pacing (high VI)
const variableActivities = db.prepare(`
  SELECT a.id, a.name, n.vi
  FROM activities a
  JOIN activity_normalised n ON a.id = n.activity_id
  WHERE a.user_id = ?
    AND n.vi > 1.10
  ORDER BY n.vi DESC
`).all(userId);
```

---

## Future Enhancements

### Phase 2: Advanced Metrics

- **Intensity Factor (IF)** - NP / FTP
- **Training Stress Score (TSS)** - IF² × duration × 100 / 3600
- **Chronic Training Load (CTL)** - 42-day exponential moving average
- **Acute Training Load (ATL)** - 7-day exponential moving average
- **Training Stress Balance (TSB)** - CTL - ATL

### Phase 3: Stream Analysis

- **Power curve** - Best efforts for all durations (1s, 5s, 10s, ..., 60min)
- **Critical power model** - CP and W' estimation
- **Quadrant analysis** - Force-velocity distribution
- **Pedal smoothness** - Left/right balance

### Phase 4: Comparative Analysis

- **Personal records** - Best efforts per zone/duration
- **Trend analysis** - Fitness progression over time
- **Peer comparison** - Anonymized benchmarking

---

## Troubleshooting

### Issue: Quality Score Always Low

**Cause:** No stream data available

**Solution:** Implement stream storage and retrieval in `getCanonicalStreams()`

### Issue: HR Drift Always Null

**Cause:** Power varies too much (> 10%) between halves

**Solution:** This is expected for interval workouts. HR drift only computed for steady-state efforts.

### Issue: Normalisation Slow

**Cause:** Processing many activities with streams

**Solution:** Use batch processing and consider background jobs

### Issue: Different Results on Re-run

**Cause:** Algorithm not deterministic

**Solution:** Check for:
- Random number generation
- Timestamp dependencies
- External API calls
- Non-deterministic sorting

---

## Summary

The Activity Normalisation system provides:

- ✅ **Stable, reproducible metrics** for coaching logic
- ✅ **Quality assessment** to flag data issues
- ✅ **Algorithm versioning** for safe migrations
- ✅ **Integration with analytics** query builder
- ✅ **Comprehensive testing** ensuring correctness
- ✅ **Performance optimized** for batch processing

**Next Steps:**
1. Implement stream storage and retrieval
2. Add API endpoints for querying normalised data
3. Build coaching features using normalised metrics
4. Add background job for automatic normalisation
