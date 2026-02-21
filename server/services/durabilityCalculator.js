/**
 * Durability Calculator
 * 
 * Computes fatigue resistance and repeatability metrics for race performance.
 * 
 * CRITICAL: Deterministic - no AI, no fragile heuristics.
 * All computations must be idempotent.
 */

import db from '../db.js';
import zlib from 'zlib';
import { getUserThresholds } from './athleteThresholdsService.js';

function decompressColumn(val) {
  if (!val) return null;
  try {
    return JSON.parse(zlib.gunzipSync(Buffer.from(val, 'base64')).toString('utf8'));
  } catch { return null; }
}

const ALGO_VERSION = 'dur_v1';
const MIN_DURATION_FOR_ANALYSIS = 1800; // 30 minutes

// Default power zones (% of FTP)
const DEFAULT_POWER_ZONES = {
  z1: { min: 0, max: 0.55 },
  z2: { min: 0.55, max: 0.75 },
  z3: { min: 0.75, max: 0.90 },
  z4: { min: 0.90, max: 1.05 },
  z5: { min: 1.05, max: 1.20 },
  z6: { min: 1.20, max: 1.50 },
  z7: { min: 1.50, max: 999 }
};

/**
 * Get canonical streams for an activity from activity_streams table.
 *
 * @param {string} activityId - Activity ID
 * @returns {Object|null} Streams object or null
 */
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
 * Get user zones via the shared thresholds resolver.
 */
function getUserZones(userId) {
  const t = getUserThresholds(userId);
  return {
    ftp:   t.ftp_w,
    fthr:  t.fthr_bpm || null,
    maxHr: t.fthr_bpm ? Math.round(t.fthr_bpm / 0.92) : 180,
  };
}

/**
 * Split stream into thirds
 * 
 * @param {Array<number>} stream - Stream data
 * @returns {Object} { first, middle, final }
 */
function splitIntoThirds(stream) {
  if (!stream || stream.length === 0) {
    return { first: [], middle: [], final: [] };
  }
  
  const thirdLength = Math.floor(stream.length / 3);
  
  return {
    first: stream.slice(0, thirdLength),
    middle: stream.slice(thirdLength, thirdLength * 2),
    final: stream.slice(-thirdLength)
  };
}

/**
 * Calculate average, ignoring nulls and zeros
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
 * Calculate standard deviation
 * 
 * @param {Array<number>} arr - Array of numbers
 * @returns {number|null} Standard deviation
 */
function calculateStdDev(arr) {
  if (!arr || arr.length === 0) {
    return null;
  }
  
  const validValues = arr.filter(v => v !== null && v !== undefined && v !== 0);
  
  if (validValues.length === 0) {
    return null;
  }
  
  const mean = calculateAverage(validValues);
  const squareDiffs = validValues.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((acc, val) => acc + val, 0) / validValues.length;
  
  return Math.sqrt(avgSquareDiff);
}

/**
 * Compute power fade percentage
 * 
 * Compares first third vs final third average power.
 * Positive = power dropped (fatigue)
 * 
 * @param {Array<number>} powerStream - Power stream
 * @returns {number|null} Fade percentage
 */
export function computePowerFade(powerStream) {
  if (!powerStream || powerStream.length === 0) {
    return null;
  }
  
  const thirds = splitIntoThirds(powerStream);
  
  if (thirds.first.length < 60 || thirds.final.length < 60) {
    // Too short for meaningful analysis
    return null;
  }
  
  const avgFirst = calculateAverage(thirds.first);
  const avgFinal = calculateAverage(thirds.final);
  
  if (!avgFirst || !avgFinal) {
    return null;
  }
  
  // Fade = (P1 - P3) / P1 * 100
  return ((avgFirst - avgFinal) / avgFirst) * 100;
}

/**
 * Compute HR fade percentage
 * 
 * Compares first third vs final third average HR.
 * Positive = HR increased (cardiovascular drift)
 * 
 * @param {Array<number>} hrStream - HR stream
 * @returns {number|null} Fade percentage
 */
export function computeHrFade(hrStream) {
  if (!hrStream || hrStream.length === 0) {
    return null;
  }
  
  const thirds = splitIntoThirds(hrStream);
  
  if (thirds.first.length < 60 || thirds.final.length < 60) {
    return null;
  }
  
  const avgFirst = calculateAverage(thirds.first);
  const avgFinal = calculateAverage(thirds.final);
  
  if (!avgFirst || !avgFinal) {
    return null;
  }
  
  // HR fade = (HR3 - HR1) / HR1 * 100
  // Positive = HR increased
  return ((avgFinal - avgFirst) / avgFirst) * 100;
}

/**
 * Compute efficiency drop
 * 
 * Measures change in power/HR ratio from first to final third.
 * Higher drop = worse fatigue resistance.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @param {Array<number>} hrStream - HR stream
 * @returns {number|null} Efficiency drop percentage
 */
export function computeEfficiencyDrop(powerStream, hrStream) {
  if (!powerStream || !hrStream || powerStream.length !== hrStream.length) {
    return null;
  }
  
  const powerThirds = splitIntoThirds(powerStream);
  const hrThirds = splitIntoThirds(hrStream);
  
  if (powerThirds.first.length < 60 || powerThirds.final.length < 60) {
    return null;
  }
  
  const avgPowerFirst = calculateAverage(powerThirds.first);
  const avgPowerFinal = calculateAverage(powerThirds.final);
  const avgHrFirst = calculateAverage(hrThirds.first);
  const avgHrFinal = calculateAverage(hrThirds.final);
  
  if (!avgPowerFirst || !avgPowerFinal || !avgHrFirst || !avgHrFinal) {
    return null;
  }
  
  // Efficiency = Power / HR
  const efficiencyFirst = avgPowerFirst / avgHrFirst;
  const efficiencyFinal = avgPowerFinal / avgHrFinal;
  
  // Drop = (Eff1 - Eff3) / Eff1 * 100
  return ((efficiencyFirst - efficiencyFinal) / efficiencyFirst) * 100;
}

/**
 * Compute late threshold score
 * 
 * Percentage of time spent at or above threshold in final third.
 * Higher score = better late-ride performance.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @param {number} thresholdWatts - Threshold power (FTP)
 * @returns {number|null} Percentage (0-100)
 */
export function computeLateThresholdScore(powerStream, thresholdWatts) {
  if (!powerStream || !thresholdWatts) {
    return null;
  }
  
  const thirds = splitIntoThirds(powerStream);
  
  if (thirds.final.length < 60) {
    return null;
  }
  
  const validValues = thirds.final.filter(v => v !== null && v !== undefined && v !== 0);
  
  if (validValues.length === 0) {
    return null;
  }
  
  const aboveThreshold = validValues.filter(v => v >= thresholdWatts).length;
  
  return (aboveThreshold / validValues.length) * 100;
}

/**
 * Compute late zone distribution
 * 
 * Time in each zone during final third of ride.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @param {number} ftp - Functional Threshold Power
 * @returns {Object|null} Zone distribution
 */
export function computeLateZoneDistribution(powerStream, ftp) {
  if (!powerStream || !ftp) {
    return null;
  }
  
  const thirds = splitIntoThirds(powerStream);
  
  if (thirds.final.length < 60) {
    return null;
  }
  
  const distribution = {};
  
  // Initialize zones
  Object.keys(DEFAULT_POWER_ZONES).forEach(zone => {
    distribution[zone] = 0;
  });
  
  // Count seconds in each zone
  thirds.final.forEach(power => {
    if (power === null || power === undefined || power === 0) {
      return;
    }
    
    const normalized = power / ftp;
    
    for (const [zone, range] of Object.entries(DEFAULT_POWER_ZONES)) {
      if (normalized >= range.min && normalized < range.max) {
        distribution[zone]++;
        break;
      }
    }
  });
  
  return distribution;
}

/**
 * Compute stochasticity score
 * 
 * Measures power variability using coefficient of variation (CV).
 * Higher score = more variable/stochastic power output.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @returns {number|null} CV (stddev/mean)
 */
export function computeStochasticity(powerStream) {
  if (!powerStream || powerStream.length === 0) {
    return null;
  }
  
  const validValues = powerStream.filter(v => v !== null && v !== undefined && v !== 0);
  
  if (validValues.length < 60) {
    return null;
  }
  
  const mean = calculateAverage(validValues);
  const stdDev = calculateStdDev(validValues);
  
  if (!mean || !stdDev || mean === 0) {
    return null;
  }
  
  // Coefficient of variation
  return stdDev / mean;
}

/**
 * Compute repeat hard efforts
 * 
 * Counts sustained efforts above Z5 with recovery periods between.
 * Measures repeatability of hard efforts.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @param {number} ftp - Functional Threshold Power
 * @param {Object} options - Options
 * @param {number} options.minSec - Minimum effort duration (default: 60)
 * @param {string} options.zone - Zone threshold (default: 'z5')
 * @param {number} options.minRecoverySec - Minimum recovery between efforts (default: 60)
 * @returns {number} Count of repeat efforts
 */
export function computeRepeatHardEfforts(powerStream, ftp, options = {}) {
  if (!powerStream || !ftp) {
    return 0;
  }
  
  const minSec = options.minSec || 60;
  const zone = options.zone || 'z5';
  const minRecoverySec = options.minRecoverySec || 60;
  
  const zoneThreshold = DEFAULT_POWER_ZONES[zone];
  if (!zoneThreshold) {
    return 0;
  }
  
  const thresholdPower = ftp * zoneThreshold.min;
  
  let effortCount = 0;
  let currentEffortDuration = 0;
  let inRecovery = false;
  let recoveryDuration = 0;
  let lastEffortEnd = -999999;
  
  powerStream.forEach((power, index) => {
    if (power === null || power === undefined || power === 0) {
      // Gap in data
      if (currentEffortDuration >= minSec) {
        // Effort ended, check if recovery since last effort
        if (index - lastEffortEnd >= minRecoverySec) {
          effortCount++;
        }
        lastEffortEnd = index;
      }
      currentEffortDuration = 0;
      inRecovery = false;
      recoveryDuration = 0;
      return;
    }
    
    if (power >= thresholdPower) {
      // In hard effort
      currentEffortDuration++;
      inRecovery = false;
      recoveryDuration = 0;
    } else {
      // Below threshold
      if (currentEffortDuration >= minSec) {
        // Effort just ended, check if sufficient recovery since last
        if (index - lastEffortEnd >= minRecoverySec) {
          effortCount++;
        }
        lastEffortEnd = index;
      }
      currentEffortDuration = 0;
      
      // Track recovery
      if (lastEffortEnd > 0) {
        recoveryDuration++;
      }
    }
  });
  
  // Check final effort
  if (currentEffortDuration >= minSec) {
    if (powerStream.length - lastEffortEnd >= minRecoverySec) {
      effortCount++;
    }
  }
  
  return effortCount;
}

/**
 * Compute surge count
 * 
 * Counts power surges (>20% above average).
 * Measures how often rider surges above steady pace.
 * 
 * @param {Array<number>} powerStream - Power stream
 * @returns {number} Surge count
 */
export function computeSurgeCount(powerStream) {
  if (!powerStream || powerStream.length === 0) {
    return 0;
  }
  
  const validValues = powerStream.filter(v => v !== null && v !== undefined && v !== 0);
  
  if (validValues.length < 60) {
    return 0;
  }
  
  const avgPower = calculateAverage(validValues);
  if (!avgPower) {
    return 0;
  }
  
  const surgeThreshold = avgPower * 1.20; // 20% above average
  
  let surgeCount = 0;
  let inSurge = false;
  
  powerStream.forEach(power => {
    if (power === null || power === undefined || power === 0) {
      inSurge = false;
      return;
    }
    
    if (power >= surgeThreshold && !inSurge) {
      surgeCount++;
      inSurge = true;
    } else if (power < surgeThreshold) {
      inSurge = false;
    }
  });
  
  return surgeCount;
}

/**
 * Compute durability for a single activity
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Durability result
 */
export async function computeDurabilityForActivity(userId, activityId, options = {}) {
  console.log(`[Durability] Computing for activity ${activityId}, user ${userId}`);
  
  try {
    // 1. Get activity
    const activity = db.prepare(`
      SELECT 
        id, user_id, duration_s, avg_power, has_power
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
    
    // 2. Check minimum duration
    const hasSufficientDuration = activity.duration_s >= MIN_DURATION_FOR_ANALYSIS;
    
    if (!hasSufficientDuration) {
      console.log(`[Durability] Activity too short: ${activity.duration_s}s < ${MIN_DURATION_FOR_ANALYSIS}s`);
    }
    
    // 3. Get user zones
    const userZones = getUserZones(userId);
    
    // 4. Get streams
    const streams = getCanonicalStreams(activityId);
    
    // 5. Initialize result
    const result = {
      user_id: userId,
      activity_id: activityId,
      computed_at: new Date().toISOString(),
      algo_version: ALGO_VERSION,
      has_sufficient_duration: hasSufficientDuration ? 1 : 0,
      has_power_data: (streams?.power && activity.has_power) ? 1 : 0,
      has_hr_data: streams?.hr ? 1 : 0
    };
    
    const notes = [];
    
    // 6. Compute power-based metrics
    if (streams?.power && activity.has_power && userZones.ftp) {
      result.fade_power_pct = computePowerFade(streams.power);
      result.stochasticity_score = computeStochasticity(streams.power);
      result.late_threshold_score = computeLateThresholdScore(streams.power, userZones.ftp);
      
      const lateZones = computeLateZoneDistribution(streams.power, userZones.ftp);
      result.late_zone_distribution = lateZones ? JSON.stringify(lateZones) : null;
      
      result.repeat_hard_efforts = computeRepeatHardEfforts(streams.power, userZones.ftp);
      result.surge_count = computeSurgeCount(streams.power);
    } else {
      result.fade_power_pct = null;
      result.stochasticity_score = null;
      result.late_threshold_score = null;
      result.late_zone_distribution = null;
      result.repeat_hard_efforts = null;
      result.surge_count = null;
      
      if (!streams?.power) {
        notes.push('NO_POWER_STREAM');
      } else if (!userZones.ftp) {
        notes.push('NO_FTP');
      }
    }
    
    // 7. Compute HR-based metrics
    if (streams?.hr) {
      result.fade_hr_pct = computeHrFade(streams.hr);
      
      // Efficiency drop requires both power and HR
      if (streams?.power && activity.has_power) {
        result.efficiency_drop_pct = computeEfficiencyDrop(streams.power, streams.hr);
      } else {
        result.efficiency_drop_pct = null;
      }
    } else {
      result.fade_hr_pct = null;
      result.efficiency_drop_pct = null;
      notes.push('NO_HR_STREAM');
    }
    
    // 8. Add notes
    if (!hasSufficientDuration) {
      notes.push('TOO_SHORT');
    }
    
    result.notes = JSON.stringify(notes);
    
    // 9. Upsert into database
    db.prepare(`
      INSERT INTO activity_durability (
        user_id, activity_id, computed_at, algo_version,
        fade_power_pct, fade_hr_pct, efficiency_drop_pct,
        late_threshold_score, late_zone_distribution,
        stochasticity_score, repeat_hard_efforts, surge_count,
        has_sufficient_duration, has_power_data, has_hr_data, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, activity_id) DO UPDATE SET
        computed_at = excluded.computed_at,
        algo_version = excluded.algo_version,
        fade_power_pct = excluded.fade_power_pct,
        fade_hr_pct = excluded.fade_hr_pct,
        efficiency_drop_pct = excluded.efficiency_drop_pct,
        late_threshold_score = excluded.late_threshold_score,
        late_zone_distribution = excluded.late_zone_distribution,
        stochasticity_score = excluded.stochasticity_score,
        repeat_hard_efforts = excluded.repeat_hard_efforts,
        surge_count = excluded.surge_count,
        has_sufficient_duration = excluded.has_sufficient_duration,
        has_power_data = excluded.has_power_data,
        has_hr_data = excluded.has_hr_data,
        notes = excluded.notes
    `).run(
      result.user_id, result.activity_id, result.computed_at, result.algo_version,
      result.fade_power_pct, result.fade_hr_pct, result.efficiency_drop_pct,
      result.late_threshold_score, result.late_zone_distribution,
      result.stochasticity_score, result.repeat_hard_efforts, result.surge_count,
      result.has_sufficient_duration, result.has_power_data, result.has_hr_data,
      result.notes
    );
    
    console.log(`[Durability] ✅ Activity ${activityId} computed`);
    
    return {
      ok: true,
      activityId,
      hasSufficientDuration,
      hasPowerData: result.has_power_data === 1,
      hasHrData: result.has_hr_data === 1,
      notes: JSON.parse(result.notes)
    };
    
  } catch (error) {
    console.error(`[Durability] ❌ Failed for activity ${activityId}:`, error);
    return {
      ok: false,
      error: error.message,
      activityId
    };
  }
}

export default {
  computeDurabilityForActivity,
  computePowerFade,
  computeHrFade,
  computeEfficiencyDrop,
  computeLateThresholdScore,
  computeLateZoneDistribution,
  computeStochasticity,
  computeRepeatHardEfforts,
  computeSurgeCount
};
