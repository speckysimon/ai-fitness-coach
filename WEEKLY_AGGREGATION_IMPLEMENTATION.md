# Weekly Aggregation Implementation

## Overview

Implemented stable weekly rollups per user for dashboards and coaching logic. Aggregates normalised metrics, durability, and stress data into weekly summaries with ISO Monday week starts.

**Algorithm Version:** `week_v1`

---

## Database Schema

### Migration: `016_weekly_rollups.sql`

**Table: `athlete_weekly`**

```sql
CREATE TABLE athlete_weekly (
  user_id INTEGER NOT NULL,
  week_start TEXT NOT NULL,              -- ISO Monday start (YYYY-MM-DD)
  computed_at TEXT NOT NULL,
  algo_version TEXT DEFAULT 'week_v1',

  -- Coverage / quality
  activities_total INTEGER DEFAULT 0,
  activities_analysed INTEGER DEFAULT 0,  -- included in analyticsQueryBuilder
  activities_with_streams INTEGER DEFAULT 0,
  activities_with_power INTEGER DEFAULT 0,
  activities_with_hr INTEGER DEFAULT 0,
  avg_quality_score REAL,

  -- Load / volume
  total_duration_s INTEGER DEFAULT 0,
  total_distance_m REAL DEFAULT 0,

  -- Time in zones (power + hr)
  tiz_power TEXT,                        -- JSON seconds per zone aggregated
  tiz_hr TEXT,                           -- JSON seconds per zone aggregated

  -- Key "work" markers
  threshold_minutes REAL,                -- Z4 time (power preferred)
  vo2_minutes REAL,                      -- Z5 time
  sprint_spikes INTEGER DEFAULT 0,       -- from stress
  stochastic_sessions INTEGER DEFAULT 0, -- count stress.is_stochastic=1

  -- Durability summaries (only where sufficient duration + has power)
  avg_power_fade REAL,
  p25_power_fade REAL,
  best_late_threshold_score REAL,
  avg_efficiency_drop REAL,
  repeat_hard_efforts_total INTEGER DEFAULT 0,

  -- Stress distribution
  stress_dist TEXT,                      -- JSON counts by type

  -- Metadata
  notes TEXT,                            -- JSON for missing-data reason codes

  PRIMARY KEY (user_id, week_start)
);
```

**Indexes:**
- `idx_athlete_weekly_user_week` - (user_id, week_start)
- `idx_athlete_weekly_computed` - (computed_at)

---

## Service: `weeklyAggregator.js`

### Core Functions

#### `getWeekStart(date)`
Get ISO Monday start date for any date.

```javascript
getWeekStart('2026-02-17') // Returns '2026-02-16' (Monday)
getWeekStart('2026-02-22') // Returns '2026-02-16' (Sunday belongs to same week)
```

#### `computeWeeklyRollup(userId, weekStart, options)`
Compute rollup for a specific week.

**Process:**
1. Get activities in week using `analyticsQueryBuilder`
2. Join normalised, durability, stress, and stream data
3. Aggregate time-in-zones by summing zone seconds
4. Compute durability averages and percentiles
5. Count stress types and flags
6. Calculate quality scores

**Returns:** Rollup object with all metrics

#### `upsertWeeklyRollup(rollup)`
Store rollup in database (idempotent).

**Behavior:**
- INSERT if new week
- UPDATE if week exists
- Atomic operation

#### `computeAndStoreWeeklyRollup(userId, weekStart, options)`
Compute and store in one operation.

#### `computeWeeklyRollups(userId, options)`
Compute multiple weeks.

**Options:**
- `after` - Start date (YYYY-MM-DD)
- `before` - End date (YYYY-MM-DD)
- `weeksBack` - Number of weeks back from today (default: 12)

**Example:**
```javascript
// Compute last 12 weeks
await computeWeeklyRollups(userId, { weeksBack: 12 });

// Compute specific range
await computeWeeklyRollups(userId, {
  after: '2026-01-01',
  before: '2026-03-01'
});
```

#### `getWeeklyRollups(userId, options)`
Retrieve rollups for a user.

**Options:**
- `after` - Filter by week_start >= date
- `before` - Filter by week_start < date
- `limit` - Limit results

#### `getWeeklyRollup(userId, weekStart)`
Get single week rollup.

---

## Aggregation Logic

### 1. Week Bucketing

**ISO Week Start (Monday):**
- All activities bucketed by Monday start date
- Week runs Monday 00:00 to Sunday 23:59
- Handles year boundaries correctly

**Example:**
```
2026-02-16 (Mon) to 2026-02-22 (Sun) → week_start: '2026-02-16'
2026-02-23 (Mon) to 2026-03-01 (Sun) → week_start: '2026-02-23'
```

### 2. Analytics Query Integration

**Uses `analyticsQueryBuilder`:**
- Only includes `is_valid_for_analytics = 1`
- Respects user's `analytics_include_strava_only` preference
- Consistent with all other analytics queries

### 3. Time-in-Zones Aggregation

**Power Zones:**
```javascript
// Activity 1: { Z1: 1800, Z2: 900, Z3: 600, Z4: 300 }
// Activity 2: { Z1: 1200, Z2: 1200, Z3: 900, Z4: 300 }
// Aggregated: { Z1: 3000, Z2: 2100, Z3: 1500, Z4: 600 }
```

**Threshold/VO2 Minutes:**
- `threshold_minutes` = Z4 seconds / 60 (power preferred, HR fallback)
- `vo2_minutes` = Z5 seconds / 60 (power preferred, HR fallback)

### 4. Durability Averages

**Computed from valid durability rows only:**
- `avg_power_fade` - Mean of power_fade values
- `p25_power_fade` - 25th percentile (best quarter)
- `best_late_threshold_score` - Maximum late_threshold_score
- `avg_efficiency_drop` - Mean of efficiency_drop values
- `repeat_hard_efforts_total` - Sum of repeat_hard_efforts

**Percentile Calculation:**
```javascript
// Values: [0.10, 0.15, 0.20]
// p25 = 0.10 (25th percentile, best performers)
```

### 5. Stress Distribution

**Counts by type:**
```javascript
{
  "steady": 2,
  "intervals": 1,
  "race": 1
}
```

**Flags:**
- `stochastic_sessions` - Count of `is_stochastic = 1`
- `sprint_spikes` - Sum of all sprint_spikes

### 6. Coverage and Quality

**Coverage Flags:**
- `activities_with_streams` - Has stream data
- `activities_with_power` - Has power data
- `activities_with_hr` - Has HR data

**Quality Score (0-1):**
```javascript
// Per activity:
score = (has_streams ? 0.33 : 0) + (has_power ? 0.33 : 0) + (has_hr ? 0.34 : 0)

// Week average:
avg_quality_score = mean(all activity scores)
```

### 7. Missing Data Notes

**Automatic notes for:**
- `no_power` - No activities with power this week
- `no_streams` - No activities with streams this week
- `no_durability` - No valid durability data this week

**Stored as JSON:**
```json
{
  "no_power": "No activities with power data this week",
  "no_streams": "No activities with stream data this week"
}
```

---

## Usage Examples

### Compute Single Week

```javascript
import { computeAndStoreWeeklyRollup } from './services/weeklyAggregator.js';

const result = await computeAndStoreWeeklyRollup(userId, '2026-02-16');

if (result.ok) {
  console.log('Rollup computed:', result.rollup);
}
```

### Compute Last 12 Weeks

```javascript
import { computeWeeklyRollups } from './services/weeklyAggregator.js';

const result = await computeWeeklyRollups(userId, { weeksBack: 12 });

console.log(`Computed ${result.computed} weeks, ${result.failed} failed`);
```

### Retrieve Rollups

```javascript
import { getWeeklyRollups } from './services/weeklyAggregator.js';

// Get last 8 weeks
const rollups = getWeeklyRollups(userId, { limit: 8 });

for (const rollup of rollups) {
  console.log(`Week ${rollup.week_start}:`);
  console.log(`  Activities: ${rollup.activities_total}`);
  console.log(`  Duration: ${rollup.total_duration_s / 3600}h`);
  console.log(`  Threshold: ${rollup.threshold_minutes}min`);
  console.log(`  Quality: ${(rollup.avg_quality_score * 100).toFixed(0)}%`);
}
```

### Dashboard Integration

```javascript
import { getWeeklyRollups } from './services/weeklyAggregator.js';

// Get last 4 weeks for dashboard
const weeks = getWeeklyRollups(userId, { limit: 4 });

const dashboardData = weeks.map(week => ({
  week: week.week_start,
  volume: week.total_duration_s / 3600, // hours
  quality: week.avg_quality_score,
  threshold: week.threshold_minutes,
  vo2: week.vo2_minutes,
  durability: week.avg_power_fade,
  stressTypes: JSON.parse(week.stress_dist || '{}')
}));
```

---

## When Does Weekly Compute Happen?

Weekly rollups are computed **automatically** via event-driven triggers. There is no need for manual recompute on dashboard load.

### Event-Driven Recompute (Primary)

**Service:** `server/services/weeklyRecomputeScheduler.js`

Weekly rollups are recomputed automatically when the activity set changes:

| Trigger | Where | Method |
|---------|-------|--------|
| Provider sync (Garmin, Wahoo, etc.) | `providerSyncRunner.js` | `recomputeWeeksForUser()` with affected weeks |
| Paginated provider sync | `providerSyncRunner.js` | `recomputeRecentWeeks(userId, 4)` |
| Intervals.icu enrichment | `intervals.js` `/enrich` | `recomputeRecentWeeks(userId, 4)` |
| Manual recompute | `POST /api/analytics/recompute` | `computeWeeklyRollups()` (existing) |

**How affected weeks are derived:**
1. **Preferred:** Collect activity IDs that were created/upgraded during import → query `start_time` → convert to `weekStart` via `getWeekStart()`
2. **Fallback:** If activity IDs unavailable, recompute last 4 weeks (cheap and safe)

**Safety features:**
- Lookback buffer (default 1 week) handles boundary activities
- Max 6 weeks per call (clamped with warning)
- Deduplicated week set
- Non-fatal: weekly recompute errors don't break the sync

### Ensure-Weekly Endpoint (First-Run / Backfill)

**Endpoint:** `POST /api/analytics/ensure-weekly`

For new users or first-time dashboard loads where `athlete_weekly` is empty.

```json
// Request
{ "userId": 1, "weeksBack": 12, "force": false }

// Response
{ "ok": true, "hadWeekly": false, "computed": 12, "weeksBack": 12 }
```

**Behaviour:**
- If `athlete_weekly` has rows and `force=false` → returns immediately (no compute)
- If empty or `force=true` → runs `computeWeeklyRollups(userId, { weeksBack })`
- Does NOT compute normalised/durability/stress — only weekly rollups

### Dashboard Integration

The Dashboard calls `ensureWeeklyRollups()` after loading activities:
- 10-minute cooldown via `localStorage` key `rl_lastEnsureWeeklyAt`
- Non-blocking (fire-and-forget)
- Safe fetch helper handles non-JSON responses
- No heavy recompute on dashboard load

### Scheduler API

```javascript
import {
  weekStartFromISODate,
  recomputeWeeksForUser,
  recomputeWeeksForActivity,
  recomputeRecentWeeks,
  getAffectedWeeks,
  hasWeeklyRollups
} from './services/weeklyRecomputeScheduler.js';

// Recompute specific weeks (with lookback)
await recomputeWeeksForUser(userId, ['2026-02-16', '2026-02-23']);

// Recompute week for a single activity
await recomputeWeeksForActivity(userId, { start_time: '2026-02-18T08:00:00Z' });

// Recompute last N weeks (fallback)
await recomputeRecentWeeks(userId, 4);

// Derive affected weeks from activity IDs
const weeks = getAffectedWeeks(userId, ['act-123', 'act-456']);

// Check if user has any rollups
const { hasWeekly, count } = hasWeeklyRollups(userId);
```

---

## Integration Points

### 1. Provider Sync (Automatic)

**Wired into `providerSyncRunner.js`:**

After import + integrity verification, weekly recompute runs automatically:

```
Provider fetch → Map → Import → Verify integrity → Recompute weekly rollups
```

### 2. Ensure-Weekly (First-Run)

**Dashboard calls once per session:**

```javascript
// Frontend (Dashboard.jsx)
const ensureWeeklyRollups = async (userId) => {
  // 10-minute cooldown
  const resp = await fetch('/api/analytics/ensure-weekly', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, weeksBack: 12 })
  });
  // ...
};
```

### 3. Dashboard API

**Endpoint: GET /api/analytics/weekly**

Returns pre-computed rollups (no heavy compute):

```javascript
const rollups = getWeeklyRollups(userId, { limit: 12 });
```

### 4. Coaching Logic

**Use rollups for training load analysis:**

```javascript
const weeks = getWeeklyRollups(userId, { limit: 4 });

const loadTrend = weeks.map(w => ({
  week: w.week_start,
  load: w.total_duration_s / 3600,
  intensity: (w.threshold_minutes + w.vo2_minutes) / (w.total_duration_s / 60)
}));
```

---

## Testing

### Run Tests

```bash
npm test server/tests/weeklyAggregator.test.js
```

### Test Coverage

**weeklyAggregator.test.js:**
- Week Bucketing (2 tests)
- Time-in-Zones Aggregation (4 tests — includes malformed JSON, null TIZ)
- Analytics Query Builder Integration (2 tests)
- Durability Averages (4 tests — includes quality guard exclusions)
- Stress Distribution (1 test)
- Coverage and Quality (1 test)
- Idempotent Upserts (1 test)
- Multiple Weeks (2 tests)
- Full Fixture Regression (2 tests — non-null assertions + persist)

**weeklyAutoRecompute.test.js:**
- weekStartFromISODate (3 tests)
- recomputeWeeksForUser (5 tests — dedupe, lookback, clamp, empty)
- recomputeWeeksForActivity (2 tests)
- recomputeRecentWeeks (1 test)
- getAffectedWeeks (3 tests)
- hasWeeklyRollups (2 tests)
- Ensure-weekly logic (3 tests)

**Total: ~36 tests**

---

## Performance Considerations

### Query Optimization

**Single query with LEFT JOINs:**
```sql
SELECT a.*, n.tiz_power, d.power_fade, s.stress_type, st.id as has_streams
FROM activities a
LEFT JOIN activity_normalised n ON a.id = n.activity_id
LEFT JOIN activity_durability d ON a.id = d.activity_id
LEFT JOIN activity_stress s ON a.id = s.activity_id
LEFT JOIN activity_streams st ON a.id = st.activity_id
WHERE ... (analytics filters)
```

**Benefits:**
- Single database round-trip
- Efficient with indexes
- Scales to hundreds of activities per week

### Computation Time

**Typical performance:**
- Single week: ~10-50ms (10-20 activities)
- 12 weeks: ~200-500ms
- Suitable for real-time computation

### Storage Size

**Per week row:**
- ~500-1000 bytes (with JSON compression)
- 52 weeks/year = ~50KB per user per year
- Minimal storage impact

---

## Data Quality

### Validation Rules

**Required fields:**
- `user_id` - Must exist
- `week_start` - Must be Monday (YYYY-MM-DD)
- `computed_at` - ISO timestamp
- `algo_version` - 'week_v1'

**Optional fields:**
- All metrics can be NULL if no data available
- Notes JSON explains missing data

### Edge Cases

**Empty weeks:**
- All metrics NULL or 0
- `activities_total = 0`
- Notes explain no activities

**Partial data:**
- Some metrics computed, others NULL
- Notes explain missing data types

**Invalid activities:**
- Excluded by `analyticsQueryBuilder`
- Not counted in any metrics

---

## Maintenance

### Algorithm Versioning

**Current version:** `week_v1`

**When to increment:**
- Change in aggregation logic
- New metrics added
- Calculation method changed

**Migration strategy:**
```javascript
// Recompute all weeks with new version
await computeWeeklyRollups(userId, { weeksBack: 52 });
```

### Data Refresh

**Triggers for recomputation:**
1. New activity imported
2. Activity updated (physiology change)
3. Normalised/durability/stress recomputed
4. User preference changed

**Refresh strategy:**
```javascript
// After activity changes, refresh affected weeks
const weekStart = getWeekStart(activity.start_time);
await computeAndStoreWeeklyRollup(userId, weekStart);
```

---

## Troubleshooting

### Issue: Weekly table is empty

**Cause:** Weekly rollups haven't been computed yet (new user or first run).

**Solution:**
```bash
# Option 1: Call ensure-weekly endpoint
curl -X POST http://localhost:3000/api/analytics/ensure-weekly \
  -H 'Content-Type: application/json' \
  -d '{"userId": 1, "weeksBack": 12}'

# Option 2: Force recompute via recompute endpoint
curl -X POST http://localhost:3000/api/analytics/recompute \
  -H 'Content-Type: application/json' \
  -d '{"layers": ["weekly"], "userId": 1}'
```

The Dashboard also calls `ensure-weekly` automatically on load (with 10-minute cooldown).

### Issue: Missing TIZ data

**Cause:** Activities don't have normalised data

**Solution:**
```sql
-- Check normalised data exists
SELECT COUNT(*) FROM activity_normalised WHERE activity_id IN (
  SELECT id FROM activities WHERE user_id = 1 AND DATE(start_time) >= '2026-01-01'
);

-- If missing, run normaliser first via POST /api/analytics/recompute
-- with layers: ['normalised', 'weekly']
```

### Issue: Zero durability metrics

**Cause:** Activities too short or missing power, or `has_sufficient_duration=0` / `has_power_data=0`

**Solution:**
- Durability requires `has_sufficient_duration=1` AND `has_power_data=1`
- Check `activities_with_power` count in weekly rollup
- Review notes JSON for explanation
- Query: `SELECT has_sufficient_duration, has_power_data FROM activity_durability WHERE user_id = 1`

### Issue: Incorrect week bucketing

**Cause:** Timezone issues or date parsing

**Solution:**
```javascript
// Always use ISO dates (YYYY-MM-DD)
const weekStart = getWeekStart('2026-02-17'); // Correct
// NOT: getWeekStart(new Date()) // May have timezone issues
```

### Issue: Weekly not updating after sync

**Cause:** Provider sync path may not go through `providerSyncRunner.js`

**Solution:**
- Verify the sync path calls `recomputeWeeksForUser()` or `recomputeRecentWeeks()`
- Check server logs for `[WEEKLY] recompute weeks:` messages
- Fallback: call `POST /api/analytics/ensure-weekly` with `force: true`

---

## Summary

✅ **Database schema** - `athlete_weekly` table with comprehensive metrics
✅ **Aggregator service** - Computes stable weekly rollups
✅ **ISO week start** - Monday-based bucketing
✅ **Analytics integration** - Uses `analyticsQueryBuilder` for consistency
✅ **TIZ aggregation** - Sums zone seconds across activities
✅ **Durability averages** - With quality guards (`has_sufficient_duration`, `has_power_data`)
✅ **Stress distribution** - Counts by type (using `primary_stress_type`)
✅ **Quality tracking** - Coverage flags and scores
✅ **Idempotent upserts** - Safe recomputation
✅ **Event-driven recompute** - Auto-triggers after provider sync / enrichment
✅ **Ensure-weekly endpoint** - Safe first-run / backfill for new users
✅ **Dashboard integration** - Non-blocking ensure with 10-min cooldown
✅ **Comprehensive tests** - ~36 tests covering all scenarios

**Status:** Production-ready. Weekly rollups update automatically when data changes.

---

## Files

| File | Purpose |
|------|---------|
| `server/migrations/016_weekly_rollups.sql` | Database schema |
| `server/services/weeklyAggregator.js` | Core aggregation service |
| `server/services/weeklyRecomputeScheduler.js` | Event-driven recompute scheduler |
| `server/services/providers/providerSyncRunner.js` | Wired with weekly recompute hook |
| `server/routes/analytics.js` | `GET /weekly` + `POST /ensure-weekly` endpoints |
| `server/routes/intervals.js` | Wired with weekly recompute after enrichment |
| `src/pages/Dashboard.jsx` | `ensureWeeklyRollups()` with cooldown |
| `server/tests/weeklyAggregator.test.js` | Aggregator tests (~19 tests) |
| `server/tests/weeklyAutoRecompute.test.js` | Scheduler tests (~17 tests) |
| `WEEKLY_AGGREGATION_IMPLEMENTATION.md` | This documentation |
