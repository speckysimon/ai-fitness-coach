import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { intervalsTokenDb, intervalsSyncStateDb, sessionDb } from '../db.js';
import intervalsService from '../services/intervalsService.js';
import { importActivity } from '../services/activityImportService.js';
import { recomputeRecentWeeks } from '../services/weeklyRecomputeScheduler.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

const router = express.Router();

// OAuth state storage (in-memory, consider Redis for production)
const oauthStates = new Map();

// Clean up old states every 10 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > maxAge) {
      oauthStates.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/intervals/auth
 * Initiate OAuth flow
 */
router.get('/auth', async (req, res) => {
  try {
    const sessionToken = req.query.session_token;
    if (!sessionToken) {
      return res.status(400).json({ error: 'Session token required' });
    }

    // Verify session
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Get OAuth config from database
    const config = await apiKeyLoader.getOAuthConfig('intervals');
    if (!config) {
      return res.status(500).json({ error: 'Intervals.icu OAuth not configured. Please add credentials in admin panel.' });
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    oauthStates.set(state, {
      userId: session.user_id,
      timestamp: Date.now()
    });

    // Build authorization URL
    const authUrl = new URL('https://intervals.icu/oauth/authorize');
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'ACTIVITY:READ,WELLNESS:READ');
    authUrl.searchParams.append('state', state);

    console.log('🔐 Intervals.icu OAuth initiated for user:', session.user_id);
    res.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('❌ Intervals auth error:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

/**
 * GET /api/intervals/callback
 * OAuth callback handler
 */
router.get('/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('❌ Intervals OAuth error:', error);
      return res.redirect(`${frontendUrl}/settings?error=intervals_${error}`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/settings?error=intervals_missing_params`);
    }

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData) {
      console.error('❌ Invalid OAuth state');
      return res.redirect(`${frontendUrl}/settings?error=intervals_invalid_state`);
    }
    oauthStates.delete(state);

    // Get OAuth config
    const config = await apiKeyLoader.getOAuthConfig('intervals');
    if (!config) {
      return res.redirect(`${frontendUrl}/settings?error=intervals_not_configured`);
    }

    console.log('🔄 Exchanging code for token...');
    console.log('📝 Using config:', { clientId: config.clientId, redirectUri: config.redirectUri });

    // Exchange code for token (Intervals.icu expects form-encoded data)
    const params = new URLSearchParams();
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', config.redirectUri);

    const tokenResponse = await axios.post(
      'https://intervals.icu/api/oauth/token',
      params,
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token, scope, athlete } = tokenResponse.data;

    console.log('✅ Token received, storing in database...');

    // Store token in database
    intervalsTokenDb.upsert({
      userId: stateData.userId,
      accessToken: access_token,
      scopes: scope,
      athleteId: athlete?.id?.toString(),
      athleteName: athlete?.name
    });

    console.log('✅ Intervals.icu connected for user:', stateData.userId);

    // Redirect to frontend
    res.redirect(`${frontendUrl}/settings?success=intervals_connected`);
  } catch (error) {
    console.error('❌ Intervals callback error:', error.response?.data || error.message);
    // Redirect to frontend
    res.redirect(`${frontendUrl}/settings?error=intervals_connection_failed`);
  }
});

/**
 * GET /api/intervals/activities
 * Fetch user's activities
 * Query params:
 *   - oldest: YYYY-MM-DD (optional, defaults to 6 months ago)
 *   - newest: YYYY-MM-DD (optional, defaults to today)
 *   - per_page: number (optional, for compatibility with Strava endpoint)
 */
router.get('/activities', async (req, res) => {
  try {
    console.log('🔍 [Intervals] /activities route called');
    
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      console.log('❌ [Intervals] No session token');
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      console.log('❌ [Intervals] Invalid session');
      return res.status(401).json({ error: 'Invalid session' });
    }
    console.log(`✅ [Intervals] Session found for user ${session.user_id}`);

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token) {
      console.log('❌ [Intervals] No token found');
      return res.status(404).json({ error: 'Intervals.icu not connected' });
    }
    console.log(`✅ [Intervals] Token found, athlete_id: ${token.athlete_id}`);

    // Check if athlete_id exists
    if (!token.athlete_id) {
      console.error('❌ [Intervals] Missing athlete_id for user:', session.user_id);
      return res.status(400).json({ 
        error: 'Intervals.icu connection incomplete. Please disconnect and reconnect Intervals.icu in Settings.',
        requiresReconnect: true 
      });
    }

    // Default to last 6 months if no dates provided
    let { oldest, newest } = req.query;
    
    if (!newest) {
      newest = new Date().toISOString().split('T')[0];
    }
    
    if (!oldest) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      oldest = sixMonthsAgo.toISOString().split('T')[0];
    }

    console.log(`📥 [Intervals] Fetching activities for user ${session.user_id} (athlete ${token.athlete_id}): ${oldest} to ${newest}`);
    console.log(`📥 [Intervals] Calling intervalsService.getActivities...`);

    // Use athlete ID from token (not '0')
    const activities = await intervalsService.getActivities(
      token.access_token,
      token.athlete_id,
      oldest,
      newest
    );

    console.log(`✅ [Intervals] Returning ${activities.length} activities`);
    
    // Debug: Log first activity to see field structure
    if (activities.length > 0) {
      console.log('🔍 [Intervals] Sample activity fields:', JSON.stringify(activities[0], null, 2));
    }

    // Return in same format as Strava endpoint (array directly)
    res.json(activities);
  } catch (error) {
    console.error('❌ [Intervals] Fetch activities error:', error.message);
    console.error('❌ [Intervals] Error stack:', error.stack);
    console.error('❌ [Intervals] Error response:', error.response?.data);
    
    if (error.message?.includes('authentication failed')) {
      return res.status(401).json({ error: 'Please reconnect Intervals.icu', requiresReauth: true });
    }
    
    res.status(500).json({ error: 'Failed to fetch activities', details: error.message });
  }
});

/**
 * GET /api/intervals/status
 * Check connection status
 */
router.get('/status', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const token = intervalsTokenDb.findByUserId(session.user_id);
    const syncState = intervalsSyncStateDb.findByUserId(session.user_id);

    if (!token) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      athleteId: token.athlete_id,
      athleteName: token.athlete_name,
      scopes: token.scopes,
      connectedAt: token.created_at,
      lastSyncedDate: syncState?.last_synced_date || null,
      backfillComplete: syncState?.backfill_complete === 1
    });
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

/**
 * GET /api/intervals/activity/:id/details
 * Get full activity details including GPS coordinates
 */
router.get('/activity/:id/details', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token || !token.access_token) {
      return res.status(400).json({ 
        error: 'Intervals.icu not connected',
        requiresReconnect: true 
      });
    }

    const { id } = req.params;
    
    console.log(`📥 [Intervals] Fetching full activity details for ${id}`);
    
    const activity = await intervalsService.getActivity(
      token.access_token,
      '0', // Use authenticated user's athlete ID
      id
    );
    
    console.log(`✅ [Intervals] Fetched activity details for ${id}`);
    
    res.json(activity);
  } catch (error) {
    console.error('❌ Fetch activity details error:', error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    res.status(500).json({ error: 'Failed to fetch activity details', details: error.message });
  }
});

// Streams endpoint moved below — see GET /activity/:activityId/streams (Coaching View)

/**
 * POST /api/intervals/disconnect
 * Disconnect Intervals.icu
 */
router.post('/disconnect', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Delete tokens and sync state
    intervalsTokenDb.delete(session.user_id);
    intervalsSyncStateDb.delete(session.user_id);

    console.log('🔌 Intervals.icu disconnected for user:', session.user_id);

    res.json({ success: true, message: 'Intervals.icu disconnected' });
  } catch (error) {
    console.error('❌ Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

/**
 * POST /api/intervals/backfill-latlng
 * Backfill GPS latlng data for enriched activities that have stream_types including 'latlng'
 * but no stored latlngs in raw_json. Fetches only the latlng stream (fast).
 */
router.post('/backfill-latlng', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) return res.status(401).json({ error: 'Authorization required' });

    const session = sessionDb.findByToken(sessionToken);
    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token?.access_token) return res.status(404).json({ error: 'Intervals.icu not connected' });

    const { createRequire: cr } = await import('module');
    const req2 = cr(import.meta.url);
    const db = req2('../db.js').default || req2('../db.js');

    // Find enriched Intervals sources with stream_types containing latlng but no stored latlngs
    const candidates = db.prepare(`
      SELECT id, provider_id, raw_json 
      FROM activity_sources 
      WHERE provider = 'intervals' 
        AND provider_id LIKE 'i%'
        AND raw_json IS NOT NULL
        AND raw_json LIKE '%"latlng"%'
        AND raw_json NOT LIKE '%"latlngs"%'
    `).all();

    // Further filter: only those whose stream_types actually includes 'latlng'
    const needsBackfill = candidates.filter(c => {
      try {
        const raw = JSON.parse(c.raw_json);
        return Array.isArray(raw.stream_types) && raw.stream_types.includes('latlng');
      } catch { return false; }
    });

    const limit = req.body?.limit || 20;
    const batch = needsBackfill.slice(0, limit);

    console.log(`📍 [Backfill] Found ${needsBackfill.length} activities needing latlng, processing ${batch.length}`);

    let patched = 0;
    let failed = 0;
    let skipped = 0;

    for (const source of batch) {
      try {
        const streams = await intervalsService.getActivityStreams(
          token.access_token,
          source.provider_id,
          ['latlng']
        );

        // Parse latlng from streams (data=lats, data2=lngs)
        let latlng = null;
        if (Array.isArray(streams)) {
          const latlngStream = streams.find(s => s.type === 'latlng');
          if (latlngStream?.data && latlngStream?.data2) {
            const lats = latlngStream.data;
            const lngs = latlngStream.data2;
            const len = Math.min(lats.length, lngs.length);
            latlng = [];
            for (let i = 0; i < len; i++) {
              if (lats[i] != null && lngs[i] != null) {
                latlng.push([lats[i], lngs[i]]);
              }
            }
          }
        }

        if (!latlng || latlng.length < 2) {
          console.log(`⏭️ [Backfill] ${source.provider_id}: no usable GPS data`);
          skipped++;
          continue;
        }

        // Downsample to ~500 points
        const step = Math.max(1, Math.floor(latlng.length / 500));
        const sampled = latlng.filter((_, i) => i % step === 0 || i === latlng.length - 1);

        // Patch latlngs into existing raw_json
        const raw = JSON.parse(source.raw_json);
        raw.latlngs = sampled;
        const updatedJson = JSON.stringify(raw);

        db.prepare(`UPDATE activity_sources SET raw_json = ?, updated_at = ? WHERE id = ?`)
          .run(updatedJson, new Date().toISOString(), source.id);

        console.log(`✅ [Backfill] ${source.provider_id}: ${sampled.length} GPS points stored`);
        patched++;
      } catch (err) {
        console.error(`❌ [Backfill] ${source.provider_id}: ${err.message}`);
        failed++;
      }
    }

    console.log(`📍 [Backfill] Complete: ${patched} patched, ${failed} failed, ${skipped} skipped, ${needsBackfill.length - batch.length} remaining`);

    res.json({
      success: true,
      total: needsBackfill.length,
      processed: batch.length,
      patched,
      failed,
      skipped,
      remaining: needsBackfill.length - batch.length
    });
  } catch (error) {
    console.error('❌ Backfill error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/intervals/activity/:activityId/streams
 * Fetch time-series streams for the Coaching View chart.
 * Returns { time[], watts[], heartrate[], cadence[], altitude[] } arrays
 * aligned by index. Downsampled to ~1500 points for smooth rendering.
 * Query: ?types=watts,heartrate,cadence,altitude (default: all coaching streams)
 */
router.get('/activity/:activityId/streams', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) return res.status(401).json({ error: 'Authorization required' });

    const session = sessionDb.findByToken(sessionToken);
    if (!session) return res.status(401).json({ error: 'Invalid session' });

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token?.access_token) return res.status(404).json({ error: 'Intervals.icu not connected' });

    const { activityId } = req.params;
    const requestedTypes = (req.query.types || 'time,watts,heartrate,cadence,altitude').split(',');

    console.log(`� [Streams] Fetching coaching streams for ${activityId}: ${requestedTypes.join(',')}`);

    const rawStreams = await intervalsService.getActivityStreams(
      token.access_token,
      activityId,
      requestedTypes
    );

    if (!rawStreams || !Array.isArray(rawStreams) || rawStreams.length === 0) {
      return res.json({ activityId, streams: {}, pointCount: 0 });
    }

    // Parse each stream from Intervals format: [{ type, data, data2?, ... }]
    const parsed = {};
    for (const stream of rawStreams) {
      if (!stream.type || !stream.data) continue;
      parsed[stream.type] = stream.data;
    }

    // Build aligned time-series: use 'time' stream as x-axis (seconds from start)
    const timeArr = parsed.time || [];
    const len = timeArr.length;

    if (len === 0) {
      return res.json({ activityId, streams: {}, pointCount: 0 });
    }

    // Downsample to ~1500 points for smooth chart rendering
    const maxPoints = 1500;
    const step = Math.max(1, Math.floor(len / maxPoints));

    const result = { time: [] };
    const streamKeys = ['watts', 'heartrate', 'cadence', 'altitude'];
    for (const key of streamKeys) {
      if (parsed[key]) result[key] = [];
    }

    for (let i = 0; i < len; i += step) {
      // Convert time to minutes for x-axis
      result.time.push(Math.round((timeArr[i] || 0) / 60 * 10) / 10);
      for (const key of streamKeys) {
        if (parsed[key]) {
          result[key].push(parsed[key][i] ?? null);
        }
      }
    }
    // Always include last point
    if ((len - 1) % step !== 0) {
      result.time.push(Math.round((timeArr[len - 1] || 0) / 60 * 10) / 10);
      for (const key of streamKeys) {
        if (parsed[key]) {
          result[key].push(parsed[key][len - 1] ?? null);
        }
      }
    }

    console.log(`✅ [Streams] ${activityId}: ${result.time.length} points, streams: ${Object.keys(result).join(',')}`);

    res.json({
      activityId,
      streams: result,
      pointCount: result.time.length,
      availableStreams: Object.keys(result).filter(k => k !== 'time')
    });
  } catch (error) {
    console.error('❌ Streams error:', error.message);
    if (error.response?.status === 404) {
      return res.json({ activityId: req.params.activityId, streams: {}, pointCount: 0 });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/intervals/enrich
 * Enrich lite activities with full details from /activity/{id} endpoint
 * 
 * Body params:
 *   - activityIds: string[] - Array of Intervals.icu activity IDs to enrich
 *   - limit: number (optional, default 50) - Max activities to enrich per request
 */
router.post('/enrich', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token || !token.access_token) {
      return res.status(404).json({ error: 'Intervals.icu not connected' });
    }

    const { activityIds = [], limit = 50 } = req.body;
    
    if (!Array.isArray(activityIds) || activityIds.length === 0) {
      return res.status(400).json({ error: 'activityIds array required' });
    }

    // Filter: only native Intervals.icu IDs (i-prefix) can be enriched.
    // Numeric-only IDs are Strava shell references — /activity/{id} always returns 404 for these.
    // See ACTIVITY_ARCHITECTURE.md "Planned Improvements" and docs/INTERVALS_FIELD_MAPPING.md.
    const nativeIds = activityIds.filter(id => String(id).startsWith('i'));
    const skippedShells = activityIds.length - nativeIds.length;

    // Cap at limit to prevent long-running requests
    const idsToEnrich = nativeIds.slice(0, limit);
    
    if (skippedShells > 0) {
      console.log(`⏭️ [Intervals] Skipped ${skippedShells} Strava shell activities (numeric IDs, not enrichable)`);
    }
    console.log(`🔄 [Intervals] Enriching ${idsToEnrich.length} native activities (of ${activityIds.length} requested, ${skippedShells} shells skipped, limit ${limit})`);

    const enriched = [];
    const imported = [];
    const failed = [];
    
    for (const activityId of idsToEnrich) {
      try {
        console.log(`📥 [Intervals] Enriching activity ${activityId}...`);
        
        const fullActivity = await intervalsService.getActivity(
          token.access_token,
          token.athlete_id,
          activityId
        );
        
        enriched.push(fullActivity);
        console.log(`✅ [Intervals] Enriched ${activityId}: duration=${fullActivity.duration || fullActivity.moving_time}s, distance=${fullActivity.distance}m, tss=${fullActivity.tss || fullActivity.icu_training_load}, has_raw=${!!fullActivity._raw}`);
        
        // Import server-side so _raw (zones, intervals, advanced metrics) is preserved
        try {
          const result = importActivity(session.user_id, fullActivity, 'intervals');
          imported.push({ id: activityId, ...result });
          console.log(`💾 [Intervals] Imported enriched ${activityId}: activity=${result.activityId}, method=${result.matchMethod}`);
        } catch (importErr) {
          console.error(`⚠️ [Intervals] Import failed for enriched ${activityId}:`, importErr.message);
        }
      } catch (error) {
        console.error(`❌ [Intervals] Failed to enrich ${activityId}:`, error.message);
        failed.push({ id: activityId, error: error.message });
      }
    }

    console.log(`✅ [Intervals] Enrichment complete: ${enriched.length} enriched, ${imported.length} imported, ${failed.length} failed`);

    // Recompute weekly rollups if any activities were imported
    let weeklyResult = null;
    if (imported.length > 0) {
      try {
        weeklyResult = await recomputeRecentWeeks(session.user_id, 4);
      } catch (weeklyErr) {
        console.error(`[Intervals] Weekly recompute failed (non-fatal):`, weeklyErr.message);
      }
    }

    res.json({
      success: true,
      enriched,
      imported,
      failed,
      weekly: weeklyResult,
      stats: {
        requested: activityIds.length,
        processed: idsToEnrich.length,
        enriched: enriched.length,
        imported: imported.length,
        failed: failed.length,
        remaining: activityIds.length - idsToEnrich.length
      }
    });
  } catch (error) {
    console.error('❌ Enrichment error:', error);
    res.status(500).json({ error: 'Failed to enrich activities', details: error.message });
  }
});

/**
 * POST /api/intervals/sync
 * Trigger manual sync
 */
router.post('/sync', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const token = intervalsTokenDb.findByUserId(session.user_id);
    if (!token) {
      return res.status(404).json({ error: 'Intervals.icu not connected' });
    }

    // Get sync state
    const syncState = intervalsSyncStateDb.findByUserId(session.user_id);
    
    // Determine date range
    let oldest, newest;
    const today = new Date().toISOString().split('T')[0];
    
    if (!syncState || !syncState.backfill_complete) {
      // Initial backfill - last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      oldest = sixMonthsAgo.toISOString().split('T')[0];
      newest = today;
    } else {
      // Incremental sync - from last sync to today
      oldest = syncState.last_synced_date || today;
      newest = today;
    }

    console.log(`🔄 Syncing Intervals.icu activities: ${oldest} to ${newest}`);

    const activities = await intervalsService.getActivities(
      token.access_token,
      oldest,
      newest
    );

    // Update sync state
    intervalsSyncStateDb.upsert({
      userId: session.user_id,
      lastSyncedDate: today,
      backfillComplete: true
    });

    console.log(`✅ Synced ${activities.length} activities`);

    res.json({
      success: true,
      activities,
      count: activities.length,
      dateRange: { oldest, newest }
    });
  } catch (error) {
    console.error('❌ Sync error:', error);
    res.status(500).json({ error: 'Failed to sync activities' });
  }
});

export default router;
