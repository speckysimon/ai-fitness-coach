/**
 * Diagnostic Script - Analyze Why Activities Are Being Skipped
 * 
 * Run with: node scripts/diagnose-skipped-activities.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'server', 'fitness-coach.db');
const db = new Database(dbPath);

console.log('🔍 Analyzing Skipped Activities\n');
console.log('================================\n');

// Get sample of activities that WERE imported
const imported = db.prepare(`
  SELECT 
    name,
    duration_s,
    distance_m,
    avg_power,
    avg_hr,
    tss
  FROM activities
  ORDER BY start_time DESC
  LIMIT 5
`).all();

console.log('✅ Sample of IMPORTED activities:');
imported.forEach(a => {
  console.log(`  ${a.name}`);
  console.log(`    Duration: ${a.duration_s}s, Distance: ${a.distance_m}m`);
  console.log(`    Power: ${a.avg_power || 'NULL'}, HR: ${a.avg_hr || 'NULL'}, TSS: ${a.tss || 'NULL'}`);
});
console.log('');

// Check for activities with zero values
const zeroValues = db.prepare(`
  SELECT 
    COUNT(*) as count,
    SUM(CASE WHEN duration_s = 0 THEN 1 ELSE 0 END) as zero_duration,
    SUM(CASE WHEN distance_m = 0 THEN 1 ELSE 0 END) as zero_distance,
    SUM(CASE WHEN avg_power = 0 OR avg_power IS NULL THEN 1 ELSE 0 END) as zero_power,
    SUM(CASE WHEN tss = 0 OR tss IS NULL THEN 1 ELSE 0 END) as zero_tss
  FROM activities
`).get();

console.log('📊 Activities with zero/null values:');
console.log(`  Total activities: ${zeroValues.count}`);
console.log(`  Zero duration: ${zeroValues.zero_duration}`);
console.log(`  Zero distance: ${zeroValues.zero_distance}`);
console.log(`  Zero/null power: ${zeroValues.zero_power}`);
console.log(`  Zero/null TSS: ${zeroValues.zero_tss}`);
console.log('');

console.log('🔍 Validation Logic Analysis:');
console.log('');
console.log('The isValidActivity() function requires:');
console.log('  hasDuration OR hasDistance OR hasTSS OR hasPower');
console.log('');
console.log('Where "meaningful" means:');
console.log('  - Numbers: value > 0 (not just !== null)');
console.log('  - Strings: non-empty and not "Untitled Activity"');
console.log('');

console.log('⚠️  PROBLEM IDENTIFIED:');
console.log('');
console.log('The normalization for Intervals.icu uses:');
console.log('  duration_s: raw.duration || raw.moving_time || raw.elapsed_time || 0');
console.log('  distance_m: raw.distance || 0');
console.log('  elevation_m: raw.elevation || raw.total_elevation_gain || 0');
console.log('');
console.log('If Intervals.icu returns NULL for these fields, they get set to 0.');
console.log('Then isValidActivity() checks if value > 0, which fails for 0.');
console.log('');
console.log('Activities with duration=0, distance=0, tss=null, power=null get skipped.');
console.log('');

console.log('💡 SOLUTION:');
console.log('');
console.log('Option 1: Change normalization to preserve NULL instead of defaulting to 0');
console.log('  duration_s: raw.duration || raw.moving_time || raw.elapsed_time || null');
console.log('  distance_m: raw.distance || null');
console.log('  elevation_m: raw.elevation || raw.total_elevation_gain || null');
console.log('');
console.log('Option 2: Relax validation to accept activities with ANY data (even if 0)');
console.log('  - Check if fields exist (not undefined)');
console.log('  - Allow 0 values for duration/distance');
console.log('  - Only skip if ALL fields are missing/null');
console.log('');
console.log('Option 3: Add logging to see what Intervals.icu actually returns');
console.log('  - Log raw API response before normalization');
console.log('  - Identify which fields are NULL vs 0 vs missing');
console.log('');

db.close();
