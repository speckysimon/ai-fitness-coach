/**
 * Wahoo Workout Mapper (STUB)
 * 
 * CRITICAL: This must be a PURE FUNCTION module.
 * NO side effects, NO database access, NO imports except utilities.
 */

/**
 * Map Wahoo workout to internal format
 * 
 * CRITICAL: This is a pure function - no side effects.
 * 
 * @param {Object} wahooWorkout - Raw Wahoo workout
 * @returns {Object} Internal format activity
 */
export function mapToInternalFormat(wahooWorkout) {
  return {
    // Provider metadata
    provider_id: String(wahooWorkout.id),
    
    // Metadata fields
    name: wahooWorkout.name || 'Untitled Workout',
    description: wahooWorkout.notes || null,
    sport: mapSportType(wahooWorkout.workout_type),
    type: mapActivityType(wahooWorkout.workout_type),
    start_time: wahooWorkout.starts,
    timezone_offset_min: 0,  // TODO: Extract from workout data if available
    
    // Physiology fields
    duration_s: wahooWorkout.duration_seconds || 0,
    distance_m: wahooWorkout.distance_meters || null,
    elevation_m: wahooWorkout.ascent_meters || null,
    avg_power: wahooWorkout.power_avg || null,
    max_power: wahooWorkout.power_max || null,
    normalized_power: wahooWorkout.power_normalized || null,
    tss: wahooWorkout.tss || null,
    avg_hr: wahooWorkout.heart_rate_avg || null,
    max_hr: wahooWorkout.heart_rate_max || null,
    avg_cadence: wahooWorkout.cadence_avg || null,
    avg_speed: wahooWorkout.speed_avg || null,
    max_speed: wahooWorkout.speed_max || null,
    calories: wahooWorkout.calories || null,
    
    // Flags
    has_power: !!(wahooWorkout.power_avg || wahooWorkout.has_power_meter),
    
    // Raw (for debugging/reprocessing)
    _raw: wahooWorkout
  };
}

/**
 * Detect Wahoo activity type
 * 
 * @param {Object} wahooWorkout - Raw Wahoo workout
 * @returns {string} Activity type
 */
export function detectActivityType(wahooWorkout) {
  // Check if FIT file is available (highest quality)
  if (wahooWorkout.file_url || wahooWorkout.has_file) {
    return 'fit';
  }
  
  // Default: native Wahoo data
  return 'wahoo_native';
}

/**
 * Map Wahoo workout type to internal sport type
 * 
 * @param {string} wahooType - Wahoo workout type
 * @returns {string} Internal sport type
 */
function mapSportType(wahooType) {
  const mapping = {
    'bike': 'cycling',
    'indoor_bike': 'cycling',
    'mountain_bike': 'cycling',
    'gravel': 'cycling',
    'run': 'running',
    'trail_run': 'running',
    'treadmill': 'running',
    'swim': 'swimming',
    'open_water_swim': 'swimming'
  };
  
  return mapping[wahooType] || 'cycling';
}

/**
 * Map Wahoo workout type to internal activity type
 * 
 * @param {string} wahooType - Wahoo workout type
 * @returns {string} Internal activity type
 */
function mapActivityType(wahooType) {
  const mapping = {
    'bike': 'Ride',
    'indoor_bike': 'Ride',
    'mountain_bike': 'Ride',
    'gravel': 'Ride',
    'run': 'Run',
    'trail_run': 'Run',
    'treadmill': 'Run',
    'swim': 'Swim',
    'open_water_swim': 'Swim'
  };
  
  return mapping[wahooType] || 'Ride';
}

export default {
  mapToInternalFormat,
  detectActivityType
};
