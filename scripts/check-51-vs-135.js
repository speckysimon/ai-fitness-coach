/**
 * Debug: Check the 51 imported activities vs 135 skipped
 * Are the 51 actually from Intervals.icu or from Strava?
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'server', 'fitness-coach.db');
const db = new Database(dbPath);

console.log('\n🔍 Analyzing 51 imported activities vs 135 skipped\n');

// Get all activities with their sources
const activities = db.prepare(`
  SELECT 
    a.id,
    a.name,
    a.start_time,
    a.duration_s,
    a.distance_m,
    a.tss,
    a.avg_power,
    a.avg_hr,
    GROUP_CONCAT(s.provider) as providers
  FROM activities a
  LEFT JOIN activity_sources s ON a.id = s.activity_id
  WHERE a.start_time >= date('now', '-1 year')
  GROUP BY a.id
  ORDER BY a.start_time DESC
  LIMIT 60
`).all();

console.log(`Total activities in DB (last year): ${activities.length}\n`);

// Separate by provider
const intervalsOnly = activities.filter(a => a.providers === 'intervals');
const stravaOnly = activities.filter(a => a.providers === 'strava');
const both = activities.filter(a => a.providers && a.providers.includes(','));

console.log('📊 Breakdown by provider:');
console.log(`  Intervals only: ${intervalsOnly.length}`);
console.log(`  Strava only: ${stravaOnly.length}`);
console.log(`  Both providers: ${both.length}`);

console.log('\n🔍 Sample Intervals-only activities:');
intervalsOnly.slice(0, 5).forEach(a => {
  console.log(`  ${a.name}`);
  console.log(`    Duration: ${a.duration_s}s, Distance: ${a.distance_m}m`);
  console.log(`    TSS: ${a.tss}, Power: ${a.avg_power}W, HR: ${a.avg_hr}bpm`);
  console.log(`    Has data? ${a.duration_s > 0 || a.distance_m > 0 || a.tss > 0 ? 'YES' : 'NO'}`);
  console.log('');
});

// Check activity_sources for Intervals activities
console.log('\n🔍 Checking activity_sources for Intervals activities:');
const intervalsSources = db.prepare(`
  SELECT 
    provider,
    COUNT(*) as count,
    SUM(CASE WHEN duration_s > 0 THEN 1 ELSE 0 END) as with_duration,
    SUM(CASE WHEN distance_m > 0 THEN 1 ELSE 0 END) as with_distance,
    SUM(CASE WHEN tss > 0 THEN 1 ELSE 0 END) as with_tss
  FROM activity_sources
  WHERE provider = 'intervals'
  GROUP BY provider
`).all();

console.log('Activity sources (intervals):');
intervalsSources.forEach(s => {
  console.log(`  Provider: ${s.provider}`);
  console.log(`    Total: ${s.count}`);
  console.log(`    With duration > 0: ${s.with_duration}`);
  console.log(`    With distance > 0: ${s.with_distance}`);
  console.log(`    With TSS > 0: ${s.with_tss}`);
});

// Sample some activity_sources records
console.log('\n🔍 Sample activity_sources records (intervals):');
const sampleSources = db.prepare(`
  SELECT 
    provider_id,
    name,
    duration_s,
    distance_m,
    tss,
    avg_power,
    avg_hr
  FROM activity_sources
  WHERE provider = 'intervals'
  ORDER BY created_at DESC
  LIMIT 10
`).all();

sampleSources.forEach((s, i) => {
  console.log(`\n  Sample ${i + 1}:`);
  console.log(`    ID: ${s.provider_id}`);
  console.log(`    Name: ${s.name}`);
  console.log(`    Duration: ${s.duration_s}s, Distance: ${s.distance_m}m`);
  console.log(`    TSS: ${s.tss}, Power: ${s.avg_power}W, HR: ${s.avg_hr}bpm`);
  console.log(`    Has data? ${s.duration_s > 0 || s.distance_m > 0 || s.tss > 0 ? 'YES' : 'NO'}`);
});

db.close();

console.log('\n✅ Analysis complete\n');
console.log('HYPOTHESIS TO TEST:');
console.log('- If 51 activities are from Strava → Intervals API is the problem');
console.log('- If 51 activities are from Intervals with data → null→0 conversion is the problem');
console.log('- If activity_sources shows duration/distance but activities table shows 0 → merge logic problem');
