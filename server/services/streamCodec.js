/**
 * Stream Codec
 * 
 * Encoding and decoding for activity stream data.
 * Supports JSON and gzip+base64 compression for size optimization.
 */

import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Compression threshold: use gzip if JSON > 1KB
const COMPRESSION_THRESHOLD = 1024;

/**
 * Encode stream array to string
 * 
 * Uses JSON for small arrays, gzip+base64 for large arrays.
 * 
 * @param {Array<number>} arr - Stream data array
 * @returns {Object} { data: string, format: 'json'|'json_gzip_base64' }
 */
export async function encodeStreamArray(arr) {
  if (!arr || !Array.isArray(arr) || arr.length === 0) {
    return { data: null, format: 'json' };
  }
  
  // Convert to JSON
  const jsonStr = JSON.stringify(arr);
  
  // Use plain JSON for small arrays
  if (jsonStr.length < COMPRESSION_THRESHOLD) {
    return {
      data: jsonStr,
      format: 'json'
    };
  }
  
  // Use gzip+base64 for large arrays
  try {
    const compressed = await gzip(Buffer.from(jsonStr, 'utf-8'));
    const base64 = compressed.toString('base64');
    
    return {
      data: base64,
      format: 'json_gzip_base64'
    };
  } catch (error) {
    console.error('[StreamCodec] Compression failed, falling back to JSON:', error);
    return {
      data: jsonStr,
      format: 'json'
    };
  }
}

/**
 * Decode stream string to array
 * 
 * @param {string} str - Encoded stream data
 * @param {string} format - 'json' or 'json_gzip_base64'
 * @returns {Promise<Array<number>|null>} Decoded array
 */
export async function decodeStreamArray(str, format = 'json') {
  if (!str) {
    return null;
  }
  
  try {
    if (format === 'json') {
      return JSON.parse(str);
    }
    
    if (format === 'json_gzip_base64') {
      const compressed = Buffer.from(str, 'base64');
      const decompressed = await gunzip(compressed);
      const jsonStr = decompressed.toString('utf-8');
      return JSON.parse(jsonStr);
    }
    
    console.warn(`[StreamCodec] Unknown format: ${format}, attempting JSON parse`);
    return JSON.parse(str);
    
  } catch (error) {
    console.error('[StreamCodec] Decode failed:', error);
    return null;
  }
}

/**
 * Detect gaps in time series data
 * 
 * @param {Array<number>} time_s - Time array in seconds
 * @param {number} expectedInterval - Expected interval between samples (seconds)
 * @returns {Object} Gap statistics
 */
export function detectGaps(time_s, expectedInterval = 1) {
  if (!time_s || !Array.isArray(time_s) || time_s.length < 2) {
    return {
      hasGaps: false,
      gapCount: 0,
      largestGap: 0,
      totalMissingSamples: 0
    };
  }
  
  const gaps = [];
  let totalMissingSamples = 0;
  
  for (let i = 1; i < time_s.length; i++) {
    const interval = time_s[i] - time_s[i - 1];
    
    // Gap detected if interval > 1.5x expected
    if (interval > expectedInterval * 1.5) {
      const missingSamples = Math.round(interval / expectedInterval) - 1;
      gaps.push({
        index: i,
        interval,
        missingSamples
      });
      totalMissingSamples += missingSamples;
    }
  }
  
  const largestGap = gaps.length > 0
    ? Math.max(...gaps.map(g => g.interval))
    : 0;
  
  return {
    hasGaps: gaps.length > 0,
    gapCount: gaps.length,
    largestGap,
    totalMissingSamples,
    gaps: gaps.length > 0 ? gaps : undefined
  };
}

/**
 * Calculate stream completeness
 * 
 * @param {Object} streams - Stream data object
 * @param {number} expectedDuration - Expected duration in seconds
 * @returns {Object} Completeness metrics
 */
export function calculateCompleteness(streams, expectedDuration) {
  const completeness = {
    power: 0,
    hr: 0,
    cadence: 0,
    speed: 0,
    elevation: 0,
    overall: 0
  };
  
  if (!streams || !expectedDuration) {
    return completeness;
  }
  
  const streamTypes = ['power', 'hr', 'cadence', 'speed', 'elevation'];
  let totalCompleteness = 0;
  let streamCount = 0;
  
  for (const type of streamTypes) {
    if (streams[type] && Array.isArray(streams[type])) {
      const length = streams[type].length;
      const nonNullCount = streams[type].filter(v => v !== null && v !== undefined).length;
      
      // Completeness = (non-null samples / expected samples) * 100
      const expectedSamples = expectedDuration; // Assuming 1Hz
      completeness[type] = Math.min(100, (nonNullCount / expectedSamples) * 100);
      
      totalCompleteness += completeness[type];
      streamCount++;
    }
  }
  
  completeness.overall = streamCount > 0 ? totalCompleteness / streamCount : 0;
  
  return completeness;
}

/**
 * Validate stream data
 * 
 * @param {Array<number>} arr - Stream array
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateStream(arr, options = {}) {
  const {
    minValue = null,
    maxValue = null,
    allowNull = true,
    name = 'stream'
  } = options;
  
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    stats: {
      length: 0,
      nullCount: 0,
      minValue: null,
      maxValue: null,
      avgValue: null
    }
  };
  
  if (!arr || !Array.isArray(arr)) {
    result.valid = false;
    result.errors.push(`${name} is not an array`);
    return result;
  }
  
  if (arr.length === 0) {
    result.warnings.push(`${name} is empty`);
    return result;
  }
  
  result.stats.length = arr.length;
  
  let sum = 0;
  let validCount = 0;
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    
    if (val === null || val === undefined) {
      result.stats.nullCount++;
      if (!allowNull) {
        result.errors.push(`${name}[${i}] is null`);
        result.valid = false;
      }
      continue;
    }
    
    if (typeof val !== 'number') {
      result.errors.push(`${name}[${i}] is not a number: ${typeof val}`);
      result.valid = false;
      continue;
    }
    
    if (isNaN(val)) {
      result.errors.push(`${name}[${i}] is NaN`);
      result.valid = false;
      continue;
    }
    
    if (minValue !== null && val < minValue) {
      result.warnings.push(`${name}[${i}] below minimum: ${val} < ${minValue}`);
    }
    
    if (maxValue !== null && val > maxValue) {
      result.warnings.push(`${name}[${i}] above maximum: ${val} > ${maxValue}`);
    }
    
    sum += val;
    validCount++;
    min = Math.min(min, val);
    max = Math.max(max, val);
  }
  
  if (validCount > 0) {
    result.stats.minValue = min;
    result.stats.maxValue = max;
    result.stats.avgValue = sum / validCount;
  }
  
  // Warn if >50% null
  const nullPct = (result.stats.nullCount / arr.length) * 100;
  if (nullPct > 50) {
    result.warnings.push(`${name} has ${nullPct.toFixed(1)}% null values`);
  }
  
  return result;
}

/**
 * Resample stream to target frequency
 * 
 * Simple linear interpolation for upsampling, averaging for downsampling.
 * 
 * @param {Array<number>} arr - Input stream
 * @param {Array<number>} time_s - Time array (seconds)
 * @param {number} targetInterval - Target interval (seconds)
 * @returns {Object} { data: Array, time_s: Array }
 */
export function resampleStream(arr, time_s, targetInterval = 1) {
  if (!arr || !time_s || arr.length !== time_s.length) {
    return { data: arr, time_s };
  }
  
  if (arr.length < 2) {
    return { data: arr, time_s };
  }
  
  const startTime = time_s[0];
  const endTime = time_s[time_s.length - 1];
  const duration = endTime - startTime;
  
  const targetLength = Math.ceil(duration / targetInterval) + 1;
  const resampled = [];
  const resampledTime = [];
  
  for (let i = 0; i < targetLength; i++) {
    const targetTime = startTime + (i * targetInterval);
    resampledTime.push(targetTime);
    
    // Find surrounding samples
    let leftIdx = 0;
    let rightIdx = time_s.length - 1;
    
    for (let j = 0; j < time_s.length - 1; j++) {
      if (time_s[j] <= targetTime && time_s[j + 1] >= targetTime) {
        leftIdx = j;
        rightIdx = j + 1;
        break;
      }
    }
    
    // Linear interpolation
    const leftTime = time_s[leftIdx];
    const rightTime = time_s[rightIdx];
    const leftVal = arr[leftIdx];
    const rightVal = arr[rightIdx];
    
    if (leftVal === null || rightVal === null) {
      resampled.push(null);
    } else {
      const ratio = (targetTime - leftTime) / (rightTime - leftTime);
      const interpolated = leftVal + (rightVal - leftVal) * ratio;
      resampled.push(Math.round(interpolated * 100) / 100);
    }
  }
  
  return {
    data: resampled,
    time_s: resampledTime
  };
}

export default {
  encodeStreamArray,
  decodeStreamArray,
  detectGaps,
  calculateCompleteness,
  validateStream,
  resampleStream
};
