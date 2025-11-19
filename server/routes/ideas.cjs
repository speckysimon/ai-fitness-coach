const express = require('express');
const router = express.Router();
const ideasService = require('../services/ideasService.cjs');

/**
 * Ideas Routes
 * All routes require admin authentication (handled at router level in server/index.js)
 */

// Get all ideas with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (category) filters.category = category;

    const ideas = await ideasService.getAllIdeas(filters);
    res.json({ success: true, ideas });
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await ideasService.getStatistics();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching idea statistics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single idea by ID
router.get('/:id', async (req, res) => {
  try {
    const idea = await ideasService.getIdeaById(req.params.id);
    if (!idea) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    res.json({ success: true, idea });
  } catch (error) {
    console.error('Error fetching idea:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new idea
router.post('/', async (req, res) => {
  try {
    const ideaData = {
      ...req.body,
      created_by: req.body.created_by || 'admin'
    };
    
    const result = await ideasService.createIdea(ideaData);
    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating idea:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update idea
router.put('/:id', async (req, res) => {
  try {
    // If status is being changed to 'completed', set completed_at
    if (req.body.status === 'completed' && !req.body.completed_at) {
      req.body.completed_at = new Date().toISOString();
    }
    
    const result = await ideasService.updateIdea(req.params.id, req.body);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating idea:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete idea
router.delete('/:id', async (req, res) => {
  try {
    const result = await ideasService.deleteIdea(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Idea not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting idea:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Bulk update priorities
router.post('/bulk/priorities', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'Updates must be an array' });
    }
    
    const result = await ideasService.updatePriorities(updates);
    res.json({ success: true, updated: result.updated });
  } catch (error) {
    console.error('Error updating priorities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
