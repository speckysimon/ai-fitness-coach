import express from 'express';
import db from '../db.js';

const router = express.Router();

/**
 * POST /api/feedback
 * Submit user feedback
 */
router.post('/', async (req, res) => {
  try {
    const { rating, category, message, email, userEmail, timestamp, userAgent, url } = req.body;

    // Validate required fields
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Insert feedback into database
    const result = await db.run(
      `INSERT INTO feedback (
        rating, 
        category, 
        message, 
        email, 
        user_email, 
        timestamp, 
        user_agent, 
        url,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rating || null,
        category || 'general',
        message,
        email || 'anonymous',
        userEmail || null,
        timestamp || new Date().toISOString(),
        userAgent || null,
        url || null,
        'new'
      ]
    );

    // TODO: Send notification email to admin
    // TODO: Post to Slack channel for real-time alerts

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      id: result.lastID
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/feedback
 * Get all feedback (admin only - TODO: add auth)
 */
router.get('/', async (req, res) => {
  try {
    const { status, category, limit = 100 } = req.query;

    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    const feedback = await db.all(query, params);

    res.json({
      success: true,
      feedback,
      count: feedback.length
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

/**
 * PATCH /api/feedback/:id
 * Update feedback status (admin only - TODO: add auth)
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    await db.run(
      'UPDATE feedback SET status = ?, admin_notes = ?, updated_at = ? WHERE id = ?',
      [status, notes, new Date().toISOString(), id]
    );

    res.json({
      success: true,
      message: 'Feedback updated successfully'
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

export default router;
