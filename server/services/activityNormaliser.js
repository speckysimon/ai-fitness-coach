/**
 * Activity Normaliser
 * 
 * Computes stable, reproducible derived physiology features for coaching logic.
 * 
 * CRITICAL: This is deterministic - no AI, no fragile heuristics.
 * All computations must be idempotent (re-running produces same output).
 */

import db from '../db.js';
import zlib from 'zlib';
import { getUserThresholds } from './athleteThresholdsService.js';

const ALGO_VERSION = 'norm_v1';

// Default power zones (% of FTP)
const DEFAULT_POWER_ZONES = {
  z1: { min: 0, max: 0.55 },      // Recovery
  z2: { min: 0.55, max: 0.75 },   // Endurance
  z3: { min: 0.75, max: 0.90 },   // Tempo
  z4: { min: 0.90, max: 1.05 },   // Threshold
  z5: { min: 1.05, max: 1.20 },   // VO2max
  z6: { min: 1.20, max: 1.50 },   // Anaerobic
  z7: { min: 1.50, max: 999 }     // Neuromuscular
};

// Default HR zones (% of max HR)
const DEFAULT_HR_ZONES = {
  z1: { min: 0, max: 0.60 },      // Recovery
  z2: { min: 0.60, max: 0.75 },   // Endurance
  z3: { min: 0.75, max: 0.85 },   // Tempo
  z4: { min: 0.85, max: 0.95 },   // Threshold
  z5: { min: 0.95, max: 999 }     // VO2max
};

/**
 * Get canonical streams for an activity
 * 
 * TODO: Replace with actual stream storage when implemented.
 * For now, returns mock structure.
 * 
 * @param {string} activityId - Activity ID
 * @returns {Object|null} Streams object or null
 */
function decompressColumn(val) {
  if (!val) return null;
  try {
    const buf = Buffer.from(val, 'base64');
    const json = zlib.gunzipSync(buf).toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

function getCanonicalStreams(activityId) {
  const row = db.prepare(`
    SELECT power, hr, cadence, speed, elevation, time_s, stream_format
    FROM activity_streams WHERE activity_id = ?
  `).get(activityId);
  if (!row) return null;
  if (row.stream_format === 'json_gzip_base64') {
    return {
      power:     decompressColumn(row.power),
      hr:        decompressColumn(row.hr),
      cadence:   decompressColumn(row.cadence),
      speed:     decompressColumn(row.speed),
      elevation: decompressColumn(row.elevation),
      time:      decompressColumn(row.time_s),
    };
  }
  return null;
}

/**
 * Get user zones (FTP, max HR) via the shared thresholds resolver.
 */
function getUserZones(userId) {
  const t = getUserThresholds(userId);
  return {
    ftp:   t.ftp_w,
    maxHr: t.fthr_bpm ? Math.round(t.fthr_bpm / 0.92) : 180,
  };
}

/**
 * Compute time in zones
 * 
 * @param {Array<number>} stream - Power or HR stream (values per second)
 * @param {Object} zones - Zone definitions
 * @param {number} reference - Reference value (FTP or max HR)
 * @returns {Object} Seconds per zone
 */
export function computeTimeInZones(stream, zones, reference) {
  if (!stream || stream.length === 0) {
    return null;
  }
  
  const timeInZones = {};
  
  // Initialize all zones to 0
  Object.keys(zones).forEach(zone => {
    timeInZones[zone] = 0;
  });
  
  // Count seconds in each zone
  stream.forEach(value => {
    if (value === null || value === undefined || value === 0) {
      return;
    }
    
    const normalized = value / reference;
    
    // Find which zone this value belongs to
    for (const [zone, range] of Object.entries(zones)) {
      if (normalized >= range.min && normalized < range.max) {
        timeInZones[zone]++;
        break;
      }
    }
  });
  
  return timeInZones;
}

/**
 * Compute longest sustained efforts per zone
 * 
 * Uses simple rolling window to find longest continuous effort in each zone.
 * 
 * @param {Array<number>} stream - Power or HR stream
 * @param {Object} zones - Zone definitions
 * @param {number} reference - Reference value (FTP or max HR)
 * @param {Array<number>} minDurations - Minimum durations to check (seconds)
 * @returns {Object} Longest effort per zone
 */
export function computeLongestSustainedEfforts(stream, zones, reference, minDurations = [300, 600, 1200]) {
  if (!stream || stream.length === 0) {
    return null;
  }
  
  const longestEfforts = {};
  
  // For each zone, find longest continuous effort
  Object.keys(zones).forEach(zone => {
    const range = zones[zone];
    let currentDuration = 0;
    let currentSum = 0;
    let maxDuration = 0;
    let maxSum = 0;
    
    stream.forEach(value => {
      if (value === null || value === undefined || value === 0) {
        // Gap in data - reset current effort
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration;
          maxSum = currentSum;
        }
        currentDuration = 0;
        currentSum = 0;
        return;
      }
      
      const normalized = value / reference;
      
      if (normalized >= range.min && normalized < range.max) {
        // In zone - continue effort
        currentDuration++;
        currentSum += value;
      } else {
        // Out of zone - check if this was longest effort
        if (currentDuration > maxDuration) {
          maxDuration = currentDuration;
          maxSum = currentSum;
        }
        currentDuration = 0;
        currentSum = 0;
      }
    });
    
    // Check final effort
    if (currentDuration > maxDuration) {
      maxDuration = currentDuration;
      maxSum = currentSum;
    }
    
    // Only store if meets minimum duration threshold
    const minDuration = Math.min(...minDurations);
    if (maxDuration >= minDuration) {
      longestEfforts[zone] = {
        duration_s: maxDuration,
        avg_value: maxDuration > 0 ? Math.round(maxSum / maxDuration) : 0
      };
    }
  });
  
  return Object.keys(longestEfforts).length > 0 ? longestEfforts : null;
}

/**
 * Compute HR drift (decoupling)
 * 
 * Simple approach: compare first half vs second half HR at similar power.
 * If no power available, use HR-only drift.
 * 
 * @param {Array<number>} hrStream - HR stream
 * @param {Array<number>|null} powerStream - Power stream (optional)
 * @param {number} duration - Activity duration in seconds
 * @returns {number|null} HR drift percentage
 */
export function computeHrDrift(hrStream, powerStream, duration) {
  if (!hrStream || hrStream.length === 0) {
    return null;
  }
  
  // Split into halves
  const midpoint = Math.floor(hrStream.length / 2);
  const firstHalf = hrStream.slice(0, midpoint);
  const secondHalf = hrStream.slice(midpoint);
  
  if (powerStream && powerStream.length === hrStream.length) {
    // Power available - compute HR at similar power levels
    const firstHalfPower = powerStream.slice(0, midpoint);
    const secondHalfPower = powerStream.slice(midpoint);
    
    // Calculate average power for each half
    const avgPowerFirst = calculateAverage(firstHalfPower);
    const avgPowerSecond = calculateAverage(secondHalfPower);
    
    // Only compute drift if power is relatively stable (within 10%)
    const powerVariation = Math.abs(avgPowerSecond - avgPowerFirst) / avgPowerFirst;
    if (powerVariation > 0.10) {
      // Power too variable - can't reliably compute decoupling
      return null;
    }
    
    // Calculate average HR for each half
    const avgHrFirst = calculateAverage(firstHalf);
    const avgHrSecond = calculateAverage(secondHalf);
    
    if (!avgHrFirst || !avgHrSecond) {
      return null;
    }
    
    // Drift = (HR2 - HR1) / HR1 * 100
    return ((avgHrSecond - avgHrFirst) / avgHrFirst) * 100;
    
  } else {
    // No power - simple HR drift
    const avgHrFirst = calculateAverage(firstHalf);
    const avgHrSecond = calculateAverage(secondHalf);
    
    if (!avgHrFirst || !avgHrSecond) {
      return null;
    }
    
    return ((avgHrSecond - avgHrFirst) / avgHrFirst) * 100;
  }
}

/**
 * Compute power fade (fatigue)
 * 
 * Compare average power of first third vs final third.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @returns {number|null} Power fade percentage
 */
export function computePowerFade(powerStream) {
  if (!powerStream || powerStream.length === 0) {
    return null;
  }
  
  const thirdLength = Math.floor(powerStream.length / 3);
  
  if (thirdLength < 60) {
    // Activity too short for meaningful fade calculation
    return null;
  }
  
  const firstThird = powerStream.slice(0, thirdLength);
  const finalThird = powerStream.slice(-thirdLength);
  
  const avgPowerFirst = calculateAverage(firstThird);
  const avgPowerFinal = calculateAverage(finalThird);
  
  if (!avgPowerFirst || !avgPowerFinal) {
    return null;
  }
  
  // Fade = (P1 - P3) / P1 * 100
  // Positive = power dropped (fatigue)
  // Negative = power increased (pacing issue or warmup)
  return ((avgPowerFirst - avgPowerFinal) / avgPowerFirst) * 100;
}

/**
 * Compute Variability Index (VI)
 * 
 * VI = Normalized Power / Average Power
 * Higher VI = more variable pacing
 * 
 * @param {number} np - Normalized power
 * @param {number} avgPower - Average power
 * @returns {number|null} Variability index
 */
export function computeVariabilityIndex(np, avgPower) {
  if (!np || !avgPower || avgPower === 0) {
    return null;
  }
  
  return np / avgPower;
}

/**
 * Compute quality score
 * 
 * Assesses data completeness and quality.
 * Score: 0-100
 * 
 * @param {Object} params - Quality parameters
 * @param {boolean} params.hasPower - Has power data
 * @param {boolean} params.hasHr - Has HR data
 * @param {boolean} params.hasCadence - Has cadence data
 * @param {boolean} params.hasStreams - Has stream data
 * @param {number} params.streamCompleteness - % of stream with valid data
 * @param {number} params.duration - Activity duration
 * @returns {Object} { score, notes }
 */
export function computeQualityScore(params) {
  let score = 0;
  const notes = [];
  
  // Base score for having activity
  score += 20;
  
  // Sensor availability (40 points)
  if (params.hasPower) {
    score += 15;
  } else {
    notes.push('NO_POWER');
  }
  
  if (params.hasHr) {
    score += 15;
  } else {
    notes.push('NO_HR');
  }
  
  if (params.hasCadence) {
    score += 10;
  } else {
    notes.push('NO_CADENCE');
  }
  
  // Stream availability (20 points)
  if (params.hasStreams) {
    score += 20;
  } else {
    notes.push('NO_STREAMS');
    // Can't assess completeness without streams
    return { score, notes };
  }
  
  // Stream completeness (20 points)
  if (params.streamCompleteness >= 0.95) {
    score += 20;
  } else if (params.streamCompleteness >= 0.80) {
    score += 15;
    notes.push('MINOR_GAPS');
  } else if (params.streamCompleteness >= 0.60) {
    score += 10;
    notes.push('MODERATE_GAPS');
  } else {
    score += 5;
    notes.push('MAJOR_GAPS');
  }
  
  // Duration check
  if (params.duration < 300) {
    notes.push('SHORT_ACTIVITY');
  }
  
  return { score: Math.min(100, score), notes };
}

/**
 * Calculate average of array, ignoring nulls and zeros
 * 
 * @param {Array<number>} arr - Array of numbers
 * @returns {number|null} Average
 */
function calculateAverage(arr) {
  if (!arr || arr.length === 0) {
    return null;
  }
  
  const validValues = arr.filter(v => v !== null && v !== undefined && v !== 0);
  
  if (validValues.length === 0) {
    return null;
  }
  
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  return sum / validValues.length;
}

/**
 * Calculate stream completeness
 * 
 * @param {Array<number>} stream - Stream data
 * @returns {number} Completeness ratio (0-1)
 */
function calculateStreamCompleteness(stream) {
  if (!stream || stream.length === 0) {
    return 0;
  }
  
  const validPoints = stream.filter(v => v !== null && v !== undefined && v !== 0).length;
  return validPoints / stream.length;
}

/**
 * Normalise a single activity
 * 
 * Computes all derived metrics and stores in activity_normalised table.
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @param {Object} options - Options
 * @returns {Object} Normalisation result
 */
export async function normaliseActivity(userId, activityId, options = {}) {
  console.log(`[Normaliser] Processing activity ${activityId} for user ${userId}`);
  
  try {
    // 1. Get activity from database
    const activity = db.prepare(`
      SELECT 
        id, user_id, duration_s, distance_m, avg_power, normalized_power,
        avg_hr, max_hr, avg_cadence, has_power
      FROM activities
      WHERE id = ? AND user_id = ?
    `).get(activityId, userId);
    
    if (!activity) {
      return {
        ok: false,
        error: 'ACTIVITY_NOT_FOUND',
        activityId
      };
    }
    
    // 2. Get user zones
    const userZones = getUserZones(userId);
    
    // 3. Get streams
    const streams = getCanonicalStreams(activityId);
    
    // 4. Initialize result
    const result = {
      user_id: userId,
      activity_id: activityId,
      computed_at: new Date().toISOString(),
      algo_version: ALGO_VERSION,
      has_power: activity.has_power ? 1 : 0,
      has_hr: activity.avg_hr ? 1 : 0,
      has_cadence: activity.avg_cadence ? 1 : 0,
      has_streams: streams ? 1 : 0,
      duration_s: activity.duration_s,
      distance_m: activity.distance_m,
      avg_power: activity.avg_power,
      np: activity.normalized_power,
      avg_hr: activity.avg_hr
    };
    
    // 5. Compute power-based metrics
    if (streams?.power && activity.has_power) {
      // Time in zones
      const powerZones = computeTimeInZones(
        streams.power,
        DEFAULT_POWER_ZONES,
        userZones.ftp
      );
      result.time_in_zones_power = powerZones ? JSON.stringify(powerZones) : null;
      
      // Longest efforts
      const powerEfforts = computeLongestSustainedEfforts(
        streams.power,
        DEFAULT_POWER_ZONES,
        userZones.ftp
      );
      result.longest_efforts_power = powerEfforts ? JSON.stringify(powerEfforts) : null;
      
      // Power fade
      result.power_fade_pct = computePowerFade(streams.power);
      
      // Variability Index
      result.vi = computeVariabilityIndex(activity.normalized_power, activity.avg_power);
    } else {
      result.time_in_zones_power = null;
      result.longest_efforts_power = null;
      result.power_fade_pct = null;
      result.vi = null;
    }
    
    // 6. Compute HR-based metrics
    if (streams?.hr && activity.avg_hr) {
      // Time in zones
      const hrZones = computeTimeInZones(
        streams.hr,
        DEFAULT_HR_ZONES,
        userZones.maxHr
      );
      result.time_in_zones_hr = hrZones ? JSON.stringify(hrZones) : null;
      
      // Longest efforts
      const hrEfforts = computeLongestSustainedEfforts(
        streams.hr,
        DEFAULT_HR_ZONES,
        userZones.maxHr
      );
      result.longest_efforts_hr = hrEfforts ? JSON.stringify(hrEfforts) : null;
      
      // HR drift
      result.hr_drift_pct = computeHrDrift(
        streams.hr,
        streams?.power,
        activity.duration_s
      );
    } else {
      result.time_in_zones_hr = null;
      result.longest_efforts_hr = null;
      result.hr_drift_pct = null;
    }
    
    // 7. Compute quality score
    const streamCompleteness = streams?.power 
      ? calculateStreamCompleteness(streams.power)
      : 0;
    
    const quality = computeQualityScore({
      hasPower: result.has_power === 1,
      hasHr: result.has_hr === 1,
      hasCadence: result.has_cadence === 1,
      hasStreams: result.has_streams === 1,
      streamCompleteness,
      duration: activity.duration_s
    });
    
    result.quality_score = quality.score;
    result.notes = JSON.stringify(quality.notes);
    
    // 8. Upsert into database
    db.prepare(`
      INSERT INTO activity_normalised (
        user_id, activity_id, computed_at, algo_version,
        has_power, has_hr, has_cadence, has_streams,
        duration_s, distance_m, avg_power, np, avg_hr,
        hr_drift_pct, power_fade_pct, vi,
        time_in_zones_power, time_in_zones_hr,
        longest_efforts_power, longest_efforts_hr,
        quality_score, notes
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?
      )
      ON CONFLICT(user_id, activity_id) DO UPDATE SET
        computed_at = excluded.computed_at,
        algo_version = excluded.algo_version,
        has_power = excluded.has_power,
        has_hr = excluded.has_hr,
        has_cadence = excluded.has_cadence,
        has_streams = excluded.has_streams,
        duration_s = excluded.duration_s,
        distance_m = excluded.distance_m,
        avg_power = excluded.avg_power,
        np = excluded.np,
        avg_hr = excluded.avg_hr,
        hr_drift_pct = excluded.hr_drift_pct,
        power_fade_pct = excluded.power_fade_pct,
        vi = excluded.vi,
        time_in_zones_power = excluded.time_in_zones_power,
        time_in_zones_hr = excluded.time_in_zones_hr,
        longest_efforts_power = excluded.longest_efforts_power,
        longest_efforts_hr = excluded.longest_efforts_hr,
        quality_score = excluded.quality_score,
        notes = excluded.notes
    `).run(
      result.user_id, result.activity_id, result.computed_at, result.algo_version,
      result.has_power, result.has_hr, result.has_cadence, result.has_streams,
      result.duration_s, result.distance_m, result.avg_power, result.np, result.avg_hr,
      result.hr_drift_pct, result.power_fade_pct, result.vi,
      result.time_in_zones_power, result.time_in_zones_hr,
      result.longest_efforts_power, result.longest_efforts_hr,
      result.quality_score, result.notes
    );
    
    console.log(`[Normaliser] ✅ Activity ${activityId} normalised (quality: ${result.quality_score})`);
    
    return {
      ok: true,
      activityId,
      qualityScore: result.quality_score,
      hasPower: result.has_power === 1,
      hasHr: result.has_hr === 1,
      notes: quality.notes
    };
    
  } catch (error) {
    console.error(`[Normaliser] ❌ Failed to normalise activity ${activityId}:`, error);
    return {
      ok: false,
      error: error.message,
      activityId
    };
  }
}

/**
 * Normalise activities in batch
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {Date} options.after - Activities after this date
 * @param {Date} options.before - Activities before this date
 * @param {number} options.limit - Max activities to process
 * @returns {Promise<Object>} Batch result
 */
export async function normaliseActivitiesBatch(userId, options = {}) {
  console.log(`[Normaliser] Starting batch normalisation for user ${userId}`);
  
  // Build query
  let query = `
    SELECT id FROM activities
    WHERE user_id = ? AND is_valid_for_analytics = 1
  `;
  const params = [userId];
  
  if (options.after) {
    query += ` AND start_time >= ?`;
    params.push(options.after.toISOString());
  }
  
  if (options.before) {
    query += ` AND start_time <= ?`;
    params.push(options.before.toISOString());
  }
  
  query += ` ORDER BY start_time DESC`;
  
  if (options.limit) {
    query += ` LIMIT ?`;
    params.push(options.limit);
  }
  
  const activities = db.prepare(query).all(...params);
  
  console.log(`[Normaliser] Found ${activities.length} activities to normalise`);
  
  const results = {
    total: activities.length,
    computed: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  };
  
  for (const activity of activities) {
    const result = await normaliseActivity(userId, activity.id, options);
    
    if (result.ok) {
      results.computed++;
    } else {
      results.errors++;
      results.errorDetails.push({
        activityId: activity.id,
        error: result.error
      });
    }
  }
  
  console.log(`[Normaliser] Batch complete: ${results.computed} computed, ${results.errors} errors`);
  
  return results;
}

export default {
  normaliseActivity,
  normaliseActivitiesBatch,
  computeTimeInZones,
  computeLongestSustainedEfforts,
  computeHrDrift,
  computePowerFade,
  computeVariabilityIndex,
  computeQualityScore
};
