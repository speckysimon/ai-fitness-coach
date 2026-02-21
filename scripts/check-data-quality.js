/**
 * Data Quality Check Script
 * 
 * Analyzes activities in the database to show data completeness
 * Run with: node scripts/check-data-quality.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'server', 'fitness-coach.db');
const db = new Database(dbPath);

console.log('📊 Activity Data Quality Report');
console.log('================================\n');

// Overall counts
const overall = db.prepare(`
  SELECT 
    COUNT(*) as total,
    MIN(start_time) as oldest,
    MAX(start_time) as newest,
    SUM(CASE WHEN primary_source = 'strava' THEN 1 ELSE 0 END) as strava,
    SUM(CASE WHEN primary_source = 'intervals' THEN 1 ELSE 0 END) as intervals,
    SUM(CASE WHEN primary_source = 'manual' THEN 1 ELSE 0 END) as manual
  FROM activities
`).get();

console.log('📈 Overall Statistics:');
console.log(`  Total activities: ${overall.total}`);
console.log(`  Date range: ${overall.oldest?.split('T')[0]} to ${overall.newest?.split('T')[0]}`);
console.log(`  Sources: Strava=${overall.strava}, Intervals=${overall.intervals}, Manual=${overall.manual}\n`);

// Data completeness
const completeness = db.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN duration_s > 0 THEN 1 ELSE 0 END) as with_duration,
    SUM(CASE WHEN distance_m > 0 THEN 1 ELSE 0 END) as with_distance,
    SUM(CASE WHEN avg_power > 0 THEN 1 ELSE 0 END) as with_power,
    SUM(CASE WHEN avg_hr > 0 THEN 1 ELSE 0 END) as with_hr,
    SUM(CASE WHEN tss > 0 THEN 1 ELSE 0 END) as with_tss,
    SUM(CASE WHEN elevation_m > 0 THEN 1 ELSE 0 END) as with_elevation
  FROM activities
`).get();

console.log('🔍 Data Completeness:');
console.log(`  Duration: ${completeness.with_duration}/${completeness.total} (${Math.round(completeness.with_duration/completeness.total*100)}%)`);
console.log(`  Distance: ${completeness.with_distance}/${completeness.total} (${Math.round(completeness.with_distance/completeness.total*100)}%)`);
console.log(`  Power: ${completeness.with_power}/${completeness.total} (${Math.round(completeness.with_power/completeness.total*100)}%)`);
console.log(`  Heart Rate: ${completeness.with_hr}/${completeness.total} (${Math.round(completeness.with_hr/completeness.total*100)}%)`);
console.log(`  TSS: ${completeness.with_tss}/${completeness.total} (${Math.round(completeness.with_tss/completeness.total*100)}%)`);
console.log(`  Elevation: ${completeness.with_elevation}/${completeness.total} (${Math.round(completeness.with_elevation/completeness.total*100)}%)\n`);

// Data quality categories
const categories = db.prepare(`
  SELECT 
    CASE 
      WHEN avg_power > 0 AND avg_hr > 0 THEN 'Complete (Power + HR)'
      WHEN avg_power > 0 THEN 'Power only'
      WHEN avg_hr > 0 THEN 'HR only'
      WHEN duration_s > 0 THEN 'Basic (duration/distance only)'
      ELSE 'Empty'
    END as category,
    COUNT(*) as count
  FROM activities
  GROUP BY category
  ORDER BY count DESC
`).all();

console.log('📊 Data Quality Categories:');
categories.forEach(cat => {
  console.log(`  ${cat.category}: ${cat.count} activities`);
});
console.log('');

// Activities by source
const sources = db.prepare(`
  SELECT 
    primary_source,
    COUNT(*) as count,
    SUM(CASE WHEN avg_power > 0 THEN 1 ELSE 0 END) as with_power,
    SUM(CASE WHEN avg_hr > 0 THEN 1 ELSE 0 END) as with_hr
  FROM activities
  GROUP BY primary_source
`).all();

console.log('🔗 By Source:');
sources.forEach(src => {
  console.log(`  ${src.primary_source}: ${src.count} activities (${src.with_power} with power, ${src.with_hr} with HR)`);
});
console.log('');

// Recent activities sample
const recent = db.prepare(`
  SELECT 
    name,
    start_time,
    primary_source,
    duration_s,
    distance_m,
    avg_power,
    avg_hr,
    tss
  FROM activities
  ORDER BY start_time DESC
  LIMIT 10
`).all();

console.log('📅 Recent 10 Activities:');
recent.forEach(a => {
  const date = a.start_time.split('T')[0];
  const duration = a.duration_s ? `${Math.round(a.duration_s/60)}min` : 'N/A';
  const distance = a.distance_m ? `${(a.distance_m/1000).toFixed(1)}km` : 'N/A';
  const power = a.avg_power ? `${a.avg_power}W` : 'N/A';
  const hr = a.avg_hr ? `${a.avg_hr}bpm` : 'N/A';
  const tss = a.tss ? `${a.tss}TSS` : 'N/A';
  
  console.log(`  ${date} - ${a.name.substring(0, 30).padEnd(30)} [${a.primary_source}]`);
  console.log(`    ${duration} | ${distance} | ${power} | ${hr} | ${tss}`);
});
console.log('');

// Check for activities with missing critical data
const missing = db.prepare(`
  SELECT 
    id,
    name,
    start_time,
    primary_source,
    duration_s,
    distance_m,
    avg_power,
    avg_hr
  FROM activities
  WHERE duration_s > 0 
    AND (avg_power IS NULL OR avg_power = 0)
    AND (avg_hr IS NULL OR avg_hr = 0)
  ORDER BY start_time DESC
  LIMIT 5
`).all();

if (missing.length > 0) {
  console.log('⚠️  Activities with Duration but Missing Power/HR:');
  missing.forEach(a => {
    const date = a.start_time.split('T')[0];
    const duration = Math.round(a.duration_s/60);
    const distance = a.distance_m ? (a.distance_m/1000).toFixed(1) : 'N/A';
    console.log(`  ${date} - ${a.name} [${a.primary_source}]`);
    console.log(`    ${duration}min, ${distance}km - No power/HR data`);
  });
  console.log('');
}

// Check activity_sources table
const sourcesCount = db.prepare(`
  SELECT 
    provider,
    COUNT(*) as count
  FROM activity_sources
  GROUP BY provider
`).all();

console.log('💾 Activity Sources Table:');
sourcesCount.forEach(src => {
  console.log(`  ${src.provider}: ${src.count} source records`);
});
console.log('');

// Multi-source activities
const multiSource = db.prepare(`
  SELECT 
    a.id,
    a.name,
    a.start_time,
    a.primary_source,
    COUNT(s.id) as source_count,
    GROUP_CONCAT(s.provider) as providers
  FROM activities a
  LEFT JOIN activity_sources s ON a.id = s.activity_id
  GROUP BY a.id
  HAVING source_count > 1
  ORDER BY start_time DESC
  LIMIT 5
`).all();

if (multiSource.length > 0) {
  console.log('🔗 Activities with Multiple Sources:');
  multiSource.forEach(a => {
    const date = a.start_time.split('T')[0];
    console.log(`  ${date} - ${a.name} [primary: ${a.primary_source}]`);
    console.log(`    Sources: ${a.providers} (${a.source_count} total)`);
  });
  console.log('');
}

console.log('✅ Report complete');
db.close();
