/**
 * revert-pre2025-skip-flag.js
 *
 * One-time script to undo the DB mutation that set
 * streams_unavailable=1 / ignore_reason='pre_jan_2025_backfill_skip'
 * on activity_sources rows as a manual date-filter hack.
 *
 * streams_unavailable must ONLY mean "provider truly has no streams".
 * Date-scoping is now handled in code (getBackfillCandidates).
 *
 * Usage:
 *   node server/scripts/revert-pre2025-skip-flag.js
 *
 * Safe to run multiple times (idempotent).
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../fitness-coach.db');

const db = new Database(DB_PATH);

const SKIP_REASON = 'pre_jan_2025_backfill_skip';

// Count before
const before = db.prepare(
  `SELECT COUNT(*) as n FROM activity_sources WHERE ignore_reason = ?`
).get(SKIP_REASON).n;

console.log(`Found ${before} rows with ignore_reason='${SKIP_REASON}'`);

if (before === 0) {
  console.log('Nothing to revert. Exiting.');
  db.close();
  process.exit(0);
}

// Revert: clear the flag so these activities are eligible for real provider checks
const result = db.prepare(`
  UPDATE activity_sources
  SET streams_unavailable = NULL,
      ignore_reason       = NULL
  WHERE ignore_reason = ?
`).run(SKIP_REASON);

console.log(`Reverted ${result.changes} rows (streams_unavailable → NULL, ignore_reason → NULL)`);

// Verify
const after = db.prepare(
  `SELECT COUNT(*) as n FROM activity_sources WHERE ignore_reason = ?`
).get(SKIP_REASON).n;

console.log(`Remaining rows with skip reason: ${after}`);

if (after === 0) {
  console.log('✅ Revert complete. Pre-2025 activities are now eligible for normal provider checks.');
} else {
  console.error(`❌ ${after} rows still have the skip reason — check for concurrent writes.`);
  process.exit(1);
}

db.close();
