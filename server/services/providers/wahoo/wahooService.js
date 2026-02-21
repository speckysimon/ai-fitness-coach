/**
 * Wahoo Service (STUB)
 * 
 * This is a STUB implementation showing the required interface.
 * TODO: Implement real Wahoo API integration.
 * 
 * CRITICAL: This module MUST NOT import:
 * - db.js (except for wahoo_tokens table)
 * - canonicalActivitySelector.js
 * - activityUpdateService.js
 * - analyticsQueryBuilder.js
 */

import db from '../../../db.js';

// TODO: Add real Wahoo API configuration
const WAHOO_OAUTH_URL = 'https://api.wahooligan.com/oauth/authorize';
const WAHOO_TOKEN_URL = 'https://api.wahooligan.com/oauth/token';
const WAHOO_API_BASE = 'https://api.wahooligan.com/v1';

/**
 * Get OAuth authorization URL
 * 
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId, redirectUri) {
  // TODO: Implement OAuth 2.0 authorization URL
  console.log('[Wahoo] STUB: getAuthUrl called');
  
  const params = new URLSearchParams({
    client_id: 'STUB_CLIENT_ID',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'workouts_read user_read',
    state: `user_${userId}`
  });
  
  return `${WAHOO_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * 
 * @param {string} code - Authorization code
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token result
 */
export async function exchangeCodeForTokens(code, userId) {
  // TODO: Implement OAuth 2.0 token exchange
  console.log('[Wahoo] STUB: exchangeCodeForTokens called');
  
  // STUB: Just return success
  return {
    ok: true,
    message: 'STUB: Tokens would be stored here'
  };
}

/**
 * Check if user has valid tokens
 * 
 * @param {number} userId - User ID
 * @returns {boolean} True if tokens are valid
 */
export function hasValidTokens(userId) {
  // TODO: Check wahoo_tokens table
  console.log('[Wahoo] STUB: hasValidTokens called');
  
  // STUB: Always return false (no real tokens)
  return false;
}

/**
 * List workouts (activities) from Wahoo
 * 
 * CRITICAL: This is the main data fetching function.
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Fetch options
 * @param {Date} options.after - Fetch activities after this date
 * @param {Date} options.before - Fetch activities before this date
 * @param {number} options.limit - Max activities to fetch
 * @param {string} options.cursor - Pagination cursor
 * @returns {Promise<Object>} List result
 */
export async function listActivities(userId, options = {}) {
  // TODO: Implement real Wahoo API fetching
  console.log('[Wahoo] STUB: listActivities called with options:', options);
  
  // STUB: Return mock workouts
  const mockWorkouts = [
    {
      id: 111111,
      name: 'Morning Ride (Wahoo STUB)',
      notes: 'Mock Wahoo workout',
      workout_type: 'bike',
      starts: '2026-02-17T10:00:00Z',
      duration_seconds: 3600,
      distance_meters: 45000,
      ascent_meters: 850,
      power_avg: 185,
      power_max: 450,
      power_normalized: 195,
      heart_rate_avg: 145,
      heart_rate_max: 175,
      cadence_avg: 85,
      speed_avg: 12.5,
      speed_max: 18.2,
      calories: 850,
      has_power_meter: true,
      file_url: 'https://api.wahooligan.com/v1/workouts/111111/file'
    },
    {
      id: 222222,
      name: 'Evening Ride (Wahoo STUB)',
      notes: 'Another mock workout',
      workout_type: 'bike',
      starts: '2026-02-17T17:00:00Z',
      duration_seconds: 2400,
      distance_meters: 30000,
      ascent_meters: 450,
      power_avg: 165,
      power_max: 380,
      power_normalized: 175,
      heart_rate_avg: 138,
      heart_rate_max: 168,
      cadence_avg: 82,
      speed_avg: 12.5,
      speed_max: 16.8,
      calories: 600,
      has_power_meter: true,
      file_url: 'https://api.wahooligan.com/v1/workouts/222222/file'
    }
  ];
  
  return {
    ok: true,
    activities: mockWorkouts,
    cursor: null,
    hasMore: false,
    providerStats: {
      total: mockWorkouts.length,
      fetched: mockWorkouts.length,
      skipped: 0
    }
  };
}

export default {
  getAuthUrl,
  exchangeCodeForTokens,
  hasValidTokens,
  listActivities
};
