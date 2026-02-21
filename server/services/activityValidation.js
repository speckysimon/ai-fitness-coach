/**
 * Activity Validation Service
 * 
 * Deterministic validation rules for activity data quality.
 * Used by canonical selector to reject shells and ensure data integrity.
 * 
 * CRITICAL: These functions determine what can become canonical.
 */

/**
 * Check if activity has valid core fields
 * 
 * Valid activity MUST have:
 * - Non-zero duration
 * - Non-zero distance (for cycling/running) OR power/HR data
 * - Valid start time
 * 
 * @param {Object} activity - Activity data (any provider format)
 * @returns {boolean} True if valid for canonical use
 */
export function isValidActivity(activity) {
  // Extract fields with multiple fallbacks
  const duration = activity.duration_s || activity.moving_time || activity.elapsed_time || activity.duration || 0;
  const distance = activity.distance_m || activity.distance || 0;
  const startTime = activity.start_time || activity.start_date || activity.start_date_local;
  
  // Must have valid start time
  if (!startTime) {
    return false;
  }
  
  // Must have non-zero duration
  if (duration === 0) {
    return false;
  }
  
  // For cycling/running: must have distance OR power/HR data
  const sport = activity.sport || activity.type || '';
  const isCyclingOrRunning = /cycling|ride|run/i.test(sport);
  
  if (isCyclingOrRunning) {
    const hasPower = (activity.avg_power || activity.average_watts || activity.avgPower || 0) > 0;
    const hasHR = (activity.avg_hr || activity.average_heartrate || activity.avgHeartRate || 0) > 0;
    
    // Must have distance OR at least one physiological metric
    if (distance === 0 && !hasPower && !hasHR) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if activity is a shell (placeholder with missing data)
 * 
 * Shell characteristics:
 * - Duration = 0 OR distance = 0 (for cycling/running)
 * - No power, HR, or TSS data
 * - Often has numeric ID (Strava ID in Intervals)
 * 
 * @param {Object} activity - Activity data (any provider format)
 * @param {Object} options - Additional context
 * @returns {Object} { isShell: boolean, reason: string, confidence: number }
 */
export function isShellActivity(activity, options = {}) {
  const { provider = null, providerId = null } = options;
  
  // Extract fields
  const duration = activity.duration_s || activity.moving_time || activity.elapsed_time || activity.duration || 0;
  const distance = activity.distance_m || activity.distance || 0;
  const startTime = activity.start_time || activity.start_date || activity.start_date_local;
  
  const hasPower = (activity.avg_power || activity.average_watts || activity.avgPower || 0) > 0;
  const hasHR = (activity.avg_hr || activity.average_heartrate || activity.avgHeartRate || 0) > 0;
  const hasTSS = (activity.tss || activity.suffer_score || activity.icu_training_load || 0) > 0;
  
  // Check 1: Missing start time = definitely shell
  if (!startTime) {
    return {
      isShell: true,
      reason: 'missing_start_time',
      confidence: 1.0
    };
  }
  
  // Check 2: Zero duration = definitely shell
  if (duration === 0) {
    return {
      isShell: true,
      reason: 'zero_duration',
      confidence: 1.0
    };
  }
  
  // Check 3: Zero distance AND no metrics = likely shell
  if (distance === 0 && !hasPower && !hasHR && !hasTSS) {
    return {
      isShell: true,
      reason: 'zero_distance_no_metrics',
      confidence: 0.95
    };
  }
  
  // Check 4: Intervals-specific shell detection (numeric ID)
  if (provider === 'intervals' && providerId) {
    const isNumericId = /^\d+$/.test(String(providerId));
    
    if (isNumericId) {
      // Numeric ID in Intervals = Strava sync placeholder
      // If it also lacks data, it's definitely a shell
      if (distance === 0 || (!hasPower && !hasHR)) {
        return {
          isShell: true,
          reason: 'intervals_numeric_id_missing_data',
          confidence: 0.98,
          stravaId: String(providerId)
        };
      }
      
      // Numeric ID but has data = enriched shell or native Strava sync
      return {
        isShell: false,
        reason: 'intervals_numeric_id_has_data',
        confidence: 0.8,
        stravaId: String(providerId)
      };
    }
  }
  
  // Check 5: Very short duration with no metrics = suspicious
  if (duration < 300 && !hasPower && !hasHR && !hasTSS) {
    return {
      isShell: true,
      reason: 'very_short_no_metrics',
      confidence: 0.85
    };
  }
  
  // Check 6: "Untitled" name with missing data
  const name = activity.name || '';
  const isUntitled = /untitled|unnamed|^$/i.test(name);
  
  if (isUntitled && (distance === 0 || (!hasPower && !hasHR))) {
    return {
      isShell: true,
      reason: 'untitled_missing_data',
      confidence: 0.9
    };
  }
  
  // Not a shell
  return {
    isShell: false,
    reason: 'has_valid_data',
    confidence: 0.95
  };
}

/**
 * Check if activity has sufficient data for analytics
 * 
 * Analytics require:
 * - Valid activity (not shell)
 * - Duration >= 5 minutes
 * - Power OR HR data
 * 
 * @param {Object} activity - Activity data
 * @returns {boolean} True if sufficient for analytics
 */
export function hasSufficientDataForAnalytics(activity) {
  if (!isValidActivity(activity)) {
    return false;
  }
  
  const duration = activity.duration_s || activity.moving_time || activity.elapsed_time || activity.duration || 0;
  
  // Must be at least 5 minutes
  if (duration < 300) {
    return false;
  }
  
  // Must have power OR HR
  const hasPower = (activity.avg_power || activity.average_watts || activity.avgPower || 0) > 0;
  const hasHR = (activity.avg_hr || activity.average_heartrate || activity.avgHeartRate || 0) > 0;
  
  return hasPower || hasHR;
}

/**
 * Validate activity for canonical selection
 * 
 * Returns detailed validation result with reasons.
 * 
 * @param {Object} activity - Activity data
 * @param {Object} options - Validation options
 * @returns {Object} { valid: boolean, reasons: string[], warnings: string[] }
 */
export function validateForCanonical(activity, options = {}) {
  const { provider = null, providerId = null, incomingType = null } = options;
  
  const reasons = [];
  const warnings = [];
  
  // Check if shell
  const shellCheck = isShellActivity(activity, { provider, providerId });
  
  if (shellCheck.isShell) {
    reasons.push(`Shell detected: ${shellCheck.reason} (confidence: ${shellCheck.confidence})`);
    
    // Shells with high confidence should never be canonical
    if (shellCheck.confidence >= 0.9) {
      return {
        valid: false,
        reasons,
        warnings,
        shellCheck
      };
    }
  }
  
  // Check if valid activity
  if (!isValidActivity(activity)) {
    reasons.push('Missing core fields (duration, distance, or start time)');
    return {
      valid: false,
      reasons,
      warnings,
      shellCheck
    };
  }
  
  // Check for analytics sufficiency
  if (!hasSufficientDataForAnalytics(activity)) {
    warnings.push('Insufficient data for analytics (duration < 5min or no power/HR)');
  }
  
  // Check for missing metadata
  const name = activity.name || '';
  if (!name || /untitled|unnamed/i.test(name)) {
    warnings.push('Missing or generic name');
  }
  
  const distance = activity.distance_m || activity.distance || 0;
  if (distance === 0) {
    warnings.push('Missing distance');
  }
  
  // Valid for canonical
  return {
    valid: true,
    reasons: ['Passed validation checks'],
    warnings,
    shellCheck
  };
}

/**
 * Determine if incoming activity can safely backfill missing fields
 * 
 * Backfill rules:
 * - Strava can backfill distance, elevation, speed if canonical lacks them
 * - NEVER backfill power, HR, or other physiology metrics
 * - Only backfill if canonical source is not the same provider
 * 
 * @param {Object} canonical - Existing canonical activity
 * @param {Object} incoming - Incoming activity data
 * @param {string} incomingProvider - Provider of incoming data
 * @returns {Object} { canBackfill: boolean, fields: string[] }
 */
export function canBackfillFields(canonical, incoming, incomingProvider) {
  // Never backfill if same provider
  if (canonical.metadata_source === incomingProvider) {
    return { canBackfill: false, fields: [] };
  }
  
  const backfillableFields = [];
  
  // Distance
  if ((!canonical.distance_m || canonical.distance_m === 0) && incoming.distance_m > 0) {
    backfillableFields.push('distance_m');
  }
  
  // Elevation
  if ((!canonical.elevation_gain || canonical.elevation_gain === 0) && incoming.elevation_gain > 0) {
    backfillableFields.push('elevation_gain');
  }
  
  // Speed
  if ((!canonical.avg_speed || canonical.avg_speed === 0) && incoming.avg_speed > 0) {
    backfillableFields.push('avg_speed');
  }
  
  // Max speed
  if ((!canonical.max_speed || canonical.max_speed === 0) && incoming.max_speed > 0) {
    backfillableFields.push('max_speed');
  }
  
  return {
    canBackfill: backfillableFields.length > 0,
    fields: backfillableFields
  };
}

export default {
  isValidActivity,
  isShellActivity,
  hasSufficientDataForAnalytics,
  validateForCanonical,
  canBackfillFields
};
