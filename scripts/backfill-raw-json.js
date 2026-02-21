/**
 * One-time backfill script: Re-fetch raw JSON for enriched Intervals.icu activities
 * that have raw_json = NULL.
 * 
 * Usage: node scripts/backfill-raw-json.js
 */
import Database from 'better-sqlite3';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INTERVALS_API_BASE = 'https://intervals.icu/api/v1';
const RATE_LIMIT_MS = 1100; // 1.1s between requests

const db = new Database(path.join(__dirname, '../server/fitness-coach.db'));

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function backfill() {
  // Get token
  const token = db.prepare('SELECT access_token, athlete_id FROM intervals_tokens LIMIT 1').get();
  if (!token) {
    console.error('No Intervals.icu token found');
    process.exit(1);
  }
  console.log(`Using athlete: ${token.athlete_id}`);

  // Find enriched sources missing raw_json
  const sources = db.prepare(`
    SELECT id, provider_id, name 
    FROM activity_sources 
    WHERE provider = 'intervals' 
      AND is_enriched = 1 
      AND (raw_json IS NULL OR raw_json = '')
      AND provider_id LIKE 'i%'
  `).all();

  console.log(`Found ${sources.length} enriched activities missing raw_json\n`);

  if (sources.length === 0) {
    console.log('Nothing to backfill!');
    db.close();
    return;
  }

  const updateStmt = db.prepare('UPDATE activity_sources SET raw_json = ? WHERE id = ?');
  let success = 0;
  let failed = 0;

  for (const source of sources) {
    const activityId = source.provider_id;
    console.log(`[${success + failed + 1}/${sources.length}] Fetching ${activityId} (${source.name})...`);

    try {
      const response = await axios.get(
        `${INTERVALS_API_BASE}/activity/${activityId}`,
        {
          headers: { 
            Authorization: `Bearer ${token.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const rawJson = JSON.stringify(response.data);
      updateStmt.run(rawJson, source.id);
      
      // Log what enriched fields we got
      const data = response.data;
      const fields = [];
      if (data.icu_zone_times) fields.push('power_zones');
      if (data.icu_hr_zone_times) fields.push('hr_zones');
      if (data.icu_intervals) fields.push('intervals');
      if (data.icu_variability_index) fields.push('VI');
      if (data.icu_efficiency_factor) fields.push('EF');
      if (data.decoupling != null) fields.push('decoupling');
      
      console.log(`  ✅ Stored (${(rawJson.length / 1024).toFixed(1)}KB) [${fields.join(', ')}]`);
      success++;
    } catch (error) {
      console.log(`  ❌ Failed: ${error.response?.status} ${error.response?.data?.error || error.message}`);
      failed++;
    }

    // Rate limit
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`\n=== Backfill Complete ===`);
  console.log(`Success: ${success}, Failed: ${failed}`);
  db.close();
}

backfill().catch(err => {
  console.error('Backfill error:', err);
  db.close();
  process.exit(1);
});
