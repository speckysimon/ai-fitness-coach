import express from 'express';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();

// Calculate current FTP/eFTP
router.post('/ftp', async (req, res) => {
  const { activities } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const ftp = analyticsService.calculateFTP(activities);
    res.json({ ftp });
  } catch (error) {
    console.error('Error calculating FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTP' });
  }
});

// Calculate training load metrics
router.post('/load', async (req, res) => {
  const { activities, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const loadMetrics = analyticsService.calculateTrainingLoad(activities, ftp);
    res.json(loadMetrics);
  } catch (error) {
    console.error('Error calculating training load:', error.message);
    res.status(500).json({ error: 'Failed to calculate training load' });
  }
});

// Get weekly summary
router.post('/weekly-summary', async (req, res) => {
  const { activities, weekStart } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const summary = analyticsService.getWeeklySummary(activities, weekStart);
    res.json(summary);
  } catch (error) {
    console.error('Error calculating weekly summary:', error.message);
    res.status(500).json({ error: 'Failed to calculate weekly summary' });
  }
});

// Get trend analysis
router.post('/trends', async (req, res) => {
  const { activities, weeks = 6, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = analyticsService.getTrends(activities, weeks, ftp);
    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error.message);
    res.status(500).json({ error: 'Failed to calculate trends' });
  }
});

export default router;
