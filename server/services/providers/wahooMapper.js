/**
 * Wahoo Activity Mapper
 * 
 * CRITICAL: Maps Wahoo workout format to internal format.
 * Must preserve all physiology and metadata fields.
 * 
 * TODO: Implement real Wahoo field mappings
 */

/**
 * Map Wahoo workout to internal format
 * 
 * TODO: Implement complete field mapping
 * - Map all Wahoo workout fields to internal format
 * - Handle missing/null fields gracefully
 * - Preserve raw Wahoo data for debugging
 * - Map Wahoo workout types to internal sport types
 * 
 * @param {Object} wahooWorkout - Raw Wahoo workout
 * @returns {Object} Internal format activity
 */
export function mapToInternalFormat(wahooWorkout) {
  // TODO: Implement complete Wahoo field mapping
  
  // Example Wahoo workout structure:
  // {
  //   id: 123456,
  //   name: "Morning Ride",
  //   workout_type: "bike",
  //   starts: "2026-02-17T10:00:00Z",
  //   duration_seconds: 3600,
  //   distance_meters: 45000,
  //   ascent_meters: 850,
  //   power_avg: 185,
  //   power_max: 450,
  //   power_normalized: 195,
  //   heart_rate_avg: 145,
  //   heart_rate_max: 175,
  //   cadence_avg: 85,
  //   speed_avg: 12.5,
  //   speed_max: 18.2,
  //   calories: 850,
  //   file_url: "https://...",
  //   has_power_meter: true
  // }
  
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
 * TODO: Implement activity type detection
 * - Determine if FIT file is available
 * - Check workout source (ELEMNT, KICKR, etc.)
 * - Detect indoor vs outdoor
 * 
 * @param {Object} wahooWorkout - Raw Wahoo workout
 * @returns {string} Activity type
 */
export function detectActivityType(wahooWorkout) {
  // TODO: Implement type detection logic
  
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
 * TODO: Complete sport type mapping
 * - Add all Wahoo workout types
 * - Handle edge cases
 * 
 * @param {string} wahooType - Wahoo workout type
 * @returns {string} Internal sport type
 */
function mapSportType(wahooType) {
  // TODO: Add complete Wahoo workout type mapping
  
  const mapping = {
    'bike': 'cycling',
    'indoor_bike': 'cycling',
    'mountain_bike': 'cycling',
    'gravel': 'cycling',
    'run': 'running',
    'trail_run': 'running',
    'treadmill': 'running',
    'swim': 'swimming',
    'open_water_swim': 'swimming',
    // TODO: Add more workout types
  };
  
  return mapping[wahooType] || 'cycling';
}

/**
 * Map Wahoo workout type to internal activity type
 * 
 * TODO: Complete activity type mapping
 * 
 * @param {string} wahooType - Wahoo workout type
 * @returns {string} Internal activity type
 */
function mapActivityType(wahooType) {
  // TODO: Add complete activity type mapping
  
  const mapping = {
    'bike': 'Ride',
    'indoor_bike': 'Ride',
    'mountain_bike': 'Ride',
    'gravel': 'Ride',
    'run': 'Run',
    'trail_run': 'Run',
    'treadmill': 'Run',
    'swim': 'Swim',
    'open_water_swim': 'Swim',
    // TODO: Add more activity types
  };
  
  return mapping[wahooType] || 'Ride';
}

/**
 * Map Wahoo streams to internal format
 * 
 * TODO: Implement stream mapping from FIT file
 * - Parse FIT file downloaded from Wahoo
 * - Extract power, HR, cadence, speed streams
 * - Use fitParserService for parsing
 * 
 * @param {Buffer} fitFile - FIT file data
 * @returns {Object} Internal format streams
 */
export function mapStreams(fitFile) {
  // TODO: Implement stream mapping from FIT file
  
  // This would typically use fitParserService
  // const parsed = parseFitFile(fitFile);
  // return {
  //   power: parsed.power,
  //   hr: parsed.heartRate,
  //   cadence: parsed.cadence,
  //   speed: parsed.speed,
  //   altitude: parsed.altitude,
  //   distance: parsed.distance,
  //   time: parsed.time
  // };
  
  return {
    power: null,
    hr: null,
    cadence: null,
    speed: null,
    altitude: null,
    distance: null,
    time: null
  };
}

export default {
  mapToInternalFormat,
  detectActivityType,
  mapStreams
};
