# RiderLabs — Architecture Snapshot & Audit Report
**Generated:** 2026-02-20  
**DB:** `server/fitness-coach.db` (SQLite, better-sqlite3)

---

## 1. System Overview

### Core Data Flow

```
Provider Import (Strava / Intervals.icu / FIT upload / Manual)
        │
        ▼
  activity_sources  ←── raw provider records (one per provider per activity)
        │
        │  Canonical selection (canonicalSelector.js)
        │  Rules: intervals > fit > strava for physiology fields
        ▼
   activities  ←── single canonical row per activity (user_id, is_valid_for_analytics)
        │
        ├──── activity_streams  ←── raw time-series (watts/hr/cadence/altitude)
        ├──── activity_normalised  ←── TIZ, VI, hr_drift, sustained efforts
        ├──── activity_stress  ←── primary_stress_type, is_stochastic, sprint_spikes
        ├──── activity_durability  ←── fade_power_pct, late_threshold_score
        └──── activity_interpretation  ←── LEGACY AI narrative (91 rows, no active reader)
                │
                ▼
          athlete_weekly  ←── weekly rollup (weeklyAggregator.js)
          athlete_monthly_bests  ←── monthly power curve bests
          athlete_thresholds  ←── FTP/FTHR per user
                │
                ▼
        Limiter Engine (limiterService.js)
          limiter_race_updates  ←── per-race debrief signals
          limiter_profile_snapshots  ←── immutable history
          limiter_profile_current  ←── latest resolved profile
                │
                ▼
        Block Focus Resolver (blockFocusService.js)
          Precedence: LIMITER_ENGINE → SEASON_PLANNER → DEFAULT
                │
                ▼
        Training Quality (trainingQualityService.js)
          training_quality_week  ←── weekly alignment score + block_focus_snapshot
                │
                ▼
        Weekly Report UI (WeeklyReport.jsx)
          Training Quality Card + AI Insights + Coach Q&A
```

### Source-of-Truth Rules

| Concern | Source of Truth | Notes |
|---|---|---|
| Physiology (power, HR) | `activity_sources` → canonical `activities` | intervals > fit > strava priority |
| Race classification | `race_tags` (user-tagged) | separate from `activities.activity_type` |
| Upcoming races / season plan | `season_races` | drives Block Focus Resolver |
| FTP/FTHR | `athlete_thresholds` | also cached in `user_preferences.ftp` (duplication) |
| Limiter focus | `limiter_profile_current` | updated only via explicit race debrief |
| Training quality | `training_quality_week` | deterministic, idempotent upsert |

### Deterministic Philosophy Guardrails

- **No silent overwrites**: canonical selection is rule-based (provider priority), not probabilistic.
- **Explainability required**: `scoreAlignment()` returns `reasons[]`, `hit[]`, `missing[]`.
- **No AI in scoring**: Limiter Engine, Block Focus Resolver, Training Quality are all deterministic. AI is isolated to coach chat, smart insights, and race analysis narrative.
- **Idempotency**: all analytics writes use `INSERT … ON CONFLICT … DO UPDATE`.
- **Historical integrity**: `block_focus_snapshot` uses `weekStart` as `asOfDate` — historical weeks retain the focus correct at that point in time.
- **EXPOSURE_SENSITIVITY guard**: hard-coded in `limiterService.js` and `blockFocusService.js` — can never be primary limiter.

---

## 2. Database Audit

### Top 10 Tables by Row Count

| Rank | Table | Rows |
|---|---|---|
| 1 | `activity_sources` | 1,638 |
| 2 | `activities` | 1,314 |
| 3 | `ideas` | 34 |
| 4 | `activity_interpretation` | 91 |
| 5 | `sessions` | 14 |
| 6 | `season_races` | 13 |
| 7 | `coach_personas` | 6 |
| 8 | `users` | 6 |
| 9 | `password_resets` | 4 |
| 10 | `training_quality_week` | 2 |

---

### Full Table Inventory

| Table | Rows | Last Updated | Classification | Purpose | Written By | Read By | Notes |
|---|---|---|---|---|---|---|---|
| `activities` | 1,314 | 2026-02-18 | **CORE** | Canonical activity record after provider merge | `activityStorage.js`, `canonicalSelector.js` | Almost all services | `is_valid_for_analytics` is the analytics gate. `activity_type` ≠ `race_tags.is_race` — duplication risk. |
| `activity_sources` | 1,638 | 2026-02-18 | **CORE** | Raw provider records before merge | `activityStorage.js`, `intervalsService.js`, `stravaService.js` | `canonicalSelector.js` | `shell_strava_id`, `ignore_reason`, `summary_only`, `streams_unavailable` columns — some usage unclear. |
| `activity_streams` | 2 | 2026-02-18 | **CORE** (blocked) | Raw time-series (watts/HR/cadence) | `streamsService.js` | `weeklyAggregator.js`, normalised/stress/durability services | Only 2 rows despite 1,314 activities. Streams backfill incomplete. Root cause of all empty analytics tables. |
| `activity_stress` | 0 | — | **CORE** (empty) | Stress classification per activity | `stressClassifier.js` | `weeklyAggregator.js`, `trainingQualityService.js` | Empty — blocked on streams. Most impactful missing data for TQ scoring. |
| `activity_durability` | 0 | — | **CORE** (empty) | Fade, late threshold score, repeat efforts | `durabilityService.js` | `weeklyAggregator.js`, `trainingQualityService.js` | Empty — blocked on streams. |
| `activity_normalised` | 0 | — | **CORE** (empty) | TIZ, VI, hr_drift | `normalisedService.js` | `weeklyAggregator.js`, `trainingQualityService.js` | Empty — blocked on streams. |
| `activity_interpretation` | 91 | — | **LEGACY** | Legacy AI narrative payload per activity | Unknown — no active write path found | Not referenced in current routes/services | Predates deterministic analytics layer. No active reader. Candidate for archival. |
| `athlete_weekly` | 0 | — | **CORE** (empty) | Weekly rollup: threshold_minutes, vo2_minutes, stochastic_sessions | `weeklyAggregator.js` | `trainingQualityService.js`, `analyticsService.js` | Empty — blocked on streams. TQ falls back to activity-level queries. |
| `athlete_monthly_bests` | 0 | — | **ACTIVE** (empty) | Monthly power curve bests + estimated FTP | `weeklyAggregator.js` | `analyticsService.js` | Will fill once streams backfill runs. |
| `athlete_thresholds` | 0 | — | **ACTIVE** (empty) | Per-user FTP/FTHR with source | `analyticsRoutes.js` | `analyticsService.js` | FTP also in `user_preferences.ftp` — duplication. FTP computed dynamically on each request rather than reading this table. |
| `limiter_profile_current` | 0 | — | **CORE** (empty) | Latest limiter profile: primary + secondary limiter | `limiterService.js` | `blockFocusService.js` | Empty — no race debrief yet. Block Focus Resolver falls back to SEASON_PLANNER correctly. |
| `limiter_profile_snapshots` | 0 | — | **CORE** (empty) | Immutable history of limiter profile changes | `limiterService.js` | `limiterRoutes.js` | Will populate after first race debrief. |
| `limiter_race_updates` | 0 | — | **CORE** (empty) | Per-race debrief signals for limiter decay | `limiterService.js` | `limiterService.js` | |
| `training_quality_week` | 2 | 2026-02-20 | **CORE** | Weekly alignment scores + block_focus_snapshot | `trainingQualityService.js` | `trainingQualityRoutes.js` | New Feb 2026. `algo_version = tq_v1`. |
| `race_tags` | 3 | 2026-01-24 | **CORE** | User-applied race classification for activities | `raceTagRoutes.js` | `raceUtils.js`, Dashboard, AllActivities, Calendar, PostRaceAnalysis, RaceAnalytics | Separate from `activities.activity_type`. `is_race` here is user-authoritative. |
| `race_debrief` | 0 | — | **CORE** (empty) | Raw debrief answers per race | `limiterRoutes.js` | `limiterService.js` | |
| `race_analyses` | 0 | — | **ACTIVE** (empty) | AI-generated race analysis scores | `raceRoutes.js` | `raceRoutes.js` | AI-generated. Separate from deterministic TQ. |
| `season_races` | 13 | 2026-01-25 | **CORE** | Season race calendar: name, date, priority (A/B/C), type, elevation | `seasonRacesRoutes.js` | `blockFocusService.js`, `SeasonPlanner.jsx` | Now drives Block Focus Resolver. `priority` is anchor race selector. |
| `adaptation_events` | 0 | — | **ACTIVE** (empty) | Illness/overtraining events | `adaptationRoutes.js` | `adaptationRoutes.js`, `AITrainingCoach.jsx` | |
| `plan_adjustments` | 0 | — | **ACTIVE** (empty) | AI plan adjustment proposals | `adaptationRoutes.js` | `adaptationRoutes.js`, `PlanAdjustmentNotification.jsx` | |
| `training_plans` | 0 | — | **ACTIVE** (empty) | AI-generated training plans | `trainingRoutes.js` | `trainingRoutes.js` | Not connected to deterministic TQ layer. |
| `wellness_log` | 0 | — | **ACTIVE** (empty) | Daily subjective wellness | `analyticsRoutes.js` | `analyticsRoutes.js` | Feature exists but unused. |
| `workout_comparisons` | 0 | — | **LEGACY** | Planned vs actual workout comparison | `trainingRoutes.js` | Not found in current routes | Written but never read. Likely superseded by Training Quality. |
| `user_preferences` | 0 | — | **ACTIVE** (empty) | Per-user settings: FTP, timezone, theme, goal | `userRoutes.js` | `userRoutes.js`, `analyticsService.js` | `ftp` duplicates `athlete_thresholds`. `timezone`/`week_start_day` also in `localStorage`. |
| `provider_sync_state` | 2 | 2026-02-18 | **CORE** | Per-user per-provider sync state + streams backfill progress | `providersRoutes.js`, `activityStorage.js` | `providersRoutes.js`, `SyncProgressPanel.jsx` | `streams_backfill_is_complete = false` explains why `activity_streams` has only 2 rows. |
| `intervals_sync_state` | 0 | — | **LEGACY** | Intervals.icu-specific sync state | Not found in current code | `analyticsRoutes.js` (1 ref) | Superseded by `provider_sync_state`. |
| `sessions` | 14 | 2026-02-18 | **CORE** | Auth session tokens | `authRoutes.js` | All authenticated routes | |
| `users` | 6 | 2026-01-26 | **CORE** | User accounts + `analytics_include_strava_only` flag | `authRoutes.js`, `adminRoutes.js` | All authenticated routes | `analytics_include_strava_only` gates `getAnalyticsWhereClause()`. |
| `strava_tokens` | 2 | 2026-02-18 | **CORE** | Strava OAuth tokens | `stravaRoutes.js` | `stravaService.js` | |
| `intervals_tokens` | 1 | 2026-02-18 | **CORE** | Intervals.icu OAuth tokens | `intervalsRoutes.js` | `intervalsService.js` | |
| `google_tokens` | 1 | 2025-11-08 | **CORE** | Google OAuth tokens | `googleRoutes.js` | `googleService.js` | Last updated Nov 2025 — may be stale. |
| `feedback` | 1 | — | **ACTIVE** | User feedback submissions | `feedbackRoutes.js` | `feedbackRoutes.js` | |
| `password_resets` | 4 | 2025-11-24 | **CORE** | Password reset tokens | `authRoutes.js` | `authRoutes.js` | |
| `coach_personas` | 6 | — | **CORE** | AI coach persona definitions | `personaRoutes.cjs` | `lib/coachPersonas.js` via `/api/personas` | |
| `global_settings` | 2 | — | **CORE** | Server config key-value store | `adminRoutes.cjs` | `adminRoutes.cjs` | |
| `api_keys` | 0 | — | **CORE** | Provider API keys (loaded at startup) | `adminRoutes.cjs` | `adminRoutes.cjs` | 0 rows but loaded from DB at startup — may be in admin DB. |
| `ai_model_configs` | 0 | — | **ACTIVE** | Per-feature AI model overrides | `adminRoutes.cjs` | `adminRoutes.cjs` | |
| `admin_users` | 1 | — | **CORE** | Admin panel auth | `adminRoutes.cjs` | `adminRoutes.cjs` | |
| `ideas` | 34 | 2025-11-19 | **ACTIVE** | Internal product backlog | `ideasRoutes.cjs` | `IdeasManagement.jsx` | Admin-only. |
| `theme_configs` | 0 | — | **ACTIVE** | UI theme definitions | `themeConfigRoutes.cjs` | `ThemeSelector.jsx`, `ThemeContext.jsx` | |
| `manual_activities` | 0 | — | **ACTIVE** (empty) | Manually entered activities | `manualActivitiesRoutes.js` | `manualActivitiesRoutes.js` | |
| `migrations` | 6 | — | **CORE** | Migration tracking | `db.js` | `db.js` | |

---

## 3. API Route Audit

### Route Prefix → File Map

| Prefix | File | Classification |
|---|---|---|
| `/api/auth` | `routes/auth.js` | **USED_BY_UI** |
| `/api/strava` | `routes/strava.js` | **USED_BY_UI** |
| `/api/intervals` | `routes/intervals.js` | **USED_BY_UI** |
| `/api/google` | `routes/google.js` | **USED_BY_UI** |
| `/api/providers` | `routes/providers.js` | **USED_BY_UI** |
| `/api/analytics` | `routes/analytics.js` | **USED_BY_UI** |
| `/api/activities` | `routes/activities.js` | **USED_BY_UI** |
| `/api/race` | `routes/race.js` | **USED_BY_UI** |
| `/api/race-tags` | `routes/raceTags.js` | **USED_BY_UI** (10 refs) |
| `/api/season-races` | `routes/seasonRaces.js` | **USED_BY_UI** |
| `/api/training` | `routes/training.js` | **USED_BY_UI** |
| `/api/adaptation` | `routes/adaptation.js` | **USED_BY_UI** |
| `/api/user` | `routes/user.js` | **USED_BY_UI** |
| `/api/feedback` | `routes/feedback.js` | **USED_BY_UI** |
| `/api/manual-activities` | `routes/manualActivities.js` | **USED_BY_UI** |
| `/api/coach` | `routes/coach.js` | **USED_BY_UI** |
| `/api/limiter` | `routes/limiter.js` | **UNKNOWN** (no UI refs yet) |
| `/api/training-quality` | `routes/trainingQuality.js` | **USED_BY_UI** (`WeeklyReport.jsx`) |
| `/api/personas` | `routes/personas.cjs` | **USED_BY_UI** |
| `/api/plan-templates` | `routes/planTemplates.cjs` | **USED_BY_UI** |
| `/api/demo` | `routes/demo.js` | **USED_BY_UI** (`DemoUserCreator.jsx`) |
| `/api/retention` | `routes/retention.js` | **UNKNOWN** (no UI refs) |
| `/api/admin/*` | `routes/admin.cjs`, `themeConfigs.cjs`, `ideas.cjs` | **USED_BY_UI** (admin pages) |
| `/api/health` | `routes/health.js` | **USED_BY_UI** (`Settings.jsx`) |
| `/api/image-generation` | `routes/imageGeneration.cjs` | **USED_BY_UI** (`CoachPersonasPage.jsx`) |

### Notable Individual Routes

| Method | Path | Classification | UI References | Notes |
|---|---|---|---|---|
| POST | `/api/analytics/ftp` | **USED_BY_UI** | Dashboard, AllActivities, WeeklyReport, RiderProfile, Form, RaceDayPredictor, PlanGenerator | Called on every page load — computed dynamically, not cached |
| GET | `/api/analytics/ensure-weekly` | **USED_BY_UI** | `Dashboard.jsx` | Triggers weekly rollup on demand |
| POST | `/api/analytics/smart-insights` | **USED_BY_UI** | `WeeklyReport.jsx`, `RiderProfile.jsx` | AI — calls OpenAI |
| POST | `/api/analytics/ask-coach` | **USED_BY_UI** | `WeeklyReport.jsx` | AI — calls OpenAI |
| GET | `/api/training-quality/week` | **USED_BY_UI** | `WeeklyReport.jsx` | New Feb 2026 |
| POST | `/api/training-quality/recompute` | **USED_BY_UI** | Console only (no UI button yet) | Batch recompute |
| GET | `/api/training-quality/focus` | **UNKNOWN** | Not yet wired to UI | New Feb 2026 |
| GET | `/api/training-quality/block-focus` | **UNKNOWN** | Not yet wired to UI | Superseded by `/focus` |
| POST | `/api/limiter/race-debrief` | **UNKNOWN** | No UI form yet | Limiter Engine entry point |
| POST | `/api/limiter/update-from-race` | **UNKNOWN** | No UI form yet | Limiter Engine trigger |
| GET | `/api/limiter/profile` | **UNKNOWN** | No UI yet | |
| GET | `/api/limiter/recommendation` | **UNKNOWN** | No UI yet | |
| POST | `/api/analytics/aggregate` | **UNKNOWN** | No UI refs found | Unclear purpose |
| GET | `/api/analytics/normalised` | **UNKNOWN** | No UI refs found | |
| GET | `/api/analytics/normalised/:activityId` | **UNKNOWN** | No UI refs found | |
| GET | `/api/analytics/stress/:activityId` | **UNKNOWN** | No UI refs found | |
| GET | `/api/analytics/durability/:activityId` | **UNKNOWN** | No UI refs found | |
| POST | `/api/activities/prune` | **UNKNOWN** | No UI refs found | Dangerous — no UI guard |
| POST | `/api/activities/prune/preview` | **UNKNOWN** | No UI refs found | |
| POST | `/api/activities/reconcile-shells` | **UNKNOWN** | No UI refs found | |
| GET | `/api/retention/*` | **UNKNOWN** | No UI refs found | Internal analytics? |

---

## 4. Frontend Data Wiring Audit

### Page → API Endpoint Map

| Page / Component | API Endpoints Called |
|---|---|
| `App.jsx` | `/api/auth/me`, `/api/auth/logout`, `/api/auth/strava-tokens`, `/api/auth/google-tokens` |
| `Dashboard.jsx` | `/api/analytics/ftp`, `/api/analytics/load`, `/api/analytics/trends`, `/api/analytics/ensure-weekly`, `/api/race-tags` (×2), `/api/strava/refresh`, `/api/adaptation/adjustments/pending` |
| `WeeklyReport.jsx` | `/api/analytics/ftp`, `/api/analytics/smart-insights`, `/api/analytics/ask-coach`, **`/api/training-quality/week`** |
| `AllActivities.jsx` | `/api/analytics/ftp`, `/api/race-tags` (×2), `/api/strava/refresh` |
| `RiderProfile.jsx` | `/api/analytics/ftp`, `/api/analytics/fthr`, `/api/analytics/power-curve`, `/api/analytics/rider-type` (×2), `/api/analytics/smart-insights` |
| `PerformanceMetrics.jsx` | `/api/analytics/ftp-history`, `/api/analytics/fthr-history` |
| `FTPHistory.jsx` | `/api/analytics/ftp-history` |
| `PlanGenerator.jsx` | `/api/analytics/ftp`, `/api/analytics/fthr`, `/api/strava/refresh`, `/api/training/plan/generate`, `/api/google/calendar/events/batch`, `/api/adaptation/history` |
| `SeasonPlanner.jsx` | `/api/season-races` (×2) |
| `PostRaceAnalysis.jsx` | `/api/race-tags` (×2), `/api/race/analysis/generate` |
| `RaceAnalytics.jsx` | `/api/race-tags` |
| `RaceDayPredictor.jsx` | `/api/analytics/ftp`, `/api/race/plan` |
| `Calendar.jsx` | `/api/race-tags` |
| `Settings.jsx` | `/api/auth/me` (×2), `/api/strava/auth`, `/api/intervals/auth`, `/api/intervals/status` (×2), `/api/intervals/disconnect`, `/api/google/auth`, `/api/auth/strava-tokens`, `/api/auth/google-tokens`, `/api/health` |
| `UserProfile.jsx` | `/api/user/profile` |
| `AITrainingCoach.jsx` | `/api/adaptation/active`, `/api/adaptation/adjustments/pending`, `/api/adaptation/analyze`, `/api/adaptation/history` |
| `ActivityDetailModal.jsx` | `/api/activities/upload-fit`, `/api/coach/chat` |
| `lib/activitySync.js` | `/api/activities/import`, `/api/activities/stats`, `/api/intervals/enrich` |
| `lib/raceUtils.js` | `/api/race-tags` (×2), `/api/race-tags/bulk` |
| `contexts/ThemeContext.jsx` | `/api/admin/theme-configs/active`, `/api/admin/theme-configs/all` |

### Features With No UI Entry Point Yet

- **Limiter Engine** (`/api/limiter/*`) — no UI form for race debrief submission
- **Training Quality recompute** (`POST /api/training-quality/recompute`) — console only
- **Training Quality focus** (`GET /api/training-quality/focus`) — not wired to any page
- **Wellness log** (`/api/analytics/wellness`) — route exists, no UI
- **Activity prune/reconcile** (`/api/activities/prune`, `/reconcile-shells`) — no UI guard

---

## 5. Risk Register

### Risk 1 — Race classification is split across two systems
- **What**: `race_tags.is_race` (user-tagged) vs `activities.activity_type` (provider-supplied) vs `season_races` (planned). Three separate concepts of "race" with no explicit link.
- **Why it matters**: Limiter Engine reads `race_tags` for debrief; Block Focus Resolver reads `season_races` for planning; analytics may use `activity_type`. A race could exist in one system but not another.
- **Next step**: Audit whether `race_tags.activity_id` is ever joined to `season_races` and whether the limiter debrief flow requires a `race_tag` to exist first.

### Risk 2 — Streams backfill is the single biggest data gap
- **What**: `activity_streams` has only 2 rows. `activity_stress`, `activity_durability`, `activity_normalised`, `athlete_weekly` are all empty as a result.
- **Why it matters**: Training Quality scoring is running with 40% data coverage. Stress classification, TIZ, durability metrics — all missing. Scores are directionally correct but not fully calibrated.
- **Next step**: Check `provider_sync_state.streams_backfill_is_complete` and trigger backfill via the existing backfill mechanism.

### Risk 3 — FTP is computed dynamically on every page load
- **What**: `POST /api/analytics/ftp` is called 7+ times across different pages on every load. It recomputes FTP from scratch each time.
- **Why it matters**: Performance overhead. Also means FTP can silently change between page loads if activity data changes.
- **Next step**: Verify `athlete_thresholds` table is being written to and read from, or add a simple TTL cache.

### Risk 4 — `activity_interpretation` has 91 rows with no active reader
- **What**: Legacy AI narrative table. Written by an unknown code path (not found in current server code). No current route reads it.
- **Why it matters**: Storage waste + confusion about what it contains. The write path may be a ghost route or removed service.
- **Next step**: Search git history for the writer. If no active writer, mark for archival.

### Risk 5 — `workout_comparisons` is written but never read
- **What**: `trainingRoutes.js` writes to `workout_comparisons` but no route reads it.
- **Why it matters**: Dead write path. Data accumulates with no consumer.
- **Next step**: Confirm no external consumer (e.g. cron job). If none, mark for removal.

### Risk 6 — `intervals_sync_state` is superseded but not removed
- **What**: Empty table, superseded by `provider_sync_state`. One stale read reference in `analyticsRoutes.js`.
- **Why it matters**: Confusion about which table is authoritative for sync state.
- **Next step**: Remove the stale read reference in `analyticsRoutes.js` and mark table for deprecation.

### Risk 7 — Limiter Engine has no UI entry point
- **What**: `POST /api/limiter/race-debrief` and `POST /api/limiter/update-from-race` exist but have no UI form.
- **Why it matters**: The entire Limiter Engine → Block Focus → Training Quality chain depends on race debriefs being submitted. Without a UI, users can't trigger it.
- **Next step**: Add a race debrief form to `PostRaceAnalysis.jsx` or `RaceAnalytics.jsx`.

### Risk 8 — `POST /api/activities/prune` has no UI guard
- **What**: A destructive prune endpoint exists with no UI button (console-only). It deletes activities.
- **Why it matters**: Could be accidentally triggered or called by a misconfigured script.
- **Next step**: Add auth guard confirming admin role, or require explicit confirmation body parameter.

### Risk 9 — FTP stored in three places
- **What**: `user_preferences.ftp`, `athlete_thresholds.ftp_w`, and computed dynamically via `POST /api/analytics/ftp`. No single source of truth.
- **Why it matters**: If a user manually sets FTP in preferences, it may conflict with the dynamically computed value. Training Quality and Limiter Engine may use different FTP values.
- **Next step**: Decide which is authoritative. `athlete_thresholds` is the most structured; `user_preferences.ftp` is the most user-facing.

### Risk 10 — `google_tokens` last updated November 2025
- **What**: Google OAuth token last refreshed 2025-11-08. Google tokens typically expire after 1 hour (access) or are long-lived (refresh).
- **Why it matters**: If the refresh token has expired or been revoked, Google Calendar integration will silently fail.
- **Next step**: Test `POST /api/google/calendar/events/batch` and verify token refresh is working. Check `PlanGenerator.jsx` which calls this endpoint.

---

*End of report. No code was modified during generation.*
