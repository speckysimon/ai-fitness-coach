// Client-side helper for fetching activities from backend cache
// Single source of truth - all pages use this helper

/**
 * Get activities from backend cache
 * @param {number} windowDays - Number of days to look back (default: 42)
 * @returns {Promise<Object>} Activities with metadata
 */
export async function getActivities(windowDays = 42) {
  try {
    // Get athlete ID from current user
    const currentUser = localStorage.getItem('current_user');
    const athleteId = currentUser ? JSON.parse(currentUser).email : 'default';
    
    // Get tokens for backend to fetch from sources
    const stravaTokens = localStorage.getItem('strava_tokens');
    const intervalsTokens = localStorage.getItem('intervals_tokens');
    
    // Build query params
    const params = new URLSearchParams({
      athleteId,
      windowDays: windowDays.toString()
    });
    
    if (stravaTokens) {
      params.append('stravaTokens', stravaTokens);
    }
    
    if (intervalsTokens) {
      params.append('intervalsTokens', intervalsTokens);
    }
    
    const response = await fetch(`/api/activities?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`[ActivityCache Client] Loaded ${data.count} activities (cached=${data.cached}, sources=${data.sources.join('+')}, window=${windowDays}d)`);
    
    return data;
  } catch (error) {
    console.error('[ActivityCache Client] Error fetching activities:', error);
    throw error;
  }
}

/**
 * Invalidate cache for current athlete
 * Call this after adding/editing/deleting manual activities
 */
export async function invalidateCache() {
  try {
    const currentUser = localStorage.getItem('current_user');
    const athleteId = currentUser ? JSON.parse(currentUser).email : 'default';
    
    const response = await fetch('/api/activities/invalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to invalidate cache: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[ActivityCache Client] Cache invalidated: ${data.message}`);
    
    return data;
  } catch (error) {
    console.error('[ActivityCache Client] Error invalidating cache:', error);
    throw error;
  }
}

/**
 * Get cache statistics (for debugging)
 */
export async function getCacheStats() {
  try {
    const response = await fetch('/api/activities/cache-stats');
    
    if (!response.ok) {
      throw new Error(`Failed to get cache stats: ${response.status}`);
    }
    
    const stats = await response.json();
    console.log('[ActivityCache Client] Cache stats:', stats);
    
    return stats;
  } catch (error) {
    console.error('[ActivityCache Client] Error getting cache stats:', error);
    throw error;
  }
}
