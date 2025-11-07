/**
 * Plan Template Routes
 * API endpoints for managing training plan templates
 */

const express = require('express');
const planTemplateService = require('../services/planTemplateService.cjs');
const adminService = require('../services/adminService.cjs');

const router = express.Router();

// Middleware to verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = adminService.verifyToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Public routes (for users to browse templates)
router.get('/templates', async (req, res) => {
  try {
    const templates = await planTemplateService.listTemplates(true); // Only active
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await planTemplateService.getTemplate(req.params.id);
    res.json({ success: true, template });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(404).json({ success: false, error: error.message });
  }
});

router.get('/templates/filter', async (req, res) => {
  try {
    const filters = {
      duration_weeks: req.query.duration_weeks ? parseInt(req.query.duration_weeks) : null,
      event_type: req.query.event_type || null,
      difficulty_level: req.query.difficulty_level || null,
      days_per_week: req.query.days_per_week ? parseInt(req.query.days_per_week) : null,
    };
    
    const templates = await planTemplateService.filterTemplates(filters);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Error filtering templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes (protected)
router.get('/admin/templates', verifyAdminToken, async (req, res) => {
  try {
    const templates = await planTemplateService.listTemplates(false); // All templates
    const stats = await planTemplateService.getStats();
    res.json({ success: true, templates, stats });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/templates', verifyAdminToken, async (req, res) => {
  try {
    const result = await planTemplateService.createTemplate(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/templates/:id', verifyAdminToken, async (req, res) => {
  try {
    const result = await planTemplateService.updateTemplate(req.params.id, req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/templates/:id', verifyAdminToken, async (req, res) => {
  try {
    const result = await planTemplateService.deleteTemplate(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/templates/:id/toggle', verifyAdminToken, async (req, res) => {
  try {
    const result = await planTemplateService.toggleActive(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error toggling template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
