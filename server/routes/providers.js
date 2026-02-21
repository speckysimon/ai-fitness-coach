/**
 * Provider Sync Routes
 * 
 * POST /api/providers/full-sync   — Full historical sync (user-triggered only)
 * POST /api/providers/sync         — Incremental sync (safe for auto-triggers)
 */

import express from 'express';
import { runSync } from '../services/fullSyncService.js';
import { sessionDb, userDb, providerSyncStateDb } from '../db.js';
import { isStreamIngestionEnabled } from '../services/streamIngestionService.js';

const router = express.Router();

/**
 * Auth middleware — populates req.user from session token
 */
function requireAuth(req, res, next) {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
  }

  const session = sessionDb.findByToken(sessionToken);
  if (!session) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'Invalid session' } });
  }

  const user = userDb.findById(session.user_id);
  if (!user) {
    return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED', message: 'User not found' } });
  }

  req.user = { id: user.id, email: user.email, name: user.name };
  next();
}

/**
 * POST /api/providers/full-sync
 * 
 * Full historical sync — paginates through ALL provider history.
 * Only triggered by the Full Sync button (never on page load).
 * 
 * Body: { providers?: ["strava","intervals"] }
 * 
 * Returns structured result with fetched/upserted/canonical counts.
 */
router.post('/full-sync', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { providers } = req.body || {};

  console.log(`[Providers API] Full sync requested by user ${userId} (${req.user.email})`);

  try {
    const result = await runSync(userId, {
      providers: providers || ['strava', 'intervals'],
      mode: 'full'
    });

    if (!result.ok && result.error === 'COOLDOWN') {
      return res.status(429).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[Providers API] Full sync error:', error);
    res.status(500).json({
      ok: false,
      error: { code: 'SYNC_FAILED', message: error.message }
    });
  }
});

/**
 * POST /api/providers/sync
 * 
 * Incremental sync — fetches only recent activities since last sync.
 * Safe for auto-triggers (page load, refresh button).
 * 
 * Body: { providers?: ["strava","intervals"] }
 */
router.post('/sync', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { providers } = req.body || {};

  console.log(`[Providers API] Incremental sync requested by user ${userId} (${req.user.email})`);

  try {
    const result = await runSync(userId, {
      providers: providers || ['strava', 'intervals'],
      mode: 'incremental'
    });

    res.json(result);
  } catch (error) {
    console.error('[Providers API] Incremental sync error:', error);
    res.status(500).json({
      ok: false,
      error: { code: 'SYNC_FAILED', message: error.message }
    });
  }
});

/**
 * GET /api/providers/sync-status
 * 
 * Returns current sync state + streams backfill progress for all providers.
 * Safe to poll frequently (DB reads only, no external calls).
 */
router.get('/sync-status', requireAuth, (req, res) => {
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    const stravaState = providerSyncStateDb.get(userId, 'strava') || {};
    const intervalsState = providerSyncStateDb.get(userId, 'intervals') || {};
    const streamsEnabled = isStreamIngestionEnabled(userId, userEmail);

    res.json({
      ok: true,
      providers: {
        strava: {
          last_full_sync_at: stravaState.last_full_sync_at || null,
          last_incremental_sync_at: stravaState.last_incremental_sync_at || null,
          last_full_sync_activities_fetched: stravaState.last_full_sync_activities_fetched || 0,
          streams: {
            enabled: streamsEnabled,
            total_candidates: stravaState.streams_backfill_total_candidates || 0,
            completed: stravaState.streams_backfill_completed || 0,
            failed: stravaState.streams_backfill_failed || 0,
            cursor: stravaState.streams_backfill_cursor || null,
            is_complete: stravaState.streams_backfill_is_complete === 1,
            last_run_at: stravaState.streams_backfill_last_run_at || null,
            last_error: stravaState.streams_backfill_last_error || null
          }
        },
        intervals: {
          last_full_sync_at: intervalsState.last_full_sync_at || null,
          last_incremental_sync_at: intervalsState.last_incremental_sync_at || null,
          last_full_sync_activities_fetched: intervalsState.last_full_sync_activities_fetched || 0
        }
      }
    });
  } catch (err) {
    console.error('[Providers API] sync-status error:', err);
    res.status(500).json({ ok: false, error: { code: 'STATUS_FAILED', message: err.message } });
  }
});

export default router;
