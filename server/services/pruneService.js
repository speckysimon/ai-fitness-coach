import { createRequire } from 'module';
import { recomputeMonthlyAggregates } from './aggregationService.js';

const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

/**
 * Prune Service
 * 
 * Safely removes old detailed activities after ensuring monthly aggregates exist.
 * Implements a 180-day rolling window for detailed activity storage.
 */

/**
 * Prune old activities for a user
 * @param {number} userId - User ID
 * @param {Object} options - Pruning options
 * @param {number} options.cutoffDays - Keep activities newer than this (default: 180)
 * @param {boolean} options.dryRun - If true, only report what would be deleted
 * @param {boolean} options.createArchiveIndex - If true, create lightweight archive records
 * @returns {Object} - Pruning results
 */
export function pruneOldActivities(userId, options = {}) {
  const {
    cutoffDays = 180,
    dryRun = false,
    createArchiveIndex = true
  } = options;

  if (!userId || typeof userId !== 'number') {
    return { success: false, error: 'Invalid user ID' };
  }

  console.log(`🗑️  [Prune] ${dryRun ? 'DRY RUN - ' : ''}Pruning activities older than ${cutoffDays}d for user ${userId}`);

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
    const cutoffISO = cutoffDate.toISOString();

    // Step 1: Find activities to prune
    const candidateActivities = db.prepare(`
      SELECT id, name, type, start_time, duration_s, distance_m, tss,
             CAST(strftime('%Y', start_time) AS INTEGER) as year,
             CAST(strftime('%m', start_time) AS INTEGER) as month
      FROM activities
      WHERE user_id = ?
        AND start_time < ?
      ORDER BY start_time
    `).all(userId, cutoffISO);

    if (candidateActivities.length === 0) {
      console.log('✅ [Prune] No activities to prune');
      return {
        success: true,
        activitiesPruned: 0,
        sourcesPruned: 0,
        monthsAggregated: 0
      };
    }

    console.log(`📋 [Prune] Found ${candidateActivities.length} activities older than ${cutoffISO.split('T')[0]}`);

    // Step 2: Identify months that need aggregation
    const monthsToAggregate = new Map();
    for (const act of candidateActivities) {
      const key = `${act.year}-${act.month}`;
      if (!monthsToAggregate.has(key)) {
        monthsToAggregate.set(key, { year: act.year, month: act.month });
      }
    }

    const monthsList = Array.from(monthsToAggregate.values());
    console.log(`📊 [Prune] Need aggregates for ${monthsList.length} months`);

    // Step 3: Safety check - ensure aggregates exist for all affected months
    if (!dryRun) {
      console.log('🔒 [Prune] Computing monthly aggregates before pruning...');
      const aggResult = recomputeMonthlyAggregates(userId, monthsList);
      
      if (!aggResult.success) {
        return {
          success: false,
          error: 'Failed to compute monthly aggregates - aborting prune for safety',
          details: aggResult
        };
      }

      console.log(`✅ [Prune] Aggregates computed for ${aggResult.monthsProcessed} months`);
    }

    // Step 4: Check for race activities (never prune races)
    const raceActivities = db.prepare(`
      SELECT activity_id
      FROM race_tags
      WHERE activity_id IN (${candidateActivities.map(() => '?').join(',')})
    `).all(...candidateActivities.map(a => a.id));

    const raceIds = new Set(raceActivities.map(r => r.activity_id));
    const toPrune = candidateActivities.filter(a => !raceIds.has(a.id));
    const racesProtected = candidateActivities.length - toPrune.length;

    if (racesProtected > 0) {
      console.log(`🏆 [Prune] Protected ${racesProtected} race activities from pruning`);
    }

    if (toPrune.length === 0) {
      console.log('✅ [Prune] No non-race activities to prune');
      return {
        success: true,
        activitiesPruned: 0,
        sourcesPruned: 0,
        racesProtected,
        monthsAggregated: monthsList.length
      };
    }

    console.log(`🗑️  [Prune] Will prune ${toPrune.length} activities`);

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        wouldPrune: toPrune.length,
        racesProtected,
        oldestActivity: toPrune[0]?.start_time,
        newestActivity: toPrune[toPrune.length - 1]?.start_time,
        monthsNeedingAggregation: monthsList.length
      };
    }

    // Step 5: Create archive index if requested
    let archived = 0;
    if (createArchiveIndex) {
      console.log('📦 [Prune] Creating archive index...');
      
      const archiveStmt = db.prepare(`
        INSERT INTO activity_archive_index (
          id, user_id, name, type, start_time, duration_s, distance_m, tss,
          archive_year, archive_month, pruned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO NOTHING
      `);

      for (const act of toPrune) {
        archiveStmt.run(
          act.id,
          userId,
          act.name,
          act.type,
          act.start_time,
          act.duration_s,
          act.distance_m,
          act.tss,
          act.year,
          act.month
        );
        archived++;
      }

      console.log(`  ✓ Archived ${archived} activity records`);
    }

    // Step 6: Delete activity_sources first (foreign key constraint)
    const activityIds = toPrune.map(a => a.id);
    const sourcesDeleted = db.prepare(`
      DELETE FROM activity_sources
      WHERE activity_id IN (${activityIds.map(() => '?').join(',')})
    `).run(...activityIds);

    console.log(`  ✓ Deleted ${sourcesDeleted.changes} activity sources`);

    // Step 7: Delete activities
    const activitiesDeleted = db.prepare(`
      DELETE FROM activities
      WHERE id IN (${activityIds.map(() => '?').join(',')})
    `).run(...activityIds);

    console.log(`  ✓ Deleted ${activitiesDeleted.changes} activities`);

    console.log(`✅ [Prune] Complete: ${activitiesDeleted.changes} activities pruned, ${racesProtected} races protected`);

    return {
      success: true,
      activitiesPruned: activitiesDeleted.changes,
      sourcesPruned: sourcesDeleted.changes,
      racesProtected,
      archived,
      monthsAggregated: monthsList.length,
      oldestPruned: toPrune[0]?.start_time,
      newestPruned: toPrune[toPrune.length - 1]?.start_time
    };

  } catch (error) {
    console.error('❌ [Prune] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get pruning preview (what would be pruned)
 */
export function getPrunePreview(userId, cutoffDays = 180) {
  return pruneOldActivities(userId, { cutoffDays, dryRun: true });
}

/**
 * Get archive index for a user
 */
export function getArchiveIndex(userId, options = {}) {
  const { year, month, limit = 100 } = options;

  let query = `
    SELECT *
    FROM activity_archive_index
    WHERE user_id = ?
  `;
  const params = [userId];

  if (year) {
    query += ` AND archive_year = ?`;
    params.push(year);
  }

  if (month) {
    query += ` AND archive_month = ?`;
    params.push(month);
  }

  query += ` ORDER BY start_time DESC LIMIT ?`;
  params.push(limit);

  return db.prepare(query).all(...params);
}

export default {
  pruneOldActivities,
  getPrunePreview,
  getArchiveIndex
};
