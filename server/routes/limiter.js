/**
 * Limiter Engine v1 API Routes
 *
 * POST /api/limiter/race-debrief          — Submit/update race debrief answers
 * POST /api/limiter/update-from-race      — Run limiter update for a race activity
 * GET  /api/limiter/profile               — Get current limiter profile
 * GET  /api/limiter/recommendation        — Get block-focus recommendation
 */

import express from 'express';
import { sessionDb, userDb } from '../db.js';
import db from '../db.js';
import {
  updateFromRace,
  computeLimiterSignals,
  computeDecayFromLast3,
  rankLimiters,
  LIMITERS,
} from '../services/limiterEngineService.js';

const router = express.Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
  const session = sessionDb.findByToken(token);
  if (!session) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } });
  const user = userDb.findById(session.user_id);
  if (!user) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'User not found' } });
  req.user = { id: user.id, email: user.email };
  next();
}

// ─── POST /api/limiter/race-debrief ──────────────────────────────────────────
// Body: { activity_id, answers: { felt_limited_by?, felt_strong_in?, perceived_exertion?, ... } }
// Idempotent: upserts on activity_id.

router.post('/race-debrief', requireAuth, (req, res) => {
  const athleteId = req.user.id;
  const { activity_id, answers } = req.body || {};

  if (!activity_id) return res.status(400).json({ ok: false, error: { code: 'MISSING_ACTIVITY_ID' } });
  if (!answers || typeof answers !== 'object') return res.status(400).json({ ok: false, error: { code: 'MISSING_ANSWERS' } });

  // Verify activity belongs to this user
  const activity = db.prepare(`SELECT id FROM activities WHERE id = ? AND user_id = ?`).get(activity_id, athleteId);
  if (!activity) return res.status(404).json({ ok: false, error: { code: 'ACTIVITY_NOT_FOUND' } });

  const now = new Date().toISOString();
  const answersJson = JSON.stringify(answers);

  db.prepare(`
    INSERT INTO race_debrief (athlete_id, activity_id, answers_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(activity_id) DO UPDATE SET
      answers_json = excluded.answers_json,
      updated_at   = excluded.updated_at
  `).run(athleteId, activity_id, answersJson, now, now);

  res.json({ ok: true, activity_id, answers });
});

// ─── POST /api/limiter/update-from-race ──────────────────────────────────────
// Query: ?activity_id=...
// Idempotent: calling multiple times for same activity_id yields identical result.

router.post('/update-from-race', requireAuth, (req, res) => {
  const athleteId = req.user.id;
  const activityId = req.query.activity_id || req.body?.activity_id;

  if (!activityId) return res.status(400).json({ ok: false, error: { code: 'MISSING_ACTIVITY_ID' } });

  // Verify activity belongs to this user
  const activity = db.prepare(`SELECT id, user_id FROM activities WHERE id = ? AND user_id = ?`).get(activityId, athleteId);
  if (!activity) return res.status(404).json({ ok: false, error: { code: 'ACTIVITY_NOT_FOUND' } });

  try {
    const result = updateFromRace(athleteId, activityId);
    if (!result.ok) {
      const status = result.error === 'NOT_RACE_TAGGED' ? 400 : 422;
      return res.status(status).json({ ok: false, error: { code: result.error } });
    }
    res.json(result);
  } catch (err) {
    console.error('[Limiter] update-from-race error:', err);
    res.status(500).json({ ok: false, error: { code: 'ENGINE_ERROR', message: err.message } });
  }
});

// ─── GET /api/limiter/profile ─────────────────────────────────────────────────
// Query: ?includeSnapshots=N (default 0, max 10)

router.get('/profile', requireAuth, (req, res) => {
  const athleteId = req.user.id;
  const includeSnapshots = Math.min(parseInt(req.query.includeSnapshots || '0', 10), 10);

  try {
    const profileRow = db.prepare(`SELECT profile_json, updated_at FROM limiter_profile_current WHERE athlete_id = ?`).get(athleteId);

    if (!profileRow) {
      return res.json({
        ok: true,
        profile: null,
        message: 'No limiter profile yet — run Full Sync and mark a race activity to generate one.',
        snapshots: [],
      });
    }

    let profile;
    try { profile = JSON.parse(profileRow.profile_json); }
    catch { return res.status(500).json({ ok: false, error: { code: 'CORRUPT_PROFILE' } }); }

    // Attach decay stats for transparency
    const decayStats = computeDecayFromLast3(athleteId);

    // Enrich per-limiter with final_score for display
    const RACE_IMPACT_WEIGHT = { ACCELERATION_REPEATABILITY: 1.0, THRESHOLD_UNDER_STRESS: 0.95, LATE_RACE_RESILIENCE: 0.90, VO2_CAPACITY_CEILING: 0.85, EXPOSURE_SENSITIVITY: 0.70 };
    const limiterDetails = {};
    for (const l of LIMITERS) {
      const entry = profile[l] || {};
      limiterDetails[l] = {
        severity:            entry.severity || 0,
        confidence:          entry.confidence || 0,
        final_score:         ((entry.severity || 0) * (entry.confidence || 0) * RACE_IMPACT_WEIGHT[l]),
        absent_count:        entry.absent_count || 0,
        last_flagged_race_id: entry.last_flagged_race_id || null,
        last_flagged_date:   entry.last_flagged_date || null,
        evidence_json:       entry.evidence_json || null,
        decay_last3:         decayStats[l],
      };
    }

    let snapshots = [];
    if (includeSnapshots > 0) {
      const rows = db.prepare(`
        SELECT source_activity_id, profile_json, created_at
        FROM limiter_profile_snapshots
        WHERE athlete_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(athleteId, includeSnapshots);

      snapshots = rows.map(r => {
        try { return { source_activity_id: r.source_activity_id, profile: JSON.parse(r.profile_json), created_at: r.created_at }; }
        catch { return { source_activity_id: r.source_activity_id, profile: null, created_at: r.created_at }; }
      });
    }

    res.json({
      ok: true,
      as_of_date:        profile.as_of_date || profileRow.updated_at,
      primary_limiter:   profile.primary_limiter || null,
      secondary_limiter: profile.secondary_limiter || null,
      algo_version:      profile.algo_version || null,
      limiters:          limiterDetails,
      snapshots,
    });
  } catch (err) {
    console.error('[Limiter] profile error:', err);
    res.status(500).json({ ok: false, error: { code: 'PROFILE_ERROR', message: err.message } });
  }
});

// ─── GET /api/limiter/recommendation ─────────────────────────────────────────
// Query: ?next_anchor_race_id=... (optional, for future use)

router.get('/recommendation', requireAuth, (req, res) => {
  const athleteId = req.user.id;

  try {
    const profileRow = db.prepare(`SELECT profile_json FROM limiter_profile_current WHERE athlete_id = ?`).get(athleteId);

    if (!profileRow) {
      return res.json({
        ok: true,
        recommendation: null,
        message: 'No limiter profile yet — mark a race activity and call update-from-race first.',
      });
    }

    let profile;
    try { profile = JSON.parse(profileRow.profile_json); }
    catch { return res.status(500).json({ ok: false, error: { code: 'CORRUPT_PROFILE' } }); }

    const primary   = profile.primary_limiter   || null;
    const secondary = profile.secondary_limiter || null;

    if (!primary) {
      return res.json({ ok: true, recommendation: null, message: 'Insufficient race data to determine limiter.' });
    }

    const FOCUS_TYPE_MAP = {
      ACCELERATION_REPEATABILITY: 'ACCEL_REPEAT_BLOCK',
      THRESHOLD_UNDER_STRESS:     'THRESHOLD_STRESS_BLOCK',
      LATE_RACE_RESILIENCE:       'LATE_RACE_BLOCK',
      VO2_CAPACITY_CEILING:       'VO2_CEILING_BLOCK',
      EXPOSURE_SENSITIVITY:       'EXPOSURE_BLOCK',
    };
    const WHAT_CHANGED_MAP = {
      ACCELERATION_REPEATABILITY: ['Sprint repeatability identified as primary limiter', 'Surge count and stochasticity below race threshold', 'Variability index elevated during race effort'],
      THRESHOLD_UNDER_STRESS:     ['Sustained threshold output under race stress is limiting', 'Threshold block count and duration below target', 'NP/FTP ratio indicates pacing conservatism under pressure'],
      LATE_RACE_RESILIENCE:       ['Power fade in final third exceeds acceptable range', 'Late-race efficiency drop detected', 'HR drift indicates cardiac fatigue accumulation'],
      VO2_CAPACITY_CEILING:       ['VO2max zone exposure limited during race', 'Aerobic ceiling preventing higher sustained output', 'HR ceiling not reached — VO2 capacity underutilised'],
      EXPOSURE_SENSITIVITY:       ['Race-condition sensitivity detected as secondary factor', 'High variability and HR drift suggest context sensitivity', 'Tactical exposure to race dynamics needs development'],
    };
    const TACTICAL_NOTES_MAP = {
      ACCELERATION_REPEATABILITY: ['Include 8–12 sprint efforts with 30–60s recovery in weekly sessions', 'Prioritise group rides with repeated surges over steady-state work'],
      THRESHOLD_UNDER_STRESS:     ['Add race-simulation blocks: 2×20min at 90–95% FTP with race-pace surges', 'Practice holding threshold power after VO2 efforts'],
      LATE_RACE_RESILIENCE:       ['Build durability with 3h+ rides at 70–75% FTP before adding intensity', 'Include "fade-resistance" sets: hard effort in final 20% of long ride'],
      VO2_CAPACITY_CEILING:       ['Add 3–5min VO2max intervals (2–4 reps) twice per week', 'Short hill repeats (3–5min) at maximal aerobic power'],
      EXPOSURE_SENSITIVITY:       ['Increase race-simulation exposure: criteriums, group rides, mass-start events', 'Practice tactical positioning and surge response in training races', 'Note: this is a context modifier — address primary limiter first'],
    };

    const tacticalNotes = [...TACTICAL_NOTES_MAP[primary]];
    if (secondary === 'EXPOSURE_SENSITIVITY') tacticalNotes.push(...TACTICAL_NOTES_MAP.EXPOSURE_SENSITIVITY);

    const recommendation = {
      primary_limiter:   primary,
      secondary_limiter: secondary || null,
      focus_type:        FOCUS_TYPE_MAP[primary],
      what_changed:      WHAT_CHANGED_MAP[primary].slice(0, 3),
      tactical_notes:    tacticalNotes,
      algo_version:      profile.algo_version || 'limiter_v1',
    };

    res.json({ ok: true, recommendation });
  } catch (err) {
    console.error('[Limiter] recommendation error:', err);
    res.status(500).json({ ok: false, error: { code: 'RECOMMENDATION_ERROR', message: err.message } });
  }
});

export default router;
