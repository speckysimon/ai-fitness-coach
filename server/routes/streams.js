/**
 * Streams Routes
 *
 * POST /api/streams/backfill  — Run one bounded batch of streams backfill (Strava only)
 * GET  /api/streams/status    — Current backfill progress + activity_streams counts
 *
 * Guardrails:
 * - Does NOT trigger activity import, FTP/FTHR compute, or weekly recompute.
 * - Does NOT bypass Strava cooldowns (uses runFullSyncBackfill which respects rate limits).
 * - Date scoping is code-level (getBackfillCandidates opts), never DB flag hacks.
 */

import express from 'express';
import { sessionDb, userDb, providerSyncStateDb } from '../db.js';
import db from '../db.js';
import { runFullSyncBackfill, getBackfillCandidates } from '../services/streamIngestionService.js';
import { stravaService } from '../services/stravaService.js';

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

// ─── POST /api/streams/backfill ───────────────────────────────────────────────
//
// Runs one batch of streams backfill for the authenticated user.
// Body (all optional):
//   start_date         string  default '2025-01-01'
//   include_race_tagged bool   default true
//   max_candidates     number  default 100 (capped by STRAVA_STREAMS_BATCH_SIZE env)
//
// Returns backfill summary + current provider_sync_state counters.

router.post('/backfill', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  const startDate = req.body?.start_date || '2025-01-01';
  const includeRaceTagged = req.body?.include_race_tagged !== false;

  try {
    // Get Strava access token
    const stravaToken = await stravaService.getValidAccessToken(userId);
    if (!stravaToken) {
      return res.status(400).json({
        ok: false,
        error: { code: 'NO_STRAVA_TOKEN', message: 'No valid Strava access token. Reconnect Strava.' }
      });
    }

    // Snapshot candidate count before run (for response context)
    const candidatesBefore = getBackfillCandidates(userId, { startDate, includeRaceTagged });

    // Run one bounded batch (respects PER_RUN_CAP / STRAVA_STREAMS_BATCH_SIZE)
    const result = await runFullSyncBackfill(userId, stravaToken, { startDate, includeRaceTagged });

    // Read updated state counters
    const state = providerSyncStateDb.get(userId, 'strava') || {};

    // Count streams in scope window for quick sanity
    const streamsInWindow = db.prepare(`
      SELECT COUNT(*) as n
      FROM activity_streams st
      JOIN activities a ON a.id = st.activity_id
      WHERE st.user_id = ?
        AND DATE(a.start_time) >= ?
    `).get(userId, startDate).n;

    return res.json({
      ok: true,
      scope: { start_date: startDate, include_race_tagged: includeRaceTagged },
      run: {
        total_candidates: candidatesBefore.length,
        processed_this_run: result.processed_this_run,
        stored: result.stored,
        unavailable: result.unavailable,
        errors: result.errors,
        rate_limited: result.rate_limited,
        is_complete: result.is_complete,
        duration_ms: result.durationMs
      },
      counters: {
        completed: state.streams_backfill_completed || 0,
        failed: state.streams_backfill_failed || 0,
        total_candidates: state.streams_backfill_total_candidates || 0,
        remaining: candidatesBefore.length - result.processed_this_run,
        is_complete: state.streams_backfill_is_complete === 1,
        last_run_at: state.streams_backfill_last_run_at || null,
        last_error: state.streams_backfill_last_error || null
      },
      streams_in_window: streamsInWindow
    });
  } catch (err) {
    console.error('[Streams API] Backfill error:', err);
    return res.status(500).json({ ok: false, error: { code: 'BACKFILL_FAILED', message: err.message } });
  }
});

// ─── GET /api/streams/status ──────────────────────────────────────────────────
//
// Returns current backfill progress counters and activity_streams counts.
// Query params:
//   start_date  string  default '2025-01-01'  (for in-window count)

router.get('/status', requireAuth, (req, res) => {
  const userId = req.user.id;
  const startDate = req.query.start_date || '2025-01-01';

  try {
    const stravaState = providerSyncStateDb.get(userId, 'strava') || {};

    // Candidate count (remaining work)
    const candidates = getBackfillCandidates(userId, { startDate, includeRaceTagged: true });

    // Streams stored in scope window
    const streamsInWindow = db.prepare(`
      SELECT COUNT(*) as n
      FROM activity_streams st
      JOIN activities a ON a.id = st.activity_id
      WHERE st.user_id = ?
        AND DATE(a.start_time) >= ?
    `).get(userId, startDate).n;

    // Total streams for user
    const streamsTotal = db.prepare(
      `SELECT COUNT(*) as n FROM activity_streams WHERE user_id = ?`
    ).get(userId).n;

    return res.json({
      ok: true,
      scope: { start_date: startDate },
      strava: {
        backfill_enabled: stravaState.streams_backfill_enabled === 1,
        total_candidates: stravaState.streams_backfill_total_candidates || 0,
        completed: stravaState.streams_backfill_completed || 0,
        failed: stravaState.streams_backfill_failed || 0,
        is_complete: stravaState.streams_backfill_is_complete === 1,
        last_run_at: stravaState.streams_backfill_last_run_at || null,
        last_error: stravaState.streams_backfill_last_error || null,
        remaining_candidates: candidates.length
      },
      activity_streams: {
        total: streamsTotal,
        in_window: streamsInWindow
      }
    });
  } catch (err) {
    console.error('[Streams API] Status error:', err);
    return res.status(500).json({ ok: false, error: { code: 'STATUS_FAILED', message: err.message } });
  }
});

export default router;
