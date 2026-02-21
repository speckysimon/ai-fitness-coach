// Activities API route - DB-only reads + imports
import express from 'express';
import multer from 'multer';
import activityStorage from '../services/activityStorageService.js';
import activityImport from '../services/activityImportService.js';
import { findOrCreateActivity, upsertActivitySource, applyBestDataWins } from '../services/activityImportService.js';
import { parseFitFile } from '../services/fitParserService.js';
import { recomputeWeeksForActivity } from '../services/weeklyRecomputeScheduler.js';
import { findUnreconciledShells, reconcileAllShells } from '../services/stravaShellReconciler.js';
import { stravaService } from '../services/stravaService.js';
import { sessionDb, userDb, stravaTokenDb } from '../db.js';
import db from '../db.js';

// Multer config for FIT file uploads (memory storage — parse buffer directly)
const fitUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.fit')) {
      cb(null, true);
    } else {
      cb(new Error('Only .fit files are accepted'), false);
    }
  },
});

const router = express.Router();

/**
 * Auth middleware - populates req.user from session token
 * Fails loudly with UNAUTHENTICATED if no valid session
 */
function requireAuth(req, res, next) {
  const sessionToken = req.headers.authorization?.replace('Bearer ', '');
  
  if (!sessionToken) {
    console.error('[Activities API] No session token provided');
    return res.status(401).json({
      ok: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Login required - no session token'
      }
    });
  }
  
  try {
    const session = sessionDb.findByToken(sessionToken);
    if (!session) {
      console.error('[Activities API] Invalid session token');
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Login required - invalid session'
        }
      });
    }
    
    const user = userDb.findById(session.user_id);
    if (!user) {
      console.error('[Activities API] User not found for session');
      return res.status(401).json({
        ok: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Login required - user not found'
        }
      });
    }
    
    // Attach user to request (with numeric id)
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };
    
    next();
  } catch (error) {
    console.error('[Activities API] Auth error:', error);
    return res.status(500).json({
      ok: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
}

/**
 * GET /api/activities
 * Fetch activities from database (DB-only, no external API calls)
 * Query params:
 *   - window: Number of days to look back (default: 90)
 *   - sources: Comma-separated list of providers (default: all)
 * 
 * Requires: Authorization header with session token
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // Guaranteed by requireAuth
    
    // Parse query params
    const windowDays = parseInt(req.query.window) || 90;
    const sources = req.query.sources; // Let storage service parse this
    
    console.log(`[Activities API] GET user=${userId}, window=${windowDays}, sources=${sources || 'all'}`);
    
    // DB-only read - no in-memory cache, no external API calls
    const result = activityStorage.getActivities(userId, {
      windowDays,
      sources
    });
    
    // Result already has { ok, data, meta } or { ok, error } structure
    if (result.ok) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('[Activities API] Error:', error);
    res.status(500).json({ 
      ok: false,
      error: {
        code: 'FETCH_FAILED',
        message: error.message || 'Failed to fetch activities'
      }
    });
  }
});

/**
 * GET /api/activities/stats
 * Get activity statistics for current user
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // Guaranteed by requireAuth
    
    const count = activityStorage.getActivityCount(userId);
    const tableReady = activityStorage.tableExists();
    
    // Also get count from new activities table
    let newTableCount = 0;
    try {
      const result = db.prepare(`SELECT COUNT(*) as count FROM activities WHERE user_id = ?`).get(userId);
      newTableCount = result?.count || 0;
    } catch (e) {
      // Table may not exist yet
    }
    
    res.json({
      ok: true,
      data: {
        userId,
        activityCount: count,
        newTableCount,
        tableExists: tableReady,
        providers: activityStorage.VALID_PROVIDERS
      }
    });
  } catch (error) {
    console.error('[Activities API] Stats error:', error);
    res.status(500).json({ 
      ok: false,
      error: {
        code: 'STATS_FAILED',
        message: error.message || 'Failed to get stats'
      }
    });
  }
});

/**
 * POST /api/activities/import
 * Import activities from providers into the two-table model
 * 
 * Body:
 *   - activities: Array of provider activities
 *   - provider: 'strava' | 'intervals' | 'manual'
 * 
 * Returns:
 *   - ok: true
 *   - data: { imported, created, updated, errors }
 */
router.post('/import', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { activities, provider } = req.body;
    
    // Validate input
    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'activities must be an array'
        }
      });
    }
    
    if (!provider || !['strava', 'intervals', 'manual'].includes(provider)) {
      return res.status(400).json({
        ok: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: 'provider must be strava, intervals, or manual'
        }
      });
    }
    
    console.log(`[Activities API] POST /import user=${userId}, provider=${provider}, count=${activities.length}`);
    
    // Bulk import
    const result = activityImport.bulkImport(userId, activities, provider);
    
    res.json({
      ok: true,
      data: result
    });
  } catch (error) {
    console.error('[Activities API] Import error:', error);
    res.status(500).json({
      ok: false,
      error: {
        code: 'IMPORT_FAILED',
        message: error.message || 'Failed to import activities'
      }
    });
  }
});

/**
 * DELETE /api/activities/:id
 * Delete a canonical activity and all its source rows.
 */
router.delete('/:id', requireAuth, (req, res) => {
  const userId = req.user.id;
  const activityId = req.params.id;

  try {
    // Verify ownership
    const activity = db.prepare(
      `SELECT id FROM activities WHERE id = ? AND user_id = ?`
    ).get(activityId, userId);

    if (!activity) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Activity not found' } });
    }

    // Delete sources first, then canonical
    db.prepare(`DELETE FROM activity_sources WHERE activity_id = ? AND user_id = ?`).run(activityId, userId);
    db.prepare(`DELETE FROM activities WHERE id = ? AND user_id = ?`).run(activityId, userId);

    console.log(`[Activities] Deleted activity ${activityId} for user ${userId}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('[Activities] Delete error:', error.message);
    res.status(500).json({ ok: false, error: { code: 'DELETE_FAILED', message: error.message } });
  }
});

/**
 * POST /api/activities/upload-fit
 * Upload a .fit file, parse it, dedupe against existing activities, and store.
 * 
 * - Accepts multipart/form-data with field "file" (.fit, max 25 MB)
 * - Returns: { ok, data: { status, activity_id, match_confidence, summary } }
 * 
 * status values:
 *   "duplicate"  — same FIT file already uploaded (SHA-256 match)
 *   "matched"    — linked to existing canonical activity via time/duration
 *   "created"    — new canonical activity created
 */
router.post('/upload-fit', requireAuth, (req, res, next) => {
  fitUpload.single('file')(req, res, (err) => {
    if (err) {
      const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds 25 MB limit'
        : err.message || 'Upload failed';
      console.error(`[FIT Upload] Multer error: ${message}`);
      return res.status(400).json({ ok: false, error: { code, message } });
    }
    next();
  });
}, async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({
      ok: false,
      error: { code: 'NO_FILE', message: 'No .fit file provided' }
    });
  }

  console.log(`[FIT Upload] user=${userId}, file=${req.file.originalname}, size=${req.file.size}`);

  try {
    // 1. Parse the FIT file
    const { summary, fileHash, rawParsed } = await parseFitFile(req.file.buffer, req.file.originalname);

    if (!summary.start_time) {
      return res.status(400).json({
        ok: false,
        error: { code: 'PARSE_ERROR', message: 'Could not extract start time from FIT file' }
      });
    }

    // 2. Check for duplicate upload (same file hash already ingested)
    const existingSource = db.prepare(`
      SELECT activity_id FROM activity_sources
      WHERE user_id = ? AND provider = 'fit_upload' AND provider_id = ?
    `).get(userId, fileHash);

    if (existingSource) {
      const existingActivity = db.prepare(`SELECT * FROM activities WHERE id = ?`).get(existingSource.activity_id);
      console.log(`[FIT Upload] Duplicate detected: hash=${fileHash.slice(0, 12)}… → activity=${existingSource.activity_id}`);
      return res.json({
        ok: true,
        data: {
          status: 'duplicate',
          activity_id: existingSource.activity_id,
          match_confidence: 1.0,
          summary,
          message: 'This file has already been uploaded'
        }
      });
    }

    // 3. Dedupe: try to match to an existing canonical activity
    //    Use ±10 min window and ±15% duration tolerance (per spec)
    const FIT_TIME_WINDOW_MS = 10 * 60 * 1000;
    const FIT_DURATION_TOLERANCE = 0.15;

    const incomingTime = new Date(summary.start_time).getTime();
    const minTime = new Date(incomingTime - FIT_TIME_WINDOW_MS).toISOString();
    const maxTime = new Date(incomingTime + FIT_TIME_WINDOW_MS).toISOString();

    const candidates = db.prepare(`
      SELECT * FROM activities
      WHERE user_id = ?
        AND sport = ?
        AND start_time >= ?
        AND start_time <= ?
    `).all(userId, summary.sport, minTime, maxTime);

    let matchedActivity = null;
    let matchConfidence = 0;

    if (candidates.length > 0 && summary.duration_s) {
      // Score candidates by time proximity + duration similarity
      const scored = candidates
        .map(c => {
          const timeDiffMs = Math.abs(new Date(c.start_time).getTime() - incomingTime);
          const durationRatio = c.duration_s
            ? Math.abs(c.duration_s - summary.duration_s) / c.duration_s
            : 1;
          return { candidate: c, timeDiffMs, durationRatio };
        })
        .filter(s => s.durationRatio <= FIT_DURATION_TOLERANCE)
        .sort((a, b) => a.timeDiffMs - b.timeDiffMs);

      if (scored.length > 0) {
        const best = scored[0];
        matchedActivity = best.candidate;
        // Confidence: 1.0 at 0 diff, decays with time/duration gap
        const timeScore = 1 - (best.timeDiffMs / FIT_TIME_WINDOW_MS);
        const durationScore = 1 - (best.durationRatio / FIT_DURATION_TOLERANCE);
        matchConfidence = Math.round((timeScore * 0.6 + durationScore * 0.4) * 100) / 100;
      }
    } else if (candidates.length > 0 && !summary.duration_s) {
      // No duration to compare — match on time alone (closest)
      const sorted = candidates.sort((a, b) => {
        return Math.abs(new Date(a.start_time).getTime() - incomingTime)
             - Math.abs(new Date(b.start_time).getTime() - incomingTime);
      });
      matchedActivity = sorted[0];
      matchConfidence = 0.5; // Lower confidence without duration check
    }

    let status, activityId;

    if (matchedActivity) {
      // 4a. Matched — attach as new source and merge
      status = 'matched';
      activityId = matchedActivity.id;
      console.log(`[FIT Upload] Matched to existing activity=${activityId} (confidence=${matchConfidence})`);
    } else {
      // 4b. No match — create new canonical activity
      status = 'created';
      const result = findOrCreateActivity(userId, {
        provider: 'fit_upload',
        provider_id: fileHash,
        start_time: summary.start_time,
        duration_s: summary.duration_s,
        sport: summary.sport,
        name: summary.name,
        type: summary.type,
        distance_m: summary.distance_m,
        elevation_m: summary.elevation_m,
        avg_power: summary.avg_power,
        max_power: summary.max_power,
        normalized_power: summary.normalized_power,
        tss: summary.tss,
        avg_hr: summary.avg_hr,
        max_hr: summary.max_hr,
        avg_cadence: summary.avg_cadence,
        avg_speed: summary.avg_speed,
        max_speed: summary.max_speed,
        calories: summary.calories,
        has_power: summary.has_power,
      });
      activityId = result.activity.id;
      matchConfidence = 0;
      console.log(`[FIT Upload] Created new activity=${activityId}`);
    }

    // 5. Upsert the activity source (fit_upload provider)
    upsertActivitySource(activityId, userId, {
      provider: 'fit_upload',
      provider_id: fileHash,
      name: summary.name,
      type: summary.type,
      duration_s: summary.duration_s,
      distance_m: summary.distance_m,
      elevation_m: summary.elevation_m,
      avg_power: summary.avg_power,
      max_power: summary.max_power,
      normalized_power: summary.normalized_power,
      tss: summary.tss,
      avg_hr: summary.avg_hr,
      max_hr: summary.max_hr,
      avg_cadence: summary.avg_cadence,
      avg_speed: summary.avg_speed,
      max_speed: summary.max_speed,
      calories: summary.calories,
      source_origin: 'manual',
    });

    // 6. Store slimmed raw_json (strip second-by-second records to avoid DB bloat)
    //    records alone can be 2+ MB; we only need sessions/laps for zones & summary
    //    BUT first extract a downsampled GPS route for the map (~10KB)
    try {
      const slim = { ...rawParsed };
      // Extract GPS route from records before deleting (downsample to ~every 10s)
      if (Array.isArray(slim.records) && slim.records.length > 0) {
        const GPS_SAMPLE_INTERVAL = 10; // keep every Nth record
        const latlngs = [];
        for (let i = 0; i < slim.records.length; i += GPS_SAMPLE_INTERVAL) {
          const r = slim.records[i];
          if (r.position_lat != null && r.position_long != null) {
            latlngs.push([
              Math.round(r.position_lat * 1e5) / 1e5,
              Math.round(r.position_long * 1e5) / 1e5
            ]);
          }
        }
        if (latlngs.length > 1) {
          slim.latlngs = latlngs;
          console.log(`[FIT Upload] Extracted GPS route: ${latlngs.length} points from ${slim.records.length} records`);
        }
      }
      // Remove bulky arrays we don't need for display
      delete slim.records;       // ~2.5 MB of per-second GPS/power/HR
      delete slim.events;        // device events
      delete slim.hrv;           // heart rate variability samples
      delete slim.monitors;      // device monitor data
      delete slim.monitor_info;
      delete slim.definitions;
      delete slim.developer_data_ids;
      delete slim.field_descriptions;
      delete slim.hr_zone;         // empty zone definitions (actual data is in sessions[0])
      delete slim.power_zone;      // empty zone definitions
      delete slim.dive_gases;
      delete slim.course_points;
      delete slim.tank_updates;
      delete slim.tank_summaries;
      delete slim.jumps;
      delete slim.time_in_zone;
      delete slim.activity_metrics;
      delete slim.lengths;
      delete slim.stress;
      delete slim.sports;
      const rawJson = JSON.stringify(slim);
      console.log(`[FIT Upload] raw_json slimmed: ${(rawJson.length / 1024).toFixed(1)} KB (was ~${(JSON.stringify(rawParsed).length / 1024 / 1024).toFixed(1)} MB)`);
      db.prepare(`
        UPDATE activity_sources SET raw_json = ?, is_enriched = 1, enriched_at = ?
        WHERE id = ?
      `).run(rawJson, new Date().toISOString(), `fit_upload:${fileHash}`);
    } catch (rawErr) {
      console.warn('[FIT Upload] Could not store raw_json:', rawErr.message);
    }

    // 7. Apply best-data-wins merge (respects provider priority)
    applyBestDataWins(activityId);

    // 8. Recompute weekly rollup for the affected week (non-fatal)
    let weeklyResult = null;
    try {
      weeklyResult = await recomputeWeeksForActivity(userId, { start_time: summary.start_time }, { lookbackWeeks: 0 });
    } catch (weeklyErr) {
      console.error(`[FIT Upload] Weekly recompute failed (non-fatal):`, weeklyErr.message);
    }

    console.log(`[FIT Upload] Complete: status=${status}, activity=${activityId}`);

    res.json({
      ok: true,
      data: {
        status,
        activity_id: activityId,
        match_confidence: matchConfidence,
        summary,
        weekly: weeklyResult
      }
    });
  } catch (error) {
    console.error('[FIT Upload] Error:', error.message);
    res.status(500).json({
      ok: false,
      error: {
        code: 'FIT_UPLOAD_FAILED',
        message: error.message || 'Failed to process FIT file'
      }
    });
  }
});

/**
 * POST /api/activities/reconcile-shells
 * 
 * Trigger Strava shell reconciliation.
 * Finds all intervals_strava_shell sources without a matching Strava source,
 * fetches the real activity from Strava, and imports it.
 * 
 * Requires: Strava connected (valid tokens)
 * Body: { batchSize?: number } (default 50)
 */
router.post('/reconcile-shells', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { batchSize = 50 } = req.body || {};
    
    // Check if Strava is connected
    const stravaToken = stravaTokenDb.findByUserId(userId);
    if (!stravaToken) {
      return res.json({
        ok: true,
        data: { total: 0, reconciled: 0, message: 'Strava not connected — no reconciliation needed' }
      });
    }
    
    // Check how many unreconciled shells exist
    const shells = findUnreconciledShells(userId);
    if (shells.length === 0) {
      return res.json({
        ok: true,
        data: { total: 0, reconciled: 0, message: 'No unreconciled shells found' }
      });
    }
    
    console.log(`[Reconcile] Found ${shells.length} unreconciled shells for user ${userId}`);
    
    // Create a fetcher that uses the Strava service
    const stravaFetcher = async (stravaId) => {
      try {
        const activity = await stravaService.getActivity(stravaToken.access_token, stravaId);
        return activity;
      } catch (err) {
        if (err.response?.status === 404) return null;
        throw err;
      }
    };
    
    const result = await reconcileAllShells(userId, stravaFetcher, { batchSize, delayMs: 1100 });
    
    res.json({
      ok: true,
      data: {
        total: result.total,
        reconciled: result.reconciled,
        failed: result.failed,
        skipped: result.skipped,
        message: `Reconciled ${result.reconciled} of ${result.total} shells`
      }
    });
  } catch (error) {
    console.error('[Reconcile] Error:', error.message);
    res.status(500).json({
      ok: false,
      error: { code: 'RECONCILE_FAILED', message: error.message }
    });
  }
});

export default router;
