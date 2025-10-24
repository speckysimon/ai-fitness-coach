import express from 'express';
import { userDb, sessionDb, stravaTokenDb, googleTokenDb } from '../db.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Register new user
router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  try {
    // Check if user already exists
    const existingUser = userDb.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user
    const userId = userDb.create(email, password, name);
    const user = userDb.findById(userId);

    // Create session
    const sessionToken = sessionDb.create(userId);

    res.json({
      success: true,
      sessionToken,
      user: {
        email: user.email,
        name: user.name,
        profile: {
          age: user.age,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
        },
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = userDb.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create session
    const sessionToken = sessionDb.create(user.id);

    // Get OAuth tokens
    const stravaTokens = stravaTokenDb.findByUserId(user.id);
    const googleTokens = googleTokenDb.findByUserId(user.id);

    res.json({
      success: true,
      sessionToken,
      user: {
        email: user.email,
        name: user.name,
        profile: {
          age: user.age,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
        },
        stravaTokens: stravaTokens ? {
          access_token: stravaTokens.access_token,
          refresh_token: stravaTokens.refresh_token,
          expires_at: stravaTokens.expires_at,
        } : null,
        googleTokens: googleTokens ? {
          access_token: googleTokens.access_token,
          refresh_token: googleTokens.refresh_token,
          expires_at: googleTokens.expires_at,
        } : null,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout user
router.post('/logout', (req, res) => {
  const { sessionToken } = req.body;

  if (sessionToken) {
    sessionDb.delete(sessionToken);
  }

  res.json({ success: true });
});

// Get current user
router.get('/me', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const user = userDb.findById(session.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get OAuth tokens
    const stravaTokens = stravaTokenDb.findByUserId(user.id);
    const googleTokens = googleTokenDb.findByUserId(user.id);

    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        profile: {
          age: user.age,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
        },
        stravaTokens: stravaTokens ? {
          access_token: stravaTokens.access_token,
          refresh_token: stravaTokens.refresh_token,
          expires_at: stravaTokens.expires_at,
        } : null,
        googleTokens: googleTokens ? {
          access_token: googleTokens.access_token,
          refresh_token: googleTokens.refresh_token,
          expires_at: googleTokens.expires_at,
        } : null,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const { age, height, weight, gender, name } = req.body;

    // Update profile
    userDb.updateProfile(session.user_id, { age, height, weight, gender, name });

    const user = userDb.findById(session.user_id);

    res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name,
        profile: {
          age: user.age,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
        },
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Save Strava tokens to user account
router.post('/strava-tokens', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const { tokens } = req.body;

    stravaTokenDb.upsert(session.user_id, tokens);

    res.json({ success: true });
  } catch (error) {
    logger.error('Save Strava tokens error:', error);
    res.status(500).json({ error: 'Failed to save Strava tokens' });
  }
});

// Save Google tokens to user account
router.post('/google-tokens', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    const { tokens } = req.body;

    googleTokenDb.upsert(session.user_id, tokens);

    res.json({ success: true });
  } catch (error) {
    logger.error('Save Google tokens error:', error);
    res.status(500).json({ error: 'Failed to save Google tokens' });
  }
});

// Disconnect Strava
router.delete('/strava-tokens', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    stravaTokenDb.delete(session.user_id);

    res.json({ success: true });
  } catch (error) {
    logger.error('Disconnect Strava error:', error);
    res.status(500).json({ error: 'Failed to disconnect Strava' });
  }
});

// Disconnect Google Calendar
router.delete('/google-tokens', (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session token' });
    }

    googleTokenDb.delete(session.user_id);

    res.json({ success: true });
  } catch (error) {
    logger.error('Disconnect Google error:', error);
    res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
  }
});

export default router;
