/**
 * Activity Shell Resolver Service
 * 
 * Handles shell activity detection, deduplication, and enrichment orchestration
 * for the RiderLabs ingestion pipeline.
 * 
 * Shell activities are Intervals.icu placeholders for Strava-synced activities
 * that have numeric IDs and missing core fields.
 */

import db from '../db.js';

// Source priority for canonical activity selection (higher = better)
export const SOURCE_PRIORITY = {
  fit: 4,           // Raw device data - highest priority
  strava: 3,        // Full Strava data
  intervals: 2,     // Native Intervals data
  intervals_shell: 1 // Intervals shell (placeholder)
};

// Reason codes for structured logging
export const REASON_CODES = {
  SHELL_DETECTED: 'SHELL_DETECTED',
  STRAVA_ENRICH_OK: 'STRAVA_ENRICH_OK',
  STRAVA_ENRICH_SKIPPED_NOT_CONNECTED: 'STRAVA_ENRICH_SKIPPED_NOT_CONNECTED',
  MERGED_EXISTING_CANONICAL: 'MERGED_EXISTING_CANONICAL',
  CREATED_CANONICAL_FROM_STRAVA: 'CREATED_CANONICAL_FROM_STRAVA',
  CREATED_SOURCE_ONLY: 'CREATED_SOURCE_ONLY',
  UPGRADED_CANONICAL_SOURCE: 'UPGRADED_CANONICAL_SOURCE',
  SKIPPED_DUPLICATE: 'SKIPPED_DUPLICATE',
  CREATED_CANONICAL_FROM_INTERVALS: 'CREATED_CANONICAL_FROM_INTERVALS',
  CREATED_CANONICAL_FROM_FIT: 'CREATED_CANONICAL_FROM_FIT'
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
 * @returns {{ isShell: boolean, stravaId: string|null, reason: string }}
 */
export function detectIntervalsShell(intervalsActivity) {
  const id = intervalsActivity.id || intervalsActivity.activity_id;
  
  // Check if ID is numeric (Strava ID pattern)
  const isNumericId = /^\d+$/.test(String(id));
  
  if (!isNumericId) {
    // Native Intervals activities start with 'i'
    return { isShell: false, stravaId: null, reason: 'native_intervals_id' };
  }
  
  // Numeric ID - potential shell
  const stravaId = String(id);
  
  // Check for missing core fields
  const duration = intervalsActivity.duration || intervalsActivity.moving_time || 0;
  const distance = intervalsActivity.distance || 0;
  const hasStartDate = !!intervalsActivity.start_date || !!intervalsActivity.start_time;
  
  // Shell if: numeric ID AND (no duration OR no distance OR no start date)
  if (duration === 0 || distance === 0 || !hasStartDate) {
    return { 
      isShell: true, 
      stravaId, 
      reason: `missing_core_fields:duration=${duration},distance=${distance},hasStartDate=${hasStartDate}` 
    };
  }
  
  // Additional check: no meaningful metrics
  const hasPower = (intervalsActivity.avgPower || intervalsActivity.average_watts || 0) > 0;
  const hasHR = (intervalsActivity.avgHeartRate || intervalsActivity.average_heartrate || 0) > 0;
  const hasTSS = (intervalsActivity.tss || intervalsActivity.icu_training_load || 0) > 0;
  
  if (!hasPower && !hasHR && !hasTSS) {
    return { 
      isShell: true, 
      stravaId, 
      reason: 'no_metrics' 
    };
  }
  
  // Has numeric ID but has data - likely enriched shell or native Strava sync
  return { isShell: false, stravaId, reason: 'has_data' };
}

/**
 * Resolve canonical activity for incoming activity
 * 
 * Determines action based on:
 * - Existing canonical activities
 * - Source priority
 * - Shell status
 * - Strava connectivity
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {Object} params.activity - Incoming activity data
 * @param {string} params.provider - 'intervals' | 'strava' | 'fit'
 * @param {string} params.providerId - Provider's activity ID
 * @param {boolean} params.isShell - Is this a shell activity?
 * @param {string} params.stravaId - Strava ID (if shell)
 * @param {boolean} params.stravaConnected - Is Strava connected?
 * @returns {Object} Resolution decision
 */
export function resolveCanonicalActivity({ 
  userId, 
  activity, 
  provider, 
  providerId,
  isShell, 
  stravaId, 
  stravaConnected 
}) {
  const startTime = activity.start_time || activity.start_date;
  const duration = activity.duration_s || activity.duration || activity.moving_time || 0;
  
  // 1. Check if this exact provider record already exists
  const existingSource = db.prepare(`
    SELECT activity_id, is_shell FROM activity_sources 
    WHERE user_id = ? AND provider = ? AND provider_id = ?
  `).get(userId, provider, providerId);
  
  if (existingSource) {
    if (existingSource.activity_id) {
      // Source already linked to canonical
      return {
        action: 'skip',
        canonicalActivityId: existingSource.activity_id,
        reason: REASON_CODES.SKIPPED_DUPLICATE,
        shouldEnrich: false
      };
    } else {
      // Source exists but not linked - pending enrichment
      if (isShell && stravaConnected && stravaId) {
        return {
          action: 'enrich_existing_source',
          canonicalActivityId: null,
          reason: REASON_CODES.SHELL_DETECTED,
          shouldEnrich: true,
          stravaId
        };
      }
    }
  }
  
  // 2. Check for existing canonical by fuzzy matching
  const existing = findExistingCanonical(userId, startTime, duration, stravaId);
  
  if (existing) {
    // Canonical exists - determine if we should upgrade it
    const existingPriority = SOURCE_PRIORITY[existing.canonical_source] || 0;
    const incomingPriority = isShell ? SOURCE_PRIORITY.intervals_shell : SOURCE_PRIORITY[provider];
    
    if (incomingPriority > existingPriority) {
      // Upgrade canonical to higher priority source
      return {
        action: 'merge_into_existing',
        canonicalActivityId: existing.id,
        reason: REASON_CODES.UPGRADED_CANONICAL_SOURCE,
        shouldEnrich: false,
        shouldUpgrade: true
      };
    } else {
      // Keep existing canonical, just attach new source
      return {
        action: 'merge_into_existing',
        canonicalActivityId: existing.id,
        reason: REASON_CODES.MERGED_EXISTING_CANONICAL,
        shouldEnrich: false,
        shouldUpgrade: false
      };
    }
  }
  
  // 3. No existing canonical
  if (isShell) {
    // Shell activity
    if (stravaConnected && stravaId) {
      // Strava connected - queue for enrichment
      return {
        action: 'create_source_only',
        canonicalActivityId: null,
        reason: REASON_CODES.SHELL_DETECTED,
        shouldEnrich: true,
        stravaId
      };
    } else {
      // Strava not connected - store as source only, mark as invalid for analytics
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
      reason: `CREATED_CANONICAL_FROM_${provider.toUpperCase()}`,
      shouldEnrich: false
    };
  }
}

/**
 * Find existing canonical activity by fuzzy matching
 * 
 * Match criteria:
 * 1. Exact Strava ID match (if provided)
 * 2. Time + duration fuzzy match
 * 
 * @param {number} userId
 * @param {string} startTime
 * @param {number} duration
 * @param {string} stravaId - Optional Strava ID for exact matching
 * @returns {Object|null} Existing activity or null
 */
function findExistingCanonical(userId, startTime, duration, stravaId = null) {
  // 1. Try exact Strava ID match first (if provided)
  if (stravaId) {
    const byStravaId = db.prepare(`
      SELECT a.* FROM activities a
      JOIN activity_sources s ON s.activity_id = a.id
      WHERE s.user_id = ? 
        AND s.provider = 'strava' 
        AND s.provider_id = ?
        AND a.is_valid_for_analytics = 1
      LIMIT 1
    `).get(userId, stravaId);
    
    if (byStravaId) return byStravaId;
  }
  
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
    } else if (!candidate.duration_s && !duration) {
      // Both missing duration - match on time alone
      return candidate;
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
  detectIntervalsShell,
  resolveCanonicalActivity,
  isStravaConnected,
  getPendingShellEnrichments,
  SOURCE_PRIORITY,
  REASON_CODES
};
