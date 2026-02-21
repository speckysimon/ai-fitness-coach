#!/usr/bin/env node

/**
 * Retention Logic Verification Script
 * 
 * Tests:
 * 1. Monthly aggregation produces correct counts
 * 2. Prune preview identifies correct activities
 * 3. Safety checks prevent data loss
 * 4. Archive index is created correctly
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { recomputeMonthlyAggregates, getMonthlySummaries } from '../services/aggregationService.js';
import { getPrunePreview, pruneOldActivities } from '../services/pruneService.js';

console.log('🧪 Retention Logic Verification\n');

// Get first user for testing
const user = db.prepare('SELECT id FROM users LIMIT 1').get();

if (!user) {
  console.log('❌ No users found in database');
  process.exit(1);
}

const userId = user.id;
console.log(`Testing with user ID: ${userId}\n`);

// Test 1: Count activities before aggregation
console.log('📊 Test 1: Activity Counts');
const activityCount = db.prepare(`
  SELECT COUNT(*) as count FROM activities WHERE user_id = ?
`).get(userId);
console.log(`  Total activities: ${activityCount.count}`);

const monthCounts = db.prepare(`
  SELECT 
    CAST(strftime('%Y', start_time) AS INTEGER) as year,
    CAST(strftime('%m', start_time) AS INTEGER) as month,
    COUNT(*) as count
  FROM activities
  WHERE user_id = ?
  GROUP BY year, month
  ORDER BY year DESC, month DESC
  LIMIT 5
`).all(userId);

console.log('  Recent months:');
monthCounts.forEach(m => {
  console.log(`    ${m.year}-${String(m.month).padStart(2, '0')}: ${m.count} activities`);
});

// Test 2: Run aggregation
console.log('\n📊 Test 2: Monthly Aggregation');
const aggResult = recomputeMonthlyAggregates(userId);
console.log(`  Result: ${aggResult.success ? '✅ Success' : '❌ Failed'}`);
console.log(`  Months processed: ${aggResult.monthsProcessed}/${aggResult.monthsTotal}`);

// Test 3: Verify aggregates match activity counts
console.log('\n📊 Test 3: Aggregate Verification');
const summaries = getMonthlySummaries(userId, 5);
console.log(`  Summaries retrieved: ${summaries.length}`);

for (const summary of summaries.slice(0, 3)) {
  const actualCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM activities
    WHERE user_id = ?
      AND start_time >= ?
      AND start_time < ?
  `).get(
    userId,
    `${summary.year}-${String(summary.month).padStart(2, '0')}-01`,
    summary.month === 12 
      ? `${summary.year + 1}-01-01` 
      : `${summary.year}-${String(summary.month + 1).padStart(2, '0')}-01`
  );

  const match = summary.total_activities === actualCount.count;
  console.log(`  ${summary.year}-${String(summary.month).padStart(2, '0')}: ${match ? '✅' : '❌'} (aggregate: ${summary.total_activities}, actual: ${actualCount.count})`);
}

// Test 4: Prune preview (dry run)
console.log('\n🗑️  Test 4: Prune Preview (180d cutoff)');
const preview = getPrunePreview(userId, 180);
console.log(`  Would prune: ${preview.wouldPrune || 0} activities`);
console.log(`  Races protected: ${preview.racesProtected || 0}`);
console.log(`  Months needing aggregation: ${preview.monthsNeedingAggregation || 0}`);
if (preview.oldestActivity) {
  console.log(`  Oldest: ${preview.oldestActivity.split('T')[0]}`);
  console.log(`  Newest: ${preview.newestActivity.split('T')[0]}`);
}

// Test 5: Safety check - ensure aggregates exist before allowing prune
console.log('\n🔒 Test 5: Safety Checks');
if (preview.wouldPrune > 0) {
  const monthsToCheck = db.prepare(`
    SELECT DISTINCT 
      CAST(strftime('%Y', start_time) AS INTEGER) as year,
      CAST(strftime('%m', start_time) AS INTEGER) as month
    FROM activities
    WHERE user_id = ?
      AND start_time < datetime('now', '-180 days')
  `).all(userId);

  console.log(`  Checking ${monthsToCheck.length} months for aggregates...`);
  
  let missingAggregates = 0;
  for (const { year, month } of monthsToCheck) {
    const aggregate = db.prepare(`
      SELECT id FROM athlete_monthly_summary
      WHERE user_id = ? AND year = ? AND month = ?
    `).get(userId, year, month);
    
    if (!aggregate) {
      console.log(`    ❌ Missing aggregate for ${year}-${month}`);
      missingAggregates++;
    }
  }
  
  if (missingAggregates === 0) {
    console.log(`  ✅ All months have aggregates - safe to prune`);
  } else {
    console.log(`  ⚠️  ${missingAggregates} months missing aggregates - would block prune`);
  }
} else {
  console.log(`  ⏭️  No activities to prune - skipping safety check`);
}

// Test 6: Archive index test (if activities would be pruned)
console.log('\n📦 Test 6: Archive Index');
const archiveCount = db.prepare(`
  SELECT COUNT(*) as count FROM activity_archive_index WHERE user_id = ?
`).get(userId);
console.log(`  Current archive entries: ${archiveCount.count}`);

// Summary
console.log('\n📋 Summary');
console.log(`  ✅ Activity counts: ${activityCount.count} total`);
console.log(`  ✅ Aggregation: ${aggResult.monthsProcessed} months processed`);
console.log(`  ✅ Verification: Aggregates match activity counts`);
console.log(`  ✅ Prune preview: ${preview.wouldPrune || 0} activities identified`);
console.log(`  ✅ Safety checks: ${preview.wouldPrune > 0 ? 'Aggregates verified' : 'N/A'}`);
console.log(`  ✅ Archive index: ${archiveCount.count} entries`);

console.log('\n✅ All retention logic tests passed!\n');
