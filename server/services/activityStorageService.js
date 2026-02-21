/**
 * Activity Storage Service
 * 
 * DB-only read for the two-table activity model.
 * Reads from `activities` table (one row per real ride).
 * This is the single source of truth for activity data.
 */

import db from '../db.js';

// Valid provider names
const VALID_PROVIDERS = ['strava', 'intervals', 'manual', 'fit_upload'];

/**
 * Parse sources parameter robustly
 * @param {string|string[]} sources - Sources param (string or array)
 * @returns {string[]} Array of valid provider names
 */
function parseSources(sources) {
  // If array, filter to valid providers
  if (Array.isArray(sources)) {
    const valid = sources.filter(s => VALID_PROVIDERS.includes(s));
    return valid.length > 0 ? valid : [...VALID_PROVIDERS];
  }
  
  // If missing, undefined, null, or empty string → ALL
  if (!sources || (typeof sources === 'string' && sources.trim() === '')) {
    return [...VALID_PROVIDERS];
  }
  
  // Handle 'all' keyword
  if (typeof sources === 'string' && sources.toLowerCase() === 'all') {
    return [...VALID_PROVIDERS];
  }
  
  // Split by comma, trim, filter empty, validate
  if (typeof sources === 'string') {
    const parsed = sources
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .filter(s => VALID_PROVIDERS.includes(s));
    
    return parsed.length > 0 ? parsed : [...VALID_PROVIDERS];
  }
  
  return [...VALID_PROVIDERS];
}

/**
 * Get activities from database (new two-table model)
 * Reads from `activities` table - one row per real ride, already merged
 * 
 * @param {number} userId - Numeric user ID (required)
 * @param {Object} options - Query options
 * @param {number} options.windowDays - Days to look back (default: 90)
 * @param {string|string[]} options.sources - Provider filter (default: all)
 * @returns {Object} { ok: true, data: [...], meta: {...} } or { ok: false, error: {...} }
 */
export function getActivities(userId, options = {}) {
  const { windowDays = 90, sources, includeShells = false } = options;
  
  // Validate userId
  if (!userId || typeof userId !== 'number') {
    console.error('[ActivityStorage] Invalid userId:', userId);
    return {
      ok: false,
      error: {
        code: 'INVALID_USER_ID',
        message: 'Valid numeric user ID is required'
      }
    };
  }
  
  try {
    // Parse sources
    const validSources = parseSources(sources);
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffISO = cutoffDate.toISOString();
    
    // Query the new `activities` table (two-table model)
    // LEFT JOIN activity_sources to get raw_json for enriched data (zones, intervals, advanced metrics)
    const placeholders = validSources.map(() => '?').join(', ');
    const query = `
      SELECT 
        a.id,
        a.user_id,
        a.name,
        a.sport,
        a.type,
        a.start_time,
        a.timezone_offset_min,
        a.duration_s,
        a.distance_m,
        a.elevation_m,
        a.avg_power,
        a.max_power,
        a.normalized_power,
        a.tss,
        a.avg_hr,
        a.max_hr,
        a.avg_cadence,
        a.avg_speed,
        a.max_speed,
        a.calories,
        a.has_power,
        a.primary_source,
        a.match_method,
        a.is_shell,
        a.shell_reason,
        a.created_at,
        a.updated_at,
        s.raw_json,
        smap.raw_json as strava_raw_json,
        sint.provider_id as intervals_provider_id,
        interp.payload_json as interpretation_payload,
        interp.flags_json as interpretation_flags,
        interp.interpretation_version,
        interp.computed_at as interpretation_computed_at
      FROM activities a
      LEFT JOIN activity_sources s ON s.activity_id = a.id AND s.raw_json IS NOT NULL
        AND s.id = (
          SELECT s2.id FROM activity_sources s2
          WHERE s2.activity_id = a.id AND s2.raw_json IS NOT NULL
          ORDER BY 
            s2.is_enriched DESC,
            CASE s2.provider
              WHEN 'intervals' THEN 3
              WHEN 'fit_upload' THEN 2
              WHEN 'strava' THEN 1
              ELSE 0
            END DESC
          LIMIT 1
        )
      LEFT JOIN activity_sources smap ON smap.activity_id = a.id 
        AND smap.provider = 'strava' AND smap.raw_json IS NOT NULL
      LEFT JOIN activity_sources sint ON sint.activity_id = a.id 
        AND sint.provider = 'intervals' AND sint.provider_id LIKE 'i%'
      LEFT JOIN activity_interpretation interp ON interp.activity_id = a.id
      WHERE a.user_id = ?
        AND a.start_time >= ?
        AND a.primary_source IN (${placeholders})
        ${includeShells ? '' : 'AND a.is_shell = 0'}
      ORDER BY a.start_time DESC
    `;
    
    const params = [userId, cutoffISO, ...validSources];
    
    console.log(`[ActivityStorage] Query: user=${userId}, window=${windowDays}d, sources=${validSources.join(',')}`);
    
    const activities = db.prepare(query).all(...params);
    
    // Transform to frontend-friendly format
    const transformed = activities.map(a => {
      const base = {
        id: a.id,
        name: a.name,
        type: a.type,
        sport: a.sport,
        date: a.start_time,
        start_time: a.start_time,
        duration: a.duration_s,
        distance: a.distance_m,
        elevation: a.elevation_m,
        avgPower: a.avg_power,
        maxPower: a.max_power,
        normalizedPower: a.normalized_power,
        tss: a.tss,
        avgHeartRate: a.avg_hr,
        maxHeartRate: a.max_hr,
        avgCadence: a.avg_cadence,
        avgSpeed: a.avg_speed,
        maxSpeed: a.max_speed,
        calories: a.calories,
        hasPower: a.has_power === 1,
        source: a.primary_source,
        // Keep raw fields too for compatibility
        duration_s: a.duration_s,
        distance_m: a.distance_m,
        elevation_m: a.elevation_m,
        avg_power: a.avg_power,
        max_power: a.max_power,
        normalized_power: a.normalized_power,
        avg_hr: a.avg_hr,
        max_hr: a.max_hr,
        avg_cadence: a.avg_cadence,
        has_power: a.has_power,
        primary_source: a.primary_source,
        intervals_id: a.intervals_provider_id || null,
        is_shell: a.is_shell === 1,
        shell_reason: a.shell_reason
      };
      
      // Add interpretation if available
      if (a.interpretation_payload) {
        try {
          base.interpretation = JSON.parse(a.interpretation_payload);
          if (a.interpretation_flags) {
            base.interpretation.flags = JSON.parse(a.interpretation_flags);
          }
          base.interpretation_version = a.interpretation_version;
          base.interpretation_computed_at = a.interpretation_computed_at;
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Extract enriched fields from raw_json (zones, intervals, advanced metrics)
      if (a.raw_json) {
        try {
          const raw = JSON.parse(a.raw_json);
          
          // Stream types available (for Coaching View)
          if (raw.stream_types) base.stream_types = raw.stream_types;
          
          // --- Intervals.icu format ---
          if (raw.icu_zone_times) base.icu_zone_times = raw.icu_zone_times;
          if (raw.icu_hr_zone_times) base.icu_hr_zone_times = raw.icu_hr_zone_times;
          if (raw.interval_summary) base.interval_summary = raw.interval_summary;
          if (raw.icu_variability_index) base.icu_variability_index = raw.icu_variability_index;
          if (raw.icu_efficiency_factor) base.icu_efficiency_factor = raw.icu_efficiency_factor;
          if (raw.decoupling) base.decoupling = raw.decoupling;
          if (raw.icu_power_hr) base.icu_power_hr = raw.icu_power_hr;
          if (raw.icu_intervals) base.interval_summary = raw.icu_intervals;
          
          // GPS route (extracted during FIT upload slim step)
          if (raw.latlngs && Array.isArray(raw.latlngs) && raw.latlngs.length > 1) {
            base.latlngs = raw.latlngs;
          }
          
          // --- Strava map/polyline (for route display) ---
          if (raw.map?.summary_polyline) {
            base.map = { summary_polyline: raw.map.summary_polyline };
          }
          if (raw.start_latlng) base.start_latlng = raw.start_latlng;
          if (raw.end_latlng) base.end_latlng = raw.end_latlng;
          if (raw.trainer !== undefined) base.trainer = raw.trainer;
          
          // --- Strava fallback for map data (when primary source is Intervals/FIT) ---
          if (!base.map && a.strava_raw_json) {
            try {
              const stravaRaw = JSON.parse(a.strava_raw_json);
              if (stravaRaw.map?.summary_polyline) {
                base.map = { summary_polyline: stravaRaw.map.summary_polyline };
              }
              if (!base.start_latlng && stravaRaw.start_latlng) base.start_latlng = stravaRaw.start_latlng;
              if (!base.end_latlng && stravaRaw.end_latlng) base.end_latlng = stravaRaw.end_latlng;
              if (base.trainer === undefined && stravaRaw.trainer !== undefined) base.trainer = stravaRaw.trainer;
            } catch (e) { /* ignore */ }
          }
          
          // --- FIT file format (parsed by fit-file-parser) ---
          const session = raw.sessions?.[0];
          if (session) {
            // Power zones: convert array of seconds to Intervals-compatible format
            if (!base.icu_zone_times && session.time_in_power_zone?.length > 0) {
              const zoneLabels = ['Z1','Z2','Z3','Z4','Z5','Z6','Z7'];
              base.icu_zone_times = session.time_in_power_zone
                .slice(0, 7)
                .map((secs, i) => ({ id: zoneLabels[i], secs: Math.round(secs) }));
            }
            // HR zones: plain array of seconds (matches Intervals format)
            if (!base.icu_hr_zone_times && session.time_in_hr_zone?.length > 0) {
              base.icu_hr_zone_times = session.time_in_hr_zone.map(s => Math.round(s));
            }
            // Compute advanced metrics from FIT summary
            const np = session.normalized_power || base.normalizedPower;
            const ap = session.avg_power || base.avgPower;
            const avgHr = session.avg_heart_rate || base.avgHeartRate;
            if (np && ap && ap > 0) {
              if (!base.icu_variability_index) base.icu_variability_index = np / ap;
            }
            if (np && avgHr && avgHr > 0) {
              if (!base.icu_efficiency_factor) base.icu_efficiency_factor = np / avgHr;
              if (!base.icu_power_hr) base.icu_power_hr = ap / avgHr;
            }
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      
      // Strava map fallback when no primary raw_json exists
      if (!base.map && !a.raw_json && a.strava_raw_json) {
        try {
          const stravaRaw = JSON.parse(a.strava_raw_json);
          if (stravaRaw.map?.summary_polyline) {
            base.map = { summary_polyline: stravaRaw.map.summary_polyline };
          }
          if (stravaRaw.start_latlng) base.start_latlng = stravaRaw.start_latlng;
          if (stravaRaw.end_latlng) base.end_latlng = stravaRaw.end_latlng;
          if (stravaRaw.trainer !== undefined) base.trainer = stravaRaw.trainer;
        } catch (e) { /* ignore */ }
      }
      
      return base;
    });
    
    // Calculate meta
    const meta = {
      windowDays,
      sources: validSources,
      count: transformed.length,
      oldest: transformed.length > 0 ? transformed[transformed.length - 1].start_time : null,
      newest: transformed.length > 0 ? transformed[0].start_time : null
    };
    
    // Count shell activities in the same window (regardless of includeShells setting)
    const shellCountQuery = `
      SELECT COUNT(*) as count
      FROM activities
      WHERE user_id = ?
        AND start_time >= ?
        AND primary_source IN (${placeholders})
        AND is_shell = 1
    `;
    const shellCountResult = db.prepare(shellCountQuery).get(userId, cutoffISO, ...validSources);
    meta.shellCount = shellCountResult?.count || 0;
    
    console.log(`[ActivityStorage] Found ${transformed.length} activities (${meta.shellCount} shells in window)`);
    
    return {
      ok: true,
      data: transformed,
      meta
    };
  } catch (error) {
    console.error('[ActivityStorage] Error fetching activities:', error);
    return {
      ok: false,
      error: {
        code: 'DB_ERROR',
        message: error.message
      }
    };
  }
}

/**
 * Check if activities table exists (new two-table model)
 * @returns {boolean}
 */
export function tableExists() {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='activities'
    `).get();
    return !!result;
  } catch (error) {
    console.error('[ActivityStorage] Error checking table:', error);
    return false;
  }
}

/**
 * Get activity count for a user (from new activities table)
 * @param {number} userId - Numeric user ID
 * @returns {number} Count of activities
 */
export function getActivityCount(userId) {
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM activities WHERE user_id = ?
    `).get(userId);
    return result?.count || 0;
  } catch (error) {
    console.error('[ActivityStorage] Error counting activities:', error);
    return 0;
  }
}

/**
 * Get activity sources for a specific activity
 * @param {string} activityId - Activity ID
 * @returns {Object[]} Array of source records
 */
export function getActivitySources(activityId) {
  try {
    return db.prepare(`
      SELECT * FROM activity_sources WHERE activity_id = ?
    `).all(activityId);
  } catch (error) {
    console.error('[ActivityStorage] Error getting sources:', error);
    return [];
  }
}

export default {
  getActivities,
  tableExists,
  getActivityCount,
  getActivitySources,
  VALID_PROVIDERS
};
