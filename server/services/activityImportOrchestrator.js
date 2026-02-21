/**
 * Activity Import Orchestrator
 * 
 * CRITICAL: This is the single entry point for ALL activity imports.
 * All import services MUST use this orchestrator to ensure:
 * - Canonical selection goes through selectOrCreateCanonicalActivity()
 * - Physiology/metadata updates are split and guarded
 * - Source-of-truth rules are enforced
 * - Post-import integrity verification
 */

import { selectOrCreateCanonicalActivity, findShellByStravaId, REASON_CODES } from './canonicalActivitySelector.js';
import { 
  updateActivityPhysiology, 
  updateActivityMetadata, 
  createCanonicalActivity,
  upsertActivitySource 
} from './activityUpdateService.js';
import { verifyActivityIntegrity } from './activityIntegrityGuard.js';

/**
 * Import activity from any provider
 * 
 * This is the SINGLE authoritative function for activity imports.
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {string} params.provider - Provider name ('intervals', 'strava', 'fit')
 * @param {string} params.providerId - Provider's activity ID
 * @param {Object} params.providerActivity - Raw provider activity data
 * @param {string} params.incomingType - Type: 'intervals_native', 'intervals_shell', 'strava', 'fit'
 * @param {Object} params.options - Additional options
 * @returns {Object} Import result
 */
export async function importActivity({
  userId,
  provider,
  providerId,
  providerActivity,
  incomingType,
  options = {}
}) {
  console.log(`[ImportOrchestrator] Importing ${provider}:${providerId} (type: ${incomingType})`);
  
  // Step 1: Select or create canonical activity
  const selection = selectOrCreateCanonicalActivity({
    userId,
    provider,
    providerId,
    providerActivity,
    incomingType
  });
  
  console.log(`[ImportOrchestrator] Selection: ${selection.action} (reason: ${selection.reason})`);
  
  // Step 2: Handle based on selection action
  let activityId = selection.canonicalActivityId;
  let created = false;
  let upgraded = false;
  
  switch (selection.action) {
    case 'error':
      return {
        ok: false,
        error: selection.error,
        reason: selection.reason
      };
    
    case 'create_source_only':
      // Shell pending enrichment - create source only
      const sourceResult = upsertActivitySource(
        null, // No canonical yet
        userId,
        provider,
        providerId,
        providerActivity,
        {
          is_shell: true,
          shell_strava_id: options.shell_strava_id || null
        }
      );
      
      console.log(`[ImportOrchestrator] Created source-only (shell pending enrichment)`);
      
      return {
        ok: true,
        activityId: null,
        created: false,
        action: 'source_only',
        reason: selection.reason,
        shouldEnrich: selection.shouldEnrich
      };
    
    case 'create_canonical':
      // Create new canonical activity
      const createResult = createCanonicalActivity(userId, provider, providerActivity);
      
      if (!createResult.ok) {
        return {
          ok: false,
          error: createResult.error,
          message: createResult.message
        };
      }
      
      activityId = createResult.activityId;
      created = true;
      
      // Attach source
      upsertActivitySource(activityId, userId, provider, providerId, providerActivity);
      
      console.log(`[ImportOrchestrator] Created canonical: ${activityId}`);
      break;
    
    case 'upgrade_both':
      // Upgrade both physiology and metadata
      const physResult = updateActivityPhysiology(
        activityId,
        provider,
        extractPhysiologyFields(providerActivity)
      );
      
      const metaResult = updateActivityMetadata(
        activityId,
        provider,
        extractMetadataFields(providerActivity)
      );
      
      if (!physResult.ok || !metaResult.ok) {
        console.error(`[ImportOrchestrator] Upgrade failed: phys=${physResult.ok}, meta=${metaResult.ok}`);
      } else {
        upgraded = true;
        console.log(`[ImportOrchestrator] Upgraded both: ${activityId}`);
      }
      
      // Attach source
      upsertActivitySource(activityId, userId, provider, providerId, providerActivity);
      break;
    
    case 'upgrade_physiology':
      // Upgrade physiology only
      const physOnlyResult = updateActivityPhysiology(
        activityId,
        provider,
        extractPhysiologyFields(providerActivity)
      );
      
      if (!physOnlyResult.ok) {
        console.error(`[ImportOrchestrator] Physiology upgrade failed: ${physOnlyResult.error}`);
      } else {
        upgraded = true;
        console.log(`[ImportOrchestrator] Upgraded physiology: ${activityId}`);
      }
      
      // Attach source
      upsertActivitySource(activityId, userId, provider, providerId, providerActivity);
      break;
    
    case 'upgrade_metadata':
      // Upgrade metadata only
      const metaOnlyResult = updateActivityMetadata(
        activityId,
        provider,
        extractMetadataFields(providerActivity)
      );
      
      if (!metaOnlyResult.ok) {
        console.error(`[ImportOrchestrator] Metadata upgrade failed: ${metaOnlyResult.error}`);
      } else {
        upgraded = true;
        console.log(`[ImportOrchestrator] Upgraded metadata: ${activityId}`);
      }
      
      // Attach source
      upsertActivitySource(activityId, userId, provider, providerId, providerActivity);
      break;
    
    case 'attach_source_only':
      // Just attach source, no upgrades
      upsertActivitySource(activityId, userId, provider, providerId, providerActivity);
      
      console.log(`[ImportOrchestrator] Attached source only: ${activityId} (reason: ${selection.reason})`);
      break;
    
    default:
      console.error(`[ImportOrchestrator] Unknown action: ${selection.action}`);
      return {
        ok: false,
        error: 'UNKNOWN_ACTION',
        action: selection.action
      };
  }
  
  return {
    ok: true,
    activityId,
    created,
    upgraded,
    action: selection.action,
    reason: selection.reason,
    matchMethod: selection.matchMethod
  };
}

/**
 * Import batch of activities
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {string} params.provider - Provider name
 * @param {Array} params.activities - Array of provider activities
 * @param {Function} params.typeDetector - Function to detect incoming type
 * @returns {Object} Batch import result
 */
export async function importActivityBatch({
  userId,
  provider,
  activities,
  typeDetector
}) {
  console.log(`[ImportOrchestrator] Batch import: ${activities.length} activities from ${provider}`);
  
  const results = {
    total: activities.length,
    created: 0,
    upgraded: 0,
    attached: 0,
    shells: 0,
    errors: 0,
    details: []
  };
  
  for (const activity of activities) {
    try {
      const incomingType = typeDetector(activity);
      const providerId = activity.id || activity.activity_id || activity.provider_id;
      
      const result = await importActivity({
        userId,
        provider,
        providerId,
        providerActivity: activity,
        incomingType,
        options: {
          shell_strava_id: activity.strava_id || null
        }
      });
      
      if (result.ok) {
        if (result.created) results.created++;
        if (result.upgraded) results.upgraded++;
        if (result.action === 'attach_source_only') results.attached++;
        if (result.action === 'source_only') results.shells++;
      } else {
        results.errors++;
      }
      
      results.details.push(result);
    } catch (error) {
      console.error(`[ImportOrchestrator] Error importing activity:`, error);
      results.errors++;
      results.details.push({
        ok: false,
        error: 'IMPORT_EXCEPTION',
        message: error.message
      });
    }
  }
  
  console.log(`[ImportOrchestrator] Batch complete: ${results.created} created, ${results.upgraded} upgraded, ${results.attached} attached, ${results.shells} shells, ${results.errors} errors`);
  
  return results;
}

/**
 * Enrich shell from Strava
 * 
 * CRITICAL: Shell-to-Strava matching uses EXACT Strava ID only.
 * No fuzzy matching for shells.
 * 
 * @param {number} userId - User ID
 * @param {string} stravaId - Strava activity ID
 * @param {Object} stravaActivity - Full Strava activity data
 * @returns {Object} Enrichment result
 */
export async function enrichShellFromStrava(userId, stravaId, stravaActivity) {
  console.log(`[ImportOrchestrator] Enriching shell: ${stravaId}`);
  
  // Find shell by exact Strava ID
  const shell = findShellByStravaId(userId, stravaId);
  
  if (!shell) {
    console.log(`[ImportOrchestrator] No shell found for Strava ID: ${stravaId}`);
    
    // Import as new Strava activity
    return await importActivity({
      userId,
      provider: 'strava',
      providerId: stravaId,
      providerActivity: stravaActivity,
      incomingType: 'strava'
    });
  }
  
  // Shell found - create canonical from Strava
  const createResult = createCanonicalActivity(userId, 'strava', stravaActivity);
  
  if (!createResult.ok) {
    return {
      ok: false,
      error: createResult.error,
      message: createResult.message
    };
  }
  
  const activityId = createResult.activityId;
  
  // Link shell source to canonical
  upsertActivitySource(activityId, userId, 'intervals', shell.provider_id, {}, {
    is_shell: true,
    shell_strava_id: stravaId
  });
  
  // Attach Strava source
  upsertActivitySource(activityId, userId, 'strava', stravaId, stravaActivity);
  
  console.log(`[ImportOrchestrator] Enriched shell: ${stravaId} → ${activityId}`);
  
  return {
    ok: true,
    activityId,
    created: true,
    action: 'shell_enriched',
    reason: REASON_CODES.SHELL_ENRICH_FROM_STRAVA
  };
}

/**
 * Post-import integrity verification
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Verification options
 * @returns {Object} Verification result
 */
export async function verifyPostImport(userId, options = {}) {
  console.log(`[ImportOrchestrator] Running post-import verification for user ${userId}`);
  
  const integrity = verifyActivityIntegrity(userId);
  
  if (!integrity.ok) {
    console.error(`[ImportOrchestrator] Integrity violations found:`);
    integrity.issues.forEach(issue => {
      console.error(`  - [${issue.severity}] ${issue.type}: ${issue.message}`);
    });
    
    // Do NOT auto-fix unless explicitly requested
    if (options.autoFix) {
      console.log(`[ImportOrchestrator] Auto-fix requested but NOT IMPLEMENTED (safety)`);
    }
  } else {
    console.log(`[ImportOrchestrator] Integrity verification passed`);
  }
  
  return integrity;
}

/**
 * Extract physiology fields from provider activity
 */
function extractPhysiologyFields(activity) {
  return {
    duration_s: activity.duration_s || activity.moving_time || activity.elapsed_time,
    distance_m: activity.distance_m || activity.distance,
    elevation_m: activity.elevation_m || activity.total_elevation_gain,
    avg_power: activity.avg_power || activity.average_watts,
    max_power: activity.max_power || activity.max_watts,
    normalized_power: activity.normalized_power || activity.weighted_average_watts,
    tss: activity.tss || activity.suffer_score,
    avg_hr: activity.avg_hr || activity.average_heartrate,
    max_hr: activity.max_hr || activity.max_heartrate,
    avg_cadence: activity.avg_cadence || activity.average_cadence,
    avg_speed: activity.avg_speed || activity.average_speed,
    max_speed: activity.max_speed || activity.max_speed,
    calories: activity.calories || activity.kilojoules,
    has_power: !!(activity.avg_power || activity.average_watts || activity.device_watts)
  };
}

/**
 * Extract metadata fields from provider activity
 */
function extractMetadataFields(activity) {
  return {
    name: activity.name,
    description: activity.description,
    sport: activity.sport || activity.sport_type || 'cycling',
    type: activity.type || activity.activity_type || 'Ride',
    start_time: activity.start_time || activity.start_date || activity.start_date_local,
    timezone_offset_min: activity.timezone_offset_min || activity.utc_offset || 0
  };
}

export default {
  importActivity,
  importActivityBatch,
  enrichShellFromStrava,
  verifyPostImport
};
