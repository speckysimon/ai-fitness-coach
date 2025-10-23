import express from 'express';
import { google } from 'googleapis';
import { googleCalendarService } from '../services/googleCalendarService.js';
import { sessionDb, googleTokenDb } from '../db.js';
import crypto from 'crypto';

const router = express.Router();

// Store pending OAuth states (state -> session_token)
const pendingOAuthStates = new Map();

// Google OAuth flow
router.get('/auth', (req, res) => {
  const sessionToken = req.query.session_token;
  const page = req.query.state || 'settings'; // 'setup' or 'settings'
  
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
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
    state: state,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  console.log('🟢 Google callback hit with code:', code ? 'YES' : 'NO');
  console.log('🟢 State:', state);
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  try {
    // Verify state and get session info
    const oauthData = pendingOAuthStates.get(state);
    if (!oauthData) {
      console.error('❌ Invalid or expired OAuth state');
      return res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('Invalid or expired authentication request')}`);
    }
    
    // Clean up the state
    pendingOAuthStates.delete(state);
    
    // Verify session is still valid
    const session = sessionDb.findByToken(oauthData.sessionToken);
    if (!session) {
      console.error('❌ Session expired');
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Session expired, please login again')}`);
    }
    
    console.log('🟢 Exchanging code for tokens...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    console.log('🟢 Tokens received from Google');
    
    // Save tokens to database
    googleTokenDb.upsert(session.user_id, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date,
    });
    
    console.log('✅ Google tokens saved to database for user:', session.user_id);
    
    // Redirect back to frontend
    const redirectPath = oauthData.page === 'settings' ? 'settings' : 'settings';
    const redirectUrl = `${frontendUrl}/${redirectPath}?google_success=true`;
    console.log('🟢 Redirecting to:', redirectUrl);
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Google OAuth error:', error.response?.data || error.message);
    res.redirect(`${frontendUrl}/settings?error=${encodeURIComponent('Failed to authenticate with Google Calendar')}`);
  }
});

// Create calendar event
router.post('/calendar/events', async (req, res) => {
  const { tokens, event } = req.body;
  
  if (!tokens) {
    return res.status(401).json({ error: 'Tokens required' });
  }

  try {
    const createdEvent = await googleCalendarService.createEvent(tokens, event);
    res.json(createdEvent);
  } catch (error) {
    console.error('Error creating calendar event:', error.message);
    res.status(500).json({ error: 'Failed to create calendar event' });
  }
});

// Batch create calendar events
router.post('/calendar/events/batch', async (req, res) => {
  const { tokens, events } = req.body;
  
  if (!tokens) {
    return res.status(401).json({ error: 'Tokens required' });
  }

  try {
    const createdEvents = await googleCalendarService.batchCreateEvents(tokens, events);
    res.json(createdEvents);
  } catch (error) {
    console.error('Error creating calendar events:', error.message);
    res.status(500).json({ error: 'Failed to create calendar events' });
  }
});

// Get calendar events
router.get('/calendar/events', async (req, res) => {
  const { tokens, timeMin, timeMax } = req.query;
  
  if (!tokens) {
    return res.status(401).json({ error: 'Tokens required' });
  }

  try {
    const parsedTokens = JSON.parse(tokens);
    const events = await googleCalendarService.getEvents(parsedTokens, timeMin, timeMax);
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;
