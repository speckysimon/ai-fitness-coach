/**
 * Analytics Query Builder
 * 
 * CRITICAL: Single choke point for analytics queries.
 * All analytics queries MUST use this to ensure consistent filtering.
 * 
 * Controls:
 * - is_valid_for_analytics = 1
 * - Strava-only rides excluded if user setting = 0
 * - No direct WHERE clause construction elsewhere
 */

import db from '../db.js';

/**
 * Get base analytics WHERE clause for a user
 * 
 * CRITICAL: This is the ONLY place where analytics inclusion logic exists.
 * 
 * @param {number} userId - User ID
 * @returns {Object} { whereClause, params }
 */
export function getAnalyticsWhereClause(userId) {
  // Get user setting
  const user = db.prepare(`
    SELECT analytics_include_strava_only FROM users WHERE id = ?
  `).get(userId);
  
  const includeStravaOnly = user?.analytics_include_strava_only ?? 1;
  
  // Base clause
  let whereClause = `
    user_id = ?
    AND is_valid_for_analytics = 1
  `;
  
  const params = [userId];
  
  // Add Strava-only exclusion if setting is off
  if (includeStravaOnly === 0) {
    whereClause += `
    AND (
      physiology_source != 'strava'
      OR physiology_source IS NULL
    )`;
  }
  
  return { whereClause, params };
}

/**
 * Build analytics query with standard filtering
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @param {string} options.select - SELECT clause (default: *)
 * @param {string} options.additionalWhere - Additional WHERE conditions
 * @param {Array} options.additionalParams - Additional params for WHERE
 * @param {string} options.orderBy - ORDER BY clause
 * @param {number} options.limit - LIMIT
 * @returns {Object} { sql, params }
 */
export function buildAnalyticsQuery(userId, options = {}) {
  const {
    select = '*',
    additionalWhere = '',
    additionalParams = [],
    orderBy = 'start_time DESC',
    limit = null
  } = options;
  
  const { whereClause, params } = getAnalyticsWhereClause(userId);
  
  let sql = `
    SELECT ${select}
    FROM activities
    WHERE ${whereClause}
  `;
  
  // Add additional WHERE conditions
  if (additionalWhere) {
    sql += ` AND (${additionalWhere})`;
    params.push(...additionalParams);
  }
  
  // Add ORDER BY
  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }
  
  // Add LIMIT
  if (limit) {
    sql += ` LIMIT ?`;
    params.push(limit);
  }
  
  return { sql, params };
}

/**
 * Get analytics activities for a user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Array} Activities
 */
export function getAnalyticsActivities(userId, options = {}) {
  const { sql, params } = buildAnalyticsQuery(userId, options);
  return db.prepare(sql).all(...params);
}

/**
 * Count analytics activities for a user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {number} Count
 */
export function countAnalyticsActivities(userId, options = {}) {
  const { sql, params } = buildAnalyticsQuery(userId, {
    ...options,
    select: 'COUNT(*) as count',
    orderBy: null,
    limit: null
  });
  
  const result = db.prepare(sql).get(...params);
  return result.count;
}

/**
 * Get analytics summary for a user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Summary
 */
export function getAnalyticsSummary(userId) {
  const { whereClause, params } = getAnalyticsWhereClause(userId);
  
  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_activities,
      COUNT(DISTINCT DATE(start_time)) as total_days,
      SUM(duration_s) as total_duration_s,
      SUM(distance_m) as total_distance_m,
      SUM(elevation_m) as total_elevation_m,
      SUM(tss) as total_tss,
      AVG(avg_power) as avg_power,
      AVG(avg_hr) as avg_hr,
      COUNT(CASE WHEN physiology_source = 'intervals' THEN 1 END) as intervals_count,
      COUNT(CASE WHEN physiology_source = 'strava' THEN 1 END) as strava_count,
      COUNT(CASE WHEN physiology_source = 'fit' THEN 1 END) as fit_count
    FROM activities
    WHERE ${whereClause}
  `).get(...params);
  
  return summary;
}

/**
 * Check if user includes Strava-only rides in analytics
 * 
 * @param {number} userId - User ID
 * @returns {boolean}
 */
export function userIncludesStravaOnly(userId) {
  const user = db.prepare(`
    SELECT analytics_include_strava_only FROM users WHERE id = ?
  `).get(userId);
  
  return user?.analytics_include_strava_only === 1;
}

/**
 * Set user's Strava-only analytics preference
 * 
 * @param {number} userId - User ID
 * @param {boolean} include - Whether to include Strava-only rides
 * @returns {Object} Result
 */
export function setStravaOnlyPreference(userId, include) {
  try {
    db.prepare(`
      UPDATE users 
      SET analytics_include_strava_only = ?
      WHERE id = ?
    `).run(include ? 1 : 0, userId);
    
    console.log(`[AnalyticsQuery] User ${userId} Strava-only preference: ${include}`);
    
    return {
      ok: true,
      include
    };
  } catch (error) {
    console.error(`[AnalyticsQuery] Failed to set preference:`, error);
    return {
      ok: false,
      error: error.message
    };
  }
}

export default {
  getAnalyticsWhereClause,
  buildAnalyticsQuery,
  getAnalyticsActivities,
  countAnalyticsActivities,
  getAnalyticsSummary,
  userIncludesStravaOnly,
  setStravaOnlyPreference
};
