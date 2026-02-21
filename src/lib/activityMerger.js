/**
 * Activity Merger Utility
 * Merges activities from multiple sources (Strava, Intervals.icu, Manual)
 * with intelligent deduplication
 */

/**
 * Generate a unique sync run ID for logging correlation
 * @returns {string} Sync run ID (e.g., "sync_abc123")
 */
export function generateSyncRunId() {
  return `sync_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
}

/**
 * Structured result type for provider fetches
 * @typedef {Object} ProviderResult
 * @property {boolean} ok - Whether the fetch succeeded
 * @property {Array} [data] - Activities if successful
 * @property {Object} [error] - Error details if failed
 * @property {string} [error.code] - Error code (e.g., 'TOKEN_EXPIRED', 'NETWORK_ERROR')
 * @property {string} [error.message] - Human-readable error message
 * @property {string} provider - Provider name
 */

/**
 * Fetch activities from Strava with structured result
 * @param {Object} options - Fetch options
 * @param {Object} options.tokens - Strava tokens { access_token, refresh_token, expires_at }
 * @param {Function} options.refreshTokenFn - Function to refresh expired token
 * @param {number} options.perPage - Number of activities to fetch (default: 200)
 * @param {number} options.after - Unix timestamp to fetch activities after
 * @param {string} options.syncRunId - Optional sync run ID for logging
 * @returns {Promise<ProviderResult>} Structured result
 */
export async function fetchStravaActivities({ tokens, refreshTokenFn, perPage = 200, after, syncRunId } = {}) {
  const logPrefix = syncRunId ? `[${syncRunId}] ` : '';
  
  if (!tokens?.access_token) {
    console.warn(`${logPrefix}⚠️ [Strava] No access token`);
    return {
      ok: false,
      error: { code: 'NO_TOKEN', message: 'No Strava access token available' },
      provider: 'strava'
    };
  }

  try {
    let tokensToUse = tokens;
    
    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (tokensToUse.expires_at && tokensToUse.expires_at < now) {
      console.log(`${logPrefix}🔄 [Strava] Token expired, refreshing...`);
      
      if (!refreshTokenFn) {
        return {
          ok: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Strava token expired and no refresh function provided' },
          provider: 'strava'
        };
      }
      
      try {
        tokensToUse = await refreshTokenFn();
      } catch (refreshError) {
        if (refreshError.message === 'REAUTH_REQUIRED') {
          return {
            ok: false,
            error: { code: 'REAUTH_REQUIRED', message: 'Strava session expired - please log out and log in again' },
            provider: 'strava'
          };
        }
        return {
          ok: false,
          error: { code: 'REFRESH_FAILED', message: `Token refresh failed: ${refreshError.message}` },
          provider: 'strava'
        };
      }
    }

    // Build URL
    const params = new URLSearchParams();
    params.append('access_token', tokensToUse.access_token);
    params.append('per_page', perPage.toString());
    if (after) params.append('after', after.toString());
    
    // Add user_id for logging on server
    const currentUser = localStorage.getItem('current_user');
    const userId = currentUser ? JSON.parse(currentUser).email : 'anonymous';
    params.append('user_id', userId);

    const url = `/api/strava/activities?${params.toString()}`;
    console.log(`${logPrefix}📥 [Strava] Fetching activities (per_page=${perPage})`);

    const response = await fetch(url);

    // Handle auth errors with retry
    if (response.status === 401 || response.status === 403) {
      console.log(`${logPrefix}🔄 [Strava] Got ${response.status}, attempting token refresh...`);
      
      if (!refreshTokenFn) {
        return {
          ok: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Strava token expired' },
          provider: 'strava'
        };
      }
      
      try {
        tokensToUse = await refreshTokenFn();
        
        // Retry with new token
        const retryParams = new URLSearchParams();
        retryParams.append('access_token', tokensToUse.access_token);
        retryParams.append('per_page', perPage.toString());
        if (after) retryParams.append('after', after.toString());
        retryParams.append('user_id', userId);
        
        const retryResponse = await fetch(`/api/strava/activities?${retryParams.toString()}`);
        
        if (!retryResponse.ok) {
          return {
            ok: false,
            error: { code: 'FETCH_FAILED', message: `Retry failed: ${retryResponse.statusText}` },
            provider: 'strava'
          };
        }
        
        const activities = await retryResponse.json();
        console.log(`${logPrefix}✅ [Strava] Fetched ${activities.length} activities (after retry)`);
        
        return {
          ok: true,
          data: activities,
          provider: 'strava',
          tokensRefreshed: true,
          newTokens: tokensToUse
        };
      } catch (refreshError) {
        return {
          ok: false,
          error: { code: 'REAUTH_REQUIRED', message: 'Please log out and log in again' },
          provider: 'strava'
        };
      }
    }

    if (!response.ok) {
      console.error(`${logPrefix}❌ [Strava] Fetch failed:`, response.status, response.statusText);
      return {
        ok: false,
        error: { code: 'FETCH_FAILED', message: `Failed to fetch: ${response.statusText}` },
        provider: 'strava'
      };
    }

    const activities = await response.json();
    
    // Check for error in response body
    if (activities.error) {
      console.error(`${logPrefix}❌ [Strava] API error:`, activities.error);
      return {
        ok: false,
        error: { code: 'API_ERROR', message: activities.error },
        provider: 'strava'
      };
    }
    
    console.log(`${logPrefix}✅ [Strava] Fetched ${activities.length} activities`);
    
    return {
      ok: true,
      data: activities,
      provider: 'strava'
    };
  } catch (error) {
    console.error(`${logPrefix}❌ [Strava] Error:`, error.message);
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', message: error.message },
      provider: 'strava'
    };
  }
}

/**
 * Merge activities from multiple sources with deduplication
 * @param {Array} stravaActivities - Activities from Strava
 * @param {Array} intervalsActivities - Activities from Intervals.icu
 * @param {Array} manualActivities - Manually entered activities
 * @returns {Array} Merged and deduplicated activities
 */
export function mergeMultiSourceActivities(stravaActivities = [], intervalsActivities = [], manualActivities = []) {
  console.log('🔀 [Activity Merger] Starting merge:', {
    strava: stravaActivities.length,
    intervals: intervalsActivities.length,
    manual: manualActivities.length
  });

  // Tag each activity with its source
  const taggedStrava = stravaActivities.map(a => ({ ...a, source: 'strava', source_id: a.id?.toString() }));
  const taggedIntervals = intervalsActivities.map(a => ({ 
    ...a, 
    source: a.source || 'intervals',
    source_id: a.source_id || a.id?.toString()
  }));
  const taggedManual = manualActivities.map(a => ({ ...a, source: 'manual', source_id: a.id?.toString() }));

  // Combine all activities
  let allActivities = [...taggedStrava, ...taggedIntervals, ...taggedManual];

  // Filter out invalid activities (0 duration or 0 distance)
  const beforeFilter = allActivities.length;
  allActivities = allActivities.filter(activity => {
    const duration = activity.duration || activity.moving_time || activity.elapsed_time || 0;
    const distance = activity.distance || 0;
    
    // Remove activities with both 0 duration AND 0 distance
    if (duration === 0 && distance === 0) {
      console.log('🗑️ [Activity Merger] Filtering out invalid activity:', {
        source: activity.source,
        name: activity.name,
        date: activity.date || activity.start_date_local,
        duration,
        distance
      });
      return false;
    }
    
    return true;
  });

  const filteredCount = beforeFilter - allActivities.length;

  // Deduplicate
  const deduplicated = deduplicateActivities(allActivities);

  console.log('✅ [Activity Merger] Merge complete:', {
    total: beforeFilter,
    filtered: filteredCount,
    afterDedup: deduplicated.length,
    removed: beforeFilter - deduplicated.length
  });

  return deduplicated;
}

/**
 * Deduplicate activities based on date, duration, and distance
 * Priority: Intervals.icu > Strava > Manual
 * (Intervals.icu preferred due to richer training data: zones, intervals, advanced metrics)
 * @param {Array} activities - All activities with source tags
 * @returns {Array} Deduplicated activities
 */
function deduplicateActivities(activities) {
  const uniqueActivities = [];
  const seen = new Set();

  // Sort by source priority (Intervals.icu first for richer data, then Strava, then Manual)
  const sourcePriority = { intervals: 1, strava: 2, manual: 3 };
  const sorted = activities.sort((a, b) => {
    const priorityDiff = sourcePriority[a.source] - sourcePriority[b.source];
    if (priorityDiff !== 0) return priorityDiff;
    // Within same source, sort by date (newest first)
    return new Date(b.date || b.start_date_local || b.start_date) - 
           new Date(a.date || a.start_date_local || a.start_date);
  });

  for (const activity of sorted) {
    const key = getActivityKey(activity);
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueActivities.push(activity);
    } else {
      console.log('🔄 [Dedup] Skipping duplicate:', {
        source: activity.source,
        name: activity.name,
        date: activity.date || activity.start_date_local
      });
    }
  }

  return uniqueActivities;
}

/**
 * Generate a unique key for an activity based on date, duration, and distance
 * Activities are considered duplicates if they match within tolerances
 * @param {Object} activity - Activity object
 * @returns {string} Unique key
 */
function getActivityKey(activity) {
  // Get date (normalize to date only, ignore time)
  const dateStr = activity.date || activity.start_date_local || activity.start_date || '';
  const date = new Date(dateStr);
  const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

  // Get duration (in seconds)
  const duration = activity.duration || activity.moving_time || activity.elapsed_time || 0;
  
  // Get distance (in meters)
  const distance = activity.distance || 0;

  // Round duration to nearest 30 seconds and distance to nearest 100m
  // This allows for small variations in recording
  const durationKey = Math.round(duration / 30) * 30;
  const distanceKey = Math.round(distance / 100) * 100;

  return `${dateKey}_${durationKey}_${distanceKey}`;
}

/**
 * Check if Intervals.icu is connected
 * @returns {Promise<boolean>}
 */
export async function checkIntervalsConnection() {
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) return false;

    const response = await fetch('/api/intervals/status', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });

    if (!response.ok) return false;

    const data = await response.json();
    return data.connected === true;
  } catch (error) {
    console.error('Error checking Intervals connection:', error);
    return false;
  }
}

/**
 * Fetch activities from Intervals.icu
 * Returns structured result: { ok: true, data: [...] } or { ok: false, error: {...} }
 * @param {Object} options - Fetch options
 * @param {string} options.oldest - Oldest date (YYYY-MM-DD)
 * @param {string} options.newest - Newest date (YYYY-MM-DD)
 * @param {string} options.syncRunId - Optional sync run ID for logging
 * @returns {Promise<ProviderResult>} Structured result
 */
export async function fetchIntervalsActivities({ oldest, newest, syncRunId } = {}) {
  const logPrefix = syncRunId ? `[${syncRunId}] ` : '';
  
  try {
    const sessionToken = localStorage.getItem('session_token');
    if (!sessionToken) {
      console.warn(`${logPrefix}⚠️ [Intervals] No session token`);
      return {
        ok: false,
        error: { code: 'NO_SESSION', message: 'No session token available' },
        provider: 'intervals'
      };
    }

    const params = new URLSearchParams();
    if (oldest) params.append('oldest', oldest);
    if (newest) params.append('newest', newest);

    const url = `/api/intervals/activities${params.toString() ? '?' + params.toString() : ''}`;
    
    console.log(`${logPrefix}📥 [Intervals] Fetching activities:`, url);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`${logPrefix}ℹ️ [Intervals] Not connected`);
        return {
          ok: false,
          error: { code: 'NOT_CONNECTED', message: 'Intervals.icu not connected' },
          provider: 'intervals'
        };
      }
      
      // Check for reconnect required error
      if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.requiresReconnect) {
          console.warn(`${logPrefix}⚠️ [Intervals] Connection incomplete - reconnect required`);
          return {
            ok: false,
            error: { code: 'RECONNECT_REQUIRED', message: 'Please disconnect and reconnect Intervals.icu in Settings' },
            provider: 'intervals'
          };
        }
      }
      
      if (response.status === 401 || response.status === 403) {
        console.error(`${logPrefix}❌ [Intervals] Token expired or unauthorized`);
        return {
          ok: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Intervals.icu token expired - please reconnect' },
          provider: 'intervals'
        };
      }
      
      console.error(`${logPrefix}❌ [Intervals] Fetch failed:`, response.status, response.statusText);
      return {
        ok: false,
        error: { code: 'FETCH_FAILED', message: `Failed to fetch: ${response.statusText}` },
        provider: 'intervals'
      };
    }

    const activities = await response.json();
    console.log(`${logPrefix}✅ [Intervals] Fetched ${activities.length} activities`);
    
    return {
      ok: true,
      data: activities,
      provider: 'intervals'
    };
  } catch (error) {
    console.error(`${logPrefix}❌ [Intervals] Error:`, error.message);
    return {
      ok: false,
      error: { code: 'NETWORK_ERROR', message: error.message },
      provider: 'intervals'
    };
  }
}

/**
 * Legacy wrapper for fetchIntervalsActivities that returns array for backward compatibility
 * @deprecated Use fetchIntervalsActivities directly and handle structured result
 */
export async function fetchIntervalsActivitiesLegacy(options = {}) {
  const result = await fetchIntervalsActivities(options);
  return result.ok ? result.data : [];
}

/**
 * Get source icon/badge info for an activity
 * @param {Object} activity - Activity object
 * @returns {Object} Source info { name, color, icon }
 */
export function getActivitySourceInfo(activity) {
  const source = activity.source || 'unknown';
  
  const sourceMap = {
    strava: {
      name: 'Strava',
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-300'
    },
    intervals: {
      name: 'Intervals.icu',
      color: 'purple',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-300'
    },
    manual: {
      name: 'Manual',
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300'
    },
    unknown: {
      name: 'Unknown',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300'
    }
  };

  return sourceMap[source] || sourceMap.unknown;
}
