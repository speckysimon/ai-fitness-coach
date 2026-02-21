/**
 * Stress Classification Runner
 * 
 * Orchestrates stress classification for users.
 * Depends on activity_normalised and activity_durability existing.
 * 
 * Delegates all classification logic to activityStressClassifier.js.
 * Writes results to the full activity_stress schema (stress_v1).
 */

import { getAnalyticsActivities } from './analyticsQueryBuilder.js';
import { normaliseActivity } from './activityNormaliser.js';
import { computeDurabilityForActivity } from './durabilityCalculator.js';
import { classifyActivityStress } from './activityStressClassifier.js';
import db from '../db.js';

/**
 * Prepared upsert statement for the full activity_stress schema.
 * Lazily initialised on first use.
 */
let _upsertStmt = null;
function getUpsertStmt() {
  if (!_upsertStmt) {
    _upsertStmt = db.prepare(`
      INSERT INTO activity_stress (
        user_id, activity_id, computed_at, algo_version,
        primary_stress_type, is_stochastic,
        sustained_threshold_blocks, longest_threshold_block_s,
        vo2_blocks, longest_vo2_block_s, sprint_spikes,
        recovery_score, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, activity_id) DO UPDATE SET
        computed_at                = excluded.computed_at,
        algo_version               = excluded.algo_version,
        primary_stress_type        = excluded.primary_stress_type,
        is_stochastic              = excluded.is_stochastic,
        sustained_threshold_blocks = excluded.sustained_threshold_blocks,
        longest_threshold_block_s  = excluded.longest_threshold_block_s,
        vo2_blocks                 = excluded.vo2_blocks,
        longest_vo2_block_s        = excluded.longest_vo2_block_s,
        sprint_spikes              = excluded.sprint_spikes,
        recovery_score             = excluded.recovery_score,
        evidence                   = excluded.evidence
    `);
  }
  return _upsertStmt;
}

/**
 * Run stress classification for a user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {Date} options.after - Activities after this date
 * @param {Date} options.before - Activities before this date
 * @param {number} options.limit - Max activities to process
 * @param {boolean} options.forceRecompute - Recompute even if already classified
 * @param {boolean} options.ensureNormalised - Ensure normalisation exists first (default true)
 * @param {boolean} options.ensureDurability - Ensure durability exists first (default true)
 * @returns {Promise<Object>} Classification stats
 */
export async function runStressClassificationForUser(userId, options = {}) {
  console.log(`[StressRunner] Starting for user ${userId}`);
  
  const startTime = Date.now();
  const ensureNormalised = options.ensureNormalised !== false;
  const ensureDurability = options.ensureDurability !== false;
  
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
    
    console.log(`[StressRunner] Found ${activities.length} analytics activities`);
    
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
    
    // 2. Ensure prerequisites exist
    let normalisedCount = 0;
    let durabilityCount = 0;
    
    const activityIds = activities.map(a => a.id);
    const placeholders = activityIds.map(() => '?').join(',');
    
    if (ensureNormalised) {
      const normalised = db.prepare(`
        SELECT activity_id FROM activity_normalised
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const normalisedSet = new Set(normalised.map(n => n.activity_id));
      
      for (const activity of activities) {
        if (!normalisedSet.has(activity.id)) {
          console.log(`[StressRunner] Normalising ${activity.id} first...`);
          await normaliseActivity(userId, activity.id);
          normalisedCount++;
        }
      }
    }
    
    if (ensureDurability) {
      const durability = db.prepare(`
        SELECT activity_id FROM activity_durability
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const durabilitySet = new Set(durability.map(d => d.activity_id));
      
      for (const activity of activities) {
        if (!durabilitySet.has(activity.id)) {
          console.log(`[StressRunner] Computing durability for ${activity.id} first...`);
          await computeDurabilityForActivity(userId, activity.id);
          durabilityCount++;
        }
      }
    }
    
    // 3. Filter already classified (unless forceRecompute)
    let activitiesToProcess = activities;
    let skippedCount = 0;
    
    if (!options.forceRecompute) {
      const alreadyClassified = db.prepare(`
        SELECT activity_id FROM activity_stress
        WHERE user_id = ? AND activity_id IN (${placeholders})
      `).all(userId, ...activityIds);
      
      const classifiedSet = new Set(alreadyClassified.map(s => s.activity_id));
      
      activitiesToProcess = activities.filter(a => !classifiedSet.has(a.id));
      skippedCount = activities.length - activitiesToProcess.length;
    }
    
    console.log(`[StressRunner] Processing ${activitiesToProcess.length} activities (${skippedCount} skipped)`);
    
    // 4. Classify stress for each activity using the full classifier
    let computedCount = 0;
    let errorCount = 0;
    const stmt = getUpsertStmt();
    
    for (const activity of activitiesToProcess) {
      try {
        const c = classifyActivityStress(userId, activity.id);
        
        stmt.run(
          c.user_id,
          c.activity_id,
          c.computed_at,
          c.algo_version,
          c.primary_stress_type,
          c.is_stochastic,
          c.sustained_threshold_blocks,
          c.longest_threshold_block_s,
          c.vo2_blocks,
          c.longest_vo2_block_s,
          c.sprint_spikes,
          c.recovery_score,
          c.evidence
        );
        
        computedCount++;
      } catch (error) {
        console.error(`[StressRunner] Error classifying ${activity.id}:`, error.message);
        errorCount++;
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[StressRunner] Complete: ${computedCount} computed, ${skippedCount} skipped, ${errorCount} errors (${duration}ms)`);
    
    return {
      ok: true,
      stats: {
        total: activities.length,
        computed: computedCount,
        skipped: skippedCount,
        normalised: normalisedCount,
        durability: durabilityCount,
        errors: errorCount
      },
      duration_ms: duration
    };
    
  } catch (error) {
    console.error(`[StressRunner] Fatal error:`, error);
    return {
      ok: false,
      error: error.message,
      duration_ms: Date.now() - startTime
    };
  }
}

/**
 * Get stress classification status for a user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Status summary
 */
export function getStressClassificationStatus(userId) {
  const totalActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND is_valid_for_analytics = 1
  `).get(userId);
  
  const classifiedActivities = db.prepare(`
    SELECT COUNT(*) as count FROM activity_stress
    WHERE user_id = ?
  `).get(userId);
  
  const total = totalActivities?.count || 0;
  const classified = classifiedActivities?.count || 0;
  const coverage = total > 0 ? ((classified / total) * 100).toFixed(1) : '0.0';
  
  return {
    total,
    classified,
    coverage,
    missing: total - classified
  };
}
