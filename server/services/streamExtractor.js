/**
 * Stream Extractor
 * 
 * Extracts stream data from provider payloads (Strava, Intervals, FIT).
 */

/**
 * Generate deterministic time_s array
 * 
 * @param {number} length - Number of samples
 * @param {number} sampleInterval - Sample interval in seconds (default 1)
 * @returns {Array<number>} Time array
 */
function generateTimeArray(length, sampleInterval = 1) {
  return Array(length).fill(0).map((_, i) => i * sampleInterval);
}

/**
 * Infer sample interval from stream length and duration
 * 
 * @param {number} streamLength - Number of samples
 * @param {number} durationS - Duration in seconds
 * @returns {number} Inferred sample interval (rounded)
 */
function inferSampleInterval(streamLength, durationS) {
  if (!streamLength || !durationS || streamLength === 0) {
    return 1; // Default to 1Hz
  }
  const interval = durationS / streamLength;
  // Round to sensible intervals: 1, 2, 5, 10, 15, 30, 60
  const sensibleIntervals = [1, 2, 5, 10, 15, 30, 60];
  return sensibleIntervals.reduce((prev, curr) => 
    Math.abs(curr - interval) < Math.abs(prev - interval) ? curr : prev
  );
}

/**
 * Extract streams from Strava activity
 * 
 * Strava provides streams via separate API calls.
 * This extracts from the streams object if available.
 * 
 * @param {Object} stravaActivity - Strava activity object
 * @param {Object} stravaStreams - Strava streams object (from /streams API)
 * @param {Object} options - Options including duration_s for time_s generation
 * @returns {Object} Extracted streams with mandatory time_s
 */
export function extractStravaStreams(stravaActivity, stravaStreams = null, options = {}) {
  if (!stravaStreams) {
    return null;
  }
  
  const streams = {};
  let streamLength = 0;
  
  // Strava stream format: { type: 'watts', data: [...], series_type: 'distance', original_size: 3600, resolution: 'high' }
  if (stravaStreams.watts?.data) {
    streams.power = stravaStreams.watts.data;
    streamLength = streams.power.length;
  }
  
  if (stravaStreams.heartrate?.data) {
    streams.hr = stravaStreams.heartrate.data;
    streamLength = streamLength || streams.hr.length;
  }
  
  if (stravaStreams.cadence?.data) {
    streams.cadence = stravaStreams.cadence.data;
    streamLength = streamLength || streams.cadence.length;
  }
  
  if (stravaStreams.velocity_smooth?.data) {
    streams.speed = stravaStreams.velocity_smooth.data;
    streamLength = streamLength || streams.speed.length;
  }
  
  if (stravaStreams.altitude?.data) {
    streams.elevation = stravaStreams.altitude.data;
    streamLength = streamLength || streams.elevation.length;
  }
  
  // MANDATORY: time_s must always be present
  if (stravaStreams.time?.data) {
    streams.time_s = stravaStreams.time.data;
  } else if (streamLength > 0) {
    // Generate time_s deterministically
    const sampleInterval = options.duration_s 
      ? inferSampleInterval(streamLength, options.duration_s)
      : 1;
    streams.time_s = generateTimeArray(streamLength, sampleInterval);
    streams._time_s_generated = true;
    streams._sample_interval_inferred = sampleInterval;
  }
  
  return Object.keys(streams).length > 0 ? streams : null;
}

/**
 * Extract streams from Intervals.icu activity
 * 
 * Intervals provides streams in the _raw.streams array.
 * Format: [{ type: 'watts', data: [...] }, ...]
 * 
 * @param {Object} intervalsActivity - Intervals activity object
 * @param {Object} options - Options including duration_s for time_s generation
 * @returns {Object} Extracted streams with mandatory time_s
 */
export function extractIntervalsStreams(intervalsActivity, options = {}) {
  const raw = intervalsActivity._raw;
  if (!raw || !raw.streams || !Array.isArray(raw.streams)) {
    return null;
  }
  
  const streams = {};
  let streamLength = 0;
  
  for (const stream of raw.streams) {
    if (!stream.type || !stream.data || !Array.isArray(stream.data)) {
      continue;
    }
    
    switch (stream.type) {
      case 'watts':
        streams.power = stream.data;
        streamLength = streamLength || stream.data.length;
        break;
      case 'heartrate':
        streams.hr = stream.data;
        streamLength = streamLength || stream.data.length;
        break;
      case 'cadence':
        streams.cadence = stream.data;
        streamLength = streamLength || stream.data.length;
        break;
      case 'velocity_smooth':
      case 'speed':
        streams.speed = stream.data;
        streamLength = streamLength || stream.data.length;
        break;
      case 'altitude':
      case 'elevation':
        streams.elevation = stream.data;
        streamLength = streamLength || stream.data.length;
        break;
      case 'time':
        streams.time_s = stream.data;
        break;
    }
  }
  
  // MANDATORY: time_s must always be present
  if (!streams.time_s && streamLength > 0) {
    // Generate time_s deterministically
    const sampleInterval = options.duration_s 
      ? inferSampleInterval(streamLength, options.duration_s)
      : 1;
    streams.time_s = generateTimeArray(streamLength, sampleInterval);
    streams._time_s_generated = true;
    streams._sample_interval_inferred = sampleInterval;
  }
  
  return Object.keys(streams).length > 0 ? streams : null;
}

/**
 * Extract streams from FIT file data
 * 
 * FIT files contain record messages with per-second data.
 * This expects a parsed FIT structure.
 * 
 * @param {Object} fitData - Parsed FIT file data
 * @param {Object} options - Options including duration_s for time_s generation
 * @returns {Object} Extracted streams with mandatory time_s
 */
export function extractFitStreams(fitData, options = {}) {
  if (!fitData || !fitData.records || !Array.isArray(fitData.records)) {
    return null;
  }
  
  const streams = {
    power: [],
    hr: [],
    cadence: [],
    speed: [],
    elevation: [],
    time_s: []
  };
  
  let startTime = null;
  let hasTimestamps = false;
  
  for (const record of fitData.records) {
    // Track start time
    if (!startTime && record.timestamp) {
      startTime = new Date(record.timestamp).getTime() / 1000;
      hasTimestamps = true;
    }
    
    // Time (seconds from start)
    if (record.timestamp) {
      const time = new Date(record.timestamp).getTime() / 1000;
      streams.time_s.push(time - startTime);
    } else {
      streams.time_s.push(null);
    }
    
    // Power (watts)
    streams.power.push(record.power !== undefined ? record.power : null);
    
    // Heart rate (bpm)
    streams.hr.push(record.heart_rate !== undefined ? record.heart_rate : null);
    
    // Cadence (rpm)
    streams.cadence.push(record.cadence !== undefined ? record.cadence : null);
    
    // Speed (m/s)
    streams.speed.push(record.speed !== undefined ? record.speed : null);
    
    // Elevation (meters)
    streams.elevation.push(record.altitude !== undefined ? record.altitude : null);
  }
  
  // If no timestamps, generate deterministic time_s
  if (!hasTimestamps && streams.time_s.length > 0) {
    const sampleInterval = options.duration_s 
      ? inferSampleInterval(streams.time_s.length, options.duration_s)
      : 1;
    streams.time_s = generateTimeArray(streams.time_s.length, sampleInterval);
    streams._time_s_generated = true;
    streams._sample_interval_inferred = sampleInterval;
  }
  
  // Remove empty streams (except time_s which is mandatory)
  for (const key of Object.keys(streams)) {
    if (key === 'time_s') continue; // Keep time_s even if all null
    const allNull = streams[key].every(v => v === null);
    if (allNull) {
      delete streams[key];
    }
  }
  
  return Object.keys(streams).length > 0 ? streams : null;
}

/**
 * Extract streams from provider activity
 * 
 * @param {Object} providerActivity - Activity from provider
 * @param {string} provider - 'strava'|'intervals'|'fit'|'garmin_fit'|'fit_upload'
 * @param {Object} options - Additional options (e.g., stravaStreams, duration_s)
 * @returns {Object|null} Extracted streams with mandatory time_s
 */
export function extractStreams(providerActivity, provider, options = {}) {
  switch (provider) {
    case 'strava':
      return extractStravaStreams(providerActivity, options.stravaStreams, options);
    
    case 'intervals':
      return extractIntervalsStreams(providerActivity, options);
    
    case 'fit':
    case 'fit_upload':
    case 'garmin_fit':
      return extractFitStreams(providerActivity, options);
    
    default:
      return null;
  }
}

export default {
  extractStravaStreams,
  extractIntervalsStreams,
  extractFitStreams,
  extractStreams
};
