/**
 * Garmin Activity Mapper
 * 
 * CRITICAL: Maps Garmin Connect activity format to internal format.
 * Must preserve all physiology and metadata fields.
 * 
 * TODO: Implement real Garmin field mappings
 */

/**
 * Map Garmin activity to internal format
 * 
 * TODO: Implement complete field mapping
 * - Map all Garmin activity fields to internal format
 * - Handle missing/null fields gracefully
 * - Preserve raw Garmin data for debugging
 * - Map Garmin sport types to internal sport types
 * 
 * @param {Object} garminActivity - Raw Garmin activity
 * @returns {Object} Internal format activity
 */
export function mapToInternalFormat(garminActivity) {
  // TODO: Implement complete Garmin field mapping
  
  // Example Garmin activity structure:
  // {
  //   activityId: 123456789,
  //   activityName: "Morning Ride",
  //   description: "Great ride!",
  //   startTimeGMT: "2026-02-17T10:00:00.0",
  //   startTimeLocal: "2026-02-17T11:00:00.0",
  //   activityType: { typeKey: "cycling" },
  //   distance: 45000,  // meters
  //   duration: 3600,  // seconds
  //   elevationGain: 850,  // meters
  //   avgPower: 185,  // watts
  //   maxPower: 450,
  //   normPower: 195,
  //   avgHR: 145,  // bpm
  //   maxHR: 175,
  //   avgRunCadence: null,
  //   avgBikeCadence: 85,  // rpm
  //   avgSpeed: 12.5,  // m/s
  //   maxSpeed: 18.2,
  //   calories: 850
  // }
  
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
 * TODO: Implement activity type detection
 * - Determine if this is native Garmin data
 * - Check if FIT file is available
 * - Detect manual vs auto-synced activities
 * 
 * @param {Object} garminActivity - Raw Garmin activity
 * @returns {string} Activity type
 */
export function detectActivityType(garminActivity) {
  // TODO: Implement type detection logic
  
  // Check if FIT file is available (highest quality)
  if (garminActivity.hasFit || garminActivity.fileFormat === 'FIT') {
    return 'fit';
  }
  
  // Check if this is a manual entry
  if (garminActivity.manual || garminActivity.activityType?.isManual) {
    return 'garmin_manual';
  }
  
  // Default: native Garmin data
  return 'garmin_native';
}

/**
 * Map Garmin sport type to internal sport type
 * 
 * TODO: Complete sport type mapping
 * - Add all Garmin sport types
 * - Handle edge cases
 * 
 * @param {string} garminType - Garmin sport type key
 * @returns {string} Internal sport type
 */
function mapSportType(garminType) {
  // TODO: Add complete Garmin sport type mapping
  
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
    'lap_swimming': 'swimming',
    // TODO: Add more sport types
  };
  
  return mapping[garminType] || 'cycling';
}

/**
 * Map Garmin activity type to internal activity type
 * 
 * TODO: Complete activity type mapping
 * 
 * @param {string} garminType - Garmin activity type key
 * @returns {string} Internal activity type
 */
function mapActivityType(garminType) {
  // TODO: Add complete activity type mapping
  
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
    'lap_swimming': 'Swim',
    // TODO: Add more activity types
  };
  
  return mapping[garminType] || 'Ride';
}

/**
 * Calculate timezone offset from GMT and local times
 * 
 * TODO: Implement timezone offset calculation
 * 
 * @param {string} gmtTime - GMT time string
 * @param {string} localTime - Local time string
 * @returns {number} Offset in minutes
 */
function calculateTimezoneOffset(gmtTime, localTime) {
  // TODO: Implement proper timezone offset calculation
  
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

/**
 * Map Garmin streams to internal format
 * 
 * TODO: Implement stream mapping
 * - Map power stream
 * - Map HR stream
 * - Map cadence stream
 * - Map speed/altitude streams
 * 
 * @param {Object} garminStreams - Raw Garmin streams
 * @returns {Object} Internal format streams
 */
export function mapStreams(garminStreams) {
  // TODO: Implement stream mapping
  
  return {
    power: garminStreams.power || null,
    hr: garminStreams.heartRate || null,
    cadence: garminStreams.cadence || null,
    speed: garminStreams.speed || null,
    altitude: garminStreams.altitude || null,
    distance: garminStreams.distance || null,
    time: garminStreams.time || null
  };
}

export default {
  mapToInternalFormat,
  detectActivityType,
  mapStreams
};
