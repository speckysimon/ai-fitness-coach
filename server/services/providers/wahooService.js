/**
 * Wahoo Integration Service
 * 
 * CRITICAL: This is a SKELETON implementation.
 * All imports MUST go through activityImportOrchestrator.
 * 
 * TODO: Implement real Wahoo API integration
 */

import db from '../../db.js';
import { importActivityBatch, verifyPostImport } from '../activityImportOrchestrator.js';
import { mapToInternalFormat, detectActivityType } from './wahooMapper.js';

// TODO: Add Wahoo API configuration
const WAHOO_OAUTH_URL = 'https://api.wahooligan.com/oauth/authorize';
const WAHOO_TOKEN_URL = 'https://api.wahooligan.com/oauth/token';
const WAHOO_API_BASE = 'https://api.wahooligan.com/v1';

/**
 * Get OAuth authorization URL
 * 
 * TODO: Implement OAuth 2.0 flow
 * - Build authorization URL with client_id, redirect_uri, scope
 * - Include state parameter for CSRF protection
 * 
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId, redirectUri) {
  // TODO: Implement OAuth 2.0 authorization URL
  
  throw new Error('NOT IMPLEMENTED: Wahoo OAuth flow');
  
  // Example implementation:
  // const state = generateRandomState();
  // storeState(userId, state);
  // 
  // const params = new URLSearchParams({
  //   client_id: process.env.WAHOO_CLIENT_ID,
  //   redirect_uri: redirectUri,
  //   response_type: 'code',
  //   scope: 'workouts_read user_read',
  //   state: state
  // });
  // 
  // return `${WAHOO_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 * 
 * TODO: Implement OAuth 2.0 token exchange
 * - Verify state parameter
 * - Exchange code for access/refresh tokens
 * - Store tokens in database
 * 
 * @param {string} code - Authorization code
 * @param {string} state - State parameter for CSRF protection
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token data
 */
export async function exchangeCodeForTokens(code, state, userId) {
  // TODO: Implement OAuth 2.0 token exchange
  
  throw new Error('NOT IMPLEMENTED: Wahoo token exchange');
  
  // Example implementation:
  // // Verify state
  // const storedState = getStoredState(userId);
  // if (state !== storedState) {
  //   throw new Error('Invalid state parameter');
  // }
  // 
  // // Exchange code for tokens
  // const response = await fetch(WAHOO_TOKEN_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     grant_type: 'authorization_code',
  //     code: code,
  //     client_id: process.env.WAHOO_CLIENT_ID,
  //     client_secret: process.env.WAHOO_CLIENT_SECRET,
  //     redirect_uri: redirectUri
  //   })
  // });
  // 
  // const tokens = await response.json();
  // 
  // // Store tokens
  // db.prepare(`
  //   INSERT OR REPLACE INTO wahoo_tokens (
  //     user_id, access_token, refresh_token, expires_at, created_at, updated_at
  //   ) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  // `).run(
  //   userId,
  //   tokens.access_token,
  //   tokens.refresh_token,
  //   Date.now() + tokens.expires_in * 1000
  // );
  // 
  // return { ok: true };
}

/**
 * Refresh access token
 * 
 * TODO: Implement OAuth 2.0 token refresh
 * - Use refresh token to get new access token
 * - Update database with new tokens
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} New token data
 */
export async function refreshAccessToken(userId) {
  // TODO: Implement token refresh
  
  throw new Error('NOT IMPLEMENTED: Wahoo token refresh');
  
  // Example implementation:
  // const tokens = db.prepare(`
  //   SELECT refresh_token FROM wahoo_tokens WHERE user_id = ?
  // `).get(userId);
  // 
  // if (!tokens?.refresh_token) {
  //   throw new Error('No refresh token found');
  // }
  // 
  // const response = await fetch(WAHOO_TOKEN_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  //   body: new URLSearchParams({
  //     grant_type: 'refresh_token',
  //     refresh_token: tokens.refresh_token,
  //     client_id: process.env.WAHOO_CLIENT_ID,
  //     client_secret: process.env.WAHOO_CLIENT_SECRET
  //   })
  // });
  // 
  // const newTokens = await response.json();
  // 
  // // Update database
  // db.prepare(`
  //   UPDATE wahoo_tokens
  //   SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = datetime('now')
  //   WHERE user_id = ?
  // `).run(
  //   newTokens.access_token,
  //   newTokens.refresh_token,
  //   Date.now() + newTokens.expires_in * 1000,
  //   userId
  // );
  // 
  // return { ok: true };
}

/**
 * Check if user has valid tokens
 * 
 * TODO: Implement token validation
 * - Check if tokens exist
 * - Check if access token is expired
 * - Refresh if needed
 * 
 * @param {number} userId - User ID
 * @returns {boolean} True if tokens are valid
 */
export function hasValidTokens(userId) {
  // TODO: Check wahoo_tokens table and expiration
  
  const tokens = db.prepare(`
    SELECT access_token, expires_at FROM wahoo_tokens WHERE user_id = ?
  `).get(userId);
  
  if (!tokens?.access_token) {
    return false;
  }
  
  // Check if expired
  if (tokens.expires_at && tokens.expires_at < Date.now()) {
    return false;
  }
  
  return true;
}

/**
 * Get valid access token
 * 
 * TODO: Implement token retrieval with auto-refresh
 * 
 * @param {number} userId - User ID
 * @returns {Promise<string>} Access token
 */
async function getValidAccessToken(userId) {
  // TODO: Get token and refresh if expired
  
  const tokens = db.prepare(`
    SELECT access_token, expires_at FROM wahoo_tokens WHERE user_id = ?
  `).get(userId);
  
  if (!tokens) {
    throw new Error('No Wahoo tokens found');
  }
  
  // Check if expired and refresh
  if (tokens.expires_at && tokens.expires_at < Date.now() + 5 * 60 * 1000) {
    await refreshAccessToken(userId);
    const newTokens = db.prepare(`
      SELECT access_token FROM wahoo_tokens WHERE user_id = ?
    `).get(userId);
    return newTokens.access_token;
  }
  
  return tokens.access_token;
}

/**
 * Fetch workouts (activities) list from Wahoo
 * 
 * TODO: Implement Wahoo API workout fetching
 * - Use OAuth 2.0 Bearer token
 * - Handle pagination (Wahoo uses page/per_page)
 * - Fetch workout summaries
 * - Optionally fetch detailed data for each workout
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Fetch options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max workouts per page
 * @returns {Promise<Array>} Raw Wahoo workouts
 */
export async function fetchActivities(userId, options = {}) {
  // TODO: Implement Wahoo API fetching
  
  throw new Error('NOT IMPLEMENTED: Wahoo workout fetching');
  
  // Example implementation:
  // const token = await getValidAccessToken(userId);
  // 
  // const params = new URLSearchParams({
  //   page: 1,
  //   per_page: options.limit || 100
  // });
  // 
  // if (options.startDate) {
  //   params.append('starts_after', options.startDate.toISOString());
  // }
  // 
  // if (options.endDate) {
  //   params.append('starts_before', options.endDate.toISOString());
  // }
  // 
  // const response = await fetch(`${WAHOO_API_BASE}/workouts?${params}`, {
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Accept': 'application/json'
  //   }
  // });
  // 
  // const data = await response.json();
  // return data.workouts || [];
}

/**
 * Fetch single workout details
 * 
 * TODO: Implement detailed workout fetching
 * - Fetch workout summary
 * - Fetch workout file (FIT format)
 * - Parse FIT file for streams
 * 
 * @param {number} userId - User ID
 * @param {string} workoutId - Wahoo workout ID
 * @returns {Promise<Object>} Workout details
 */
export async function fetchActivityDetails(userId, workoutId) {
  // TODO: Implement detailed workout fetching
  
  throw new Error('NOT IMPLEMENTED: Wahoo workout details');
  
  // Example implementation:
  // const token = await getValidAccessToken(userId);
  // 
  // const response = await fetch(`${WAHOO_API_BASE}/workouts/${workoutId}`, {
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Accept': 'application/json'
  //   }
  // });
  // 
  // return response.json();
}

/**
 * Download FIT file for workout
 * 
 * TODO: Implement FIT file download
 * - Wahoo provides FIT files for all workouts
 * - Download and parse FIT file
 * - Use fitParserService to extract data
 * 
 * @param {number} userId - User ID
 * @param {string} workoutId - Wahoo workout ID
 * @returns {Promise<Buffer>} FIT file data
 */
export async function downloadFitFile(userId, workoutId) {
  // TODO: Implement FIT file download
  
  throw new Error('NOT IMPLEMENTED: Wahoo FIT download');
  
  // Example implementation:
  // const token = await getValidAccessToken(userId);
  // 
  // const response = await fetch(`${WAHOO_API_BASE}/workouts/${workoutId}/file`, {
  //   headers: {
  //     'Authorization': `Bearer ${token}`,
  //     'Accept': 'application/octet-stream'
  //   }
  // });
  // 
  // return response.buffer();
}

/**
 * Sync Wahoo workouts for user
 * 
 * CRITICAL: This is the main integration point.
 * MUST use importActivityBatch() and verifyPostImport().
 * 
 * TODO: Implement complete sync flow
 * - Fetch workouts from Wahoo
 * - Map to internal format
 * - Import through orchestrator
 * - Verify integrity
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Sync options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max workouts
 * @returns {Promise<Object>} { importStats, integrity }
 */
export async function syncWahooActivities(userId, options = {}) {
  console.log(`[Wahoo] Starting sync for user ${userId}`);
  
  // 1. Check tokens
  if (!hasValidTokens(userId)) {
    return {
      ok: false,
      error: 'NO_VALID_TOKENS',
      message: 'User needs to authorize Wahoo connection'
    };
  }
  
  try {
    // 2. Fetch workouts from Wahoo
    // TODO: Uncomment when fetchActivities is implemented
    // const rawActivities = await fetchActivities(userId, options);
    // console.log(`[Wahoo] Fetched ${rawActivities.length} workouts`);
    
    // TEMPORARY: Return empty result
    console.log('[Wahoo] SKELETON: No workouts fetched (not implemented)');
    return {
      ok: true,
      importStats: {
        total: 0,
        created: 0,
        upgraded: 0,
        attached: 0,
        shells: 0,
        errors: 0
      },
      integrity: {
        ok: true,
        issues: [],
        summary: {
          errorCount: 0,
          warningCount: 0
        }
      }
    };
    
    // TODO: Uncomment when implementation is complete
    // // 3. Map to internal format
    // const mappedActivities = rawActivities.map(mapToInternalFormat);
    // 
    // // 4. Import through orchestrator (REQUIRED)
    // const importResults = await importActivityBatch({
    //   userId,
    //   provider: 'wahoo',
    //   activities: mappedActivities,
    //   typeDetector: detectActivityType
    // });
    // 
    // console.log(`[Wahoo] Import complete: ${importResults.created} created, ${importResults.upgraded} upgraded`);
    // 
    // // 5. MANDATORY: Verify integrity
    // const integrity = await verifyPostImport(userId);
    // 
    // if (!integrity.ok) {
    //   console.error(`[Wahoo] Integrity violations detected:`, integrity.issues);
    // }
    // 
    // // 6. Return combined results
    // return {
    //   ok: true,
    //   importStats: importResults,
    //   integrity: {
    //     ok: integrity.ok,
    //     issues: integrity.issues,
    //     summary: {
    //       errorCount: integrity.errorCount,
    //       warningCount: integrity.warningCount
    //     }
    //   }
    // };
    
  } catch (error) {
    console.error(`[Wahoo] Sync failed:`, error);
    return {
      ok: false,
      error: error.message
    };
  }
}

export default {
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  hasValidTokens,
  fetchActivities,
  fetchActivityDetails,
  downloadFitFile,
  syncWahooActivities
};
