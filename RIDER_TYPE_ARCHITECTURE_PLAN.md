# Rider Type Architecture Plan

**Version:** 1.0  
**Date:** January 26, 2025  
**Status:** Approved for Implementation

---

## 1. Purpose

### What Rider Type Classification Is

Rider Type Classification is a **descriptive analysis** of how a rider typically produces their best power across different effort durations and terrain contexts. It identifies which of six cycling archetypes (Sprinter, Puncheur, Climber, Time Trialist, Rouleur, All-Rounder) most closely matches the rider's observed performance patterns.

### What Rider Type Classification Is NOT

| Non-Goal | Explanation |
|----------|-------------|
| **Does not set FTP/FTHR** | Rider type is derived FROM these metrics, not the other way around |
| **Does not directly drive training plans** | AI coach consumes rider type as context, but plans are based on goals, availability, and periodization |
| **Does not predict race results** | Classification describes tendencies, not outcomes |
| **Does not replace coaching judgement** | It's informational, not prescriptive |
| **Is not a fixed trait** | Changes with training focus, racing style, and terrain exposure |

---

## 2. Current Problems (Audit)

### 2.1 Windowless Power Curve

**Location:** `src/lib/riderAnalytics.js` → `calculatePowerCurve()`

```javascript
// PROBLEM: No time filter - processes ALL activities ever
const curve = calculatePowerCurve(allActivities);
```

**Impact:** A rider who was a sprinter 6 months ago but has trained endurance for 3 months still shows as "Puncheur" because old peak efforts dominate.

### 2.2 Multiple Activity Pipelines

| Page | Data Source | Activities Fetched |
|------|-------------|-------------------|
| **Dashboard** | Fresh fetch from Strava/Intervals/Manual | Caches to `localStorage` |
| **RiderProfile** | `localStorage.cached_activities_recent` | Whatever Dashboard cached |
| **PerformanceMetrics** | Fresh fetch from Strava/Intervals/Manual | 24 weeks or YTD |
| **Form.jsx** | Fresh fetch from Strava | 90 days |
| **FTPHistory** | Fresh fetch from Strava/Intervals/Manual | 24 weeks or YTD |

**Impact:** Each page has its own data pipeline. They don't share a common activity pool, leading to inconsistent results.

### 2.3 Rider Type Computed in UI Layer

**Location:** `src/pages/RiderProfile.jsx` line 213

```javascript
// PROBLEM: Calculation happens in display component
const profile = classifyRiderType(allActivities, curve, currentFtp);
```

**Impact:** RiderProfile should display, not compute. Calculation should be in backend.

### 2.4 `riderAnalytics.js` is a Junk Drawer

**Location:** `src/lib/riderAnalytics.js`

| Function | Status |
|----------|--------|
| `calculatePowerCurve()` | Used, but no window parameter |
| `classifyRiderType()` | Used, hardcoded scoring thresholds |
| `calculateZoneDistribution()` | Duplicates backend logic |
| `generateSmartInsights()` | Fallback client-side AI |
| `calculateEfficiencyMetrics()` | Used by multiple pages |
| `calculateRaceDayForm()` | CTL/ATL/TSB - duplicates Form.jsx |

**Impact:** Dead code + duplicated logic + unclear ownership = maintenance trap.

### 2.5 Confidence Frameworks Mismatch

| Metric | Confidence Type | How Calculated |
|--------|-----------------|----------------|
| **FTP** | Data quality | Backend: coverage, recency, effort count, reason codes |
| **FTHR** | Data quality | Backend: coverage, recency, effort count, reason codes |
| **Rider Type** | Score-based | Frontend: `(maxScore / 7) * 100` |

**Impact:** FTP confidence is evidence-based ("we have good data"). Rider type confidence is model-based ("the scores are clear"). These are different things, but both show as "X% confidence".

### 2.6 Form & Fitness is an Island

**Location:** `src/pages/Form.jsx`

CTL/ATL/TSB are calculated correctly but:
- Not exported or cached
- Not consumed by Rider Type
- Not consumed by AI Coach
- Duplicated in `riderAnalytics.js`

**Impact:** Useful context is computed then ignored.

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Source of Truth)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐ │
│  │ /api/analytics/ftp  │  │ /api/analytics/fthr │  │ /api/analytics/     │ │
│  │                     │  │                     │  │ form-fitness        │ │
│  │ • FTP value         │  │ • FTHR value        │  │ • CTL/ATL/TSB       │ │
│  │ • Confidence        │  │ • Confidence        │  │ • Readiness score   │ │
│  │ • Reason codes      │  │ • Reason codes      │  │ • Fatigue context   │ │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘ │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    /api/analytics/rider-type                         │   │
│  │                                                                      │   │
│  │  • Current (42d) + Baseline (180d)                                   │   │
│  │  • Power curve by window                                             │   │
│  │  • Data evidence (quality)                                           │   │
│  │  • Model certainty (classification clarity)                          │   │
│  │  • Fatigue context integration                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SHARED CLIENT LAYER (Fetch/Cache Only)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  src/lib/athleteMetrics.js                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  fetchAthleteMetrics({ athleteId, windowDays })                      │   │
│  │  → Calls backend endpoints                                           │   │
│  │  → Caches with TTL                                                   │   │
│  │  → Returns unified metrics object                                    │   │
│  │  → NEVER computes, only requests                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PAGES (Display Only)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ RiderProfile │  │ PerformanceMetrics│  │ Form&Fitness │  │  Dashboard │  │
│  │              │  │                  │  │              │  │            │  │
│  │ • Rider type │  │ • FTP/FTHR trends│  │ • CTL/ATL/TSB│  │ • Summary  │  │
│  │ • Power curve│  │ • Efficiency     │  │ • Readiness  │  │ • Quick    │  │
│  │ • Zones      │  │ • History        │  │ • Form chart │  │   metrics  │  │
│  └──────────────┘  └──────────────────┘  └──────────────┘  └────────────┘  │
│                                                                             │
│  Pages request data with parameters, render results. NEVER compute.         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI COACH (Consumer Only)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  • Receives: FTP, FTHR, Rider Type, Form & Fitness, Evidence levels         │
│  • Down-weights low-evidence metrics automatically                          │
│  • Gates recommendations based on fatigue context                           │
│  • NEVER calculates physiological metrics                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Contract

### 4.1 Endpoint: `/api/analytics/rider-type`

#### Request (Bridge Phase)
```typescript
POST /api/analytics/rider-type
{
  activities: Activity[],      // Temporary - will be removed in Phase 3
  ftp: number,
  windowDays?: number,         // Optional, defaults to 42
  includeBaseline?: boolean    // Optional, defaults to true
}
```

#### Request (Target Phase)
```typescript
POST /api/analytics/rider-type
{
  athleteId: string,
  windowDays?: number,         // Optional, defaults to 42
  includeBaseline?: boolean    // Optional, defaults to true
}
```

#### Response
```typescript
{
  current: {
    windowDays: 42,
    type: "Puncheur",
    runnerUp: "Climber",
    scores: {
      sprinter: 2,
      puncheur: 6,
      climber: 5,
      timeTrial: 3,
      rouleur: 2,
      allRounder: 1
    },
    powerCurve: {
      5: 479,
      10: 460,
      30: 430,
      60: 412,
      300: 350,
      600: 320,
      1200: 290,
      3600: 260
    },
    dataEvidence: {
      level: "high" | "medium" | "low",
      activitiesAnalyzed: 14,
      hardEffortsCount: 3,
      powerCoveragePercent: 85,
      reasons: [
        "14 rides in last 42 days",
        "3 hard efforts at 1-5 min duration",
        "Power data present for 85% of rides"
      ],
      tooltip: "Based on 14 rides in last 42 days, including 3 hard efforts at 1–5 min."
    },
    modelCertainty: {
      level: "medium" | "high" | "low" | "mixed",
      separation: 1,           // Gap between #1 and #2 scores
      stabilityPercent: 72,    // How often #1 remains #1 across recomputations
      reasons: [
        "Close match with Climber profile",
        "Classification may shift with more data"
      ],
      tooltip: "Puncheur leads Climber by 1 point. Classification is moderately certain."
    },
    fatigueContext: {
      tsb: -12,
      note: null               // Only populated if TSB is extreme
    },
    generatedAt: "2025-01-26T20:00:00Z"
  },
  baseline: {
    windowDays: 180,
    type: "Puncheur",
    runnerUp: "Time Trial",
    scores: { ... },
    powerCurve: { ... },
    dataEvidence: { ... },
    modelCertainty: { ... },
    fatigueContext: null,      // Not applicable to baseline
    generatedAt: "2025-01-26T20:00:00Z"
  } | null                     // null if insufficient data for baseline
}
```

---

## 5. Evidence Model (Data Confidence)

### 5.1 Thresholds

| Evidence Level | Criteria |
|----------------|----------|
| **High** | ≥12 rides in window AND ≥3 revealing efforts AND power coverage ≥80% |
| **Medium** | ≥6 rides in window AND ≥1 revealing effort AND power coverage ≥50% |
| **Low** | <6 rides OR 0 revealing efforts OR power coverage <50% |

### 5.2 What Counts as a "Revealing Effort"

A revealing effort is an activity segment that provides meaningful signal for rider type classification:

| Duration Range | Minimum Intensity | What It Reveals |
|----------------|-------------------|-----------------|
| 5-30 seconds | ≥150% FTP | Sprint capacity |
| 1-5 minutes | ≥110% FTP | Puncheur/VO2max capacity |
| 5-20 minutes | ≥95% FTP | Threshold/climbing capacity |
| 20-60 minutes | ≥85% FTP | Time trial/endurance capacity |

**Counting rules:**
- Each activity can contribute at most ONE revealing effort per duration range
- The effort must be the activity's best effort for that duration
- Efforts from interval workouts count (each interval is evaluated)

### 5.3 Power Coverage Calculation

```
powerCoveragePercent = (activitiesWithPower / totalActivities) * 100
```

Where `activitiesWithPower` = activities with `avgPower > 0` and `duration >= 20 minutes`.

### 5.4 Evidence Reasons (Examples)

| Scenario | Reasons Array |
|----------|---------------|
| High evidence | `["14 rides in last 42 days", "3 hard efforts at 1-5 min duration", "Power data present for 85% of rides"]` |
| Medium evidence | `["8 rides in last 42 days", "1 hard effort at threshold duration", "Power data present for 62% of rides"]` |
| Low evidence | `["Only 4 rides in last 42 days", "No hard efforts detected", "Power data missing for most rides"]` |

---

## 6. Certainty Model (Model Confidence)

### 6.1 Separation Calculation

```
separation = scores[#1] - scores[#2]
```

Where `#1` is the highest-scoring type and `#2` is the second-highest.

### 6.2 Stability Calculation

Stability measures how consistently the top type remains #1 when recomputed with different subsets of data:

```
stabilityPercent = (weeksWhereTopTypeUnchanged / totalWeeksInWindow) * 100
```

**Simplified approach for MVP:** Compute rider type for each week in the window. Count how many weeks have the same #1 type as the overall result.

### 6.3 Certainty Thresholds

| Certainty Level | Criteria |
|-----------------|----------|
| **High** | separation ≥ 2 AND stability ≥ 75% |
| **Medium** | separation 1-2 OR stability 50-75% |
| **Low** | separation ≤ 1 AND stability < 50% |
| **Mixed** | separation ≤ 1 AND stability < 50% AND #1 and #2 are within 1 point |

### 6.4 Certainty Reasons (Examples)

| Scenario | Reasons Array |
|----------|---------------|
| High certainty | `["Clear Puncheur profile", "Consistent across 6 weeks of data"]` |
| Medium certainty | `["Puncheur leads Climber by 1 point", "Classification may shift with more data"]` |
| Low certainty | `["Profile is mixed between Puncheur and Climber", "Insufficient hard efforts to differentiate"]` |
| Mixed | `["Genuinely balanced between Puncheur and Climber", "Consider as dual-type athlete"]` |

---

## 7. Windows + Display Rules

### 7.1 Window Definitions

| Window | Days | Label | Purpose |
|--------|------|-------|---------|
| **Current** | 42 | "Training focus" | What you've been doing lately |
| **Baseline** | 180 | "Natural profile" | Your longer-term phenotype |

### 7.2 Window Selector Options

| Option | Days | When to Use |
|--------|------|-------------|
| 6 weeks | 42 | Default - recent training focus |
| 3 months | 90 | Medium-term view |
| 6 months | 180 | Baseline / natural profile |
| Season | YTD | Full season analysis |

### 7.3 Display Rules

| Rule | Implementation |
|------|----------------|
| **Always show window context** | "Based on last 42 days" in every card |
| **Always show evidence level** | "Evidence: High" with tooltip |
| **Hide baseline if insufficient** | If baseline `dataEvidence.level === 'low'`, don't show baseline section |
| **Show runner-up when close** | If `modelCertainty.level === 'mixed'`, show "Puncheur / Climber" |

### 7.4 UI Labels

| Element | Label |
|---------|-------|
| Current section header | "Current Type (42d)" |
| Current subheader | "Training focus" |
| Baseline section header | "Baseline (180d)" |
| Baseline subheader | "Natural profile" |
| Evidence badge | "Evidence: High" / "Evidence: Medium" / "Evidence: Low" |
| Certainty badge | "Clear" / "Moderate" / "Mixed" |

### 7.5 Tooltip Content

**Evidence tooltip example:**
> "Based on 14 rides in last 42 days, including 3 hard efforts at 1–5 min."

**Certainty tooltip example:**
> "Puncheur leads Climber by 1 point. Classification may shift with more data."

---

## 8. Form & Fitness Integration (Gating Rules)

### 8.1 TSB Thresholds

| TSB Range | Action |
|-----------|--------|
| TSB < -20 | Degrade evidence by one level + add fatigue note |
| TSB -20 to +25 | No modification |
| TSB > +25 | Add optional detraining note (don't degrade) |

### 8.2 Fatigue Note Content

| Condition | Note |
|-----------|------|
| TSB < -20 | "⚠️ High fatigue may affect best efforts. Evidence degraded." |
| TSB > +25 | "ℹ️ Extended rest period. Recent efforts may not reflect peak capacity." |

### 8.3 Evidence Degradation Logic

```javascript
if (tsb < -20) {
  if (dataEvidence.level === 'high') {
    dataEvidence.level = 'medium';
    dataEvidence.reasons.push('High fatigue may distort best efforts');
  } else if (dataEvidence.level === 'medium') {
    dataEvidence.level = 'low';
    dataEvidence.reasons.push('High fatigue may distort best efforts');
  }
  fatigueContext.note = '⚠️ High fatigue may affect best efforts. Evidence degraded.';
}
```

### 8.4 AI Coach Integration

The AI coach should:
1. Receive `dataEvidence.level` and `modelCertainty.level` with every rider type
2. Down-weight low-evidence metrics in recommendations
3. Not suggest "train your weakness" when evidence is low
4. Acknowledge mixed profiles: "You show characteristics of both Puncheur and Climber"

---

## 9. Migration Plan

### Phase 1: Stop the Bleeding (Week 1-2)

**Goal:** Windowed power curve + rider type from backend + evidence tooltips

| Task | Acceptance Criteria |
|------|---------------------|
| 1.1 Add `windowDays` to `calculatePowerCurve()` | Function filters activities by date before processing |
| 1.2 Create `/api/analytics/rider-type` endpoint | Returns current (42d) with dataEvidence and modelCertainty |
| 1.3 Update RiderProfile to call endpoint | No more `classifyRiderType()` in UI |
| 1.4 Add window selector to RiderProfile | 42d / 90d / 180d / Season options |
| 1.5 Display evidence + certainty badges | With explanatory tooltips |

**Done when:** RiderProfile shows windowed curve + rider type from endpoint + evidence tooltips. No frontend calculation of rider type.

**Bridge pattern:** Endpoint accepts `{ activities, ftp, windowDays }`. Activities sent from frontend.

### Phase 2: Dual Profile + Form Integration (Week 3-4)

**Goal:** Current + Baseline side by side, fatigue context

| Task | Acceptance Criteria |
|------|---------------------|
| 2.1 Add baseline (180d) to endpoint response | Returns both current and baseline |
| 2.2 Update RiderProfile UI for dual display | Side-by-side cards with proper labels |
| 2.3 Create `/api/analytics/form-fitness` endpoint | Returns CTL/ATL/TSB |
| 2.4 Integrate fatigue context into rider type | TSB < -20 degrades evidence |
| 2.5 Hide baseline when insufficient data | Graceful fallback |

**Done when:** RiderProfile shows Current (42d) + Baseline (180d) with fatigue context. Form & Fitness endpoint exists and is consumed.

### Phase 3: Proper Activity Store (Week 5-8)

**Goal:** Backend fetches activities, no more frontend data shipping

| Task | Acceptance Criteria |
|------|---------------------|
| 3.1 Create `athlete_activities` table | Schema defined, migrations run |
| 3.2 Implement activity sync on Dashboard load | Strava + Intervals + Manual → unified store |
| 3.3 Update endpoints to accept `{ athleteId, windowDays }` | Backend fetches from store |
| 3.4 Remove activity-sending from frontend | All pages use new pattern |
| 3.5 Add server-side caching with TTL | Performance optimization |

**Done when:** Endpoints accept `{ athleteId, windowDays }` only. No page ships activities to backend.

### Phase 4: Cleanup + Polish (Week 9-10)

**Goal:** Remove dead code, unify confidence display

| Task | Acceptance Criteria |
|------|---------------------|
| 4.1 Remove `classifyRiderType()` from `riderAnalytics.js` | Dead code removed |
| 4.2 Remove `calculateRaceDayForm()` from `riderAnalytics.js` | Use Form & Fitness endpoint |
| 4.3 Unify confidence display across all metrics | FTP, FTHR, Rider Type use same "Evidence: X" pattern |
| 4.4 Update AI coach to consume evidence levels | Down-weight low-evidence metrics |

**Done when:** `riderAnalytics.js` contains only display helpers. All metrics show consistent evidence badges.

---

## 10. Activity Store Design (Minimum Viable)

### 10.1 Schema

```sql
CREATE TABLE athlete_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  athlete_id TEXT NOT NULL,
  source TEXT NOT NULL,              -- 'strava', 'intervals', 'manual'
  source_id TEXT NOT NULL,           -- ID from source system
  
  -- Core fields
  name TEXT,
  sport_type TEXT,
  start_time DATETIME NOT NULL,
  duration INTEGER NOT NULL,         -- seconds
  distance REAL,                     -- meters
  elevation REAL,                    -- meters
  
  -- Power fields
  avg_power INTEGER,
  max_power INTEGER,
  normalized_power INTEGER,
  
  -- HR fields
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  
  -- Derived fields
  tss REAL,
  intensity_factor REAL,
  
  -- Metadata
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  raw_data TEXT,                     -- JSON blob for source-specific fields
  
  UNIQUE(athlete_id, source, source_id)
);

CREATE INDEX idx_athlete_activities_athlete_date 
  ON athlete_activities(athlete_id, start_time);

CREATE INDEX idx_athlete_activities_source 
  ON athlete_activities(source);
```

### 10.2 Deduplication Rules

| Rule | Implementation |
|------|----------------|
| **Primary key** | `(athlete_id, source, source_id)` |
| **Cross-source dedup** | Match by `start_time` within 5-minute window + similar duration (±10%) |
| **Preference order** | Intervals.icu > Strava > Manual (Intervals has richer data) |

### 10.3 Sync Strategy

| Trigger | Action |
|---------|--------|
| **Dashboard load** | Sync all sources for last 90 days |
| **Manual activity added** | Insert immediately |
| **Strava webhook** | Insert/update single activity (future) |
| **Intervals.icu sync** | Batch sync on user request |

### 10.4 Partial Failure Handling

| Scenario | Behavior |
|----------|----------|
| Strava fails, Intervals succeeds | Use Intervals data, log warning |
| All sources fail | Use cached data, show stale indicator |
| Partial sync | Mark activities with `sync_status` field |

### 10.5 TTL Caching

| Cache Level | TTL | Invalidation |
|-------------|-----|--------------|
| **Activity store** | Permanent (DB) | On sync |
| **Rider type result** | 1 hour | On new activity sync |
| **Form & Fitness** | 1 hour | On new activity sync |
| **Frontend cache** | 15 minutes | On page refresh |

---

## 11. Important Note: Don't Block Delivery

**The activity store migration (Phase 3) should NOT block Phase 1/2 delivery.**

The bridge pattern (sending activities from frontend) is acceptable for Phase 1/2. It's not ideal, but it:
- Unblocks the critical fixes (windowing, dual confidence, evidence tooltips)
- Lets users see improvements immediately
- Buys time to design the proper activity store

**Do not get trapped trying to "do it properly" before stopping the bleeding.**

The priority order is:
1. **Phase 1:** Fix the windowless power curve problem (immediate user impact)
2. **Phase 2:** Add dual profile + fatigue context (product improvement)
3. **Phase 3:** Proper activity store (technical debt paydown)
4. **Phase 4:** Cleanup (maintenance improvement)

---

## 12. References

### Academic Sources

- Pinot, J., & Grappe, F. (2011). The record power profile to assess performance in elite cyclists. *International Journal of Sports Medicine, 32*(11), 839–844.
- Quod, M., et al. (2010). The power profile predicts road race performance. *International Journal of Sports Medicine, 31*(6), 397–401.
- Lucia, A., et al. (2001). Physiological differences between professional and elite road cyclists. *International Journal of Sports Medicine, 22*(5), 321–326.
- Allen, H., & Coggan, A. *Training and Racing with a Power Meter*.

### Internal Documents

- `CALCULATIONS_ARCHITECTURE_UNIFICATION_SUMMARY.md` — FTP/FTHR methodology
- `src/pages/Methodology.jsx` — User-facing methodology explanations

---

## Appendix A: Scoring Thresholds (Current Implementation)

For reference, the current `classifyRiderType()` scoring logic:

| Type | Scoring Criteria |
|------|------------------|
| **Sprinter** | 5s power > 3× FTP (+3), 30s power > 2× FTP (+2), high sprint-to-threshold ratio (+2) |
| **Climber** | Elevation > 15m/km (+3), 5min power > 1.15× FTP (+2), >30% climb-heavy rides (+2) |
| **Time Trialist** | 20min power > 0.95× FTP (+3), 60min power > 0.85× FTP (+2), low variability (+2) |
| **Puncheur** | 5min power > 1.2× FTP (+3), moderate climbing (+2), strong 30s power (+1) |
| **Rouleur** | Consistent threshold power (+2), moderate elevation (+2), long average distance (+2) |
| **All-Rounder** | Balanced power across durations (+3) |

**Note:** These thresholds may be revised after Phase 1/2 delivery, once the data flow is fixed and we can properly evaluate classification accuracy.

---

## Appendix B: UI Mockup

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Rider Type Classification                                                  │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │  Current Type (42d)         │  │  Baseline (180d)            │          │
│  │  ───────────────────────    │  │  ───────────────────────    │          │
│  │                             │  │                             │          │
│  │  💥 Puncheur                │  │  💥 Puncheur                │          │
│  │  "Training focus"           │  │  "Natural profile"          │          │
│  │                             │  │                             │          │
│  │  Evidence: High ⓘ           │  │  Evidence: High ⓘ           │          │
│  │  Certainty: Moderate ⓘ      │  │  Certainty: High ⓘ          │          │
│  │                             │  │                             │          │
│  │  Runner-up: Climber         │  │  Runner-up: Time Trial      │          │
│  │                             │  │                             │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Strengths Profile                                                   │   │
│  │  ───────────────────────────────────────────────────────────────    │   │
│  │  Sprinter   ████░░░░░░░░░░░░░░░░  2/7                               │   │
│  │  Puncheur   ████████████████████  6/7                               │   │
│  │  Climber    ██████████████████░░  5/7                               │   │
│  │  Time Trial ██████████░░░░░░░░░░  3/7                               │   │
│  │  Rouleur    ████░░░░░░░░░░░░░░░░  2/7                               │   │
│  │  All-Rounder██░░░░░░░░░░░░░░░░░░  1/7                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

*Document created: January 26, 2025*  
*Last updated: January 26, 2025*
