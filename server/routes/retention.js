import express from 'express';
import { sessionDb } from '../db.js';
import { recomputeMonthlyAggregates, getMonthlySummaries, getMonthlyBests } from '../services/aggregationService.js';
import { pruneOldActivities, getPrunePreview, getArchiveIndex } from '../services/pruneService.js';

const router = express.Router();

/**
 * POST /api/retention/aggregate
 * Compute monthly aggregates for a user
 * Body: { months?: Array<{year, month}> } - If omitted, computes all months
 */
router.post('/aggregate', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { months } = req.body;

    console.log(`📊 [API] Computing aggregates for user ${session.user_id}`);

    const result = recomputeMonthlyAggregates(session.user_id, months);

    res.json(result);
  } catch (error) {
    console.error('❌ Aggregate error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/retention/summaries
 * Get monthly summaries for AI context
 * Query: ?months=12 (default)
 */
router.get('/summaries', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const monthsBack = parseInt(req.query.months) || 12;

    const summaries = getMonthlySummaries(session.user_id, monthsBack);
    const bests = getMonthlyBests(session.user_id, monthsBack);

    res.json({
      success: true,
      summaries,
      bests
    });
  } catch (error) {
    console.error('❌ Summaries error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/retention/prune/preview
 * Preview what would be pruned (dry run)
 * Body: { cutoffDays?: 180 }
 */
router.post('/prune/preview', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { cutoffDays = 180 } = req.body;

    const preview = getPrunePreview(session.user_id, cutoffDays);

    res.json(preview);
  } catch (error) {
    console.error('❌ Prune preview error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/retention/prune
 * Execute pruning of old activities
 * Body: { cutoffDays?: 180, createArchiveIndex?: true }
 */
router.post('/prune', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const { cutoffDays = 180, createArchiveIndex = true } = req.body;

    console.log(`🗑️  [API] Pruning activities for user ${session.user_id}, cutoff: ${cutoffDays}d`);

    const result = pruneOldActivities(session.user_id, {
      cutoffDays,
      createArchiveIndex,
      dryRun: false
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Prune error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/retention/archive
 * Get archive index for pruned activities
 * Query: ?year=2024&month=1&limit=100
 */
router.get('/archive', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const year = req.query.year ? parseInt(req.query.year) : undefined;
    const month = req.query.month ? parseInt(req.query.month) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;

    const archive = getArchiveIndex(session.user_id, { year, month, limit });

    res.json({
      success: true,
      archive,
      count: archive.length
    });
  } catch (error) {
    console.error('❌ Archive error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/retention/context
 * Get tiered AI context: recent detailed + monthly summaries
 * This is the new AI-optimized data shape
 */
router.get('/context', async (req, res) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Import activity storage service
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { getActivities } = require('../services/activityStorageService.js');

    // Tiered context:
    // 1. Recent detailed (90d) - ride-level granularity
    // 2. Recent context (180d) - weekly rollups
    // 3. Long-term (12mo) - monthly aggregates

    const recentDetailed = getActivities(session.user_id, { windowDays: 90 });
    const recentContext = getActivities(session.user_id, { windowDays: 180 });
    const monthlySummaries = getMonthlySummaries(session.user_id, 12);
    const monthlyBests = getMonthlyBests(session.user_id, 12);

    // Compute weekly rollups for 90-180d window
    const contextActivities = recentContext.data || [];
    const cutoff90d = new Date();
    cutoff90d.setDate(cutoff90d.getDate() - 90);
    
    const weeklyRollups = computeWeeklyRollups(
      contextActivities.filter(a => new Date(a.date) < cutoff90d)
    );

    res.json({
      success: true,
      context: {
        recentDetailed: {
          windowDays: 90,
          activities: recentDetailed.data || [],
          count: (recentDetailed.data || []).length
        },
        recentContext: {
          windowDays: 180,
          weeklyRollups,
          weekCount: weeklyRollups.length
        },
        longTerm: {
          months: 12,
          summaries: monthlySummaries,
          bests: monthlyBests
        }
      },
      tokenEstimate: estimateTokens(recentDetailed.data, weeklyRollups, monthlySummaries)
    });
  } catch (error) {
    console.error('❌ Context error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Compute weekly rollups for activities
 */
function computeWeeklyRollups(activities) {
  const weeks = {};

  for (const act of activities) {
    const date = new Date(act.date);
    const weekKey = getWeekKey(date);
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        week: weekKey,
        activities: 0,
        totalTSS: 0,
        totalDuration: 0,
        totalDistance: 0,
        avgPower: [],
        avgHR: []
      };
    }

    weeks[weekKey].activities++;
    weeks[weekKey].totalTSS += act.tss || 0;
    weeks[weekKey].totalDuration += act.duration || 0;
    weeks[weekKey].totalDistance += act.distance || 0;
    if (act.avgPower) weeks[weekKey].avgPower.push(act.avgPower);
    if (act.avgHeartRate) weeks[weekKey].avgHR.push(act.avgHeartRate);
  }

  // Compute averages
  return Object.values(weeks).map(w => ({
    week: w.week,
    activities: w.activities,
    totalTSS: Math.round(w.totalTSS),
    totalDuration: w.totalDuration,
    totalDistance: w.totalDistance,
    avgPower: w.avgPower.length > 0 ? Math.round(w.avgPower.reduce((a, b) => a + b, 0) / w.avgPower.length) : null,
    avgHR: w.avgHR.length > 0 ? Math.round(w.avgHR.reduce((a, b) => a + b, 0) / w.avgHR.length) : null
  })).sort((a, b) => b.week.localeCompare(a.week));
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Estimate token count for AI context
 */
function estimateTokens(recentActivities, weeklyRollups, monthlySummaries) {
  // Rough estimate: 1 activity ≈ 50 tokens, 1 week ≈ 30 tokens, 1 month ≈ 40 tokens
  const activityTokens = (recentActivities || []).length * 50;
  const weeklyTokens = weeklyRollups.length * 30;
  const monthlyTokens = monthlySummaries.length * 40;
  
  return {
    recentDetailed: activityTokens,
    recentContext: weeklyTokens,
    longTerm: monthlyTokens,
    total: activityTokens + weeklyTokens + monthlyTokens,
    reduction: `~${Math.round((1 - (activityTokens + weeklyTokens + monthlyTokens) / ((recentActivities || []).length * 50 + weeklyRollups.length * 50 + monthlySummaries.length * 50)) * 100)}% vs flat activity list`
  };
}

export default router;
