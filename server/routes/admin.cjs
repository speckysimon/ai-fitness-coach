/**
 * Admin Routes
 * Handles admin authentication, user management, AI config, and global settings
 */

const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService.cjs');
const aiConfigService = require('../services/aiConfigService.cjs');
const globalSettingsService = require('../services/globalSettingsService.cjs');
const tokenTrackingService = require('../services/tokenTrackingService.cjs');
const modelPricingCron = require('../services/modelPricingCron.cjs');
const apiKeyLoader = require('../services/apiKeyLoader.cjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Admin database uses shared better-sqlite3 helper (migrated from direct sqlite3 connection)
// Note: adminDb helper is not used directly in routes since services handle admin DB access

// Create database connection for main app tables (users, training_plans, etc.)
const appDbPath = path.join(__dirname, '../fitness-coach.db');
const appDb = new sqlite3.Database(appDbPath);

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

// Middleware to verify super admin
const verifySuperAdmin = (req, res, next) => {
  if (!req.admin.isSuperAdmin) {
    return res.status(403).json({ error: 'Super admin access required' });
  }
  next();
};

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await adminService.authenticate(email, password);

    // Log activity
    await adminService.logActivity({
      adminId: result.admin.id,
      action: 'login',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      token: result.token,
      admin: result.admin,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(401).json({ error: error.message });
  }
});

/**
 * GET /api/admin/me
 * Get current admin info
 */
router.get('/me', verifyAdminToken, async (req, res) => {
  try {
    const admin = await adminService.getAdminById(req.admin.id);
    res.json({ success: true, admin });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/admins
 * List all admins (super admin only)
 */
router.get('/admins', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const admins = await adminService.listAdmins();
    res.json({ success: true, admins });
  } catch (error) {
    console.error('List admins error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/admins
 * Create new admin (super admin only)
 */
router.post('/admins', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { email, password, name, isSuperAdmin } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }

    const admin = await adminService.createAdmin({ email, password, name, isSuperAdmin });

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'create_admin',
      resourceType: 'admin',
      resourceId: admin.id.toString(),
      details: { email, name },
      ipAddress: req.ip,
    });

    res.json({ success: true, admin });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/admins/:id
 * Delete admin (super admin only)
 */
router.delete('/admins/:id', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await adminService.deleteAdmin(id);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'delete_admin',
      resourceType: 'admin',
      resourceId: id,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', verifyAdminToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, search } = req.query;

    let query = `SELECT id, email, name, created_at, updated_at FROM users`;
    let params = [];

    if (search) {
      query += ` WHERE email LIKE ? OR name LIKE ?`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    appDb.all(query, params, (err, users) => {
      if (err) {
        console.error('List users error:', err);
        return res.status(500).json({ error: err.message });
      }

      // Get total count
      const countQuery = search
        ? `SELECT COUNT(*) as total FROM users WHERE email LIKE ? OR name LIKE ?`
        : `SELECT COUNT(*) as total FROM users`;
      const countParams = search ? [`%${search}%`, `%${search}%`] : [];

      appDb.get(countQuery, countParams, (err, result) => {
        if (err) {
          console.error('Count users error:', err);
          return res.status(500).json({ error: err.message });
        }

        res.json({
          success: true,
          users,
          total: result.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
        });
      });
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details
 */
router.get('/users/:id', verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;

    appDb.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
      if (err) {
        console.error('Get user error:', err);
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get user's training plans count
      appDb.get(
        `SELECT COUNT(*) as planCount FROM training_plans WHERE user_id = ?`,
        [id],
        (err, planResult) => {
          if (err) {
            console.error('Get plan count error:', err);
          }

          res.json({
            success: true,
            user: {
              ...user,
              planCount: planResult?.planCount || 0,
            },
          });
        }
      );
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user (super admin only)
 */
router.delete('/users/:id', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    appDb.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
      if (err) {
        console.error('Delete user error:', err);
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log activity
      adminService.logActivity({
        adminId: req.admin.id,
        action: 'delete_user',
        resourceType: 'user',
        resourceId: id,
        ipAddress: req.ip,
      });

      res.json({ success: true });
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI MODEL CONFIGURATION
// ============================================================================

/**
 * GET /api/admin/ai-configs
 * List all AI model configurations
 */
router.get('/ai-configs', verifyAdminToken, async (req, res) => {
  try {
    const configs = await aiConfigService.listConfigs();
    res.json({ success: true, configs });
  } catch (error) {
    console.error('List AI configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/ai-configs/:featureName
 * Get specific AI model configuration
 */
router.get('/ai-configs/:featureName', verifyAdminToken, async (req, res) => {
  try {
    const { featureName } = req.params;
    const config = await aiConfigService.getConfig(featureName);
    res.json({ success: true, config });
  } catch (error) {
    console.error('Get AI config error:', error);
    res.status(404).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/ai-configs/:featureName
 * Update AI model configuration
 */
router.put('/ai-configs/:featureName', verifyAdminToken, async (req, res) => {
  try {
    const { featureName } = req.params;
    const updates = req.body;

    const config = await aiConfigService.updateConfig(featureName, updates);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'update_ai_config',
      resourceType: 'ai_config',
      resourceId: featureName,
      details: updates,
      ipAddress: req.ip,
    });

    res.json({ success: true, config });
  } catch (error) {
    console.error('Update AI config error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/ai-configs
 * Create new AI model configuration
 */
router.post('/ai-configs', verifyAdminToken, async (req, res) => {
  try {
    const config = await aiConfigService.createConfig(req.body);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'create_ai_config',
      resourceType: 'ai_config',
      resourceId: config.featureName,
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ success: true, config });
  } catch (error) {
    console.error('Create AI config error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// API KEY MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/api-keys
 * List all API keys (without decrypted values)
 * Super admin only
 */
router.get('/api-keys', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const keys = await aiConfigService.listApiKeys();
    res.json({ success: true, keys });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/api-keys
 * Store new API key
 * Super admin only
 */
router.post('/api-keys', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { keyName, provider, apiKey, clientId, clientSecret, redirectUri } = req.body;

    if (!keyName || !provider) {
      return res.status(400).json({ error: 'Key name and provider are required' });
    }

    // Validate based on provider type
    const requiresOAuth = ['strava', 'google', 'intervals'].includes(provider);
    if (requiresOAuth) {
      if (!clientId || !clientSecret || !redirectUri) {
        return res.status(400).json({ error: 'Client ID, Client Secret, and Redirect URI are required for OAuth providers' });
      }
    } else {
      if (!apiKey) {
        return res.status(400).json({ error: 'API Key is required' });
      }
    }

    const result = await aiConfigService.storeApiKey({
      keyName,
      provider,
      apiKey,
      clientId,
      clientSecret,
      redirectUri
    });

    // Log activity (don't log the actual key)
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'store_api_key',
      resourceType: 'api_key',
      resourceId: keyName,
      details: { provider },
      ipAddress: req.ip,
    });

    res.json({ success: true, key: result });
  } catch (error) {
    console.error('Store API key error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/api-keys/:provider
 * Update API key
 * Super admin only
 */
router.put('/api-keys/:provider', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { provider } = req.params;
    const { keyName, apiKey, clientId, clientSecret, redirectUri } = req.body;

    // Update the API key (only update fields that are provided)
    const result = await aiConfigService.storeApiKey({
      keyName: keyName || provider,
      provider,
      apiKey: apiKey || undefined,
      clientId: clientId || undefined,
      clientSecret: clientSecret || undefined,
      redirectUri: redirectUri || undefined,
    });

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'update_api_key',
      resourceType: 'api_key',
      resourceId: provider,
      details: { provider },
      ipAddress: req.ip,
    });

    res.json({ success: true, key: result });
  } catch (error) {
    console.error('Update API key error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/admin/api-keys/:keyName
 * Delete API key
 * Super admin only
 */
router.delete('/api-keys/:keyName', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { keyName } = req.params;
    await aiConfigService.deleteApiKey(keyName);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'delete_api_key',
      resourceType: 'api_key',
      resourceId: keyName,
      ipAddress: req.ip,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/admin/api-keys/:keyName/toggle
 * Toggle API key active status
 * Super admin only
 */
router.patch('/api-keys/:keyName/toggle', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    const { keyName } = req.params;
    const { isActive } = req.body;

    const result = await aiConfigService.toggleApiKey(keyName, isActive);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'toggle_api_key',
      resourceType: 'api_key',
      resourceId: keyName,
      details: { isActive },
      ipAddress: req.ip,
    });

    res.json({ success: true, key: result });
  } catch (error) {
    console.error('Toggle API key error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GLOBAL SETTINGS
// ============================================================================

/**
 * GET /api/admin/settings
 * Get all global settings
 */
router.get('/settings', verifyAdminToken, async (req, res) => {
  try {
    const settings = await globalSettingsService.getAllSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/settings/categories
 * Get all setting categories
 */
router.get('/settings/categories', verifyAdminToken, async (req, res) => {
  try {
    const categories = await globalSettingsService.getCategories();
    res.json({ success: true, categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/settings/:category
 * Get settings by category
 */
router.get('/settings/:category', verifyAdminToken, async (req, res) => {
  try {
    const { category } = req.params;
    const settings = await globalSettingsService.getSettingsByCategory(category);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Get settings by category error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Update a setting
 */
router.put('/settings/:key', verifyAdminToken, async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value required' });
    }

    const result = await globalSettingsService.updateSetting(key, value, req.admin.id);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'update_setting',
      resourceType: 'setting',
      resourceId: key,
      details: { value },
      ipAddress: req.ip,
    });

    res.json({ success: true, setting: result });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/settings
 * Create new setting
 */
router.post('/settings', verifyAdminToken, async (req, res) => {
  try {
    const setting = await globalSettingsService.createSetting(req.body);

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'create_setting',
      resourceType: 'setting',
      resourceId: setting.key,
      details: req.body,
      ipAddress: req.ip,
    });

    res.json({ success: true, setting });
  } catch (error) {
    console.error('Create setting error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// ACTIVITY LOG
// ============================================================================

/**
 * GET /api/admin/activity-log
 * Get admin activity log
 */
router.get('/activity-log', verifyAdminToken, async (req, res) => {
  try {
    const { limit = 100, offset = 0, adminId } = req.query;

    const logs = await adminService.getActivityLog({
      limit: parseInt(limit),
      offset: parseInt(offset),
      adminId: adminId ? parseInt(adminId) : null,
    });

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', verifyAdminToken, async (req, res) => {
  try {
    // Get user count from main app database
    appDb.get(`SELECT COUNT(*) as userCount FROM users`, [], (err, userResult) => {
      if (err) {
        console.error('Get user count error:', err);
        return res.status(500).json({ error: err.message });
      }

      // Get plan count from main app database
      appDb.get(
        `SELECT COUNT(*) as planCount FROM training_plans`,
        [],
        (err, planResult) => {
          if (err) {
            console.error('Get plan count error:', err);
            return res.status(500).json({ error: err.message });
          }

          // Get recent users (last 7 days) from main app database
          appDb.get(
            `SELECT COUNT(*) as recentUsers FROM users WHERE created_at > datetime('now', '-7 days')`,
            [],
            (err, recentResult) => {
              if (err) {
                console.error('Get recent users error:', err);
                return res.status(500).json({ error: err.message });
              }

              // Get active today (users with sessions or strava tokens updated today)
              appDb.get(
                `SELECT COUNT(DISTINCT user_id) as activeToday FROM strava_tokens WHERE updated_at > datetime('now', 'start of day')`,
                [],
                (err, activeResult) => {
                  if (err) {
                    console.error('Get active today error:', err);
                    // Don't fail the whole request, just set to 0
                    activeResult = { activeToday: 0 };
                  }

                  res.json({
                    success: true,
                    stats: {
                      totalUsers: userResult.userCount,
                      totalPlans: planResult.planCount,
                      recentUsers: recentResult.recentUsers,
                      activeToday: activeResult.activeToday || 0,
                    },
                  });
                }
              );
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TOKEN TRACKING & PRICING
// ============================================================================

/**
 * GET /api/admin/token-usage
 * Get token usage statistics
 */
router.get('/token-usage', verifyAdminToken, async (req, res) => {
  try {
    const stats = await tokenTrackingService.getTokenUsageStats();
    const monthlyCost = await tokenTrackingService.getMonthlyCost();

    res.json({
      success: true,
      usage: stats,
      cost: monthlyCost
    });
  } catch (error) {
    console.error('Get token usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/available-models
 * Get all available AI models with pricing
 */
router.get('/available-models', verifyAdminToken, async (req, res) => {
  try {
    const models = await tokenTrackingService.getAvailableModels();

    // Group by provider
    const grouped = {
      openai: models.filter(m => m.model_provider === 'openai'),
      gemini: models.filter(m => m.model_provider === 'gemini')
    };

    res.json({
      success: true,
      models: grouped
    });
  } catch (error) {
    console.error('Get available models error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/update-model-pricing
 * Manually trigger model pricing update
 * Super admin only
 */
router.post('/update-model-pricing', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    await modelPricingCron.triggerManualUpdate();

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'update_model_pricing',
      resourceType: 'system',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Model pricing updated successfully'
    });
  } catch (error) {
    console.error('Update model pricing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/refresh-api-keys
 * Refresh API keys from database
 * Super admin only
 */
router.post('/refresh-api-keys', verifyAdminToken, verifySuperAdmin, async (req, res) => {
  try {
    await apiKeyLoader.refreshKeys();

    // Log activity
    await adminService.logActivity({
      adminId: req.admin.id,
      action: 'refresh_api_keys',
      resourceType: 'system',
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'API keys refreshed successfully',
      providers: apiKeyLoader.getAvailableProviders()
    });
  } catch (error) {
    console.error('Refresh API keys error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI PROMPTS
// ============================================================================

/**
 * GET /api/admin/ai-prompts
 * Get all AI prompts used in the application
 */
router.get('/ai-prompts', verifyAdminToken, async (req, res) => {
  try {
    const prompts = [
      {
        name: 'Training Plan Generation',
        feature: 'Plan Generator',
        endpoint: 'POST /api/training/plan/generate',
        description: 'Generates a complete training plan based on athlete data, goals, and constraints',
        systemPrompt: `You are an expert cycling and running coach with deep knowledge of training periodization, physiology, and adaptive planning. You create structured training plans based on athlete data, goals, and constraints. Always respond with valid JSON.`,
        userPromptTemplate: `Create a {duration}-week training plan for an athlete preparing for a {eventType} event.

ATHLETE PROFILE & CURRENT FITNESS:
- FTP: {ftp} watts ({powerToWeight} W/kg)
- Current week load: {currentWeekTSS} TSS, {currentWeekHours}h
- 4-week average: {fourWeekAvgTSS} TSS, {fourWeekAvgHours}h
- Load ratio: {loadRatio}
- Training consistency: {consistency}
- Age: {age} years
- Gender: {gender}
- Weight: {weight} kg
- Height: {height} cm

RECENT ACTIVITIES (last 10):
{recentActivities}

EVENT GOALS & TARGET PROFILE:
- Event: {eventName}
- Date: {eventDate} ({daysUntilEvent} days away)
- Event Type: {eventType}
- Target Rider Type: {targetRiderType}
- Training Focus: {trainingFocus}
- Priority: {priority}
- Duration: {duration} weeks

TRAINING CONSTRAINTS:
- Available days per week: {daysPerWeek}
- Max hours per week: {maxHoursPerWeek}
- Indoor/outdoor preference: {preference}

Generate a structured training plan with weekly overview and individual sessions.`,
        variables: [
          'duration', 'eventType', 'ftp', 'powerToWeight', 'currentWeekTSS', 'currentWeekHours',
          'fourWeekAvgTSS', 'fourWeekAvgHours', 'loadRatio', 'consistency', 'age', 'gender',
          'weight', 'height', 'recentActivities', 'eventName', 'eventDate', 'daysUntilEvent',
          'targetRiderType', 'trainingFocus', 'priority', 'daysPerWeek', 'maxHoursPerWeek', 'preference'
        ],
        exampleOutput: `{
  "planSummary": "8-week progressive training plan...",
  "weeks": [
    {
      "weekNumber": 1,
      "focus": "Base Building",
      "totalHours": 8,
      "sessions": [
        {
          "day": "Monday",
          "type": "Recovery",
          "duration": 60,
          "title": "Easy Spin",
          "description": "...",
          "targets": "Zone 1-2",
          "indoor": false
        }
      ]
    }
  ],
  "notes": "..."
}`
      },
      {
        name: 'Plan Adjustments',
        feature: 'Adaptive Plan Modal',
        endpoint: 'POST /api/training/plan/adjust',
        description: 'Adjusts training plan based on natural language requests from athletes',
        systemPrompt: `You are an expert cycling and endurance sports coach with deep knowledge of training adaptation, periodization, and athlete management. You help athletes adjust their training plans intelligently based on real-world circumstances while maintaining training principles.`,
        userPromptTemplate: `You are an expert cycling coach helping an athlete adjust their training plan.

ATHLETE'S CURRENT DATE/TIME:
- Current Date: {currentDate} ({isoDate})
- Current Time: {currentTime}
- Timezone: {timezone}

ORIGINAL PLAN SETTINGS (MUST BE PRESERVED):
- Event Name: {eventName}
- Event Date: {eventDate}
- Event Type: {eventType}
- Priority: {priority}
- Plan Duration: {planDuration} weeks
- Days per Week: {daysPerWeek}
- Max Hours per Week: {maxHoursPerWeek}

CURRENT PLAN STATE:
- Total weeks: {totalWeeks}
- Total sessions: {totalSessions}
- Completed: {completedCount} ({completionRate}%)
- Missed: {missedCount}

RECENT ACTIVITIES (last 5):
{recentActivities}

ATHLETE'S REQUEST:
"{adjustmentRequest}"

INSTRUCTIONS:
1. Understand what the athlete is asking for
2. If they DID an activity (past tense), update that past session to EXACTLY match what they did
3. For schedule changes, ACTUALLY move sessions to different days (update the "day" field)
4. Maintain training principles
5. Explain reasoning for changes

Return a JSON object with explanation, changes, and the full adjusted plan.`,
        variables: [
          'currentDate', 'isoDate', 'currentTime', 'timezone', 'eventName', 'eventDate',
          'eventType', 'priority', 'planDuration', 'daysPerWeek', 'maxHoursPerWeek',
          'totalWeeks', 'totalSessions', 'completedCount', 'completionRate', 'missedCount',
          'recentActivities', 'adjustmentRequest'
        ],
        exampleOutput: `{
  "explanation": "I've moved your Monday and Wednesday sessions...",
  "changes": [
    {
      "type": "Rescheduling",
      "description": "Moved Monday session to Tuesday",
      "sessions": ["Week 2, Monday"]
    }
  ],
  "adjustedPlan": {
    "planSummary": "...",
    "weeks": [...]
  },
  "significantChanges": true
}`
      },
      {
        name: 'Workout Analysis',
        feature: 'Activity Match Modal',
        endpoint: 'POST /api/training/workout/analyze',
        description: 'Analyzes actual workout performance vs planned session',
        systemPrompt: `You are an expert cycling coach providing concise, actionable workout analysis. Always respond with valid JSON only.`,
        userPromptTemplate: `You are an expert cycling coach analyzing an athlete's workout performance.

PLANNED SESSION:
- Title: {plannedTitle}
- Type: {plannedType}
- Duration: {plannedDuration} minutes
- Description: {plannedDescription}
- Targets: {plannedTargets}

ACTUAL ACTIVITY:
- Name: {actualName}
- Duration: {actualDuration} minutes
- Distance: {actualDistance} km
- Average Power: {avgPower}W
- Normalized Power: {normalizedPower}W
- Max Power: {maxPower}W
- Average HR: {avgHeartRate} bpm
- Max HR: {maxHeartRate} bpm
- TSS: {tss}
- Elevation: {elevation}m

ATHLETE'S FEEDBACK:
"{athleteComment}"

Provide a comprehensive analysis covering:
1. WORKOUT QUALITY ASSESSMENT (2-3 sentences)
2. PLAN ALIGNMENT (1-2 sentences)
3. ADAPTATION & RECOMMENDATIONS (1 sentence)

Return JSON with: analysis, deviationLevel, suggestPlanUpdate, workoutQuality`,
        variables: [
          'plannedTitle', 'plannedType', 'plannedDuration', 'plannedDescription', 'plannedTargets',
          'actualName', 'actualDuration', 'actualDistance', 'avgPower', 'normalizedPower',
          'maxPower', 'avgHeartRate', 'maxHeartRate', 'tss', 'elevation', 'athleteComment'
        ],
        exampleOutput: `{
  "analysis": "You hit excellent power numbers with an average of 245W...",
  "deviationLevel": "low",
  "suggestPlanUpdate": false,
  "workoutQuality": "excellent"
}`
      },
      {
        name: 'Plan Adaptation',
        feature: 'Adaptive Training Service',
        endpoint: 'POST /api/training/plan/adapt',
        description: 'Automatically detects issues and suggests plan adaptations',
        systemPrompt: `You are an expert coach analyzing training plan adherence and suggesting adaptations.`,
        userPromptTemplate: `Analyze this training plan adaptation scenario:

CURRENT PLAN WEEK:
{currentWeek}

COMPLETED ACTIVITIES THIS WEEK:
{completedActivities}

UPCOMING SESSIONS:
{upcomingSessions}

Based on actual vs planned training, suggest adaptations to upcoming sessions.
Consider:
- Missed sessions (need to make up or skip?)
- Excessive fatigue (reduce intensity?)
- Ahead of schedule (maintain or increase?)

Return JSON with analysis and recommendations.`,
        variables: [
          'currentWeek', 'completedActivities', 'upcomingSessions'
        ],
        exampleOutput: `{
  "analysis": "You've missed 2 key sessions this week...",
  "recommendations": [
    {
      "sessionId": "week2-day3",
      "originalPlan": "Threshold Intervals",
      "adaptation": "Reduce to Tempo",
      "reason": "Accumulated fatigue from missed recovery"
    }
  ]
}`
      }
    ];

    res.json({
      success: true,
      prompts
    });
  } catch (error) {
    console.error('Error fetching AI prompts:', error);
    res.status(500).json({ error: 'Failed to fetch AI prompts' });
  }
});

// ============================================================================
// ADMIN PASSWORD RESET
// ============================================================================

const rateLimit = require('express-rate-limit');
const adminPasswordResetService = require('../services/adminPasswordResetService.cjs');

// Rate limiter: 3 requests per 15 minutes per IP
const adminForgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/admin/forgot-password
 * Request admin password reset email
 */
router.post('/forgot-password', adminForgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';

    await adminPasswordResetService.requestPasswordReset(email, ipAddress, userAgent, frontendUrl);

    // IMPORTANT: Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an admin account exists with that email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Admin forgot password error:', error);
    // Still return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an admin account exists with that email, a password reset link has been sent.',
    });
  }
});

/**
 * GET /api/admin/validate-reset-token/:token
 * Validate admin password reset token
 */
router.get('/validate-reset-token/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const tokenData = await adminPasswordResetService.validateResetToken(token);

    if (tokenData) {
      res.json({ success: true, valid: true });
    } else {
      res.status(400).json({ success: false, valid: false, error: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('Validate admin reset token error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

/**
 * POST /api/admin/reset-password
 * Reset admin password with token
 */
router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Token, password, and confirmation are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  // Password validation
  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters long' });
  }

  try {
    await adminPasswordResetService.resetPassword(token, password);

    res.json({
      success: true,
      message: 'Admin password reset successful. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Admin reset password error:', error);

    if (error.message === 'Invalid or expired token') {
      res.status(400).json({ error: 'Invalid or expired token' });
    } else {
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
});

module.exports = router;

