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

// Adjust plan based on user request (adaptive adjustments)
router.post('/plan/adjust', async (req, res) => {
  const { plan, activities, completedSessions, adjustmentRequest, context, userDateTime } = req.body;
  
  if (!plan || !adjustmentRequest) {
    return res.status(400).json({ error: 'Plan and adjustment request required' });
  }

  try {
    const adjustment = await aiPlannerService.adjustPlanFromRequest({
      plan,
      activities,
      completedSessions,
      adjustmentRequest,
      context,
      userDateTime,
    });
    
    res.json(adjustment);
  } catch (error) {
    console.error('Error adjusting training plan:', error.message);
    res.status(500).json({ error: 'Failed to adjust training plan' });
  }
});

// Analyze workout vs planned session
router.post('/workout/analyze', async (req, res) => {
  const { plannedSession, actualActivity, athleteComment } = req.body;
  
  if (!plannedSession || !actualActivity) {
    return res.status(400).json({ error: 'Planned session and actual activity required' });
  }

  try {
    const analysis = await aiPlannerService.analyzeWorkout({
      plannedSession,
      actualActivity,
      athleteComment,
    });
    
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing workout:', error.message);
    res.status(500).json({ error: 'Failed to analyze workout' });
  }
});

export default router;
