import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  INTERPRETATION_VERSION,
  DECOUPLING_RULES,
  HR_POWER_MISMATCH_THRESHOLDS,
  ZONE_KEYS,
  FLAGS
} from '../constants/interpretation.js';

import {
  fetchStreams,
  computeRealDecoupling,
  computeCoastingPercentage,
  computeIntervalDensity
} from './streamAnalysis.js';

import { getUserThresholds } from './athleteThresholdsService.js';

/**
 * Interpretation Service v1
 * 
 * Deterministic activity analysis producing stable, versioned signals.
 * No AI, no persona bias, no planning integration.
 * Pure interpretation layer for coaching logic to consume.
 */

/**
 * Get interpretation for an activity
 * @param {string} activityId - Activity ID
 * @returns {Object|null} - Interpretation payload or null if not computed
 */
export function getInterpretation(activityId) {
  const row = db.prepare(`
    SELECT payload_json, flags_json, interpretation_version, computed_at, source
    FROM activity_interpretation
    WHERE activity_id = ?
  `).get(activityId);

  if (!row) return null;

  return {
    activityId,
    version: row.interpretation_version,
    computedAt: row.computed_at,
    source: row.source,
    payload: JSON.parse(row.payload_json),
    flags: row.flags_json ? JSON.parse(row.flags_json) : []
  };
}

/**
 * Compute interpretation for an activity
 * @param {string} activityId - Activity ID
 * @param {Object} cachedThresholds - Optional cached thresholds to avoid repeated DB reads
 * @returns {Object} - Interpretation payload (v4 schema)
 */
export async function computeInterpretation(activityId, cachedThresholds = null) {
  // Fetch activity data
  const activity = db.prepare(`
    SELECT 
      a.*,
      s.raw_json
    FROM activities a
    LEFT JOIN activity_sources s ON s.activity_id = a.id AND s.raw_json IS NOT NULL
    WHERE a.id = ?
  `).get(activityId);

  if (!activity) {
    throw new Error(`Activity ${activityId} not found`);
  }

  // Parse raw_json if available for zone times
  let rawData = null;
  if (activity.raw_json) {
    try {
      rawData = JSON.parse(activity.raw_json);
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Extract zone times from raw data
  const powerZones = extractZoneTimes(rawData, 'power');
  const hrZones = extractZoneTimes(rawData, 'hr');

  // Build base payload
  const payload = {
    duration_s: activity.duration_s || 0,
    distance_m: activity.distance_m || 0,
    elevation_gain_m: activity.elevation_m || 0,

    has_power: activity.has_power === 1,
    has_hr: !!(activity.avg_hr && activity.avg_hr > 0),

    avg_power_w: activity.avg_power || null,
    normalized_power_w: activity.normalized_power || null,
    variability_index: activity.variability_index || null,
    intensity_factor: activity.intensity_factor || null,

    avg_hr_bpm: activity.avg_hr || null,
    max_hr_bpm: activity.max_hr || null,

    power_zone_seconds: powerZones,
    hr_zone_seconds: hrZones,

    decoupling_pct: null,
    steady_block_duration_s: null,
    power_hr_ratio: null,

    // v4 stream-derived metrics
    coasting_pct: null,
    interval_count: 0,
    interval_total_time_s: 0,
    analysis_version: 4,
    thresholds_source: null, // 'manual' | 'estimated' | null

    key_efforts: [],

    flags: []
  };

  // Generate flags
  const flags = generateFlags(activity, payload, powerZones, hrZones);
  payload.flags = flags;

  // v4: Fetch streams and compute stream-derived metrics
  const intervalsId = await getIntervalsId(activityId);
  let streams = null;
  
  if (intervalsId) {
    streams = await fetchStreams(intervalsId);
  }
  
  if (streams) {
    // FTP/FTHR sourcing (deterministic, athlete-level):
    // - Get stable athlete-level thresholds (NOT per-activity NP/avg_power)
    // - Precedence: manual overrides > computed estimates > null
    // - If FTP unavailable, metrics requiring it will be null with missing_ftp_or_fthr flag
    // - Use cached thresholds if provided (for backfill performance)
    const thresholds = cachedThresholds || getUserThresholds(activity.user_id);
    const ftp = thresholds.ftp_w;
    const fthr = thresholds.fthr_bpm;
    const thresholds_source = thresholds.ftp_source || null;
    
    // Set thresholds_source for debugging/provenance
    payload.thresholds_source = thresholds_source;
    
    // Real decoupling from streams (no proxy/estimate, uses athlete-level FTP)
    const decouplingResult = computeRealDecoupling(streams, ftp, fthr);
    payload.decoupling_pct = decouplingResult.decoupling_pct;
    payload.steady_block_duration_s = decouplingResult.steady_block_duration_s;
    if (decouplingResult.flags) {
      payload.flags.push(...decouplingResult.flags);
    }
    
    // Coasting percentage
    const coastingResult = computeCoastingPercentage(streams);
    payload.coasting_pct = coastingResult.coasting_pct;
    if (coastingResult.flags) {
      payload.flags.push(...coastingResult.flags);
    }
    
    // Interval density
    const intervalResult = computeIntervalDensity(streams, ftp);
    payload.interval_count = intervalResult.interval_count;
    payload.interval_total_time_s = intervalResult.interval_total_time_s;
    if (intervalResult.flags) {
      payload.flags.push(...intervalResult.flags);
    }
  } else {
    // Fallback to v3 behaviour when streams unavailable
    // Still set thresholds_source for payload stability (even though not used)
    const thresholds = cachedThresholds || getUserThresholds(activity.user_id);
    payload.thresholds_source = thresholds.ftp_source || null;
    
    const decouplingResult = computeDecoupling(activity, powerZones, hrZones);
    payload.decoupling_pct = decouplingResult.value;
    if (decouplingResult.flags) {
      payload.flags.push(...decouplingResult.flags);
    }
    payload.flags.push(FLAGS.STREAM_UNAVAILABLE);
  }

  // Compute power/HR ratio if both available
  if (activity.avg_power && activity.avg_hr) {
    payload.power_hr_ratio = Math.round((activity.avg_power / activity.avg_hr) * 100) / 100;
  }

  // Extract key efforts (v1: minimal, from best efforts if available)
  payload.key_efforts = extractKeyEfforts(rawData);

  return payload;
}

/**
 * Get Intervals.icu ID for an activity
 */
async function getIntervalsId(activityId) {
  const source = db.prepare(`
    SELECT provider_id
    FROM activity_sources
    WHERE activity_id = ? AND provider = 'intervals' AND provider_id LIKE 'i%'
    LIMIT 1
  `).get(activityId);
  
  return source?.provider_id || null;
}

/**
 * Extract zone times from raw JSON
 */
function extractZoneTimes(rawData, type) {
  const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0, z6: 0, z7: 0 };

  if (!rawData) return zones;

  // Intervals.icu format
  const zoneKey = type === 'power' ? 'icu_zone_times' : 'icu_hr_zone_times';
  const zoneTimes = rawData[zoneKey];

  if (Array.isArray(zoneTimes)) {
    zoneTimes.forEach((seconds, index) => {
      const zoneNum = index + 1;
      if (zoneNum <= 7) {
        zones[`z${zoneNum}`] = typeof seconds === 'object' ? (seconds.secs || 0) : (seconds || 0);
      }
    });
  }

  return zones;
}

/**
 * Generate interpretation flags
 */
function generateFlags(activity, payload, powerZones, hrZones) {
  const flags = [];

  // Power/HR availability
  if (!activity.has_power) {
    flags.push(FLAGS.POWER_MISSING);
  }
  if (!activity.has_hr) {
    flags.push(FLAGS.HR_MISSING);
  }

  // HR/Power mismatch detection
  if (activity.has_power && activity.has_hr && activity.intensity_factor && activity.avg_hr) {
    const { MODERATE_IF_THRESHOLD, MODERATE_HR_THRESHOLD } = HR_POWER_MISMATCH_THRESHOLDS;
    
    if (activity.intensity_factor < MODERATE_IF_THRESHOLD && activity.avg_hr > MODERATE_HR_THRESHOLD) {
      flags.push(FLAGS.HR_POWER_MISMATCH_MODERATE);
    }
  }

  return flags;
}

/**
 * Compute decoupling percentage
 * 
 * Rules (v1):
 * - Requires >= 30min duration
 * - Requires power AND HR
 * - Requires >= 20min in Z2 (steady aerobic)
 * - Requires <= 5min in Z4+ (avoid interval sessions)
 * 
 * Method:
 * - Split ride into first/second half by time
 * - Compute avg HR/Power ratio for each half
 * - Decoupling = ((Ratio2 - Ratio1) / Ratio1) * 100
 * 
 * If streams unavailable, use proxy method with flag
 */
function computeDecoupling(activity, powerZones, hrZones) {
  const { MIN_DURATION_SECONDS, MIN_STEADY_TIME_SECONDS, MAX_HIGH_INTENSITY_SECONDS } = DECOUPLING_RULES;

  // Check eligibility
  if (!activity.has_power || !activity.has_hr) {
    return { value: null, flags: [FLAGS.DECOUPLING_NOT_COMPUTABLE] };
  }

  if (activity.duration_s < MIN_DURATION_SECONDS) {
    return { value: null, flags: [FLAGS.DECOUPLING_NOT_COMPUTABLE] };
  }

  // Check for steady aerobic time (Z2 >= 20min, Z4+ <= 5min)
  const z2Time = powerZones.z2 || 0;
  const highIntensityTime = (powerZones.z4 || 0) + (powerZones.z5 || 0) + (powerZones.z6 || 0) + (powerZones.z7 || 0);

  if (z2Time < MIN_STEADY_TIME_SECONDS || highIntensityTime > MAX_HIGH_INTENSITY_SECONDS) {
    return { value: null, flags: [FLAGS.DECOUPLING_NOT_COMPUTABLE] };
  }

  // v2: No proxy method - return null until streams are available
  // Decoupling requires actual HR/Power streams to compute half-split ratios
  // Do not fabricate values from duration alone
  
  return {
    value: null,
    flags: [FLAGS.DECOUPLING_NOT_COMPUTABLE, FLAGS.DECOUPLING_REQUIRES_STREAMS]
  };
}

/**
 * Extract key efforts from raw data
 * v1: Minimal implementation - infer from best efforts if available
 */
function extractKeyEfforts(rawData) {
  const efforts = [];

  if (!rawData) return efforts;

  // Intervals.icu best efforts
  const bests = rawData.icu_best_efforts || rawData.best_efforts;
  
  if (Array.isArray(bests)) {
    bests.slice(0, 5).forEach(effort => {
      if (effort.duration >= 60) { // Only efforts >= 1 minute
        efforts.push({
          type: classifyEffortType(effort.duration),
          start_s: effort.start || 0,
          end_s: (effort.start || 0) + effort.duration,
          avg_power_w: effort.avg_watts || null,
          avg_hr_bpm: effort.avg_hr || null
        });
      }
    });
  }

  return efforts;
}

/**
 * Classify effort type by duration
 */
function classifyEffortType(durationSeconds) {
  if (durationSeconds < 60) return 'sprint';
  if (durationSeconds < 180) return 'vo2';
  if (durationSeconds < 600) return 'threshold';
  if (durationSeconds < 1200) return 'tempo';
  return 'unknown';
}

/**
 * Upsert interpretation into database
 * @param {string} activityId - Activity ID
 * @param {Object} payload - Interpretation payload
 * @param {string} source - Source of computation (e.g., 'backfill', 'realtime')
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function upsertInterpretation(activityId, payload, source = 'manual') {
  try {
    const payloadJson = JSON.stringify(payload);
    const flagsJson = payload.flags ? JSON.stringify(payload.flags) : null;

    db.prepare(`
      INSERT INTO activity_interpretation (
        activity_id, interpretation_version, payload_json, flags_json, source
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(activity_id) DO UPDATE SET
        interpretation_version = excluded.interpretation_version,
        payload_json = excluded.payload_json,
        flags_json = excluded.flags_json,
        source = excluded.source,
        computed_at = datetime('now')
    `).run(activityId, INTERPRETATION_VERSION, payloadJson, flagsJson, source);

    return { success: true, activityId };
  } catch (error) {
    console.error(`❌ Failed to upsert interpretation for ${activityId}:`, error.message);
    return { success: false, activityId, error: error.message };
  }
}

/**
 * Backfill interpretations for recent activities
 * @param {Object} options - Backfill options
 * @param {number} options.days - Days to look back (default: 180)
 * @param {number} options.userId - Optional user ID filter
 * @returns {Object} - Backfill results
 */
export async function backfillInterpretations(options = {}) {
  const { days = 180, userId = null } = options;

  console.log(`📊 [Interpretation] Backfilling last ${days} days...`);

  // Get activities to process (with user_id for threshold caching)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffISO = cutoffDate.toISOString();

  let query = `
    SELECT a.id, a.user_id
    FROM activities a
    LEFT JOIN activity_interpretation i ON i.activity_id = a.id
    WHERE a.start_time >= ?
      AND (i.id IS NULL OR i.interpretation_version < ?)
      AND a.is_shell = 0
  `;
  const params = [cutoffISO, INTERPRETATION_VERSION];

  if (userId) {
    query += ` AND a.user_id = ?`;
    params.push(userId);
  }

  query += ` ORDER BY a.start_time DESC`;

  const activities = db.prepare(query).all(...params);

  console.log(`  Found ${activities.length} activities to process`);

  // Cache thresholds per user to avoid repeated DB reads
  const thresholdsCache = new Map();
  let thresholdCacheHits = 0;
  let thresholdCacheMisses = 0;

  let computed = 0;
  let computed_v4 = 0;
  let fallback_v3 = 0;
  let stream_missing = 0;
  let skipped = 0;
  let failed = 0;
  const errors = [];

  for (const { id, user_id } of activities) {
    try {
      // Get or cache thresholds for this user
      let thresholds;
      if (thresholdsCache.has(user_id)) {
        thresholds = thresholdsCache.get(user_id);
        thresholdCacheHits++;
      } else {
        thresholds = getUserThresholds(user_id);
        thresholdsCache.set(user_id, thresholds);
        thresholdCacheMisses++;
      }
      
      const payload = await computeInterpretation(id, thresholds);
      const result = await upsertInterpretation(id, payload, 'backfill');
      
      if (result.success) {
        computed++;
        if (payload.flags.includes(FLAGS.STREAM_UNAVAILABLE)) {
          fallback_v3++;
          stream_missing++;
        } else {
          computed_v4++;
        }
      } else {
        failed++;
        errors.push({ activityId: id, error: result.error });
      }
    } catch (error) {
      failed++;
      errors.push({ activityId: id, error: error.message });
      console.error(`  ❌ Failed ${id}:`, error.message);
    }
  }

  console.log(`✅ [Interpretation] Backfill complete: ${computed} computed (v4: ${computed_v4}, v3 fallback: ${fallback_v3}, stream missing: ${stream_missing}), ${skipped} skipped, ${failed} failed`);
  console.log(`   Threshold cache: ${thresholdCacheHits} hits, ${thresholdCacheMisses} misses (${thresholdsCache.size} unique users)`);

  return {
    success: failed === 0,
    computed,
    computed_v4,
    fallback_v3,
    stream_missing,
    skipped,
    failed,
    total: activities.length,
    thresholdCacheHits,
    thresholdCacheMisses,
    uniqueUsers: thresholdsCache.size,
    errors: errors.length > 0 ? errors : undefined
  };
}

export default {
  getInterpretation,
  computeInterpretation,
  upsertInterpretation,
  backfillInterpretations
};
