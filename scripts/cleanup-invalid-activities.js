/**
 * Cleanup Invalid Activities Script
 * 
 * Removes "Untitled Activity" entries with no meaningful data
 * (duration=0, distance=0, no TSS, no power)
 * 
 * These are typically Intervals.icu "shell" activities that are just
 * references to Strava activities without actual data.
 * 
 * Run with: node scripts/cleanup-invalid-activities.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'server', 'fitness-coach.db');
const db = new Database(dbPath);

console.log('🧹 Activity Cleanup Script');
console.log('==========================\n');

// Find invalid activities (no meaningful data)
const invalidActivities = db.prepare(`
  SELECT a.id, a.name, a.duration_s, a.distance_m, a.tss, a.primary_source, a.start_time
  FROM activities a
  WHERE (a.duration_s IS NULL OR a.duration_s = 0)
    AND (a.distance_m IS NULL OR a.distance_m = 0)
    AND (a.tss IS NULL OR a.tss = 0)
    AND (a.avg_power IS NULL OR a.avg_power = 0)
`).all();

console.log(`Found ${invalidActivities.length} invalid activities\n`);

if (invalidActivities.length === 0) {
  console.log('✅ No invalid activities to clean up');
  process.exit(0);
}

// Show sample of what will be deleted
console.log('Sample of activities to delete:');
invalidActivities.slice(0, 5).forEach(a => {
  console.log(`  - ${a.name} (${a.primary_source}) - ${a.start_time}`);
});
if (invalidActivities.length > 5) {
  console.log(`  ... and ${invalidActivities.length - 5} more\n`);
}

// Check for --dry-run flag
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  console.log('🔍 DRY RUN - No changes will be made\n');
} else {
  console.log('⚠️  This will DELETE these activities and their sources\n');
}

// Delete in a transaction
const deleteActivities = db.transaction(() => {
  let sourcesDeleted = 0;
  let activitiesDeleted = 0;
  
  for (const activity of invalidActivities) {
    // Delete associated sources first
    const sourceResult = db.prepare(`
      DELETE FROM activity_sources WHERE activity_id = ?
    `).run(activity.id);
    sourcesDeleted += sourceResult.changes;
    
    // Delete the activity
    const activityResult = db.prepare(`
      DELETE FROM activities WHERE id = ?
    `).run(activity.id);
    activitiesDeleted += activityResult.changes;
  }
  
  return { sourcesDeleted, activitiesDeleted };
});

if (!isDryRun) {
  const result = deleteActivities();
  console.log(`✅ Deleted ${result.activitiesDeleted} activities`);
  console.log(`✅ Deleted ${result.sourcesDeleted} activity sources`);
} else {
  console.log(`Would delete ${invalidActivities.length} activities`);
  
  // Count sources that would be deleted
  const sourceCount = db.prepare(`
    SELECT COUNT(*) as count FROM activity_sources 
    WHERE activity_id IN (
      SELECT a.id FROM activities a
      WHERE (a.duration_s IS NULL OR a.duration_s = 0)
        AND (a.distance_m IS NULL OR a.distance_m = 0)
        AND (a.tss IS NULL OR a.tss = 0)
        AND (a.avg_power IS NULL OR a.avg_power = 0)
    )
  `).get();
  console.log(`Would delete ${sourceCount.count} activity sources`);
}

// Show remaining stats
const stats = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN primary_source = 'intervals' THEN 1 ELSE 0 END) as intervals,
    SUM(CASE WHEN primary_source = 'strava' THEN 1 ELSE 0 END) as strava,
    SUM(CASE WHEN primary_source = 'manual' THEN 1 ELSE 0 END) as manual
  FROM activities
`).get();

console.log('\n📊 Remaining activities:');
console.log(`  Total: ${stats.total}`);
console.log(`  Intervals: ${stats.intervals}`);
console.log(`  Strava: ${stats.strava}`);
console.log(`  Manual: ${stats.manual}`);

db.close();
console.log('\n✅ Done');
