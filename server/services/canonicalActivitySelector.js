/**
 * Canonical Activity Selector
 * 
 * CRITICAL: This is the single authoritative function for canonical activity selection.
 * All activity imports MUST use this function to ensure deterministic behavior.
 * 
 * Source-of-Truth Rules:
 * - Physiology: FIT > Intervals-native > Strava > Shell
 * - Metadata: Strava > Intervals > FIT
 * - Intervals-native physiology is PROTECTED from Strava overwrites
 * - Shells never become canonical without enrichment
 */

import db from '../db.js';
import { isValidActivity, isShellActivity, validateForCanonical } from './activityValidation.js';

// Source priority for physiology (higher = better)
const PHYSIOLOGY_PRIORITY = {
  fit: 4,
  intervals: 3,
  strava: 2,
  shell: 1
};

// Source priority for metadata (higher = better)
const METADATA_PRIORITY = {
  strava: 3,
  intervals: 2,
  fit: 1
};

// Reason codes for logging
export const REASON_CODES = {
  // Selection reasons
  EXACT_ID_MATCH: 'EXACT_ID_MATCH',
  FUZZY_TIME_MATCH: 'FUZZY_TIME_MATCH',
  NO_MATCH_CREATE_NEW: 'NO_MATCH_CREATE_NEW',
  
  // Action reasons
  ATTACH_SOURCE_ONLY: 'ATTACH_SOURCE_ONLY',
  UPGRADE_PHYSIOLOGY: 'UPGRADE_PHYSIOLOGY',
  UPGRADE_METADATA: 'UPGRADE_METADATA',
  UPGRADE_BOTH: 'UPGRADE_BOTH',
  SKIP_DUPLICATE: 'SKIP_DUPLICATE',
  CREATE_CANONICAL: 'CREATE_CANONICAL',
  
  // Protection reasons
  INTERVALS_NATIVE_PROTECTED: 'INTERVALS_NATIVE_PROTECTED',
  SHELL_NO_PHYSIOLOGY: 'SHELL_NO_PHYSIOLOGY',
  FIT_UPGRADES_ALL: 'FIT_UPGRADES_ALL',
  
  // Enrichment reasons
  SHELL_ENRICH_FROM_STRAVA: 'SHELL_ENRICH_FROM_STRAVA',
  SHELL_PENDING_ENRICHMENT: 'SHELL_PENDING_ENRICHMENT'
};

/**
 * Normalize provider name to standard format
 */
function normalizeProvider(provider) {
  if (!provider) return null;
  
  const normalized = provider.toLowerCase().trim();
  
  if (normalized === 'fit_upload' || normalized === 'fit') return 'fit';
  if (normalized === 'intervals') return 'intervals';
  if (normalized === 'strava') return 'strava';
  
  return null;
}

/**
 * Find existing canonical activity by exact external ID
 */
function findByExactId(userId, provider, providerId) {
  // Check activity_sources for exact provider ID match
  const source = db.prepare(`
    SELECT activity_id, provider, provider_id
    FROM activity_sources
    WHERE user_id = ? AND provider = ? AND provider_id = ?
    LIMIT 1
  `).get(userId, provider, providerId);
  
  if (!source || !source.activity_id) return null;
  
  // Get the canonical activity
  const activity = db.prepare(`
    SELECT * FROM activities WHERE id = ? AND user_id = ?
  `).get(source.activity_id, userId);
  
  return activity;
}

/**
 * Find shell activity by exact Strava ID
 * 
 * CRITICAL: Shell-to-Strava matching MUST use exact Strava ID only.
 * No fuzzy matching for shells.
 * 
 * @param {number} userId - User ID
 * @param {string} stravaId - Strava activity ID
 * @returns {Object|null} Shell source record
 */
function findShellByStravaId(userId, stravaId) {
  const source = db.prepare(`
    SELECT s.*, a.id as canonical_id
    FROM activity_sources s
    LEFT JOIN activities a ON a.id = s.activity_id
    WHERE s.user_id = ?
      AND s.shell_strava_id = ?
      AND s.is_shell = 1
    LIMIT 1
  `).get(userId, stravaId);
  
  return source;
}

/**
 * Find existing canonical activity by fuzzy time + duration match
 * 
 * TIGHTENED RULES:
 * - FIT: ±3 min time, ±15% duration, ±15% distance (if present)
 * - Others: ±5 min time, ±20% duration
 * - Requires at least 2 matching criteria (time + duration, or time + distance)
 */
function findByFuzzyMatch(userId, startTime, durationS, distanceM = null, provider = null) {
  if (!startTime || !durationS || durationS === 0) return null;
  
  const startDate = new Date(startTime);
  if (isNaN(startDate.getTime())) return null;
  
  // Tighter tolerances for FIT uploads
  const isFit = provider === 'fit';
  const timeWindowMin = isFit ? 3 : 5;
  const durationTolerance = isFit ? 0.15 : 0.20;
  const distanceTolerance = 0.15;
  
  // Time window
  const beforeTime = new Date(startDate.getTime() - timeWindowMin * 60 * 1000).toISOString();
  const afterTime = new Date(startDate.getTime() + timeWindowMin * 60 * 1000).toISOString();
  
  // Duration tolerance
  const minDuration = durationS * (1 - durationTolerance);
  const maxDuration = durationS * (1 + durationTolerance);
  
  // Build query with distance check if available
  let query = `
    SELECT * FROM activities
    WHERE user_id = ?
      AND start_time >= ?
      AND start_time <= ?
      AND duration_s >= ?
      AND duration_s <= ?
      AND is_shell = 0
  `;
  
  const params = [userId, beforeTime, afterTime, minDuration, maxDuration];
  
  // Add distance check if available (for higher confidence)
  if (distanceM && distanceM > 0) {
    const minDistance = distanceM * (1 - distanceTolerance);
    const maxDistance = distanceM * (1 + distanceTolerance);
    query += ` AND (distance_m IS NULL OR (distance_m >= ? AND distance_m <= ?))`;
    params.push(minDistance, maxDistance);
  }
  
  query += ` ORDER BY ABS(duration_s - ?) ASC LIMIT 1`;
  params.push(durationS);
  
  const activity = db.prepare(query).get(...params);
  
  // Verify match confidence (require at least 2 matching criteria)
  if (activity) {
    let matchCount = 0;
    
    // Time match (already filtered)
    matchCount++;
    
    // Duration match (already filtered)
    matchCount++;
    
    // Distance match (if both have distance)
    if (distanceM && distanceM > 0 && activity.distance_m && activity.distance_m > 0) {
      const distanceDiff = Math.abs(activity.distance_m - distanceM) / distanceM;
      if (distanceDiff <= distanceTolerance) {
        matchCount++;
      }
    }
    
    // Require at least 2 matches for confidence
    if (matchCount >= 2) {
      return activity;
    }
    
    // Low confidence - log and skip
    console.log(`[Selector] Low confidence match (${matchCount} criteria), skipping merge`);
    return null;
  }
  
  return null;
}

/**
 * Determine if incoming provider can upgrade physiology
 */
function canUpgradePhysiology(existingSource, incomingSource, incomingType) {
  // Shells never provide physiology
  if (incomingType === 'intervals_shell') {
    return false;
  }
  
  // No existing physiology = can set
  if (!existingSource) {
    return true;
  }
  
  // FIT always upgrades
  if (incomingSource === 'fit') {
    return true;
  }
  
  // CRITICAL: Intervals-native is PROTECTED from Strava
  if (existingSource === 'intervals' && incomingSource === 'strava') {
    return false;
  }
  
  // Check priority
  const existingPriority = PHYSIOLOGY_PRIORITY[existingSource] || 0;
  const incomingPriority = PHYSIOLOGY_PRIORITY[incomingSource] || 0;
  
  return incomingPriority > existingPriority;
}

/**
 * Determine if incoming provider can upgrade metadata
 */
function canUpgradeMetadata(existingSource, incomingSource) {
  // No existing metadata = can set
  if (!existingSource) {
    return true;
  }
  
  // Check priority
  const existingPriority = METADATA_PRIORITY[existingSource] || 0;
  const incomingPriority = METADATA_PRIORITY[incomingSource] || 0;
  
  return incomingPriority > existingPriority;
}

/**
 * Select or create canonical activity
 * 
 * This is the SINGLE authoritative function for canonical selection.
 * 
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {string} params.provider - Provider name ('intervals', 'strava', 'fit')
 * @param {string} params.providerId - Provider's activity ID
 * @param {Object} params.providerActivity - Raw provider activity data
 * @param {string} params.incomingType - Type: 'intervals_native', 'intervals_shell', 'strava', 'fit'
 * @returns {Object} Selection result
 */
export function selectOrCreateCanonicalActivity({
  userId,
  provider,
  providerId,
  providerActivity,
  incomingType
}) {
  // Normalize provider
  const normalizedProvider = normalizeProvider(provider);
  
  if (!normalizedProvider) {
    return {
      action: 'error',
      reason: 'INVALID_PROVIDER',
      error: `Invalid provider: ${provider}`
    };
  }
  
  // Extract key fields from provider activity
  const startTime = providerActivity.start_time || providerActivity.start_date;
  const durationS = providerActivity.duration_s || providerActivity.moving_time || providerActivity.elapsed_time || 0;
  const distanceM = providerActivity.distance_m || providerActivity.distance || 0;
  
  // DEFENCE-IN-DEPTH: Intervals Strava shells are NEVER canonical.
  // This is the last line of defence — the import service should have already
  // classified these as source-only, but if anything leaks through, block it here.
  if (incomingType === 'intervals_strava_shell') {
    console.log(`[Selector] BLOCKED intervals_strava_shell: ${providerId} — cannot become canonical`);
    return {
      action: 'create_source_only',
      reason: 'INTERVALS_STRAVA_SHELL_BLOCKED',
      canonicalActivityId: null,
      shouldEnrich: false,
      matchMethod: null,
      shellCheck: { isShell: true, reason: 'intervals_strava_shell', confidence: 1.0 }
    };
  }
  
  // CRITICAL: Validate activity before proceeding
  // Shells and invalid activities cannot become canonical
  const validation = validateForCanonical(providerActivity, {
    provider: normalizedProvider,
    providerId,
    incomingType
  });
  
  // If shell detected with high confidence, force source-only creation
  const isDefiniteShell = validation.shellCheck?.isShell && validation.shellCheck?.confidence >= 0.9;
  
  if (isDefiniteShell || incomingType === 'intervals_shell') {
    console.log(`[Selector] Shell detected: ${validation.shellCheck?.reason} (confidence: ${validation.shellCheck?.confidence})`);
  }
  
  // If invalid activity, reject it
  if (!validation.valid && !isDefiniteShell) {
    return {
      action: 'error',
      reason: 'INVALID_ACTIVITY',
      error: `Activity validation failed: ${validation.reasons.join(', ')}`,
      validation
    };
  }
  
  // Step 1: Try exact ID match
  let existingActivity = findByExactId(userId, normalizedProvider, providerId);
  let matchMethod = null;
  
  if (existingActivity) {
    matchMethod = REASON_CODES.EXACT_ID_MATCH;
  } else {
    // Step 2: Try fuzzy match (only for non-shells with valid data)
    // CRITICAL: Shells MUST NOT use fuzzy matching - only exact Strava ID
    if (incomingType !== 'intervals_shell' && startTime && durationS > 0) {
      existingActivity = findByFuzzyMatch(userId, startTime, durationS, distanceM, normalizedProvider);
      if (existingActivity) {
        matchMethod = REASON_CODES.FUZZY_TIME_MATCH;
      }
    }
  }
  
  // Step 3: Determine action
  if (!existingActivity) {
    // No match found
    
    // CRITICAL: Shells MUST create source only (never canonical)
    if (isDefiniteShell || incomingType === 'intervals_shell') {
      return {
        action: 'create_source_only',
        reason: REASON_CODES.SHELL_PENDING_ENRICHMENT,
        canonicalActivityId: null,
        shouldEnrich: true,
        matchMethod: REASON_CODES.NO_MATCH_CREATE_NEW,
        shellCheck: validation.shellCheck
      };
    }
    
    // Invalid activities cannot become canonical
    if (!validation.valid) {
      return {
        action: 'error',
        reason: 'INVALID_FOR_CANONICAL',
        error: `Cannot create canonical: ${validation.reasons.join(', ')}`,
        validation
      };
    }
    
    // Create new canonical (only if valid and not shell)
    return {
      action: 'create_canonical',
      reason: REASON_CODES.CREATE_CANONICAL,
      canonicalActivityId: null,
      physiologySource: normalizedProvider,
      metadataSource: normalizedProvider,
      matchMethod: REASON_CODES.NO_MATCH_CREATE_NEW,
      validation
    };
  }
  
  // Step 4: Existing activity found - determine upgrade actions
  const existingPhysiologySource = existingActivity.physiology_source;
  const existingMetadataSource = existingActivity.metadata_source;
  
  const canUpgradePhys = canUpgradePhysiology(
    existingPhysiologySource,
    normalizedProvider,
    incomingType
  );
  
  const canUpgradeMeta = canUpgradeMetadata(
    existingMetadataSource,
    normalizedProvider
  );
  
  // CRITICAL: Intervals-native protection
  if (existingPhysiologySource === 'intervals' && normalizedProvider === 'strava') {
    return {
      action: 'attach_source_only',
      reason: REASON_CODES.INTERVALS_NATIVE_PROTECTED,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: false,
      upgradeMetadata: canUpgradeMeta,
      matchMethod
    };
  }
  
  // Shell enrichment from Strava
  if (incomingType === 'intervals_shell' && normalizedProvider === 'strava') {
    // This shouldn't happen (shells are intervals, not strava)
    // But handle gracefully
    return {
      action: 'attach_source_only',
      reason: REASON_CODES.SHELL_NO_PHYSIOLOGY,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: false,
      upgradeMetadata: false,
      matchMethod
    };
  }
  
  // Determine upgrade action
  if (canUpgradePhys && canUpgradeMeta) {
    return {
      action: 'upgrade_both',
      reason: REASON_CODES.UPGRADE_BOTH,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: true,
      upgradeMetadata: true,
      physiologySource: normalizedProvider,
      metadataSource: normalizedProvider,
      matchMethod
    };
  } else if (canUpgradePhys) {
    return {
      action: 'upgrade_physiology',
      reason: REASON_CODES.UPGRADE_PHYSIOLOGY,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: true,
      upgradeMetadata: false,
      physiologySource: normalizedProvider,
      matchMethod
    };
  } else if (canUpgradeMeta) {
    return {
      action: 'upgrade_metadata',
      reason: REASON_CODES.UPGRADE_METADATA,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: false,
      upgradeMetadata: true,
      metadataSource: normalizedProvider,
      matchMethod
    };
  } else {
    // No upgrade needed, just attach source
    return {
      action: 'attach_source_only',
      reason: REASON_CODES.ATTACH_SOURCE_ONLY,
      canonicalActivityId: existingActivity.id,
      upgradePhysiology: false,
      upgradeMetadata: false,
      matchMethod
    };
  }
}

/**
 * Check if source already exists for this activity
 */
export function sourceExists(userId, provider, providerId) {
  const source = db.prepare(`
    SELECT id FROM activity_sources
    WHERE user_id = ? AND provider = ? AND provider_id = ?
  `).get(userId, provider, providerId);
  
  return !!source;
}

/**
 * Get physiology priority for a provider
 */
export function getPhysiologyPriority(provider) {
  const normalized = normalizeProvider(provider);
  return PHYSIOLOGY_PRIORITY[normalized] || 0;
}

/**
 * Get metadata priority for a provider
 */
export function getMetadataPriority(provider) {
  const normalized = normalizeProvider(provider);
  return METADATA_PRIORITY[normalized] || 0;
}

export {
  findShellByStravaId
};

export default {
  selectOrCreateCanonicalActivity,
  sourceExists,
  getPhysiologyPriority,
  getMetadataPriority,
  findShellByStravaId,
  REASON_CODES
};
