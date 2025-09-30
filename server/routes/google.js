import express from 'express';
import { google } from 'googleapis';
import { googleCalendarService } from '../services/googleCalendarService.js';

const router = express.Router();

// Google OAuth flow
router.get('/auth', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });

  res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Encode the tokens to pass to frontend
    const data = encodeURIComponent(JSON.stringify({
      success: true,
      tokens,
    }));
    
    // Redirect back to frontend with data
    res.redirect(`http://localhost:3000/setup?google_data=${data}`);
  } catch (error) {
    console.error('Google OAuth error:', error.message);
    res.redirect(`http://localhost:3000/setup?error=${encodeURIComponent('Failed to authenticate with Google')}`);
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
