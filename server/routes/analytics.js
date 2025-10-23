import express from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { fthrService } from '../services/fthrService.js';
import { smartMetricsService } from '../services/smartMetricsService.js';

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

// Calculate FTHR (Functional Threshold Heart Rate)
router.post('/fthr', async (req, res) => {
  const { activities, manualFTHR, zoneModel = '5-zone', maxHR = null } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const fthrData = fthrService.calculateFTHR(activities, manualFTHR);
    
    // If FTHR was calculated, add zones based on selected model
    if (fthrData.fthr) {
      fthrData.zones = fthrService.calculateHRZonesByModel(
        fthrData.fthr,
        zoneModel,
        maxHR
      );
      fthrData.zoneModel = zoneModel; // Return which model was used
    }
    
    res.json(fthrData);
  } catch (error) {
    console.error('Error calculating FTHR:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTHR' });
  }
});

// Get HR trends analysis
router.post('/hr-trends', async (req, res) => {
  const { activities, fthr } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = fthrService.analyzeHRTrends(activities, fthr);
    res.json(trends);
  } catch (error) {
    console.error('Error analyzing HR trends:', error.message);
    res.status(500).json({ error: 'Failed to analyze HR trends' });
  }
});

// Calculate Smart FTP (training-load aware)
router.post('/smart-ftp', async (req, res) => {
  const { activities, lastKnownFTP } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const result = smartMetricsService.calculateSmartFTP(activities, lastKnownFTP);
    res.json(result);
  } catch (error) {
    console.error('Error calculating smart FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate smart FTP' });
  }
});

export default router;
