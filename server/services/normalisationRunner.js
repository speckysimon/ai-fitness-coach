/**
 * Normalisation Runner
 * 
 * Orchestrates activity normalisation for users.
 * Uses analyticsQueryBuilder to select valid activities.
 */

import { getAnalyticsActivities } from './analyticsQueryBuilder.js';
import { normaliseActivity } from './activityNormaliser.js';
import db from '../db.js';

/**
 * Run normalisation for a user
 * 
 * Uses analyticsQueryBuilder to select activities that respect:
 * - is_valid_for_analytics flag
 * - user's strava-only preference
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {Date} options.after - Activities after this date
 * @param {Date} options.before - Activities before this date
 * @param {number} options.limit - Max activities to process
 * @param {boolean} options.forceRecompute - Recompute even if already normalised
 * @returns {Promise<Object>} Normalisation stats
 */
export async function runNormalisationForUser(userId, options = {}) {
  console.log(`[NormalisationRunner] Starting normalisation for user ${userId}`);
  
  const startTime = Date.now();
  
  try {
    // 1. Get analytics activities (respects is_valid_for_analytics + strava-only preference)
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
    
    console.log(`[NormalisationRunner] Found ${activities.length} analytics activities`);
    
    if (activities.length === 0) {
      return {
        ok: true,
        stats: {
          total: 0,
          computed: 0,
          skipped: 0,
          errors: 0
        },
        duration_ms: Date.now() - startTime
      };
    }
    
    // 2. Filter out already normalised activities (unless forceRecompute)
    let activitiesToProcess = activities;
    
    if (!options.forceRecompute) {
      const activityIds = activities.map(a => a.id);
      const placeholders = activityIds.map(() => '?').join(',');
      
      const alreadyNormalised = db.prepare(`
        SELECT activity_id FROM activity_normalised
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const normalisedSet = new Set(alreadyNormalised.map(n => n.activity_id));
      
      activitiesToProcess = activities.filter(a => !normalisedSet.has(a.id));
      
      console.log(`[NormalisationRunner] ${alreadyNormalised.length} already normalised, ${activitiesToProcess.length} to process`);
    }
    
    // 3. Process each activity
    const stats = {
      total: activities.length,
      computed: 0,
      skipped: alreadyNormalised?.length || 0,
      errors: 0,
      errorDetails: []
    };
    
    for (const activity of activitiesToProcess) {
      const result = await normaliseActivity(userId, activity.id, options);
      
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
    
    console.log(`[NormalisationRunner] ✅ Complete: ${stats.computed} computed, ${stats.skipped} skipped, ${stats.errors} errors (${duration}ms)`);
    
    return {
      ok: true,
      stats,
      duration_ms: duration
    };
    
  } catch (error) {
    console.error(`[NormalisationRunner] ❌ Failed:`, error);
    return {
      ok: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Get normalisation status for user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Normalisation status
 */
export function getNormalisationStatus(userId) {
  // Count total analytics activities
  const totalActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND is_valid_for_analytics = 1
  `).get(userId);
  
  // Count normalised activities
  const normalisedActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activity_normalised
    WHERE user_id = ?
  `).get(userId);
  
  // Get latest normalisation
  const latestNormalisation = db.prepare(`
    SELECT computed_at, algo_version FROM activity_normalised
    WHERE user_id = ?
    ORDER BY computed_at DESC
    LIMIT 1
  `).get(userId);
  
  // Get quality distribution
  const qualityDistribution = db.prepare(`
    SELECT 
      CASE 
        WHEN quality_score >= 80 THEN 'high'
        WHEN quality_score >= 60 THEN 'medium'
        ELSE 'low'
      END as quality_level,
      COUNT(*) as count
    FROM activity_normalised
    WHERE user_id = ?
    GROUP BY quality_level
  `).all(userId);
  
  const qualityStats = {
    high: 0,
    medium: 0,
    low: 0
  };
  
  qualityDistribution.forEach(row => {
    qualityStats[row.quality_level] = row.count;
  });
  
  return {
    totalActivities: totalActivities.count,
    normalisedActivities: normalisedActivities.count,
    coverage: totalActivities.count > 0 
      ? (normalisedActivities.count / totalActivities.count * 100).toFixed(1)
      : 0,
    latestNormalisation: latestNormalisation?.computed_at || null,
    algoVersion: latestNormalisation?.algo_version || null,
    qualityDistribution: qualityStats
  };
}

/**
 * Clear normalised data for user
 * 
 * Useful for testing or when algo version changes.
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {string} options.algoVersion - Only clear specific algo version
 * @returns {Object} Clear result
 */
export function clearNormalisedData(userId, options = {}) {
  let query = `DELETE FROM activity_normalised WHERE user_id = ?`;
  const params = [userId];
  
  if (options.algoVersion) {
    query += ` AND algo_version = ?`;
    params.push(options.algoVersion);
  }
  
  const result = db.prepare(query).run(...params);
  
  console.log(`[NormalisationRunner] Cleared ${result.changes} normalised activities for user ${userId}`);
  
  return {
    ok: true,
    cleared: result.changes
  };
}

/**
 * Migrate normalised data to new algo version
 * 
 * @param {number} userId - User ID
 * @param {string} fromVersion - Old algo version
 * @param {string} toVersion - New algo version
 * @returns {Promise<Object>} Migration result
 */
export async function migrateNormalisedData(userId, fromVersion, toVersion) {
  console.log(`[NormalisationRunner] Migrating user ${userId} from ${fromVersion} to ${toVersion}`);
  
  // Get activities with old version
  const oldActivities = db.prepare(`
    SELECT activity_id FROM activity_normalised
    WHERE user_id = ? AND algo_version = ?
  `).all(userId, fromVersion);
  
  console.log(`[NormalisationRunner] Found ${oldActivities.length} activities to migrate`);
  
  // Clear old version
  clearNormalisedData(userId, { algoVersion: fromVersion });
  
  // Recompute with new version
  const result = await runNormalisationForUser(userId, {
    forceRecompute: true
  });
  
  return {
    ok: result.ok,
    migrated: oldActivities.length,
    recomputed: result.stats?.computed || 0
  };
}

export default {
  runNormalisationForUser,
  getNormalisationStatus,
  clearNormalisedData,
  migrateNormalisedData
};
