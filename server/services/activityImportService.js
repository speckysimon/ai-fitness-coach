/**
 * Activity Import Service
 * 
 * Handles the two-table activity model:
 * - findOrCreateActivity(): Fuzzy matching to prevent duplicates
 * - upsertActivitySource(): Store provider records
 * - applyBestDataWins(): Priority merge (Intervals > Strava)
 */

import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

// Provider priority for "best data wins" (higher = better)
const PROVIDER_PRIORITY = {
  intervals: 3,    // Best power/TSS data + computed zones/load
  fit_upload: 2.5, // Raw device sensor data (HR, power, cadence)
  strava: 2,       // Good general data (lossy summary)
  manual: 1        // User intent, never overwritten
};

// Match window constants
const TIME_WINDOW_MS = 5 * 60 * 1000;  // ±5 minutes
const DURATION_TOLERANCE = 0.20;        // ±20%

/**
 * Normalize sport name to standard format
 * @param {string} type - Activity type from provider
 * @returns {string} Normalized sport
 */
function normalizeSport(type) {
  if (!type) return 'other';
  
  const t = type.toLowerCase();
  
  if (t.includes('ride') || t.includes('cycling') || t.includes('bike')) {
    return 'cycling';
  }
  if (t.includes('run') || t.includes('running')) {
    return 'running';
  }
  if (t.includes('swim')) {
    return 'swimming';
  }
  if (t.includes('walk') || t.includes('hike')) {
    return 'walking';
  }
  if (t.includes('weight') || t.includes('strength')) {
    return 'strength';
  }
  
  return 'other';
}

/**
 * Find existing activity by fuzzy matching OR create new one
 * 
 * Match criteria (in order):
 * 1. Exact provider ID match (re-import of same activity)
 * 2. Fuzzy time/duration match (same physical ride from different provider)
 * 
 * @param {number} userId - User ID
 * @param {Object} incoming - Incoming activity data
 * @param {string} incoming.provider - 'strava', 'intervals', 'manual'
 * @param {string} incoming.provider_id - Provider's activity ID
 * @param {string} incoming.start_time - ISO 8601 UTC
 * @param {number} incoming.duration_s - Duration in seconds
 * @param {string} incoming.sport - Normalized sport
 * @returns {{ activity: Object, created: boolean, matchMethod: string }}
 */
export function findOrCreateActivity(userId, incoming) {
  const now = new Date().toISOString();
  
  // 1. Check if this exact provider record already exists
  const existingSource = db.prepare(`
    SELECT activity_id FROM activity_sources 
    WHERE user_id = ? AND provider = ? AND provider_id = ?
  `).get(userId, incoming.provider, incoming.provider_id);
  
  if (existingSource) {
    // Re-import: return existing activity
    const activity = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(existingSource.activity_id);
    if (activity) {
      console.log(`[Import] Exact match: provider=${incoming.provider}, id=${incoming.provider_id} → activity=${activity.id}`);
      return { activity, created: false, matchMethod: 'exact_id' };
    }
  }
  
  // 2. Manual activities: always create new (never fuzzy match)
  if (incoming.provider === 'manual') {
    const newId = uuidv4();
    const activity = {
      id: newId,
      user_id: userId,
      name: incoming.name || 'Manual Activity',
      sport: incoming.sport || 'cycling',
      type: incoming.type || 'Ride',
      start_time: incoming.start_time,
      timezone_offset_min: incoming.timezone_offset_min || null,
      duration_s: incoming.duration_s || null,
      distance_m: incoming.distance_m || null,
      elevation_m: incoming.elevation_m || null,
      avg_power: incoming.avg_power || null,
      max_power: incoming.max_power || null,
      normalized_power: incoming.normalized_power || null,
      tss: incoming.tss || null,
      avg_hr: incoming.avg_hr || null,
      max_hr: incoming.max_hr || null,
      avg_cadence: incoming.avg_cadence || null,
      has_power: incoming.has_power || 0,
      avg_speed: incoming.avg_speed || null,
      max_speed: incoming.max_speed || null,
      calories: incoming.calories || null,
      match_method: 'manual',
      primary_source: 'manual',
      created_at: now,
      updated_at: now
    };
    
    insertActivity(activity);
    console.log(`[Import] Created manual activity: ${newId}`);
    return { activity, created: true, matchMethod: 'manual' };
  }
  
  // 3. Fuzzy match: same user, same sport, similar time/duration
  const incomingTime = new Date(incoming.start_time).getTime();
  const minTime = new Date(incomingTime - TIME_WINDOW_MS).toISOString();
  const maxTime = new Date(incomingTime + TIME_WINDOW_MS).toISOString();
  
  const candidates = db.prepare(`
    SELECT * FROM activities 
    WHERE user_id = ? 
      AND sport = ?
      AND start_time >= ? 
      AND start_time <= ?
  `).all(userId, incoming.sport, minTime, maxTime);
  
  for (const candidate of candidates) {
    // Check duration tolerance
    if (candidate.duration_s && incoming.duration_s) {
      const durationRatio = Math.abs(candidate.duration_s - incoming.duration_s) / candidate.duration_s;
      if (durationRatio <= DURATION_TOLERANCE) {
        console.log(`[Import] Fuzzy match: ${incoming.provider}:${incoming.provider_id} → activity=${candidate.id} (time+duration)`);
        return { activity: candidate, created: false, matchMethod: 'fuzzy_time' };
      }
    } else {
      // No duration to compare, match on time alone (risky but acceptable)
      console.log(`[Import] Fuzzy match: ${incoming.provider}:${incoming.provider_id} → activity=${candidate.id} (time only)`);
      return { activity: candidate, created: false, matchMethod: 'fuzzy_time' };
    }
  }
  
  // 4. No match found: create new activity
  const newId = uuidv4();
  const activity = {
    id: newId,
    user_id: userId,
    name: incoming.name || 'Activity',
    sport: incoming.sport || 'cycling',
    type: incoming.type || 'Ride',
    start_time: incoming.start_time,
    timezone_offset_min: incoming.timezone_offset_min || null,
    duration_s: incoming.duration_s || null,
    distance_m: incoming.distance_m || null,
    elevation_m: incoming.elevation_m || null,
    avg_power: incoming.avg_power || null,
    max_power: incoming.max_power || null,
    normalized_power: incoming.normalized_power || null,
    tss: incoming.tss || null,
    avg_hr: incoming.avg_hr || null,
    max_hr: incoming.max_hr || null,
    avg_cadence: incoming.avg_cadence || null,
    has_power: (incoming.avg_power || incoming.normalized_power) ? 1 : 0,
    avg_speed: incoming.avg_speed || null,
    max_speed: incoming.max_speed || null,
    calories: incoming.calories || null,
    match_method: 'new',
    primary_source: incoming.provider,
    created_at: now,
    updated_at: now
  };
  
  insertActivity(activity);
  console.log(`[Import] Created new activity: ${newId} from ${incoming.provider}:${incoming.provider_id}`);
  return { activity, created: true, matchMethod: 'new' };
}

/**
 * Insert activity into database
 */
function insertActivity(activity) {
  db.prepare(`
    INSERT INTO activities (
      id, user_id, name, sport, type, start_time, timezone_offset_min,
      duration_s, distance_m, elevation_m,
      avg_power, max_power, normalized_power, tss,
      avg_hr, max_hr, avg_cadence, has_power,
      avg_speed, max_speed, calories,
      match_method, primary_source, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?
    )
  `).run(
    activity.id, activity.user_id, activity.name, activity.sport, activity.type,
    activity.start_time, activity.timezone_offset_min,
    activity.duration_s, activity.distance_m, activity.elevation_m,
    activity.avg_power, activity.max_power, activity.normalized_power, activity.tss,
    activity.avg_hr, activity.max_hr, activity.avg_cadence, activity.has_power,
    activity.avg_speed, activity.max_speed, activity.calories,
    activity.match_method, activity.primary_source, activity.created_at, activity.updated_at
  );
}

/**
 * Upsert activity source (provider record)
 * 
 * @param {string} activityId - Parent activity ID
 * @param {number} userId - User ID
 * @param {Object} source - Provider data
 * @returns {{ source: Object, created: boolean }}
 */
export function upsertActivitySource(activityId, userId, source) {
  const now = new Date().toISOString();
  const sourceId = `${source.provider}:${source.provider_id}`;
  const rawJson = source.raw_json || null;
  
  // Check if source already exists
  const existing = db.prepare(`
    SELECT id FROM activity_sources WHERE id = ?
  `).get(sourceId);
  
  if (existing) {
    // Update existing source
    // Preserve is_enriched if already set, unless new data has metrics
    const hasMetrics = source.duration_s || source.distance_m || source.tss;
    db.prepare(`
      UPDATE activity_sources SET
        activity_id = ?,
        name = ?,
        type = ?,
        raw_duration_s = ?,
        raw_distance_m = ?,
        raw_elevation_m = ?,
        raw_avg_power = ?,
        raw_max_power = ?,
        raw_np = ?,
        raw_tss = ?,
        raw_avg_hr = ?,
        raw_max_hr = ?,
        raw_avg_cadence = ?,
        raw_avg_speed = ?,
        raw_max_speed = ?,
        raw_calories = ?,
        raw_json = CASE WHEN ? IS NOT NULL THEN ? ELSE raw_json END,
        is_enriched = CASE WHEN ? = 1 THEN 1 ELSE is_enriched END,
        enriched_at = CASE WHEN ? = 1 THEN ? ELSE enriched_at END,
        updated_at = ?
      WHERE id = ?
    `).run(
      activityId,
      source.name,
      source.type,
      source.duration_s,
      source.distance_m,
      source.elevation_m,
      source.avg_power,
      source.max_power,
      source.normalized_power,
      source.tss,
      source.avg_hr,
      source.max_hr,
      source.avg_cadence,
      source.avg_speed,
      source.max_speed,
      source.calories,
      rawJson, rawJson,
      hasMetrics ? 1 : 0,
      hasMetrics ? 1 : 0,
      now,
      now,
      sourceId
    );
    
    console.log(`[Import] Updated source: ${sourceId}${rawJson ? ' (with raw_json)' : ''}`);
    return { sourceId, created: false };
  }
  
  // Insert new source
  // Mark as enriched if it has core metrics (duration + distance + tss)
  const hasMetrics = source.duration_s || source.distance_m || source.tss;
  db.prepare(`
    INSERT INTO activity_sources (
      id, activity_id, user_id, provider, provider_id,
      name, type,
      raw_duration_s, raw_distance_m, raw_elevation_m,
      raw_avg_power, raw_max_power, raw_np, raw_tss,
      raw_avg_hr, raw_max_hr, raw_avg_cadence,
      raw_avg_speed, raw_max_speed, raw_calories,
      raw_json,
      is_enriched, enriched_at,
      imported_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?,
      ?,
      ?, ?,
      ?, ?
    )
  `).run(
    sourceId, activityId, userId, source.provider, source.provider_id,
    source.name, source.type,
    source.duration_s, source.distance_m, source.elevation_m,
    source.avg_power, source.max_power, source.normalized_power, source.tss,
    source.avg_hr, source.max_hr, source.avg_cadence,
    source.avg_speed, source.max_speed, source.calories,
    rawJson,
    hasMetrics ? 1 : 0, hasMetrics ? now : null,
    now, now
  );
  
  console.log(`[Import] Created source: ${sourceId} → activity=${activityId}${rawJson ? ' (with raw_json)' : ''}`);
  return { sourceId, created: true };
}

/**
 * Check if a source field value is meaningful (not null/undefined/0/empty)
 * @param {*} value - The value to check
 * @param {string} fieldType - 'string' or 'number'
 * @returns {boolean}
 */
function isSourceValueMeaningful(value, fieldType = 'number') {
  if (value === null || value === undefined) return false;
  if (fieldType === 'string') {
    return typeof value === 'string' && value.trim().length > 0 && value.trim() !== 'Untitled Activity';
  }
  if (fieldType === 'number') {
    return typeof value === 'number' && value > 0;
  }
  return Boolean(value);
}

/**
 * Apply "best data wins" priority merge
 * Updates the activity with best values from all linked sources
 * 
 * Priority: Intervals > Strava > Manual (for metrics)
 * Exception: Manual activities are never overwritten
 * SAFETY: Never overwrite meaningful values with empty/zero values
 * 
 * @param {string} activityId - Activity to update
 */
export function applyBestDataWins(activityId) {
  const now = new Date().toISOString();
  
  // Get the activity
  const activity = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(activityId);
  if (!activity) {
    console.error(`[Import] Activity not found: ${activityId}`);
    return;
  }
  
  // Manual activities are never overwritten
  if (activity.primary_source === 'manual') {
    console.log(`[Import] Skipping merge for manual activity: ${activityId}`);
    return;
  }
  
  // Get all sources for this activity, ordered by priority (Intervals > FIT > Strava > Manual)
  const sources = db.prepare(`
    SELECT * FROM activity_sources 
    WHERE activity_id = ?
    ORDER BY 
      CASE provider 
        WHEN 'intervals' THEN 3
        WHEN 'fit_upload' THEN 2.5
        WHEN 'strava' THEN 2
        WHEN 'manual' THEN 1
        ELSE 0
      END DESC
  `).all(activityId);
  
  if (sources.length === 0) {
    console.log(`[Import] No sources for activity: ${activityId}`);
    return;
  }
  
  // Start with existing activity values (preserve what we have)
  const merged = {
    name: activity.name,
    type: activity.type,
    duration_s: activity.duration_s,
    distance_m: activity.distance_m,
    elevation_m: activity.elevation_m,
    avg_power: activity.avg_power,
    max_power: activity.max_power,
    normalized_power: activity.normalized_power,
    tss: activity.tss,
    avg_hr: activity.avg_hr,
    max_hr: activity.max_hr,
    avg_cadence: activity.avg_cadence,
    avg_speed: activity.avg_speed,
    max_speed: activity.max_speed,
    calories: activity.calories,
    primary_source: sources[0].provider
  };
  
  // Load existing provenance or initialize empty
  let provenance = {};
  if (activity.metric_provenance_json) {
    try {
      provenance = JSON.parse(activity.metric_provenance_json);
    } catch (e) {
      // Invalid JSON, start fresh
      provenance = {};
    }
  }
  
  // Track which fields were updated for logging
  const fieldsUpdated = [];
  const fieldsSkipped = [];
  
  // Special rule: Name prefers Strava (more descriptive) but only if meaningful
  const stravaSource = sources.find(s => s.provider === 'strava');
  if (stravaSource && isSourceValueMeaningful(stravaSource.name, 'string')) {
    if (merged.name !== stravaSource.name) {
      fieldsUpdated.push(`name: "${merged.name}" → "${stravaSource.name}"`);
      merged.name = stravaSource.name;
    }
  }
  
  // For all other fields, highest priority MEANINGFUL value wins
  // Only update if the source has a meaningful value
  for (const source of sources) {
    // Name (if not already set from Strava)
    if (!isSourceValueMeaningful(merged.name, 'string') && isSourceValueMeaningful(source.name, 'string')) {
      fieldsUpdated.push(`name: "${merged.name}" → "${source.name}" (${source.provider})`);
      merged.name = source.name;
    }
    
    // Type
    if (!isSourceValueMeaningful(merged.type, 'string') && isSourceValueMeaningful(source.type, 'string')) {
      merged.type = source.type;
    }
    
    // Duration - only update if source has meaningful value
    if (isSourceValueMeaningful(source.raw_duration_s, 'number')) {
      if (!isSourceValueMeaningful(merged.duration_s, 'number')) {
        fieldsUpdated.push(`duration_s (${source.provider})`);
        merged.duration_s = source.raw_duration_s;
        provenance.duration_s = source.provider;
      }
    }
    
    // Distance
    if (isSourceValueMeaningful(source.raw_distance_m, 'number')) {
      if (!isSourceValueMeaningful(merged.distance_m, 'number')) {
        fieldsUpdated.push(`distance_m (${source.provider})`);
        merged.distance_m = source.raw_distance_m;
        provenance.distance_m = source.provider;
      }
    }
    
    // Elevation
    if (isSourceValueMeaningful(source.raw_elevation_m, 'number')) {
      if (!isSourceValueMeaningful(merged.elevation_m, 'number')) {
        fieldsUpdated.push(`elevation_m (${source.provider})`);
        merged.elevation_m = source.raw_elevation_m;
        provenance.elevation_m = source.provider;
      }
    }
    
    // Power metrics - Intervals preferred, but only if meaningful
    if (isSourceValueMeaningful(source.raw_avg_power, 'number')) {
      if (!isSourceValueMeaningful(merged.avg_power, 'number')) {
        fieldsUpdated.push(`avg_power (${source.provider})`);
        merged.avg_power = source.raw_avg_power;
        provenance.avg_power = source.provider;
      }
    }
    
    if (isSourceValueMeaningful(source.raw_max_power, 'number')) {
      if (!isSourceValueMeaningful(merged.max_power, 'number')) {
        fieldsUpdated.push(`max_power (${source.provider})`);
        merged.max_power = source.raw_max_power;
        provenance.max_power = source.provider;
      }
    }
    
    if (isSourceValueMeaningful(source.raw_np, 'number')) {
      if (!isSourceValueMeaningful(merged.normalized_power, 'number')) {
        fieldsUpdated.push(`normalized_power (${source.provider})`);
        merged.normalized_power = source.raw_np;
        provenance.normalized_power = source.provider;
      }
    }
    
    // TSS - Intervals preferred
    if (isSourceValueMeaningful(source.raw_tss, 'number')) {
      if (!isSourceValueMeaningful(merged.tss, 'number')) {
        fieldsUpdated.push(`tss (${source.provider})`);
        merged.tss = source.raw_tss;
        provenance.tss = source.provider;
      }
    }
    
    // HR metrics
    if (isSourceValueMeaningful(source.raw_avg_hr, 'number')) {
      if (!isSourceValueMeaningful(merged.avg_hr, 'number')) {
        fieldsUpdated.push(`avg_hr (${source.provider})`);
        merged.avg_hr = source.raw_avg_hr;
        provenance.avg_hr = source.provider;
      }
    }
    
    if (isSourceValueMeaningful(source.raw_max_hr, 'number')) {
      if (!isSourceValueMeaningful(merged.max_hr, 'number')) {
        fieldsUpdated.push(`max_hr (${source.provider})`);
        merged.max_hr = source.raw_max_hr;
        provenance.max_hr = source.provider;
      }
    }
    
    // Cadence
    if (isSourceValueMeaningful(source.raw_avg_cadence, 'number')) {
      if (!isSourceValueMeaningful(merged.avg_cadence, 'number')) {
        fieldsUpdated.push(`avg_cadence (${source.provider})`);
        merged.avg_cadence = source.raw_avg_cadence;
        provenance.avg_cadence = source.provider;
      }
    }
    
    // Speed metrics (from Intervals.icu)
    if (isSourceValueMeaningful(source.raw_avg_speed, 'number')) {
      if (!isSourceValueMeaningful(merged.avg_speed, 'number')) {
        fieldsUpdated.push(`avg_speed (${source.provider})`);
        merged.avg_speed = source.raw_avg_speed;
        provenance.avg_speed = source.provider;
      }
    }
    
    if (isSourceValueMeaningful(source.raw_max_speed, 'number')) {
      if (!isSourceValueMeaningful(merged.max_speed, 'number')) {
        fieldsUpdated.push(`max_speed (${source.provider})`);
        merged.max_speed = source.raw_max_speed;
        provenance.max_speed = source.provider;
      }
    }
    
    // Calories
    if (isSourceValueMeaningful(source.raw_calories, 'number')) {
      if (!isSourceValueMeaningful(merged.calories, 'number')) {
        fieldsUpdated.push(`calories (${source.provider})`);
        merged.calories = source.raw_calories;
        provenance.calories = source.provider;
      }
    }
  }
  
  // Provenance completion: For any meaningful canonical value that doesn't have provenance yet,
  // attribute it to the highest-priority source that has that metric
  // This ensures single-source activities and already-complete activities get full provenance
  const metricsToTrack = [
    { canonical: 'duration_s', source: 'raw_duration_s' },
    { canonical: 'distance_m', source: 'raw_distance_m' },
    { canonical: 'elevation_m', source: 'raw_elevation_m' },
    { canonical: 'avg_power', source: 'raw_avg_power' },
    { canonical: 'max_power', source: 'raw_max_power' },
    { canonical: 'normalized_power', source: 'raw_np' },
    { canonical: 'tss', source: 'raw_tss' },
    { canonical: 'avg_hr', source: 'raw_avg_hr' },
    { canonical: 'max_hr', source: 'raw_max_hr' },
    { canonical: 'avg_cadence', source: 'raw_avg_cadence' },
    { canonical: 'avg_speed', source: 'raw_avg_speed' },
    { canonical: 'max_speed', source: 'raw_max_speed' },
    { canonical: 'calories', source: 'raw_calories' }
  ];
  
  for (const metric of metricsToTrack) {
    // If canonical has meaningful value but provenance is missing
    if (isSourceValueMeaningful(merged[metric.canonical], 'number') && !provenance[metric.canonical]) {
      // Find highest-priority source that has this metric
      for (const source of sources) {
        if (isSourceValueMeaningful(source[metric.source], 'number')) {
          provenance[metric.canonical] = source.provider;
          break; // Sources already ordered by priority
        }
      }
    }
  }
  
  // Serialize provenance for storage
  const provenanceJson = Object.keys(provenance).length > 0 ? JSON.stringify(provenance) : null;
  
  // ── Stream-aware physiology source selection ──────────────────────────
  // Priority: FIT > Intervals-native > Strava
  // Eligible = has_time_stream AND (has_power_stream OR has_hr_stream)
  let physiologySource = null;
  let metadataSource = null;

  // Determine physiology_source: prefer source with eligible streams
  for (const source of sources) {
    const hasEligibleStreams = source.has_time_stream === 1 &&
      (source.has_power_stream === 1 || source.has_hr_stream === 1);
    if (hasEligibleStreams && !physiologySource) {
      physiologySource = source.provider;
    }
  }
  // Fallback: highest-priority source with power or HR summary data
  if (!physiologySource) {
    for (const source of sources) {
      if (isSourceValueMeaningful(source.raw_avg_power, 'number') ||
          isSourceValueMeaningful(source.raw_avg_hr, 'number')) {
        physiologySource = source.provider;
        break;
      }
    }
  }

  // Determine metadata_source: source that provided the name
  const stravaSrc = sources.find(s => s.provider === 'strava');
  metadataSource = stravaSrc && isSourceValueMeaningful(stravaSrc.name, 'string')
    ? 'strava'
    : (sources[0]?.provider || null);

  // Update activity with merged values
  db.prepare(`
    UPDATE activities SET
      name = ?,
      type = ?,
      duration_s = ?,
      distance_m = ?,
      elevation_m = ?,
      avg_power = ?,
      max_power = ?,
      normalized_power = ?,
      tss = ?,
      avg_hr = ?,
      max_hr = ?,
      avg_cadence = ?,
      avg_speed = ?,
      max_speed = ?,
      calories = ?,
      has_power = ?,
      primary_source = ?,
      physiology_source = ?,
      metadata_source = ?,
      metric_provenance_json = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    merged.name,
    merged.type,
    merged.duration_s,
    merged.distance_m,
    merged.elevation_m,
    merged.avg_power,
    merged.max_power,
    merged.normalized_power,
    merged.tss,
    merged.avg_hr,
    merged.max_hr,
    merged.avg_cadence,
    merged.avg_speed,
    merged.max_speed,
    merged.calories,
    (merged.avg_power || merged.normalized_power) ? 1 : 0,
    merged.primary_source,
    physiologySource,
    metadataSource,
    provenanceJson,
    now,
    activityId
  );
  
  console.log(`[Import] Merged activity ${activityId}: primary_source=${merged.primary_source}, sources=${sources.length}${fieldsUpdated.length > 0 ? ', updated: ' + fieldsUpdated.join(', ') : ''}`);
}

/**
 * Check if a value is meaningful (non-null, non-zero for numbers, non-empty for strings)
 */
function isMeaningfulValue(value, type = 'number') {
  if (value === null || value === undefined) return false;
  if (type === 'number') return typeof value === 'number' && value > 0;
  if (type === 'string') return typeof value === 'string' && value.trim().length > 0;
  return Boolean(value);
}

/**
 * Check if an activity has meaningful data worth importing
 * Activities with no duration AND no distance AND no TSS AND no power AND no HR are considered invalid
 */
function isValidActivity(normalized) {
  const hasDuration = isMeaningfulValue(normalized.duration_s, 'number');
  const hasDistance = isMeaningfulValue(normalized.distance_m, 'number');
  const hasTSS = isMeaningfulValue(normalized.tss, 'number');
  const hasPower = isMeaningfulValue(normalized.avg_power, 'number');
  const hasHR = isMeaningfulValue(normalized.avg_hr, 'number');
  
  // Must have at least one meaningful metric
  return hasDuration || hasDistance || hasTSS || hasPower || hasHR;
}

/**
 * Import a single activity from a provider
 * This is the main entry point for imports
 * 
 * Staged approach for Intervals.icu:
 * - Stage A: ALWAYS upsert activity_sources (even for lite activities)
 * - Only create/merge canonical activities when we have enough metrics
 * - Lite activities become "source-only pending enrichment"
 * 
 * @param {number} userId - User ID
 * @param {Object} providerActivity - Raw activity from provider
 * @param {string} provider - 'strava', 'intervals', 'manual'
 * @returns {{ activityId: string, created: boolean, matchMethod: string, liteStored?: boolean, needsEnrichment?: boolean, providerId?: string }}
 */
export function importActivity(userId, providerActivity, provider) {
  // Build raw_json from provider activity data
  // For Intervals: _raw is set by intervalsService.getActivity() with full API response
  // For Strava: extract map/polyline data so route maps work
  let rawJsonStr = null;
  if (providerActivity._raw) {
    rawJsonStr = JSON.stringify(providerActivity._raw);
  } else if (provider === 'strava' && providerActivity.map?.summary_polyline) {
    // Store slim Strava raw with map data for route display
    rawJsonStr = JSON.stringify({
      map: providerActivity.map,
      start_latlng: providerActivity.start_latlng,
      end_latlng: providerActivity.end_latlng,
      trainer: providerActivity.trainer,
      device_name: providerActivity.device_name
    });
  }
  
  // Normalize incoming data
  const normalized = normalizeProviderActivity(providerActivity, provider);
  const now = new Date().toISOString();
  
  // Check if this is a lite activity (missing core metrics)
  const isLite = !isValidActivity(normalized);
  
  if (isLite) {
    // Stage A: Store source row even for lite activities (pending enrichment)
    // Do NOT create canonical activity yet - wait for enrichment
    const sourceId = `${provider}:${normalized.provider_id}`;
    
    // Check if source already exists
    const existingSource = db.prepare(`
      SELECT id, activity_id, is_enriched FROM activity_sources WHERE id = ?
    `).get(sourceId);
    
    if (existingSource) {
      // Source exists - check if it's already enriched
      if (existingSource.is_enriched && existingSource.activity_id) {
        // CRITICAL: Already enriched with canonical - DO NOT disconnect it
        // This is a re-sync with lite data, but we already have full data stored
        // Just update the timestamp and skip re-processing
        db.prepare(`UPDATE activity_sources SET updated_at = ? WHERE id = ?`).run(now, sourceId);
        console.log(`[Import] ✅ Lite re-sync of already-enriched source ${sourceId} - preserving canonical link`);
        return {
          activityId: existingSource.activity_id,
          created: false,
          matchMethod: 'enriched_preserved',
          skipped: false
        };
      } else {
        // Still pending enrichment - update timestamps and classify
        const isIntervalsStravaShell = provider === 'intervals' && !String(normalized.provider_id).startsWith('i');
        const canEnrich = !isIntervalsStravaShell;
        
        // Ensure source_kind is set (retroactive classification)
        if (isIntervalsStravaShell) {
          db.prepare(`
            UPDATE activity_sources 
            SET updated_at = ?, source_kind = 'intervals_strava_shell', 
                ignore_reason = 'strava_restricted_no_detail',
                strava_activity_id = ?
            WHERE id = ?
          `).run(now, String(normalized.provider_id), sourceId);
          console.log(`[Import] Lite Strava shell ${sourceId} — classified as intervals_strava_shell, not enrichable`);
        } else {
          db.prepare(`UPDATE activity_sources SET updated_at = ?, source_kind = COALESCE(source_kind, 'intervals_native') WHERE id = ?`).run(now, sourceId);
          console.log(`[Import] Lite activity ${sourceId} still pending enrichment`);
        }
        return {
          activityId: existingSource.activity_id,
          created: false,
          matchMethod: isIntervalsStravaShell ? 'ignored_shell' : 'lite_existing',
          liteStored: true,
          needsEnrichment: canEnrich,
          providerId: normalized.provider_id,
          sourceKind: isIntervalsStravaShell ? 'intervals_strava_shell' : 'intervals_native'
        };
      }
    } else {
      // New lite source
      // Only native Intervals.icu IDs (i-prefix) can be enriched.
      // Numeric IDs are Strava shell references — /activity/{id} always 404s.
      const isIntervalsStravaShell = provider === 'intervals' && !String(normalized.provider_id).startsWith('i');
      const canEnrich = !isIntervalsStravaShell;
      
      // CRITICAL: Intervals Strava shells MUST NEVER create canonical activities.
      // They are stored as source-only with source_kind='intervals_strava_shell'.
      // When Strava is connected, the reconciliation job will fetch real data.
      let activityId = null;
      let created = false;
      
      // Determine source_kind and ignore_reason
      let sourceKind = null;
      let ignoreReason = null;
      let stravaActivityId = null;
      
      if (isIntervalsStravaShell) {
        sourceKind = 'intervals_strava_shell';
        ignoreReason = 'strava_restricted_no_detail';
        stravaActivityId = String(normalized.provider_id);
        console.log(`[Import] Intervals Strava shell detected: ${sourceId} (strava_id=${stravaActivityId}) — source-only, NO canonical`);
      } else {
        sourceKind = 'intervals_native';
      }
      
      db.prepare(`
        INSERT INTO activity_sources (
          id, activity_id, user_id, provider, provider_id,
          name, type,
          raw_duration_s, raw_distance_m, raw_elevation_m,
          raw_avg_power, raw_max_power, raw_np, raw_tss,
          raw_avg_hr, raw_max_hr, raw_avg_cadence,
          raw_avg_speed, raw_max_speed, raw_calories,
          is_enriched, enriched_at,
          source_kind, ignore_reason, strava_activity_id,
          imported_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          0, NULL,
          ?, ?, ?,
          ?, ?
        )
      `).run(
        sourceId, activityId, userId, provider, normalized.provider_id,
        normalized.name, normalized.type,
        normalized.duration_s, normalized.distance_m, normalized.elevation_m,
        normalized.avg_power, normalized.max_power, normalized.normalized_power, normalized.tss,
        normalized.avg_hr, normalized.max_hr, normalized.avg_cadence,
        normalized.avg_speed, normalized.max_speed, normalized.calories,
        sourceKind, ignoreReason, stravaActivityId,
        now, now
      );
      
      console.log(`[Import] Stored lite source: ${sourceId} (source_kind=${sourceKind}, activity_id=${activityId}, is_enriched=0)`);
      return {
        activityId,
        created,
        matchMethod: isIntervalsStravaShell ? 'ignored_shell' : 'lite_stored',
        liteStored: true,
        needsEnrichment: canEnrich,
        providerId: normalized.provider_id,
        sourceKind
      };
    }
  }
  
  // Full activity (has metrics) - proceed with normal import
  // Check for duplicate source (already in activity_sources)
  const existingSource = db.prepare(`
    SELECT id, activity_id, is_enriched FROM activity_sources 
    WHERE user_id = ? AND provider = ? AND provider_id = ?
  `).get(userId, provider, normalized.provider_id);
  
  if (existingSource) {
    // Check if this is a previously-lite source being enriched
    const isPendingEnrichment = existingSource.activity_id === null || existingSource.activity_id === '';
    
    if (isPendingEnrichment) {
      // This is an enrichment of a lite source - create canonical now
      console.log(`[Import] Enriching previously-lite source: ${existingSource.id}`);
      
      // Create the canonical activity
      const { activity, created, matchMethod } = findOrCreateActivity(userId, {
        provider,
        provider_id: normalized.provider_id,
        start_time: normalized.start_time,
        duration_s: normalized.duration_s,
        sport: normalized.sport,
        name: normalized.name,
        type: normalized.type,
        timezone_offset_min: normalized.timezone_offset_min,
        distance_m: normalized.distance_m,
        elevation_m: normalized.elevation_m,
        avg_power: normalized.avg_power,
        max_power: normalized.max_power,
        normalized_power: normalized.normalized_power,
        tss: normalized.tss,
        avg_hr: normalized.avg_hr,
        max_hr: normalized.max_hr,
        avg_cadence: normalized.avg_cadence,
        has_power: normalized.has_power,
        avg_speed: normalized.avg_speed,
        max_speed: normalized.max_speed,
        calories: normalized.calories
      });
      
      // Update the source row with real activity_id and mark as enriched
      // Store raw_json from the full API response (zones, intervals, advanced metrics)
      const now = new Date().toISOString();
      const rawJson = providerActivity._raw ? JSON.stringify(providerActivity._raw) : null;
      
      db.prepare(`
        UPDATE activity_sources SET
          activity_id = ?,
          raw_duration_s = ?,
          raw_distance_m = ?,
          raw_elevation_m = ?,
          raw_avg_power = ?,
          raw_max_power = ?,
          raw_np = ?,
          raw_tss = ?,
          raw_avg_hr = ?,
          raw_max_hr = ?,
          raw_avg_cadence = ?,
          raw_avg_speed = ?,
          raw_max_speed = ?,
          raw_calories = ?,
          raw_json = ?,
          is_enriched = 1,
          enriched_at = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        activity.id,
        normalized.duration_s,
        normalized.distance_m,
        normalized.elevation_m,
        normalized.avg_power,
        normalized.max_power,
        normalized.normalized_power,
        normalized.tss,
        normalized.avg_hr,
        normalized.max_hr,
        normalized.avg_cadence,
        normalized.avg_speed,
        normalized.max_speed,
        normalized.calories,
        rawJson,
        now,
        now,
        existingSource.id
      );
      
      console.log(`[Import] ✅ Enriched source ${existingSource.id} → canonical ${activity.id}`);
      
      return {
        activityId: activity.id,
        created: created,
        matchMethod: 'enriched',
        enrichedFromLite: true
      };
    }
    
    // Normal re-import of existing source with canonical
    const activity = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(existingSource.activity_id);
    if (activity) {
      // Update the source and apply best data wins
      upsertActivitySource(activity.id, userId, {
        provider,
        provider_id: normalized.provider_id,
        name: normalized.name,
        type: normalized.type,
        duration_s: normalized.duration_s,
        distance_m: normalized.distance_m,
        elevation_m: normalized.elevation_m,
        avg_power: normalized.avg_power,
        max_power: normalized.max_power,
        normalized_power: normalized.normalized_power,
        tss: normalized.tss,
        avg_hr: normalized.avg_hr,
        max_hr: normalized.max_hr,
        avg_cadence: normalized.avg_cadence,
        avg_speed: normalized.avg_speed,
        max_speed: normalized.max_speed,
        calories: normalized.calories,
        raw_json: rawJsonStr
      });
      
      if (provider !== 'manual') {
        applyBestDataWins(activity.id);
      }
      
      // For Intervals activities without _raw, flag for enrichment to get zones/intervals/advanced metrics
      // But skip if source already has raw_json stored (from a previous enrichment)
      const existingRaw = db.prepare(`SELECT raw_json IS NOT NULL as has_raw FROM activity_sources WHERE id = ?`).get(`${provider}:${normalized.provider_id}`);
      const sourceNeedsEnrich = provider === 'intervals' 
        && !rawJsonStr 
        && !existingRaw?.has_raw
        && String(normalized.provider_id).startsWith('i');
      
      return { 
        activityId: activity.id, 
        created: false, 
        matchMethod: 'duplicate_source',
        skipped: false,
        needsEnrichment: sourceNeedsEnrich,
        providerId: sourceNeedsEnrich ? normalized.provider_id : undefined
      };
    }
  }
  
  // Find or create the activity
  const { activity, created, matchMethod } = findOrCreateActivity(userId, {
    provider,
    provider_id: normalized.provider_id,
    start_time: normalized.start_time,
    duration_s: normalized.duration_s,
    sport: normalized.sport,
    name: normalized.name,
    type: normalized.type,
    timezone_offset_min: normalized.timezone_offset_min,
    distance_m: normalized.distance_m,
    elevation_m: normalized.elevation_m,
    avg_power: normalized.avg_power,
    max_power: normalized.max_power,
    normalized_power: normalized.normalized_power,
    tss: normalized.tss,
    avg_hr: normalized.avg_hr,
    max_hr: normalized.max_hr,
    avg_cadence: normalized.avg_cadence,
    has_power: normalized.has_power,
    avg_speed: normalized.avg_speed,
    max_speed: normalized.max_speed,
    calories: normalized.calories
  });
  
  // Upsert the source record
  upsertActivitySource(activity.id, userId, {
    provider,
    provider_id: normalized.provider_id,
    name: normalized.name,
    type: normalized.type,
    duration_s: normalized.duration_s,
    distance_m: normalized.distance_m,
    elevation_m: normalized.elevation_m,
    avg_power: normalized.avg_power,
    max_power: normalized.max_power,
    normalized_power: normalized.normalized_power,
    tss: normalized.tss,
    avg_hr: normalized.avg_hr,
    max_hr: normalized.max_hr,
    avg_cadence: normalized.avg_cadence,
    avg_speed: normalized.avg_speed,
    max_speed: normalized.max_speed,
    calories: normalized.calories,
    raw_json: rawJsonStr
  });
  
  // Apply best-data-wins merge (skip for manual)
  if (provider !== 'manual') {
    applyBestDataWins(activity.id);
  }
  
  // For Intervals activities without _raw, flag for enrichment to get zones/intervals/advanced metrics
  const needsEnrich = provider === 'intervals' 
    && !rawJsonStr 
    && String(normalized.provider_id).startsWith('i');
  
  return { 
    activityId: activity.id, 
    created, 
    matchMethod,
    needsEnrichment: needsEnrich,
    providerId: needsEnrich ? normalized.provider_id : undefined
  };
}

/**
 * Normalize provider activity to standard format
 */
function normalizeProviderActivity(raw, provider) {
  if (provider === 'strava') {
    return {
      provider_id: String(raw.id),
      name: raw.name,
      type: raw.type,
      sport: normalizeSport(raw.type),
      start_time: raw.start_date || raw.start_date_local,
      timezone_offset_min: raw.utc_offset ? Math.round(raw.utc_offset / 60) : null,
      duration_s: raw.moving_time || raw.elapsed_time,
      distance_m: raw.distance,
      elevation_m: raw.total_elevation_gain,
      avg_power: raw.average_watts,
      max_power: raw.max_watts,
      normalized_power: raw.weighted_average_watts,
      tss: null, // Strava doesn't provide TSS
      avg_hr: raw.average_heartrate,
      max_hr: raw.max_heartrate,
      avg_cadence: raw.average_cadence,
      has_power: raw.device_watts ? 1 : 0,
      avg_speed: raw.average_speed || null,
      max_speed: raw.max_speed || null,
      calories: raw.calories || null
    };
  }
  
  if (provider === 'intervals') {
    // Intervals.icu field mapping (from intervalsService.js normalization)
    // The frontend sends pre-normalized data with these field names
    return {
      provider_id: String(raw.id || raw.source_id),
      name: raw.name || 'Untitled Activity',
      type: raw.type || 'Ride',
      sport: normalizeSport(raw.type),
      // Date fields - intervalsService sets date, start_date, start_date_local
      start_time: raw.date || raw.start_date_local || raw.start_date,
      timezone_offset_min: null,
      // Duration - intervalsService sets duration, moving_time, elapsed_time
      // Preserve null instead of defaulting to 0 (null = no data, 0 = zero value)
      duration_s: raw.duration || raw.moving_time || raw.elapsed_time || null,
      // Distance - intervalsService sets distance
      distance_m: raw.distance || null,
      // Elevation - intervalsService sets elevation, total_elevation_gain
      elevation_m: raw.elevation || raw.total_elevation_gain || null,
      // Power - intervalsService sets avgPower, average_watts, icu_average_watts
      avg_power: raw.avgPower || raw.average_watts || raw.icu_average_watts || null,
      max_power: raw.maxPower || raw.max_watts || raw.icu_max_watts || null,
      // NP - intervalsService sets normalizedPower, weighted_average_watts
      normalized_power: raw.normalizedPower || raw.weighted_average_watts || raw.icu_weighted_avg_watts || null,
      // TSS - intervalsService sets tss, icu_training_load
      tss: raw.tss || raw.icu_training_load || null,
      // HR - intervalsService sets avgHeartRate, average_heartrate, avg_hr
      avg_hr: raw.avgHeartRate || raw.average_heartrate || raw.avg_hr || null,
      max_hr: raw.max_heartrate || raw.max_hr || null,
      // Cadence
      avg_cadence: raw.average_cadence || raw.avg_cadence || null,
      has_power: (raw.avgPower || raw.average_watts || raw.icu_average_watts) ? 1 : 0,
      avg_speed: raw.avgSpeed || raw.average_speed || null,
      max_speed: raw.maxSpeed || raw.max_speed || null,
      calories: raw.calories || null
    };
  }
  
  if (provider === 'manual') {
    return {
      provider_id: String(raw.id || uuidv4()),
      name: raw.name || 'Manual Activity',
      type: raw.type || 'Ride',
      sport: normalizeSport(raw.type || raw.sport),
      start_time: raw.start_time || raw.date || new Date().toISOString(),
      timezone_offset_min: raw.timezone_offset_min || null,
      duration_s: raw.duration_s || raw.duration,
      distance_m: raw.distance_m || raw.distance,
      elevation_m: raw.elevation_m || raw.elevation,
      avg_power: raw.avg_power || raw.avgPower,
      max_power: raw.max_power || raw.maxPower,
      normalized_power: raw.normalized_power || raw.normalizedPower,
      tss: raw.tss,
      avg_hr: raw.avg_hr || raw.avgHeartRate,
      max_hr: raw.max_hr || raw.maxHeartRate,
      avg_cadence: raw.avg_cadence || raw.avgCadence,
      has_power: (raw.avg_power || raw.avgPower) ? 1 : 0
    };
  }
  
  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Bulk import activities with detailed skip reason tracking
 * @param {number} userId - User ID
 * @param {Object[]} activities - Array of provider activities
 * @param {string} provider - Provider name
 * @returns {{ imported: number, created: number, updated: number, skipped: number, skipReasons: Object, errors: string[] }}
 */
export function bulkImport(userId, activities, provider) {
  const results = {
    // New staged counters
    sources_upserted: 0,      // Total activity_sources rows written
    canonicals_created: 0,    // New canonical activities created
    canonicals_updated: 0,    // Existing canonical activities updated
    lite_stored: 0,           // Lite sources stored (pending enrichment)
    enriched: 0,              // Previously-lite sources now enriched
    
    // Legacy counters (for backward compatibility)
    imported: 0,              // = canonicals_created + canonicals_updated
    created: 0,               // = canonicals_created
    updated: 0,               // = canonicals_updated
    skipped: 0,               // True errors only (not lite)
    
    skipReasons: {
      parse_error: { count: 0, samples: [] },
      duplicate_fuzzy: { count: 0, samples: [] }
    },
    needsEnrichment: [],      // Provider IDs that need detail fetch
    errors: []
  };
  
  for (const activity of activities) {
    try {
      const { created, liteStored, needsEnrichment, providerId, enrichedFromLite, matchMethod } = importActivity(userId, activity, provider);
      
      // Track already-enriched sources that were preserved (re-sync with lite data)
      if (matchMethod === 'enriched_preserved') {
        results.sources_upserted++;
        results.updated++;
        results.canonicals_updated++;
        results.imported++;
        continue;
      }
      
      // Track lite activities (stored as source-only, pending enrichment)
      if (liteStored) {
        results.lite_stored++;
        results.sources_upserted++;
        
        if (needsEnrichment && providerId) {
          results.needsEnrichment.push(providerId);
        }
        continue;
      }
      
      // Track enriched activities (previously lite, now have full data)
      if (enrichedFromLite) {
        results.enriched++;
        results.sources_upserted++;
        results.imported++;
        if (created) {
          results.created++;
          results.canonicals_created++;
        } else {
          results.updated++;
          results.canonicals_updated++;
        }
        continue;
      }
      
      // Full activity imported (was never lite)
      // Still may need enrichment for zones/intervals/advanced metrics
      if (needsEnrichment && providerId) {
        results.needsEnrichment.push(providerId);
      }
      
      results.sources_upserted++;
      results.imported++;
      
      if (created) {
        results.created++;
        results.canonicals_created++;
      } else {
        results.updated++;
        results.canonicals_updated++;
      }
    } catch (error) {
      console.error(`[Import] Error importing activity:`, error);
      results.errors.push(`${provider}:${activity.id || 'unknown'}: ${error.message}`);
      
      // Track parse errors
      results.skipReasons.parse_error.count++;
      if (results.skipReasons.parse_error.samples.length < 5) {
        results.skipReasons.parse_error.samples.push({
          id: activity.id,
          error: error.message
        });
      }
    }
  }
  
  // Log staged import summary
  console.log(`[Import] Bulk import complete:`);
  console.log(`  📦 Sources upserted: ${results.sources_upserted}`);
  console.log(`  ✅ Canonicals: ${results.canonicals_created} created, ${results.canonicals_updated} updated`);
  if (results.enriched > 0) {
    console.log(`  🎉 Enriched (lite → full): ${results.enriched}`);
  }
  console.log(`  ⏳ Lite stored (pending enrichment): ${results.lite_stored}`);
  console.log(`  🔄 Needs enrichment: ${results.needsEnrichment.length}`);
  if (results.errors.length > 0) {
    console.log(`  ❌ Errors: ${results.errors.length}`);
  }
  
  return results;
}

export default {
  findOrCreateActivity,
  upsertActivitySource,
  applyBestDataWins,
  importActivity,
  bulkImport,
  normalizeSport,
  PROVIDER_PRIORITY
};
