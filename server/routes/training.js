import express from 'express';
import { aiPlannerService } from '../services/aiPlannerService.js';
import { analyticsService } from '../services/analyticsService.js';

const router = express.Router();

// Generate training plan
router.post('/plan/generate', async (req, res) => {
  const { activities, goals, constraints, currentMetrics, userProfile } = req.body;
  
  if (!activities || !goals) {
    return res.status(400).json({ error: 'Activities and goals required' });
  }

  try {
    const plan = await aiPlannerService.generateTrainingPlan({
      activities,
      goals,
      constraints,
      currentMetrics,
      userProfile,
    });
    
    res.json(plan);
  } catch (error) {
    console.error('Error generating training plan:', error.message);
    res.status(500).json({ error: 'Failed to generate training plan' });
  }
});

// Adapt existing plan based on completed activities
router.post('/plan/adapt', async (req, res) => {
  const { currentPlan, completedActivities, upcomingActivities } = req.body;
  
  if (!currentPlan || !completedActivities) {
    return res.status(400).json({ error: 'Current plan and completed activities required' });
  }

  try {
    const adaptedPlan = await aiPlannerService.adaptPlan({
      currentPlan,
      completedActivities,
      upcomingActivities,
    });
    
    res.json(adaptedPlan);
  } catch (error) {
    console.error('Error adapting training plan:', error.message);
    res.status(500).json({ error: 'Failed to adapt training plan' });
  }
});

// Get session recommendations
router.post('/session/recommend', async (req, res) => {
  const { recentActivities, targetType, constraints } = req.body;
  
  try {
    const recommendation = await aiPlannerService.recommendSession({
      recentActivities,
      targetType,
      constraints,
    });
    
    res.json(recommendation);
  } catch (error) {
    console.error('Error recommending session:', error.message);
    res.status(500).json({ error: 'Failed to recommend session' });
  }
});

export default router;
