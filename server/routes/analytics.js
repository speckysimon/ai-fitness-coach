import express from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { fthrService } from '../services/fthrService.js';
import { smartMetricsService } from '../services/smartMetricsService.js';
import { calculatePowerCurve, classifyRiderType } from '../services/riderAnalyticsService.js';
import { getAnalyticsActivities } from '../services/analyticsQueryBuilder.js';
import { runNormalisationForUser, getNormalisationStatus } from '../services/normalisationRunner.js';
import { runDurabilityForUser, getDurabilityStatus } from '../services/durabilityRunner.js';
import { runStressClassificationForUser, getStressClassificationStatus } from '../services/stressRunner.js';
import { getWeeklyRollups, computeWeeklyRollups } from '../services/weeklyAggregator.js';
import { hasWeeklyRollups } from '../services/weeklyRecomputeScheduler.js';
import { computeTrendSummary } from '../services/trendEngine.js';
import { generateInsights } from '../services/coachingInsights.js';
import {
  parseUserId,
  parseWeeksBack,
  parseLimit,
  parseDateRange,
  sendError,
  createWarning,
  checkCoverage
} from './utils/parseAnalyticsParams.js';
import OpenAI from 'openai';
import { createRequire } from 'module';
import db from '../db.js';
import { upsertAthleteThresholds, getUserThresholds } from '../services/athleteThresholdsService.js';

const require = createRequire(import.meta.url);
const apiKeyLoader = require('../services/apiKeyLoader.cjs');

const router = express.Router();

// Calculate current FTP using canonical bible methodology
router.post('/ftp', async (req, res) => {
  const { activities } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const result = analyticsService.calculateFTP(activities);
    // Return full result object with ftp, confidence, method, etc.
    res.json(result);
  } catch (error) {
    console.error('Error calculating FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTP' });
  }
});

// Calculate FTP history (weekly snapshots)
router.post('/ftp-history', async (req, res) => {
  const { activities, weeks = 24 } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const history = analyticsService.calculateFTPHistory(activities, weeks);
    res.json(history);
  } catch (error) {
    console.error('Error calculating FTP history:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTP history' });
  }
});

// Calculate FTHR history (weekly snapshots)
router.post('/fthr-history', async (req, res) => {
  const { activities, weeks = 24 } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const history = fthrService.calculateFTHRHistory(activities, weeks);
    res.json(history);
  } catch (error) {
    console.error('Error calculating FTHR history:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTHR history' });
  }
});

// Calculate training load metrics
router.post('/load', async (req, res) => {
  const { activities, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const loadMetrics = analyticsService.calculateTrainingLoad(activities, ftp);
    res.json(loadMetrics);
  } catch (error) {
    console.error('Error calculating training load:', error.message);
    res.status(500).json({ error: 'Failed to calculate training load' });
  }
});

// Get weekly summary
router.post('/weekly-summary', async (req, res) => {
  const { activities, weekStart } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const summary = analyticsService.getWeeklySummary(activities, weekStart);
    res.json(summary);
  } catch (error) {
    console.error('Error calculating weekly summary:', error.message);
    res.status(500).json({ error: 'Failed to calculate weekly summary' });
  }
});

// Get trend analysis
router.post('/trends', async (req, res) => {
  const { activities, weeks = 6, ftp } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = analyticsService.getTrends(activities, weeks, ftp);
    res.json(trends);
  } catch (error) {
    console.error('Error calculating trends:', error.message);
    res.status(500).json({ error: 'Failed to calculate trends' });
  }
});

// Calculate FTHR (Functional Threshold Heart Rate)
router.post('/fthr', async (req, res) => {
  const { activities, manualFTHR, zoneModel = '5-zone', maxHR = null } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const fthrData = fthrService.calculateFTHR(activities, manualFTHR);
    
    // If FTHR was calculated, add zones based on selected model
    if (fthrData.fthr) {
      fthrData.zones = fthrService.calculateHRZonesByModel(
        fthrData.fthr,
        zoneModel,
        maxHR
      );
      fthrData.zoneModel = zoneModel; // Return which model was used

      // Persist derived FTHR into athlete_thresholds (does not overwrite manual)
      try {
        const userId = req.user?.id || (process.env.ALLOW_QUERY_USER_ID === 'true' ? parseInt(req.query.userId) : null);
        if (userId) {
          const source = fthrData.method === 'user_provided' ? 'manual' : 'derived';
          const confidence = fthrData.confidence != null ? fthrData.confidence / 100 : null;
          upsertAthleteThresholds(userId, {
            fthr_bpm:        Math.round(fthrData.fthr),
            fthr_source:     source,
            fthr_confidence: confidence
          }, { force: source === 'manual' });
        }
      } catch (persistErr) {
        console.warn('[Analytics] FTHR persist failed (non-fatal):', persistErr.message);
      }
    }
    
    res.json(fthrData);
  } catch (error) {
    console.error('Error calculating FTHR:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTHR' });
  }
});

// Get HR trends analysis
router.post('/hr-trends', async (req, res) => {
  const { activities, fthr } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const trends = fthrService.analyzeHRTrends(activities, fthr);
    res.json(trends);
  } catch (error) {
    console.error('Error analyzing HR trends:', error.message);
    res.status(500).json({ error: 'Failed to analyze HR trends' });
  }
});

// DEPRECATED: Smart FTP - now merged into /ftp
// Kept for backward compatibility, redirects to canonical /ftp
router.post('/smart-ftp', async (req, res) => {
  const { activities } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    // Use the canonical FTP calculation (smart logic is now merged)
    const result = analyticsService.calculateFTP(activities);
    res.json(result);
  } catch (error) {
    console.error('Error calculating FTP:', error.message);
    res.status(500).json({ error: 'Failed to calculate FTP' });
  }
});

// Generate AI-powered smart insights based on last 7 days
router.post('/smart-insights', async (req, res) => {
  const { activities, ftp, riderType, coachPersona } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const insights = await analyticsService.generateAISmartInsights(
      activities,
      ftp,
      riderType,
      coachPersona
    );
    res.json(insights);
  } catch (error) {
    console.error('Error generating smart insights:', error.message);
    res.status(500).json({ error: 'Failed to generate smart insights' });
  }
});

// Calculate power curve with windowing
router.post('/power-curve', async (req, res) => {
  const { activities, windowDays = 42 } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    const result = calculatePowerCurve(activities, windowDays);
    res.json(result);
  } catch (error) {
    console.error('Error calculating power curve:', error.message);
    res.status(500).json({ error: 'Failed to calculate power curve' });
  }
});

// Classify rider type with windowing and dual confidence
router.post('/rider-type', async (req, res) => {
  const { activities, ftp, windowDays = 42 } = req.body;
  
  if (!activities || !Array.isArray(activities)) {
    return res.status(400).json({ error: 'Activities array required' });
  }

  try {
    // First calculate power curve for the window
    const powerCurveResult = calculatePowerCurve(activities, windowDays);
    
    // Then classify rider type using the power curve
    const result = classifyRiderType(activities, powerCurveResult.powerCurve, ftp, windowDays);
    res.json(result);
  } catch (error) {
    console.error('Error classifying rider type:', error.message);
    res.status(500).json({ error: 'Failed to classify rider type' });
  }
});

// Answer questions about weekly training using AI
router.post('/ask-coach', async (req, res) => {
  try {
    const { question, activities, weeklyMetrics, ftp, zoneDistribution, efficiencyMetrics, coachPersona } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get OpenAI API key from admin panel
    const openaiKey = apiKeyLoader.getApiKey('openai');
    if (!openaiKey) {
      return res.status(503).json({ error: 'AI service not available. Please configure OpenAI API key in Admin Panel.' });
    }

    // Initialize OpenAI with dynamic key
    const openai = new OpenAI({ apiKey: openaiKey });

    // Prepare context about the week's training
    const activitySummary = activities.map(a => ({
      date: new Date(a.date).toLocaleDateString(),
      name: a.name,
      duration: `${Math.round(a.duration / 60)} min`,
      distance: a.distance ? `${(a.distance / 1000).toFixed(1)} km` : 'N/A',
      tss: a.tss ? Math.round(a.tss) : 'N/A',
      avgPower: a.avgPower ? `${Math.round(a.avgPower)}W` : 'N/A',
      avgHR: a.avgHeartRate ? `${Math.round(a.avgHeartRate)} bpm` : 'N/A'
    }));

    const zoneBreakdown = zoneDistribution ? zoneDistribution.map(z => 
      `${z.name}: ${z.percentage.toFixed(0)}% (${z.time.toFixed(1)}h)`
    ).join(', ') : 'Not available';

    const efficiencySummary = efficiencyMetrics ? 
      `Current: ${efficiencyMetrics.currentEfficiency} W/bpm, Trend: ${efficiencyMetrics.trend}%` : 
      'Not available';

    // Build the AI prompt
    const systemPrompt = `You are ${coachPersona.name}, a ${coachPersona.description}. 
Your coaching style is ${coachPersona.tone}.

You are answering questions about an athlete's training week. Use the provided data to give specific, actionable advice.
Be conversational but professional. Keep responses concise (2-4 paragraphs max).
Reference specific numbers from their data when relevant.

IMPORTANT: You are a cycling/fitness coach. Only answer questions related to:
- Training, workouts, and exercise
- Performance metrics (FTP, TSS, heart rate, power, zones)
- Recovery and fatigue management
- Nutrition and hydration for training
- Training plans and periodization
- Cycling technique and tactics

If asked about non-training topics (politics, entertainment, general knowledge, etc.), politely redirect:
"I'm your cycling coach and I'm here to help with your training and performance. Let's focus on your cycling goals! Do you have any questions about this week's training data or how to improve your performance?"`;

    const userPrompt = `ATHLETE'S QUESTION: "${question}"

WEEKLY TRAINING DATA (Last 7 Days):
- Activities: ${weeklyMetrics.activityCount}
- Total Time: ${weeklyMetrics.totalTimeHours} hours
- Total TSS: ${weeklyMetrics.totalTSS}
- Total Distance: ${weeklyMetrics.totalDistance} km
- Average Intensity: ${weeklyMetrics.avgIntensity}
${ftp ? `- Current FTP: ${ftp}W` : ''}

ZONE DISTRIBUTION:
${zoneBreakdown}

AEROBIC EFFICIENCY:
${efficiencySummary}

INDIVIDUAL ACTIVITIES:
${activitySummary.map((a, i) => `${i + 1}. ${a.date} - ${a.name}: ${a.duration}, ${a.distance}, TSS: ${a.tss}, Power: ${a.avgPower}, HR: ${a.avgHR}`).join('\n')}

Please answer the athlete's question based on this data. Be specific and reference their actual numbers.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content;

    res.json({ answer });

  } catch (error) {
    console.error('Error in ask-coach:', error);
    res.status(500).json({ 
      error: 'Failed to get coach response',
      details: error.message 
    });
  }
});

// ============================================================================
// NORMALISED / DURABILITY / STRESS ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/analytics/normalised
 * 
 * Get normalised metrics for activities.
 * Query params: userId, after, before, limit
 */
router.get('/normalised', async (req, res) => {
  try {
    const { userId, after, before, limit } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    // Build query
    let query = `
      SELECT 
        n.*,
        a.name,
        a.start_time,
        a.duration_s
      FROM activity_normalised n
      JOIN activities a ON n.activity_id = a.id
      WHERE n.user_id = ?
    `;
    const params = [parseInt(userId)];
    
    if (after) {
      query += ` AND a.start_time >= ?`;
      params.push(after);
    }
    
    if (before) {
      query += ` AND a.start_time <= ?`;
      params.push(before);
    }
    
    query += ` ORDER BY a.start_time DESC`;
    
    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit));
    }
    
    const results = db.prepare(query).all(...params);
    
    // Parse JSON fields
    const normalised = results.map(row => ({
      ...row,
      time_in_zones_power: row.time_in_zones_power ? JSON.parse(row.time_in_zones_power) : null,
      time_in_zones_hr: row.time_in_zones_hr ? JSON.parse(row.time_in_zones_hr) : null,
      longest_efforts_power: row.longest_efforts_power ? JSON.parse(row.longest_efforts_power) : null,
      longest_efforts_hr: row.longest_efforts_hr ? JSON.parse(row.longest_efforts_hr) : null,
      notes: row.notes ? JSON.parse(row.notes) : []
    }));
    
    res.json({
      ok: true,
      count: normalised.length,
      data: normalised
    });
    
  } catch (error) {
    console.error('[Analytics API] Error fetching normalised data:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch normalised data',
      details: error.message 
    });
  }
});

/**
 * GET /api/analytics/normalised/:activityId
 * 
 * Get normalised metrics for a specific activity.
 */
router.get('/normalised/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const result = db.prepare(`
      SELECT 
        n.*,
        a.name,
        a.start_time,
        a.duration_s
      FROM activity_normalised n
      JOIN activities a ON n.activity_id = a.id
      WHERE n.activity_id = ? AND n.user_id = ?
    `).get(activityId, parseInt(userId));
    
    if (!result) {
      return res.status(404).json({ 
        ok: false,
        error: 'Normalised data not found for this activity' 
      });
    }
    
    // Parse JSON fields
    const normalised = {
      ...result,
      time_in_zones_power: result.time_in_zones_power ? JSON.parse(result.time_in_zones_power) : null,
      time_in_zones_hr: result.time_in_zones_hr ? JSON.parse(result.time_in_zones_hr) : null,
      longest_efforts_power: result.longest_efforts_power ? JSON.parse(result.longest_efforts_power) : null,
      longest_efforts_hr: result.longest_efforts_hr ? JSON.parse(result.longest_efforts_hr) : null,
      notes: result.notes ? JSON.parse(result.notes) : []
    };
    
    res.json({
      ok: true,
      data: normalised
    });
    
  } catch (error) {
    console.error('[Analytics API] Error fetching normalised data:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch normalised data',
      details: error.message 
    });
  }
});

/**
 * GET /api/analytics/durability/:activityId
 * 
 * Get durability metrics for a specific activity.
 */
router.get('/durability/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const result = db.prepare(`
      SELECT 
        d.*,
        a.name,
        a.start_time,
        a.duration_s
      FROM activity_durability d
      JOIN activities a ON d.activity_id = a.id
      WHERE d.activity_id = ? AND d.user_id = ?
    `).get(activityId, parseInt(userId));
    
    if (!result) {
      return res.status(404).json({ 
        ok: false,
        error: 'Durability data not found for this activity' 
      });
    }
    
    // Parse JSON fields
    const durability = {
      ...result,
      late_zone_distribution: result.late_zone_distribution ? JSON.parse(result.late_zone_distribution) : null,
      notes: result.notes ? JSON.parse(result.notes) : []
    };
    
    res.json({
      ok: true,
      data: durability
    });
    
  } catch (error) {
    console.error('[Analytics API] Error fetching durability data:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch durability data',
      details: error.message 
    });
  }
});

/**
 * GET /api/analytics/stress/:activityId
 * 
 * Get stress classification for a specific activity.
 */
router.get('/stress/:activityId', async (req, res) => {
  try {
    const { activityId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const result = db.prepare(`
      SELECT 
        s.*,
        a.name,
        a.start_time,
        a.duration_s
      FROM activity_stress s
      JOIN activities a ON s.activity_id = a.id
      WHERE s.activity_id = ? AND s.user_id = ?
    `).get(activityId, parseInt(userId));
    
    if (!result) {
      return res.status(404).json({ 
        ok: false,
        error: 'Stress classification not found for this activity' 
      });
    }
    
    // Parse JSON fields and normalise types
    const stress = {
      ...result,
      evidence: result.evidence ? JSON.parse(result.evidence) : null,
      is_stochastic: !!result.is_stochastic,
      // Backward-compatible alias
      stress_type: result.primary_stress_type
    };
    
    res.json({
      ok: true,
      data: stress
    });
    
  } catch (error) {
    console.error('[Analytics API] Error fetching stress data:', error);
    res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch stress data',
      details: error.message 
    });
  }
});

/**
 * GET /api/analytics/weekly
 * 
 * Get weekly rollups for a user.
 * Query params: userId (dev only), after, before, limit
 */
router.get('/weekly', async (req, res) => {
  try {
    // Parse and validate parameters
    const userId = parseUserId(req);
    const limit = parseLimit(req, 12);
    const dateRange = parseDateRange(req);
    
    const options = {
      limit,
      ...dateRange
    };
    
    // Get rollups
    const rollups = getWeeklyRollups(userId, options);
    
    // Parse JSON fields and rename avg_quality_score to avg_quality_ratio
    const weeks = rollups.map(rollup => ({
      ...rollup,
      avg_quality_ratio: rollup.avg_quality_score, // Rename for API (0-1 ratio)
      avg_quality_score: undefined, // Remove old field
      tiz_power: rollup.tiz_power ? JSON.parse(rollup.tiz_power) : null,
      tiz_hr: rollup.tiz_hr ? JSON.parse(rollup.tiz_hr) : null,
      stress_dist: rollup.stress_dist ? JSON.parse(rollup.stress_dist) : null,
      notes: rollup.notes ? JSON.parse(rollup.notes) : null
    }));
    
    // Check for quality warnings
    const warnings = [];
    if (weeks.length > 0) {
      const avgQuality = weeks.reduce((sum, w) => sum + (w.avg_quality_ratio || 0), 0) / weeks.length;
      const qualityWarning = checkCoverage('LOW_WEEKLY_QUALITY', avgQuality, 0.9, 'weekly quality');
      if (qualityWarning) warnings.push(qualityWarning);
      
      const avgStreamsRate = weeks.reduce((sum, w) => {
        const total = w.activities_total || 1;
        const streams = w.activities_with_streams || 0;
        return sum + (streams / total);
      }, 0) / weeks.length;
      const streamsWarning = checkCoverage('LOW_STREAMS', avgStreamsRate, 0.9, 'streams');
      if (streamsWarning) warnings.push(streamsWarning);
    }
    
    res.json({
      ok: true,
      data: weeks,
      meta: {
        count: weeks.length,
        limit,
        after: dateRange.after || null,
        before: dateRange.before || null
      },
      warnings
    });
    
  } catch (error) {
    console.error('[Analytics API] Error fetching weekly rollups:', error);
    sendError(res, error);
  }
});

/**
 * POST /api/analytics/ensure-weekly
 * 
 * Safe endpoint for first-run / backfill.
 * Checks if athlete_weekly has rows; if not (or force=true), computes them.
 * Does NOT compute normalised/durability/stress — only weekly rollups.
 * Server-side 5-minute per-user cooldown prevents repeated heavy compute.
 * 
 * Body: { userId, weeksBack?, force? }
 */
const _ensureWeeklyCooldowns = new Map(); // userId → timestamp
const ENSURE_WEEKLY_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

router.post('/ensure-weekly', async (req, res) => {
  try {
    const userId = parseUserId(req);
    const weeksBack = req.body.weeksBack || 16;
    const force = req.body.force === true;
    
    // Server-side cooldown (skip if force)
    if (!force) {
      const lastRun = _ensureWeeklyCooldowns.get(userId);
      if (lastRun && (Date.now() - lastRun) < ENSURE_WEEKLY_COOLDOWN_MS) {
        console.log(`[Analytics API] ensure-weekly: server cooldown active for user ${userId}`);
        return res.json({
          ok: true,
          computed: 0,
          skipped: true,
          reason: 'server_cooldown'
        });
      }
    }
    
    const status = hasWeeklyRollups(userId);
    
    if (status.hasWeekly && !force) {
      console.log(`[Analytics API] ensure-weekly: user ${userId} already has ${status.count} weeks, skipping`);
      _ensureWeeklyCooldowns.set(userId, Date.now());
      return res.json({
        ok: true,
        computed: 0,
        skipped: true,
        reason: 'already_exists',
        existing: status.count,
        weeksBack
      });
    }
    
    console.log(`[Analytics API] ensure-weekly: computing ${weeksBack} weeks for user ${userId} (force=${force}, had=${status.count})`);
    
    const result = await computeWeeklyRollups(userId, { weeksBack });
    _ensureWeeklyCooldowns.set(userId, Date.now());
    
    res.json({
      ok: true,
      computed: result.computed,
      skipped: false,
      reason: force ? 'forced' : 'first_run',
      failed: result.failed,
      existing: status.count,
      weeksBack
    });
    
  } catch (error) {
    console.error('[Analytics API] Error in ensure-weekly:', error);
    sendError(res, error);
  }
});

/**
 * GET /api/analytics/trends
 * 
 * Get trend summary for a user.
 * Query params: userId (dev only), weeksBack
 */
router.get('/trends', async (req, res) => {
  try {
    // Parse and validate parameters
    const userId = parseUserId(req);
    const weeksBack = parseWeeksBack(req, 16);
    
    // Compute trend summary
    const trends = computeTrendSummary(userId, { weeksBack });
    
    // Extract metadata
    const meta = {
      weeksBack,
      computed_at: trends.computed_at,
      weeks_analyzed: trends.weeks_analyzed
    };
    
    // Remove metadata from trends object (move to meta)
    delete trends.computed_at;
    delete trends.weeks_analyzed;
    delete trends.recent_window;
    delete trends.prior_window;
    
    res.json({
      ok: true,
      data: trends,
      meta,
      warnings: []
    });
    
  } catch (error) {
    console.error('[Analytics API] Error computing trends:', error);
    sendError(res, error);
  }
});

/**
 * GET /api/analytics/insights
 * 
 * Get coaching insights for a user.
 * Query params: userId (dev only), weeksBack
 */
router.get('/insights', async (req, res) => {
  try {
    // Parse and validate parameters
    const userId = parseUserId(req);
    const weeksBack = parseWeeksBack(req, 16);
    
    // Generate insights
    const result = generateInsights(userId, { weeksBack });
    
    // Build warnings
    const warnings = [];
    
    // Check confidence
    if (result.confidence < 0.7) {
      warnings.push(createWarning(
        'LOW_INSIGHTS_CONFIDENCE',
        'warn',
        result.confidence,
        0.7,
        `Low insights confidence: ${(result.confidence * 100).toFixed(0)}% (threshold: 70%)`
      ));
    }
    
    // Rename coverage fields to use ratio naming
    const coverage = {
      avg_quality_ratio: result.coverage.avg_quality,
      streams_rate: result.coverage.streams_rate,
      power_rate: result.coverage.power_rate,
      hr_rate: result.coverage.hr_rate,
      weeks_available: result.coverage.weeks_available
    };
    
    res.json({
      ok: true,
      data: {
        confidence: result.confidence,
        coverage,
        insights: result.insights
      },
      meta: {
        weeksBack
      },
      warnings
    });
    
  } catch (error) {
    console.error('[Analytics API] Error generating insights:', error);
    sendError(res, error);
  }
});

/**
 * POST /api/analytics/recompute
 * 
 * Recompute analytics layers in deterministic order.
 * Query params: userId (dev only), after, before, limit
 * Body: { layers: ['normalised', 'durability', 'stress', 'weekly', 'trends', 'insights'] }
 * 
 * Layer execution order (deterministic):
 * normalised -> durability -> stress -> weekly -> trends -> insights
 * 
 * TODO: Add admin-only guard when auth is implemented
 */
router.post('/recompute', async (req, res) => {
  try {
    // Parse and validate parameters
    const userId = parseUserId(req);
    const { layers = ['normalised', 'durability', 'stress'] } = req.body;
    const dateRange = parseDateRange(req);
    const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
    
    const options = {
      after: dateRange.after ? new Date(dateRange.after) : undefined,
      before: dateRange.before ? new Date(dateRange.before) : undefined,
      limit,
      forceRecompute: true
    };
    
    // Define deterministic layer order and modes
    const LAYER_ORDER = ['normalised', 'durability', 'stress', 'weekly', 'trends', 'insights'];
    const LAYER_MODES = {
      normalised: 'stored',
      durability: 'stored',
      stress: 'stored',
      weekly: 'stored',
      trends: 'computed',
      insights: 'computed'
    };
    
    // Filter and order requested layers deterministically
    const layersRequested = layers.filter(l => LAYER_ORDER.includes(l));
    const layersExecuted = [];
    const layerResults = {};
    const warnings = [];
    
    // Execute layers in deterministic order
    for (const layer of LAYER_ORDER) {
      if (!layersRequested.includes(layer)) continue;
      
      layersExecuted.push(layer);
      
      try {
        switch (layer) {
          case 'normalised':
            console.log('[Analytics API] Recomputing normalised metrics...');
            const normResult = await runNormalisationForUser(userId, options);
            layerResults.normalised = normResult;
            if (!normResult.ok) {
              warnings.push(createWarning(
                'LAYER_FAILED',
                'warn',
                0,
                1,
                `Normalisation failed: ${normResult.error}`
              ));
            }
            break;
            
          case 'durability':
            console.log('[Analytics API] Recomputing durability metrics...');
            const durResult = await runDurabilityForUser(userId, {
              ...options,
              ensureNormalised: true
            });
            layerResults.durability = durResult;
            if (!durResult.ok) {
              warnings.push(createWarning(
                'LAYER_FAILED',
                'warn',
                0,
                1,
                `Durability failed: ${durResult.error}`
              ));
            }
            break;
            
          case 'stress':
            console.log('[Analytics API] Recomputing stress classification...');
            const stressResult = await runStressClassificationForUser(userId, {
              ...options,
              ensureNormalised: true,
              ensureDurability: true
            });
            layerResults.stress = stressResult;
            if (!stressResult.ok) {
              warnings.push(createWarning(
                'LAYER_FAILED',
                'warn',
                0,
                1,
                `Stress classification failed: ${stressResult.error}`
              ));
            }
            break;
            
          case 'weekly':
            console.log('[Analytics API] Recomputing weekly rollups...');
            const weeksBack = options.limit || 16;
            const weeklyResult = await computeWeeklyRollups(userId, { weeksBack });
            layerResults.weekly = {
              ok: weeklyResult.ok,
              computed: weeklyResult.computed,
              failed: weeklyResult.failed
            };
            if (weeklyResult.failed > 0) {
              warnings.push(createWarning(
                'LAYER_PARTIAL_FAILURE',
                'warn',
                weeklyResult.failed,
                0,
                `${weeklyResult.failed} weeks failed to compute`
              ));
            }
            break;
            
          case 'trends':
            console.log('[Analytics API] Computing trend summary...');
            const trendsWeeksBack = options.limit || 16;
            const trends = computeTrendSummary(userId, { weeksBack: trendsWeeksBack });
            layerResults.trends = {
              ok: true,
              summary: trends
            };
            break;
            
          case 'insights':
            console.log('[Analytics API] Generating coaching insights...');
            const insightsWeeksBack = options.limit || 16;
            const insightsResult = generateInsights(userId, { weeksBack: insightsWeeksBack });
            layerResults.insights = {
              ok: insightsResult.ok,
              confidence: insightsResult.confidence,
              count: insightsResult.insights.length
            };
            if (insightsResult.confidence < 0.7) {
              warnings.push(createWarning(
                'LOW_INSIGHTS_CONFIDENCE',
                'warn',
                insightsResult.confidence,
                0.7,
                `Low insights confidence: ${(insightsResult.confidence * 100).toFixed(0)}% (threshold: 70%)`
              ));
            }
            break;
        }
      } catch (error) {
        layerResults[layer] = { ok: false, error: error.message };
        warnings.push(createWarning(
          'LAYER_FAILED',
          'warn',
          0,
          1,
          `${layer} failed: ${error.message}`
        ));
      }
    }
    
    // Get status for stored layers
    const status = {
      normalised: getNormalisationStatus(userId),
      durability: getDurabilityStatus(userId),
      stress: getStressClassificationStatus(userId)
    };
    
    // Check for coverage warnings (stored layers only)
    const normCoverage = parseFloat(status.normalised.coverage) / 100;
    const coverageWarning1 = checkCoverage('LOW_COVERAGE_NORMALISED', normCoverage, 0.9, 'normalisation');
    if (coverageWarning1) warnings.push(coverageWarning1);
    
    const durCoverage = parseFloat(status.durability.coverage) / 100;
    const coverageWarning2 = checkCoverage('LOW_COVERAGE_DURABILITY', durCoverage, 0.9, 'durability');
    if (coverageWarning2) warnings.push(coverageWarning2);
    
    const stressCoverage = parseFloat(status.stress.coverage) / 100;
    const coverageWarning3 = checkCoverage('LOW_COVERAGE_STRESS', stressCoverage, 0.9, 'stress');
    if (coverageWarning3) warnings.push(coverageWarning3);
    
    // Check weekly rollup quality if computed
    if (layersExecuted.includes('weekly') || layersExecuted.includes('insights')) {
      const rollups = getWeeklyRollups(userId, { limit: 4 });
      if (rollups.length > 0) {
        const avgQuality = rollups.reduce((sum, w) => sum + (w.avg_quality_score || 0), 0) / rollups.length;
        const qualityWarning = checkCoverage('LOW_WEEKLY_QUALITY', avgQuality, 0.9, 'weekly quality');
        if (qualityWarning) warnings.push(qualityWarning);
        
        const avgStreamsRate = rollups.reduce((sum, w) => {
          const total = w.activities_total || 1;
          const streams = w.activities_with_streams || 0;
          return sum + (streams / total);
        }, 0) / rollups.length;
        const streamsWarning = checkCoverage('LOW_STREAMS', avgStreamsRate, 0.9, 'streams');
        if (streamsWarning) warnings.push(streamsWarning);
      }
    }
    
    // Build layer mode map
    const layerModeByLayer = {};
    for (const layer of layersExecuted) {
      layerModeByLayer[layer] = LAYER_MODES[layer];
    }
    
    res.json({
      ok: true,
      data: layerResults,
      meta: {
        layersRequested,
        layersExecuted,
        layerModeByLayer,
        status
      },
      warnings
    });
    
  } catch (error) {
    console.error('[Analytics API] Error recomputing metrics:', error);
    sendError(res, error);
  }
});

// ─── POST /api/analytics/recompute-window ────────────────────────────────────
//
// Runs normalisation → stress → durability ONLY for activities that:
//   - Have a row in activity_streams, AND
//   - start_time >= start_date (default '2025-01-01') OR are race-tagged
//
// Does NOT trigger activity import, FTP/FTHR compute, or weekly recompute.
//
// Body (all optional):
//   start_date           string  default '2025-01-01'
//   include_race_tagged  bool    default true
//   force_recompute      bool    default false

router.post('/recompute-window', async (req, res) => {
  try {
    const userId = parseUserId(req);
    const startDate = req.body?.start_date || '2025-01-01';
    const includeRaceTagged = req.body?.include_race_tagged !== false;
    const forceRecompute = req.body?.force_recompute === true;

    // Collect activity IDs that have streams AND are in scope
    const inWindowIds = db.prepare(`
      SELECT st.activity_id
      FROM activity_streams st
      JOIN activities a ON a.id = st.activity_id
      WHERE st.user_id = ?
        AND DATE(a.start_time) >= ?
    `).all(userId, startDate).map(r => r.activity_id);

    let raceTaggedIds = [];
    if (includeRaceTagged) {
      raceTaggedIds = db.prepare(`
        SELECT st.activity_id
        FROM activity_streams st
        JOIN activities a ON a.id = st.activity_id
        JOIN activity_sources s ON s.activity_id = st.activity_id AND s.provider = 'strava'
        JOIN race_tags rt ON rt.activity_id = s.provider_id
                         AND rt.user_id = s.user_id
                         AND rt.activity_source = 'strava'
                         AND rt.is_race = 1
        WHERE st.user_id = ?
          AND DATE(a.start_time) < ?
      `).all(userId, startDate).map(r => r.activity_id);
    }

    const allIds = [...new Set([...inWindowIds, ...raceTaggedIds])];

    if (allIds.length === 0) {
      return res.json({
        ok: true,
        message: 'No activities with streams found in scope window.',
        scope: { start_date: startDate, include_race_tagged: includeRaceTagged },
        counts: { in_scope: 0 },
        normalised: { computed: 0 },
        stress: { computed: 0 },
        durability: { computed: 0 }
      });
    }

    console.log(`[Analytics API] recompute-window: ${allIds.length} activities in scope (${inWindowIds.length} in-window, ${raceTaggedIds.length} race-tagged)`);

    const opts = { forceRecompute, activityIds: allIds };

    const normResult  = await runNormalisationForUser(userId, opts);
    const stressResult = await runStressClassificationForUser(userId, opts);
    const durResult   = await runDurabilityForUser(userId, opts);

    return res.json({
      ok: true,
      scope: { start_date: startDate, include_race_tagged: includeRaceTagged },
      counts: {
        in_scope: allIds.length,
        in_window: inWindowIds.length,
        race_tagged_extra: raceTaggedIds.length
      },
      normalised: {
        computed: normResult?.stats?.computed ?? 0,
        skipped:  normResult?.stats?.skipped  ?? 0,
        errors:   normResult?.stats?.errors   ?? 0
      },
      stress: {
        computed: stressResult?.stats?.computed ?? 0,
        errors:   stressResult?.stats?.errors   ?? 0
      },
      durability: {
        computed: durResult?.stats?.computed ?? 0,
        errors:   durResult?.stats?.errors   ?? 0
      }
    });
  } catch (err) {
    console.error('[Analytics API] recompute-window error:', err);
    sendError(res, err);
  }
});

export default router;
