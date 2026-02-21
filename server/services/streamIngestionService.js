/**
 * Stream Ingestion Service
 *
 * Fetches per-activity streams from Strava and stores them in activity_streams.
 * Respects source priority: FIT > Intervals-native > Strava.
 * Gzip-compresses stream arrays for storage efficiency.
 *
 * Guardrails:
 * - Only runs when strava_streams_enabled=true in global_settings
 * - Per-user allowlist (strava_streams_allowlist) when non-empty
 * - Never overwrites higher-priority streams (FIT, Intervals)
 * - Cycling-only candidates (Ride, VirtualRide, EBikeRide, etc.)
 * - Hard cap per Full Sync run (STRAVA_STREAMS_BATCH_SIZE env, default 100)
 * - Cursor-based resume across Full Sync runs
 * - Progress persisted every PERSIST_EVERY activities
 * - 404 → mark streams_unavailable, skip forever
 * - 429 → backoff + stop batch, persist state
 */

import { stravaService } from './stravaService.js';
import { providerSyncStateDb } from '../db.js';
import db from '../db.js';
import zlib from 'zlib';

export const STREAM_SOURCE_PRIORITY = { fit: 3, intervals: 2, strava: 1 };

const STRAVA_STREAM_KEYS = 'time,watts,heartrate,cadence,velocity_smooth,altitude,distance';
const CYCLING_TYPES = new Set(['Ride', 'VirtualRide', 'EBikeRide', 'MountainBikeRide', 'GravelRide', 'Handcycle']);
const PER_RUN_CAP = parseInt(process.env.STRAVA_STREAMS_BATCH_SIZE || '100', 10);
const MINI_BATCH_SIZE = 10;
const MINI_BATCH_DELAY_MS = 1500;
const BACKOFF_BASE_MS = 5000;
const MAX_RETRIES = 2;
const PERSIST_EVERY = 5;

// ─── Config ──────────────────────────────────────────────────────────────────

export function isStreamIngestionEnabled(userId, userEmail) {
  const enabledRow = db.prepare(`SELECT setting_value FROM global_settings WHERE setting_key = 'strava_streams_enabled'`).get();
  if (enabledRow?.setting_value !== 'true') return false;
  const allowlistRow = db.prepare(`SELECT setting_value FROM global_settings WHERE setting_key = 'strava_streams_allowlist'`).get();
  const allowlist = (allowlistRow?.setting_value || '').trim();
  if (!allowlist) return true;
  const emails = allowlist.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return emails.length === 0 || emails.includes((userEmail || '').toLowerCase());
}

// ─── Candidate selection ──────────────────────────────────────────────────────

/**
 * Return backfill candidates for a user.
 *
 * Scope (deterministic, code-level — never uses ignore_reason for date filtering):
 *   - Strava cycling activities with start_time >= startDate (default '2025-01-01')
 *   - PLUS race-tagged activities (race_tags.is_race = 1) regardless of date
 *   - Excludes activities that already have streams (activity_streams row exists OR stream_points > 0)
 *   - Excludes sources where streams_unavailable = 1 (meaning provider truly has no streams)
 *
 * @param {number} userId
 * @param {Object} [opts]
 * @param {string} [opts.startDate='2025-01-01']  ISO date string lower bound (inclusive)
 * @param {boolean} [opts.includeRaceTagged=true]  Always include race-tagged regardless of date
 */
export function getBackfillCandidates(userId, opts = {}) {
  const startDate = opts.startDate || '2025-01-01';
  const includeRaceTagged = opts.includeRaceTagged !== false;
  const typeList = [...CYCLING_TYPES].map(() => '?').join(',');
  const cyclingParams = [...CYCLING_TYPES];

  // Primary truth: activity_streams row existence.
  // stream_points > 0 without a stream row = anomaly → include in candidates (re-fetch).
  // Anomalies are logged but do NOT affect streams_unavailable.

  // In-window candidates (Jan 2025+ by default)
  const inWindowRows = db.prepare(`
    SELECT s.activity_id, s.provider_id, a.start_time
    FROM activity_sources s
    JOIN activities a ON a.id = s.activity_id
    LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
    WHERE s.user_id = ?
      AND s.provider = 'strava'
      AND s.activity_id IS NOT NULL
      AND (s.streams_unavailable IS NULL OR s.streams_unavailable = 0)
      AND st.activity_id IS NULL
      AND (a.type IN (${typeList}) OR a.sport = 'cycling')
      AND DATE(a.start_time) >= ?
    ORDER BY a.start_time DESC
  `).all(userId, ...cyclingParams, startDate);

  // Race-tagged candidates outside the window (any date, if enabled)
  let raceRows = [];
  if (includeRaceTagged) {
    raceRows = db.prepare(`
      SELECT s.activity_id, s.provider_id, a.start_time
      FROM activity_sources s
      JOIN activities a ON a.id = s.activity_id
      LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
      JOIN race_tags rt ON rt.activity_id = s.provider_id
                       AND rt.user_id = s.user_id
                       AND rt.activity_source = 'strava'
                       AND rt.is_race = 1
      WHERE s.user_id = ?
        AND s.provider = 'strava'
        AND s.activity_id IS NOT NULL
        AND (s.streams_unavailable IS NULL OR s.streams_unavailable = 0)
        AND st.activity_id IS NULL
        AND DATE(a.start_time) < ?
      ORDER BY a.start_time DESC
    `).all(userId, startDate);
  }

  // Detect anomalies: stream_points > 0 but no activity_streams row
  const anomalyCount = db.prepare(`
    SELECT COUNT(*) as n
    FROM activity_sources s
    LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
    WHERE s.user_id = ?
      AND s.provider = 'strava'
      AND (s.stream_points IS NOT NULL AND s.stream_points > 0)
      AND st.activity_id IS NULL
  `).get(userId).n;
  if (anomalyCount > 0) {
    console.warn(`[Streams] ⚠ ${anomalyCount} sources have stream_points > 0 but no activity_streams row (inconsistent state — will be re-fetched if in scope)`);
  }

  // Merge, deduplicate by activity_id (in-window takes precedence)
  const seen = new Set(inWindowRows.map(r => r.activity_id));
  const extra = raceRows.filter(r => !seen.has(r.activity_id));

  return [...inWindowRows, ...extra].map(r => ({
    activityId: r.activity_id,
    stravaProviderId: r.provider_id,
    startTime: r.start_time
  }));
}

export function getActivitiesNeedingStreams(userId, stravaProviderIds) {
  if (!stravaProviderIds || stravaProviderIds.length === 0) return [];
  const placeholders = stravaProviderIds.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT s.activity_id, s.provider_id
    FROM activity_sources s
    LEFT JOIN activity_streams st ON st.activity_id = s.activity_id
    WHERE s.user_id = ? AND s.provider = 'strava'
      AND s.provider_id IN (${placeholders})
      AND s.activity_id IS NOT NULL
      AND (s.streams_unavailable IS NULL OR s.streams_unavailable = 0)
      AND (s.stream_points IS NULL OR s.stream_points = 0)
      AND st.activity_id IS NULL
  `).all(userId, ...stravaProviderIds);
  return rows.map(r => ({ activityId: r.activity_id, stravaProviderId: r.provider_id }));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function gzipArray(arr) {
  if (!arr || arr.length === 0) return null;
  return zlib.gzipSync(Buffer.from(JSON.stringify(arr), 'utf8')).toString('base64');
}

function markStreamsUnavailable(userId, stravaProviderId, reason) {
  db.prepare(`UPDATE activity_sources SET streams_unavailable = 1, ignore_reason = ? WHERE user_id = ? AND provider = 'strava' AND provider_id = ?`
  ).run(reason, userId, String(stravaProviderId));
}

function storeStreams(userId, activityId, stravaProviderId, streamData) {
  const timeArr = streamData.time?.data || null;
  const powerArr = streamData.watts?.data || null;
  const hrArr = streamData.heartrate?.data || null;
  const cadenceArr = streamData.cadence?.data || null;
  const speedArr = streamData.velocity_smooth?.data || null;
  const elevationArr = streamData.altitude?.data || null;

  if (!timeArr || timeArr.length === 0) {
    markStreamsUnavailable(userId, stravaProviderId, 'no_time_stream');
    return { stored: false, points: 0, streams: [] };
  }

  const points = timeArr.length;
  const presentStreams = ['time'];
  if (powerArr) presentStreams.push('power');
  if (hrArr) presentStreams.push('hr');
  if (cadenceArr) presentStreams.push('cadence');
  if (speedArr) presentStreams.push('speed');
  if (elevationArr) presentStreams.push('elevation');

  let sampleInterval = 1;
  if (timeArr.length > 2) {
    const deltas = [];
    for (let i = 1; i < Math.min(timeArr.length, 11); i++) deltas.push(timeArr[i] - timeArr[i - 1]);
    deltas.sort((a, b) => a - b);
    sampleInterval = deltas[Math.floor(deltas.length / 2)];
  }

  const activity = db.prepare(`SELECT start_time, duration_s FROM activities WHERE id = ?`).get(activityId);
  const flags = { strava_activity_id: stravaProviderId, streams_present: presentStreams, points, sample_interval_s: sampleInterval, completeness: presentStreams.length / 6 };

  db.prepare(`
    INSERT INTO activity_streams (user_id, activity_id, source, computed_at, algo_version, sample_interval_s, start_time, duration_s, stream_format, power, hr, cadence, speed, elevation, time_s, flags)
    VALUES (?, ?, 'strava', datetime('now'), 'strava_streams_v1', ?, ?, ?, 'json_gzip_base64', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, activity_id) DO UPDATE SET
      source='strava', computed_at=datetime('now'), algo_version='strava_streams_v1',
      sample_interval_s=excluded.sample_interval_s, start_time=excluded.start_time, duration_s=excluded.duration_s,
      stream_format='json_gzip_base64', power=excluded.power, hr=excluded.hr, cadence=excluded.cadence,
      speed=excluded.speed, elevation=excluded.elevation, time_s=excluded.time_s, flags=excluded.flags
  `).run(userId, activityId, sampleInterval, activity?.start_time || null,
    activity?.duration_s || timeArr[timeArr.length - 1] || null,
    gzipArray(powerArr), gzipArray(hrArr), gzipArray(cadenceArr),
    gzipArray(speedArr), gzipArray(elevationArr), gzipArray(timeArr), JSON.stringify(flags));

  db.prepare(`
    UPDATE activity_sources SET has_time_stream=1, has_power_stream=?, has_hr_stream=?, has_cadence_stream=?, has_speed_stream=?, stream_points=?, summary_only=0
    WHERE user_id=? AND provider='strava' AND provider_id=?
  `).run(powerArr ? 1 : 0, hrArr ? 1 : 0, cadenceArr ? 1 : 0, speedArr ? 1 : 0, points, userId, String(stravaProviderId));

  return { stored: true, points, streams: presentStreams };
}

// ─── Fetch helper ─────────────────────────────────────────────────────────────

async function fetchStravaStreams(accessToken, stravaActivityId, userId) {
  await stravaService.rateLimitDelay(userId);
  const url = `${stravaService.baseUrl}/activities/${stravaActivityId}/streams?keys=${STRAVA_STREAM_KEYS}&key_by_type=true`;
  const { default: axios } = await import('axios');
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    validateStatus: (s) => s < 500
  });
  if (response.status === 429) {
    const resetSec = parseInt(response.headers['x-ratelimit-reset'] || response.headers['retry-after'] || '900', 10);
    const e = new Error('Strava 429');
    e.status = 429;
    e.resetSeconds = resetSec;
    throw e;
  }
  if (response.status === 404) { const e = new Error('Strava 404'); e.status = 404; throw e; }
  if (response.status !== 200) return null;
  return response.data;
}

// ─── Core fetch-with-retry ────────────────────────────────────────────────────

async function fetchWithRetry(accessToken, stravaProviderId, userId) {
  let retries = 0;
  let lastResetSeconds = null;
  while (retries <= MAX_RETRIES) {
    try {
      return { data: await fetchStravaStreams(accessToken, stravaProviderId, userId), rateLimited: false };
    } catch (err) {
      if (err.status === 404) return { data: null, rateLimited: false, notFound: true };
      if (err.status === 429) {
        lastResetSeconds = err.resetSeconds || 900;
        if (retries < MAX_RETRIES) {
          const backoff = BACKOFF_BASE_MS * Math.pow(2, retries);
          console.warn(`[Streams] 429 on ${stravaProviderId}, backoff ${backoff}ms (reset in ${lastResetSeconds}s)`);
          await new Promise(r => setTimeout(r, backoff));
          retries++;
        } else {
          return { data: null, rateLimited: true, resetSeconds: lastResetSeconds };
        }
      } else {
        throw err;
      }
    }
  }
  return { data: null, rateLimited: false };
}

// ─── Full Sync Backfill (cursor-based, capped) ────────────────────────────────

/**
 * Run one "chunk" of the streams backfill for Full Sync.
 * - Computes all candidates on first run, stores total in provider_sync_state
 * - Resumes from cursor (stravaProviderId of last processed activity)
 * - Processes at most PER_RUN_CAP activities per call
 * - Persists progress every PERSIST_EVERY activities
 * - Stops early on persistent 429
 *
 * @param {number} userId
 * @param {string} accessToken
 * @param {Object} [opts]  Passed through to getBackfillCandidates (startDate, includeRaceTagged)
 * @returns {Promise<Object>} Summary
 */
export async function runFullSyncBackfill(userId, accessToken, opts = {}) {
  const startMs = Date.now();
  const summary = {
    total_candidates: 0,
    processed_this_run: 0,
    stored: 0,
    unavailable: 0,
    errors: 0,
    rate_limited: false,
    is_complete: false,
    total_points: 0
  };

  // Get current backfill state
  const state = providerSyncStateDb.get(userId, 'strava') || {};
  const isAlreadyComplete = state.streams_backfill_is_complete === 1;
  if (isAlreadyComplete) {
    summary.is_complete = true;
    summary.total_candidates = state.streams_backfill_total_candidates || 0;
    summary.stored = state.streams_backfill_completed || 0;
    console.log(`[Streams] Backfill already complete for user ${userId}`);
    return summary;
  }

  // Get all remaining candidates (deterministic order: newest first)
  const allCandidates = getBackfillCandidates(userId, opts);
  const totalCandidates = allCandidates.length;
  summary.total_candidates = totalCandidates;

  // Initialize or refresh total count in state
  const alreadyCompleted = state.streams_backfill_completed || 0;
  const alreadyFailed = state.streams_backfill_failed || 0;
  providerSyncStateDb.initStreamsBackfill(userId, 'strava', totalCandidates + alreadyCompleted);

  if (totalCandidates === 0) {
    summary.is_complete = true;
    providerSyncStateDb.updateStreamsProgress(userId, 'strava', {
      completed: alreadyCompleted,
      failed: alreadyFailed,
      cursor: null,
      isComplete: true,
      lastError: null
    });
    console.log(`[Streams] No remaining candidates — backfill complete`);
    return summary;
  }

  // Cap to PER_RUN_CAP
  const toProcess = allCandidates.slice(0, PER_RUN_CAP);
  console.log(`[Streams] ── Backfill run: ${toProcess.length}/${totalCandidates} remaining candidates (cap=${PER_RUN_CAP}) ──`);

  let completedThisRun = 0;
  let permanentFailedThisRun = 0; // 404 / no_data / no_time_stream — marks streams_unavailable
  let transientErrorsThisRun = 0; // network/unknown — do NOT mark unavailable, allow retry
  let lastCursor = state.streams_backfill_cursor || null;

  for (let i = 0; i < toProcess.length; i++) {
    const { activityId, stravaProviderId } = toProcess[i];

    try {
      const { data: streamData, rateLimited, notFound, resetSeconds } = await fetchWithRetry(accessToken, stravaProviderId, userId);

      if (rateLimited) {
        summary.rate_limited = true;
        summary.reset_seconds = resetSeconds || null;
        console.warn(`[Streams] Rate limited — stopping backfill run at ${i}/${toProcess.length}`);
        // Persist progress before stopping — do NOT advance cursor, do NOT increment failed
        providerSyncStateDb.updateStreamsProgress(userId, 'strava', {
          completed: alreadyCompleted + completedThisRun,
          failed: alreadyFailed + permanentFailedThisRun,
          cursor: lastCursor,
          isComplete: false,
          lastError: 'rate_limited'
        });
        break;
      }

      if (notFound) {
        // Permanent: provider has no record of this activity
        markStreamsUnavailable(userId, stravaProviderId, 'not_found_404');
        permanentFailedThisRun++;
        summary.unavailable++;
        lastCursor = stravaProviderId;
        summary.processed_this_run++;
      } else if (streamData === null) {
        // Permanent: provider returned empty / no usable data
        markStreamsUnavailable(userId, stravaProviderId, 'no_data');
        permanentFailedThisRun++;
        summary.unavailable++;
        lastCursor = stravaProviderId;
        summary.processed_this_run++;
      } else {
        const result = storeStreams(userId, activityId, stravaProviderId, streamData);
        if (result.stored) {
          completedThisRun++;
          summary.stored++;
          summary.total_points += result.points;
        } else {
          // storeStreams returned stored=false → no_time_stream (already marked unavailable inside)
          permanentFailedThisRun++;
          summary.unavailable++;
        }
        lastCursor = stravaProviderId;
        summary.processed_this_run++;
      }

      // Persist progress every PERSIST_EVERY activities
      if ((i + 1) % PERSIST_EVERY === 0) {
        providerSyncStateDb.updateStreamsProgress(userId, 'strava', {
          completed: alreadyCompleted + completedThisRun,
          failed: alreadyFailed + permanentFailedThisRun,
          cursor: lastCursor,
          isComplete: false,
          lastError: null
        });
      }
    } catch (err) {
      // Transient / network error — do NOT mark streams_unavailable, allow retry on next run
      console.error(`[Streams] Transient error for ${stravaProviderId}:`, err.message);
      transientErrorsThisRun++;
      summary.errors++;
      // Do NOT advance cursor — this candidate will be retried next run
    }

    // Mini-batch pause
    if ((i + 1) % MINI_BATCH_SIZE === 0 && i + 1 < toProcess.length) {
      await new Promise(r => setTimeout(r, MINI_BATCH_DELAY_MS));
    }
  }

  // Check if all candidates are now done
  const remainingAfter = getBackfillCandidates(userId, opts).length;
  const isNowComplete = remainingAfter === 0 && !summary.rate_limited;
  summary.is_complete = isNowComplete;

  // Final persist — only permanent failures count toward 'failed' counter
  providerSyncStateDb.updateStreamsProgress(userId, 'strava', {
    completed: alreadyCompleted + completedThisRun,
    failed: alreadyFailed + permanentFailedThisRun,
    cursor: lastCursor,
    isComplete: isNowComplete,
    lastError: summary.rate_limited ? 'rate_limited' : null
  });

  summary.transient_errors = transientErrorsThisRun;
  console.log(`[Streams] ── Backfill run done: ${summary.stored} stored, ${summary.unavailable} unavailable, ${summary.errors} transient errors, complete=${isNowComplete} ──`);
  summary.durationMs = Date.now() - startMs;
  return summary;
}

// ─── Incremental ingestion (small batch, no cursor) ───────────────────────────

/**
 * Ingest streams for a small incremental batch (newly imported activities).
 * No cursor tracking — just process the given list.
 */
export async function ingestStravaStreams(userId, accessToken, activities) {
  const startMs = Date.now();
  const summary = { total: activities.length, stored: 0, unavailable: 0, errors: 0, rate_limited: false, total_points: 0 };

  for (let i = 0; i < activities.length; i++) {
    const { activityId, stravaProviderId } = activities[i];
    try {
      const { data: streamData, rateLimited, notFound } = await fetchWithRetry(accessToken, stravaProviderId, userId);
      if (rateLimited) { summary.rate_limited = true; break; }
      if (notFound || streamData === null) {
        markStreamsUnavailable(userId, stravaProviderId, notFound ? 'not_found_404' : 'no_data');
        summary.unavailable++;
      } else {
        const result = storeStreams(userId, activityId, stravaProviderId, streamData);
        if (result.stored) { summary.stored++; summary.total_points += result.points; }
        else summary.unavailable++;
      }
    } catch (err) {
      console.error(`[Streams] Incremental error for ${stravaProviderId}:`, err.message);
      summary.errors++;
    }
    if ((i + 1) % MINI_BATCH_SIZE === 0 && i + 1 < activities.length) {
      await new Promise(r => setTimeout(r, MINI_BATCH_DELAY_MS));
    }
  }

  summary.durationMs = Date.now() - startMs;
  return summary;
}

export default {
  isStreamIngestionEnabled,
  runFullSyncBackfill,
  ingestStravaStreams,
  getActivitiesNeedingStreams,
  getBackfillCandidates,
  STREAM_SOURCE_PRIORITY
};
