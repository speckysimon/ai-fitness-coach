/**
 * Training Quality Service v1 — Block Focus Alignment Score
 *
 * Answers: Did this week's training align to the current block focus?
 * Deterministic only. No AI. Explainable reasons[] required.
 *
 * Algorithm version: tq_v1
 */

import db from '../db.js';
import { getWeekStart, computeWeeklyRollup } from './weeklyAggregator.js';
import { getAnalyticsWhereClause } from './analyticsQueryBuilder.js';
import { getResolvedBlockFocus } from './blockFocusService.js';

const ALGO_VERSION = 'tq_v1';

// ─── Thresholds ───────────────────────────────────────────────────────────────

const LONG_RIDE_MIN_MINUTES = 90;          // >= 90 min counts as "long ride"
const THRESHOLD_MIN_MINUTES = 15;          // >= 15 min Z4 = meaningful threshold work
const VO2_MIN_MINUTES       = 8;           // >= 8 min Z5 = meaningful VO2 work
const BACK_TO_BACK_WARN     = 1;           // warn if > 1 back-to-back intensity pair
const MAX_INTENSITY_DAYS    = 3;           // warn if > 3 intensity days in week

// Intensity stress types (threshold/vo2/race = high intensity)
const HIGH_INTENSITY_TYPES = new Set(['threshold', 'intervals', 'race', 'mixed']);
const AEROBIC_TYPES        = new Set(['endurance', 'tempo', 'steady']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * Parse iso_week string "YYYY-WW" into the Monday date string "YYYY-MM-DD".
 * Falls back to treating input as a Monday date directly.
 */
export function isoWeekToMonday(isoWeek) {
  if (!isoWeek) return null;

  // Already a date string
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoWeek)) return isoWeek;

  // YYYY-WW format
  const m = isoWeek.match(/^(\d{4})-W?(\d{1,2})$/);
  if (!m) return null;

  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);

  // ISO week 1 is the week containing the first Thursday of the year.
  // Jan 4 is always in week 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  const targetMs = week1Monday.getTime() + (week - 1) * 7 * 86400000;
  const d = new Date(targetMs);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

/**
 * Convert a Monday date string to YYYY-WNN display string.
 */
function mondayToIsoWeek(weekStart) {
  if (!weekStart) return null;
  const d = new Date(weekStart + 'T00:00:00Z');
  // ISO week number
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4.getTime() - (jan4Day - 1) * 86400000);
  const weekNum = Math.round((d.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1;
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ─── getCurrentBlockFocus ─────────────────────────────────────────────────────

/**
 * Get the current block focus from limiter_profile_current.
 * Returns { primary_limiter, secondary_limiter, as_of_date } or null.
 */
export function getCurrentBlockFocus(athleteId) {
  const row = db.prepare(`SELECT profile_json FROM limiter_profile_current WHERE athlete_id = ?`).get(athleteId);
  if (!row) return null;
  try {
    const p = JSON.parse(row.profile_json);
    return {
      primary_limiter:   p.primary_limiter   || null,
      secondary_limiter: p.secondary_limiter || null,
      as_of_date:        p.as_of_date        || null,
    };
  } catch { return null; }
}

// ─── computeWeeklyStimulusSummary ─────────────────────────────────────────────

/**
 * Compute per-activity stimulus summary for a week.
 * Reads directly from activity-level tables (stress, durability, normalised).
 *
 * Returns {
 *   activities: [...],        // per-activity detail
 *   intensity_days,           // count of high-intensity days
 *   stochastic_days,          // count of stochastic sessions
 *   vo2_minutes,              // total Z5 minutes (from weekly rollup)
 *   threshold_minutes,        // total Z4 minutes
 *   long_ride_present,        // bool: any ride >= LONG_RIDE_MIN_MINUTES
 *   long_ride_minutes,        // max single ride duration in minutes
 *   late_ride_work_present,   // bool: any session with late_threshold_score
 *   sprint_spikes_total,      // total sprint spikes
 *   repeat_hard_efforts_total,
 *   avg_power_fade,
 *   best_late_threshold_score,
 *   intensity_day_indices,    // sorted array of day-of-week (0=Mon) with intensity
 *   missing_data_notes,       // string[]
 *   data_quality,             // 0-1
 * }
 */
export function computeWeeklyStimulusSummary(athleteId, weekStart) {
  const weekEndMs = new Date(weekStart + 'T00:00:00Z').getTime() + 7 * 86400000;
  const we = new Date(weekEndMs);
  const weekEnd = `${we.getUTCFullYear()}-${String(we.getUTCMonth() + 1).padStart(2, '0')}-${String(we.getUTCDate()).padStart(2, '0')}`;

  const { whereClause, params } = getAnalyticsWhereClause(athleteId);

  // Qualify ambiguous columns with table alias 'a.' for JOIN safety
  const qualifiedWhere = whereClause
    .replace(/\buser_id\b/g, 'a.user_id')
    .replace(/\bis_valid_for_analytics\b/g, 'a.is_valid_for_analytics')
    .replace(/\bphysiology_source\b/g, 'a.physiology_source');

  const rows = db.prepare(`
    SELECT
      a.id,
      a.start_time,
      a.duration_s,
      a.has_power,
      a.avg_hr,
      s.primary_stress_type  AS stress_type,
      s.is_stochastic,
      s.sprint_spikes,
      s.sustained_threshold_blocks,
      s.vo2_blocks,
      d.fade_power_pct       AS power_fade,
      d.late_threshold_score,
      d.efficiency_drop_pct  AS efficiency_drop,
      d.repeat_hard_efforts,
      d.has_sufficient_duration,
      n.vi,
      n.hr_drift_pct,
      n.time_in_zones_power  AS tiz_power,
      n.time_in_zones_hr     AS tiz_hr
    FROM activities a
    LEFT JOIN activity_stress     s ON a.id = s.activity_id
    LEFT JOIN activity_durability d ON a.id = d.activity_id
    LEFT JOIN activity_normalised n ON a.id = n.activity_id
    WHERE ${qualifiedWhere}
      AND DATE(a.start_time) >= ?
      AND DATE(a.start_time) < ?
    ORDER BY a.start_time ASC
  `).all(...params, weekStart, weekEnd);

  const missing_data_notes = [];
  const activities = [];
  const intensityDayIndices = [];
  let intensityDays = 0;
  let stochasticDays = 0;
  let sprintSpikesTotal = 0;
  let repeatHardEffortsTotal = 0;
  let longRidePresent = false;
  let longRideMinutes = 0;
  let lateRideWorkPresent = false;
  let powerFadeValues = [];
  let lateThresholdScores = [];
  let activitiesWithStress = 0;
  let activitiesWithPower = 0;

  for (const row of rows) {
    const durationMin = (row.duration_s || 0) / 60;
    const startDate = new Date(row.start_time);
    const dayOfWeek = ((startDate.getUTCDay() + 6) % 7); // 0=Mon..6=Sun

    const isHighIntensity = HIGH_INTENSITY_TYPES.has(row.stress_type);
    const isStochastic = row.is_stochastic === 1;
    const isLong = durationMin >= LONG_RIDE_MIN_MINUTES;

    if (isHighIntensity) {
      intensityDays++;
      intensityDayIndices.push(dayOfWeek);
    }
    if (isStochastic) stochasticDays++;
    if (row.sprint_spikes) sprintSpikesTotal += row.sprint_spikes;
    if (row.repeat_hard_efforts) repeatHardEffortsTotal += row.repeat_hard_efforts;
    if (isLong) {
      longRidePresent = true;
      longRideMinutes = Math.max(longRideMinutes, durationMin);
    }
    if (row.late_threshold_score != null && row.late_threshold_score > 0) {
      lateRideWorkPresent = true;
      lateThresholdScores.push(row.late_threshold_score);
    }
    if (row.power_fade != null) powerFadeValues.push(row.power_fade);
    if (row.stress_type) activitiesWithStress++;
    if (row.has_power) activitiesWithPower++;

    activities.push({
      id: row.id,
      start_time: row.start_time,
      duration_min: Math.round(durationMin),
      day_of_week: dayOfWeek,
      stress_type: row.stress_type || null,
      is_stochastic: isStochastic,
      is_high_intensity: isHighIntensity,
      is_long: isLong,
      sprint_spikes: row.sprint_spikes || 0,
      vo2_blocks: row.vo2_blocks || 0,
      threshold_blocks: row.sustained_threshold_blocks || 0,
      late_threshold_score: row.late_threshold_score || null,
      power_fade: row.power_fade || null,
      vi: row.vi || null,
    });
  }

  // Pull threshold/vo2 minutes from weekly rollup (already aggregated from TIZ)
  const weekRollup = db.prepare(`
    SELECT threshold_minutes, vo2_minutes, stochastic_sessions, sprint_spikes
    FROM athlete_weekly WHERE user_id = ? AND week_start = ?
  `).get(athleteId, weekStart);

  const thresholdMinutes = weekRollup?.threshold_minutes ?? null;
  const vo2Minutes       = weekRollup?.vo2_minutes       ?? null;

  // Data quality
  const totalActivities = rows.length;
  const stressCoverage  = totalActivities > 0 ? activitiesWithStress / totalActivities : 0;
  const powerCoverage   = totalActivities > 0 ? activitiesWithPower  / totalActivities : 0;
  const dataQuality     = (stressCoverage * 0.6 + powerCoverage * 0.4);

  if (stressCoverage < 0.5) missing_data_notes.push('stress_classification_incomplete');
  if (powerCoverage  < 0.5) missing_data_notes.push('power_data_sparse');
  if (thresholdMinutes == null) missing_data_notes.push('no_tiz_data_run_weekly_rollup');
  if (totalActivities === 0) missing_data_notes.push('no_activities_this_week');

  // Back-to-back intensity detection
  const sortedIntensityDays = [...intensityDayIndices].sort((a, b) => a - b);
  let backToBackCount = 0;
  for (let i = 1; i < sortedIntensityDays.length; i++) {
    if (sortedIntensityDays[i] - sortedIntensityDays[i - 1] === 1) backToBackCount++;
  }

  return {
    week_start:                weekStart,
    activities,
    total_activities:          totalActivities,
    intensity_days:            intensityDays,
    stochastic_days:           stochasticDays,
    vo2_minutes:               vo2Minutes,
    threshold_minutes:         thresholdMinutes,
    long_ride_present:         longRidePresent,
    long_ride_minutes:         Math.round(longRideMinutes),
    late_ride_work_present:    lateRideWorkPresent,
    sprint_spikes_total:       sprintSpikesTotal,
    repeat_hard_efforts_total: repeatHardEffortsTotal,
    avg_power_fade:            powerFadeValues.length > 0 ? powerFadeValues.reduce((a, b) => a + b, 0) / powerFadeValues.length : null,
    best_late_threshold_score: lateThresholdScores.length > 0 ? Math.max(...lateThresholdScores) : null,
    intensity_day_indices:     sortedIntensityDays,
    back_to_back_intensity:    backToBackCount,
    missing_data_notes,
    data_quality:              Math.round(dataQuality * 100) / 100,
  };
}

// ─── Focus requirements ───────────────────────────────────────────────────────

/**
 * Hard-coded focus requirements per limiter (v1).
 * Each requirement: { id, description, weight, check(summary) -> bool }
 */
const FOCUS_REQUIREMENTS = {
  ACCELERATION_REPEATABILITY: [
    {
      id:          'stochastic_or_surge_session',
      description: 'At least 1 stochastic/surge-dense session',
      weight:      35,
      check: s => s.stochastic_days >= 1 || s.sprint_spikes_total >= 5 || s.repeat_hard_efforts_total >= 3,
    },
    {
      id:          'high_intensity_session',
      description: 'At least 1 high-intensity session (threshold/VO2/race)',
      weight:      30,
      check: s => s.intensity_days >= 1,
    },
    {
      id:          'intensity_not_all_same_day',
      description: 'Intensity spread across multiple sessions (not monotony)',
      weight:      20,
      check: s => s.intensity_days >= 2 || s.stochastic_days >= 1,
    },
    {
      id:          'aerobic_support',
      description: 'At least 1 aerobic support day (endurance/tempo)',
      weight:      15,
      check: s => s.total_activities - s.intensity_days >= 1,
    },
  ],

  THRESHOLD_UNDER_STRESS: [
    {
      id:          'threshold_work_present',
      description: `At least ${THRESHOLD_MIN_MINUTES} min of threshold (Z4) work`,
      weight:      35,
      check: s => s.threshold_minutes != null ? s.threshold_minutes >= THRESHOLD_MIN_MINUTES : s.intensity_days >= 1,
    },
    {
      id:          'threshold_under_mixed_conditions',
      description: 'Threshold session with stochastic/mixed lead-in',
      weight:      25,
      check: s => (s.intensity_days >= 1 && s.stochastic_days >= 1) || s.intensity_days >= 2,
    },
    {
      id:          'aerobic_support_day',
      description: 'At least 1 aerobic support day',
      weight:      20,
      check: s => s.total_activities - s.intensity_days >= 1,
    },
    {
      id:          'long_ride_present',
      description: `Long ride present (>= ${LONG_RIDE_MIN_MINUTES} min)`,
      weight:      20,
      check: s => s.long_ride_present,
    },
  ],

  LATE_RACE_RESILIENCE: [
    {
      id:          'long_ride_present',
      description: `Long ride present (>= ${LONG_RIDE_MIN_MINUTES} min)`,
      weight:      40,
      check: s => s.long_ride_present,
    },
    {
      id:          'late_ride_intensity',
      description: 'Session with intensity in final third (late-race work)',
      weight:      35,
      check: s => s.late_ride_work_present || (s.long_ride_present && s.intensity_days >= 1),
    },
    {
      id:          'recovery_spacing',
      description: 'No more than 1 back-to-back intensity pair',
      weight:      25,
      check: s => s.back_to_back_intensity <= BACK_TO_BACK_WARN,
    },
  ],

  VO2_CAPACITY_CEILING: [
    {
      id:          'vo2_session_present',
      description: 'At least 1 VO2max session',
      weight:      40,
      check: s => {
        if (s.vo2_minutes != null) return s.vo2_minutes >= VO2_MIN_MINUTES;
        // Fallback: any activity with vo2_blocks > 0
        return s.activities.some(a => a.vo2_blocks > 0);
      },
    },
    {
      id:          'vo2_minutes_sufficient',
      description: `Total VO2 minutes >= ${VO2_MIN_MINUTES} min`,
      weight:      35,
      check: s => s.vo2_minutes != null ? s.vo2_minutes >= VO2_MIN_MINUTES : s.activities.some(a => a.vo2_blocks >= 2),
    },
    {
      id:          'vo2_spacing',
      description: 'No back-to-back VO2/threshold days',
      weight:      25,
      check: s => s.back_to_back_intensity <= BACK_TO_BACK_WARN,
    },
  ],

  // EXPOSURE_SENSITIVITY: no alignment requirements in v1 (tactical notes only)
  EXPOSURE_SENSITIVITY: [],
};

// ─── scoreAlignment ───────────────────────────────────────────────────────────

/**
 * scoreAlignment(blockFocus, stimulusSummary)
 *
 * Returns {
 *   alignment_score (0-100),
 *   execution_score (0-100),
 *   overall ('Green'|'Amber'|'Red'),
 *   hit[],
 *   missing[],
 *   warnings[],
 *   reasons[],
 * }
 */
export function scoreAlignment(blockFocus, summary) {
  const { primary_limiter, secondary_limiter } = blockFocus || {};

  const hit     = [];
  const missing = [];
  const warnings = [];
  const reasons  = [];

  // ── Alignment score ─────────────────────────────────────────────────────────

  let alignmentScore = 100;

  // Primary requirements (full weight)
  const primaryReqs = FOCUS_REQUIREMENTS[primary_limiter] || [];
  for (const req of primaryReqs) {
    const passed = req.check(summary);
    if (passed) {
      hit.push({ id: req.id, description: req.description, source: 'primary' });
      reasons.push(`✓ ${req.description}`);
    } else {
      missing.push({ id: req.id, description: req.description, source: 'primary', weight: req.weight });
      alignmentScore -= req.weight;
      reasons.push(`✗ Missing: ${req.description} (−${req.weight} pts)`);
    }
  }

  // Secondary requirements (50% weight)
  if (secondary_limiter && secondary_limiter !== 'EXPOSURE_SENSITIVITY') {
    const secondaryReqs = FOCUS_REQUIREMENTS[secondary_limiter] || [];
    for (const req of secondaryReqs) {
      const passed = req.check(summary);
      const halfWeight = Math.round(req.weight * 0.5);
      if (passed) {
        hit.push({ id: req.id, description: req.description, source: 'secondary' });
      } else {
        missing.push({ id: req.id, description: req.description, source: 'secondary', weight: halfWeight });
        alignmentScore -= halfWeight;
        reasons.push(`✗ Secondary missing: ${req.description} (−${halfWeight} pts)`);
      }
    }
  }

  // EXPOSURE_SENSITIVITY tactical note (never penalises alignment)
  if (primary_limiter === 'EXPOSURE_SENSITIVITY' || secondary_limiter === 'EXPOSURE_SENSITIVITY') {
    warnings.push('EXPOSURE_SENSITIVITY is a context modifier — focus on race-simulation exposure and group ride variety');
  }

  // No limiter profile yet
  if (!primary_limiter) {
    alignmentScore = 50; // neutral
    reasons.push('No limiter profile set — run a race and call update-from-race to get block focus');
    warnings.push('no_limiter_profile');
  }

  alignmentScore = clamp(alignmentScore, 0, 100);

  // ── Execution score ─────────────────────────────────────────────────────────

  let executionScore = 100;

  // Back-to-back intensity
  if (summary.back_to_back_intensity > BACK_TO_BACK_WARN) {
    const penalty = Math.min(20, summary.back_to_back_intensity * 8);
    executionScore -= penalty;
    warnings.push(`back_to_back_intensity_days: ${summary.back_to_back_intensity} consecutive intensity pairs (limit: ${BACK_TO_BACK_WARN})`);
    reasons.push(`⚠ Back-to-back intensity: ${summary.back_to_back_intensity} pairs (−${penalty} pts execution)`);
  }

  // Too many intensity days
  if (summary.intensity_days > MAX_INTENSITY_DAYS) {
    const penalty = (summary.intensity_days - MAX_INTENSITY_DAYS) * 10;
    executionScore -= penalty;
    warnings.push(`intensity_overload: ${summary.intensity_days} intensity days (max: ${MAX_INTENSITY_DAYS})`);
    reasons.push(`⚠ Intensity overload: ${summary.intensity_days} days (−${penalty} pts execution)`);
  }

  // Long ride missing when required
  const requiresLongRide = ['THRESHOLD_UNDER_STRESS', 'LATE_RACE_RESILIENCE'].includes(primary_limiter);
  if (requiresLongRide && !summary.long_ride_present) {
    executionScore -= 15;
    warnings.push(`long_ride_missing: required for ${primary_limiter} focus`);
    reasons.push(`⚠ Long ride missing for ${primary_limiter} focus (−15 pts execution)`);
  }

  // Monotony: all intensity in one session
  if (summary.intensity_days === 1 && summary.total_activities >= 3) {
    executionScore -= 10;
    warnings.push('monotony: all intensity concentrated in single session');
    reasons.push('⚠ Monotony: all intensity in one session (−10 pts execution)');
  }

  // Data quality penalty
  if (summary.data_quality < 0.5) {
    const penalty = Math.round((0.5 - summary.data_quality) * 30);
    executionScore -= penalty;
    warnings.push(`data_quality_low: ${Math.round(summary.data_quality * 100)}% coverage`);
    reasons.push(`⚠ Low data quality: ${Math.round(summary.data_quality * 100)}% coverage (−${penalty} pts execution)`);
  }

  // Missing data notes
  for (const note of summary.missing_data_notes) {
    warnings.push(note);
  }

  executionScore = clamp(executionScore, 0, 100);

  // ── Overall colour ──────────────────────────────────────────────────────────

  let overall;
  if (alignmentScore >= 75 && executionScore >= 70) overall = 'Green';
  else if (alignmentScore >= 55 && executionScore >= 55) overall = 'Amber';
  else overall = 'Red';

  return {
    alignment_score: Math.round(alignmentScore),
    execution_score: Math.round(executionScore),
    overall,
    hit,
    missing,
    warnings,
    reasons,
  };
}

// ─── computeTrainingQuality ───────────────────────────────────────────────────

/**
 * Full pipeline: focus → stimulus → score → persist.
 * Idempotent: upserts on (athlete_id, week_start).
 *
 * @param {number} athleteId
 * @param {string} weekStart - Monday date YYYY-MM-DD
 * @param {Object} [options]
 * @param {Object} [options.blockFocusOverride] - Override limiter focus (for testing)
 * @returns {{ ok, iso_week, block_focus, scores, hit, missing, warnings, reasons, summary }}
 */
export function computeTrainingQuality(athleteId, weekStart, options = {}) {
  const asOfDate   = weekStart; // use week start as the reference date for focus resolution
  const resolvedFocus = options.blockFocusOverride
    ? { ...options.blockFocusOverride, source: 'OVERRIDE', anchor_race: null, rationale: [] }
    : getResolvedBlockFocus(athleteId, asOfDate);

  const blockFocus = {
    primary_limiter:   resolvedFocus.primary_limiter,
    secondary_limiter: resolvedFocus.secondary_limiter,
  };

  const summary    = computeWeeklyStimulusSummary(athleteId, weekStart);
  const scores     = scoreAlignment(blockFocus, summary);
  const now        = new Date().toISOString();

  const block_focus_snapshot = {
    primary:         resolvedFocus.primary_limiter,
    secondary:       resolvedFocus.secondary_limiter || null,
    source:          resolvedFocus.source,
    anchor_race_id:  resolvedFocus.anchor_race?.id   || null,
    anchor_race_date: resolvedFocus.anchor_race?.date || null,
  };

  const result = {
    ok:          true,
    iso_week:    mondayToIsoWeek(weekStart),
    week_start:  weekStart,
    block_focus: {
      ...blockFocus,
      source:      resolvedFocus.source,
      anchor_race: resolvedFocus.anchor_race || null,
      rationale:   resolvedFocus.rationale   || [],
    },
    block_focus_snapshot,
    scores,
    hit:         scores.hit,
    missing:     scores.missing,
    warnings:    scores.warnings,
    reasons:     scores.reasons,
    summary: {
      total_activities:          summary.total_activities,
      intensity_days:            summary.intensity_days,
      stochastic_days:           summary.stochastic_days,
      threshold_minutes:         summary.threshold_minutes,
      vo2_minutes:               summary.vo2_minutes,
      long_ride_present:         summary.long_ride_present,
      long_ride_minutes:         summary.long_ride_minutes,
      late_ride_work_present:    summary.late_ride_work_present,
      sprint_spikes_total:       summary.sprint_spikes_total,
      repeat_hard_efforts_total: summary.repeat_hard_efforts_total,
      back_to_back_intensity:    summary.back_to_back_intensity,
      data_quality:              summary.data_quality,
      missing_data_notes:        summary.missing_data_notes,
    },
    algo_version: ALGO_VERSION,
    computed_at:  now,
  };

  // Persist
  const scoreJson = JSON.stringify(result);
  db.prepare(`
    INSERT INTO training_quality_week (athlete_id, week_start, score_json, computed_at, algo_version)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(athlete_id, week_start) DO UPDATE SET
      score_json   = excluded.score_json,
      computed_at  = excluded.computed_at,
      algo_version = excluded.algo_version
  `).run(athleteId, weekStart, scoreJson, now, ALGO_VERSION);

  return result;
}

/**
 * Batch recompute training quality for a range of weeks.
 *
 * @param {number} athleteId
 * @param {string} fromWeekStart - YYYY-MM-DD
 * @param {string} toWeekStart   - YYYY-MM-DD (inclusive)
 * @returns {{ ok, computed, weeks }}
 */
export function recomputeTrainingQualityRange(athleteId, fromWeekStart, toWeekStart) {
  const weeks = [];
  let cur = fromWeekStart;
  while (cur <= toWeekStart) {
    weeks.push(cur);
    const nextMs = new Date(cur + 'T00:00:00Z').getTime() + 7 * 86400000;
    const d = new Date(nextMs);
    cur = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  let computed = 0;
  const results = [];
  for (const ws of weeks) {
    try {
      const r = computeTrainingQuality(athleteId, ws);
      results.push({ week_start: ws, ok: r.ok, overall: r.scores.overall });
      computed++;
    } catch (err) {
      console.error(`[TQ] Failed week ${ws}:`, err.message);
      results.push({ week_start: ws, ok: false, error: err.message });
    }
  }

  return { ok: true, computed, total: weeks.length, weeks: results };
}

export default {
  ALGO_VERSION,
  isoWeekToMonday,
  getCurrentBlockFocus,
  computeWeeklyStimulusSummary,
  scoreAlignment,
  computeTrainingQuality,
  recomputeTrainingQualityRange,
};
