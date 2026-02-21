/**
 * Stream Analysis Service (v4)
 * 
 * Computes derived metrics from activity streams (power, HR, cadence).
 * Does NOT store raw streams - only derived signals.
 * 
 * Performance: O(n) algorithms, max ~1500 points per stream.
 */

import { FLAGS } from '../constants/interpretation.js';

/**
 * Fetch streams from Intervals.icu API
 * @param {string} intervalsId - Intervals.icu activity ID (e.g., "i123456")
 * @returns {Object|null} - { time, watts, heartrate, cadence } or null
 */
export async function fetchStreams(intervalsId) {
  if (!intervalsId || !intervalsId.startsWith('i')) {
    return null;
  }

  try {
    const apiKey = process.env.INTERVALS_API_KEY;
    const athleteId = process.env.INTERVALS_ATHLETE_ID;
    
    if (!apiKey || !athleteId) {
      return null;
    }

    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/${athleteId}/activities/${intervalsId}/streams`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`API_KEY:${apiKey}`).toString('base64')}`
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    // Validate stream structure
    if (!data || !Array.isArray(data.time) || data.time.length === 0) {
      return null;
    }

    return {
      time: data.time || [],
      watts: data.watts || [],
      heartrate: data.heartrate || [],
      cadence: data.cadence || []
    };
  } catch (error) {
    console.error('[StreamAnalysis] Error fetching streams:', error.message);
    return null;
  }
}

/**
 * Compute real aerobic decoupling from streams
 * 
 * @param {Object} streams - { time, watts, heartrate }
 * @param {number} ftp - Functional Threshold Power (optional)
 * @param {number} fthr - Functional Threshold Heart Rate (optional)
 * @returns {Object} - { decoupling_pct, steady_block_duration_s, flags }
 */
export function computeRealDecoupling(streams, ftp = null, fthr = null) {
  const flags = [];
  
  if (!streams || !streams.time || !streams.watts || !streams.heartrate) {
    return { decoupling_pct: null, steady_block_duration_s: null, flags: [FLAGS.STREAM_UNAVAILABLE] };
  }

  const { time, watts, heartrate } = streams;
  
  if (time.length < 100) {
    return { decoupling_pct: null, steady_block_duration_s: null, flags: [FLAGS.INSUFFICIENT_STREAM_QUALITY] };
  }
  
  // Require FTP for steady block detection (no defaults)
  if (!ftp || ftp <= 0) {
    flags.push(FLAGS.MISSING_FTP_OR_FTHR);
    return { decoupling_pct: null, steady_block_duration_s: null, flags };
  }

  // Find longest continuous steady aerobic block
  const steadyBlock = findSteadyAerobicBlock(time, watts, heartrate, ftp, fthr);
  
  if (!steadyBlock || steadyBlock.duration < 1200) { // 20 minutes minimum
    flags.push(FLAGS.STEADY_BLOCK_NOT_FOUND);
    return { decoupling_pct: null, steady_block_duration_s: null, flags };
  }

  // Split block into first half and second half
  const midpoint = steadyBlock.startIdx + Math.floor((steadyBlock.endIdx - steadyBlock.startIdx) / 2);
  
  // Compute averages for each half
  const half1 = computeAverages(watts, heartrate, steadyBlock.startIdx, midpoint);
  const half2 = computeAverages(watts, heartrate, midpoint, steadyBlock.endIdx);
  
  if (!half1 || !half2 || half1.avgPower === 0 || half2.avgPower === 0) {
    flags.push(FLAGS.INSUFFICIENT_STREAM_QUALITY);
    return { decoupling_pct: null, steady_block_duration_s: steadyBlock.duration, flags };
  }

  // Compute decoupling: ((ratio2 - ratio1) / ratio1) * 100
  const ratio1 = half1.avgHr / half1.avgPower;
  const ratio2 = half2.avgHr / half2.avgPower;
  const decoupling = ((ratio2 - ratio1) / ratio1) * 100;
  
  return {
    decoupling_pct: Math.round(decoupling * 10) / 10, // Round to 0.1%
    steady_block_duration_s: steadyBlock.duration,
    flags
  };
}

/**
 * Find longest continuous steady aerobic block
 * Steady aerobic: 65-80% FTP, <90% FTHR, not coasting
 */
function findSteadyAerobicBlock(time, watts, heartrate, ftp, fthr) {
  const n = time.length;
  let longestBlock = null;
  let currentStart = -1;
  
  // No defaults - FTP is required (already validated in caller)
  const powerMin = ftp * 0.65;
  const powerMax = ftp * 0.80;
  const hrMax = fthr ? fthr * 0.90 : 999; // If no FTHR, don't filter by HR
  
  for (let i = 0; i < n; i++) {
    const w = watts[i] || 0;
    const hr = heartrate[i] || 0;
    
    const isSteady = w >= powerMin && w <= powerMax && hr > 0 && hr <= hrMax;
    
    if (isSteady) {
      if (currentStart === -1) {
        currentStart = i;
      }
    } else {
      if (currentStart !== -1) {
        const duration = time[i - 1] - time[currentStart];
        if (!longestBlock || duration > longestBlock.duration) {
          longestBlock = {
            startIdx: currentStart,
            endIdx: i - 1,
            duration
          };
        }
        currentStart = -1;
      }
    }
  }
  
  // Check final block
  if (currentStart !== -1) {
    const duration = time[n - 1] - time[currentStart];
    if (!longestBlock || duration > longestBlock.duration) {
      longestBlock = {
        startIdx: currentStart,
        endIdx: n - 1,
        duration
      };
    }
  }
  
  return longestBlock;
}

/**
 * Compute averages for a segment
 */
function computeAverages(watts, heartrate, startIdx, endIdx) {
  let sumPower = 0;
  let sumHr = 0;
  let count = 0;
  
  for (let i = startIdx; i <= endIdx; i++) {
    const w = watts[i] || 0;
    const hr = heartrate[i] || 0;
    
    if (w > 0 && hr > 0) {
      sumPower += w;
      sumHr += hr;
      count++;
    }
  }
  
  if (count === 0) return null;
  
  return {
    avgPower: sumPower / count,
    avgHr: sumHr / count
  };
}

/**
 * Compute coasting percentage
 * Coasting = watts <= 5
 * 
 * @param {Object} streams - { time, watts }
 * @returns {Object} - { coasting_pct, flags }
 */
export function computeCoastingPercentage(streams) {
  if (!streams || !streams.time || !streams.watts) {
    return { coasting_pct: null, flags: [FLAGS.STREAM_UNAVAILABLE] };
  }

  const { time, watts } = streams;
  const n = time.length;
  
  if (n === 0) {
    return { coasting_pct: null, flags: [FLAGS.INSUFFICIENT_STREAM_QUALITY] };
  }

  let coastingSeconds = 0;
  
  // Use time deltas from stream (handles downsampled/variable rate)
  for (let i = 1; i < n; i++) {
    const w = watts[i] || 0;
    if (w <= 5) {
      coastingSeconds += (time[i] - time[i - 1]);
    }
  }
  
  const totalTime = time[n - 1] - time[0];
  const coastingPct = totalTime > 0 ? (coastingSeconds / totalTime) * 100 : 0;
  
  const flags = [];
  // HIGH_COASTING triggers only when coasting_pct > 15 (strict)
  if (coastingPct > 15) {
    flags.push(FLAGS.HIGH_COASTING);
  }
  
  return {
    coasting_pct: Math.round(coastingPct * 10) / 10,
    flags
  };
}

/**
 * Detect interval density
 * High-intensity segments: power >= 105% FTP, >= 60s duration
 * 
 * @param {Object} streams - { time, watts }
 * @param {number} ftp - Functional Threshold Power (required, no defaults)
 * @returns {Object} - { interval_count, interval_total_time_s, flags }
 */
export function computeIntervalDensity(streams, ftp = null) {
  if (!streams || !streams.time || !streams.watts) {
    return { interval_count: 0, interval_total_time_s: 0, flags: [FLAGS.STREAM_UNAVAILABLE] };
  }

  const { time, watts } = streams;
  const n = time.length;
  
  if (n === 0) {
    return { interval_count: 0, interval_total_time_s: 0, flags: [FLAGS.INSUFFICIENT_STREAM_QUALITY] };
  }
  
  // Require FTP (no defaults)
  if (!ftp || ftp <= 0) {
    return { interval_count: 0, interval_total_time_s: 0, flags: [FLAGS.MISSING_FTP_OR_FTHR] };
  }

  const threshold = ftp * 1.05;
  const intervals = [];
  let currentStart = -1;
  
  for (let i = 0; i < n; i++) {
    const w = watts[i] || 0;
    const isHigh = w >= threshold;
    
    if (isHigh) {
      if (currentStart === -1) {
        currentStart = i;
      }
    } else {
      if (currentStart !== -1) {
        const duration = time[i - 1] - time[currentStart];
        
        // Merge gaps < 10s
        if (intervals.length > 0) {
          const lastInterval = intervals[intervals.length - 1];
          const gap = time[currentStart] - lastInterval.endTime;
          
          if (gap < 10) {
            // Merge with previous interval
            lastInterval.endTime = time[i - 1];
            lastInterval.duration += gap + duration;
          } else if (duration >= 60) {
            intervals.push({ startTime: time[currentStart], endTime: time[i - 1], duration });
          }
        } else if (duration >= 60) {
          intervals.push({ startTime: time[currentStart], endTime: time[i - 1], duration });
        }
        
        currentStart = -1;
      }
    }
  }
  
  // Check final interval
  if (currentStart !== -1) {
    const duration = time[n - 1] - time[currentStart];
    if (duration >= 60) {
      intervals.push({ startTime: time[currentStart], endTime: time[n - 1], duration });
    }
  }
  
  const totalIntervalTime = intervals.reduce((sum, int) => sum + int.duration, 0);
  const totalTime = time[n - 1] - time[0];
  const intervalPct = totalTime > 0 ? (totalIntervalTime / totalTime) * 100 : 0;
  
  const flags = [];
  if (intervalPct > 20) {
    flags.push(FLAGS.HIGH_INTERVAL_DENSITY);
  }
  
  return {
    interval_count: intervals.length,
    interval_total_time_s: Math.round(totalIntervalTime),
    flags
  };
}

export default {
  fetchStreams,
  computeRealDecoupling,
  computeCoastingPercentage,
  computeIntervalDensity
};
