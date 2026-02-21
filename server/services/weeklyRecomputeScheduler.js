/**
 * Weekly Recompute Scheduler
 * 
 * Provides event-driven weekly rollup recomputation.
 * Called after provider syncs, imports, or manual triggers.
 * 
 * Design:
 * - Minimal: only recomputes affected weeks + lookback buffer
 * - Idempotent: safe to call multiple times
 * - Clamped: never recomputes more than maxWeeks in one call
 * - Uses existing weeklyAggregator functions
 */

import {
  getWeekStart,
  computeAndStoreWeeklyRollup,
  getWeeklyRollups
} from './weeklyAggregator.js';
import db from '../db.js';

const MAX_WEEKS_DEFAULT = 6;
const LOOKBACK_WEEKS_DEFAULT = 1;

/**
 * Format a UTC epoch-ms or Date as YYYY-MM-DD using UTC getters.
 * @param {number|Date} ms - epoch milliseconds or Date object
 * @returns {string} YYYY-MM-DD
 */
export function formatUTCDate(ms) {
  const d = typeof ms === 'number' ? new Date(ms) : ms;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Get Monday week start from an ISO date string.
 * Thin wrapper around weeklyAggregator.getWeekStart for external callers.
 * 
 * @param {string} isoString - ISO date string (e.g. '2026-02-17T10:00:00Z')
 * @returns {string} Monday date 'YYYY-MM-DD'
 */
export function weekStartFromISODate(isoString) {
  if (!isoString) return null;
  // Pass the full string to getWeekStart — it now uses UTC-only math
  return getWeekStart(isoString);
}

/**
 * Recompute specific weeks for a user.
 * 
 * @param {number} userId - User ID
 * @param {string[]} weekStarts - Array of Monday dates ('YYYY-MM-DD')
 * @param {Object} [options]
 * @param {number} [options.lookbackWeeks=1] - Extra weeks before each target to recompute
 * @param {number} [options.maxWeeks=6] - Max weeks to recompute in one call
 * @returns {Promise<{ok: boolean, computed: number, weeks: string[], warning?: string}>}
 */
export async function recomputeWeeksForUser(userId, weekStarts, options = {}) {
  const {
    lookbackWeeks = LOOKBACK_WEEKS_DEFAULT,
    maxWeeks = MAX_WEEKS_DEFAULT
  } = options;

  const startMs = Date.now();

  // Dedupe and add lookback weeks
  const weekSet = new Set();
  for (const ws of weekStarts) {
    if (!ws) continue;
    weekSet.add(ws);

    // Add lookback weeks (UTC epoch math to avoid local-tz bugs)
    for (let i = 1; i <= lookbackWeeks; i++) {
      const prevMs = new Date(ws + 'T00:00:00Z').getTime() - (7 * i * 86400000);
      weekSet.add(formatUTCDate(prevMs));
    }
  }

  // Sort chronologically
  let weeks = [...weekSet].sort();

  // Clamp
  let warning = null;
  if (weeks.length > maxWeeks) {
    warning = `Clamped from ${weeks.length} to ${maxWeeks} weeks`;
    console.warn(`[WEEKLY] ${warning} (user ${userId})`);
    // Keep the most recent weeks
    weeks = weeks.slice(-maxWeeks);
  }

  console.log(`[WEEKLY] recompute weeks: ${weeks.join(', ')} (user ${userId})`);

  let computed = 0;
  const results = [];

  for (const weekStart of weeks) {
    try {
      const result = await computeAndStoreWeeklyRollup(userId, weekStart);
      if (result.ok) computed++;
      results.push({ weekStart, ok: result.ok });
    } catch (err) {
      console.error(`[WEEKLY] Failed to compute week ${weekStart} for user ${userId}:`, err.message);
      results.push({ weekStart, ok: false, error: err.message });
    }
  }

  const durationMs = Date.now() - startMs;
  console.log(`[WEEKLY] done: ${computed}/${weeks.length} weeks in ${durationMs}ms (user ${userId})`);

  return {
    ok: true,
    computed,
    weeks,
    results,
    durationMs,
    ...(warning ? { warning } : {})
  };
}

/**
 * Recompute weeks affected by a specific activity.
 * Derives weekStart from the activity's start_time, adds lookback.
 * 
 * @param {number} userId - User ID
 * @param {Object} activityRow - Activity row (needs start_time)
 * @param {Object} [options] - Passed to recomputeWeeksForUser
 * @returns {Promise<{ok: boolean, computedWeeks: string[]}>}
 */
export async function recomputeWeeksForActivity(userId, activityRow, options = {}) {
  if (!activityRow?.start_time) {
    console.warn('[WEEKLY] recomputeWeeksForActivity called without start_time');
    return { ok: false, computedWeeks: [], error: 'No start_time on activity' };
  }

  const weekStart = weekStartFromISODate(activityRow.start_time);
  if (!weekStart) {
    return { ok: false, computedWeeks: [], error: 'Could not derive weekStart' };
  }

  const result = await recomputeWeeksForUser(userId, [weekStart], options);
  return {
    ok: result.ok,
    computedWeeks: result.weeks,
    computed: result.computed,
    durationMs: result.durationMs,
    ...(result.warning ? { warning: result.warning } : {})
  };
}

/**
 * Recompute recent weeks (fallback when affected weeks are unknown).
 * 
 * @param {number} userId - User ID
 * @param {number} [weeksBack=4] - How many weeks back to recompute
 * @returns {Promise<{ok: boolean, computedWeeks: string[]}>}
 */
export async function recomputeRecentWeeks(userId, weeksBack = 4) {
  const startMs = Date.now();
  const weeks = [];
  const nowMs = Date.now();

  for (let i = 0; i < weeksBack; i++) {
    const d = new Date(nowMs - (7 * i * 86400000));
    weeks.push(getWeekStart(d.toISOString()));
  }

  // Dedupe (in case weeksBack overlaps)
  const uniqueWeeks = [...new Set(weeks)].sort();

  console.log(`[WEEKLY] recompute recent ${uniqueWeeks.length} weeks (user ${userId})`);

  let computed = 0;
  for (const weekStart of uniqueWeeks) {
    try {
      const result = await computeAndStoreWeeklyRollup(userId, weekStart);
      if (result.ok) computed++;
    } catch (err) {
      console.error(`[WEEKLY] Failed week ${weekStart}:`, err.message);
    }
  }

  const durationMs = Date.now() - startMs;
  console.log(`[WEEKLY] recent done: ${computed}/${uniqueWeeks.length} in ${durationMs}ms (user ${userId})`);

  return {
    ok: true,
    computedWeeks: uniqueWeeks,
    computed,
    durationMs
  };
}

/**
 * Derive affected week starts from a list of activity IDs.
 * Queries the activities table for start_times and converts to week starts.
 * 
 * @param {number} userId - User ID
 * @param {string[]} activityIds - Activity IDs that were created/upgraded
 * @returns {string[]} Unique week start dates
 */
export function getAffectedWeeks(userId, activityIds) {
  if (!activityIds || activityIds.length === 0) return [];

  const placeholders = activityIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT DISTINCT start_time FROM activities
    WHERE user_id = ? AND id IN (${placeholders})
    AND start_time IS NOT NULL
  `).all(userId, ...activityIds);

  const weekSet = new Set();
  for (const row of rows) {
    try {
      const ws = weekStartFromISODate(row.start_time);
      if (ws) weekSet.add(ws);
    } catch (err) {
      console.warn(`[WEEKLY] getAffectedWeeks: invalid start_time '${row.start_time}', skipping`);
    }
  }

  return [...weekSet].sort();
}

/**
 * Check if a user has any weekly rollups.
 * 
 * @param {number} userId - User ID
 * @returns {{hasWeekly: boolean, count: number}}
 */
export function hasWeeklyRollups(userId) {
  const row = db.prepare('SELECT COUNT(*) as cnt FROM athlete_weekly WHERE user_id = ?').get(userId);
  return {
    hasWeekly: row.cnt > 0,
    count: row.cnt
  };
}

export default {
  formatUTCDate,
  weekStartFromISODate,
  recomputeWeeksForUser,
  recomputeWeeksForActivity,
  recomputeRecentWeeks,
  getAffectedWeeks,
  hasWeeklyRollups
};
