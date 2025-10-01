import express from 'express';
import axios from 'axios';
import { stravaService } from '../services/stravaService.js';

const router = express.Router();

// Strava OAuth flow
router.get('/auth', (req, res) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${process.env.STRAVA_REDIRECT_URI}&approval_prompt=force&scope=activity:read_all`;
  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const response = await axios.post('https://www.strava.com/oauth/token', {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token, expires_at, athlete } = response.data;
    
    // Encode the tokens and athlete data to pass to frontend
    const data = encodeURIComponent(JSON.stringify({
      success: true,
      tokens: { access_token, refresh_token, expires_at },
      athlete,
    }));
    
    // Redirect back to frontend with data
    res.redirect(`http://localhost:3000/setup?strava_data=${data}`);
  } catch (error) {
    console.error('Strava OAuth error:', error.response?.data || error.message);
    res.redirect(`http://localhost:3000/setup?error=${encodeURIComponent('Failed to authenticate with Strava')}`);
  }
});

// Get athlete activities
router.get('/activities', async (req, res) => {
  const { access_token, before, after, page = 1, per_page = 30 } = req.query;
  
  if (!access_token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const activities = await stravaService.getActivities(access_token, {
      before,
      after,
      page,
      per_page,
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch activities' });
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
