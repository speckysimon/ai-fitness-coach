import express from 'express';
import { raceTagDb, sessionDb } from '../db.js';

const router = express.Router();

// Middleware to verify session
const verifySession = (req, res, next) => {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }

  const session = sessionDb.findByToken(sessionToken);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session token' });
  }

  req.userId = session.user_id;
  next();
};

// Get all race tags for the current user
router.get('/', verifySession, (req, res) => {
  try {
    const raceTags = raceTagDb.getAllForUser(req.userId);
    res.json({ success: true, raceTags });
  } catch (error) {
    console.error('Error fetching race tags:', error);
    res.status(500).json({ error: 'Failed to fetch race tags' });
  }
});

// Set race tag for an activity
router.post('/', verifySession, (req, res) => {
  try {
    const { activityId, isRace, raceType, activitySource = 'strava' } = req.body;

    if (!activityId) {
      return res.status(400).json({ error: 'Activity ID required' });
    }

    // Validate activity source
    const validSources = ['strava', 'intervals', 'manual'];
    const source = validSources.includes(activitySource) ? activitySource : 'strava';

    raceTagDb.setRaceTag(req.userId, activityId, isRace, raceType, source);
    
    res.json({ success: true, message: 'Race tag updated', source });
  } catch (error) {
    console.error('Error setting race tag:', error);
    res.status(500).json({ error: 'Failed to set race tag' });
  }
});

// Bulk update race tags
router.post('/bulk', verifySession, (req, res) => {
  try {
    const { raceTags } = req.body;

    if (!raceTags || typeof raceTags !== 'object') {
      return res.status(400).json({ error: 'Race tags object required' });
    }

    // Update each race tag
    // Expected format: { "activityId": { isRace: true, source: "strava", raceType: "..." }, ... }
    Object.entries(raceTags).forEach(([activityId, tagData]) => {
      const isRace = typeof tagData === 'boolean' ? tagData : tagData.isRace;
      const source = tagData.source || 'strava';
      const raceType = tagData.raceType || null;
      
      raceTagDb.setRaceTag(req.userId, activityId, isRace, raceType, source);
    });

    res.json({ success: true, message: 'Race tags updated' });
  } catch (error) {
    console.error('Error bulk updating race tags:', error);
    res.status(500).json({ error: 'Failed to update race tags' });
  }
});

export default router;
