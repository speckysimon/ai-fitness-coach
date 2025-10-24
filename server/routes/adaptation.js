import express from 'express';
import { sessionDb, adaptationEventDb, planAdjustmentDb, wellnessLogDb, workoutComparisonDb } from '../db.js';
import adaptiveTrainingService from '../services/adaptiveTrainingService.js';
import planModificationService from '../services/planModificationService.js';
import logger from '../utils/logger.js';

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

// Log illness/injury
router.post('/illness', verifySession, async (req, res) => {
  try {
    const { type, category, severity, startDate, endDate, notes } = req.body;

    if (!type || !startDate) {
      return res.status(400).json({ error: 'Type and start date are required' });
    }

    const eventId = adaptationEventDb.create(req.userId, {
      type,
      category,
      severity,
      startDate,
      endDate,
      notes
    });

    // If illness has ended, trigger AI analysis
    if (endDate) {
      // This will be called by frontend after logging
      // We'll return a flag to indicate analysis should be triggered
    }

    res.json({ 
      success: true, 
      eventId,
      message: 'Illness/injury logged successfully',
      shouldAnalyze: !!endDate
    });
  } catch (error) {
    logger.error('Error logging illness:', error);
    res.status(500).json({ error: 'Failed to log illness/injury' });
  }
});

// Log wellness check-in
router.post('/wellness', verifySession, (req, res) => {
  try {
    const { date, feeling, sleepQuality, stressLevel, soreness, motivation, notes } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    wellnessLogDb.upsert(req.userId, {
      date,
      feeling,
      sleepQuality,
      stressLevel,
      soreness,
      motivation,
      notes
    });

    res.json({ 
      success: true,
      message: 'Wellness logged successfully' 
    });
  } catch (error) {
    logger.error('Error logging wellness:', error);
    res.status(500).json({ error: 'Failed to log wellness' });
  }
});

// Get adaptation history
router.get('/history', verifySession, (req, res) => {
  try {
    const events = adaptationEventDb.getAllForUser(req.userId);
    const adjustments = planAdjustmentDb.getAllForUser(req.userId);
    const wellness = wellnessLogDb.getForUser(req.userId, 30);

    res.json({ 
      success: true,
      events,
      adjustments,
      wellness
    });
  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch adaptation history' });
  }
});

// Get pending adjustments
router.get('/adjustments/pending', verifySession, (req, res) => {
  try {
    const pending = planAdjustmentDb.getPendingForUser(req.userId);

    res.json({ 
      success: true,
      adjustments: pending
    });
  } catch (error) {
    logger.error('Error fetching pending adjustments:', error);
    res.status(500).json({ error: 'Failed to fetch pending adjustments' });
  }
});

// Accept adjustment
router.post('/adjustments/:id/accept', verifySession, (req, res) => {
  try {
    const adjustmentId = parseInt(req.params.id);
    
    planAdjustmentDb.accept(adjustmentId);

    res.json({ 
      success: true,
      message: 'Adjustment accepted' 
    });
  } catch (error) {
    logger.error('Error accepting adjustment:', error);
    res.status(500).json({ error: 'Failed to accept adjustment' });
  }
});

// Reject adjustment
router.post('/adjustments/:id/reject', verifySession, (req, res) => {
  try {
    const adjustmentId = parseInt(req.params.id);
    
    planAdjustmentDb.reject(adjustmentId);

    res.json({ 
      success: true,
      message: 'Adjustment rejected' 
    });
  } catch (error) {
    logger.error('Error rejecting adjustment:', error);
    res.status(500).json({ error: 'Failed to reject adjustment' });
  }
});

// Update illness/injury (mark as ended)
router.put('/illness/:id', verifySession, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { endDate, notes } = req.body;

    const result = adaptationEventDb.update(eventId, { endDate, notes });

    res.json({ 
      success: true,
      message: 'Event updated successfully',
      changes: result.changes
    });
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event', details: error.message });
  }
});

// Delete illness/injury
router.delete('/illness/:id', verifySession, (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    adaptationEventDb.delete(eventId);

    res.json({ 
      success: true,
      message: 'Event deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Get active illnesses/injuries
router.get('/active', verifySession, (req, res) => {
  try {
    const activeEvents = adaptationEventDb.getActiveForUser(req.userId);

    res.json({ 
      success: true,
      events: activeEvents
    });
  } catch (error) {
    logger.error('Error fetching active events:', error);
    res.status(500).json({ error: 'Failed to fetch active events' });
  }
});

// Get wellness for date range
router.get('/wellness', verifySession, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const wellness = wellnessLogDb.getForUser(req.userId, days);

    res.json({ 
      success: true,
      wellness
    });
  } catch (error) {
    logger.error('Error fetching wellness:', error);
    res.status(500).json({ error: 'Failed to fetch wellness data' });
  }
});

// Trigger AI analysis
router.post('/analyze', verifySession, async (req, res) => {
  try {
    const { recentActivities, currentPlan, currentFitness, upcomingRaces } = req.body;

    const result = await adaptiveTrainingService.analyzeAndAdapt(req.userId, {
      recentActivities,
      currentPlan,
      currentFitness,
      upcomingRaces
    });

    res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    logger.error('Error analyzing training:', error);
    res.status(500).json({ error: 'Failed to analyze training' });
  }
});

// Apply adjustment to training plan
router.post('/apply-adjustment', verifySession, async (req, res) => {
  try {
    const { adjustmentId, trainingPlan } = req.body;

    if (!adjustmentId || !trainingPlan) {
      return res.status(400).json({ error: 'Adjustment ID and training plan required' });
    }

    // Get adjustment details
    const adjustments = planAdjustmentDb.getAllForUser(req.userId);
    const adjustment = adjustments.find(a => a.id === adjustmentId);

    if (!adjustment) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    // Get associated event if exists
    let event = null;
    if (adjustment.adaptation_event_id) {
      const events = adaptationEventDb.getAllForUser(req.userId);
      event = events.find(e => e.id === adjustment.adaptation_event_id);
    }

    // Apply adjustment to plan
    const modifiedPlan = await planModificationService.applyAdjustment(
      trainingPlan,
      adjustment,
      event
    );

    // Get summary of changes
    const summary = planModificationService.getPlanSummary(trainingPlan, modifiedPlan);

    res.json({ 
      success: true,
      modifiedPlan,
      summary
    });
  } catch (error) {
    logger.error('Error applying adjustment:', error);
    res.status(500).json({ error: 'Failed to apply adjustment' });
  }
});

export default router;
