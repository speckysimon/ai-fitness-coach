/**
 * Weekly First-Run Integration Test
 * 
 * Scenario:
 * - Empty athlete_weekly
 * - Insert 3 activities with valid normalised/durability/stress
 * - Call ensure-weekly (via service functions, not HTTP)
 * - Assert athlete_weekly now contains correct rows
 * - Assert threshold_minutes > 0 when Z4 exists
 * - Assert stress_dist not null
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db.js';
import { computeWeeklyRollups, getWeeklyRollups } from '../services/weeklyAggregator.js';
import { hasWeeklyRollups } from '../services/weeklyRecomputeScheduler.js';

const TEST_USER_ID = 997;
const WEEK_START = '2026-02-16'; // Monday

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanup() {
  db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_streams WHERE activity_id LIKE ?').run('integ:%');
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
}

function ensureTestUser() {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password, name, analytics_include_strava_only, created_at, updated_at)
    VALUES (?, ?, 'hash', 'IntegTest', 1, datetime('now'), datetime('now'))
  `).run(TEST_USER_ID, 'integtest@example.com');
}

function insertActivity(id, startTime, durationS = 3600) {
  db.prepare(`
    INSERT INTO activities (
      id, user_id, name, sport, type, start_time, duration_s, distance_m,
      has_power, avg_hr, physiology_source, metadata_source,
      is_valid_for_analytics, is_shell, created_at, updated_at
    ) VALUES (?, ?, ?, 'cycling', 'Ride', ?, ?, 40000,
      1, 145, 'intervals', 'intervals', 1, 0, datetime('now'), datetime('now'))
  `).run(id, TEST_USER_ID, `Activity ${id}`, startTime, durationS);
}

function insertNormalised(activityId, opts = {}) {
  db.prepare(`
    INSERT INTO activity_normalised (
      user_id, activity_id, computed_at, algo_version,
      has_power, has_hr, has_cadence, has_streams,
      duration_s, avg_power, vi,
      time_in_zones_power, time_in_zones_hr,
      quality_score
    ) VALUES (?, ?, datetime('now'), 'norm_v1',
      1, 1, 0, 0,
      3600, ?, ?,
      ?, ?,
      80)
  `).run(
    TEST_USER_ID, activityId,
    opts.avgPower || 200, opts.vi || 1.05,
    opts.tizPower ? JSON.stringify(opts.tizPower) : null,
    opts.tizHr ? JSON.stringify(opts.tizHr) : null
  );
}

function insertDurability(activityId, opts = {}) {
  db.prepare(`
    INSERT INTO activity_durability (
      user_id, activity_id, computed_at, algo_version,
      fade_power_pct, efficiency_drop_pct,
      late_threshold_score, repeat_hard_efforts,
      has_sufficient_duration, has_power_data
    ) VALUES (?, ?, datetime('now'), 'dur_v1',
      ?, ?, ?, ?, 1, 1)
  `).run(
    TEST_USER_ID, activityId,
    opts.fadePower ?? 0.08,
    opts.efficiencyDrop ?? 0.03,
    opts.lateThreshold ?? 0.75,
    opts.repeatHard ?? 2
  );
}

function insertStress(activityId, opts = {}) {
  db.prepare(`
    INSERT INTO activity_stress (
      user_id, activity_id, computed_at, algo_version,
      primary_stress_type, is_stochastic, sprint_spikes
    ) VALUES (?, ?, datetime('now'), 'stress_v1',
      ?, ?, ?)
  `).run(
    TEST_USER_ID, activityId,
    opts.stressType || 'steady',
    opts.isStochastic ?? 0,
    opts.sprintSpikes ?? 0
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Weekly First-Run Integration', () => {
  beforeEach(() => { cleanup(); ensureTestUser(); });
  afterEach(() => { cleanup(); });

  it('should populate athlete_weekly from empty state with correct data', async () => {
    // ---- Precondition: athlete_weekly is empty ----
    const before = hasWeeklyRollups(TEST_USER_ID);
    expect(before.hasWeekly).toBe(false);
    expect(before.count).toBe(0);

    // ---- Insert 3 activities in the same week (2026-02-16 to 2026-02-22) ----
    insertActivity('integ:a1', '2026-02-16T08:00:00Z', 3600);
    insertActivity('integ:a2', '2026-02-18T07:00:00Z', 5400);
    insertActivity('integ:a3', '2026-02-20T17:00:00Z', 4200);

    // ---- Insert normalised with Z4 power data ----
    insertNormalised('integ:a1', {
      avgPower: 210,
      vi: 1.05,
      tizPower: { Z1: 600, Z2: 900, Z3: 600, Z4: 600, Z5: 300 },
      tizHr: { Z1: 900, Z2: 900, Z3: 600, Z4: 200, Z5: 0 }
    });
    insertNormalised('integ:a2', {
      avgPower: 195,
      vi: 1.02,
      tizPower: { Z1: 1200, Z2: 1800, Z3: 900, Z4: 900, Z5: 600 },
      tizHr: { Z1: 1500, Z2: 1500, Z3: 900, Z4: 600, Z5: 0 }
    });
    insertNormalised('integ:a3', {
      avgPower: 220,
      vi: 1.08,
      tizPower: { Z1: 900, Z2: 1200, Z3: 600, Z4: 300, Z5: 0 },
      tizHr: null
    });

    // ---- Insert durability ----
    insertDurability('integ:a1', { fadePower: 0.06, efficiencyDrop: 0.02, lateThreshold: 0.80 });
    insertDurability('integ:a2', { fadePower: 0.10, efficiencyDrop: 0.04, lateThreshold: 0.70 });
    insertDurability('integ:a3', { fadePower: 0.08, efficiencyDrop: 0.03, lateThreshold: 0.85 });

    // ---- Insert stress ----
    insertStress('integ:a1', { stressType: 'steady', isStochastic: 0, sprintSpikes: 0 });
    insertStress('integ:a2', { stressType: 'intervals', isStochastic: 1, sprintSpikes: 3 });
    insertStress('integ:a3', { stressType: 'steady', isStochastic: 0, sprintSpikes: 1 });

    // ---- Simulate ensure-weekly: compute rollups ----
    const result = await computeWeeklyRollups(TEST_USER_ID, { weeksBack: 1 });
    expect(result.ok).toBe(true);
    expect(result.computed).toBeGreaterThanOrEqual(1);

    // ---- Postcondition: athlete_weekly has rows ----
    const after = hasWeeklyRollups(TEST_USER_ID);
    expect(after.hasWeekly).toBe(true);

    // ---- Retrieve the specific week ----
    const rollups = getWeeklyRollups(TEST_USER_ID, { limit: 20 });
    const weekRollup = rollups.find(r => r.week_start === WEEK_START);
    expect(weekRollup).toBeDefined();

    // ---- Assert activities counted ----
    expect(weekRollup.activities_total).toBe(3);

    // ---- Assert threshold_minutes > 0 (Z4 data exists) ----
    expect(weekRollup.threshold_minutes).not.toBeNull();
    expect(weekRollup.threshold_minutes).toBeGreaterThan(0);
    // Z4 total = 600 + 900 + 300 = 1800 seconds = 30 minutes
    expect(weekRollup.threshold_minutes).toBeCloseTo(30, 0);

    // ---- Assert vo2_minutes > 0 (Z5 data exists) ----
    expect(weekRollup.vo2_minutes).not.toBeNull();
    expect(weekRollup.vo2_minutes).toBeGreaterThan(0);
    // Z5 total = 300 + 600 + 0 = 900 seconds = 15 minutes
    expect(weekRollup.vo2_minutes).toBeCloseTo(15, 0);

    // ---- Assert tiz_power is valid JSON ----
    expect(weekRollup.tiz_power).not.toBeNull();
    const tizPower = JSON.parse(weekRollup.tiz_power);
    expect(tizPower.Z4).toBe(1800);
    expect(tizPower.Z5).toBe(900);

    // ---- Assert stress_dist not null ----
    expect(weekRollup.stress_dist).not.toBeNull();
    const stressDist = JSON.parse(weekRollup.stress_dist);
    expect(stressDist.steady).toBe(2);
    expect(stressDist.intervals).toBe(1);

    // ---- Assert durability averages populated ----
    expect(weekRollup.avg_power_fade).not.toBeNull();
    // avg = (0.06 + 0.10 + 0.08) / 3 = 0.08
    expect(weekRollup.avg_power_fade).toBeCloseTo(0.08, 2);

    expect(weekRollup.avg_efficiency_drop).not.toBeNull();
    // avg = (0.02 + 0.04 + 0.03) / 3 = 0.03
    expect(weekRollup.avg_efficiency_drop).toBeCloseTo(0.03, 2);

    // ---- Assert best_late_threshold_score ----
    expect(weekRollup.best_late_threshold_score).not.toBeNull();
    expect(weekRollup.best_late_threshold_score).toBeCloseTo(0.85, 2);

    // ---- Assert stochastic sessions and sprint spikes ----
    expect(weekRollup.stochastic_sessions).toBe(1);
    expect(weekRollup.sprint_spikes).toBe(4); // 0 + 3 + 1

    // ---- Assert volume ----
    expect(weekRollup.total_duration_s).toBe(3600 + 5400 + 4200); // 13200
  });
});
