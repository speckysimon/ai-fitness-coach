const express = require('express');
const router = express.Router();
const Database = require('better-sqlite3');
const path = require('path');
const adminService = require('../services/adminService.cjs');

const dbPath = path.join(__dirname, '../database.sqlite');

// Middleware to verify admin authentication
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = adminService.verifyToken(token);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// GET all theme configurations
router.get('/', verifyAdmin, (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const themes = db.prepare(`
      SELECT id, name, description, is_active, config, created_at, updated_at
      FROM theme_configs
      ORDER BY is_active DESC, name ASC
    `).all();

    // Parse config JSON for each theme
    const themesWithParsedConfig = themes.map(theme => ({
      ...theme,
      config: JSON.parse(theme.config),
      is_active: Boolean(theme.is_active)
    }));

    res.json({
      success: true,
      themes: themesWithParsedConfig
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch theme configurations'
    });
  } finally {
    db.close();
  }
});

// GET all themes (public - for theme selector)
router.get('/all', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const themes = db.prepare(`
      SELECT id, name, description, config, created_at, updated_at
      FROM theme_configs
      ORDER BY name ASC
    `).all();

    // Parse config JSON for each theme
    const themesWithParsedConfig = themes.map(theme => ({
      ...theme,
      config: JSON.parse(theme.config)
    }));

    res.json({
      success: true,
      themes: themesWithParsedConfig
    });
  } catch (error) {
    console.error('Error fetching all themes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch themes'
    });
  } finally {
    db.close();
  }
});

// GET active theme configuration
router.get('/active', (req, res) => {
  const db = new Database(dbPath);
  
  try {
    const theme = db.prepare(`
      SELECT id, name, description, config, created_at, updated_at
      FROM theme_configs
      WHERE is_active = 1
      LIMIT 1
    `).get();

    if (!theme) {
      return res.json({
        success: true,
        theme: null
      });
    }

    res.json({
      success: true,
      theme: {
        ...theme,
        config: JSON.parse(theme.config)
      }
    });
  } catch (error) {
    console.error('Error fetching active theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active theme'
    });
  } finally {
    db.close();
  }
});

// POST create new theme configuration
router.post('/', verifyAdmin, (req, res) => {
  const { name, description, config, is_active } = req.body;

  if (!name || !config) {
    return res.status(400).json({
      success: false,
      error: 'Name and config are required'
    });
  }

  const db = new Database(dbPath);
  
  try {
    // If setting as active, deactivate all other themes
    if (is_active) {
      db.prepare('UPDATE theme_configs SET is_active = 0').run();
    }

    const result = db.prepare(`
      INSERT INTO theme_configs (name, description, config, is_active)
      VALUES (?, ?, ?, ?)
    `).run(
      name,
      description || null,
      JSON.stringify(config),
      is_active ? 1 : 0
    );

    const newTheme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      success: true,
      theme: {
        ...newTheme,
        config: JSON.parse(newTheme.config),
        is_active: Boolean(newTheme.is_active)
      }
    });
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create theme configuration'
    });
  } finally {
    db.close();
  }
});

// PUT update theme configuration
router.put('/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { name, description, config, is_active } = req.body;

  const db = new Database(dbPath);
  
  try {
    // Check if theme exists
    const existingTheme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(id);
    if (!existingTheme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // If setting as active, deactivate all other themes
    if (is_active) {
      db.prepare('UPDATE theme_configs SET is_active = 0').run();
    }

    // Update theme
    db.prepare(`
      UPDATE theme_configs
      SET name = ?,
          description = ?,
          config = ?,
          is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || existingTheme.name,
      description !== undefined ? description : existingTheme.description,
      config ? JSON.stringify(config) : existingTheme.config,
      is_active !== undefined ? (is_active ? 1 : 0) : existingTheme.is_active,
      id
    );

    const updatedTheme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(id);

    res.json({
      success: true,
      theme: {
        ...updatedTheme,
        config: JSON.parse(updatedTheme.config),
        is_active: Boolean(updatedTheme.is_active)
      }
    });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update theme configuration'
    });
  } finally {
    db.close();
  }
});

// POST activate theme
router.post('/:id/activate', verifyAdmin, (req, res) => {
  const { id } = req.params;

  const db = new Database(dbPath);
  
  try {
    // Check if theme exists
    const theme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(id);
    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // Deactivate all themes
    db.prepare('UPDATE theme_configs SET is_active = 0').run();

    // Activate selected theme
    db.prepare('UPDATE theme_configs SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    const updatedTheme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(id);

    res.json({
      success: true,
      theme: {
        ...updatedTheme,
        config: JSON.parse(updatedTheme.config),
        is_active: Boolean(updatedTheme.is_active)
      }
    });
  } catch (error) {
    console.error('Error activating theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate theme'
    });
  } finally {
    db.close();
  }
});

// DELETE theme configuration
router.delete('/:id', verifyAdmin, (req, res) => {
  const { id } = req.params;

  const db = new Database(dbPath);
  
  try {
    // Check if theme exists
    const theme = db.prepare('SELECT * FROM theme_configs WHERE id = ?').get(id);
    if (!theme) {
      return res.status(404).json({
        success: false,
        error: 'Theme not found'
      });
    }

    // Don't allow deleting active theme
    if (theme.is_active) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active theme. Please activate another theme first.'
      });
    }

    db.prepare('DELETE FROM theme_configs WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Theme deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete theme configuration'
    });
  } finally {
    db.close();
  }
});

module.exports = router;
