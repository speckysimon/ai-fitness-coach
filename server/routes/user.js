import express from 'express';
import { getDb, userDb, sessionDb } from '../db.js';

const router = express.Router();

// ========================================
// USER PROFILE ENDPOINTS
// ========================================

// Update user profile (name, age, height, weight, gender)
router.put('/profile', async (req, res) => {
  try {
    // Extract session token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate session and get user
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized - Invalid or expired session' });
    }

    const userId = session.user_id;
    const { name, age, height, weight, gender } = req.body;
    
    // Update user profile using existing helper
    userDb.updateProfile(userId, { name, age, height, weight, gender });
    
    // Fetch updated user data
    const updatedUser = userDb.findById(userId);
    
    // Remove sensitive data
    delete updatedUser.password;
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ========================================
// USER PREFERENCES CRUD ENDPOINTS
// ========================================

// Get user preferences
router.get('/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  
  try {
    const db = getDb();
    const prefs = db.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    if (!prefs) {
      return res.json({ preferences: null });
    }
    
    // Parse JSON data
    if (prefs.other_settings) {
      prefs.other_settings = JSON.parse(prefs.other_settings);
    }
    
    res.json({ preferences: prefs });
  } catch (error) {
    console.error('Error loading user preferences:', error.message);
    res.status(500).json({ error: 'Failed to load user preferences' });
  }
});

// Save/update user preferences
router.put('/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  const { ftp, timezone, theme, otherSettings } = req.body;
  
  try {
    const db = getDb();
    
    // Check if preferences exist
    const existing = db.prepare(`
      SELECT id FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    if (existing) {
      // Update existing preferences
      db.prepare(`
        UPDATE user_preferences 
        SET ftp = ?, timezone = ?, theme = ?, other_settings = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        ftp,
        timezone,
        theme,
        otherSettings ? JSON.stringify(otherSettings) : null,
        userId
      );
      
      res.json({ 
        success: true, 
        message: 'User preferences updated successfully' 
      });
    } else {
      // Insert new preferences
      db.prepare(`
        INSERT INTO user_preferences (
          user_id, ftp, timezone, theme, other_settings, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        userId,
        ftp,
        timezone,
        theme,
        otherSettings ? JSON.stringify(otherSettings) : null
      );
      
      res.json({ 
        success: true, 
        message: 'User preferences created successfully' 
      });
    }
  } catch (error) {
    console.error('Error saving user preferences:', error.message);
    res.status(500).json({ error: 'Failed to save user preferences' });
  }
});

// Update specific preference field
router.patch('/preferences/:userId/:field', async (req, res) => {
  const { userId, field } = req.params;
  const { value } = req.body;
  
  // Validate field name
  const allowedFields = ['ftp', 'timezone', 'theme'];
  if (!allowedFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid preference field' });
  }
  
  try {
    const db = getDb();
    
    // Check if preferences exist
    const existing = db.prepare(`
      SELECT id FROM user_preferences WHERE user_id = ?
    `).get(userId);
    
    if (!existing) {
      // Create new preferences with this field
      db.prepare(`
        INSERT INTO user_preferences (
          user_id, ${field}, created_at, updated_at
        ) VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(userId, value);
    } else {
      // Update specific field
      db.prepare(`
        UPDATE user_preferences 
        SET ${field} = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(value, userId);
    }
    
    res.json({ 
      success: true, 
      message: `${field} updated successfully` 
    });
  } catch (error) {
    console.error(`Error updating ${field}:`, error.message);
    res.status(500).json({ error: `Failed to update ${field}` });
  }
});

export default router;
