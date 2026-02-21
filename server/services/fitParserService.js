/**
 * FIT File Parser Service
 * 
 * Parses Garmin/Bryton/Wahoo .fit binary files and extracts activity summary data.
 * Uses fit-file-parser for binary decoding.
 * 
 * Returns a normalised summary object compatible with the two-table activity model.
 */

import FitParser from 'fit-file-parser';
import crypto from 'crypto';

// FIT sport enum → normalised sport name
const FIT_SPORT_MAP = {
  'cycling': 'cycling',
  'running': 'running',
  'swimming': 'swimming',
  'walking': 'walking',
  'hiking': 'walking',
  'strength_training': 'strength',
  'weight_training': 'strength',
  'generic': 'other',
  // Numeric FIT sport IDs (from Garmin FIT SDK)
  2: 'cycling',
  1: 'running',
  5: 'swimming',
  11: 'walking',
  4: 'strength',
};

let sportWarningLogged = false;

/**
 * Parse a FIT file buffer and extract activity summary
 * 
 * @param {Buffer} fileBuffer - Raw .fit file bytes
 * @param {string} fileName - Original filename (for logging)
 * @returns {Promise<{ summary: Object, fileHash: string, rawParsed: Object }>}
 */
export function parseFitFile(fileBuffer, fileName = 'unknown.fit') {
  return new Promise((resolve, reject) => {
    // Compute SHA-256 hash for deduplication
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const fitParser = new FitParser({
      force: true,
      speedUnit: 'm/s',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'list',
    });

    fitParser.parse(fileBuffer, (error, data) => {
      if (error) {
        console.error(`[FIT Parser] Parse error for ${fileName}:`, error.message);
        return reject(new Error(`Failed to parse FIT file: ${error.message}`));
      }

      if (!data) {
        return reject(new Error('FIT parser returned no data'));
      }

      try {
        const summary = extractSummary(data, fileName);
        resolve({
          summary,
          fileHash,
          rawParsed: data,
        });
      } catch (extractError) {
        console.error(`[FIT Parser] Extraction error for ${fileName}:`, extractError.message);
        reject(new Error(`Failed to extract activity data: ${extractError.message}`));
      }
    });
  });
}

/**
 * Extract activity summary from parsed FIT data
 * 
 * FIT files contain multiple message types. We prioritise:
 * 1. session messages (best summary)
 * 2. activity messages (fallback)
 * 3. record messages (compute from raw data points if needed)
 */
function extractSummary(data, fileName) {
  const sessions = data.sessions || [];
  const activities = data.activities || [];
  const records = data.records || [];
  const laps = data.laps || [];

  // Primary source: session message (most complete summary)
  const session = sessions[0] || {};

  // Extract start time
  let startTime = session.start_time || session.timestamp;
  if (!startTime && records.length > 0) {
    startTime = records[0].timestamp;
  }
  if (!startTime && activities.length > 0) {
    startTime = activities[0].timestamp;
  }

  if (!startTime) {
    throw new Error('No start time found in FIT file');
  }

  // Ensure ISO string
  if (startTime instanceof Date) {
    startTime = startTime.toISOString();
  } else if (typeof startTime === 'string' && !startTime.includes('T')) {
    startTime = new Date(startTime).toISOString();
  }

  // Duration (seconds)
  const durationS = session.total_timer_time // active time
    || session.total_elapsed_time            // wall clock time
    || computeDurationFromRecords(records)
    || null;

  // Distance (metres)
  const distanceM = session.total_distance || null;

  // Elevation (metres)
  const elevationM = session.total_ascent || null;

  // Heart rate
  const avgHr = session.avg_heart_rate || computeAvgFromRecords(records, 'heart_rate') || null;
  const maxHr = session.max_heart_rate || computeMaxFromRecords(records, 'heart_rate') || null;

  // Power
  const avgPower = session.avg_power || computeAvgFromRecords(records, 'power') || null;
  const maxPower = session.max_power || computeMaxFromRecords(records, 'power') || null;

  // Normalised power (some devices store this)
  const normalizedPower = session.normalized_power || null;

  // TSS (some devices/platforms store this)
  const tss = session.training_stress_score || null;

  // Cadence
  const avgCadence = session.avg_cadence || computeAvgFromRecords(records, 'cadence') || null;

  // Speed
  const avgSpeed = session.avg_speed || null;
  const maxSpeed = session.max_speed || null;

  // Calories
  const calories = session.total_calories || null;

  // Sport type
  const sport = detectSport(session, data);

  // Activity type (more specific)
  const type = mapSportToType(sport, session);

  // Activity name — FIT files rarely have names, construct one
  const name = buildActivityName(sport, startTime, fileName);

  console.log(`[FIT Parser] Extracted: sport=${sport}, duration=${durationS}s, distance=${distanceM}m, power=${avgPower}w, hr=${avgHr}bpm`);

  return {
    start_time: startTime,
    duration_s: durationS ? Math.round(durationS) : null,
    distance_m: distanceM ? Math.round(distanceM) : null,
    elevation_m: elevationM ? Math.round(elevationM) : null,
    avg_hr: avgHr ? Math.round(avgHr) : null,
    max_hr: maxHr ? Math.round(maxHr) : null,
    avg_power: avgPower ? Math.round(avgPower) : null,
    max_power: maxPower ? Math.round(maxPower) : null,
    normalized_power: normalizedPower ? Math.round(normalizedPower) : null,
    tss: tss ? Math.round(tss) : null,
    avg_cadence: avgCadence ? Math.round(avgCadence) : null,
    avg_speed: avgSpeed || null,
    max_speed: maxSpeed || null,
    calories: calories ? Math.round(calories) : null,
    sport,
    type,
    name,
    has_power: avgPower > 0 ? 1 : 0,
  };
}

/**
 * Detect sport from FIT session/sport messages
 */
function detectSport(session, data) {
  // Try session sport field
  if (session.sport !== undefined && session.sport !== null) {
    const mapped = FIT_SPORT_MAP[session.sport] || FIT_SPORT_MAP[String(session.sport).toLowerCase()];
    if (mapped) return mapped;
  }

  // Try sport messages
  const sports = data.sports || [];
  if (sports.length > 0 && sports[0].sport !== undefined) {
    const mapped = FIT_SPORT_MAP[sports[0].sport] || FIT_SPORT_MAP[String(sports[0].sport).toLowerCase()];
    if (mapped) return mapped;
  }

  // Try sub_sport
  if (session.sub_sport) {
    const sub = String(session.sub_sport).toLowerCase();
    if (sub.includes('virtual') || sub.includes('indoor')) return 'cycling';
    if (sub.includes('trail') || sub.includes('road')) return 'running';
  }

  // Default to cycling with a one-time warning
  if (!sportWarningLogged) {
    console.warn('[FIT Parser] No sport field found in FIT file — defaulting to cycling');
    sportWarningLogged = true;
  }

  return 'cycling';
}

/**
 * Map normalised sport to activity type string
 */
function mapSportToType(sport, session) {
  const subSport = session.sub_sport ? String(session.sub_sport).toLowerCase() : '';

  if (sport === 'cycling') {
    if (subSport.includes('virtual') || subSport.includes('indoor')) return 'VirtualRide';
    return 'Ride';
  }
  if (sport === 'running') {
    if (subSport.includes('trail')) return 'TrailRun';
    if (subSport.includes('treadmill')) return 'VirtualRun';
    return 'Run';
  }
  if (sport === 'swimming') return 'Swim';
  if (sport === 'walking') return 'Walk';
  if (sport === 'strength') return 'WeightTraining';

  return 'Workout';
}

/**
 * Build a human-readable activity name
 */
function buildActivityName(sport, startTime, fileName) {
  const date = new Date(startTime);
  const hour = date.getHours();

  let timeOfDay;
  if (hour < 6) timeOfDay = 'Early Morning';
  else if (hour < 12) timeOfDay = 'Morning';
  else if (hour < 17) timeOfDay = 'Afternoon';
  else if (hour < 21) timeOfDay = 'Evening';
  else timeOfDay = 'Night';

  const sportLabel = {
    cycling: 'Ride',
    running: 'Run',
    swimming: 'Swim',
    walking: 'Walk',
    strength: 'Workout',
    other: 'Activity',
  }[sport] || 'Activity';

  return `${timeOfDay} ${sportLabel}`;
}

/**
 * Compute duration from first/last record timestamps
 */
function computeDurationFromRecords(records) {
  if (records.length < 2) return null;
  const first = new Date(records[0].timestamp).getTime();
  const last = new Date(records[records.length - 1].timestamp).getTime();
  return (last - first) / 1000;
}

/**
 * Compute average of a field from record messages
 */
function computeAvgFromRecords(records, field) {
  const values = records
    .map(r => r[field])
    .filter(v => v !== undefined && v !== null && v > 0);

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute max of a field from record messages
 */
function computeMaxFromRecords(records, field) {
  const values = records
    .map(r => r[field])
    .filter(v => v !== undefined && v !== null && v > 0);

  if (values.length === 0) return null;
  return Math.max(...values);
}

export default { parseFitFile };
