#!/usr/bin/env node

/**
 * Backfill Activity Interpretations
 * 
 * Computes interpretation payloads for activities in the last 180 days.
 * Idempotent - safe to run multiple times.
 * 
 * Usage:
 *   node server/scripts/backfill-interpretations.js [days] [userId]
 * 
 * Examples:
 *   node server/scripts/backfill-interpretations.js          # Last 180 days, all users
 *   node server/scripts/backfill-interpretations.js 90       # Last 90 days, all users
 *   node server/scripts/backfill-interpretations.js 180 1    # Last 180 days, user 1 only
 */

import { backfillInterpretations } from '../services/interpretationService.js';

const args = process.argv.slice(2);
const days = args[0] ? parseInt(args[0]) : 180;
const userId = args[1] ? parseInt(args[1]) : null;

console.log('🔄 Activity Interpretation Backfill\n');
console.log(`Configuration:`);
console.log(`  Days: ${days}`);
console.log(`  User: ${userId || 'all'}\n`);

const startTime = Date.now();

const result = await backfillInterpretations({ days, userId });

const duration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log(`
📊 Results:`);
console.log(`  Total activities: ${result.total}`);
console.log(`  Computed: ${result.computed}`);
console.log(`  v4 (stream-based): ${result.computed_v4}`);
console.log(`  v3 fallback: ${result.fallback_v3}`);
console.log(`  Stream missing: ${result.stream_missing}`);
console.log(`  Skipped: ${result.skipped}`);
console.log(`  Failed: ${result.failed}`);
console.log(`  Duration: ${duration}s`);
console.log(`
⚡ Performance:`);
console.log(`  Threshold cache hits: ${result.thresholdCacheHits}`);
console.log(`  Threshold cache misses: ${result.thresholdCacheMisses}`);
console.log(`  Unique users: ${result.uniqueUsers}`);
if (result.thresholdCacheHits + result.thresholdCacheMisses > 0) {
  const hitRate = (result.thresholdCacheHits / (result.thresholdCacheHits + result.thresholdCacheMisses) * 100).toFixed(1);
  console.log(`  Cache hit rate: ${hitRate}%`);
}

if (result.errors && result.errors.length > 0) {
  console.log(`\n❌ Errors (${result.errors.length}):`);
  result.errors.slice(0, 10).forEach(err => {
    console.log(`  ${err.activityId}: ${err.error}`);
  });
  if (result.errors.length > 10) {
    console.log(`  ... and ${result.errors.length - 10} more`);
  }
}

console.log(`\n${result.success ? '✅' : '⚠️'} Backfill ${result.success ? 'complete' : 'completed with errors'}\n`);

process.exit(result.success ? 0 : 1);
