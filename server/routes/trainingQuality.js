/**
 * Training Quality v1 API Routes
 *
 * GET  /api/training-quality/week?iso_week=YYYY-WW   — Score a specific week
 * POST /api/training-quality/recompute               — Batch recompute range
 */

import express from 'express';
import { sessionDb, userDb } from '../db.js';
import {
  isoWeekToMonday,
  computeTrainingQuality,
  recomputeTrainingQualityRange,
} from '../services/trainingQualityService.js';
import { getResolvedBlockFocus } from '../services/blockFocusService.js';
import { getWeekStart } from '../services/weeklyAggregator.js';

const router = express.Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  const session = sessionDb.findByToken(token);
  if (!session) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  const user = userDb.findById(session.user_id);
  if (!user) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  req.user = { id: user.id, email: user.email };
  next();
}

// ─── GET /api/training-quality/week ──────────────────────────────────────────
// Query: ?iso_week=YYYY-WW  OR  ?iso_week=YYYY-MM-DD  (Monday date also accepted)
// Computes on demand and persists result.

router.get('/week', requireAuth, (req, res) => {
  const athleteId = req.user.id;
  const { iso_week } = req.query;

  if (!iso_week) {
    // Default to current week
    const weekStart = getWeekStart(new Date().toISOString());
    return handleWeek(athleteId, weekStart, res);
  }

  const weekStart = isoWeekToMonday(iso_week);
  if (!weekStart) {
    return res.status(400).json({
      ok: false,
      error: { code: 'INVALID_WEEK', message: `Cannot parse iso_week: "${iso_week}". Use YYYY-WNN or YYYY-MM-DD.` },
    });
  }

  handleWeek(athleteId, weekStart, res);
});

function handleWeek(athleteId, weekStart, res) {
  try {
    const result = computeTrainingQuality(athleteId, weekStart);
    res.json(result);
  } catch (err) {
    console.error('[TrainingQuality] week error:', err);
    res.status(500).json({ ok: false, error: { code: 'COMPUTE_ERROR', message: err.message } });
  }
}

// ─── POST /api/training-quality/recompute ────────────────────────────────────
// Body: { from: "YYYY-WW"|"YYYY-MM-DD", to: "YYYY-WW"|"YYYY-MM-DD" }
// Defaults: last 8 weeks if from/to omitted.

router.post('/recompute', requireAuth, (req, res) => {
  const athleteId = req.user.id;
  const { from, to } = req.body || {};

  let fromWeekStart, toWeekStart;

  if (from) {
    fromWeekStart = isoWeekToMonday(from);
    if (!fromWeekStart) return res.status(400).json({ ok: false, error: { code: 'INVALID_FROM', message: `Cannot parse from: "${from}"` } });
  } else {
    // Default: 8 weeks back
    fromWeekStart = getWeekStart(new Date(Date.now() - 8 * 7 * 86400000).toISOString());
  }

  if (to) {
    toWeekStart = isoWeekToMonday(to);
    if (!toWeekStart) return res.status(400).json({ ok: false, error: { code: 'INVALID_TO', message: `Cannot parse to: "${to}"` } });
  } else {
    toWeekStart = getWeekStart(new Date().toISOString());
  }

  if (fromWeekStart > toWeekStart) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_RANGE', message: 'from must be <= to' } });
  }

  try {
    const result = recomputeTrainingQualityRange(athleteId, fromWeekStart, toWeekStart);
    res.json(result);
  } catch (err) {
    console.error('[TrainingQuality] recompute error:', err);
    res.status(500).json({ ok: false, error: { code: 'RECOMPUTE_ERROR', message: err.message } });
  }
});

// ─── GET /api/training-quality/block-focus ───────────────────────────────────
// Returns the current block focus without computing a week score.

router.get('/block-focus', requireAuth, (req, res) => {
  const focus = getResolvedBlockFocus(req.user.id);
  res.json({ ok: true, block_focus: focus });
});

// ─── GET /api/training-quality/focus ─────────────────────────────────────────
// Returns the resolved block focus with source metadata.
// Query: ?as_of=YYYY-MM-DD  (defaults to today)

router.get('/focus', requireAuth, (req, res) => {
  const asOf = req.query.as_of || new Date().toISOString().slice(0, 10);
  if (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return res.status(400).json({ ok: false, error: { code: 'INVALID_DATE', message: 'as_of must be YYYY-MM-DD' } });
  }
  try {
    const focus = getResolvedBlockFocus(req.user.id, asOf);
    res.json({ ok: true, as_of: asOf, ...focus });
  } catch (err) {
    console.error('[TrainingQuality] focus error:', err);
    res.status(500).json({ ok: false, error: { code: 'FOCUS_ERROR', message: err.message } });
  }
});

export default router;
