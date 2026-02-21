// Activity cache service with in-memory caching and server-side merge/dedup
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// In-memory cache with TTL
const activityCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generate cache key
 */
function getCacheKey(athleteId, windowDays) {
  return `${athleteId}:${windowDays}`;
}

/**
 * Deduplicate activities from multiple sources
 * Priority: Strava > Intervals.icu > Manual
 */
function deduplicateActivities(stravaActivities, intervalsActivities, manualActivities) {
  const activityMap = new Map();
  
  // Helper to create a dedup key based on start time and duration
  const getActivityKey = (activity) => {
    const startTime = new Date(activity.date || activity.start_date_local || activity.start_date).getTime();
    const duration = activity.duration || activity.moving_time || activity.elapsed_time || 0;
    // Round to nearest 5 minutes to account for slight differences
    const roundedTime = Math.floor(startTime / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const roundedDuration = Math.floor(duration / 300) * 300; // Round to 5 min
    return `${roundedTime}:${roundedDuration}`;
  };
  
  // Add Strava activities first (highest priority)
  stravaActivities.forEach(activity => {
    const key = getActivityKey(activity);
    activityMap.set(key, {
      ...activity,
      source: 'strava',
      id: activity.id || activity.strava_id
    });
  });
  
  // Add Intervals.icu activities (only if not already from Strava)
  intervalsActivities.forEach(activity => {
    const key = getActivityKey(activity);
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        ...activity,
        source: 'intervals',
        id: activity.id || activity.intervals_id
      });
    }
  });
  
  // Add manual activities (only if not already from other sources)
  manualActivities.forEach(activity => {
    const key = getActivityKey(activity);
    if (!activityMap.has(key)) {
      activityMap.set(key, {
        ...activity,
        source: 'manual',
        id: activity.id
      });
    }
  });
  
  // Convert map to array and sort by date (newest first)
  const dedupedActivities = Array.from(activityMap.values());
  dedupedActivities.sort((a, b) => {
    const dateA = new Date(a.date || a.start_date_local || a.start_date);
    const dateB = new Date(b.date || b.start_date_local || b.start_date);
    return dateB - dateA;
  });
  
  return dedupedActivities;
}

/**
 * Normalize activity field names to consistent format
 */
function normalizeActivity(activity) {
  return {
    ...activity,
    // Normalize date field
    date: activity.date || activity.start_date_local || activity.start_date,
    // Normalize power fields
    avgPower: activity.avgPower || activity.average_watts || activity.icu_average_watts || null,
    maxPower: activity.maxPower || activity.max_watts || activity.icu_max_watts || null,
    normalizedPower: activity.normalizedPower || activity.normalized_power || activity.icu_normalized_power || null,
    // Normalize HR fields
    avgHeartRate: activity.avgHeartRate || activity.average_hr || activity.icu_average_hr || null,
    maxHeartRate: activity.maxHeartRate || activity.max_hr || activity.icu_max_hr || null,
    // Normalize duration
    duration: activity.duration || activity.moving_time || activity.elapsed_time || 0,
    // Normalize distance
    distance: activity.distance || 0,
    // Normalize elevation
    elevation: activity.elevation || activity.total_elevation_gain || 0
  };
}

/**
 * Fetch activities from Strava
 */
async function fetchStravaActivities(athleteId, windowDays, stravaTokens) {
  if (!stravaTokens || !stravaTokens.access_token) {
    return [];
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const afterTimestamp = Math.floor(cutoffDate.getTime() / 1000);
    
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=200`,
      {
        headers: {
          'Authorization': `Bearer ${stravaTokens.access_token}`
        }
      }
    );
    
    if (!response.ok) {
      console.error(`Strava API error: ${response.status}`);
      return [];
    }
    
    const activities = await response.json();
    return activities.map(normalizeActivity);
  } catch (error) {
    console.error('Error fetching Strava activities:', error);
    return [];
  }
}

/**
 * Fetch activities from Intervals.icu
 */
async function fetchIntervalsActivities(athleteId, windowDays, intervalsTokens) {
  if (!intervalsTokens || !intervalsTokens.athlete_id) {
    return [];
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const oldest = cutoffDate.toISOString().split('T')[0];
    const newest = new Date().toISOString().split('T')[0];
    
    const response = await fetch(
      `https://intervals.icu/api/v1/athlete/${intervalsTokens.athlete_id}/activities?oldest=${oldest}&newest=${newest}`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`API_KEY:${intervalsTokens.api_key}`).toString('base64')}`
        }
      }
    );
    
    if (!response.ok) {
      console.error(`Intervals.icu API error: ${response.status}`);
      return [];
    }
    
    const activities = await response.json();
    return activities.map(normalizeActivity);
  } catch (error) {
    console.error('Error fetching Intervals.icu activities:', error);
    return [];
  }
}

/**
 * Fetch manual activities from database
 */
async function fetchManualActivities(athleteId, windowDays) {
  try {
    const db = require('./db.cjs');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
    
    return new Promise((resolve, reject) => {
      db.manualActivityDb.all(
        `SELECT * FROM manual_activities 
         WHERE user_id = ? AND date >= ? 
         ORDER BY date DESC`,
        [athleteId, cutoffTimestamp],
        (err, rows) => {
          if (err) {
            console.error('Error fetching manual activities:', err);
            resolve([]);
          } else {
            const activities = rows.map(row => normalizeActivity({
              ...row,
              date: new Date(row.date * 1000).toISOString(),
              source: 'manual'
            }));
            resolve(activities);
          }
        }
      );
    });
  } catch (error) {
    console.error('Error fetching manual activities:', error);
    return [];
  }
}

/**
 * Get activities with caching
 */
export async function getActivities(athleteId, windowDays = 42, tokens = {}) {
  const key = getCacheKey(athleteId, windowDays);
  const cached = activityCache.get(key);
  
  // Check if cache is valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const ageMinutes = Math.floor((Date.now() - cached.timestamp) / (60 * 1000));
    console.log(`[ActivityCache] HIT athlete=${athleteId} window=${windowDays}d (age=${ageMinutes}m)`);
    return {
      activities: cached.activities,
      cached: true,
      fetchedAt: new Date(cached.timestamp).toISOString(),
      expiresAt: new Date(cached.timestamp + CACHE_TTL).toISOString(),
      sources: cached.sources,
      count: cached.activities.length
    };
  }
  
  console.log(`[ActivityCache] MISS athlete=${athleteId} window=${windowDays}d → fetch`);
  
  // Fetch from all sources in parallel
  const [stravaActivities, intervalsActivities, manualActivities] = await Promise.all([
    fetchStravaActivities(athleteId, windowDays, tokens.strava),
    fetchIntervalsActivities(athleteId, windowDays, tokens.intervals),
    fetchManualActivities(athleteId, windowDays)
  ]);
  
  console.log(`📊 Fetched: Strava=${stravaActivities.length}, Intervals=${intervalsActivities.length}, Manual=${manualActivities.length}`);
  
  // Deduplicate and merge
  const mergedActivities = deduplicateActivities(stravaActivities, intervalsActivities, manualActivities);
  
  console.log(`✨ After dedup: ${mergedActivities.length} unique activities`);
  
  // Determine which sources were used
  const sources = [];
  if (stravaActivities.length > 0) sources.push('strava');
  if (intervalsActivities.length > 0) sources.push('intervals');
  if (manualActivities.length > 0) sources.push('manual');
  
  // Cache the result
  const timestamp = Date.now();
  activityCache.set(key, {
    activities: mergedActivities,
    timestamp,
    sources
  });
  
  return {
    activities: mergedActivities,
    cached: false,
    fetchedAt: new Date(timestamp).toISOString(),
    expiresAt: new Date(timestamp + CACHE_TTL).toISOString(),
    sources,
    count: mergedActivities.length
  };
}

/**
 * Invalidate cache for an athlete
 */
export function invalidateCache(athleteId) {
  let cleared = 0;
  for (const key of activityCache.keys()) {
    if (key.startsWith(`${athleteId}:`)) {
      activityCache.delete(key);
      cleared++;
    }
  }
  console.log(`🗑️ Cleared ${cleared} cache entries for athlete ${athleteId}`);
  return cleared;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;
  
  for (const entry of activityCache.values()) {
    if (now - entry.timestamp < CACHE_TTL) {
      validEntries++;
    } else {
      expiredEntries++;
    }
  }
  
  return {
    totalEntries: activityCache.size,
    validEntries,
    expiredEntries,
    ttlMinutes: CACHE_TTL / (60 * 1000)
  };
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredCache() {
  const now = Date.now();
  let cleared = 0;
  
  for (const [key, entry] of activityCache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      activityCache.delete(key);
      cleared++;
    }
  }
  
  if (cleared > 0) {
    console.log(`🧹 Cleared ${cleared} expired cache entries`);
  }
  
  return cleared;
}

// Run cache cleanup every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);
