/**
 * Dev Reset and Full Reimport Script
 * 
 * CRITICAL: This is a DESTRUCTIVE operation for development/testing only.
 * 
 * Purpose:
 * - Wipe all activity data for a user (preserves account + OAuth tokens)
 * - Re-import from providers using normal ingestion paths
 * - Verify display class stability (no UI behavior changes)
 * 
 * Usage:
 *   node server/scripts/devResetAndReimport.js --userId=1
 *   node server/scripts/devResetAndReimport.js --userId=1 --providers=intervals,strava
 *   node server/scripts/devResetAndReimport.js --userId=1 --limit=100
 */

import db from '../db.js';
import { getDisplayClassCounts } from '../services/activityDisplayClassAdapter.js';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value;
  return acc;
}, {});

const userId = parseInt(args.userId);
const providers = args.providers ? args.providers.split(',') : ['intervals', 'strava'];
const limit = args.limit ? parseInt(args.limit) : null;

if (!userId || isNaN(userId)) {
  console.error('❌ ERROR: --userId is required and must be a number');
  console.error('Usage: node server/scripts/devResetAndReimport.js --userId=1');
  process.exit(1);
}

console.log('🔧 DEV RESET AND REIMPORT');
console.log('========================');
console.log(`User ID: ${userId}`);
console.log(`Providers: ${providers.join(', ')}`);
console.log(`Limit: ${limit || 'none'}`);
console.log('');

/**
 * Step 1: Capture baseline display class counts (before wipe)
 */
async function captureBaseline() {
  console.log('📊 [BASELINE] Capturing current display class counts...');
  
  const activities = db.prepare(`
    SELECT * FROM activities 
    WHERE user_id = ? 
    ORDER BY start_time DESC
  `).all(userId);
  
  const counts = getDisplayClassCounts(activities);
  
  console.log(`   Total activities: ${counts.total}`);
  console.log(`   Valid for analytics: ${counts.valid}`);
  console.log(`   Hidden from main: ${counts.hidden}`);
  console.log(`   By source:`, counts.bySource);
  console.log(`   By type:`, counts.byType);
  console.log(`   By quality:`, counts.byQuality);
  console.log('');
  
  return counts;
}

/**
 * Step 2: Wipe activity data (DESTRUCTIVE)
 */
async function wipeActivityData() {
  console.log('🗑️  [WIPE] Deleting activity data...');
  
  // Start transaction
  db.prepare('BEGIN TRANSACTION').run();
  
  try {
    // Tables to wipe (in dependency order)
    const tablesToWipe = [
      'activity_interpretation',      // Derived interpretations
      'activity_streams',              // Stream data
      'activity_laps',                 // Lap data
      'activity_sources',              // Provider source records
      'activities',                    // Canonical activities
      'athlete_monthly_bests',         // Monthly aggregates
      'athlete_monthly_summary',       // Monthly summaries
      'workout_comparisons',           // Workout analysis
      'race_tags',                     // Race markers
      'race_analyses'                  // Race analysis
    ];
    
    const deleteCounts = {};
    
    for (const table of tablesToWipe) {
      // Check if table exists
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `).get(table);
      
      if (tableExists) {
        const result = db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
        deleteCounts[table] = result.changes;
        console.log(`   ✓ ${table}: ${result.changes} rows deleted`);
      } else {
        console.log(`   ⊘ ${table}: table does not exist (skipped)`);
      }
    }
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    console.log('   ✅ Wipe complete');
    console.log('');
    
    return deleteCounts;
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('   ❌ Wipe failed, rolled back:', error.message);
    throw error;
  }
}

/**
 * Step 3: Verify OAuth tokens still exist
 */
async function verifyOAuthTokens() {
  console.log('🔑 [VERIFY] Checking OAuth tokens...');
  
  const tokens = {
    strava: db.prepare('SELECT user_id FROM strava_tokens WHERE user_id = ?').get(userId),
    intervals: db.prepare('SELECT user_id FROM intervals_tokens WHERE user_id = ?').get(userId)
  };
  
  console.log(`   Strava: ${tokens.strava ? '✓ Connected' : '✗ Not connected'}`);
  console.log(`   Intervals: ${tokens.intervals ? '✓ Connected' : '✗ Not connected'}`);
  console.log('');
  
  return tokens;
}

/**
 * Step 4: Reimport from providers
 */
async function reimportFromProviders(tokens) {
  console.log('📥 [REIMPORT] Starting provider imports...');
  console.log('');
  
  const stats = {
    intervals: { imported: 0, shells: 0, errors: 0 },
    strava: { imported: 0, attached: 0, errors: 0 },
    enrichment: { attempted: 0, enriched: 0, failed: 0 }
  };
  
  // Import from Intervals first (creates canonicals for native, sources for shells)
  if (providers.includes('intervals') && tokens.intervals) {
    console.log('📦 [INTERVALS] Importing from Intervals.icu...');
    
    try {
      // Dynamic import to avoid circular dependencies
      const { syncIntervalsActivities } = await import('../services/intervalsImportService.js');
      
      const result = await syncIntervalsActivities(userId, {
        limit: limit,
        detectShells: true  // Enable shell detection
      });
      
      if (result.ok) {
        stats.intervals.imported = result.data.created + result.data.updated;
        stats.intervals.shells = result.data.shellsDetected || 0;
        console.log(`   ✓ Imported: ${stats.intervals.imported} activities`);
        console.log(`   ⚠ Shells detected: ${stats.intervals.shells}`);
      } else {
        stats.intervals.errors++;
        console.error(`   ✗ Import failed:`, result.error);
      }
    } catch (error) {
      stats.intervals.errors++;
      console.error(`   ✗ Import error:`, error.message);
    }
    
    console.log('');
  }
  
  // Enrich shells from Strava (if Strava connected)
  if (tokens.strava && stats.intervals.shells > 0) {
    console.log('🔄 [ENRICHMENT] Enriching shells from Strava...');
    
    try {
      const { enrichPendingShells } = await import('../services/stravaEnrichmentService.js');
      
      const result = await enrichPendingShells(userId, limit || 50);
      
      stats.enrichment.attempted = stats.intervals.shells;
      stats.enrichment.enriched = result.enriched || 0;
      stats.enrichment.failed = result.failed || 0;
      
      console.log(`   ✓ Enriched: ${stats.enrichment.enriched}`);
      console.log(`   ✗ Failed: ${stats.enrichment.failed}`);
    } catch (error) {
      console.error(`   ✗ Enrichment error:`, error.message);
    }
    
    console.log('');
  }
  
  // Import from Strava (attach as sources, no physiology overwrites)
  if (providers.includes('strava') && tokens.strava) {
    console.log('📦 [STRAVA] Importing from Strava...');
    console.log('   ℹ️  Strava data will attach as sources only');
    console.log('   ℹ️  Intervals-native physiology will NOT be overwritten');
    
    try {
      const { syncStravaActivities } = await import('../services/stravaImportService.js');
      
      const result = await syncStravaActivities(userId, {
        limit: limit,
        attachOnly: true  // Only attach as sources, don't overwrite physiology
      });
      
      if (result.ok) {
        stats.strava.imported = result.data.created || 0;
        stats.strava.attached = result.data.attached || 0;
        console.log(`   ✓ New activities: ${stats.strava.imported}`);
        console.log(`   ✓ Attached to existing: ${stats.strava.attached}`);
      } else {
        stats.strava.errors++;
        console.error(`   ✗ Import failed:`, result.error);
      }
    } catch (error) {
      stats.strava.errors++;
      console.error(`   ✗ Import error:`, error.message);
    }
    
    console.log('');
  }
  
  return stats;
}

/**
 * Step 5: Verify display class stability
 */
async function verifyDisplayClasses(baselineCounts) {
  console.log('🔍 [VERIFY] Checking display class stability...');
  
  const activities = db.prepare(`
    SELECT * FROM activities 
    WHERE user_id = ? 
    ORDER BY start_time DESC
  `).all(userId);
  
  const newCounts = getDisplayClassCounts(activities);
  
  console.log(`   Total activities: ${newCounts.total} (baseline: ${baselineCounts.total})`);
  console.log(`   Valid for analytics: ${newCounts.valid} (baseline: ${baselineCounts.valid})`);
  console.log(`   Hidden from main: ${newCounts.hidden} (baseline: ${baselineCounts.hidden})`);
  console.log('');
  
  // Check for significant deviations
  const deviations = [];
  
  if (Math.abs(newCounts.valid - baselineCounts.valid) > 5) {
    deviations.push(`Valid count changed: ${baselineCounts.valid} → ${newCounts.valid}`);
  }
  
  if (Math.abs(newCounts.hidden - baselineCounts.hidden) > 5) {
    deviations.push(`Hidden count changed: ${baselineCounts.hidden} → ${newCounts.hidden}`);
  }
  
  // Check source distribution
  for (const source in baselineCounts.bySource) {
    const baselineCount = baselineCounts.bySource[source];
    const newCount = newCounts.bySource[source] || 0;
    const diff = Math.abs(newCount - baselineCount);
    
    if (diff > 5) {
      deviations.push(`${source} count changed: ${baselineCount} → ${newCount}`);
    }
  }
  
  if (deviations.length > 0) {
    console.log('   ⚠️  DEVIATIONS DETECTED:');
    deviations.forEach(d => console.log(`      - ${d}`));
    console.log('');
  } else {
    console.log('   ✅ Display classes stable (no significant deviations)');
    console.log('');
  }
  
  return { newCounts, deviations };
}

/**
 * Step 5.5: Report source distributions
 */
async function reportSourceDistributions() {
  console.log('📊 [SOURCES] Source distribution report...');
  console.log('');
  
  // Physiology sources
  const physiologySources = db.prepare(`
    SELECT 
      COALESCE(physiology_source, 'none') as source,
      COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY physiology_source
    ORDER BY count DESC
  `).all(userId);
  
  console.log('   📊 Physiology Sources:');
  physiologySources.forEach(row => {
    console.log(`      ${row.source}: ${row.count}`);
  });
  console.log('');
  
  // Metadata sources
  const metadataSources = db.prepare(`
    SELECT 
      COALESCE(metadata_source, 'none') as source,
      COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY metadata_source
    ORDER BY count DESC
  `).all(userId);
  
  console.log('   📊 Metadata Sources:');
  metadataSources.forEach(row => {
    console.log(`      ${row.source}: ${row.count}`);
  });
  console.log('');
  
  // Activity type breakdown
  const activityTypes = db.prepare(`
    SELECT 
      CASE
        WHEN is_shell = 1 THEN 'shell'
        WHEN physiology_source = 'intervals' THEN 'intervals-native'
        WHEN physiology_source = 'strava' THEN 'strava-only'
        WHEN physiology_source = 'fit' THEN 'fit-upload'
        ELSE 'unknown'
      END as activity_type,
      COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY activity_type
    ORDER BY count DESC
  `).all(userId);
  
  console.log('   📊 Activity Types:');
  activityTypes.forEach(row => {
    console.log(`      ${row.activity_type}: ${row.count}`);
  });
  console.log('');
  
  // Source combinations
  const sourceCombos = db.prepare(`
    SELECT 
      COALESCE(physiology_source, 'none') as phys,
      COALESCE(metadata_source, 'none') as meta,
      COUNT(*) as count
    FROM activities
    WHERE user_id = ?
    GROUP BY physiology_source, metadata_source
    ORDER BY count DESC
  `).all(userId);
  
  console.log('   📊 Source Combinations (Physiology + Metadata):');
  sourceCombos.forEach(row => {
    console.log(`      ${row.phys} + ${row.meta}: ${row.count}`);
  });
  console.log('');
  
  return {
    physiologySources: physiologySources.reduce((acc, row) => {
      acc[row.source] = row.count;
      return acc;
    }, {}),
    metadataSources: metadataSources.reduce((acc, row) => {
      acc[row.source] = row.count;
      return acc;
    }, {}),
    activityTypes: activityTypes.reduce((acc, row) => {
      acc[row.activity_type] = row.count;
      return acc;
    }, {})
  };
}

/**
 * Step 6: Check for invalid activities in analytics
 */
async function checkInvalidActivities() {
  console.log('🔍 [VERIFY] Checking for invalid activities in analytics...');
  
  const invalidInAnalytics = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_valid_for_analytics = 1
      AND (
        duration_s = 0 OR duration_s IS NULL
        OR distance_m = 0 OR distance_m IS NULL
        OR name IS NULL OR name = ''
      )
  `).get(userId);
  
  const shellsInAnalytics = db.prepare(`
    SELECT COUNT(*) as count FROM activities
    WHERE user_id = ?
      AND is_valid_for_analytics = 1
      AND is_shell = 1
  `).get(userId);
  
  console.log(`   Invalid activities marked as valid: ${invalidInAnalytics.count}`);
  console.log(`   Shells marked as valid: ${shellsInAnalytics.count}`);
  
  if (invalidInAnalytics.count > 0 || shellsInAnalytics.count > 0) {
    console.log('   ❌ FAIL: Invalid activities found in analytics');
  } else {
    console.log('   ✅ PASS: No invalid activities in analytics');
  }
  
  console.log('');
  
  return {
    invalidCount: invalidInAnalytics.count,
    shellCount: shellsInAnalytics.count
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    // Step 1: Capture baseline
    const baselineCounts = await captureBaseline();
    
    // Step 2: Wipe data
    const deleteCounts = await wipeActivityData();
    
    // Step 3: Verify OAuth tokens
    const tokens = await verifyOAuthTokens();
    
    // Step 4: Reimport from providers
    const importStats = await reimportFromProviders(tokens);
    
    // Step 5: Verify display class stability
    const verification = await verifyDisplayClasses(baselineCounts);
    
    // Step 5.5: Report source distributions
    const sourceReport = await reportSourceDistributions();
    
    // Step 6: Check for invalid activities
    const invalidCheck = await checkInvalidActivities();
    
    // Summary
    console.log('📋 SUMMARY');
    console.log('==========');
    console.log(`Wiped: ${Object.values(deleteCounts).reduce((a, b) => a + b, 0)} total rows`);
    console.log(`Intervals: ${importStats.intervals.imported} imported, ${importStats.intervals.shells} shells`);
    console.log(`Enrichment: ${importStats.enrichment.enriched} enriched, ${importStats.enrichment.failed} failed`);
    console.log(`Strava: ${importStats.strava.imported} new, ${importStats.strava.attached} attached`);
    console.log('');
    console.log('Source Distribution:');
    console.log(`  Physiology: ${JSON.stringify(sourceReport.physiologySources)}`);
    console.log(`  Metadata: ${JSON.stringify(sourceReport.metadataSources)}`);
    console.log(`  Types: ${JSON.stringify(sourceReport.activityTypes)}`);
    console.log('');
    console.log(`Display classes: ${verification.deviations.length === 0 ? '✅ Stable' : '⚠️  Changed'}`);
    console.log(`Invalid in analytics: ${invalidCheck.invalidCount === 0 && invalidCheck.shellCount === 0 ? '✅ None' : '❌ Found'}`);
    console.log('');
    
    if (verification.deviations.length === 0 && invalidCheck.invalidCount === 0 && invalidCheck.shellCount === 0) {
      console.log('✅ SUCCESS: Reset and reimport complete with stable display classes');
      process.exit(0);
    } else {
      console.log('⚠️  WARNING: Some issues detected, review output above');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('❌ FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run
main();
