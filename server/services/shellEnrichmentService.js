/**
 * Shell Activity Enrichment Service
 * 
 * Handles detection and enrichment of Intervals.icu shell activities
 * (Strava-synced placeholders with missing data)
 */

import db from '../db.js';

// Source priority for canonical activity selection (higher = better)
export const SOURCE_PRIORITY = {
  fit: 4,           // Raw device data - highest priority
  strava: 3,        // Full Strava data
  intervals: 2,     // Native Intervals data
  intervals_shell: 1 // Intervals shell (placeholder)
};

// Reason codes for logging
export const REASON_CODES = {
  SHELL_DETECTED: 'SHELL_DETECTED',
  STRAVA_ENRICH_OK: 'STRAVA_ENRICH_OK',
  STRAVA_ENRICH_SKIPPED_NOT_CONNECTED: 'STRAVA_ENRICH_SKIPPED_NOT_CONNECTED',
  MERGED_EXISTING_CANONICAL: 'MERGED_EXISTING_CANONICAL',
  CREATED_CANONICAL_FROM_STRAVA: 'CREATED_CANONICAL_FROM_STRAVA',
  CREATED_SOURCE_ONLY: 'CREATED_SOURCE_ONLY',
  UPGRADED_CANONICAL_SOURCE: 'UPGRADED_CANONICAL_SOURCE',
  SKIPPED_DUPLICATE: 'SKIPPED_DUPLICATE'
};

/**
 * Detect if an Intervals activity is a shell (Strava placeholder)
 * 
 * Heuristics:
 * - Activity ID is numeric (Strava ID)
 * - Missing key fields (duration == 0 OR distance == 0)
 * - No meaningful metrics
 * 
 * @param {Object} intervalsActivity - Activity from Intervals.icu
 * @returns {boolean} True if shell activity
 */
export function isIntervalsShell(intervalsActivity) {
  const id = intervalsActivity.id || intervalsActivity.activity_id;
  
  // Check if ID is numeric (Strava ID pattern)
  const isNumericId = /^\d+$/.test(String(id));
  
  if (!isNumericId) {
    // Native Intervals activities start with 'i'
    return false;
  }
  
  // Check for missing core fields
  const duration = intervalsActivity.duration || intervalsActivity.moving_time || 0;
  const distance = intervalsActivity.distance || 0;
  const hasStartDate = !!intervalsActivity.start_date || !!intervalsActivity.start_time;
  
  // Shell if: numeric ID AND (no duration OR no distance OR no start date)
  const isMissingCoreFields = duration === 0 || distance === 0 || !hasStartDate;
  
  if (isNumericId && isMissingCoreFields) {
    return true;
  }
  
  // Additional check: no meaningful metrics
  const hasPower = (intervalsActivity.avgPower || intervalsActivity.average_watts || 0) > 0;
  const hasHR = (intervalsActivity.avgHeartRate || intervalsActivity.average_heartrate || 0) > 0;
  const hasTSS = (intervalsActivity.tss || intervalsActivity.icu_training_load || 0) > 0;
  
  const hasAnyMetrics = hasPower || hasHR || hasTSS;
  
  // Shell if: numeric ID AND no metrics
  if (isNumericId && !hasAnyMetrics) {
    return true;
  }
  
  return false;
}

/**
 * Extract Strava ID from Intervals shell activity
 * 
 * @param {Object} intervalsActivity - Shell activity
 * @returns {string|null} Strava activity ID
 */
export function extractStravaId(intervalsActivity) {
  const id = intervalsActivity.id || intervalsActivity.activity_id;
  
  // If numeric, it's the Strava ID
  if (/^\d+$/.test(String(id))) {
    return String(id);
  }
  
  return null;
}

/**
 * Resolve canonical activity for incoming activity
 * 
 * Determines action: skip, create_source_only, upsert_canonical, merge_into_existing
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {Object} params.activity - Incoming activity data
 * @param {string} params.provider - 'intervals' | 'strava' | 'fit'
 * @param {boolean} params.isShell - Is this a shell activity?
 * @param {string} params.stravaId - Strava ID (if shell)
 * @param {boolean} params.stravaConnected - Is Strava connected?
 * @returns {Object} { action, canonicalActivityId, reason, shouldEnrich }
 */
export function resolveCanonicalActivity({ userId, activity, provider, isShell, stravaId, stravaConnected }) {
  const startTime = activity.start_time || activity.start_date;
  const duration = activity.duration_s || activity.duration || activity.moving_time || 0;
  
  // Check if canonical already exists for this exact activity
  const existing = findExistingCanonical(userId, provider, activity.provider_id, startTime, duration);
  
  if (existing) {
    // Canonical exists - check if we should upgrade it
    const existingPriority = SOURCE_PRIORITY[existing.canonical_source] || 0;
    const incomingPriority = isShell ? SOURCE_PRIORITY.intervals_shell : SOURCE_PRIORITY[provider];
    
    if (incomingPriority > existingPriority) {
      // Upgrade canonical to higher priority source
      return {
        action: 'merge_into_existing',
        canonicalActivityId: existing.id,
        reason: REASON_CODES.UPGRADED_CANONICAL_SOURCE,
        shouldEnrich: false
      };
    } else {
      // Keep existing canonical, just attach new source
      return {
        action: 'merge_into_existing',
        canonicalActivityId: existing.id,
        reason: REASON_CODES.MERGED_EXISTING_CANONICAL,
        shouldEnrich: false
      };
    }
  }
  
  // No existing canonical
  if (isShell) {
    // Shell activity
    if (stravaConnected && stravaId) {
      // Strava connected - enrich from Strava
      return {
        action: 'create_source_only',
        canonicalActivityId: null,
        reason: REASON_CODES.SHELL_DETECTED,
        shouldEnrich: true,
        stravaId
      };
    } else {
      // Strava not connected - store as source only
      return {
        action: 'create_source_only',
        canonicalActivityId: null,
        reason: REASON_CODES.STRAVA_ENRICH_SKIPPED_NOT_CONNECTED,
        shouldEnrich: false
      };
    }
  } else {
    // Valid activity - create canonical
    return {
      action: 'upsert_canonical',
      canonicalActivityId: null,
      reason: 'CREATE_CANONICAL',
      shouldEnrich: false
    };
  }
}

/**
 * Find existing canonical activity by fuzzy matching
 * 
 * @param {number} userId
 * @param {string} provider
 * @param {string} providerId
 * @param {string} startTime
 * @param {number} duration
 * @returns {Object|null} Existing activity or null
 */
function findExistingCanonical(userId, provider, providerId, startTime, duration) {
  // 1. Check by provider ID in activity_sources
  const bySource = db.prepare(`
    SELECT a.* FROM activities a
    JOIN activity_sources s ON s.activity_id = a.id
    WHERE s.user_id = ? AND s.provider = ? AND s.provider_id = ?
    LIMIT 1
  `).get(userId, provider, providerId);
  
  if (bySource) return bySource;
  
  // 2. Fuzzy match by time + duration
  if (!startTime) return null;
  
  const TIME_WINDOW_MS = 5 * 60 * 1000; // ±5 minutes
  const DURATION_TOLERANCE = 0.20; // ±20%
  
  const incomingTime = new Date(startTime).getTime();
  const minTime = new Date(incomingTime - TIME_WINDOW_MS).toISOString();
  const maxTime = new Date(incomingTime + TIME_WINDOW_MS).toISOString();
  
  const candidates = db.prepare(`
    SELECT * FROM activities
    WHERE user_id = ?
      AND start_time >= ?
      AND start_time <= ?
      AND is_valid_for_analytics = 1
  `).all(userId, minTime, maxTime);
  
  for (const candidate of candidates) {
    if (candidate.duration_s && duration) {
      const durationRatio = Math.abs(candidate.duration_s - duration) / candidate.duration_s;
      if (durationRatio <= DURATION_TOLERANCE) {
        return candidate;
      }
    }
  }
  
  return null;
}

/**
 * Check if user has Strava connected
 * 
 * @param {number} userId
 * @returns {boolean}
 */
export function isStravaConnected(userId) {
  const tokens = db.prepare(`
    SELECT access_token FROM strava_tokens WHERE user_id = ?
  `).get(userId);
  
  return !!tokens?.access_token;
}

/**
 * Get shell activities pending enrichment
 * 
 * @param {number} userId
 * @param {number} limit
 * @returns {Array} Shell activities with Strava IDs
 */
export function getPendingShellEnrichments(userId, limit = 50) {
  return db.prepare(`
    SELECT 
      s.id as source_id,
      s.provider_id,
      s.shell_strava_id,
      s.raw_json
    FROM activity_sources s
    WHERE s.user_id = ?
      AND s.is_shell = 1
      AND s.shell_strava_id IS NOT NULL
      AND s.activity_id IS NULL
    ORDER BY s.created_at DESC
    LIMIT ?
  `).all(userId, limit);
}

export default {
  isIntervalsShell,
  extractStravaId,
  resolveCanonicalActivity,
  isStravaConnected,
  getPendingShellEnrichments,
  SOURCE_PRIORITY,
  REASON_CODES
};
