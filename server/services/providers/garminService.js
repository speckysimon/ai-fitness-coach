/**
 * Garmin Connect Integration Service
 * 
 * CRITICAL: This is a SKELETON implementation.
 * All imports MUST go through activityImportOrchestrator.
 * 
 * TODO: Implement real Garmin Connect API integration
 */

import db from '../../db.js';
import { importActivityBatch, verifyPostImport } from '../activityImportOrchestrator.js';
import { mapToInternalFormat, detectActivityType } from './garminMapper.js';

// TODO: Add Garmin Connect API configuration
const GARMIN_OAUTH_URL = 'https://connect.garmin.com/oauthConfirm';
const GARMIN_API_BASE = 'https://apis.garmin.com/wellness-api/rest';

/**
 * Get OAuth authorization URL
 * 
 * TODO: Implement OAuth 1.0a flow (Garmin uses OAuth 1.0a, not 2.0)
 * - Generate request token
 * - Build authorization URL with callback
 * - Store request token for callback verification
 * 
 * @param {number} userId - User ID
 * @param {string} redirectUri - OAuth callback URL
 * @returns {string} Authorization URL
 */
export function getAuthUrl(userId, redirectUri) {
  // TODO: Implement OAuth 1.0a request token flow
  // 1. Generate request token from Garmin
  // 2. Store request token temporarily
  // 3. Build authorization URL
  
  throw new Error('NOT IMPLEMENTED: Garmin OAuth flow');
  
  // Example return:
  // return `${GARMIN_OAUTH_URL}?oauth_token=${requestToken}&oauth_callback=${redirectUri}`;
}

/**
 * Exchange authorization code for tokens
 * 
 * TODO: Implement OAuth 1.0a access token exchange
 * - Verify oauth_verifier from callback
 * - Exchange request token + verifier for access token
 * - Store access token in database
 * 
 * @param {string} oauthToken - OAuth token from callback
 * @param {string} oauthVerifier - OAuth verifier from callback
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token data
 */
export async function exchangeCodeForTokens(oauthToken, oauthVerifier, userId) {
  // TODO: Implement OAuth 1.0a access token exchange
  // 1. Retrieve stored request token
  // 2. Exchange with Garmin for access token
  // 3. Store in garmin_tokens table
  
  throw new Error('NOT IMPLEMENTED: Garmin token exchange');
  
  // Example implementation:
  // const accessToken = await requestAccessToken(oauthToken, oauthVerifier);
  // 
  // db.prepare(`
  //   INSERT OR REPLACE INTO garmin_tokens (
  //     user_id, access_token, access_token_secret, created_at, updated_at
  //   ) VALUES (?, ?, ?, datetime('now'), datetime('now'))
  // `).run(userId, accessToken.token, accessToken.secret);
  // 
  // return { ok: true };
}

/**
 * Refresh access token
 * 
 * NOTE: Garmin OAuth 1.0a tokens don't expire, so refresh is not needed
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token data
 */
export async function refreshAccessToken(userId) {
  // Garmin OAuth 1.0a tokens don't expire
  return { ok: true, message: 'Garmin tokens do not expire' };
}

/**
 * Check if user has valid tokens
 * 
 * TODO: Implement token validation
 * - Check if tokens exist in database
 * - Optionally verify with Garmin API
 * 
 * @param {number} userId - User ID
 * @returns {boolean} True if tokens are valid
 */
export function hasValidTokens(userId) {
  // TODO: Check garmin_tokens table
  
  const tokens = db.prepare(`
    SELECT access_token FROM garmin_tokens WHERE user_id = ?
  `).get(userId);
  
  return !!tokens?.access_token;
}

/**
 * Get valid access token
 * 
 * TODO: Implement token retrieval with OAuth 1.0a signing
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Token data
 */
async function getValidAccessToken(userId) {
  // TODO: Retrieve tokens from database
  // TODO: Return token + secret for OAuth 1.0a signing
  
  const tokens = db.prepare(`
    SELECT access_token, access_token_secret FROM garmin_tokens WHERE user_id = ?
  `).get(userId);
  
  if (!tokens) {
    throw new Error('No Garmin tokens found');
  }
  
  return {
    token: tokens.access_token,
    secret: tokens.access_token_secret
  };
}

/**
 * Fetch activities list from Garmin
 * 
 * TODO: Implement Garmin API activity fetching
 * - Use OAuth 1.0a signing for requests
 * - Handle pagination (Garmin uses limit/offset)
 * - Fetch activity summaries
 * - Optionally fetch detailed data for each activity
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Fetch options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max activities per page
 * @returns {Promise<Array>} Raw Garmin activities
 */
export async function fetchActivities(userId, options = {}) {
  // TODO: Implement Garmin API fetching
  // 1. Get valid access token
  // 2. Build OAuth 1.0a signed request
  // 3. Fetch from Garmin API
  // 4. Handle pagination
  // 5. Return raw Garmin format
  
  throw new Error('NOT IMPLEMENTED: Garmin activity fetching');
  
  // Example implementation:
  // const tokens = await getValidAccessToken(userId);
  // 
  // const startTimestamp = options.startDate?.getTime() || Date.now() - 30 * 24 * 60 * 60 * 1000;
  // const endTimestamp = options.endDate?.getTime() || Date.now();
  // 
  // const url = `${GARMIN_API_BASE}/activities`;
  // const params = {
  //   uploadStartTimeInSeconds: Math.floor(startTimestamp / 1000),
  //   uploadEndTimeInSeconds: Math.floor(endTimestamp / 1000),
  //   limit: options.limit || 100
  // };
  // 
  // // Sign request with OAuth 1.0a
  // const signedRequest = signOAuth1Request(url, params, tokens);
  // 
  // const response = await fetch(signedRequest.url, {
  //   headers: signedRequest.headers
  // });
  // 
  // return response.json();
}

/**
 * Fetch single activity details
 * 
 * TODO: Implement detailed activity fetching
 * - Fetch activity summary
 * - Fetch activity streams (HR, power, cadence, etc.)
 * - Fetch laps/splits
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Garmin activity ID
 * @returns {Promise<Object>} Activity details
 */
export async function fetchActivityDetails(userId, activityId) {
  // TODO: Implement detailed activity fetching
  
  throw new Error('NOT IMPLEMENTED: Garmin activity details');
  
  // Example implementation:
  // const tokens = await getValidAccessToken(userId);
  // const url = `${GARMIN_API_BASE}/activities/${activityId}`;
  // 
  // const signedRequest = signOAuth1Request(url, {}, tokens);
  // const response = await fetch(signedRequest.url, {
  //   headers: signedRequest.headers
  // });
  // 
  // return response.json();
}

/**
 * Download FIT file for activity
 * 
 * TODO: Implement FIT file download
 * - Garmin provides original FIT files
 * - Download and parse FIT file
 * - Use fitParserService to extract data
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Garmin activity ID
 * @returns {Promise<Buffer>} FIT file data
 */
export async function downloadFitFile(userId, activityId) {
  // TODO: Implement FIT file download
  
  throw new Error('NOT IMPLEMENTED: Garmin FIT download');
  
  // Example implementation:
  // const tokens = await getValidAccessToken(userId);
  // const url = `${GARMIN_API_BASE}/activities/${activityId}/file`;
  // 
  // const signedRequest = signOAuth1Request(url, {}, tokens);
  // const response = await fetch(signedRequest.url, {
  //   headers: signedRequest.headers
  // });
  // 
  // return response.buffer();
}

/**
 * Sync Garmin activities for user
 * 
 * CRITICAL: This is the main integration point.
 * MUST use importActivityBatch() and verifyPostImport().
 * 
 * TODO: Implement complete sync flow
 * - Fetch activities from Garmin
 * - Map to internal format
 * - Import through orchestrator
 * - Verify integrity
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Sync options
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {number} options.limit - Max activities
 * @returns {Promise<Object>} { importStats, integrity }
 */
export async function syncGarminActivities(userId, options = {}) {
  console.log(`[Garmin] Starting sync for user ${userId}`);
  
  // 1. Check tokens
  if (!hasValidTokens(userId)) {
    return {
      ok: false,
      error: 'NO_VALID_TOKENS',
      message: 'User needs to authorize Garmin connection'
    };
  }
  
  try {
    // 2. Fetch activities from Garmin
    // TODO: Uncomment when fetchActivities is implemented
    // const rawActivities = await fetchActivities(userId, options);
    // console.log(`[Garmin] Fetched ${rawActivities.length} activities`);
    
    // TEMPORARY: Return empty result
    console.log('[Garmin] SKELETON: No activities fetched (not implemented)');
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
    //   provider: 'garmin',
    //   activities: mappedActivities,
    //   typeDetector: detectActivityType
    // });
    // 
    // console.log(`[Garmin] Import complete: ${importResults.created} created, ${importResults.upgraded} upgraded`);
    // 
    // // 5. MANDATORY: Verify integrity
    // const integrity = await verifyPostImport(userId);
    // 
    // if (!integrity.ok) {
    //   console.error(`[Garmin] Integrity violations detected:`, integrity.issues);
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
    console.error(`[Garmin] Sync failed:`, error);
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
  syncGarminActivities
};
