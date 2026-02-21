/**
 * Canonical Stream Service
 * 
 * Manages canonical stream storage and retrieval.
 * Enforces physiology_source rules: only the winning provider can write streams.
 */

import db from '../db.js';
import {
  encodeStreamArray,
  decodeStreamArray,
  detectGaps,
  calculateCompleteness,
  validateStream
} from './streamCodec.js';

const ALGO_VERSION = 'streams_v1';

/**
 * Map incoming provider to canonical physiology source
 * 
 * @param {string} provider - Incoming provider name
 * @returns {string} Canonical physiology source
 */
function mapProviderToPhysiologySource(provider) {
  const mapping = {
    'garmin_fit': 'fit',
    'fit_upload': 'fit',
    'intervals': 'intervals',
    'strava': 'strava'
  };
  return mapping[provider] || provider;
}

/**
 * Upsert canonical streams for an activity
 * 
 * Only writes streams when incomingProvider matches physiology_source.
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @param {string} physiologySource - Current physiology source from activity ('strava'|'intervals'|'fit')
 * @param {string} incomingProvider - Provider attempting to write streams
 * @param {Object} providerStreams - Stream data from provider
 * @returns {Promise<Object>} Result
 */
export async function upsertCanonicalStreams(userId, activityId, physiologySource, incomingProvider, providerStreams) {
  console.log(`[CanonicalStreams] Upserting streams for ${activityId} from ${incomingProvider} (physiology_source=${physiologySource})`);
  
  try {
    // Map incoming provider to canonical source
    const mappedProvider = mapProviderToPhysiologySource(incomingProvider);
    
    // Enforce physiology_source rule - STRICT MATCHING
    if (mappedProvider !== physiologySource) {
      console.log(`[CanonicalStreams] ❌ REJECTED: ${incomingProvider} (maps to ${mappedProvider}) does not match physiology_source (${physiologySource})`);
      return {
        ok: false,
        reason: 'PHYSIOLOGY_SOURCE_MISMATCH',
        incomingProvider,
        mappedProvider,
        physiologySource
      };
    }
    
    // Get activity to verify it exists and get metadata
    const activity = db.prepare(`
      SELECT physiology_source, duration_s, start_time
      FROM activities
      WHERE id = ? AND user_id = ?
    `).get(activityId, userId);
    
    if (!activity) {
      return {
        ok: false,
        reason: 'ACTIVITY_NOT_FOUND'
      };
    }
    
    // Double-check physiology_source matches (should always be true after above check)
    if (activity.physiology_source !== physiologySource) {
      console.warn(`[CanonicalStreams] ⚠️  WARNING: Provided physiologySource (${physiologySource}) does not match activity.physiology_source (${activity.physiology_source})`);
      return {
        ok: false,
        reason: 'PHYSIOLOGY_SOURCE_MISMATCH',
        expected: activity.physiology_source,
        provided: physiologySource
      };
    }
    
    // Extract and validate streams
    const {
      power = null,
      hr = null,
      cadence = null,
      speed = null,
      elevation = null,
      time_s = null
    } = providerStreams;
    
    // MANDATORY: time_s must be present
    if (!time_s || !Array.isArray(time_s) || time_s.length === 0) {
      console.error(`[CanonicalStreams] ❌ REJECTED: time_s is mandatory but missing or empty`);
      return {
        ok: false,
        reason: 'TIME_S_REQUIRED',
        message: 'time_s array is mandatory for stream storage'
      };
    }
    
    // Validate streams
    const validations = {
      power: power ? validateStream(power, { minValue: 0, maxValue: 2000, name: 'power' }) : null,
      hr: hr ? validateStream(hr, { minValue: 30, maxValue: 250, name: 'hr' }) : null,
      cadence: cadence ? validateStream(cadence, { minValue: 0, maxValue: 250, name: 'cadence' }) : null,
      speed: speed ? validateStream(speed, { minValue: 0, maxValue: 50, name: 'speed' }) : null,
      elevation: elevation ? validateStream(elevation, { minValue: -500, maxValue: 9000, name: 'elevation' }) : null
    };
    
    // Log validation warnings
    for (const [type, validation] of Object.entries(validations)) {
      if (validation && validation.warnings.length > 0) {
        console.warn(`[CanonicalStreams] ${type} warnings:`, validation.warnings);
      }
      if (validation && !validation.valid) {
        console.error(`[CanonicalStreams] ${type} validation failed:`, validation.errors);
      }
    }
    
    // Encode streams
    const encoded = {
      power: power ? await encodeStreamArray(power) : { data: null, format: 'json' },
      hr: hr ? await encodeStreamArray(hr) : { data: null, format: 'json' },
      cadence: cadence ? await encodeStreamArray(cadence) : { data: null, format: 'json' },
      speed: speed ? await encodeStreamArray(speed) : { data: null, format: 'json' },
      elevation: elevation ? await encodeStreamArray(elevation) : { data: null, format: 'json' },
      time_s: time_s ? await encodeStreamArray(time_s) : { data: null, format: 'json' }
    };
    
    // Determine stream format (use most common)
    const formats = Object.values(encoded).map(e => e.format);
    const streamFormat = formats.filter(f => f === 'json_gzip_base64').length > formats.length / 2
      ? 'json_gzip_base64'
      : 'json';
    
    // Detect gaps
    const gapStats = time_s ? detectGaps(time_s, 1) : { hasGaps: false };
    
    // Calculate completeness
    const completeness = calculateCompleteness(
      { power, hr, cadence, speed, elevation },
      activity.duration_s
    );
    
    // Build flags
    const flags = {
      hasGaps: gapStats.hasGaps,
      gapCount: gapStats.gapCount || 0,
      largestGap: gapStats.largestGap || 0,
      completeness,
      validations: {
        power: validations.power ? { valid: validations.power.valid, warnings: validations.power.warnings.length } : null,
        hr: validations.hr ? { valid: validations.hr.valid, warnings: validations.hr.warnings.length } : null,
        cadence: validations.cadence ? { valid: validations.cadence.valid, warnings: validations.cadence.warnings.length } : null,
        speed: validations.speed ? { valid: validations.speed.valid, warnings: validations.speed.warnings.length } : null,
        elevation: validations.elevation ? { valid: validations.elevation.valid, warnings: validations.elevation.warnings.length } : null
      }
    };
    
    // Calculate sample interval
    let sampleInterval = 1; // Default 1Hz
    if (time_s && time_s.length > 1) {
      const intervals = [];
      for (let i = 1; i < Math.min(10, time_s.length); i++) {
        intervals.push(time_s[i] - time_s[i - 1]);
      }
      sampleInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
    }
    
    // Upsert to database
    db.prepare(`
      INSERT INTO activity_streams (
        user_id, activity_id, source, computed_at, algo_version,
        sample_interval_s, start_time, duration_s, stream_format,
        power, hr, cadence, speed, elevation, time_s, flags
      ) VALUES (?, ?, ?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, activity_id) DO UPDATE SET
        source = excluded.source,
        computed_at = excluded.computed_at,
        algo_version = excluded.algo_version,
        sample_interval_s = excluded.sample_interval_s,
        start_time = excluded.start_time,
        duration_s = excluded.duration_s,
        stream_format = excluded.stream_format,
        power = excluded.power,
        hr = excluded.hr,
        cadence = excluded.cadence,
        speed = excluded.speed,
        elevation = excluded.elevation,
        time_s = excluded.time_s,
        flags = excluded.flags
    `).run(
      userId,
      activityId,
      physiologySource,
      ALGO_VERSION,
      sampleInterval,
      activity.start_time,
      activity.duration_s,
      streamFormat,
      encoded.power.data,
      encoded.hr.data,
      encoded.cadence.data,
      encoded.speed.data,
      encoded.elevation.data,
      encoded.time_s.data,
      JSON.stringify(flags)
    );
    
    console.log(`[CanonicalStreams] ✅ Stored streams for ${activityId} (format: ${streamFormat})`);
    
    return {
      ok: true,
      activityId,
      source: physiologySource,
      streamFormat,
      flags,
      stats: {
        power: power ? power.length : 0,
        hr: hr ? hr.length : 0,
        cadence: cadence ? cadence.length : 0,
        speed: speed ? speed.length : 0,
        elevation: elevation ? elevation.length : 0
      }
    };
    
  } catch (error) {
    console.error(`[CanonicalStreams] ❌ Failed to upsert streams:`, error);
    return {
      ok: false,
      error: error.message
    };
  }
}

/**
 * Get canonical streams for an activity
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @returns {Promise<Object|null>} Stream data or null
 */
export async function getCanonicalStreams(userId, activityId) {
  try {
    const row = db.prepare(`
      SELECT * FROM activity_streams
      WHERE user_id = ? AND activity_id = ?
    `).get(userId, activityId);
    
    if (!row) {
      return null;
    }
    
    // Decode streams
    const streams = {
      power: row.power ? await decodeStreamArray(row.power, row.stream_format) : null,
      hr: row.hr ? await decodeStreamArray(row.hr, row.stream_format) : null,
      cadence: row.cadence ? await decodeStreamArray(row.cadence, row.stream_format) : null,
      speed: row.speed ? await decodeStreamArray(row.speed, row.stream_format) : null,
      elevation: row.elevation ? await decodeStreamArray(row.elevation, row.stream_format) : null,
      time_s: row.time_s ? await decodeStreamArray(row.time_s, row.stream_format) : null
    };
    
    // Parse flags
    const flags = row.flags ? JSON.parse(row.flags) : {};
    
    return {
      ...streams,
      meta: {
        source: row.source,
        sampleInterval: row.sample_interval_s,
        startTime: row.start_time,
        duration: row.duration_s,
        streamFormat: row.stream_format,
        flags,
        computedAt: row.computed_at,
        algoVersion: row.algo_version
      }
    };
    
  } catch (error) {
    console.error(`[CanonicalStreams] Failed to get streams for ${activityId}:`, error);
    return null;
  }
}

/**
 * Check if streams exist for an activity
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @returns {boolean} True if streams exist
 */
export function hasCanonicalStreams(userId, activityId) {
  const row = db.prepare(`
    SELECT 1 FROM activity_streams
    WHERE user_id = ? AND activity_id = ?
  `).get(userId, activityId);
  
  return !!row;
}

/**
 * Get stream statistics for user
 * 
 * @param {number} userId - User ID
 * @returns {Object} Statistics
 */
export function getStreamStatistics(userId) {
  const total = db.prepare(`
    SELECT COUNT(*) as count FROM activity_streams
    WHERE user_id = ?
  `).get(userId);
  
  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count
    FROM activity_streams
    WHERE user_id = ?
    GROUP BY source
  `).all(userId);
  
  const byFormat = db.prepare(`
    SELECT stream_format, COUNT(*) as count
    FROM activity_streams
    WHERE user_id = ?
    GROUP BY stream_format
  `).all(userId);
  
  // Count activities with each stream type
  const streamTypes = db.prepare(`
    SELECT 
      SUM(CASE WHEN power IS NOT NULL THEN 1 ELSE 0 END) as power_count,
      SUM(CASE WHEN hr IS NOT NULL THEN 1 ELSE 0 END) as hr_count,
      SUM(CASE WHEN cadence IS NOT NULL THEN 1 ELSE 0 END) as cadence_count,
      SUM(CASE WHEN speed IS NOT NULL THEN 1 ELSE 0 END) as speed_count,
      SUM(CASE WHEN elevation IS NOT NULL THEN 1 ELSE 0 END) as elevation_count
    FROM activity_streams
    WHERE user_id = ?
  `).get(userId);
  
  return {
    total: total.count,
    bySource: bySource.reduce((acc, row) => {
      acc[row.source] = row.count;
      return acc;
    }, {}),
    byFormat: byFormat.reduce((acc, row) => {
      acc[row.stream_format] = row.count;
      return acc;
    }, {}),
    streamTypes: {
      power: streamTypes.power_count || 0,
      hr: streamTypes.hr_count || 0,
      cadence: streamTypes.cadence_count || 0,
      speed: streamTypes.speed_count || 0,
      elevation: streamTypes.elevation_count || 0
    }
  };
}

/**
 * Delete streams for a user (dev/reset support)
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @returns {Object} Result
 */
export function deleteStreamsForUser(userId, options = {}) {
  const { source = null, activityId = null } = options;
  
  let query = 'DELETE FROM activity_streams WHERE user_id = ?';
  const params = [userId];
  
  if (activityId) {
    query += ' AND activity_id = ?';
    params.push(activityId);
  } else if (source) {
    query += ' AND source = ?';
    params.push(source);
  }
  
  const result = db.prepare(query).run(...params);
  
  console.log(`[CanonicalStreams] Deleted ${result.changes} stream records for user ${userId}`);
  
  return {
    ok: true,
    deleted: result.changes
  };
}

/**
 * Get activities missing streams
 * 
 * Returns activities that should have streams but don't.
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @returns {Array} Activities missing streams
 */
export function getActivitiesMissingStreams(userId, options = {}) {
  const { limit = 50 } = options;
  
  const activities = db.prepare(`
    SELECT 
      a.id,
      a.name,
      a.start_time,
      a.duration_s,
      a.physiology_source,
      a.has_power,
      a.has_hr
    FROM activities a
    LEFT JOIN activity_streams s ON a.id = s.activity_id AND a.user_id = s.user_id
    WHERE a.user_id = ?
      AND a.is_valid_for_analytics = 1
      AND s.activity_id IS NULL
      AND (a.has_power = 1 OR a.has_hr = 1)
    ORDER BY a.start_time DESC
    LIMIT ?
  `).all(userId, limit);
  
  return activities;
}

/**
 * Migrate streams to new algorithm version
 * 
 * @param {number} userId - User ID
 * @param {string} fromVersion - Old version
 * @param {string} toVersion - New version
 * @returns {Promise<Object>} Migration result
 */
export async function migrateStreams(userId, fromVersion, toVersion) {
  console.log(`[CanonicalStreams] Migrating streams from ${fromVersion} to ${toVersion}`);
  
  const streams = db.prepare(`
    SELECT activity_id FROM activity_streams
    WHERE user_id = ? AND algo_version = ?
  `).all(userId, fromVersion);
  
  console.log(`[CanonicalStreams] Found ${streams.length} streams to migrate`);
  
  // For now, just update the version
  // In future, this could re-encode or re-validate streams
  const result = db.prepare(`
    UPDATE activity_streams
    SET algo_version = ?
    WHERE user_id = ? AND algo_version = ?
  `).run(toVersion, userId, fromVersion);
  
  return {
    ok: true,
    migrated: result.changes
  };
}

export default {
  upsertCanonicalStreams,
  getCanonicalStreams,
  hasCanonicalStreams,
  getStreamStatistics,
  deleteStreamsForUser,
  getActivitiesMissingStreams,
  migrateStreams
};
