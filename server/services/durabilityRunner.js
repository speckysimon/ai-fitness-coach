/**
 * Durability Runner
 * 
 * Orchestrates durability computation for users.
 * Depends on activity_normalised existing.
 */

import { computeDurabilityForActivity } from './durabilityCalculator.js';
import { normaliseActivity } from './activityNormaliser.js';
import { getAnalyticsActivities } from './analyticsQueryBuilder.js';
import db from '../db.js';

/**
 * Run durability computation for a user
 * 
 * Depends on activity_normalised existing. If missing, computes normalisation first.
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {Date} options.after - Activities after this date
 * @param {Date} options.before - Activities before this date
 * @param {number} options.limit - Max activities to process
 * @param {boolean} options.forceRecompute - Recompute even if already computed
 * @param {boolean} options.ensureNormalised - Ensure normalisation exists first
 * @returns {Promise<Object>} Durability stats
 */
export async function runDurabilityForUser(userId, options = {}) {
  console.log(`[DurabilityRunner] Starting for user ${userId}`);
  
  const startTime = Date.now();
  const ensureNormalised = options.ensureNormalised !== false; // Default true
  
  try {
    // 1. Get analytics activities
    let activities = await getAnalyticsActivities(userId, {
      after: options.after,
      before: options.before,
      limit: options.limit
    });

    // If caller provides an explicit ID list, restrict to those only
    if (options.activityIds && options.activityIds.length > 0) {
      const idSet = new Set(options.activityIds);
      activities = activities.filter(a => idSet.has(a.id));
    }
    
    console.log(`[DurabilityRunner] Found ${activities.length} analytics activities`);
    
    if (activities.length === 0) {
      return {
        ok: true,
        stats: {
          total: 0,
          computed: 0,
          skipped: 0,
          normalised: 0,
          errors: 0
        },
        duration_ms: Date.now() - startTime
      };
    }
    
    // 2. Check which activities need normalisation
    let normalisedCount = 0;
    
    if (ensureNormalised) {
      const activityIds = activities.map(a => a.id);
      const placeholders = activityIds.map(() => '?').join(',');
      
      const normalised = db.prepare(`
        SELECT activity_id FROM activity_normalised
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const normalisedSet = new Set(normalised.map(n => n.activity_id));
      
      // Normalise missing activities
      for (const activity of activities) {
        if (!normalisedSet.has(activity.id)) {
          console.log(`[DurabilityRunner] Normalising ${activity.id} first...`);
          await normaliseActivity(userId, activity.id);
          normalisedCount++;
        }
      }
      
      if (normalisedCount > 0) {
        console.log(`[DurabilityRunner] Normalised ${normalisedCount} activities`);
      }
    }
    
    // 3. Filter out already computed durability (unless forceRecompute)
    let activitiesToProcess = activities;
    let skippedCount = 0;
    
    if (!options.forceRecompute) {
      const activityIds = activities.map(a => a.id);
      const placeholders = activityIds.map(() => '?').join(',');
      
      const alreadyComputed = db.prepare(`
        SELECT activity_id FROM activity_durability
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const computedSet = new Set(alreadyComputed.map(d => d.activity_id));
      
      activitiesToProcess = activities.filter(a => !computedSet.has(a.id));
      skippedCount = alreadyComputed.length;
      
      console.log(`[DurabilityRunner] ${skippedCount} already computed, ${activitiesToProcess.length} to process`);
    }
    
    // 4. Compute durability for each activity
    const stats = {
      total: activities.length,
      computed: 0,
      skipped: skippedCount,
      normalised: normalisedCount,
      errors: 0,
      errorDetails: []
    };
    
    for (const activity of activitiesToProcess) {
      const result = await computeDurabilityForActivity(userId, activity.id, options);
      
      if (result.ok) {
        stats.computed++;
      } else {
        stats.errors++;
        stats.errorDetails.push({
          activityId: activity.id,
          activityName: activity.name,
          error: result.error
        });
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[DurabilityRunner] ✅ Complete: ${stats.computed} computed, ${stats.skipped} skipped, ${stats.normalised} normalised, ${stats.errors} errors (${duration}ms)`);
    
    return {
      ok: true,
      stats,
      duration_ms: duration
    };
    
  } catch (error) {
    console.error(`[DurabilityRunner] ❌ Failed:`, error);
    return {
      ok: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Get durability status for user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Durability status
 */
export function getDurabilityStatus(userId) {
  // Count total analytics activities
  const totalActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND is_valid_for_analytics = 1
  `).get(userId);
  
  // Count durability computed activities
  const durabilityActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activity_durability
    WHERE user_id = ?
  `).get(userId);
  
  // Get latest computation
  const latestComputation = db.prepare(`
    SELECT computed_at, algo_version FROM activity_durability
    WHERE user_id = ?
    ORDER BY computed_at DESC
    LIMIT 1
  `).get(userId);
  
  // Get activities with sufficient duration
  const sufficientDuration = db.prepare(`
    SELECT COUNT(*) as count FROM activity_durability
    WHERE user_id = ? AND has_sufficient_duration = 1
  `).get(userId);
  
  // Get activities with power data
  const withPower = db.prepare(`
    SELECT COUNT(*) as count FROM activity_durability
    WHERE user_id = ? AND has_power_data = 1
  `).get(userId);
  
  // Get activities with HR data
  const withHr = db.prepare(`
    SELECT COUNT(*) as count FROM activity_durability
    WHERE user_id = ? AND has_hr_data = 1
  `).get(userId);
  
  // Get average metrics for activities with sufficient duration
  const avgMetrics = db.prepare(`
    SELECT 
      AVG(fade_power_pct) as avg_power_fade,
      AVG(fade_hr_pct) as avg_hr_fade,
      AVG(efficiency_drop_pct) as avg_efficiency_drop,
      AVG(late_threshold_score) as avg_late_threshold,
      AVG(stochasticity_score) as avg_stochasticity,
      AVG(repeat_hard_efforts) as avg_repeat_efforts
    FROM activity_durability
    WHERE user_id = ? AND has_sufficient_duration = 1
  `).get(userId);
  
  return {
    totalActivities: totalActivities.count,
    durabilityActivities: durabilityActivities.count,
    coverage: totalActivities.count > 0 
      ? (durabilityActivities.count / totalActivities.count * 100).toFixed(1)
      : 0,
    latestComputation: latestComputation?.computed_at || null,
    algoVersion: latestComputation?.algo_version || null,
    dataAvailability: {
      sufficientDuration: sufficientDuration.count,
      withPower: withPower.count,
      withHr: withHr.count
    },
    averageMetrics: {
      powerFade: avgMetrics?.avg_power_fade ? avgMetrics.avg_power_fade.toFixed(2) : null,
      hrFade: avgMetrics?.avg_hr_fade ? avgMetrics.avg_hr_fade.toFixed(2) : null,
      efficiencyDrop: avgMetrics?.avg_efficiency_drop ? avgMetrics.avg_efficiency_drop.toFixed(2) : null,
      lateThreshold: avgMetrics?.avg_late_threshold ? avgMetrics.avg_late_threshold.toFixed(2) : null,
      stochasticity: avgMetrics?.avg_stochasticity ? avgMetrics.avg_stochasticity.toFixed(3) : null,
      repeatEfforts: avgMetrics?.avg_repeat_efforts ? avgMetrics.avg_repeat_efforts.toFixed(1) : null
    }
  };
}

/**
 * Get durability trends over time
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {number} options.days - Days to look back (default: 90)
 * @returns {Array} Trend data
 */
export function getDurabilityTrends(userId, options = {}) {
  const days = options.days || 90;
  
  const trends = db.prepare(`
    SELECT 
      date(a.start_time) as date,
      AVG(d.fade_power_pct) as avg_power_fade,
      AVG(d.fade_hr_pct) as avg_hr_fade,
      AVG(d.efficiency_drop_pct) as avg_efficiency_drop,
      AVG(d.late_threshold_score) as avg_late_threshold,
      COUNT(*) as activity_count
    FROM activities a
    JOIN activity_durability d ON a.id = d.activity_id
    WHERE a.user_id = ?
      AND d.has_sufficient_duration = 1
      AND a.start_time >= date('now', '-' || ? || ' days')
    GROUP BY date(a.start_time)
    ORDER BY date DESC
  `).all(userId, days);
  
  return trends;
}

/**
 * Get best durability performances
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {number} options.limit - Max results (default: 10)
 * @returns {Array} Best performances
 */
export function getBestDurabilityPerformances(userId, options = {}) {
  const limit = options.limit || 10;
  
  // Best = lowest power fade + highest late threshold score
  const best = db.prepare(`
    SELECT 
      a.id,
      a.name,
      a.start_time,
      a.duration_s,
      d.fade_power_pct,
      d.fade_hr_pct,
      d.efficiency_drop_pct,
      d.late_threshold_score,
      d.repeat_hard_efforts,
      (COALESCE(d.late_threshold_score, 0) - COALESCE(d.fade_power_pct, 0)) as durability_score
    FROM activities a
    JOIN activity_durability d ON a.id = d.activity_id
    WHERE a.user_id = ?
      AND d.has_sufficient_duration = 1
      AND d.has_power_data = 1
    ORDER BY durability_score DESC
    LIMIT ?
  `).all(userId, limit);
  
  return best;
}

/**
 * Clear durability data for user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {string} options.algoVersion - Only clear specific algo version
 * @returns {Object} Clear result
 */
export function clearDurabilityData(userId, options = {}) {
  let query = `DELETE FROM activity_durability WHERE user_id = ?`;
  const params = [userId];
  
  if (options.algoVersion) {
    query += ` AND algo_version = ?`;
    params.push(options.algoVersion);
  }
  
  const result = db.prepare(query).run(...params);
  
  console.log(`[DurabilityRunner] Cleared ${result.changes} durability records for user ${userId}`);
  
  return {
    ok: true,
    cleared: result.changes
  };
}

/**
 * Migrate durability data to new algo version
 * 
 * @param {number} userId - User ID
 * @param {string} fromVersion - Old algo version
 * @param {string} toVersion - New algo version
 * @returns {Promise<Object>} Migration result
 */
export async function migrateDurabilityData(userId, fromVersion, toVersion) {
  console.log(`[DurabilityRunner] Migrating user ${userId} from ${fromVersion} to ${toVersion}`);
  
  // Get activities with old version
  const oldActivities = db.prepare(`
    SELECT activity_id FROM activity_durability
    WHERE user_id = ? AND algo_version = ?
  `).all(userId, fromVersion);
  
  console.log(`[DurabilityRunner] Found ${oldActivities.length} activities to migrate`);
  
  // Clear old version
  clearDurabilityData(userId, { algoVersion: fromVersion });
  
  // Recompute with new version
  const result = await runDurabilityForUser(userId, {
    forceRecompute: true
  });
  
  return {
    ok: result.ok,
    migrated: oldActivities.length,
    recomputed: result.stats?.computed || 0
  };
}

export default {
  runDurabilityForUser,
  getDurabilityStatus,
  getDurabilityTrends,
  getBestDurabilityPerformances,
  clearDurabilityData,
  migrateDurabilityData
};
