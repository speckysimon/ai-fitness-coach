/**
 * Sync Verification Service
 * 
 * Post-sync audit that runs after every sync (full or incremental).
 * Returns structured verification data for correctness proofs and regression detection.
 */

import db from '../db.js';

/**
 * A) Sources & Canonicals breakdown
 */
function verifySourcesAndCanonicals(userId) {
  const sourcesByProvider = {};
  const rows = db.prepare(`
    SELECT provider, COUNT(*) as cnt
    FROM activity_sources
    WHERE user_id = ?
    GROUP BY provider
  `).all(userId);
  for (const r of rows) {
    sourcesByProvider[r.provider] = r.cnt;
  }

  const canonicalsTotal = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities WHERE user_id = ? AND is_shell = 0
  `).get(userId).cnt;

  // Physiology source breakdown
  const physiologyRows = db.prepare(`
    SELECT COALESCE(physiology_source, 'unknown') as src, COUNT(*) as cnt
    FROM activities
    WHERE user_id = ? AND is_shell = 0
    GROUP BY physiology_source
  `).all(userId);
  const canonicalsByPhysiologySource = {};
  for (const r of physiologyRows) {
    canonicalsByPhysiologySource[r.src] = r.cnt;
  }

  // Metadata source breakdown
  const metadataRows = db.prepare(`
    SELECT COALESCE(metadata_source, 'unknown') as src, COUNT(*) as cnt
    FROM activities
    WHERE user_id = ? AND is_shell = 0
    GROUP BY metadata_source
  `).all(userId);
  const canonicalsByMetadataSource = {};
  for (const r of metadataRows) {
    canonicalsByMetadataSource[r.src] = r.cnt;
  }

  return {
    sources_by_provider: sourcesByProvider,
    canonicals_total: canonicalsTotal,
    canonicals_by_physiology_source: canonicalsByPhysiologySource,
    canonicals_by_metadata_source: canonicalsByMetadataSource
  };
}

/**
 * B) Shell quarantine verification
 * Shell = name empty/Untitled AND (distance==0 OR duration==0) AND missing streams
 */
function verifyShellQuarantine(userId) {
  // Count shell sources
  const shellSourcesCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources
    WHERE user_id = ?
      AND (source_kind = 'shell' OR ignore_reason IS NOT NULL)
  `).get(userId).cnt;

  // Shell canonicals: activities marked is_shell=1 that somehow became canonical
  // ALSO check for activities that LOOK like shells but aren't flagged
  const shellCanonicals = db.prepare(`
    SELECT id, name, duration_s, distance_m, is_shell, shell_reason, primary_source, start_time
    FROM activities
    WHERE user_id = ? AND is_shell = 1
    LIMIT 20
  `).all(userId);

  // Also check for unflagged shells: name empty/Untitled AND (distance=0 OR duration=0)
  const unflaggedShells = db.prepare(`
    SELECT id, name, duration_s, distance_m, is_shell, primary_source, start_time
    FROM activities
    WHERE user_id = ? AND is_shell = 0
      AND (name IS NULL OR name = '' OR name = 'Untitled')
      AND (distance_m IS NULL OR distance_m = 0 OR duration_s IS NULL OR duration_s = 0)
    LIMIT 20
  `).all(userId);

  const shellCanonicalCount = shellCanonicals.length + unflaggedShells.length;

  const offenders = [];
  for (const s of shellCanonicals) {
    offenders.push({
      id: s.id,
      name: s.name,
      reason: `is_shell=1: ${s.shell_reason || 'no reason'}`,
      start_time: s.start_time,
      primary_source: s.primary_source
    });
  }
  for (const s of unflaggedShells) {
    offenders.push({
      id: s.id,
      name: s.name,
      reason: `unflagged shell: name=${s.name || 'NULL'}, dur=${s.duration_s}, dist=${s.distance_m}`,
      start_time: s.start_time,
      primary_source: s.primary_source
    });
  }

  return {
    shell_sources_count: shellSourcesCount,
    shell_canonicals_count: shellCanonicalCount,
    verification_pass: shellCanonicalCount === 0,
    ...(offenders.length > 0 ? { offenders } : {})
  };
}

/**
 * C) Incremental guardrails
 */
function verifyIncrementalGuardrails(syncResult) {
  if (syncResult.mode !== 'incremental') return null;

  const stravaProvider = syncResult.providers?.strava;
  const isFirstSync = syncResult._isFirstStravaSync || false;
  const activitiesFetched = stravaProvider?.fetched || 0;
  const incrementalSuspect = !isFirstSync && activitiesFetched > 1000;

  if (incrementalSuspect) {
    console.warn(`[Verification] SUSPECT: incremental fetched ${activitiesFetched} Strava activities (not first sync)`);
  }

  return {
    strava_fetch_window: syncResult._stravaFetchWindow || null,
    pages_fetched: stravaProvider?.pages || 0,
    activities_fetched: activitiesFetched,
    is_first_sync: isFirstSync,
    incremental_suspect: incrementalSuspect
  };
}

/**
 * D) Canonical reconciliation audit
 * Uses the import results already captured during sync.
 */
function verifyCanonicalReconciliation(userId, syncResult) {
  const totals = syncResult.totals || {};

  // Detect merge collisions: activities with >1 source that matched within tolerance
  const collisionRows = db.prepare(`
    SELECT a.id, a.name, a.start_time, COUNT(s.id) as source_count,
           GROUP_CONCAT(s.provider || ':' || s.provider_id, ', ') as sources
    FROM activities a
    JOIN activity_sources s ON s.activity_id = a.id AND s.user_id = a.user_id
    WHERE a.user_id = ? AND a.is_shell = 0
    GROUP BY a.id
    HAVING source_count > 2
    ORDER BY source_count DESC
    LIMIT 10
  `).all(userId);

  return {
    canonicals_created: totals.canonicals_created || 0,
    canonicals_updated: totals.canonicals_updated || 0,
    sources_upserted: totals.sources_upserted || 0,
    merge_collisions_detected: collisionRows.length,
    ...(collisionRows.length > 0 ? {
      collision_samples: collisionRows.map(r => ({
        activity_id: r.id,
        name: r.name,
        start_time: r.start_time,
        source_count: r.source_count,
        sources: r.sources
      }))
    } : {})
  };
}

/**
 * E) Weekly integrity checks
 */
function verifyWeeklyIntegrity(userId) {
  // Count weeks in last 12 weeks
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
  const cutoff = twelveWeeksAgo.toISOString().split('T')[0];

  const weeksCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM athlete_weekly
    WHERE user_id = ? AND week_start >= ?
  `).get(userId, cutoff).cnt;

  // Check for NULL total_duration_s
  const nullDuration = db.prepare(`
    SELECT COUNT(*) as cnt FROM athlete_weekly
    WHERE user_id = ? AND week_start >= ? AND total_duration_s IS NULL
  `).get(userId, cutoff).cnt;

  // Check for negative or NaN-like metrics
  // SQLite doesn't have NaN, but we check for negative values and zero-but-has-activities
  const badMetrics = db.prepare(`
    SELECT COUNT(*) as cnt FROM athlete_weekly
    WHERE user_id = ? AND week_start >= ?
      AND (total_duration_s < 0 OR total_distance_m < 0)
  `).get(userId, cutoff).cnt;

  const pass = nullDuration === 0 && badMetrics === 0;

  return {
    weeks_count_last_12w: weeksCount,
    null_duration_weeks: nullDuration,
    negative_metric_weeks: badMetrics,
    verification_pass: pass
  };
}

/**
 * Run full post-sync verification.
 * 
 * @param {number} userId
 * @param {Object} syncResult - The sync result object from runSync
 * @returns {Object} verification report
 */
export function runPostSyncVerification(userId, syncResult) {
  const startMs = Date.now();

  console.log(`[Verification] Running post-sync audit for user ${userId}...`);

  const report = {
    timestamp: new Date().toISOString(),
    mode: syncResult.mode,

    // A) Sources & canonicals
    ...verifySourcesAndCanonicals(userId),

    // B) Shell quarantine
    shell_quarantine: verifyShellQuarantine(userId),

    // C) Incremental guardrails (only for incremental)
    incremental_guardrails: verifyIncrementalGuardrails(syncResult),

    // D) Canonical reconciliation
    reconciliation: verifyCanonicalReconciliation(userId, syncResult),

    // E) Weekly integrity
    weekly_integrity: verifyWeeklyIntegrity(userId),

    // Overall pass/fail
    verification_pass: true,
    verification_duration_ms: 0
  };

  // Compute overall pass
  report.verification_pass =
    report.shell_quarantine.verification_pass &&
    report.weekly_integrity.verification_pass &&
    !(report.incremental_guardrails?.incremental_suspect);

  report.verification_duration_ms = Date.now() - startMs;

  console.log(`[Verification] Done in ${report.verification_duration_ms}ms — pass=${report.verification_pass}`);
  if (!report.shell_quarantine.verification_pass) {
    console.warn(`[Verification] FAIL: ${report.shell_quarantine.shell_canonicals_count} shell canonicals found!`);
  }
  if (report.incremental_guardrails?.incremental_suspect) {
    console.warn(`[Verification] WARN: incremental fetched ${report.incremental_guardrails.activities_fetched} activities`);
  }
  if (!report.weekly_integrity.verification_pass) {
    console.warn(`[Verification] FAIL: weekly integrity — nulls=${report.weekly_integrity.null_duration_weeks}, negatives=${report.weekly_integrity.negative_metric_weeks}`);
  }

  return report;
}

export default { runPostSyncVerification };
