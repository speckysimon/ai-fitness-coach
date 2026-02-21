/**
 * Strava Shell Reconciler
 * 
 * When Strava is connected, finds all intervals_strava_shell sources
 * that don't yet have a matching Strava source row, fetches the real
 * activity data from Strava, and imports it as a proper Strava source.
 * 
 * This replaces shell placeholders with real Strava data and triggers
 * canonical selection/update for those activities.
 */

import db from '../db.js';
import { findOrCreateActivity, upsertActivitySource, applyBestDataWins } from './activityImportService.js';

/**
 * Find all unreconciled Intervals Strava shells for a user.
 * 
 * An unreconciled shell is one where:
 * - source_kind = 'intervals_strava_shell'
 * - No matching Strava source exists for the same strava_activity_id
 * 
 * @param {number} userId
 * @returns {Array<{ id: string, strava_activity_id: string, provider_id: string }>}
 */
export function findUnreconciledShells(userId) {
  return db.prepare(`
    SELECT s.id, s.strava_activity_id, s.provider_id, s.name, s.raw_duration_s, s.raw_distance_m
    FROM activity_sources s
    WHERE s.user_id = ?
      AND s.source_kind = 'intervals_strava_shell'
      AND s.strava_activity_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM activity_sources s2
        WHERE s2.user_id = s.user_id
          AND s2.provider = 'strava'
          AND s2.provider_id = s.strava_activity_id
      )
    ORDER BY s.imported_at DESC
  `).all(userId);
}

/**
 * Reconcile a single shell by importing its Strava data.
 * 
 * @param {number} userId
 * @param {Object} stravaActivity - Full Strava activity data (already fetched)
 * @param {string} stravaId - Strava activity ID
 * @returns {Object} { ok, activityId, action, reason }
 */
export function reconcileShell(userId, stravaActivity, stravaId) {
  console.log(`[ShellReconciler] Reconciling shell strava_id=${stravaId} for user ${userId}`);
  
  // Normalize Strava activity fields
  const startTime = stravaActivity.start_date || stravaActivity.start_time;
  const durationS = stravaActivity.moving_time || stravaActivity.elapsed_time || 0;
  const distanceM = stravaActivity.distance || stravaActivity.distance_m || 0;
  
  if (!startTime || durationS === 0) {
    console.log(`[ShellReconciler] Strava activity ${stravaId} has no start_time or duration — skipping`);
    return { ok: false, reason: 'strava_activity_invalid' };
  }
  
  // Import as a normal Strava activity through the standard path
  const result = findOrCreateActivity(userId, {
    provider: 'strava',
    provider_id: stravaId,
    start_time: startTime,
    duration_s: durationS,
    sport: stravaActivity.sport_type || stravaActivity.type || 'cycling',
    name: stravaActivity.name || 'Strava Activity',
    type: stravaActivity.type || 'Ride',
    timezone_offset_min: stravaActivity.utc_offset || null,
    distance_m: distanceM,
    elevation_m: stravaActivity.total_elevation_gain || 0,
    avg_power: stravaActivity.average_watts || null,
    max_power: stravaActivity.max_watts || null,
    normalized_power: stravaActivity.weighted_average_watts || null,
    tss: stravaActivity.suffer_score || null,
    avg_hr: stravaActivity.average_heartrate || null,
    max_hr: stravaActivity.max_heartrate || null,
    avg_cadence: stravaActivity.average_cadence || null,
    has_power: !!(stravaActivity.average_watts || stravaActivity.device_watts),
    avg_speed: stravaActivity.average_speed || null,
    max_speed: stravaActivity.max_speed || null,
    calories: stravaActivity.calories || stravaActivity.kilojoules || null
  });
  
  const activityId = result.activity.id;
  
  // Upsert the Strava source
  upsertActivitySource(activityId, userId, {
    provider: 'strava',
    provider_id: stravaId,
    name: stravaActivity.name,
    type: stravaActivity.type,
    duration_s: durationS,
    distance_m: distanceM,
    elevation_m: stravaActivity.total_elevation_gain || 0,
    avg_power: stravaActivity.average_watts || null,
    max_power: stravaActivity.max_watts || null,
    normalized_power: stravaActivity.weighted_average_watts || null,
    tss: stravaActivity.suffer_score || null,
    avg_hr: stravaActivity.average_heartrate || null,
    max_hr: stravaActivity.max_heartrate || null,
    avg_cadence: stravaActivity.average_cadence || null,
    avg_speed: stravaActivity.average_speed || null,
    max_speed: stravaActivity.max_speed || null,
    calories: stravaActivity.calories || null
  });
  
  // Apply best-data-wins merge
  applyBestDataWins(activityId);
  
  // Link the shell source to this canonical activity
  db.prepare(`
    UPDATE activity_sources
    SET activity_id = ?, ignore_reason = 'reconciled_via_strava'
    WHERE user_id = ? AND source_kind = 'intervals_strava_shell' AND strava_activity_id = ?
  `).run(activityId, userId, stravaId);
  
  console.log(`[ShellReconciler] ✅ Reconciled strava_id=${stravaId} → canonical ${activityId} (${result.created ? 'created' : 'matched'})`);
  
  return {
    ok: true,
    activityId,
    created: result.created,
    action: result.created ? 'created_from_strava' : 'matched_existing',
    reason: 'shell_reconciled'
  };
}

/**
 * Run full reconciliation for a user.
 * 
 * Finds all unreconciled shells and attempts to fetch + import from Strava.
 * Requires a stravaFetcher function that takes (stravaId) and returns activity data.
 * 
 * @param {number} userId
 * @param {Function} stravaFetcher - async (stravaId) => stravaActivity | null
 * @param {Object} options - { batchSize, delayMs }
 * @returns {Object} { total, reconciled, failed, skipped, details }
 */
export async function reconcileAllShells(userId, stravaFetcher, options = {}) {
  const { batchSize = 50, delayMs = 1100 } = options;
  
  const shells = findUnreconciledShells(userId);
  console.log(`[ShellReconciler] Found ${shells.length} unreconciled shells for user ${userId}`);
  
  if (shells.length === 0) {
    return { total: 0, reconciled: 0, failed: 0, skipped: 0, details: [] };
  }
  
  const batch = shells.slice(0, batchSize);
  const results = { total: batch.length, reconciled: 0, failed: 0, skipped: 0, details: [] };
  
  for (const shell of batch) {
    try {
      // Fetch from Strava
      const stravaActivity = await stravaFetcher(shell.strava_activity_id);
      
      if (!stravaActivity) {
        console.log(`[ShellReconciler] Strava activity ${shell.strava_activity_id} not found — skipping`);
        results.skipped++;
        results.details.push({ stravaId: shell.strava_activity_id, status: 'skipped', reason: 'not_found_in_strava' });
        continue;
      }
      
      const result = reconcileShell(userId, stravaActivity, shell.strava_activity_id);
      
      if (result.ok) {
        results.reconciled++;
      } else {
        results.failed++;
      }
      
      results.details.push({ stravaId: shell.strava_activity_id, ...result });
      
      // Rate limit
      if (delayMs > 0) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    } catch (error) {
      console.error(`[ShellReconciler] Error reconciling ${shell.strava_activity_id}:`, error.message);
      results.failed++;
      results.details.push({ stravaId: shell.strava_activity_id, status: 'error', error: error.message });
    }
  }
  
  console.log(`[ShellReconciler] Reconciliation complete: ${results.reconciled} reconciled, ${results.failed} failed, ${results.skipped} skipped`);
  
  return results;
}

export default {
  findUnreconciledShells,
  reconcileShell,
  reconcileAllShells
};
