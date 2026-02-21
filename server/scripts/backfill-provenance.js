#!/usr/bin/env node

/**
 * Backfill Metric Provenance
 * 
 * Recomputes metric provenance for existing activities by re-running applyBestDataWins.
 * This does NOT change merge behavior - it only tracks which provider supplied each metric.
 * 
 * Usage:
 *   node server/scripts/backfill-provenance.js [days] [userId]
 * 
 * Examples:
 *   node server/scripts/backfill-provenance.js          # Last 180 days, all users
 *   node server/scripts/backfill-provenance.js 90       # Last 90 days, all users
 *   node server/scripts/backfill-provenance.js 180 1    # Last 180 days, user 1 only
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { applyBestDataWins } from '../services/activityImportService.js';

const args = process.argv.slice(2);
const days = args[0] ? parseInt(args[0]) : 180;
const userId = args[1] ? parseInt(args[1]) : null;

console.log('🔄 Metric Provenance Backfill\n');
console.log(`Configuration:`);
console.log(`  Days: ${days}`);
console.log(`  User: ${userId || 'all'}\n`);

const startTime = Date.now();

// Get activities to process
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - days);
const cutoffISO = cutoffDate.toISOString();

let query = `
  SELECT a.id, a.name, a.start_time
  FROM activities a
  WHERE a.start_time >= ?
    AND a.primary_source != 'manual'
`;
const params = [cutoffISO];

if (userId) {
  query += ` AND a.user_id = ?`;
  params.push(userId);
}

query += ` ORDER BY a.start_time DESC`;

const activities = db.prepare(query).all(...params);

console.log(`📊 Found ${activities.length} activities to process\n`);

let processed = 0;
let updated = 0;
let skipped = 0;
let failed = 0;
const errors = [];

for (const activity of activities) {
  try {
    // Re-run applyBestDataWins to compute provenance
    // Now processes all activities (single-source and multi-source)
    // to ensure complete provenance attribution
    applyBestDataWins(activity.id);
    
    // Check if provenance was set
    const result = db.prepare(`
      SELECT metric_provenance_json FROM activities WHERE id = ?
    `).get(activity.id);
    
    if (result.metric_provenance_json) {
      updated++;
    }
    
    processed++;
    
    if (processed % 10 === 0) {
      console.log(`  Processed ${processed}/${activities.length}...`);
    }
  } catch (error) {
    failed++;
    errors.push({ activityId: activity.id, error: error.message });
    console.error(`  ❌ Failed ${activity.id}:`, error.message);
  }
}

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`\n📊 Results:`);
console.log(`  Total activities: ${activities.length}`);
console.log(`  Processed: ${processed}`);
console.log(`  Updated with provenance: ${updated}`);
console.log(`  Failed: ${failed}`);
console.log(`  Duration: ${duration}s`);

if (errors.length > 0) {
  console.log(`\n❌ Errors (${errors.length}):`);
  errors.slice(0, 10).forEach(err => {
    console.log(`  ${err.activityId}: ${err.error}`);
  });
  if (errors.length > 10) {
    console.log(`  ... and ${errors.length - 10} more`);
  }
}

console.log(`\n${failed === 0 ? '✅' : '⚠️'} Backfill ${failed === 0 ? 'complete' : 'completed with errors'}\n`);

process.exit(failed === 0 ? 0 : 1);
