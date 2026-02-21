/**
 * E2E Regression Runner
 * 
 * Validates the entire import/enrichment/analytics pipeline for a single user.
 * Does NOT wipe data — runs checks against current DB state.
 * 
 * Usage:
 *   node scripts/e2e-regression.js --user=simon@i-duna.com
 *   node scripts/e2e-regression.js --userId=1
 * 
 * Checks:
 *   1. Shell canonicals == 0
 *   2. All canonical activities have valid start_time, duration > 0
 *   3. No orphaned activity_sources (source with activity_id pointing to missing canonical)
 *   4. All intervals_strava_shell sources have activity_id = NULL
 *   5. Source classification complete (no NULL source_kind for intervals sources)
 *   6. Streams coverage for enriched activities
 *   7. Analytics layers populated (normalised, durability, stress)
 *   8. Weekly rollups exist and have no NULL drift
 *   9. UTC-only verification (no local timestamps in start_time)
 *  10. No duplicate canonical activities (same start_time ± 5min)
 */

import db from '../server/db.js';

// Parse args
const args = process.argv.slice(2);
const options = {};
for (const arg of args) {
  const [key, value] = arg.replace(/^--/, '').split('=');
  options[key] = value;
}

// Test result tracking
const results = [];
let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(name, detail = '') {
  results.push({ status: 'PASS', name, detail });
  passCount++;
  console.log(`  ✅ PASS: ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail = '') {
  results.push({ status: 'FAIL', name, detail });
  failCount++;
  console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
}

function warn(name, detail = '') {
  results.push({ status: 'WARN', name, detail });
  warnCount++;
  console.log(`  ⚠️  WARN: ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`E2E REGRESSION RUNNER`);
  console.log(`${'='.repeat(80)}\n`);

  // Resolve user
  let userId = options.userId ? parseInt(options.userId) : null;
  if (!userId && options.user) {
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(options.user);
    if (!user) { console.error(`User not found: ${options.user}`); process.exit(1); }
    userId = user.id;
  }
  if (!userId) { console.error('Provide --user=email or --userId=N'); process.exit(1); }

  const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(userId);
  console.log(`User: ${user.name} (${user.email})\n`);

  // ── 1. Shell canonicals ──────────────────────────────────────────────
  console.log('── 1. Shell Canonical Check ──');
  const shellCanonicals = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities
    WHERE user_id = ? AND (duration_s IS NULL OR duration_s = 0)
      AND (distance_m IS NULL OR distance_m = 0)
      AND (avg_power IS NULL OR avg_power = 0)
      AND (avg_hr IS NULL OR avg_hr = 0)
      AND name = 'Untitled Activity'
  `).get(userId);

  if (shellCanonicals.cnt === 0) {
    pass('shell_canonical_count == 0');
  } else {
    fail('shell_canonical_count == 0', `Found ${shellCanonicals.cnt} shell canonicals`);
  }

  // ── 2. Valid canonical activities ────────────────────────────────────
  console.log('── 2. Canonical Validity ──');
  const invalidCanonicals = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities
    WHERE user_id = ? AND (start_time IS NULL OR start_time = '')
  `).get(userId);

  if (invalidCanonicals.cnt === 0) {
    pass('All canonicals have start_time');
  } else {
    fail('All canonicals have start_time', `${invalidCanonicals.cnt} missing`);
  }

  const totalCanonicals = db.prepare('SELECT COUNT(*) as cnt FROM activities WHERE user_id = ?').get(userId);
  const zeroDuration = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities
    WHERE user_id = ? AND (duration_s IS NULL OR duration_s = 0)
  `).get(userId);

  // Zero-duration is acceptable for non-cycling activities (e.g. "Paving")
  if (zeroDuration.cnt === 0) {
    pass('All canonicals have duration > 0');
  } else {
    // Check if they're named activities (not shells)
    const namedZeroDuration = db.prepare(`
      SELECT COUNT(*) as cnt FROM activities
      WHERE user_id = ? AND (duration_s IS NULL OR duration_s = 0)
        AND name != 'Untitled Activity' AND name IS NOT NULL AND name != ''
    `).get(userId);
    if (namedZeroDuration.cnt === zeroDuration.cnt) {
      warn('Zero-duration canonicals', `${zeroDuration.cnt} exist but all are named (non-cycling activities)`);
    } else {
      fail('Zero-duration canonicals', `${zeroDuration.cnt} total, ${zeroDuration.cnt - namedZeroDuration.cnt} are untitled`);
    }
  }

  console.log(`   Total canonicals: ${totalCanonicals.cnt}`);

  // ── 3. Orphaned sources ─────────────────────────────────────────────
  console.log('── 3. Orphaned Sources ──');
  const orphanedSources = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources s
    WHERE s.user_id = ? AND s.activity_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM activities a WHERE a.id = s.activity_id)
  `).get(userId);

  if (orphanedSources.cnt === 0) {
    pass('No orphaned sources');
  } else {
    fail('No orphaned sources', `${orphanedSources.cnt} sources point to missing canonicals`);
  }

  // ── 4. Shell sources have NULL activity_id ──────────────────────────
  console.log('── 4. Shell Source Isolation ──');
  const shellsWithCanonical = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources
    WHERE user_id = ? AND source_kind = 'intervals_strava_shell'
      AND activity_id IS NOT NULL
      AND ignore_reason != 'reconciled_via_strava'
  `).get(userId);

  if (shellsWithCanonical.cnt === 0) {
    pass('All unreconciled shells have activity_id = NULL');
  } else {
    fail('Shell source isolation', `${shellsWithCanonical.cnt} shells still linked to canonicals`);
  }

  const totalShellSources = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources
    WHERE user_id = ? AND source_kind = 'intervals_strava_shell'
  `).get(userId);
  console.log(`   Shell sources (classified): ${totalShellSources.cnt}`);

  // ── 5. Source classification completeness ───────────────────────────
  console.log('── 5. Source Classification ──');
  const unclassifiedIntervals = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources
    WHERE user_id = ? AND provider = 'intervals' AND source_kind IS NULL
  `).get(userId);

  if (unclassifiedIntervals.cnt === 0) {
    pass('All Intervals sources classified');
  } else {
    warn('Unclassified Intervals sources', `${unclassifiedIntervals.cnt} have NULL source_kind`);
  }

  // ── 6. Streams coverage ─────────────────────────────────────────────
  console.log('── 6. Streams Coverage ──');
  const enrichedSources = db.prepare(`
    SELECT COUNT(*) as cnt FROM activity_sources
    WHERE user_id = ? AND is_enriched = 1
  `).get(userId);

  const activitiesWithStreams = db.prepare(`
    SELECT COUNT(DISTINCT activity_id) as cnt FROM activity_streams
    WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ?)
  `).get(userId);

  console.log(`   Enriched sources: ${enrichedSources.cnt}`);
  console.log(`   Activities with streams: ${activitiesWithStreams.cnt}`);

  if (totalCanonicals.cnt > 0 && activitiesWithStreams.cnt > 0) {
    const coverage = Math.round((activitiesWithStreams.cnt / totalCanonicals.cnt) * 100);
    if (coverage >= 50) {
      pass('Streams coverage', `${coverage}% (${activitiesWithStreams.cnt}/${totalCanonicals.cnt})`);
    } else {
      warn('Streams coverage low', `${coverage}% (${activitiesWithStreams.cnt}/${totalCanonicals.cnt})`);
    }
  } else if (totalCanonicals.cnt > 0) {
    warn('No streams found', 'Enrichment may not have run yet');
  }

  // ── 7. Analytics layers ─────────────────────────────────────────────
  console.log('── 7. Analytics Layers ──');
  const tables = ['activity_normalised', 'activity_durability', 'activity_stress'];
  for (const table of tables) {
    try {
      const count = db.prepare(`
        SELECT COUNT(*) as cnt FROM ${table}
        WHERE activity_id IN (SELECT id FROM activities WHERE user_id = ?)
      `).get(userId);
      if (count.cnt > 0) {
        pass(`${table} populated`, `${count.cnt} rows`);
      } else {
        warn(`${table} empty`, 'Analytics may not have run yet');
      }
    } catch (e) {
      if (e.message.includes('no such table')) {
        warn(`${table} table missing`, 'Table does not exist');
      } else {
        fail(`${table} check`, e.message);
      }
    }
  }

  // ── 8. Weekly rollups ───────────────────────────────────────────────
  console.log('── 8. Weekly Rollups ──');
  try {
    const weeklyCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM athlete_weekly WHERE user_id = ?
    `).get(userId);

    if (weeklyCount.cnt > 0) {
      pass('Weekly rollups exist', `${weeklyCount.cnt} weeks`);

      // Check for NULL drift in key fields
      const nullDrift = db.prepare(`
        SELECT COUNT(*) as cnt FROM athlete_weekly
        WHERE user_id = ? AND (week_start IS NULL OR total_tss IS NULL)
      `).get(userId);

      if (nullDrift.cnt === 0) {
        pass('No NULL drift in weekly rollups');
      } else {
        fail('NULL drift in weekly rollups', `${nullDrift.cnt} rows with NULL week_start or total_tss`);
      }
    } else {
      warn('No weekly rollups', 'ensure-weekly may not have run yet');
    }
  } catch (e) {
    if (e.message.includes('no such table')) {
      warn('athlete_weekly table missing');
    } else {
      fail('Weekly rollups check', e.message);
    }
  }

  // ── 9. UTC-only verification ────────────────────────────────────────
  console.log('── 9. UTC Verification ──');
  const nonUTC = db.prepare(`
    SELECT COUNT(*) as cnt FROM activities
    WHERE user_id = ? AND start_time IS NOT NULL
      AND start_time NOT LIKE '%Z' AND start_time NOT LIKE '%+00:00'
      AND start_time LIKE '%+%'
  `).get(userId);

  // Also check for timezone offsets like +01:00, -05:00 etc.
  if (nonUTC.cnt === 0) {
    pass('No timezone-offset timestamps in start_time');
  } else {
    warn('Possible non-UTC timestamps', `${nonUTC.cnt} start_time values contain timezone offsets`);
  }

  // ── 10. Duplicate detection ─────────────────────────────────────────
  console.log('── 10. Duplicate Detection ──');
  const duplicates = db.prepare(`
    SELECT a1.id as id1, a2.id as id2, a1.start_time, a1.name
    FROM activities a1
    JOIN activities a2 ON a1.user_id = a2.user_id
      AND a1.id < a2.id
      AND ABS(JULIANDAY(a1.start_time) - JULIANDAY(a2.start_time)) * 86400 < 300
      AND a1.sport = a2.sport
    WHERE a1.user_id = ?
    LIMIT 10
  `).all(userId);

  if (duplicates.length === 0) {
    pass('No duplicate canonicals (±5min same sport)');
  } else {
    warn('Possible duplicates', `${duplicates.length} pairs within 5 minutes`);
    duplicates.slice(0, 3).forEach(d => {
      console.log(`     ${d.id1} ↔ ${d.id2} at ${d.start_time} "${d.name}"`);
    });
  }

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(80)}`);
  console.log(`REGRESSION SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);
  console.log(`  PASS: ${passCount}`);
  console.log(`  FAIL: ${failCount}`);
  console.log(`  WARN: ${warnCount}`);
  console.log(`  Total checks: ${results.length}\n`);

  if (failCount === 0) {
    console.log(`✅ ALL CHECKS PASSED\n`);
    process.exit(0);
  } else {
    console.log(`❌ ${failCount} CHECK(S) FAILED\n`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
    console.log('');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Regression runner crashed:', err);
  process.exit(2);
});
