// API routes for manual activity management
import express from 'express';
import manualActivityService from '../services/manualActivityService.js';
import { invalidateCache } from '../services/activityCacheService.js';

const router = express.Router();

// Get sport type configurations
router.get('/sport-types', (req, res) => {
  res.json({
    sportTypes: Object.keys(manualActivityService.constructor.SPORT_TYPES),
    intensityLevels: Object.keys(manualActivityService.constructor.INTENSITY_LEVELS),
    configurations: manualActivityService.constructor.SPORT_TYPES,
    intensityDescriptions: manualActivityService.constructor.INTENSITY_LEVELS
  });
});

// Create a new manual activity
router.post('/', async (req, res) => {
  try {
    const { userId, ...activityData } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Validate required fields
    const required = ['activityDate', 'sportType', 'activityName', 'duration', 'intensityLevel'];
    const missing = required.filter(field => !activityData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        missing 
      });
    }
    
    // Validate sport type
    if (!manualActivityService.constructor.SPORT_TYPES[activityData.sportType]) {
      return res.status(400).json({ 
        error: 'Invalid sport type',
        validTypes: Object.keys(manualActivityService.constructor.SPORT_TYPES)
      });
    }
    
    // Validate intensity level
    if (!manualActivityService.constructor.INTENSITY_LEVELS[activityData.intensityLevel]) {
      return res.status(400).json({ 
        error: 'Invalid intensity level',
        validLevels: Object.keys(manualActivityService.constructor.INTENSITY_LEVELS)
      });
    }
    
    // Validate perceived exertion if provided
    if (activityData.perceivedExertion && 
        (activityData.perceivedExertion < 1 || activityData.perceivedExertion > 10)) {
      return res.status(400).json({ 
        error: 'Perceived exertion must be between 1 and 10' 
      });
    }
    
    const activity = await manualActivityService.createActivity(userId, activityData);
    
    // Invalidate activity cache so new activity shows immediately
    invalidateCache(userId);
    
    res.status(201).json({
      success: true,
      activity,
      message: 'Manual activity created successfully'
    });
  } catch (error) {
    console.error('Error creating manual activity:', error);
    res.status(500).json({ 
      error: 'Failed to create manual activity',
      details: error.message 
    });
  }
});

// Get all manual activities for the user
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    // If no userId provided, return empty array (user not logged in or no profile yet)
    if (!userId) {
      return res.json({
        success: true,
        count: 0,
        activities: []
      });
    }
    
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      sportType: req.query.sportType,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };
    
    const activities = await manualActivityService.getActivities(userId, options);
    
    res.json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    console.error('Error fetching manual activities:', error);
    res.status(500).json({ 
      error: 'Failed to fetch manual activities',
      details: error.message 
    });
  }
});

// Get a single manual activity
router.get('/:id', async (req, res) => {
  try {
    const userId = req.query.userId;
    const activityId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const activity = await manualActivityService.getActivity(userId, activityId);
    
    if (!activity) {
      return res.status(404).json({ 
        error: 'Manual activity not found' 
      });
    }
    
    res.json({
      success: true,
      activity
    });
  } catch (error) {
    console.error('Error fetching manual activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch manual activity',
      details: error.message 
    });
  }
});

// Update a manual activity
router.put('/:id', async (req, res) => {
  try {
    const { userId, ...updates } = req.body;
    const activityId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    // Validate sport type if provided
    if (updates.sportType && 
        !manualActivityService.constructor.SPORT_TYPES[updates.sportType]) {
      return res.status(400).json({ 
        error: 'Invalid sport type',
        validTypes: Object.keys(manualActivityService.constructor.SPORT_TYPES)
      });
    }
    
    // Validate intensity level if provided
    if (updates.intensityLevel && 
        !manualActivityService.constructor.INTENSITY_LEVELS[updates.intensityLevel]) {
      return res.status(400).json({ 
        error: 'Invalid intensity level',
        validLevels: Object.keys(manualActivityService.constructor.INTENSITY_LEVELS)
      });
    }
    
    // Validate perceived exertion if provided
    if (updates.perceivedExertion && 
        (updates.perceivedExertion < 1 || updates.perceivedExertion > 10)) {
      return res.status(400).json({ 
        error: 'Perceived exertion must be between 1 and 10' 
      });
    }
    
    const activity = await manualActivityService.updateActivity(userId, activityId, updates);
    
    if (!activity) {
      return res.status(404).json({ 
        error: 'Manual activity not found' 
      });
    }
    
    // Invalidate activity cache so updates show immediately
    invalidateCache(userId);
    
    res.json({
      success: true,
      activity,
      message: 'Manual activity updated successfully'
    });
  } catch (error) {
    console.error('Error updating manual activity:', error);
    res.status(500).json({ 
      error: 'Failed to update manual activity',
      details: error.message 
    });
  }
});

// Delete a manual activity
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.query.userId;
    const activityId = parseInt(req.params.id);
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const deleted = await manualActivityService.deleteActivity(userId, activityId);
    
    if (!deleted) {
      return res.status(404).json({ 
        error: 'Manual activity not found' 
      });
    }
    
    // Invalidate activity cache so deletion shows immediately
    invalidateCache(userId);
    
    res.json({
      success: true,
      message: 'Manual activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting manual activity:', error);
    res.status(500).json({ 
      error: 'Failed to delete manual activity',
      details: error.message 
    });
  }
});

// Get statistics for manual activities
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const startDate = req.query.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate || new Date().toISOString();
    
    const stats = await manualActivityService.getStatistics(userId, startDate, endDate);
    
    res.json({
      success: true,
      period: { startDate, endDate },
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching manual activity statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics',
      details: error.message 
    });
  }
});

export default router;
