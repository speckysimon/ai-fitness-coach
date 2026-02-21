/**
 * Full Sync Service
 * 
 * Server-side orchestrator for full and incremental provider syncs.
 * Handles: Strava pagination, Intervals fetch, import, canonical reconciliation,
 * analytics recompute, and weekly rollup — all in one deterministic pipeline.
 */

import { stravaService } from './stravaService.js';
import intervalsService from './intervalsService.js';
import { bulkImport } from './activityImportService.js';
import { recomputeWeeksForUser, getAffectedWeeks } from './weeklyRecomputeScheduler.js';
import { stravaTokenDb, intervalsTokenDb, providerSyncStateDb } from '../db.js';
import db from '../db.js';
import { runPostSyncVerification } from './syncVerificationService.js';
import { isStreamIngestionEnabled, runFullSyncBackfill, ingestStravaStreams, getActivitiesNeedingStreams } from './streamIngestionService.js';
import { userDb } from '../db.js';

const FULL_SYNC_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const STRAVA_PER_PAGE = 200;
const STRAVA_MAX_PAGES = 50; // Safety cap: 50 × 200 = 10,000 activities max
const INCREMENTAL_OVERLAP_DAYS = 3;
const INCREMENTAL_MAX_PAGES = 3;

/**
 * Fetch ALL Strava activities by paginating through the entire history.
 * 
 * @param {string} accessToken - Valid Strava access token
 * @param {number} userId - For rate-limit tracking
 * @param {Object} [options]
 * @param {number} [options.after] - Unix epoch seconds (for incremental)
 * @param {number} [options.maxPages] - Page limit
 * @returns {Promise<{activities: Object[], pages: number, rateLimited: boolean}>}
 */
async function fetchAllStravaActivities(accessToken, userId, options = {}) {
  const { after = null, maxPages = STRAVA_MAX_PAGES } = options;
  const allActivities = [];
  let page = 1;
  let rateLimited = false;

  console.log(`[FullSync] Strava: starting pagination (after=${after || 'all'}, maxPages=${maxPages})`);

  while (page <= maxPages) {
    try {
      const params = {
        page,
        per_page: STRAVA_PER_PAGE,
      };
      if (after) params.after = after;

      const activities = await stravaService.getActivities(accessToken, params, userId);

      if (!activities || activities.length === 0) {
        console.log(`[FullSync] Strava: page ${page} empty — done. Total: ${allActivities.length}`);
        break;
      }

      allActivities.push(...activities);
      console.log(`[FullSync] Strava: page ${page}: ${activities.length} (running total: ${allActivities.length})`);

      if (activities.length < STRAVA_PER_PAGE) {
        break; // Last page
      }

      page++;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn(`[FullSync] Strava: rate limited on page ${page}`);
        rateLimited = true;
        break;
      }
      throw error;
    }
  }

  return { activities: allActivities, pages: page, rateLimited };
}

/**
 * Fetch Intervals.icu activities for a date range.
 * 
 * @param {string} accessToken
 * @param {string} athleteId
 * @param {string} oldest - YYYY-MM-DD
 * @param {string} newest - YYYY-MM-DD
 * @returns {Promise<Object[]>}
 */
async function fetchIntervalsActivities(accessToken, athleteId, oldest, newest) {
  console.log(`[FullSync] Intervals: fetching ${oldest} → ${newest}`);
  const activities = await intervalsService.getActivities(accessToken, athleteId, oldest, newest);
  console.log(`[FullSync] Intervals: fetched ${activities.length} activities`);
  return activities;
}

/**
 * Refresh Strava token if expired.
 * Returns a valid access token.
 */
async function ensureValidStravaToken(userId) {
  const tokens = stravaTokenDb.findByUserId(userId);
  if (!tokens) return null;

  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at && tokens.expires_at < now) {
    console.log(`[FullSync] Strava token expired for user ${userId}, refreshing...`);
    try {
      const newTokens = await stravaService.refreshToken(tokens.refresh_token);
      stravaTokenDb.upsert(userId, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        expires_at: newTokens.expires_at,
        athlete: tokens.athlete_data ? JSON.parse(tokens.athlete_data) : null,
      });
      return newTokens.access_token;
    } catch (err) {
      console.error(`[FullSync] Strava token refresh failed:`, err.message);
      return null;
    }
  }

  return tokens.access_token;
}

/**
 * Run a full sync for the given providers.
 * 
 * @param {number} userId
 * @param {Object} options
 * @param {string[]} options.providers - ['strava', 'intervals']
 * @param {string} options.mode - 'full' | 'incremental'
 * @returns {Promise<Object>} Structured sync result
 */
export async function runSync(userId, options = {}) {
  const { providers = ['strava', 'intervals'], mode = 'full' } = options;
  const isFullSync = mode === 'full';
  const startMs = Date.now();

  console.log(`[FullSync] ═══════════════════════════════════════`);
  console.log(`[FullSync] ${isFullSync ? 'FULL' : 'INCREMENTAL'} sync for user ${userId}`);
  console.log(`[FullSync] Providers: ${providers.join(', ')}`);
  console.log(`[FullSync] ═══════════════════════════════════════`);

  // Cooldown check for full sync
  if (isFullSync) {
    for (const provider of providers) {
      const state = providerSyncStateDb.get(userId, provider);
      if (state?.last_full_sync_at) {
        const elapsed = Date.now() - new Date(state.last_full_sync_at).getTime();
        if (elapsed < FULL_SYNC_COOLDOWN_MS) {
          const remainingSec = Math.ceil((FULL_SYNC_COOLDOWN_MS - elapsed) / 1000);
          return {
            ok: false,
            error: 'COOLDOWN',
            message: `Full sync for ${provider} was run ${Math.round(elapsed / 1000)}s ago. Wait ${remainingSec}s.`,
            retryAfterSec: remainingSec
          };
        }
      }
    }
  }

  const result = {
    ok: true,
    mode,
    providers: {},
    totals: {
      fetched: 0,
      sources_upserted: 0,
      canonicals_created: 0,
      canonicals_updated: 0,
      shells_ignored: 0,
      errors: 0
    },
    weekly_recomputed: false,
    durationMs: 0
  };

  // ── STRAVA ──────────────────────────────────────────────────────────
  if (providers.includes('strava')) {
    const providerResult = { fetched: 0, imported: {}, error: null, pages: 0, rateLimited: false };

    try {
      const accessToken = await ensureValidStravaToken(userId);
      if (!accessToken) {
        providerResult.error = 'Strava not connected or token refresh failed';
      } else {
        let afterTs = null;
        let isFirstStravaSync = false;

        if (!isFullSync) {
          // Incremental: fetch since last sync minus overlap
          const state = providerSyncStateDb.get(userId, 'strava');
          if (state?.last_incremental_sync_at) {
            const from = new Date(state.last_incremental_sync_at);
            from.setDate(from.getDate() - INCREMENTAL_OVERLAP_DAYS);
            afterTs = Math.floor(from.getTime() / 1000);
          } else {
            isFirstStravaSync = true;
          }
        }

        // Capture fetch window for verification
        result._stravaFetchWindow = {
          after_ts: afterTs,
          after_date: afterTs ? new Date(afterTs * 1000).toISOString() : null,
          days_covered: afterTs ? Math.round((Date.now() / 1000 - afterTs) / 86400) : null
        };
        result._isFirstStravaSync = isFirstStravaSync;

        const stravaData = await fetchAllStravaActivities(accessToken, userId, {
          after: afterTs,
          maxPages: isFullSync ? STRAVA_MAX_PAGES : INCREMENTAL_MAX_PAGES
        });

        providerResult.fetched = stravaData.activities.length;
        providerResult.pages = stravaData.pages;
        providerResult.rateLimited = stravaData.rateLimited;

        // Track Strava IDs for stream ingestion (needs to be in scope outside the if block)
        let stravaProviderIds = [];

        if (stravaData.activities.length > 0) {
          // The stravaService.getActivities already normalizes via normalizeActivity
          // But bulkImport expects raw Strava format for normalizeProviderActivity
          // stravaService returns normalized format with fields like avgPower, avgHeartRate etc.
          // We need to map back to what normalizeProviderActivity('strava') expects
          const rawActivities = stravaData.activities.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            sport_type: a.sport_type,
            start_date: a.date,
            start_date_local: a.date,
            moving_time: a.duration,
            elapsed_time: a.duration,
            distance: a.distance,
            total_elevation_gain: a.elevation,
            average_heartrate: a.avgHeartRate,
            max_heartrate: a.maxHeartRate,
            average_watts: a.avgPower,
            max_watts: a.maxPower,
            weighted_average_watts: a.normalizedPower,
            average_cadence: a.avgCadence,
            average_speed: a.avgSpeed,
            max_speed: a.maxSpeed,
            calories: a.calories,
            device_watts: a.avgPower ? true : false,
          }));

          stravaProviderIds = rawActivities.map(a => String(a.id));

          const importResult = bulkImport(userId, rawActivities, 'strava');
          providerResult.imported = {
            sources_upserted: importResult.sources_upserted,
            canonicals_created: importResult.canonicals_created,
            canonicals_updated: importResult.canonicals_updated,
            lite_stored: importResult.lite_stored,
            errors: importResult.errors.length
          };

          result.totals.fetched += providerResult.fetched;
          result.totals.sources_upserted += importResult.sources_upserted;
          result.totals.canonicals_created += importResult.canonicals_created;
          result.totals.canonicals_updated += importResult.canonicals_updated;
          result.totals.errors += importResult.errors.length;
        }

        // Update sync timestamps
        if (isFullSync) {
          providerSyncStateDb.upsertFullSync(userId, 'strava', providerResult.fetched);
        }
        providerSyncStateDb.upsertIncremental(userId, 'strava');

        // ── STRAVA STREAM INGESTION ──────────────────────────────────────
        const user = userDb.findById(userId);
        const userEmail = user?.email || '';

        if (isStreamIngestionEnabled(userId, userEmail)) {
          try {
            if (isFullSync) {
              // Full sync: cursor-based backfill, capped at STRAVA_STREAMS_BATCH_SIZE per run
              console.log(`[FullSync] Running streams backfill for user ${userId} (${userEmail})`);
              const streamResult = await runFullSyncBackfill(userId, accessToken);
              providerResult.streams = streamResult;
              result.totals.streams_stored = (result.totals.streams_stored || 0) + streamResult.stored;
              result.totals.streams_points = (result.totals.streams_points || 0) + streamResult.total_points;
            } else {
              // Incremental: only the batch we just imported
              const activitiesForStreams = getActivitiesNeedingStreams(userId, stravaProviderIds);
              console.log(`[FullSync] Incremental streams: ${activitiesForStreams.length}/${stravaProviderIds.length} need streams`);
              if (activitiesForStreams.length > 0) {
                const streamResult = await ingestStravaStreams(userId, accessToken, activitiesForStreams);
                providerResult.streams = streamResult;
                result.totals.streams_stored = (result.totals.streams_stored || 0) + streamResult.stored;
                result.totals.streams_points = (result.totals.streams_points || 0) + streamResult.total_points;
              } else {
                providerResult.streams = { stored: 0, total_points: 0 };
              }
            }
          } catch (streamErr) {
            console.error(`[FullSync] Stream ingestion error:`, streamErr.message);
            providerResult.streams = { error: streamErr.message };
          }
        } else {
          providerResult.streams = { enabled: false };
        }
      }
    } catch (err) {
      console.error(`[FullSync] Strava error:`, err.message);
      providerResult.error = err.message;
      result.totals.errors++;
    }

    result.providers.strava = providerResult;
  }

  // ── INTERVALS ───────────────────────────────────────────────────────
  if (providers.includes('intervals')) {
    const providerResult = { fetched: 0, imported: {}, error: null };

    try {
      const token = intervalsTokenDb.findByUserId(userId);
      if (!token?.access_token || !token?.athlete_id) {
        providerResult.error = 'Intervals.icu not connected';
      } else {
        let oldest, newest;
        newest = new Date().toISOString().split('T')[0];

        if (isFullSync) {
          // Full: go back 2 years
          const twoYearsAgo = new Date();
          twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
          oldest = twoYearsAgo.toISOString().split('T')[0];
        } else {
          // Incremental: since last sync minus overlap
          const state = providerSyncStateDb.get(userId, 'intervals');
          if (state?.last_incremental_sync_at) {
            const from = new Date(state.last_incremental_sync_at);
            from.setDate(from.getDate() - INCREMENTAL_OVERLAP_DAYS);
            oldest = from.toISOString().split('T')[0];
          } else {
            // First sync: 1 year
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oldest = oneYearAgo.toISOString().split('T')[0];
          }
        }

        const activities = await fetchIntervalsActivities(
          token.access_token, token.athlete_id, oldest, newest
        );

        providerResult.fetched = activities.length;

        if (activities.length > 0) {
          const importResult = bulkImport(userId, activities, 'intervals');
          providerResult.imported = {
            sources_upserted: importResult.sources_upserted,
            canonicals_created: importResult.canonicals_created,
            canonicals_updated: importResult.canonicals_updated,
            lite_stored: importResult.lite_stored,
            shells_ignored: importResult.lite_stored, // shells are stored as lite
            errors: importResult.errors.length
          };

          result.totals.fetched += providerResult.fetched;
          result.totals.sources_upserted += importResult.sources_upserted;
          result.totals.canonicals_created += importResult.canonicals_created;
          result.totals.canonicals_updated += importResult.canonicals_updated;
          result.totals.shells_ignored += importResult.lite_stored;
          result.totals.errors += importResult.errors.length;
        }

        // Update sync timestamps
        if (isFullSync) {
          providerSyncStateDb.upsertFullSync(userId, 'intervals', providerResult.fetched);
        }
        providerSyncStateDb.upsertIncremental(userId, 'intervals');
      }
    } catch (err) {
      console.error(`[FullSync] Intervals error:`, err.message);
      providerResult.error = err.message;
      result.totals.errors++;
    }

    result.providers.intervals = providerResult;
  }

  // ── WEEKLY RECOMPUTE ────────────────────────────────────────────────
  if (result.totals.canonicals_created > 0 || result.totals.canonicals_updated > 0) {
    try {
      console.log(`[FullSync] Recomputing weekly rollups...`);

      if (isFullSync) {
        // Full sync: recompute all weeks that have activities
        const allWeeks = db.prepare(`
          SELECT DISTINCT strftime('%Y-%m-%d', start_time, 'weekday 0', '-6 days') as week_start
          FROM activities
          WHERE user_id = ? AND is_shell = 0 AND start_time IS NOT NULL
          ORDER BY week_start
        `).all(userId).map(r => r.week_start).filter(Boolean);

        if (allWeeks.length > 0) {
          console.log(`[FullSync] Recomputing ${allWeeks.length} weeks...`);
          const weeklyResult = await recomputeWeeksForUser(userId, allWeeks, {
            lookbackWeeks: 0,
            maxWeeks: 200 // Allow large batch for full sync
          });
          result.weekly_recomputed = true;
          result.weekly_weeks = weeklyResult.computed;
          console.log(`[FullSync] Weekly: ${weeklyResult.computed}/${allWeeks.length} weeks recomputed`);
        }
      } else {
        // Incremental: recompute recent 4 weeks
        const { recomputeRecentWeeks } = await import('./weeklyRecomputeScheduler.js');
        const weeklyResult = await recomputeRecentWeeks(userId, 4);
        result.weekly_recomputed = true;
        result.weekly_weeks = weeklyResult.computed;
      }
    } catch (err) {
      console.error(`[FullSync] Weekly recompute error:`, err.message);
      result.weekly_error = err.message;
    }
  }

  result.durationMs = Date.now() - startMs;

  console.log(`[FullSync] ═══════════════════════════════════════`);
  console.log(`[FullSync] DONE in ${result.durationMs}ms`);
  console.log(`[FullSync] Fetched: ${result.totals.fetched}`);
  console.log(`[FullSync] Sources upserted: ${result.totals.sources_upserted}`);
  console.log(`[FullSync] Canonicals: ${result.totals.canonicals_created} created, ${result.totals.canonicals_updated} updated`);
  console.log(`[FullSync] Shells ignored: ${result.totals.shells_ignored}`);
  console.log(`[FullSync] Weekly: ${result.weekly_recomputed ? result.weekly_weeks + ' weeks' : 'skipped'}`);
  console.log(`[FullSync] ═══════════════════════════════════════`);

  // ── POST-SYNC VERIFICATION ──────────────────────────────────────────
  try {
    result.verification = runPostSyncVerification(userId, result);
  } catch (err) {
    console.error(`[FullSync] Verification error:`, err.message);
    result.verification = { error: err.message, verification_pass: false };
  }

  // Clean internal metadata before returning
  delete result._stravaFetchWindow;
  delete result._isFirstStravaSync;

  return result;
}

export default { runSync };
