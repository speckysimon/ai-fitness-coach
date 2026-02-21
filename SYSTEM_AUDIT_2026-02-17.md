# RiderLabs — FULL SYSTEM AUDIT
**Date:** 2026-02-17  
**Auditor:** Cascade  
**Scope:** Post-analytics-expansion alignment check

---

## PHASE 1 — DATABASE SCHEMA VERIFICATION

### 1.1 All Tables in fitness-coach.db (40 tables)

```
activities                  activity_archive_index      activity_durability
activity_interpretation     activity_sources            activity_streams
activity_stress             activities_normalized (LEGACY)
adaptation_events           admin_activity_log          admin_users
ai_model_configs            api_keys                    athlete_monthly_bests
athlete_monthly_summary     athlete_thresholds          athlete_weekly
coach_personas              feedback                    global_settings
google_tokens               ideas                       intervals_sync_state
intervals_tokens            manual_activities           migrations
password_resets             plan_adjustments            race_analyses
race_tags                   season_races                sessions
sqlite_sequence             strava_tokens               theme_configs
training_plans              user_preferences            users
wellness_log                workout_comparisons
```

### 1.2 Required Tables — Status

| Table | Exists | Schema Correct |
|---|---|---|
| activities | ✅ | ⚠️ See 1.3 |
| activity_sources | ✅ | ✅ |
| activity_streams | ✅ | ✅ |
| activity_normalised | ✅ | ✅ |
| activity_durability | ✅ | ✅ |
| activity_stress | ✅ | ❌ **DRIFT** |
| athlete_weekly | ✅ | ✅ |
| users | ✅ | ✅ |
| strava_tokens | ✅ | ✅ |
| intervals_tokens | ✅ | ✅ |

### 1.3 activities Table — Columns Added During Audit

The following columns were **missing** and were applied during this audit session:

| Column | Migration | Status |
|---|---|---|
| `canonical_source` | 009 | ✅ Applied |
| `is_valid_for_analytics` | 009 | ✅ Applied |
| `physiology_source` | 010 | ✅ Applied |
| `metadata_source` | 010 | ✅ Applied |
| `analytics_include_strava_only` (on users) | 011 | ✅ Applied |

**Root cause:** Only migration 001 was ever tracked in the `migrations` table. Migrations 003–017 were never recorded as applied. Some were manually run (e.g. 014–017 in the previous session), but the critical ones (009, 010, 011, 012) that add columns to `activities` and create `activity_normalised` were **never applied**.

### 1.4 ⚠️ CRITICAL: activity_stress Schema Drift

**Expected schema** (per user spec — full classifier):
```sql
primary_stress_type TEXT
is_stochastic INTEGER
sustained_threshold_blocks INTEGER
vo2_blocks INTEGER
sprint_spikes INTEGER
recovery_score REAL
evidence TEXT
algo_version TEXT
```

**Actual schema** (created by simplified 014_activity_stress.sql):
```sql
stress_type TEXT        -- ❌ Should be primary_stress_type
confidence REAL         -- Not in spec
evidence TEXT           -- ✅
computed_at TEXT         -- ✅
                        -- ❌ MISSING: is_stochastic
                        -- ❌ MISSING: sustained_threshold_blocks
                        -- ❌ MISSING: vo2_blocks
                        -- ❌ MISSING: sprint_spikes
                        -- ❌ MISSING: recovery_score
                        -- ❌ MISSING: algo_version
```

**Impact:** The `weeklyAggregator.js` queries `s.is_stochastic` and `s.sprint_spikes` from `activity_stress` — these columns don't exist. SQLite returns NULL silently for missing columns in LEFT JOINs, so this won't crash but produces **incorrect data**: `stochastic_sessions` and `sprint_spikes` in `athlete_weekly` will always be 0.

### 1.5 ⚠️ CRITICAL: weeklyAggregator Column Name Mismatches

The `computeWeeklyRollup()` query in `weeklyAggregator.js` references:

| Query Alias | Actual DB Column | Match? |
|---|---|---|
| `d.power_fade` | `fade_power_pct` | ❌ |
| `d.efficiency_drop` | `efficiency_drop_pct` | ❌ |
| `s.is_stochastic` | *(does not exist)* | ❌ |
| `s.sprint_spikes` | *(does not exist)* | ❌ |
| `s.stress_type` | `stress_type` | ✅ |
| `n.tiz_power` | `time_in_zones_power` | ❌ |
| `n.tiz_hr` | `time_in_zones_hr` | ❌ |

**Impact:** Weekly rollups will have NULL for power fade, efficiency drop, time-in-zones, stochastic sessions, and sprint spikes. All downstream (trends, insights) will be degraded.

### 1.6 Legacy Table: activities_normalized

`activities_normalized` is a **legacy table** from an earlier schema design. It is NOT the same as `activity_normalised` (the analytics layer). No code references it. **Safe to drop.**

### 1.7 Duplicate/Shadow Migrations

| File | Status |
|---|---|
| `014_activity_stress.sql` | ⚠️ Simplified schema — does NOT match spec |
| No `014_activity_stress_classification.sql` found | The "original" migration referenced in the user's prompt does not exist on disk |

---

## PHASE 2 — SOURCE OF TRUTH ENFORCEMENT

### 2.1 activity_streams Writes

✅ **Single write point:** `canonicalStreamService.js:182` — `INSERT INTO activity_streams`

No other file writes to `activity_streams`.

### 2.2 upsertCanonicalStreams() Guards

✅ **PHYSIOLOGY_SOURCE_MISMATCH rejection** — enforced at line 55  
✅ **Provider mapping** — `mapProviderToPhysiologySource()` at line 25  
⚠️ **Missing time_s rejection** — not explicitly checked (should validate `providerStreams.time_s` exists)

### 2.3 Direct Writes to activities

| File | Type | Legitimate? |
|---|---|---|
| `activityImportService.js:192` | INSERT | ✅ (orchestrator) |
| `activityImportService.js:604` | UPDATE | ✅ (orchestrator) |
| `activityUpdateService.js:232` | UPDATE | ✅ (update service) |
| `activityUpdateService.js:360` | UPDATE | ✅ (update service) |
| `activityUpdateService.js:397` | INSERT | ✅ (update service) |
| `activityIntegrityGuard.js:339,356,373` | UPDATE | ✅ (integrity guard) |

No rogue writes found. ✅

### 2.4 Orchestrator as Single Entry Point

✅ `activityImportService.js` contains `importActivityBatch()` and `importActivity()`.  
✅ No provider service imports `db.js` directly for activity writes.

---

## PHASE 3 — LAYER DEPENDENCY AUDIT

### 3.1 Expected Dependency Chain

```
Streams → Normalised → Durability → Stress → Weekly → Trends → Insights
```

### 3.2 Actual Dependencies

| Layer | Data Source | Correct? |
|---|---|---|
| **Normaliser** | `getCanonicalStreams()` (local function querying `activity_streams`) | ✅ |
| **Durability** | `getCanonicalStreams()` (local function querying `activity_streams`) | ✅ |
| **Stress** | `activity_normalised` + `activity_durability` | ✅ |
| **Weekly** | `activity_normalised` + `activity_durability` + `activity_stress` + `activity_streams` | ✅ (but column names wrong — see 1.5) |
| **Trends** | `getWeeklyRollups()` from `weeklyAggregator.js` (athlete_weekly only) | ✅ |
| **Insights** | `computeTrendSummary()` + `getWeeklyRollups()` (NO direct activity queries) | ✅ |

### 3.3 Circular Dependencies

✅ None found.

### 3.4 Layer Skipping

✅ No layer skipping. Recompute endpoint enforces deterministic order: `normalised → durability → stress → weekly → trends → insights`.

---

## PHASE 4 — API CONTRACT CHECK

### 4.1 Analytics Routes

| Method | Path | Exists | Response Shape |
|---|---|---|---|
| GET | `/weekly` | ✅ | `{ ok, data, meta, warnings }` ✅ |
| GET | `/trends` | ✅ | `{ ok, data, meta, warnings }` ✅ |
| GET | `/insights` | ✅ | `{ ok, data, meta, warnings }` ✅ |
| GET | `/normalised` | ✅ | Custom shape |
| GET | `/durability/:activityId` | ✅ | Custom shape |
| GET | `/stress/:activityId` | ✅ | Custom shape |
| POST | `/recompute` | ✅ | `{ ok, data, meta, warnings }` ✅ |

### 4.2 JSON Field Parsing

✅ `GET /weekly` parses `tiz_power`, `tiz_hr`, `stress_dist`, `notes` from TEXT to JSON before returning.

### 4.3 GET Endpoints Triggering Computation

⚠️ `GET /trends` calls `computeTrendSummary()` — this is a **live computation** on every request. It reads from `athlete_weekly` and computes in-memory, so it's lightweight, but it IS computation on GET.

⚠️ `GET /insights` calls `generateInsights()` — same pattern, live computation on GET.

These are acceptable since they're pure in-memory calculations from stored weekly data, not DB writes.

### 4.4 Startup Computation

✅ No heavy computation runs on app startup. Verified `server/index.js` has no references to any analytics runner.

### 4.5 Recompute Endpoint

✅ Respects deterministic layer order  
✅ Does not bypass integrity verification  
⚠️ Does NOT check `analytics_include_strava_only` directly — but this is handled by `getAnalyticsWhereClause()` which all runners use via `getAnalyticsActivities()`.

---

## PHASE 5 — DATA INTEGRITY CHECK

### 5.1 Verification Queries

| Query | Result | Expected | Status |
|---|---|---|---|
| Valid activities without physiology_source | **0** | 0 | ✅ |
| Streams stored for wrong source | **0** | 0 | ✅ |
| Normalised coverage | **0** | >0 | ⚠️ Empty (never computed) |
| Durability coverage | **0** | >0 | ⚠️ Empty (never computed) |
| Stress coverage | **0** | >0 | ⚠️ Empty (never computed) |
| Weekly rollups | **0** | >0 | ⚠️ Empty (never computed) |
| Total activities | **188** | — | ✅ |
| Valid for analytics | **157** | — | ✅ |
| Shell activities marked valid | **0** | 0 | ✅ |
| Streams count | **0** | >0 | ⚠️ Empty (never ingested) |

### 5.2 Physiology Source Distribution

| Source | Count |
|---|---|
| `intervals` | 157 |
| `NULL` | 31 (shells) |

### 5.3 Assessment

The analytics pipeline tables exist but are **completely empty**. No streams have been ingested, no normalisation/durability/stress has been computed, no weekly rollups exist. The pipeline is structurally sound but has never been executed.

---

## PHASE 6 — DEAD CODE + DRIFT CHECK

### 6.1 Old `canonical_source` References

| File | Line | Status |
|---|---|---|
| `shellEnrichmentService.js:119` | `existing.canonical_source` | ⚠️ Uses old column (still exists, but superseded by `physiology_source`) |
| `activityDisplayClassAdapter.js:30` | Fallback chain: `physiology_source \|\| primary_source \|\| canonical_source` | ✅ Safe fallback |
| `activityShellResolver.js:156` | `existing.canonical_source` | ⚠️ Uses old column |

### 6.2 Legacy `activities_normalized` Table

- Table exists with 0 rows
- No code references it
- **Safe to drop**

### 6.3 Unused Services

No completely unused services found. All imported services in `analytics.js` are used.

### 6.4 Migration Tracking

Only migration `001_password_resets.sql` is recorded in the `migrations` table. All other migrations (003–017) were applied ad-hoc without tracking. **This is a governance risk.**

---

## FINAL REPORT

---

### 1. Schema Alignment Report

| Item | Status |
|---|---|
| `activities` table columns | ✅ Fixed during audit (009, 010, 011 applied) |
| `activity_normalised` table | ✅ Fixed during audit (012 applied) |
| `activity_durability` table | ✅ Correct |
| `activity_streams` table | ✅ Correct |
| `athlete_weekly` table | ✅ Correct |
| **`activity_stress` table** | **❌ SCHEMA DRIFT — simplified schema missing 6 columns** |
| `activities_normalized` (legacy) | ⚠️ Dead table — drop it |

### 2. Architecture Alignment Report

| Item | Status |
|---|---|
| Layer dependency order | ✅ Correct and deterministic |
| No circular dependencies | ✅ |
| Single write point for streams | ✅ |
| Orchestrator as sole ingestion entry | ✅ |
| No startup computation | ✅ |
| **weeklyAggregator column names** | **❌ 4 column name mismatches in JOIN query** |
| **stressRunner.js** | **❌ Simplified — does not produce is_stochastic, sprint_spikes, etc.** |

### 3. Integrity Report

| Item | Status |
|---|---|
| No invalid source assignments | ✅ |
| No shell activities marked valid | ✅ |
| No streams for wrong source | ✅ |
| Analytics pipeline tables empty | ⚠️ Expected (never run), not corruption |
| **Weekly rollups will produce incorrect data** | **❌ Due to column name mismatches** |

### 4. Cleanup Recommendations

#### ❌ MUST FIX (Blocking)

1. **Fix `activity_stress` schema** — Either:
   - **(Preferred)** Drop and recreate with full classifier schema: `primary_stress_type`, `is_stochastic`, `sustained_threshold_blocks`, `vo2_blocks`, `sprint_spikes`, `recovery_score`, `evidence`, `algo_version`
   - Update `stressRunner.js` to populate all required columns
   - Update `weeklyAggregator.js` to read correct column names

2. **Fix `weeklyAggregator.js` column name mismatches:**
   - `d.power_fade` → `d.fade_power_pct`
   - `d.efficiency_drop` → `d.efficiency_drop_pct`
   - `n.tiz_power` → `n.time_in_zones_power`
   - `n.tiz_hr` → `n.time_in_zones_hr`
   - `s.is_stochastic` → depends on stress schema fix
   - `s.sprint_spikes` → depends on stress schema fix

3. **Fix `stressRunner.js`** — Rewrite to produce full classifier output matching the intended schema.

#### ⚠️ SHOULD FIX (Governance)

4. **Record all applied migrations** in the `migrations` table to prevent future drift.

5. **Drop `activities_normalized`** (legacy table, 0 rows, no code references).

6. **Update `shellEnrichmentService.js` and `activityShellResolver.js`** to use `physiology_source` instead of `canonical_source`.

7. **Add `time_s` validation** in `upsertCanonicalStreams()` — reject streams without time array.

#### 💡 NICE TO HAVE

8. **Add `algo_version` to `activity_stress`** for future migration safety.

9. **Consider caching** for `GET /trends` and `GET /insights` since they compute on every request.

10. **Add admin-only guard** to `POST /recompute` (currently has a TODO comment).

---

### Summary

The system is **structurally sound** but has **two critical drift issues**:

1. The `activity_stress` table has a simplified schema that doesn't match what `weeklyAggregator.js` expects.
2. The `weeklyAggregator.js` JOIN query uses wrong column names for `activity_normalised` and `activity_durability`.

These must be fixed before running the analytics pipeline, or weekly rollups (and everything downstream — trends, insights) will produce incorrect/empty data.

All other layers (streams, normalisation, durability, trend engine, coaching insights) are correctly wired and architecturally clean.
