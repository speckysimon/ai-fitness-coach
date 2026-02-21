'use strict';
const fs = require('fs');
const path = require('path');
const db = require('better-sqlite3')('./server/fitness-coach.db');

let pass = 0, fail = 0;
function ok(label)   { console.log('  ✅', label); pass++; }
function bad(label)  { console.error('  ❌', label); fail++; }
function check(label, cond) { cond ? ok(label) : bad(label); }

function src(file) {
  return fs.readFileSync(path.join(__dirname, '..', 'server', file), 'utf8');
}

// ── Section A: API contract ───────────────────────────────────────────────────
console.log('\n── Section A: API contract ──');
const routeSrc = src('routes/thresholds.js');
check('A1: GET route explicitly sets ftp_w',      routeSrc.includes('ftp_w:'));
check('A2: GET route explicitly sets fthr_bpm',   routeSrc.includes('fthr_bpm:'));
check('A3: GET route explicitly sets ftp_source', routeSrc.includes('ftp_source:'));
check('A4: GET route explicitly sets is_default', routeSrc.includes('is_default:'));
check('A5: GET route uses ?? null guards',         routeSrc.includes('?? null'));

// ── Section B: Consumer bypass detection ─────────────────────────────────────
console.log('\n── Section B: Consumer bypass detection ──');
const consumers = [
  'services/activityNormaliser.js',
  'services/durabilityCalculator.js',
  'services/limiterEngineService.js',
  'services/activityStressClassifier.js',
  'services/interpretationService.js',
];
for (const file of consumers) {
  const s = src(file);
  check(`B: ${path.basename(file)} — no FROM athlete_thresholds`,  !s.includes('FROM athlete_thresholds'));
  check(`B: ${path.basename(file)} — no getAthleteThresholds`,     !s.includes('getAthleteThresholds'));
  check(`B: ${path.basename(file)} — no users.ftp`,                !s.includes('users.ftp'));
  check(`B: ${path.basename(file)} — uses getUserThresholds`,       s.includes('getUserThresholds'));
}
// Stress classifier specific: no per-activity NP as FTP proxy
const stressSrc = src('services/activityStressClassifier.js');
check('B: stressClassifier — no normalized_power as FTP', !stressSrc.match(/normalized_power.*ftp|ftp.*normalized_power/i));

// ── Section C: Precedence (DB state) ─────────────────────────────────────────
console.log('\n── Section C: Precedence (DB state) ──');
const cols = db.prepare('PRAGMA table_info(athlete_thresholds)').all().map(c => c.name);
check('C1: ftp_w column exists',           cols.includes('ftp_w'));
check('C2: ftp_source column exists',      cols.includes('ftp_source'));
check('C3: ftp_confidence column exists',  cols.includes('ftp_confidence'));
check('C4: fthr_confidence column exists', cols.includes('fthr_confidence'));
check('C5: computed_at column exists',     cols.includes('computed_at'));

// ── Section D: Limiter ────────────────────────────────────────────────────────
console.log('\n── Section D: Limiter ──');
const limSrc = src('services/limiterEngineService.js');
check('D1: limiter imports getUserThresholds',     limSrc.includes('getUserThresholds'));
check('D2: limiter has no users.ftp query',        !limSrc.includes('users.ftp'));
check('D3: limiter has no users.max_hr query',     !limSrc.includes('users.max_hr'));
check('D4: limiter has no getAthleteThresholds',   !limSrc.includes('getAthleteThresholds'));

// ── Section E: DB row for user 1 ─────────────────────────────────────────────
console.log('\n── Section E: DB state ──');
const row = db.prepare('SELECT * FROM athlete_thresholds WHERE user_id = 1').get();
check('E1: user 1 has a thresholds row',           !!row);
check('E2: ftp_w is set',                          row && row.ftp_w > 0);
check('E3: ftp_source is set',                     row && !!row.ftp_source);
check('E4: updated_at is set',                     row && !!row.updated_at);

console.log(`\n${pass + fail} checks: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
