import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { intervalsTokenDb, intervalsSyncStateDb, sessionDb } from '../db.js';
import intervalsService from '../services/intervalsService.js';
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
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('❌ Intervals OAuth error:', error);
      return res.redirect(`/settings?error=intervals_${error}`);
    }

    if (!code || !state) {
      return res.redirect('/settings?error=intervals_missing_params');
    }

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData) {
      console.error('❌ Invalid OAuth state');
      return res.redirect('/settings?error=intervals_invalid_state');
    }
    oauthStates.delete(state);

    // Get OAuth config
    const config = await apiKeyLoader.getOAuthConfig('intervals');
    if (!config) {
      return res.redirect('/settings?error=intervals_not_configured');
    }

    console.log('🔄 Exchanging code for token...');

    // Exchange code for token
    const tokenResponse = await axios.post(
      'https://intervals.icu/api/oauth/token',
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri
      },
      {
        headers: { 'Content-Type': 'application/json' }
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

    res.redirect('/settings?success=intervals_connected');
  } catch (error) {
    console.error('❌ Intervals callback error:', error.response?.data || error.message);
    res.redirect('/settings?error=intervals_connection_failed');
  }
});

/**
 * GET /api/intervals/activities
 * Fetch user's activities
 */
router.get('/activities', async (req, res) => {
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

    const { oldest, newest } = req.query;
    
    if (!oldest || !newest) {
      return res.status(400).json({ error: 'oldest and newest date parameters required (YYYY-MM-DD)' });
    }

    const activities = await intervalsService.getActivities(
      token.access_token,
      oldest,
      newest
    );

    res.json({ activities, count: activities.length });
  } catch (error) {
    console.error('❌ Fetch activities error:', error);
    
    if (error.message?.includes('authentication failed')) {
      return res.status(401).json({ error: 'Please reconnect Intervals.icu', requiresReauth: true });
    }
    
    res.status(500).json({ error: 'Failed to fetch activities' });
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
