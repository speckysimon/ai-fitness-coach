/**
 * Coach Personas Routes
 * Public and admin endpoints for managing AI coach personas
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const coachPersonaService = require('../services/coachPersonaService.cjs');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/personas');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: personaId-timestamp.ext
    const personaId = req.body.id || req.params.id || 'persona';
    const ext = path.extname(file.originalname);
    const filename = `${personaId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// ============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================================

/**
 * GET /api/personas
 * Get all active personas for users
 */
router.get('/', async (req, res) => {
  try {
    const personas = await coachPersonaService.getAll(true); // Active only
    res.json({ success: true, personas });
  } catch (error) {
    console.error('Error fetching personas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/personas/:id
 * Get specific persona by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const persona = await coachPersonaService.getById(req.params.id);
    if (!persona) {
      return res.status(404).json({ error: 'Persona not found' });
    }
    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error fetching persona:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN ENDPOINTS (Authentication required - handled by admin routes)
// ============================================================================

/**
 * GET /api/admin/personas
 * Get all personas (including inactive)
 */
router.get('/admin/all', async (req, res) => {
  try {
    const personas = await coachPersonaService.getAll(false); // All personas
    const stats = await coachPersonaService.getStats();
    res.json({ success: true, personas, stats });
  } catch (error) {
    console.error('Error fetching all personas:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/personas
 * Create new persona
 */
router.post('/admin/create', upload.single('avatar'), async (req, res) => {
  try {
    const personaData = {
      id: req.body.id,
      name: req.body.name,
      style: req.body.style,
      description: req.body.description,
      tone: req.body.tone,
      catchphrase: req.body.catchphrase,
      color: req.body.color,
      personality: req.body.personality,
      is_active: req.body.is_active === 'true' || req.body.is_active === true,
      sort_order: parseInt(req.body.sort_order) || 0,
      avatar_url: req.file ? `/uploads/personas/${req.file.filename}` : null
    };

    const persona = await coachPersonaService.create(personaData);
    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error creating persona:', error);
    
    // Clean up uploaded file if persona creation failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting uploaded file:', unlinkErr);
      }
    }
    
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/personas/:id
 * Update persona
 */
router.put('/admin/update/:id', upload.single('avatar'), async (req, res) => {
  try {
    const updates = {
      name: req.body.name,
      style: req.body.style,
      description: req.body.description,
      tone: req.body.tone,
      catchphrase: req.body.catchphrase,
      color: req.body.color,
      personality: req.body.personality,
      is_active: req.body.is_active === 'true' || req.body.is_active === true,
      sort_order: req.body.sort_order ? parseInt(req.body.sort_order) : undefined
    };

    // Remove undefined values
    Object.keys(updates).forEach(key => 
      updates[key] === undefined && delete updates[key]
    );

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if exists
      const existingPersona = await coachPersonaService.getById(req.params.id);
      if (existingPersona && existingPersona.avatar_url) {
        try {
          const oldPath = path.join(__dirname, '..', existingPersona.avatar_url);
          await fs.unlink(oldPath);
        } catch (err) {
          console.error('Error deleting old avatar:', err);
        }
      }
      
      updates.avatar_url = `/uploads/personas/${req.file.filename}`;
    }

    const persona = await coachPersonaService.update(req.params.id, updates);
    res.json({ success: true, persona });
  } catch (error) {
    console.error('Error updating persona:', error);
    
    // Clean up uploaded file if update failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting uploaded file:', unlinkErr);
      }
    }
    
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/personas/:id
 * Delete persona
 */
router.delete('/admin/delete/:id', async (req, res) => {
  try {
    const result = await coachPersonaService.delete(req.params.id);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error deleting persona:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/personas/reorder
 * Reorder personas
 */
router.post('/admin/reorder', async (req, res) => {
  try {
    const { personaIds } = req.body;
    
    if (!Array.isArray(personaIds)) {
      return res.status(400).json({ error: 'personaIds must be an array' });
    }
    
    const result = await coachPersonaService.reorder(personaIds);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error reordering personas:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/admin/personas/stats
 * Get persona statistics
 */
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await coachPersonaService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
