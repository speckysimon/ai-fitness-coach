/**
 * Activity Integrity Guard
 * 
 * Purpose: Enforce structural integrity constraints on activity data
 * 
 * Guards:
 * 1. Shells cannot be valid for analytics
 * 2. Valid activities must have physiology source
 * 3. Intervals-native physiology cannot be overwritten by Strava
 * 4. No duplicate canonicals for same external ID
 * 5. No orphaned sources
 */

import db from '../db.js';

/**
 * Verify activity integrity for a user
 * 
 * @param {number} userId - User ID to verify
 * @returns {Object} Verification result with issues found
 */
export function verifyActivityIntegrity(userId) {
  const issues = [];
  
  // Check 1: No valid activities with duration 0
  const invalidDuration = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_valid_for_analytics = 1
      AND (duration_s = 0 OR duration_s IS NULL)
  `).get(userId);
  
  if (invalidDuration.count > 0) {
    issues.push({
      type: 'INVALID_DURATION',
      severity: 'ERROR',
      count: invalidDuration.count,
      message: `${invalidDuration.count} valid activities have zero or null duration`
    });
  }
  
  // Check 2: No shells marked as valid
  const shellsValid = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_shell = 1
      AND is_valid_for_analytics = 1
  `).get(userId);
  
  if (shellsValid.count > 0) {
    issues.push({
      type: 'SHELL_MARKED_VALID',
      severity: 'ERROR',
      count: shellsValid.count,
      message: `${shellsValid.count} shell activities are marked as valid for analytics`
    });
  }
  
  // Check 3: Valid activities must have physiology source
  const noPhysiologySource = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_valid_for_analytics = 1
      AND physiology_source IS NULL
  `).get(userId);
  
  if (noPhysiologySource.count > 0) {
    issues.push({
      type: 'MISSING_PHYSIOLOGY_SOURCE',
      severity: 'ERROR',
      count: noPhysiologySource.count,
      message: `${noPhysiologySource.count} valid activities have no physiology source`
    });
  }
  
  // Check 4: No duplicate canonicals for same external ID
  const duplicateCanonicals = db.prepare(`
    SELECT 
      s.provider,
      s.provider_id,
      COUNT(DISTINCT s.activity_id) as canonical_count
    FROM activity_sources s
    JOIN activities a ON a.id = s.activity_id
    WHERE a.user_id = ?
      AND s.activity_id IS NOT NULL
    GROUP BY s.provider, s.provider_id
    HAVING COUNT(DISTINCT s.activity_id) > 1
  `).all(userId);
  
  if (duplicateCanonicals.length > 0) {
    issues.push({
      type: 'DUPLICATE_CANONICALS',
      severity: 'ERROR',
      count: duplicateCanonicals.length,
      message: `${duplicateCanonicals.length} external IDs have multiple canonical activities`,
      details: duplicateCanonicals
    });
  }
  
  // Check 5: No orphaned sources (source with activity_id that doesn't exist)
  const orphanedSources = db.prepare(`
    SELECT COUNT(*) as count FROM activity_sources s
    WHERE s.user_id = ?
      AND s.activity_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM activities a 
        WHERE a.id = s.activity_id AND a.user_id = s.user_id
      )
  `).get(userId);
  
  if (orphanedSources.count > 0) {
    issues.push({
      type: 'ORPHANED_SOURCES',
      severity: 'WARNING',
      count: orphanedSources.count,
      message: `${orphanedSources.count} sources reference non-existent activities`
    });
  }
  
  // Check 6: Shells should have no physiology source
  const shellsWithPhysiology = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_shell = 1
      AND physiology_source IS NOT NULL
  `).get(userId);
  
  if (shellsWithPhysiology.count > 0) {
    issues.push({
      type: 'SHELL_HAS_PHYSIOLOGY',
      severity: 'WARNING',
      count: shellsWithPhysiology.count,
      message: `${shellsWithPhysiology.count} shell activities have physiology source (should be NULL)`
    });
  }
  
  // Check 7: Activities with physiology should have metadata
  const physiologyNoMetadata = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND physiology_source IS NOT NULL
      AND metadata_source IS NULL
  `).get(userId);
  
  if (physiologyNoMetadata.count > 0) {
    issues.push({
      type: 'PHYSIOLOGY_NO_METADATA',
      severity: 'WARNING',
      count: physiologyNoMetadata.count,
      message: `${physiologyNoMetadata.count} activities have physiology but no metadata source`
    });
  }
  
  return {
    ok: issues.length === 0,
    userId,
    issueCount: issues.length,
    errorCount: issues.filter(i => i.severity === 'ERROR').length,
    warningCount: issues.filter(i => i.severity === 'WARNING').length,
    issues
  };
}

/**
 * Guard against Intervals-native physiology overwrites
 * 
 * Call this before updating activity physiology fields
 * 
 * @param {string} activityId - Activity ID
 * @param {string} incomingProvider - Provider attempting update
 * @param {Object} physiologyFields - Fields being updated
 * @returns {Object} Guard result
 */
export function guardIntervalsPhysiology(activityId, incomingProvider, physiologyFields) {
  const activity = db.prepare(`
    SELECT physiology_source FROM activities WHERE id = ?
  `).get(activityId);
  
  if (!activity) {
    return {
      allowed: false,
      reason: 'ACTIVITY_NOT_FOUND',
      message: `Activity ${activityId} not found`
    };
  }
  
  // If existing physiology is Intervals-native and incoming is Strava, BLOCK
  if (activity.physiology_source === 'intervals' && incomingProvider === 'strava') {
    return {
      allowed: false,
      reason: 'INTERVALS_NATIVE_PROTECTED',
      message: 'Cannot overwrite Intervals-native physiology with Strava data',
      existingSource: activity.physiology_source,
      incomingProvider
    };
  }
  
  // Otherwise allow
  return {
    allowed: true,
    reason: 'OK',
    existingSource: activity.physiology_source,
    incomingProvider
  };
}

/**
 * Guard against shell activities being marked valid
 * 
 * @param {string} activityId - Activity ID
 * @param {boolean} isValidForAnalytics - Proposed validity
 * @returns {Object} Guard result
 */
export function guardShellValidity(activityId, isValidForAnalytics) {
  const activity = db.prepare(`
    SELECT is_shell FROM activities WHERE id = ?
  `).get(activityId);
  
  if (!activity) {
    return {
      allowed: false,
      reason: 'ACTIVITY_NOT_FOUND',
      message: `Activity ${activityId} not found`
    };
  }
  
  // If shell and trying to mark valid, BLOCK
  if (activity.is_shell === 1 && isValidForAnalytics === true) {
    return {
      allowed: false,
      reason: 'SHELL_CANNOT_BE_VALID',
      message: 'Shell activities cannot be marked as valid for analytics'
    };
  }
  
  return {
    allowed: true,
    reason: 'OK'
  };
}

/**
 * Get activity integrity summary for a user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Summary statistics
 */
export function getIntegritySummary(userId) {
  const summary = {
    userId,
    totalActivities: 0,
    validActivities: 0,
    shellActivities: 0,
    byPhysiologySource: {},
    byMetadataSource: {},
    withoutPhysiology: 0,
    withoutMetadata: 0
  };
  
  // Total activities
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM activities WHERE user_id = ?
  `).get(userId);
  summary.totalActivities = total.count;
  
  // Valid activities
  const valid = db.prepare(`
    SELECT COUNT(*) as count FROM activities 
    WHERE user_id = ? AND is_valid_for_analytics = 1
  `).get(userId);
  summary.validActivities = valid.count;
  
  // Shell activities
  const shells = db.prepare(`
    SELECT COUNT(*) as count FROM activities 
    WHERE user_id = ? AND is_shell = 1
  `).get(userId);
  summary.shellActivities = shells.count;
  
  // By physiology source
  const byPhysiology = db.prepare(`
    SELECT physiology_source, COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY physiology_source
  `).all(userId);
  
  byPhysiology.forEach(row => {
    const source = row.physiology_source || 'none';
    summary.byPhysiologySource[source] = row.count;
  });
  
  // By metadata source
  const byMetadata = db.prepare(`
    SELECT metadata_source, COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY metadata_source
  `).all(userId);
  
  byMetadata.forEach(row => {
    const source = row.metadata_source || 'none';
    summary.byMetadataSource[source] = row.count;
  });
  
  // Without physiology
  const noPhys = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND physiology_source IS NULL
  `).get(userId);
  summary.withoutPhysiology = noPhys.count;
  
  // Without metadata
  const noMeta = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ? AND metadata_source IS NULL
  `).get(userId);
  summary.withoutMetadata = noMeta.count;
  
  return summary;
}

/**
 * Fix common integrity issues (use with caution)
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Fix options
 * @returns {Object} Fix result
 */
export function fixIntegrityIssues(userId, options = {}) {
  const fixes = [];
  
  db.prepare('BEGIN TRANSACTION').run();
  
  try {
    // Fix 1: Mark shells as invalid for analytics
    if (options.fixShellValidity !== false) {
      const result = db.prepare(`
        UPDATE activities
        SET is_valid_for_analytics = 0
        WHERE user_id = ? AND is_shell = 1 AND is_valid_for_analytics = 1
      `).run(userId);
      
      if (result.changes > 0) {
        fixes.push({
          type: 'SHELL_VALIDITY',
          count: result.changes,
          message: `Marked ${result.changes} shells as invalid for analytics`
        });
      }
    }
    
    // Fix 2: Set physiology source to NULL for shells
    if (options.fixShellPhysiology !== false) {
      const result = db.prepare(`
        UPDATE activities
        SET physiology_source = NULL
        WHERE user_id = ? AND is_shell = 1 AND physiology_source IS NOT NULL
      `).run(userId);
      
      if (result.changes > 0) {
        fixes.push({
          type: 'SHELL_PHYSIOLOGY',
          count: result.changes,
          message: `Cleared physiology source for ${result.changes} shells`
        });
      }
    }
    
    // Fix 3: Mark activities with no duration as invalid
    if (options.fixInvalidDuration !== false) {
      const result = db.prepare(`
        UPDATE activities
        SET is_valid_for_analytics = 0
        WHERE user_id = ? 
          AND is_valid_for_analytics = 1
          AND (duration_s = 0 OR duration_s IS NULL)
      `).run(userId);
      
      if (result.changes > 0) {
        fixes.push({
          type: 'INVALID_DURATION',
          count: result.changes,
          message: `Marked ${result.changes} zero-duration activities as invalid`
        });
      }
    }
    
    db.prepare('COMMIT').run();
    
    return {
      ok: true,
      userId,
      fixCount: fixes.length,
      fixes
    };
  } catch (error) {
    db.prepare('ROLLBACK').run();
    return {
      ok: false,
      userId,
      error: error.message,
      fixes: []
    };
  }
}

export default {
  verifyActivityIntegrity,
  guardIntervalsPhysiology,
  guardShellValidity,
  getIntegritySummary,
  fixIntegrityIssues
};
