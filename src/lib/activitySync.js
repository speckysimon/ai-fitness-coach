/**
 * Activity Sync Utilities
 * 
 * Handles syncing activities from providers to the unified database.
 * After fetching from Strava/Intervals, POST to /api/activities/import
 */

/**
 * Get session token from localStorage
 * @returns {string|null}
 */
function getSessionToken() {
  return localStorage.getItem('session_token');
}

// ── Incremental Sync Helpers ──────────────────────────────────────────

const SYNC_TS_PREFIX = 'last_sync_';
const INCREMENTAL_OVERLAP_DAYS = 7; // re-fetch this many days of overlap for safety

/**
 * Get the last successful sync timestamp for a provider
 * @param {string} provider - 'intervals' | 'strava'
 * @returns {string|null} ISO date string (YYYY-MM-DD) or null if never synced
 */
export function getLastSyncTime(provider) {
  return localStorage.getItem(`${SYNC_TS_PREFIX}${provider}`);
}

/**
 * Save the last successful sync timestamp for a provider
 * @param {string} provider - 'intervals' | 'strava'
 * @param {string} [isoDate] - ISO date string, defaults to today
 */
export function setLastSyncTime(provider, isoDate) {
  const date = isoDate || new Date().toISOString().split('T')[0];
  localStorage.setItem(`${SYNC_TS_PREFIX}${provider}`, date);
  console.log(`[Sync] 📌 Saved last sync time for ${provider}: ${date}`);
}

/**
 * Calculate the date range for an incremental sync.
 * If we have a previous sync timestamp, fetch from (lastSync - overlapDays) to today.
 * Otherwise fall back to a full window.
 *
 * @param {string} provider - 'intervals' | 'strava'
 * @param {number} fullWindowDays - Full window in days (e.g. 365 for AllActivities, 90 for Dashboard)
 * @returns {{ oldest: string, newest: string, isIncremental: boolean }}
 */
export function getIncrementalDateRange(provider, fullWindowDays = 365) {
  const newest = new Date().toISOString().split('T')[0];
  const lastSync = getLastSyncTime(provider);

  if (lastSync) {
    // Incremental: go back overlapDays from last sync for safety
    const from = new Date(lastSync);
    from.setDate(from.getDate() - INCREMENTAL_OVERLAP_DAYS);
    const oldest = from.toISOString().split('T')[0];
    console.log(`[Sync] ⚡ Incremental ${provider}: ${oldest} → ${newest} (last sync: ${lastSync})`);
    return { oldest, newest, isIncremental: true };
  }

  // First sync: full window
  const from = new Date();
  from.setDate(from.getDate() - fullWindowDays);
  const oldest = from.toISOString().split('T')[0];
  console.log(`[Sync] 📦 Full ${provider}: ${oldest} → ${newest} (first sync)`);
  return { oldest, newest, isIncremental: false };
}

/**
 * Get the 'after' epoch timestamp for Strava incremental fetch.
 * Returns epoch seconds for (lastSync - overlapDays), or null for full fetch.
 * @returns {number|null}
 */
export function getStravaAfterTimestamp() {
  const lastSync = getLastSyncTime('strava');
  if (!lastSync) return null;
  const from = new Date(lastSync);
  from.setDate(from.getDate() - INCREMENTAL_OVERLAP_DAYS);
  return Math.floor(from.getTime() / 1000);
}

/**
 * Import activities to the unified database
 * 
 * @param {Object[]} activities - Array of provider activities
 * @param {string} provider - 'strava' | 'intervals' | 'manual'
 * @returns {Promise<{ok: boolean, data?: Object, error?: Object}>}
 */
export async function importActivities(activities, provider) {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    console.error('[ActivitySync] No session token');
    return {
      ok: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Login required'
      }
    };
  }
  
  if (!activities || activities.length === 0) {
    console.log(`[ActivitySync] No ${provider} activities to import`);
    return {
      ok: true,
      data: { imported: 0, created: 0, updated: 0, errors: [] }
    };
  }
  
  try {
    console.log(`[ActivitySync] Importing ${activities.length} ${provider} activities`);
    
    const response = await fetch('/api/activities/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({
        activities,
        provider
      })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`[ActivitySync] Import failed:`, result);
      return result;
    }
    
    console.log(`[ActivitySync] Import complete:`, result.data);
    return result;
  } catch (error) {
    console.error(`[ActivitySync] Import error:`, error);
    return {
      ok: false,
      error: {
        code: 'IMPORT_FAILED',
        message: error.message
      }
    };
  }
}

/**
 * Fetch activities from the unified database
 * 
 * @param {Object} options - Query options
 * @param {number} options.windowDays - Days to look back (default: 90)
 * @param {string} options.sources - Comma-separated providers (default: all)
 * @returns {Promise<{ok: boolean, data?: Object[], meta?: Object, error?: Object}>}
 */
export async function fetchUnifiedActivities(options = {}) {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    console.error('[ActivitySync] No session token');
    return {
      ok: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Login required'
      }
    };
  }
  
  const { windowDays = 90, sources } = options;
  
  try {
    const params = new URLSearchParams();
    params.set('window', windowDays.toString());
    if (sources) {
      params.set('sources', sources);
    }
    
    const response = await fetch(`/api/activities?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error(`[ActivitySync] Fetch failed:`, result);
      return result;
    }
    
    console.log(`[ActivitySync] Fetched ${result.data?.length || 0} activities from DB`);
    return result;
  } catch (error) {
    console.error(`[ActivitySync] Fetch error:`, error);
    return {
      ok: false,
      error: {
        code: 'FETCH_FAILED',
        message: error.message
      }
    };
  }
}

/**
 * Sync activities from a provider and import to database
 * This is the main entry point for syncing
 * 
 * @param {string} provider - 'strava' | 'intervals'
 * @param {Object[]} providerActivities - Activities fetched from provider
 * @returns {Promise<{ok: boolean, data?: Object, error?: Object}>}
 */
export async function syncProviderActivities(provider, providerActivities) {
  if (!providerActivities || providerActivities.length === 0) {
    return {
      ok: true,
      data: { imported: 0, created: 0, updated: 0, errors: [], skipped: true }
    };
  }
  
  return importActivities(providerActivities, provider);
}

/**
 * Get activity stats from the database
 * @returns {Promise<{ok: boolean, data?: Object, error?: Object}>}
 */
export async function getActivityStats() {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Login required' }
    };
  }
  
  try {
    const response = await fetch('/api/activities/stats', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });
    
    return await response.json();
  } catch (error) {
    return {
      ok: false,
      error: { code: 'STATS_FAILED', message: error.message }
    };
  }
}

/**
 * Enrich lite Intervals.icu activities with full details
 * Calls /api/intervals/enrich to fetch full activity data from /activity/{id}
 * 
 * @param {string[]} activityIds - Array of Intervals.icu activity IDs to enrich
 * @param {number} limit - Max activities to enrich per request (default 50)
 * @returns {Promise<{ok: boolean, data?: Object, error?: Object}>}
 */
export async function enrichIntervalsActivities(activityIds, limit = 50) {
  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    return {
      ok: false,
      error: { code: 'UNAUTHENTICATED', message: 'Login required' }
    };
  }
  
  if (!activityIds || activityIds.length === 0) {
    console.log('[ActivitySync] No activities to enrich');
    return {
      ok: true,
      data: { enriched: [], failed: [], stats: { requested: 0, enriched: 0, failed: 0, remaining: 0 } }
    };
  }
  
  console.log(`[ActivitySync] 🔄 Enriching ${activityIds.length} lite Intervals activities (limit: ${limit})...`);
  
  try {
    const response = await fetch('/api/intervals/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ activityIds, limit })
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[ActivitySync] Enrichment failed:', result);
      return { ok: false, error: result };
    }
    
    console.log(`[ActivitySync] ✅ Enrichment complete:`, result.stats);
    
    // Server now imports enriched activities directly (preserves _raw for zones/intervals)
    // No client-side re-import needed
    if (result.imported?.length > 0) {
      console.log(`[ActivitySync] 💾 Server imported ${result.imported.length} enriched activities`);
    }
    
    return { ok: true, data: result };
  } catch (error) {
    console.error('[ActivitySync] Enrichment error:', error);
    return {
      ok: false,
      error: { code: 'ENRICH_FAILED', message: error.message }
    };
  }
}

/**
 * Full sync with enrichment for Intervals.icu
 * Stage A: Import lite list immediately
 * Stage B: Enrich activities missing core metrics
 * 
 * @param {Object[]} activities - Activities from /api/intervals/activities
 * @param {Object} options - Options
 * @param {number} options.enrichLimit - Max activities to enrich (default 50)
 * @param {boolean} options.skipEnrichment - Skip enrichment stage (default false)
 * @returns {Promise<{ok: boolean, data?: Object, error?: Object}>}
 */
export async function syncIntervalsWithEnrichment(activities, options = {}) {
  const { enrichLimit = 50, skipEnrichment = false } = options;
  
  // Stage A: Import lite list immediately
  console.log(`[ActivitySync] 📥 Stage A: Importing ${activities.length} Intervals activities...`);
  const importResult = await importActivities(activities, 'intervals');
  
  if (!importResult.ok) {
    return importResult;
  }
  
  const result = {
    stageA: importResult.data,
    stageB: null
  };
  
  // Stage B: Enrich lite activities (if any and not skipped)
  const needsEnrichment = importResult.data?.needsEnrichment || [];
  
  if (skipEnrichment || needsEnrichment.length === 0) {
    if (needsEnrichment.length > 0) {
      console.log(`[ActivitySync] ⏭️ Skipping enrichment for ${needsEnrichment.length} lite activities`);
    }
    return { ok: true, data: result };
  }
  
  console.log(`[ActivitySync] 🔄 Stage B: Enriching ${needsEnrichment.length} lite activities (limit: ${enrichLimit})...`);
  const enrichResult = await enrichIntervalsActivities(needsEnrichment, enrichLimit);
  
  result.stageB = enrichResult.ok ? enrichResult.data : { error: enrichResult.error };
  
  return { ok: true, data: result };
}

export default {
  importActivities,
  fetchUnifiedActivities,
  syncProviderActivities,
  getActivityStats,
  enrichIntervalsActivities,
  syncIntervalsWithEnrichment,
  getLastSyncTime,
  setLastSyncTime,
  getIncrementalDateRange,
  getStravaAfterTimestamp
};
