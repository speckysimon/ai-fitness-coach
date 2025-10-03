import express from 'express';
import axios from 'axios';
import { stravaService } from '../services/stravaService.js';
import { sessionDb, stravaTokenDb } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Store pending OAuth states (session_token -> state)
const pendingOAuthStates = new Map();

// Strava OAuth flow
router.get('/auth', (req, res) => {
  const sessionToken = req.query.session_token;
  const page = req.query.state || 'setup'; // 'setup' or 'settings'
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }
  
  // Verify session exists
  const session = sessionDb.findByToken(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session token' });
  }
  
  // Generate a unique state for this OAuth flow
  const state = crypto.randomBytes(16).toString('hex');
  pendingOAuthStates.set(state, { sessionToken, page });
  
  // Clean up old states after 10 minutes
  setTimeout(() => pendingOAuthStates.delete(state), 10 * 60 * 1000);
  
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=activity:read_all&state=${state}`;
  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  console.log('🔵 Strava callback hit with code:', code ? 'YES' : 'NO');
  console.log('🔵 State:', state);
  
  try {
    // Verify state and get session info
    const oauthData = pendingOAuthStates.get(state);
    if (!oauthData) {
      console.error('❌ Invalid or expired OAuth state');
      return res.redirect(`http://localhost:3000/setup?error=${encodeURIComponent('Invalid or expired authentication request')}`);
    }
    
    // Clean up the state
    pendingOAuthStates.delete(state);
    
    // Verify session is still valid
    const session = sessionDb.findByToken(oauthData.sessionToken);
    if (!session) {
      console.error('❌ Session expired');
      return res.redirect(`http://localhost:3000/login?error=${encodeURIComponent('Session expired, please login again')}`);
    }
    
    console.log('🔵 Exchanging code for tokens...');
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;
    console.log('🔵 Tokens received from Strava');
    console.log('🔵 Athlete:', athlete?.firstname, athlete?.lastname);
    
    // Save tokens to database
    stravaTokenDb.upsert(session.user_id, {
      access_token,
      refresh_token,
      expires_at,
      athlete,
    });
    
    console.log('✅ Strava tokens saved to database for user:', session.user_id);
    
    // Redirect back to frontend
    const redirectPath = oauthData.page === 'settings' ? 'settings' : 'setup';
    const redirectUrl = `http://localhost:3000/${redirectPath}?strava_success=true`;
    console.log('🔵 Redirecting to:', redirectUrl);
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Strava OAuth error:', error.response?.data || error.message);
    res.redirect(`http://localhost:3000/setup?error=${encodeURIComponent('Failed to authenticate with Strava')}`);
  }
});

// Get athlete activities
router.get('/activities', async (req, res) => {
  const { access_token, before, after, page = 1, per_page = 30, user_id } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const activities = await stravaService.getActivities(access_token, {
      before,
      after,
      page,
      per_page,
    }, user_id);
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error.response?.data || error.message);
    
    // Check if it's a rate limit error
    if (error.message && error.message.includes('rate limit')) {
      return res.status(429).json({ 
        error: error.message,
        rateLimitExceeded: true 
      });
    }
    
    // Check if it's an authentication error
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid or expired access token',
        requiresReauth: true 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch activities',
      details: error.response?.data?.message || error.message 
    });
  }
});

// Get detailed activity
router.get('/activities/:id', async (req, res) => {
  const { id } = req.params;
  const { access_token } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const activity = await stravaService.getActivity(access_token, id);
    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get athlete stats
router.get('/athlete/stats', async (req, res) => {
  const { access_token, athlete_id } = req.query;
  
  if (!access_token || !athlete_id) {
    return res.status(401).json({ error: 'Access token and athlete ID required' });
  }

  try {
    const stats = await stravaService.getAthleteStats(access_token, athlete_id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching athlete stats:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch athlete stats' });
  }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const tokens = await stravaService.refreshToken(refresh_token);
    res.json({ success: true, tokens });
  } catch (error) {
    console.error('Error refreshing token:', error.response?.data || error.message);
    
    // Check if it's an authorization error (invalid refresh token)
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(401).json({ 
        error: 'Invalid refresh token. Please log in again.',
        requiresReauth: true 
      });
    }
    
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;
