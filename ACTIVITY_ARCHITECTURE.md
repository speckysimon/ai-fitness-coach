# Activity Architecture Guide

**For Senior Developers** | Last Updated: January 30, 2026

---

## Overview

RiderLabs uses a **two-table architecture** for activity management, designed to handle multiple data sources (Strava, Intervals.icu, Manual) with intelligent deduplication and data quality prioritization.

---

## Core Architecture

### Two-Table Model

```
┌─────────────────────┐         ┌──────────────────────┐
│  activity_sources   │         │     activities       │
│  (Provider Data)    │────────▶│  (Canonical/Merged)  │
└─────────────────────┘         └──────────────────────┘
   One-to-Many                      One Canonical
```

**`activity_sources`** - Raw provider records
- Stores original data from each provider
- Multiple sources can point to one canonical activity
- Fields: `id`, `activity_id` (FK), `provider`, `provider_id`, `raw_*` fields, `is_enriched`
- **Upsert strategy:** Sources are upserted by composite key `(user_id, provider, provider_id)` or by `id = "provider:provider_id"`
- Lite rows (with `activity_id = NULL`) are **upserted, not inserted repeatedly** on each sync
- Never deleted, preserves audit trail

**`activities`** - Canonical merged activities
- Single source of truth for display
- Merges best data from all sources using priority system
- Fields: `id`, `user_id`, `name`, `sport`, `type`, `start_time`, `duration_s`, `distance_m`, `avg_power`, `tss`, etc.
- Includes: `match_method`, `primary_source` for tracking
- **Field distinction:**
  - `sport` = Broad category (Ride, Run, Swim, Walk, Strength, Other)
  - `type` = Provider-specific subtype (Road, VirtualRide, Workout, Race, TrailRun, etc.)

---

## Data Flow

### 1. Import Flow

```
Provider API → Normalization → Fuzzy Matching → Storage
                                      ↓
                            ┌─────────┴─────────┐
                            │                   │
                         Duplicate          New Activity
                            │                   │
                      Update Source      Create Canonical
                            │                   │
                      Apply Best Data    Insert Source
                         Wins Merge           Record
```

**Entry Point:** `server/services/activityImportService.js`

**Key Functions:**
- `importActivity()` - Main entry point for single activity
- `bulkImport()` - Batch import with stats tracking
- `findOrCreateActivity()` - Fuzzy matching logic
- `upsertActivitySource()` - Store provider record
- `applyBestDataWins()` - Merge data from multiple sources

### 2. Normalization

**Purpose:** Convert provider-specific formats to unified schema

**Location:** `server/services/activityImportService.js::normalizeProviderActivity()`

**Provider-Specific Services:**
- `server/services/intervalsService.js::normalizeActivity()` - Intervals.icu mapping
- Strava: Direct mapping in `normalizeProviderActivity()`
- Manual: User input validation

**Field Mapping Example:**
```javascript
// Intervals.icu → Internal
icu_average_watts → avg_power
icu_training_load → tss
moving_time → duration_s
average_speed → avg_speed
```

### 3. Deduplication (Fuzzy Matching)

**Algorithm:** External ID → Exact Source → Fuzzy Time/Duration/Sport

**Match Window:**
- Time: ±5 minutes
- Duration: ±20% tolerance
- Sport: Exact match required

**Match Priority (Target State):**
1. **External ID mapping** - Intervals.icu `external_id` → Strava activity ID (cross-provider deduplication)
   - Solves: Strava activity synced to Intervals.icu appears as duplicate
   - Status: **NOT YET IMPLEMENTED** - `external_id` not captured/stored
2. **Exact source identity** - Same `(provider, provider_id)` → re-import/update existing source
3. **Manual activities** - Never fuzzy matched; only matched by exact source identity (manual `provider_id`)
   - Manual edits/re-imports are upserted by source ID, preventing duplicates
   - Manual activities will NOT match other providers by time/duration
4. **Fuzzy match** - Time/duration/sport within tolerance (non-manual providers only)
5. **No match** - Create new canonical activity

**Current Implementation:**
- Exact source identity ✅
- Manual protection ✅
- Fuzzy matching ✅
- External ID mapping ❌ (TODO)

**Required for External ID Matching:**
- Add `external_id`, `manual`, `file_type` columns to `activity_sources`
- Capture these fields in `intervalsService.normalizeActivity()`
- Update deduplication logic to check `external_id` before fuzzy matching

**Code:** `server/services/activityImportService.js::findOrCreateActivity()`

---

## Data Quality Priority

### "Best Data Wins" System

**Field-Level Priority** (not provider-level):

Different fields have different "best" sources:

| Field Category | Preferred Source | Rationale |
|----------------|------------------|-----------|
| **Power/TSS** | Intervals.icu > Strava > Manual | Better power analysis algorithms |
| **GPS/Route** | Strava > Intervals.icu > Manual | Better GPS processing, polyline encoding |
| **Elevation** | Context-dependent | Both can be inaccurate; prefer non-zero |
| **Duration** | Strava (moving_time) > Intervals.icu | Different definitions (moving vs elapsed) |
| **HR/Cadence** | Intervals.icu ≈ Strava | Usually identical (same source file) |
| **Manual fields** | Manual (protected) | User intent, never overwritten |

**Merge Logic:**
- Only overwrite if incoming data is "meaningful" (see thresholds below)
- Field-specific priority, not blanket provider priority
- Manual source fields are **never** overwritten by non-manual sources
- Implementation uses `FIELD_PREFERENCE` map (future enhancement)

**"Meaningful" Value Thresholds:**

Zero is not always meaningless. Per-metric rules:

| Metric | Meaningful If | Rationale |
|--------|---------------|-----------|
| **Duration** | `> 60s` | Sub-minute activities are noise |
| **Distance** | `> 50m` | Indoor/gym workouts may have 0 distance (valid) |
| **Elevation** | `> 0m` | Flat routes have 0 elevation (valid) |
| **Power** | `> 10W` | 0W = no power meter (treat as null) |
| **HR** | `> 40 bpm` | 0 bpm = no HR monitor (treat as null) |
| **TSS** | `> 0` | 0 TSS can be valid for recovery rides |
| **Cadence** | `> 0 rpm` | 0 rpm = no cadence sensor (treat as null) |
| **Speed** | `> 0 m/s` | 0 speed = stationary (valid for trainer) |
| **Calories** | `> 0 kcal` | 0 calories = not calculated (treat as null) |

**Current Implementation:**
- Simple provider priority: Intervals (3) > Strava (2) > Manual (1)
- Basic meaningful check: non-null, non-zero (too coarse)
- **TODO:** Implement per-metric thresholds above
- **TODO:** Migrate to field-level preference map for GPS/elevation

**Code:** `server/services/activityImportService.js::applyBestDataWins()`

---

## Intervals.icu Staged Import

### Problem: Lite vs Full Activities

Intervals.icu `/activities` endpoint returns **lite summaries** (no power/HR/TSS for many activities). Full data requires `/activity/{id}` per-activity calls.

### Solution: Two-Stage Import

**Stage A: Import Lite List**
```
1. Fetch /activities (all activities, lite data)
2. Validate with isStorableSource() - minimal check (has provider_id + start_time)
3. Store ALL as activity_sources (even lite ones)
4. Check with isCanonicalWorthy() - requires meaningful metrics
5. Lite activities (not canonical-worthy): activity_id = NULL, is_enriched = 0
6. Full activities (canonical-worthy): Create canonical + link source
```

**Stage B: Enrich Lite Activities**
```
1. Query activity_sources WHERE activity_id IS NULL
2. Fetch /activity/{id} for each (limit: 50 per sync)
3. Get full data (power, HR, TSS, zones, intervals)
4. Re-import with full metrics
5. Check isCanonicalWorthy() again with enriched data
6. If worthy: Create canonical activity + update source
7. Set is_enriched = 1, enriched_at = NOW()
```

**Validation Functions:**

1. **`isStorableSource()`** - Minimal validation for source storage
   - Has `provider_id` (required for deduplication)
   - Has `start_time` or `date` (required for sorting)
   - Purpose: Decide if we can store in `activity_sources`

2. **`isCanonicalWorthy()`** - Requires meaningful metrics for canonical creation
   - At least ONE of: Duration > 60s, Distance > 50m, TSS > 0, Power > 10W, HR > 40 bpm
   - Purpose: Decide if we create a row in `activities` table
   - Used in both Stage A (initial) and Stage B (post-enrichment)

**Current Implementation:**
- Single `isValidActivity()` function (conflates both checks)
- **TODO:** Split into `isStorableSource()` + `isCanonicalWorthy()`

**Code:**
- `src/lib/activitySync.js::syncIntervalsWithEnrichment()`
- `server/routes/intervals.js` - `/enrich` endpoint
- `server/services/intervalsService.js::getActivity()`

---

## Frontend Data Access

### Unified Database Fetch

**All pages use:** `src/lib/activitySync.js::fetchUnifiedActivities()`

**Flow:**
```
Frontend → GET /api/activities?windowDays=90
              ↓
Backend reads from activities table (canonical)
              ↓
Returns merged, deduplicated activities
              ↓
Frontend displays (no client-side merging needed)
```

**Key Pages:**
- `Dashboard.jsx` - 90 days, with sync on mount
- `AllActivities.jsx` - 365 days, with provider sync
- `PlanGenerator.jsx` - 90 days, for plan context

---

## Database Schema

### `activities` (Canonical)

```sql
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT,
  sport TEXT,
  type TEXT,
  start_time TEXT,
  timezone_offset_min INTEGER,
  
  -- Core Metrics
  duration_s REAL,
  distance_m REAL,
  elevation_m REAL,
  
  -- Power
  avg_power REAL,
  max_power REAL,
  normalized_power REAL,
  tss REAL,
  
  -- Heart Rate
  avg_hr REAL,
  max_hr REAL,
  
  -- Speed (NEW - Jan 28, 2026)
  avg_speed REAL,
  max_speed REAL,
  
  -- Energy
  calories REAL,
  
  -- Other
  avg_cadence REAL,
  has_power INTEGER DEFAULT 0,
  
  -- Metadata
  match_method TEXT,
  primary_source TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

### `activity_sources` (Provider Records)

```sql
CREATE TABLE activity_sources (
  id TEXT PRIMARY KEY,              -- Format: "provider:provider_id"
  activity_id TEXT,                 -- FK to activities.id (NULL for lite)
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,           -- 'strava', 'intervals', 'manual'
  provider_id TEXT NOT NULL,
  
  name TEXT,
  type TEXT,
  
  -- Raw metrics (prefixed with raw_)
  raw_duration_s REAL,
  raw_distance_m REAL,
  raw_elevation_m REAL,
  raw_avg_power REAL,
  raw_max_power REAL,
  raw_np REAL,
  raw_tss REAL,
  raw_avg_hr REAL,
  raw_max_hr REAL,
  raw_avg_cadence REAL,
  raw_avg_speed REAL,              -- NEW
  raw_max_speed REAL,              -- NEW
  raw_calories REAL,               -- NEW
  
  -- Enrichment tracking
  is_enriched INTEGER DEFAULT 0,
  enriched_at TEXT,
  
  -- Timestamps
  imported_at TEXT,
  updated_at TEXT,
  
  FOREIGN KEY (activity_id) REFERENCES activities(id)
);

CREATE INDEX idx_activities_user_time ON activities(user_id, start_time);
CREATE INDEX idx_activities_user_sport ON activities(user_id, sport);
CREATE INDEX idx_sources_user_provider ON activity_sources(user_id, provider, provider_id);
CREATE INDEX idx_sources_activity ON activity_sources(activity_id);
CREATE INDEX idx_sources_enrichment ON activity_sources(user_id, is_enriched) WHERE activity_id IS NULL;
```

**Index Rationale:**
- `idx_activities_user_time` - Fast user activity queries sorted by date
- `idx_activities_user_sport` - Sport-specific filtering
- `idx_sources_user_provider` - Deduplication lookups (exact source identity)
- `idx_sources_activity` - Join performance (sources → canonical)
- `idx_sources_enrichment` - Find lite activities pending enrichment

---

## API Endpoints

### Activity Import
- `POST /api/activities/import` - Bulk import from provider
  - Body: `{ activities: [], provider: 'strava'|'intervals'|'manual' }`
  - Returns: Import stats (created, updated, skipped)

### Activity Fetch
- `GET /api/activities?windowDays=90` - Fetch canonical activities
  - Returns: Merged activities from all sources

### Intervals.icu Enrichment
- `POST /api/intervals/enrich` - Enrich lite activities
  - Body: `{ activityIds: [], limit: 50 }`
  - Returns: Enriched activities + stats

### Analytics
- `POST /api/analytics/ftp` - Calculate FTP from activities
- `POST /api/analytics/load` - Calculate training load
- `POST /api/analytics/trends` - Get weekly trends

---

## Key Design Decisions

### Why Two Tables?

**Problem:** Multiple providers, overlapping data, different quality levels

**Solution:**
- `activity_sources` = Immutable audit trail
- `activities` = Mutable single source of truth
- Clean separation of concerns

### Why Fuzzy Matching?

**Problem:** Same activity from multiple sources (e.g., Strava → Intervals.icu sync)

**Solution:**
- Time + duration matching catches duplicates
- Avoids showing same ride twice
- Merges best data from both sources

### Why Staged Import for Intervals.icu?

**Problem:** 
- `/activities` endpoint is fast but returns lite data
- `/activity/{id}` is slow (1 call per activity) but returns full data
- Can't make 200+ API calls on every sync

**Solution:**
- Stage A: Import lite list immediately (fast UX)
- Stage B: Enrich 50 activities per sync (gradual backfill)
- User sees activities quickly, full data appears over time

### Why Provider Priority?

**Problem:** Conflicting data from multiple sources

**Solution:**
- Intervals.icu has better power/TSS calculations
- Strava has better GPS/social features
- Manual activities preserve user intent
- Priority system ensures best data wins

---

## System Invariants

**Critical rules that must ALWAYS hold true:**

1. **User isolation**
   - Every `activities.id` belongs to exactly one `user_id`
   - Every `activity_sources` row belongs to exactly one `user_id`
   - Cross-user data leakage is impossible by design

2. **Source-to-Canonical relationship**
   - Many sources MAY point to one canonical activity (many-to-one)
   - A source points to AT MOST one canonical activity (never many-to-many)
   - A canonical activity MUST have at least one corresponding source row
   - Orphaned canonical activities (no sources) should never exist

3. **Manual activity protection**
   - Manual source fields are NEVER overwritten by non-manual sources
   - Manual activities are NEVER fuzzy matched with other providers
   - Manual activities can only be updated by exact source identity match

4. **Lite activity lifecycle**
   - Lite sources (`activity_id = NULL`) are stable and upserted, not duplicated
   - Enrichment converts lite → full by setting `activity_id`, `is_enriched = 1`
   - Once enriched, `is_enriched` flag is permanent (never reverted to 0)

5. **Provider identity stability**
   - `provider_id` must be stable and unique within a provider
   - Source `id = "provider:provider_id"` must be globally unique
   - Re-importing same activity updates existing source, never creates duplicate

6. **Data quality monotonicity**
   - Merges only improve data quality (never degrade)
   - "Meaningful" values overwrite null/zero, but not vice versa
   - Manual data is protected from automatic overwrites

**Debugging with Invariants:**

If you see unexpected behavior, check these invariants first:
- Duplicate activities? → Check invariant #5 (provider_id stability)
- Missing data? → Check invariant #6 (merge direction)
- Manual activity changed? → Check invariant #3 (manual protection)
- Orphaned canonical? → Check invariant #2 (source requirement)

---

## Sport Inclusion Policy

**Purpose:** Control which sports/activities are used for training analytics, FTP calculation, and AI coaching recommendations.

### Inclusion Levels

**Three-tier system:**

1. **`full`** - Fully included in all analytics and coaching
   - Used for FTP/FTHR calculation
   - Included in training load calculations
   - Used for AI plan generation and recommendations
   - Displayed prominently in dashboards

2. **`context`** - Included for context only
   - NOT used for FTP/FTHR calculation
   - Included in training load (contributes to fatigue)
   - Mentioned in AI coaching context ("athlete also runs")
   - Displayed in activity lists but not in primary metrics

3. **`ignore`** - Excluded from all analytics
   - NOT used for any calculations
   - NOT mentioned in AI coaching
   - Still stored in database (audit trail)
   - Hidden from dashboards by default

### Default Sport Mapping

**Recommended defaults for cycling-focused app:**

| Sport | Default Level | Rationale |
|-------|---------------|-----------|
| **Cycling** | `full` | Primary sport for most users |
| **VirtualRide** | `full` | Indoor cycling, same training effect |
| **Running** | `context` | Cross-training, affects fatigue but not cycling FTP |
| **Swimming** | `context` | Cross-training, low impact on cycling |
| **Walking** | `ignore` | Recovery activity, minimal training effect |
| **Hiking** | `context` | Endurance cross-training |
| **Strength** | `context` | Complementary training, affects recovery |
| **Yoga** | `ignore` | Recovery/flexibility, not training load |
| **Other** | `context` | Unknown activities, include for safety |

### User Override Settings

**Implementation:**

```javascript
// User preferences schema
{
  sport_inclusion: {
    cycling: 'full',      // User can override defaults
    running: 'full',      // Triathlete might set this to 'full'
    swimming: 'context',  // Or 'full' for triathletes
    walking: 'ignore',
    // ... etc
  }
}
```

**UI Location:** Settings page → "Activity Preferences" section

**Use Cases:**
- **Triathlete:** Set Running/Swimming to `full` (multi-sport FTP calculation)
- **Cyclist who runs:** Keep Running at `context` (affects fatigue, not cycling FTP)
- **Pure cyclist:** Set all non-cycling to `ignore` (clean analytics)
- **Commuter:** Set Walking to `context` (track daily movement)

### Pipeline Integration

**Where inclusion level is checked:**

1. **FTP Calculation** (`/api/analytics/ftp`)
   - Only use `full` activities
   - Filter: `WHERE sport_inclusion = 'full'`

2. **Training Load** (`/api/analytics/load`)
   - Use `full` + `context` activities
   - Filter: `WHERE sport_inclusion IN ('full', 'context')`

3. **AI Plan Generation** (`/api/training/plan/generate`)
   - Primary training: `full` activities only
   - Context mention: `context` activities (e.g., "athlete also runs 2x/week")
   - Ignore: `ignore` activities

4. **Dashboard Metrics**
   - Primary cards: `full` activities only
   - Activity list: `full` + `context` (with visual distinction)
   - Hidden: `ignore` activities (unless "Show All" toggled)

### Database Storage

**Option 1: User Preferences Table**
```sql
CREATE TABLE user_sport_preferences (
  user_id INTEGER,
  sport TEXT,
  inclusion_level TEXT CHECK(inclusion_level IN ('full', 'context', 'ignore')),
  PRIMARY KEY (user_id, sport)
);
```

**Option 2: JSON in User Profile**
```sql
ALTER TABLE users ADD COLUMN sport_preferences TEXT; -- JSON blob
```

### Benefits

1. **Sane Coaching Outputs**
   - AI doesn't recommend cycling workouts based on running FTP
   - Training load accounts for cross-training fatigue
   - Plans are sport-specific

2. **Flexible for Different Athletes**
   - Triathletes get multi-sport analytics
   - Pure cyclists get clean cycling-only metrics
   - Casual users can track everything without polluting analytics

3. **General Pipeline**
   - Same import/storage logic for all activities
   - Filtering happens at query time
   - Easy to add new sports without code changes

### Current Implementation Status

**Status:** ❌ NOT IMPLEMENTED

**Current Behavior:**
- All activities treated equally in analytics
- No sport-level filtering in FTP/load calculations
- AI coaching doesn't distinguish sport context

**TODO:**
1. Add `sport_preferences` to user schema
2. Create default mapping in `server/services/sportService.js`
3. Add Settings UI for sport inclusion overrides
4. Update analytics endpoints to filter by inclusion level
5. Update AI prompts to use sport context appropriately

---

## Common Patterns

### Adding a New Provider

1. Create service: `server/services/newProviderService.js`
2. Add normalization in `normalizeProviderActivity()`
3. Add to provider priority constant
4. Create OAuth routes if needed
5. Update frontend sync logic

### Adding New Activity Fields

1. Add column to `activities` table
2. Add `raw_*` column to `activity_sources` table
3. Update `insertActivity()` SQL
4. Update `upsertActivitySource()` SQL
5. Update `normalizeProviderActivity()` mapping
6. Update `applyBestDataWins()` merge logic
7. Update provider service normalization

### Debugging Import Issues

1. Check server logs for import stats
2. Query `activity_sources` to see raw provider data
3. Check `match_method` in `activities` to see how it was matched
4. Verify `primary_source` shows correct priority
5. Check `is_enriched` flag for Intervals.icu activities

---

## Known Issues & TODOs

### Current Issues (Jan 30, 2026)

1. **Enrichment Failure (100% fail rate)** ✅ FIXED (Feb 9, 2026)
   - Symptom: 137 lite activities not enriching (all 404 errors)
   - Root cause: All 137 pending activities were Strava shell references (numeric IDs without `i` prefix). These are empty placeholders in Intervals.icu — `/activity/{id}` always returns 404 for them. The 58 native Intervals.icu activities (with `i` prefix) were all enriched successfully.
   - Fix: Filter out numeric IDs from enrichment queue in both `/enrich` endpoint and `importActivity()`. Only `i`-prefixed IDs are queued for enrichment.

2. **Missing Deduplication Fields**
   - `external_id` not captured (Strava ID in Intervals.icu)
   - `manual` flag not stored
   - `file_type` not stored
   - Impact: Can't detect Strava→Intervals duplicates

3. **Speed/Calories Mapping Incomplete**
   - Fields added to schema (Jan 28, 2026)
   - Not mapped in `normalizeProviderActivity()` for Intervals.icu
   - Not updated in enrichment UPDATE statement

### Planned Improvements

1. Add source identification fields (`external_id`, `manual`, `file_type`)
2. Improve deduplication to check `external_id` first
3. ~~Skip enrichment for Strava-sourced Intervals activities~~ ✅ Done (Feb 9, 2026)
4. Add rate limiting protection (100ms delay between enrichment calls)
5. Better validation for manual/zero-metric activities

---

## Testing & Verification

### Manual Testing Flow

1. Connect Strava → Sync → Check activities table
2. Connect Intervals.icu → Sync → Check for duplicates
3. Create manual activity → Verify not merged
4. Force refresh → Verify data preserved
5. Check activity detail modal → Verify all fields display

### Database Queries

```sql
-- Check import status
SELECT 
  provider,
  COUNT(*) as total,
  SUM(CASE WHEN activity_id IS NULL THEN 1 ELSE 0 END) as pending,
  SUM(CASE WHEN is_enriched = 1 THEN 1 ELSE 0 END) as enriched
FROM activity_sources
GROUP BY provider;

-- Find duplicates (same time, different sources)
SELECT 
  a.id,
  a.name,
  a.start_time,
  GROUP_CONCAT(s.provider) as sources
FROM activities a
JOIN activity_sources s ON s.activity_id = a.id
GROUP BY a.id
HAVING COUNT(s.id) > 1;

-- Check data quality priority
SELECT 
  id,
  name,
  primary_source,
  match_method,
  avg_power,
  tss
FROM activities
WHERE avg_power IS NOT NULL
ORDER BY start_time DESC
LIMIT 10;
```

---

## Performance Considerations

- **Bulk imports** use transactions for atomicity
- **Fuzzy matching** queries limited by time window (±5 min)
- **Enrichment** capped at 50 activities per sync
- **Database indexes** on `user_id`, `start_time`, `provider`
- **Frontend caching** uses `windowDays` to limit data transfer

---

## References

- Main import service: `server/services/activityImportService.js`
- Intervals.icu service: `server/services/intervalsService.js`
- Frontend sync: `src/lib/activitySync.js`
- Database schema: `server/fitness-coach.db`
- API routes: `server/routes/activities.js`, `server/routes/intervals.js`
