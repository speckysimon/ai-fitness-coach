import express from 'express';
import { userDb, sessionDb, stravaTokenDb, googleTokenDb } from '../db.js';
import logger from '../utils/logger.js';
import avatarService from '../services/avatarService.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '..', 'uploads', 'temp'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
    }
  }
});

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
        avatar_url: user.avatar_url,
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

// Upload user avatar
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ error: 'No session token provided' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
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

    // Delete old avatar if exists
    if (user.avatar_url) {
      avatarService.deleteAvatar(user.avatar_url);
    }

    // Save new avatar
    const avatarUrl = await avatarService.saveAvatar(req.file, user.id);

    // Update user record
    userDb.updateAvatar(user.id, avatarUrl);

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    logger.error('Avatar upload error:', error);
    
    // Clean up temp file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
    
    res.status(500).json({ error: error.message || 'Failed to upload avatar' });
  }
});

// Delete user avatar
router.delete('/avatar', (req, res) => {
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

    // Delete old avatar if exists
    if (user.avatar_url) {
      avatarService.deleteAvatar(user.avatar_url);
    }

    // Update user record
    userDb.updateAvatar(user.id, null);

    res.json({
      success: true,
      message: 'Avatar deleted successfully'
    });
  } catch (error) {
    logger.error('Avatar deletion error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

export default router;
