/**
 * Activity Display Class Adapter
 * 
 * CRITICAL: This adapter locks the canonical display classes used by the UI.
 * Any internal refactoring (shell flags, physiology_source, etc.) MUST NOT
 * change the output of these functions.
 * 
 * Display classes are what the UI uses for:
 * - Activity source labels/chips
 * - Validity/inclusion in analytics
 * - Filtering and grouping
 * - Classification buckets
 */

/**
 * Get display source label for UI
 * 
 * This is what shows in the UI as the "source" chip/badge.
 * LOCKED: Do not change the output values without updating UI.
 * 
 * After migration 010: Uses physiology_source (what matters for data quality)
 * Fallback: primary_source or canonical_source for backward compatibility
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {string} Display source: 'strava' | 'intervals' | 'manual' | 'fit' | 'unknown'
 */
export function getDisplaySource(activity) {
  // Prefer physiology_source (post-migration 010)
  // Fallback to primary_source or canonical_source (pre-migration)
  const source = activity.physiology_source || activity.primary_source || activity.canonical_source;
  
  if (!source) return 'unknown';
  
  // Normalize to display values
  switch (source.toLowerCase()) {
    case 'strava':
      return 'strava';
    case 'intervals':
      return 'intervals';
    case 'manual':
      return 'manual';
    case 'fit_upload':
    case 'fit':
      return 'fit';
    default:
      return 'unknown';
  }
}

/**
 * Check if activity is valid for analytics
 * 
 * LOCKED: This determines if an activity appears in:
 * - Dashboard metrics
 * - Training load calculations
 * - Performance charts
 * - Activity lists (non-debug views)
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {boolean} True if valid for analytics
 */
export function isValidForAnalytics(activity) {
  // Use is_valid_for_analytics if present (new field)
  if (activity.is_valid_for_analytics !== undefined && activity.is_valid_for_analytics !== null) {
    return activity.is_valid_for_analytics === 1;
  }
  
  // Fallback to legacy logic (pre-refactor)
  // Shell activities are never valid for analytics
  if (activity.is_shell === 1) {
    return false;
  }
  
  // Activity must have minimum viable data
  const hasMinimumData = (
    activity.duration_s > 0 &&
    activity.start_time &&
    activity.name
  );
  
  return hasMinimumData;
}

/**
 * Get activity type classification for UI grouping
 * 
 * LOCKED: Used for filtering and grouping in UI.
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {string} Type: 'cycling' | 'running' | 'swimming' | 'other'
 */
export function getActivityTypeClass(activity) {
  const sport = (activity.sport || '').toLowerCase();
  const type = (activity.type || '').toLowerCase();
  
  // Cycling
  if (sport === 'cycling' || type.includes('ride') || type.includes('cycling')) {
    return 'cycling';
  }
  
  // Running
  if (sport === 'running' || type.includes('run')) {
    return 'running';
  }
  
  // Swimming
  if (sport === 'swimming' || type.includes('swim')) {
    return 'swimming';
  }
  
  return 'other';
}

/**
 * Get data quality indicators for UI display
 * 
 * LOCKED: Used to show data quality badges/indicators.
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {Object} { hasPower, hasHR, hasStreams, quality: 'high'|'medium'|'low' }
 */
export function getDataQualityClass(activity) {
  const hasPower = activity.has_power === 1 || (activity.avg_power || 0) > 0;
  const hasHR = (activity.avg_hr || 0) > 0;
  
  // Check for streams in raw_json (if available)
  let hasStreams = false;
  if (activity.raw_json) {
    try {
      const raw = typeof activity.raw_json === 'string' 
        ? JSON.parse(activity.raw_json) 
        : activity.raw_json;
      hasStreams = !!(raw.streams || raw.stream_data);
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Determine quality level
  let quality = 'low';
  if (hasPower && hasHR && hasStreams) {
    quality = 'high';
  } else if (hasPower || hasHR) {
    quality = 'medium';
  }
  
  return {
    hasPower,
    hasHR,
    hasStreams,
    quality
  };
}

/**
 * Get ride intensity classification
 * 
 * LOCKED: Used for ride classification in UI (Recovery, Endurance, Tempo, etc.)
 * Based on TSS and duration.
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {string} Intensity: 'recovery' | 'endurance' | 'tempo' | 'threshold' | 'vo2max' | 'race' | 'unknown'
 */
export function getRideIntensityClass(activity) {
  const tss = activity.tss || 0;
  const duration = activity.duration_s || 0;
  
  if (duration === 0) return 'unknown';
  
  const durationHours = duration / 3600;
  const intensityFactor = Math.sqrt(tss / (durationHours * 100));
  
  // Classification based on intensity factor
  if (intensityFactor < 0.55) return 'recovery';
  if (intensityFactor < 0.75) return 'endurance';
  if (intensityFactor < 0.85) return 'tempo';
  if (intensityFactor < 0.95) return 'threshold';
  if (intensityFactor < 1.05) return 'vo2max';
  return 'race';
}

/**
 * Check if activity should be hidden from main views
 * 
 * LOCKED: Determines if activity is hidden in non-debug views.
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {boolean} True if should be hidden
 */
export function shouldHideFromMainViews(activity) {
  // Hide shells that haven't been enriched
  if (activity.is_shell === 1 && !isValidForAnalytics(activity)) {
    return true;
  }
  
  // Hide activities with no meaningful data
  if (!activity.duration_s || activity.duration_s === 0) {
    return true;
  }
  
  return false;
}

/**
 * Map activity to display class object
 * 
 * This is the main adapter function that maps internal DB fields
 * to stable display classes for the UI.
 * 
 * LOCKED: The output structure and values must remain stable.
 * 
 * @param {Object} activity - Activity row from DB
 * @returns {Object} Display class object
 */
export function mapToDisplayClass(activity) {
  return {
    // Core display fields
    source: getDisplaySource(activity),
    isValid: isValidForAnalytics(activity),
    typeClass: getActivityTypeClass(activity),
    intensityClass: getRideIntensityClass(activity),
    
    // Data quality
    dataQuality: getDataQualityClass(activity),
    
    // Visibility
    hideFromMain: shouldHideFromMainViews(activity),
    
    // Legacy compatibility (if UI still uses these)
    isShell: activity.is_shell === 1,
    primarySource: activity.primary_source || activity.canonical_source,
    
    // Metadata for debugging (not used in UI display logic)
    _internal: {
      physiology_source: activity.physiology_source,
      metadata_source: activity.metadata_source,
      canonical_source: activity.canonical_source,
      is_valid_for_analytics: activity.is_valid_for_analytics,
      shell_reason: activity.shell_reason
    }
  };
}

/**
 * Get expected display class counts for verification
 * 
 * Used in tests to verify display class stability after refactoring.
 * 
 * @param {Array} activities - Array of activity rows
 * @returns {Object} Counts by display class
 */
export function getDisplayClassCounts(activities) {
  const counts = {
    total: activities.length,
    bySource: {},
    byType: {},
    byIntensity: {},
    byQuality: {},
    valid: 0,
    hidden: 0
  };
  
  activities.forEach(activity => {
    const displayClass = mapToDisplayClass(activity);
    
    // Count by source
    counts.bySource[displayClass.source] = (counts.bySource[displayClass.source] || 0) + 1;
    
    // Count by type
    counts.byType[displayClass.typeClass] = (counts.byType[displayClass.typeClass] || 0) + 1;
    
    // Count by intensity
    counts.byIntensity[displayClass.intensityClass] = (counts.byIntensity[displayClass.intensityClass] || 0) + 1;
    
    // Count by quality
    counts.byQuality[displayClass.dataQuality.quality] = (counts.byQuality[displayClass.dataQuality.quality] || 0) + 1;
    
    // Count valid
    if (displayClass.isValid) counts.valid++;
    
    // Count hidden
    if (displayClass.hideFromMain) counts.hidden++;
  });
  
  return counts;
}

export default {
  getDisplaySource,
  isValidForAnalytics,
  getActivityTypeClass,
  getDataQualityClass,
  getRideIntensityClass,
  shouldHideFromMainViews,
  mapToDisplayClass,
  getDisplayClassCounts
};
