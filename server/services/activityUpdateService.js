/**
 * Activity Update Service
 * 
 * CRITICAL: Split physiology vs metadata updates to enforce source-of-truth rules.
 * 
 * Rules:
 * - Physiology updates MUST check physiology_source priority
 * - Metadata updates MUST check metadata_source priority
 * - Intervals-native physiology is PROTECTED from Strava overwrites
 * - All updates go through guards before applying
 */

import db from '../db.js';
import { guardIntervalsPhysiology } from './activityIntegrityGuard.js';
import { extractStreams } from './streamExtractor.js';
import { upsertCanonicalStreams } from './canonicalStreamService.js';

/**
 * Update activity physiology fields
 * 
 * CRITICAL: This function MUST be called with guard checks.
 * Never call this directly for Strava updates on Intervals-native activities.
 * 
 * @param {string} activityId - Activity ID
 * @param {string} provider - Provider name ('fit', 'intervals', 'strava')
 * @param {Object} physiology - Physiology fields to update
 * @param {Object} streams - Optional stream data
 * @returns {Promise<Object>} Update result
 */
export async function updateActivityPhysiology(activityId, provider, physiology, streams = null) {
  // Guard check
  const guard = guardIntervalsPhysiology(activityId, provider, physiology);
  
  if (!guard.allowed) {
    console.error(`[ActivityUpdate] BLOCKED: ${guard.reason} - ${guard.message}`);
    return {
      ok: false,
      error: guard.reason,
      message: guard.message
    };
  }
  
  // Get existing activity for safe backfill logic
  const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
  
  if (!existing) {
    return {
      ok: false,
      error: 'ACTIVITY_NOT_FOUND',
      message: `Activity ${activityId} not found`
    };
  }
  
  // Safe backfill logic for Strava on Intervals-native
  const isStravaBackfill = existing.physiology_source === 'intervals' && provider === 'strava';
  const backfilledFields = [];
  
  // Build update fields
  const updateFields = [];
  const updateValues = [];
  
  // CRITICAL: Duration is NEVER overwritten by Strava on Intervals-native
  if (physiology.duration_s !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native duration`);
    } else {
      updateFields.push('duration_s = ?');
      updateValues.push(physiology.duration_s);
    }
  }
  
  // Safe backfill: distance_m (only if NULL or 0)
  if (physiology.distance_m !== undefined) {
    if (isStravaBackfill) {
      if (!existing.distance_m || existing.distance_m === 0) {
        updateFields.push('distance_m = ?');
        updateValues.push(physiology.distance_m);
        backfilledFields.push('distance_m');
        console.log(`[ActivityUpdate] STRAVA_CORE_BACKFILL: distance_m = ${physiology.distance_m}`);
      }
    } else {
      updateFields.push('distance_m = ?');
      updateValues.push(physiology.distance_m);
    }
  }
  
  // Safe backfill: elevation_m (only if NULL or 0)
  if (physiology.elevation_m !== undefined) {
    if (isStravaBackfill) {
      if (!existing.elevation_m || existing.elevation_m === 0) {
        updateFields.push('elevation_m = ?');
        updateValues.push(physiology.elevation_m);
        backfilledFields.push('elevation_m');
        console.log(`[ActivityUpdate] STRAVA_CORE_BACKFILL: elevation_m = ${physiology.elevation_m}`);
      }
    } else {
      updateFields.push('elevation_m = ?');
      updateValues.push(physiology.elevation_m);
    }
  }
  
  // CRITICAL: Power metrics NEVER overwritten by Strava on Intervals-native
  if (physiology.avg_power !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native avg_power`);
    } else {
      updateFields.push('avg_power = ?');
      updateValues.push(physiology.avg_power);
    }
  }
  
  if (physiology.max_power !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native max_power`);
    } else {
      updateFields.push('max_power = ?');
      updateValues.push(physiology.max_power);
    }
  }
  
  if (physiology.normalized_power !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native normalized_power`);
    } else {
      updateFields.push('normalized_power = ?');
      updateValues.push(physiology.normalized_power);
    }
  }
  
  if (physiology.tss !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native tss`);
    } else {
      updateFields.push('tss = ?');
      updateValues.push(physiology.tss);
    }
  }
  
  // CRITICAL: Heart rate metrics NEVER overwritten by Strava on Intervals-native
  if (physiology.avg_hr !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native avg_hr`);
    } else {
      updateFields.push('avg_hr = ?');
      updateValues.push(physiology.avg_hr);
    }
  }
  
  if (physiology.max_hr !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native max_hr`);
    } else {
      updateFields.push('max_hr = ?');
      updateValues.push(physiology.max_hr);
    }
  }
  
  // CRITICAL: Cadence NEVER overwritten by Strava on Intervals-native
  if (physiology.avg_cadence !== undefined) {
    if (isStravaBackfill) {
      console.log(`[ActivityUpdate] BLOCKED: Strava cannot overwrite Intervals-native avg_cadence`);
    } else {
      updateFields.push('avg_cadence = ?');
      updateValues.push(physiology.avg_cadence);
    }
  }
  
  // Safe backfill: avg_speed (only if NULL or 0)
  if (physiology.avg_speed !== undefined) {
    if (isStravaBackfill) {
      if (!existing.avg_speed || existing.avg_speed === 0) {
        updateFields.push('avg_speed = ?');
        updateValues.push(physiology.avg_speed);
        backfilledFields.push('avg_speed');
        console.log(`[ActivityUpdate] STRAVA_CORE_BACKFILL: avg_speed = ${physiology.avg_speed}`);
      }
    } else {
      updateFields.push('avg_speed = ?');
      updateValues.push(physiology.avg_speed);
    }
  }
  
  // Safe backfill: max_speed (only if NULL or 0)
  if (physiology.max_speed !== undefined) {
    if (isStravaBackfill) {
      if (!existing.max_speed || existing.max_speed === 0) {
        updateFields.push('max_speed = ?');
        updateValues.push(physiology.max_speed);
        backfilledFields.push('max_speed');
        console.log(`[ActivityUpdate] STRAVA_CORE_BACKFILL: max_speed = ${physiology.max_speed}`);
      }
    } else {
      updateFields.push('max_speed = ?');
      updateValues.push(physiology.max_speed);
    }
  }
  
  // Calories
  if (physiology.calories !== undefined) {
    updateFields.push('calories = ?');
    updateValues.push(physiology.calories);
  }
  
  // Has power flag
  if (physiology.has_power !== undefined) {
    updateFields.push('has_power = ?');
    updateValues.push(physiology.has_power ? 1 : 0);
  }
  
  // Update physiology source ONLY if not doing Strava backfill
  if (!isStravaBackfill) {
    updateFields.push('physiology_source = ?');
    updateValues.push(provider);
  }
  
  // Update timestamp
  updateFields.push('updated_at = datetime(\'now\')');
  
  // Add activity ID for WHERE clause
  updateValues.push(activityId);
  
  if (updateFields.length === 0) {
    return {
      ok: true,
      message: 'No physiology fields to update'
    };
  }
  
  try {
    // Update activity
    const sql = `
      UPDATE activities 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    const result = db.prepare(sql).run(...updateValues);
    
    if (isStravaBackfill && backfilledFields.length > 0) {
      console.log(`[ActivityUpdate] STRAVA_CORE_BACKFILL: ${activityId} (fields: ${backfilledFields.join(', ')})`);
    } else {
      console.log(`[ActivityUpdate] Physiology updated: ${activityId} (provider: ${provider}, fields: ${updateFields.length})`);
    }
    
    // WIRE STREAMS: After physiology update, extract and store streams
    // Only attempt if streams data is provided
    if (streams && typeof streams === 'object') {
      // Get updated activity to get final physiology_source
      const updatedActivity = db.prepare('SELECT physiology_source, duration_s, user_id FROM activities WHERE id = ?').get(activityId);
      
      if (updatedActivity) {
        // Extract streams from provider data
        const extractedStreams = extractStreams(streams, provider, {
          duration_s: updatedActivity.duration_s || physiology.duration_s
        });
        
        if (extractedStreams) {
          // Upsert streams with strict physiology_source enforcement
          const streamResult = await upsertCanonicalStreams(
            updatedActivity.user_id,
            activityId,
            updatedActivity.physiology_source, // Current canonical physiology source
            provider, // Incoming provider attempting to write
            extractedStreams
          );
          
          if (streamResult.ok) {
            console.log(`[ActivityUpdate] ✅ Streams stored for ${activityId} from ${provider}`);
          } else if (streamResult.reason === 'PHYSIOLOGY_SOURCE_MISMATCH') {
            console.log(`[ActivityUpdate] ⚠️  Streams rejected: ${provider} does not match physiology_source (${updatedActivity.physiology_source})`);
          } else {
            console.warn(`[ActivityUpdate] ⚠️  Stream storage failed: ${streamResult.reason || streamResult.error}`);
          }
        } else {
          console.log(`[ActivityUpdate] No streams extracted from ${provider} data`);
        }
      }
    }
    
    return {
      ok: true,
      changes: result.changes,
      provider,
      backfilled: isStravaBackfill ? backfilledFields : []
    };
  } catch (error) {
    console.error(`[ActivityUpdate] Failed to update physiology:`, error.message);
    return {
      ok: false,
      error: 'UPDATE_FAILED',
      message: error.message
    };
  }
}

/**
 * Update activity metadata fields
 * 
 * @param {string} activityId - Activity ID
 * @param {string} provider - Provider name ('fit', 'intervals', 'strava')
 * @param {Object} metadata - Metadata fields to update
 * @returns {Object} Update result
 */
export function updateActivityMetadata(activityId, provider, metadata) {
  // Build update fields
  const updateFields = [];
  const updateValues = [];
  
  // Core metadata fields
  if (metadata.name !== undefined) {
    updateFields.push('name = ?');
    updateValues.push(metadata.name);
  }
  
  if (metadata.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(metadata.description);
  }
  
  if (metadata.sport !== undefined) {
    updateFields.push('sport = ?');
    updateValues.push(metadata.sport);
  }
  
  if (metadata.type !== undefined) {
    updateFields.push('type = ?');
    updateValues.push(metadata.type);
  }
  
  if (metadata.start_time !== undefined) {
    updateFields.push('start_time = ?');
    updateValues.push(metadata.start_time);
  }
  
  if (metadata.timezone_offset_min !== undefined) {
    updateFields.push('timezone_offset_min = ?');
    updateValues.push(metadata.timezone_offset_min);
  }
  
  // Update metadata source
  updateFields.push('metadata_source = ?');
  updateValues.push(provider);
  
  // Update timestamp
  updateFields.push('updated_at = datetime(\'now\')');
  
  // Add activity ID for WHERE clause
  updateValues.push(activityId);
  
  if (updateFields.length === 0) {
    return {
      ok: true,
      message: 'No metadata fields to update'
    };
  }
  
  try {
    // Update activity
    const sql = `
      UPDATE activities 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    const result = db.prepare(sql).run(...updateValues);
    
    console.log(`[ActivityUpdate] Metadata updated: ${activityId} (provider: ${provider}, fields: ${updateFields.length})`);
    
    return {
      ok: true,
      changes: result.changes,
      provider
    };
  } catch (error) {
    console.error(`[ActivityUpdate] Failed to update metadata:`, error.message);
    return {
      ok: false,
      error: 'UPDATE_FAILED',
      message: error.message
    };
  }
}

/**
 * Create new canonical activity
 * 
 * @param {number} userId - User ID
 * @param {string} provider - Provider name
 * @param {Object} activity - Activity data
 * @returns {Object} Create result with activity ID
 */
export function createCanonicalActivity(userId, provider, activity) {
  const activityId = `${provider}:${activity.provider_id || Date.now()}`;
  
  try {
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, timezone_offset_min,
        duration_s, distance_m, elevation_m,
        avg_power, max_power, normalized_power, tss,
        avg_hr, max_hr, avg_cadence, avg_speed, max_speed, calories,
        has_power, physiology_source, metadata_source,
        is_valid_for_analytics, is_shell,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        datetime('now'), datetime('now')
      )
    `).run(
      activityId,
      userId,
      activity.name || 'Untitled',
      activity.sport || 'cycling',
      activity.type || 'Ride',
      activity.start_time,
      activity.timezone_offset_min || 0,
      activity.duration_s || 0,
      activity.distance_m || 0,
      activity.elevation_m || 0,
      activity.avg_power || null,
      activity.max_power || null,
      activity.normalized_power || null,
      activity.tss || null,
      activity.avg_hr || null,
      activity.max_hr || null,
      activity.avg_cadence || null,
      activity.avg_speed || null,
      activity.max_speed || null,
      activity.calories || null,
      activity.has_power ? 1 : 0,
      provider,
      provider,
      activity.is_shell ? 0 : 1,
      activity.is_shell ? 1 : 0
    );
    
    console.log(`[ActivityUpdate] Created canonical: ${activityId} (provider: ${provider})`);
    
    return {
      ok: true,
      activityId,
      provider
    };
  } catch (error) {
    console.error(`[ActivityUpdate] Failed to create canonical:`, error.message);
    return {
      ok: false,
      error: 'CREATE_FAILED',
      message: error.message
    };
  }
}

/**
 * Upsert activity source record
 * 
 * @param {string} activityId - Activity ID (null for source-only)
 * @param {number} userId - User ID
 * @param {string} provider - Provider name
 * @param {string} providerId - Provider's activity ID
 * @param {Object} rawData - Raw provider data
 * @param {Object} options - Additional options
 * @returns {Object} Upsert result
 */
export function upsertActivitySource(activityId, userId, provider, providerId, rawData, options = {}) {
  const sourceId = `${provider}:${providerId}`;
  
  try {
    // Check if source exists
    const existing = db.prepare(`
      SELECT id FROM activity_sources
      WHERE user_id = ? AND provider = ? AND provider_id = ?
    `).get(userId, provider, providerId);
    
    if (existing) {
      // Update existing source
      db.prepare(`
        UPDATE activity_sources
        SET activity_id = ?,
            raw_json = ?,
            is_shell = ?,
            shell_strava_id = ?,
            updated_at = datetime('now')
        WHERE user_id = ? AND provider = ? AND provider_id = ?
      `).run(
        activityId,
        JSON.stringify(rawData),
        options.is_shell ? 1 : 0,
        options.shell_strava_id || null,
        userId,
        provider,
        providerId
      );
      
      console.log(`[ActivityUpdate] Updated source: ${sourceId} → ${activityId || 'source-only'}`);
    } else {
      // Insert new source
      db.prepare(`
        INSERT INTO activity_sources (
          id, activity_id, user_id, provider, provider_id,
          raw_json, is_shell, shell_strava_id,
          imported_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        sourceId,
        activityId,
        userId,
        provider,
        providerId,
        JSON.stringify(rawData),
        options.is_shell ? 1 : 0,
        options.shell_strava_id || null
      );
      
      console.log(`[ActivityUpdate] Created source: ${sourceId} → ${activityId || 'source-only'}`);
    }
    
    return {
      ok: true,
      sourceId,
      activityId
    };
  } catch (error) {
    console.error(`[ActivityUpdate] Failed to upsert source:`, error.message);
    return {
      ok: false,
      error: 'UPSERT_FAILED',
      message: error.message
    };
  }
}

export default {
  updateActivityPhysiology,
  updateActivityMetadata,
  createCanonicalActivity,
  upsertActivitySource
};
