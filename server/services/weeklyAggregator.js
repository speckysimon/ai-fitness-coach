/**
 * Weekly Aggregator Service
 * 
 * Computes stable weekly rollups per user for dashboards and coaching logic.
 * Aggregates normalised metrics, durability, and stress data into weekly summaries.
 * 
 * Algorithm Version: week_v1
 */

import db from '../db.js';
import { getAnalyticsWhereClause } from './analyticsQueryBuilder.js';

const ALGO_VERSION = 'week_v1';

/**
 * Get Monday start date for a given date (ISO week start)
 * 
 * @param {Date|string} date - Date to get week start for
 * @returns {string} ISO date string (YYYY-MM-DD) for Monday
 */
export function getWeekStart(date) {
  // Force date-only strings (YYYY-MM-DD) to parse as UTC midnight
  let input = date;
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    input = input + 'T00:00:00Z';
  }
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  // UTC-only: get day-of-week in UTC (0=Sun, 1=Mon, ..., 6=Sat)
  const utcDay = d.getUTCDay();
  // Days to subtract to reach Monday (Sun=6, Mon=0, Tue=1, ..., Sat=5)
  const daysBack = utcDay === 0 ? 6 : utcDay - 1;
  // Subtract days at the UTC epoch-ms level to avoid local-tz setDate bugs
  const mondayMs = d.getTime() - daysBack * 86400000;
  const monday = new Date(mondayMs);
  // Format as YYYY-MM-DD from UTC components
  const y = monday.getUTCFullYear();
  const m = String(monday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(monday.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Compute percentile from array of values
 * 
 * @param {Array<number>} values - Array of numbers
 * @param {number} percentile - Percentile (0-100)
 * @returns {number|null} Percentile value
 */
function computePercentile(values, percentile) {
  if (!values || values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Sum time-in-zones from multiple activities
 * 
 * @param {Array<string>} tizJsonArray - Array of TIZ JSON strings
 * @returns {Object|null} Aggregated TIZ object
 */
function aggregateTimeInZones(tizJsonArray) {
  if (!tizJsonArray || tizJsonArray.length === 0) return null;
  
  const aggregated = {};
  
  for (const tizJson of tizJsonArray) {
    if (!tizJson || typeof tizJson !== 'string') continue;
    
    try {
      const tiz = JSON.parse(tizJson);
      if (!tiz || typeof tiz !== 'object') continue;
      for (const [zone, seconds] of Object.entries(tiz)) {
        const val = Number(seconds);
        if (!isNaN(val)) {
          aggregated[zone] = (aggregated[zone] || 0) + val;
        }
      }
    } catch (error) {
      console.warn('[WeeklyAggregator] Failed to parse TIZ JSON:', error.message);
    }
  }
  
  return Object.keys(aggregated).length > 0 ? aggregated : null;
}

/**
 * Aggregate stress distribution counts
 * 
 * @param {Array<string>} stressTypeArray - Array of stress type strings
 * @returns {Object|null} Stress distribution counts
 */
function aggregateStressDistribution(stressTypeArray) {
  if (!stressTypeArray || stressTypeArray.length === 0) return null;
  
  const distribution = {};
  
  for (const type of stressTypeArray) {
    if (!type) continue;
    distribution[type] = (distribution[type] || 0) + 1;
  }
  
  return Object.keys(distribution).length > 0 ? distribution : null;
}

/**
 * Compute weekly rollup for a specific week
 * 
 * @param {number} userId - User ID
 * @param {string} weekStart - ISO Monday date (YYYY-MM-DD)
 * @param {Object} options - Options
 * @returns {Object} Rollup data
 */
export function computeWeeklyRollup(userId, weekStart, options = {}) {
  console.log(`[WeeklyAggregator] Computing rollup for user ${userId}, week ${weekStart}`);
  
  // Calculate week end (next Monday) using UTC epoch math
  const weekEndMs = new Date(weekStart + 'T00:00:00Z').getTime() + 7 * 86400000;
  const we = new Date(weekEndMs);
  const weekEndStr = `${we.getUTCFullYear()}-${String(we.getUTCMonth() + 1).padStart(2, '0')}-${String(we.getUTCDate()).padStart(2, '0')}`;
  
  // Get analytics WHERE clause
  const { whereClause, params } = getAnalyticsWhereClause(userId);
  
  // Build query to get all activities in the week with joined data
  const query = `
    SELECT 
      a.id,
      a.duration_s,
      a.distance_m,
      a.has_power,
      a.avg_hr,
      
      -- Normalised data
      n.time_in_zones_power AS tiz_power,
      n.time_in_zones_hr AS tiz_hr,
      
      -- Durability data
      d.fade_power_pct AS power_fade,
      d.late_threshold_score,
      d.efficiency_drop_pct AS efficiency_drop,
      d.repeat_hard_efforts,
      d.has_sufficient_duration,
      d.has_power_data,
      
      -- Stress data
      s.primary_stress_type AS stress_type,
      s.is_stochastic,
      s.sprint_spikes,
      
      -- Stream flags
      CASE WHEN st.activity_id IS NOT NULL THEN 1 ELSE 0 END as has_streams
      
    FROM activities a
    LEFT JOIN activity_normalised n ON a.id = n.activity_id
    LEFT JOIN activity_durability d ON a.id = d.activity_id
    LEFT JOIN activity_stress s ON a.id = s.activity_id
    LEFT JOIN activity_streams st ON a.id = st.activity_id
    
    WHERE ${whereClause}
      AND DATE(a.start_time) >= ?
      AND DATE(a.start_time) < ?
    
    ORDER BY a.start_time
  `;
  
  const activities = db.prepare(query).all(...params, weekStart, weekEndStr);
  
  console.log(`[WeeklyAggregator] Found ${activities.length} activities for week ${weekStart}`);
  
  // Initialize rollup data
  const rollup = {
    user_id: userId,
    week_start: weekStart,
    computed_at: new Date().toISOString(),
    algo_version: ALGO_VERSION,
    
    // Coverage
    activities_total: activities.length,
    activities_analysed: activities.length,
    activities_with_streams: 0,
    activities_with_power: 0,
    activities_with_hr: 0,
    avg_quality_score: null,
    
    // Volume
    total_duration_s: 0,
    total_distance_m: 0,
    
    // Time in zones
    tiz_power: null,
    tiz_hr: null,
    
    // Work markers
    threshold_minutes: null,
    vo2_minutes: null,
    sprint_spikes: 0,
    stochastic_sessions: 0,
    
    // Durability
    avg_power_fade: null,
    p25_power_fade: null,
    best_late_threshold_score: null,
    avg_efficiency_drop: null,
    repeat_hard_efforts_total: 0,
    
    // Stress
    stress_dist: null,
    
    // Notes
    notes: {}
  };
  
  // Arrays for aggregation
  const tizPowerArray = [];
  const tizHrArray = [];
  const powerFadeValues = [];
  const lateThresholdScores = [];
  const efficiencyDropValues = [];
  const stressTypes = [];
  const qualityScores = [];
  
  // Process each activity
  for (const activity of activities) {
    // Volume
    rollup.total_duration_s += activity.duration_s || 0;
    rollup.total_distance_m += activity.distance_m || 0;
    
    // Coverage flags
    if (activity.has_streams) rollup.activities_with_streams++;
    if (activity.has_power) rollup.activities_with_power++;
    if (activity.avg_hr) rollup.activities_with_hr++;
    
    // Quality score (simple: has_streams + has_power + has_hr) / 3
    let activityQuality = 0;
    if (activity.has_streams) activityQuality += 0.33;
    if (activity.has_power) activityQuality += 0.33;
    if (activity.avg_hr) activityQuality += 0.34;
    qualityScores.push(activityQuality);
    
    // Time in zones
    if (activity.tiz_power) tizPowerArray.push(activity.tiz_power);
    if (activity.tiz_hr) tizHrArray.push(activity.tiz_hr);
    
    // Durability (only if valid — require sufficient duration and power data)
    const durabilityValid = activity.has_sufficient_duration && activity.has_power_data;
    if (durabilityValid && activity.power_fade !== null && activity.power_fade !== undefined) {
      powerFadeValues.push(activity.power_fade);
    }
    if (durabilityValid && activity.late_threshold_score !== null && activity.late_threshold_score !== undefined) {
      lateThresholdScores.push(activity.late_threshold_score);
    }
    if (durabilityValid && activity.efficiency_drop !== null && activity.efficiency_drop !== undefined) {
      efficiencyDropValues.push(activity.efficiency_drop);
    }
    if (durabilityValid && activity.repeat_hard_efforts) {
      rollup.repeat_hard_efforts_total += activity.repeat_hard_efforts;
    }
    
    // Stress
    if (activity.stress_type) stressTypes.push(activity.stress_type);
    if (activity.is_stochastic) rollup.stochastic_sessions++;
    if (activity.sprint_spikes) rollup.sprint_spikes += activity.sprint_spikes;
  }
  
  // Compute averages and aggregates
  
  // Quality score
  if (qualityScores.length > 0) {
    rollup.avg_quality_score = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  }
  
  // Time in zones
  const aggregatedTizPower = aggregateTimeInZones(tizPowerArray);
  const aggregatedTizHr = aggregateTimeInZones(tizHrArray);
  
  if (aggregatedTizPower) {
    rollup.tiz_power = JSON.stringify(aggregatedTizPower);
    
    // Extract threshold (Z4) and VO2 (Z5) minutes
    rollup.threshold_minutes = (aggregatedTizPower['Z4'] || 0) / 60;
    rollup.vo2_minutes = (aggregatedTizPower['Z5'] || 0) / 60;
  }
  
  if (aggregatedTizHr) {
    rollup.tiz_hr = JSON.stringify(aggregatedTizHr);
    
    // If no power zones, use HR zones for threshold/VO2
    if (!rollup.threshold_minutes) {
      rollup.threshold_minutes = (aggregatedTizHr['Z4'] || 0) / 60;
    }
    if (!rollup.vo2_minutes) {
      rollup.vo2_minutes = (aggregatedTizHr['Z5'] || 0) / 60;
    }
  }
  
  // Durability averages
  if (powerFadeValues.length > 0) {
    rollup.avg_power_fade = powerFadeValues.reduce((a, b) => a + b, 0) / powerFadeValues.length;
    rollup.p25_power_fade = computePercentile(powerFadeValues, 25);
  }
  
  if (lateThresholdScores.length > 0) {
    rollup.best_late_threshold_score = Math.max(...lateThresholdScores);
  }
  
  if (efficiencyDropValues.length > 0) {
    rollup.avg_efficiency_drop = efficiencyDropValues.reduce((a, b) => a + b, 0) / efficiencyDropValues.length;
  }
  
  // Stress distribution
  const stressDist = aggregateStressDistribution(stressTypes);
  if (stressDist) {
    rollup.stress_dist = JSON.stringify(stressDist);
  }
  
  // Add notes for missing data
  if (rollup.activities_with_power === 0) {
    rollup.notes.no_power = 'No activities with power data this week';
  }
  if (rollup.activities_with_streams === 0) {
    rollup.notes.no_streams = 'No activities with stream data this week';
  }
  if (powerFadeValues.length === 0) {
    rollup.notes.no_durability = 'No valid durability data this week';
  }
  
  return rollup;
}

/**
 * Upsert weekly rollup to database
 * 
 * @param {Object} rollup - Rollup data
 * @returns {Object} Result
 */
export function upsertWeeklyRollup(rollup) {
  try {
    const notesJson = Object.keys(rollup.notes).length > 0 ? JSON.stringify(rollup.notes) : null;
    
    db.prepare(`
      INSERT INTO athlete_weekly (
        user_id, week_start, computed_at, algo_version,
        activities_total, activities_analysed, activities_with_streams,
        activities_with_power, activities_with_hr, avg_quality_score,
        total_duration_s, total_distance_m,
        tiz_power, tiz_hr,
        threshold_minutes, vo2_minutes, sprint_spikes, stochastic_sessions,
        avg_power_fade, p25_power_fade, best_late_threshold_score,
        avg_efficiency_drop, repeat_hard_efforts_total,
        stress_dist, notes
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?
      )
      ON CONFLICT(user_id, week_start) DO UPDATE SET
        computed_at = excluded.computed_at,
        algo_version = excluded.algo_version,
        activities_total = excluded.activities_total,
        activities_analysed = excluded.activities_analysed,
        activities_with_streams = excluded.activities_with_streams,
        activities_with_power = excluded.activities_with_power,
        activities_with_hr = excluded.activities_with_hr,
        avg_quality_score = excluded.avg_quality_score,
        total_duration_s = excluded.total_duration_s,
        total_distance_m = excluded.total_distance_m,
        tiz_power = excluded.tiz_power,
        tiz_hr = excluded.tiz_hr,
        threshold_minutes = excluded.threshold_minutes,
        vo2_minutes = excluded.vo2_minutes,
        sprint_spikes = excluded.sprint_spikes,
        stochastic_sessions = excluded.stochastic_sessions,
        avg_power_fade = excluded.avg_power_fade,
        p25_power_fade = excluded.p25_power_fade,
        best_late_threshold_score = excluded.best_late_threshold_score,
        avg_efficiency_drop = excluded.avg_efficiency_drop,
        repeat_hard_efforts_total = excluded.repeat_hard_efforts_total,
        stress_dist = excluded.stress_dist,
        notes = excluded.notes
    `).run(
      rollup.user_id, rollup.week_start, rollup.computed_at, rollup.algo_version,
      rollup.activities_total, rollup.activities_analysed, rollup.activities_with_streams,
      rollup.activities_with_power, rollup.activities_with_hr, rollup.avg_quality_score,
      rollup.total_duration_s, rollup.total_distance_m,
      rollup.tiz_power, rollup.tiz_hr,
      rollup.threshold_minutes, rollup.vo2_minutes, rollup.sprint_spikes, rollup.stochastic_sessions,
      rollup.avg_power_fade, rollup.p25_power_fade, rollup.best_late_threshold_score,
      rollup.avg_efficiency_drop, rollup.repeat_hard_efforts_total,
      rollup.stress_dist, notesJson
    );
    
    console.log(`[WeeklyAggregator] ✅ Upserted rollup for user ${rollup.user_id}, week ${rollup.week_start}`);
    
    return {
      ok: true,
      weekStart: rollup.week_start
    };
  } catch (error) {
    console.error('[WeeklyAggregator] Failed to upsert rollup:', error.message);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Compute and store weekly rollup
 * 
 * @param {number} userId - User ID
 * @param {string} weekStart - ISO Monday date (YYYY-MM-DD)
 * @param {Object} options - Options
 * @returns {Object} Result with rollup data
 */
export async function computeAndStoreWeeklyRollup(userId, weekStart, options = {}) {
  const rollup = computeWeeklyRollup(userId, weekStart, options);
  const result = upsertWeeklyRollup(rollup);
  
  return {
    ...result,
    rollup: result.ok ? rollup : null
  };
}

/**
 * Compute weekly rollups for multiple weeks
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {string} options.after - Start date (YYYY-MM-DD)
 * @param {string} options.before - End date (YYYY-MM-DD)
 * @param {number} options.weeksBack - Number of weeks back from today
 * @returns {Object} Result with computed weeks
 */
export async function computeWeeklyRollups(userId, options = {}) {
  const { after, before, weeksBack = 12 } = options;
  
  let startDate, endDate;
  
  if (after && before) {
    startDate = new Date(after);
    endDate = new Date(before);
  } else if (weeksBack) {
    endDate = new Date();
    startDate = new Date(Date.now() - weeksBack * 7 * 86400000);
  } else {
    // Default: last 12 weeks
    endDate = new Date();
    startDate = new Date(Date.now() - 12 * 7 * 86400000);
  }
  
  // Get Monday starts for all weeks in range
  const weeks = [];
  let currentWeekStart = getWeekStart(startDate);
  const endWeekStart = getWeekStart(endDate);
  
  if (!currentWeekStart || !endWeekStart) {
    console.error(`[WeeklyAggregator] Invalid date range: start=${startDate}, end=${endDate}`);
    return { ok: false, computed: 0, failed: 0, weeks: [], error: 'Invalid date range' };
  }
  
  while (currentWeekStart <= endWeekStart) {
    weeks.push(currentWeekStart);
    
    // Move to next week (UTC epoch math)
    const nextMs = new Date(currentWeekStart + 'T00:00:00Z').getTime() + 7 * 86400000;
    const nw = new Date(nextMs);
    currentWeekStart = `${nw.getUTCFullYear()}-${String(nw.getUTCMonth() + 1).padStart(2, '0')}-${String(nw.getUTCDate()).padStart(2, '0')}`;
  }
  
  console.log(`[WeeklyAggregator] Computing ${weeks.length} weeks for user ${userId}`);
  
  const results = [];
  
  for (const weekStart of weeks) {
    const result = await computeAndStoreWeeklyRollup(userId, weekStart);
    results.push(result);
  }
  
  const successful = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  
  console.log(`[WeeklyAggregator] ✅ Computed ${successful} weeks, ${failed} failed`);
  
  return {
    ok: true,
    computed: successful,
    failed,
    weeks: results
  };
}

/**
 * Get weekly rollups for a user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {string} options.after - Start date
 * @param {string} options.before - End date
 * @param {number} options.limit - Limit
 * @returns {Array} Weekly rollups
 */
export function getWeeklyRollups(userId, options = {}) {
  const { after, before, limit } = options;
  
  let query = `
    SELECT * FROM athlete_weekly
    WHERE user_id = ?
  `;
  const params = [userId];
  
  if (after) {
    query += ` AND week_start >= ?`;
    params.push(after);
  }
  
  if (before) {
    query += ` AND week_start < ?`;
    params.push(before);
  }
  
  query += ` ORDER BY week_start DESC`;
  
  if (limit) {
    query += ` LIMIT ?`;
    params.push(limit);
  }
  
  return db.prepare(query).all(...params);
}

/**
 * Get single weekly rollup
 * 
 * @param {number} userId - User ID
 * @param {string} weekStart - ISO Monday date
 * @returns {Object|null} Weekly rollup
 */
export function getWeeklyRollup(userId, weekStart) {
  return db.prepare(`
    SELECT * FROM athlete_weekly
    WHERE user_id = ? AND week_start = ?
  `).get(userId, weekStart);
}

export default {
  getWeekStart,
  computeWeeklyRollup,
  upsertWeeklyRollup,
  computeAndStoreWeeklyRollup,
  computeWeeklyRollups,
  getWeeklyRollups,
  getWeeklyRollup
};
