import express from 'express';
import { aiPlannerService } from '../services/aiPlannerService.js';
import { analyticsService } from '../services/analyticsService.js';
import { getDb } from '../db.js';

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

// ========================================
// DATABASE CRUD ENDPOINTS
// ========================================

// Save training plan to database
router.post('/plan', async (req, res) => {
  const { userId, planData, eventType, durationWeeks, daysPerWeek, maxHoursPerWeek, goals, generatedAt } = req.body;
  
  if (!userId || !planData) {
    return res.status(400).json({ error: 'User ID and plan data required' });
  }

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO training_plans (
        user_id, plan_data, event_type, duration_weeks, days_per_week,
        max_hours_per_week, goals, generated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      userId,
      JSON.stringify(planData),
      eventType,
      durationWeeks,
      daysPerWeek,
      maxHoursPerWeek,
      goals,
      generatedAt
    );
    
    res.json({ 
      success: true, 
      planId: result.lastInsertRowid,
      message: 'Training plan saved successfully' 
    });
  } catch (error) {
    console.error('Error saving training plan:', error.message);
    res.status(500).json({ error: 'Failed to save training plan' });
  }
});

// Get current training plan for user
router.get('/plan/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const db = getDb();
    const plan = db.prepare(`
      SELECT * FROM training_plans 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(userId);
    
    if (!plan) {
      return res.json({ plan: null });
    }
    
    // Parse JSON data
    plan.plan_data = JSON.parse(plan.plan_data);
    
    res.json({ plan });
  } catch (error) {
    console.error('Error loading training plan:', error.message);
    res.status(500).json({ error: 'Failed to load training plan' });
  }
});

// Update training plan (for completions, adjustments)
router.put('/plan/:planId', async (req, res) => {
  const { planId } = req.params;
  const { planData } = req.body;
  
  if (!planData) {
    return res.status(400).json({ error: 'Plan data required' });
  }

  try {
    const db = getDb();
    db.prepare(`
      UPDATE training_plans 
      SET plan_data = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(planData), planId);
    
    res.json({ success: true, message: 'Training plan updated successfully' });
  } catch (error) {
    console.error('Error updating training plan:', error.message);
    res.status(500).json({ error: 'Failed to update training plan' });
  }
});

// Delete training plan
router.delete('/plan/:planId', async (req, res) => {
  const { planId } = req.params;
  
  try {
    const db = getDb();
    db.prepare('DELETE FROM training_plans WHERE id = ?').run(planId);
    
    res.json({ success: true, message: 'Training plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting training plan:', error.message);
    res.status(500).json({ error: 'Failed to delete training plan' });
  }
});

export default router;
