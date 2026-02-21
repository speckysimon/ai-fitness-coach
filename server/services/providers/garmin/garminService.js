/**
 * Garmin Connect Service (STUB)
 * 
 * This is a STUB implementation showing the required interface.
 * TODO: Implement real Garmin Connect API integration.
 * 
 * CRITICAL: This module MUST NOT import:
 * - db.js (except for garmin_tokens table)
 * - canonicalActivitySelector.js
 * - activityUpdateService.js
 * - analyticsQueryBuilder.js
 */

import db from '../../../db.js';

// TODO: Add real Garmin API configuration
const GARMIN_OAUTH_URL = 'https://connect.garmin.com/oauthConfirm';
const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';

/**
 * Get OAuth authorization URL
 * 
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId, redirectUri) {
  // TODO: Implement OAuth 1.0a request token flow
  console.log('[Garmin] STUB: getAuthUrl called');
  
  return `${GARMIN_OAUTH_URL}?oauth_callback=${encodeURIComponent(redirectUri)}&user_id=${userId}`;
}

/**
 * Exchange authorization code for tokens
 * 
 * @param {string} code - Authorization code
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token result
 */
export async function exchangeCodeForTokens(code, userId) {
  // TODO: Implement OAuth 1.0a access token exchange
  console.log('[Garmin] STUB: exchangeCodeForTokens called');
  
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
  // TODO: Check garmin_tokens table
  console.log('[Garmin] STUB: hasValidTokens called');
  
  // STUB: Always return false (no real tokens)
  return false;
}

/**
 * List activities from Garmin
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
  // TODO: Implement real Garmin API fetching
  console.log('[Garmin] STUB: listActivities called with options:', options);
  
  // STUB: Return mock activities
  const mockActivities = [
    {
      activityId: 123456789,
      activityName: 'Morning Ride (Garmin STUB)',
      description: 'Mock Garmin activity',
      startTimeGMT: '2026-02-17T10:00:00.0',
      startTimeLocal: '2026-02-17T11:00:00.0',
      activityType: { typeKey: 'cycling' },
      distance: 45000,
      duration: 3600,
      elevationGain: 850,
      avgPower: 185,
      maxPower: 450,
      normPower: 195,
      avgHR: 145,
      maxHR: 175,
      avgBikeCadence: 85,
      avgSpeed: 12.5,
      maxSpeed: 18.2,
      calories: 850,
      hasFit: true
    },
    {
      activityId: 987654321,
      activityName: 'Evening Ride (Garmin STUB)',
      description: 'Another mock activity',
      startTimeGMT: '2026-02-17T17:00:00.0',
      startTimeLocal: '2026-02-17T18:00:00.0',
      activityType: { typeKey: 'cycling' },
      distance: 30000,
      duration: 2400,
      elevationGain: 450,
      avgPower: 165,
      maxPower: 380,
      normPower: 175,
      avgHR: 138,
      maxHR: 168,
      avgBikeCadence: 82,
      avgSpeed: 12.5,
      maxSpeed: 16.8,
      calories: 600,
      hasFit: true
    }
  ];
  
  return {
    ok: true,
    activities: mockActivities,
    cursor: null,
    hasMore: false,
    providerStats: {
      total: mockActivities.length,
      fetched: mockActivities.length,
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
