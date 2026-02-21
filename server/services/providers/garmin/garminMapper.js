/**
 * Garmin Activity Mapper (STUB)
 * 
 * CRITICAL: This must be a PURE FUNCTION module.
 * NO side effects, NO database access, NO imports except utilities.
 */

/**
 * Map Garmin activity to internal format
 * 
 * CRITICAL: This is a pure function - no side effects.
 * 
 * @param {Object} garminActivity - Raw Garmin activity
 * @returns {Object} Internal format activity
 */
export function mapToInternalFormat(garminActivity) {
  return {
    // Provider metadata
    provider_id: String(garminActivity.activityId),
    
    // Metadata fields
    name: garminActivity.activityName || 'Untitled Activity',
    description: garminActivity.description || null,
    sport: mapSportType(garminActivity.activityType?.typeKey),
    type: mapActivityType(garminActivity.activityType?.typeKey),
    start_time: garminActivity.startTimeGMT,
    timezone_offset_min: calculateTimezoneOffset(
      garminActivity.startTimeGMT,
      garminActivity.startTimeLocal
    ),
    
    // Physiology fields
    duration_s: garminActivity.duration || 0,
    distance_m: garminActivity.distance || null,
    elevation_m: garminActivity.elevationGain || null,
    avg_power: garminActivity.avgPower || null,
    max_power: garminActivity.maxPower || null,
    normalized_power: garminActivity.normPower || null,
    tss: garminActivity.trainingStressScore || null,
    avg_hr: garminActivity.avgHR || null,
    max_hr: garminActivity.maxHR || null,
    avg_cadence: garminActivity.avgBikeCadence || garminActivity.avgRunCadence || null,
    avg_speed: garminActivity.avgSpeed || null,
    max_speed: garminActivity.maxSpeed || null,
    calories: garminActivity.calories || null,
    
    // Flags
    has_power: !!(garminActivity.avgPower || garminActivity.maxPower),
    
    // Raw (for debugging/reprocessing)
    _raw: garminActivity
  };
}

/**
 * Detect Garmin activity type
 * 
 * @param {Object} garminActivity - Raw Garmin activity
 * @returns {string} Activity type
 */
export function detectActivityType(garminActivity) {
  // Check if FIT file is available (highest quality)
  if (garminActivity.hasFit || garminActivity.fileFormat === 'FIT') {
    return 'fit';
  }
  
  // Check if manual entry
  if (garminActivity.manual || garminActivity.activityType?.isManual) {
    return 'garmin_manual';
  }
  
  // Default: native Garmin data
  return 'garmin_native';
}

/**
 * Map Garmin sport type to internal sport type
 * 
 * @param {string} garminType - Garmin sport type key
 * @returns {string} Internal sport type
 */
function mapSportType(garminType) {
  const mapping = {
    'cycling': 'cycling',
    'road_biking': 'cycling',
    'mountain_biking': 'cycling',
    'gravel_cycling': 'cycling',
    'indoor_cycling': 'cycling',
    'virtual_ride': 'cycling',
    'running': 'running',
    'trail_running': 'running',
    'treadmill_running': 'running',
    'swimming': 'swimming',
    'open_water_swimming': 'swimming',
    'lap_swimming': 'swimming'
  };
  
  return mapping[garminType] || 'cycling';
}

/**
 * Map Garmin activity type to internal activity type
 * 
 * @param {string} garminType - Garmin activity type key
 * @returns {string} Internal activity type
 */
function mapActivityType(garminType) {
  const mapping = {
    'cycling': 'Ride',
    'road_biking': 'Ride',
    'mountain_biking': 'Ride',
    'gravel_cycling': 'Ride',
    'indoor_cycling': 'Ride',
    'virtual_ride': 'Virtual Ride',
    'running': 'Run',
    'trail_running': 'Run',
    'treadmill_running': 'Run',
    'swimming': 'Swim',
    'open_water_swimming': 'Swim',
    'lap_swimming': 'Swim'
  };
  
  return mapping[garminType] || 'Ride';
}

/**
 * Calculate timezone offset from GMT and local times
 * 
 * @param {string} gmtTime - GMT time string
 * @param {string} localTime - Local time string
 * @returns {number} Offset in minutes
 */
function calculateTimezoneOffset(gmtTime, localTime) {
  if (!gmtTime || !localTime) {
    return 0;
  }
  
  try {
    const gmt = new Date(gmtTime);
    const local = new Date(localTime);
    const diffMs = local.getTime() - gmt.getTime();
    return Math.round(diffMs / (60 * 1000));
  } catch (error) {
    console.error('[GarminMapper] Failed to calculate timezone offset:', error);
    return 0;
  }
}

export default {
  mapToInternalFormat,
  detectActivityType
};
