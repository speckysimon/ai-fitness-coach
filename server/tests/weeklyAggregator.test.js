/**
 * Weekly Aggregator Tests
 * 
 * Tests for weekly rollup computation including:
 * - Week bucketing (Monday start)
 * - Time-in-zones aggregation (using correct column: time_in_zones_power / time_in_zones_hr)
 * - Analytics query builder integration
 * - Durability averages (using correct columns: fade_power_pct, efficiency_drop_pct)
 * - Durability quality guards (has_sufficient_duration, has_power_data)
 * - Stress distribution (using correct column: primary_stress_type)
 * - Idempotent upserts
 * - Regression: non-null assertions when data exists
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db.js';
import {
  getWeekStart,
  computeWeeklyRollup,
  upsertWeeklyRollup,
  computeAndStoreWeeklyRollup,
  computeWeeklyRollups,
  getWeeklyRollups,
  getWeeklyRollup
} from '../services/weeklyAggregator.js';

const TEST_USER_ID = 999;

// ---------------------------------------------------------------------------
// Helpers — use CORRECT column names that match the real DB schema
// ---------------------------------------------------------------------------

function cleanup() {
  db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_streams WHERE activity_id LIKE ?').run('test:%');
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
}

function ensureTestUser() {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password, name, analytics_include_strava_only, created_at, updated_at)
    VALUES (?, ?, 'hash', 'WeeklyTest', 1, datetime('now'), datetime('now'))
  `).run(TEST_USER_ID, 'weeklytest@example.com');
}

function insertActivity(id, date, opts = {}) {
  const { durationS = 3600, hasPower = 1, avgHr = null } = opts;
  db.prepare(`
    INSERT INTO activities (
      id, user_id, name, sport, type, start_time, duration_s,
      has_power, avg_hr,
      physiology_source, metadata_source, is_valid_for_analytics,
      is_shell, created_at, updated_at
    ) VALUES (?, ?, ?, 'cycling', 'Ride', ?, ?,
      ?, ?,
      'intervals', 'intervals', 1,
      0, datetime('now'), datetime('now'))
  `).run(id, TEST_USER_ID, `Test ${id}`, date, durationS, hasPower, avgHr);
}

function insertNormalised(activityId, opts = {}) {
  const { tizPower = null, tizHr = null, vi = 1.05, avgPower = 200 } = opts;
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
    avgPower, vi,
    tizPower ? JSON.stringify(tizPower) : null,
    tizHr ? JSON.stringify(tizHr) : null
  );
}

function insertDurability(activityId, opts = {}) {
  const {
    fadePowerPct = null,
    efficiencyDropPct = null,
    lateThresholdScore = null,
    repeatHardEfforts = 0,
    hasSufficientDuration = 1,
    hasPowerData = 1
  } = opts;
  db.prepare(`
    INSERT INTO activity_durability (
      user_id, activity_id, computed_at, algo_version,
      fade_power_pct, efficiency_drop_pct, late_threshold_score,
      repeat_hard_efforts, has_sufficient_duration, has_power_data, has_hr_data
    ) VALUES (?, ?, datetime('now'), 'dur_v1',
      ?, ?, ?,
      ?, ?, ?, 1)
  `).run(
    TEST_USER_ID, activityId,
    fadePowerPct, efficiencyDropPct, lateThresholdScore,
    repeatHardEfforts, hasSufficientDuration, hasPowerData
  );
}

function insertStress(activityId, opts = {}) {
  const {
    primaryStressType = 'endurance',
    isStochastic = 0,
    sprintSpikes = 0
  } = opts;
  db.prepare(`
    INSERT INTO activity_stress (
      user_id, activity_id, computed_at, algo_version,
      primary_stress_type, is_stochastic,
      sustained_threshold_blocks, longest_threshold_block_s,
      vo2_blocks, longest_vo2_block_s, sprint_spikes,
      recovery_score, evidence
    ) VALUES (?, ?, datetime('now'), 'stress_v1',
      ?, ?,
      0, 0, 0, 0, ?,
      NULL, '{}')
  `).run(TEST_USER_ID, activityId, primaryStressType, isStochastic, sprintSpikes);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Weekly Aggregator', () => {
  beforeEach(() => { cleanup(); ensureTestUser(); });
  afterEach(() => { cleanup(); });

  // ========================================================================
  // Week Bucketing
  // ========================================================================
  describe('Week Bucketing', () => {
    it('should get Monday start for any date', () => {
      expect(getWeekStart('2026-02-16')).toBe('2026-02-16'); // Monday
      expect(getWeekStart('2026-02-17')).toBe('2026-02-16'); // Tuesday
      expect(getWeekStart('2026-02-18')).toBe('2026-02-16'); // Wednesday
      expect(getWeekStart('2026-02-19')).toBe('2026-02-16'); // Thursday
      expect(getWeekStart('2026-02-20')).toBe('2026-02-16'); // Friday
      expect(getWeekStart('2026-02-21')).toBe('2026-02-16'); // Saturday
      expect(getWeekStart('2026-02-22')).toBe('2026-02-16'); // Sunday
      expect(getWeekStart('2026-02-23')).toBe('2026-02-23'); // Next Monday
    });

    it('should handle year boundaries', () => {
      expect(getWeekStart('2025-12-29')).toBe('2025-12-29'); // Monday
      expect(getWeekStart('2026-01-01')).toBe('2025-12-29'); // Thursday
      expect(getWeekStart('2026-01-05')).toBe('2026-01-05'); // Monday
    });

    it('should handle Sunday late night UTC correctly', () => {
      // Sunday 23:30 UTC → still same week as Monday 2026-02-16
      expect(getWeekStart('2026-02-22T23:30:00Z')).toBe('2026-02-16');
    });

    it('should handle Monday early morning UTC correctly', () => {
      // Monday 00:30 UTC → new week starts 2026-02-23
      expect(getWeekStart('2026-02-23T00:30:00Z')).toBe('2026-02-23');
    });

    it('should handle Dec 31 / Jan 1 year boundary with timestamps', () => {
      expect(getWeekStart('2026-12-31T23:59:59Z')).toBe('2026-12-28');
      expect(getWeekStart('2027-01-01T00:00:01Z')).toBe('2026-12-28');
    });

    it('should produce same result for date-only and T00:00:00Z', () => {
      expect(getWeekStart('2026-02-20')).toBe(getWeekStart('2026-02-20T00:00:00Z'));
      expect(getWeekStart('2026-12-31')).toBe(getWeekStart('2026-12-31T00:00:00Z'));
      expect(getWeekStart('2027-01-01')).toBe(getWeekStart('2027-01-01T00:00:00Z'));
    });

    it('should return null for invalid input', () => {
      expect(getWeekStart('not-a-date')).toBeNull();
      expect(getWeekStart('')).toBeNull();
    });
  });

  // ========================================================================
  // Time-in-Zones Aggregation (correct column: time_in_zones_power)
  // ========================================================================
  describe('Time-in-Zones Aggregation', () => {
    it('should aggregate TIZ correctly across multiple activities', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:tiz-1', '2026-02-16T10:00:00Z');
      insertNormalised('test:tiz-1', { tizPower: { Z1: 1800, Z2: 900, Z3: 600, Z4: 300 } });

      insertActivity('test:tiz-2', '2026-02-17T10:00:00Z');
      insertNormalised('test:tiz-2', { tizPower: { Z1: 1200, Z2: 1200, Z3: 900, Z4: 300 } });

      insertActivity('test:tiz-3', '2026-02-18T10:00:00Z', { durationS: 1800 });
      insertNormalised('test:tiz-3', { tizPower: { Z2: 900, Z3: 600, Z4: 300 } });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.activities_total).toBe(3);

      // REGRESSION: tiz_power must NOT be null when data exists
      expect(rollup.tiz_power).not.toBeNull();

      const tizPower = JSON.parse(rollup.tiz_power);
      expect(tizPower.Z1).toBe(3000);
      expect(tizPower.Z2).toBe(3000);
      expect(tizPower.Z3).toBe(2100);
      expect(tizPower.Z4).toBe(900);

      // threshold_minutes must be > 0 when Z4 seconds exist
      expect(rollup.threshold_minutes).toBe(15);
      expect(rollup.threshold_minutes).toBeGreaterThan(0);
    });

    it('should use HR zones when power zones not available', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:hr-only', '2026-02-16T10:00:00Z', { hasPower: 0, avgHr: 150 });
      insertNormalised('test:hr-only', { tizHr: { Z1: 1800, Z2: 900, Z3: 600, Z4: 300 } });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.tiz_hr).not.toBeNull();
      expect(rollup.threshold_minutes).toBe(5);
    });

    it('should survive malformed JSON in time_in_zones_power', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:bad-json', '2026-02-16T10:00:00Z');
      // Manually insert bad JSON
      db.prepare(`
        INSERT INTO activity_normalised (
          user_id, activity_id, computed_at, algo_version,
          has_power, has_hr, has_cadence, has_streams,
          duration_s, avg_power, vi,
          time_in_zones_power, quality_score
        ) VALUES (?, ?, datetime('now'), 'norm_v1',
          1, 1, 0, 0, 3600, 200, 1.05, '{bad json', 80)
      `).run(TEST_USER_ID, 'test:bad-json');

      // Should not throw
      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup.activities_total).toBe(1);
      expect(rollup.tiz_power).toBeNull(); // bad JSON → null
    });

    it('should skip null TIZ entries without crashing', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:null-tiz', '2026-02-16T10:00:00Z');
      insertNormalised('test:null-tiz', { tizPower: null });

      insertActivity('test:good-tiz', '2026-02-17T10:00:00Z');
      insertNormalised('test:good-tiz', { tizPower: { Z2: 600, Z4: 120 } });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.tiz_power).not.toBeNull();
      const tiz = JSON.parse(rollup.tiz_power);
      expect(tiz.Z2).toBe(600);
      expect(tiz.Z4).toBe(120);
      expect(rollup.threshold_minutes).toBe(2); // 120/60
    });
  });

  // ========================================================================
  // Analytics Query Builder Integration
  // ========================================================================
  describe('Analytics Query Builder Integration', () => {
    it('should only include activities passing analyticsQueryBuilder', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:valid', '2026-02-16T10:00:00Z');

      // Create invalid activity (is_valid_for_analytics = 0)
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, sport, type, start_time, duration_s,
          physiology_source, metadata_source, is_valid_for_analytics,
          is_shell, created_at, updated_at
        ) VALUES ('test:invalid', ?, 'Invalid', 'cycling', 'Ride', '2026-02-17T10:00:00Z',
          3600, 'intervals', 'intervals', 0, 0, datetime('now'), datetime('now'))
      `).run(TEST_USER_ID);

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup.activities_total).toBe(1);
      expect(rollup.total_duration_s).toBe(3600);
    });

    it('should respect user Strava-only preference', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:strava', '2026-02-16T10:00:00Z');

      let rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup.activities_total).toBe(1);

      db.prepare('UPDATE users SET analytics_include_strava_only = 0 WHERE id = ?').run(TEST_USER_ID);

      rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup.activities_total).toBe(0);
    });
  });

  // ========================================================================
  // Durability Averages (correct columns + quality guards)
  // ========================================================================
  describe('Durability Averages', () => {
    it('should compute durability averages from valid rows', () => {
      const weekStart = '2026-02-16';

      const data = [
        { id: 'test:dur-1', date: '2026-02-16T10:00:00Z', fade: 0.15, drop: 0.10, late: 0.85 },
        { id: 'test:dur-2', date: '2026-02-17T10:00:00Z', fade: 0.20, drop: 0.15, late: 0.80 },
        { id: 'test:dur-3', date: '2026-02-18T10:00:00Z', fade: 0.10, drop: 0.05, late: 0.90 }
      ];

      for (const d of data) {
        insertActivity(d.id, d.date, { durationS: 7200 });
        insertDurability(d.id, {
          fadePowerPct: d.fade,
          efficiencyDropPct: d.drop,
          lateThresholdScore: d.late,
          repeatHardEfforts: 3,
          hasSufficientDuration: 1,
          hasPowerData: 1
        });
      }

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      // REGRESSION: these must NOT be null when durability data exists
      expect(rollup.avg_power_fade).not.toBeNull();
      expect(rollup.avg_efficiency_drop).not.toBeNull();
      expect(rollup.best_late_threshold_score).not.toBeNull();
      expect(rollup.p25_power_fade).not.toBeNull();

      expect(rollup.avg_power_fade).toBeCloseTo(0.15, 2);
      expect(rollup.avg_efficiency_drop).toBeCloseTo(0.10, 2);
      expect(rollup.best_late_threshold_score).toBe(0.90);
      expect(rollup.p25_power_fade).toBeCloseTo(0.10, 2);
      expect(rollup.repeat_hard_efforts_total).toBe(9);
    });

    it('should exclude durability rows where has_sufficient_duration = 0', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:short', '2026-02-16T10:00:00Z', { durationS: 1200 });
      insertDurability('test:short', {
        fadePowerPct: 0.30,
        efficiencyDropPct: 0.25,
        lateThresholdScore: 0.50,
        hasSufficientDuration: 0,  // too short
        hasPowerData: 1
      });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      // Should be null because the only row was excluded
      expect(rollup.avg_power_fade).toBeNull();
      expect(rollup.avg_efficiency_drop).toBeNull();
      expect(rollup.best_late_threshold_score).toBeNull();
    });

    it('should exclude durability rows where has_power_data = 0', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:no-pwr', '2026-02-16T10:00:00Z');
      insertDurability('test:no-pwr', {
        fadePowerPct: 0.20,
        efficiencyDropPct: 0.15,
        lateThresholdScore: 0.70,
        hasSufficientDuration: 1,
        hasPowerData: 0  // no power
      });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.avg_power_fade).toBeNull();
      expect(rollup.avg_efficiency_drop).toBeNull();
    });

    it('should handle missing durability data gracefully', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:no-dur', '2026-02-16T10:00:00Z');

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.activities_total).toBe(1);
      expect(rollup.avg_power_fade).toBeNull();
      expect(rollup.p25_power_fade).toBeNull();
      expect(rollup.best_late_threshold_score).toBeNull();
      expect(rollup.notes.no_durability).toBeDefined();
    });
  });

  // ========================================================================
  // Stress Distribution (correct column: primary_stress_type)
  // ========================================================================
  describe('Stress Distribution', () => {
    it('should aggregate stress type counts', () => {
      const weekStart = '2026-02-16';

      const data = [
        { id: 'test:s1', date: '2026-02-16T10:00:00Z', type: 'endurance', stoch: 0, spikes: 0 },
        { id: 'test:s2', date: '2026-02-17T10:00:00Z', type: 'threshold', stoch: 1, spikes: 5 },
        { id: 'test:s3', date: '2026-02-18T10:00:00Z', type: 'endurance', stoch: 0, spikes: 0 },
        { id: 'test:s4', date: '2026-02-19T10:00:00Z', type: 'race',      stoch: 1, spikes: 12 }
      ];

      for (const d of data) {
        insertActivity(d.id, d.date);
        insertStress(d.id, {
          primaryStressType: d.type,
          isStochastic: d.stoch,
          sprintSpikes: d.spikes
        });
      }

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      // REGRESSION: stress_dist must NOT be null when stress data exists
      expect(rollup.stress_dist).not.toBeNull();

      const stressDist = JSON.parse(rollup.stress_dist);
      expect(stressDist.endurance).toBe(2);
      expect(stressDist.threshold).toBe(1);
      expect(stressDist.race).toBe(1);

      expect(rollup.stochastic_sessions).toBe(2);
      expect(rollup.sprint_spikes).toBe(17);
    });
  });

  // ========================================================================
  // Coverage and Quality
  // ========================================================================
  describe('Coverage and Quality', () => {
    it('should track data coverage flags', () => {
      const weekStart = '2026-02-16';

      insertActivity('test:full', '2026-02-16T10:00:00Z', { hasPower: 1, avgHr: 150 });
      // Insert stream for full activity
      db.prepare(`
        INSERT INTO activity_streams (
          activity_id, user_id, source, computed_at, algo_version,
          sample_interval_s, start_time, duration_s, stream_format,
          power_data, time_s_data
        ) VALUES (?, ?, 'intervals', datetime('now'), 'streams_v1',
          1, '2026-02-16T10:00:00Z', 3600, 'json',
          ?, ?)
      `).run('test:full', TEST_USER_ID, JSON.stringify([200]), JSON.stringify([0]));

      insertActivity('test:power-only', '2026-02-17T10:00:00Z', { hasPower: 1, avgHr: null });
      insertActivity('test:hr-only', '2026-02-18T10:00:00Z', { hasPower: 0, avgHr: 150 });

      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      expect(rollup.activities_total).toBe(3);
      expect(rollup.activities_with_power).toBe(2);
      expect(rollup.activities_with_hr).toBe(2);
      expect(rollup.activities_with_streams).toBe(1);
      expect(rollup.avg_quality_score).toBeCloseTo(0.67, 1);
    });
  });

  // ========================================================================
  // Idempotent Upserts
  // ========================================================================
  describe('Idempotent Upserts', () => {
    it('should upsert rollup idempotently', async () => {
      const weekStart = '2026-02-16';

      insertActivity('test:upsert', '2026-02-16T10:00:00Z');

      const result1 = await computeAndStoreWeeklyRollup(TEST_USER_ID, weekStart);
      expect(result1.ok).toBe(true);

      const rollup1 = getWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup1).not.toBeNull();
      expect(rollup1.activities_total).toBe(1);

      insertActivity('test:upsert-2', '2026-02-17T10:00:00Z');

      const result2 = await computeAndStoreWeeklyRollup(TEST_USER_ID, weekStart);
      expect(result2.ok).toBe(true);

      const rollup2 = getWeeklyRollup(TEST_USER_ID, weekStart);
      expect(rollup2.activities_total).toBe(2);

      const allRollups = getWeeklyRollups(TEST_USER_ID);
      expect(allRollups.length).toBe(1);
    });
  });

  // ========================================================================
  // Multiple Weeks
  // ========================================================================
  describe('Multiple Weeks', () => {
    it('should compute multiple weeks correctly', async () => {
      const weeks = [
        { start: '2026-02-09', activities: 2 },
        { start: '2026-02-16', activities: 3 },
        { start: '2026-02-23', activities: 1 }
      ];

      let idx = 1;
      for (const week of weeks) {
        for (let i = 0; i < week.activities; i++) {
          const date = new Date(week.start);
          date.setDate(date.getDate() + i);
          insertActivity(`test:multi-${idx++}`, date.toISOString());
        }
      }

      const result = await computeWeeklyRollups(TEST_USER_ID, {
        after: '2026-02-09',
        before: '2026-03-01'
      });

      expect(result.ok).toBe(true);
      expect(result.computed).toBe(3);

      const rollups = getWeeklyRollups(TEST_USER_ID, {
        after: '2026-02-09',
        before: '2026-03-01'
      });

      expect(rollups.length).toBe(3);
      expect(rollups.find(r => r.week_start === '2026-02-09').activities_total).toBe(2);
      expect(rollups.find(r => r.week_start === '2026-02-16').activities_total).toBe(3);
      expect(rollups.find(r => r.week_start === '2026-02-23').activities_total).toBe(1);
    });

    it('should compute weeksBack correctly', async () => {
      const today = new Date();
      const currentWeekStart = getWeekStart(today.toISOString().split('T')[0]);

      insertActivity('test:current', today.toISOString());

      const result = await computeWeeklyRollups(TEST_USER_ID, { weeksBack: 4 });

      expect(result.ok).toBe(true);
      expect(result.computed).toBeGreaterThanOrEqual(1);

      const currentRollup = getWeeklyRollup(TEST_USER_ID, currentWeekStart);
      expect(currentRollup).not.toBeNull();
      expect(currentRollup.activities_total).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================================================
  // REGRESSION: Full Fixture Week — non-null assertions
  // ========================================================================
  describe('Full Fixture Week — Regression', () => {
    it('should produce non-null rollup fields when all layer data exists', async () => {
      const weekStart = '2026-02-16';

      // Activity 1: endurance ride with power zones + durability
      insertActivity('test:fix-1', '2026-02-16T08:00:00Z', { durationS: 5400, hasPower: 1, avgHr: 145 });
      insertNormalised('test:fix-1', {
        tizPower: { Z1: 1200, Z2: 2400, Z3: 1200, Z4: 600 },
        tizHr:    { Z1: 1500, Z2: 2100, Z3: 1200, Z4: 600 }
      });
      insertDurability('test:fix-1', {
        fadePowerPct: 0.12,
        efficiencyDropPct: 0.08,
        lateThresholdScore: 0.88,
        repeatHardEfforts: 2,
        hasSufficientDuration: 1,
        hasPowerData: 1
      });
      insertStress('test:fix-1', { primaryStressType: 'endurance', isStochastic: 0, sprintSpikes: 0 });

      // Activity 2: threshold intervals with sprint spikes
      insertActivity('test:fix-2', '2026-02-18T07:00:00Z', { durationS: 3600, hasPower: 1, avgHr: 160 });
      insertNormalised('test:fix-2', {
        tizPower: { Z1: 600, Z2: 600, Z3: 900, Z4: 900, Z5: 600 },
        tizHr:    { Z1: 600, Z2: 600, Z3: 900, Z4: 900 }
      });
      insertDurability('test:fix-2', {
        fadePowerPct: 0.18,
        efficiencyDropPct: 0.14,
        lateThresholdScore: 0.75,
        repeatHardEfforts: 5,
        hasSufficientDuration: 1,
        hasPowerData: 1
      });
      insertStress('test:fix-2', { primaryStressType: 'threshold', isStochastic: 1, sprintSpikes: 4 });

      // Compute
      const rollup = computeWeeklyRollup(TEST_USER_ID, weekStart);

      // --- Non-null assertions (the whole point of this test) ---
      expect(rollup.tiz_power).not.toBeNull();
      expect(rollup.tiz_hr).not.toBeNull();
      expect(rollup.threshold_minutes).not.toBeNull();
      expect(rollup.threshold_minutes).toBeGreaterThan(0);
      expect(rollup.vo2_minutes).not.toBeNull();
      expect(rollup.avg_power_fade).not.toBeNull();
      expect(rollup.p25_power_fade).not.toBeNull();
      expect(rollup.best_late_threshold_score).not.toBeNull();
      expect(rollup.avg_efficiency_drop).not.toBeNull();
      expect(rollup.stress_dist).not.toBeNull();
      expect(rollup.stochastic_sessions).toBeGreaterThan(0);
      expect(rollup.sprint_spikes).toBeGreaterThan(0);

      // --- Value checks ---
      const tiz = JSON.parse(rollup.tiz_power);
      expect(tiz.Z4).toBe(1500); // 600 + 900
      expect(rollup.threshold_minutes).toBe(25); // 1500 / 60

      expect(tiz.Z5).toBe(600);
      expect(rollup.vo2_minutes).toBe(10); // 600 / 60

      expect(rollup.avg_power_fade).toBeCloseTo(0.15, 2); // (0.12 + 0.18) / 2
      expect(rollup.avg_efficiency_drop).toBeCloseTo(0.11, 2); // (0.08 + 0.14) / 2
      expect(rollup.best_late_threshold_score).toBe(0.88);
      expect(rollup.repeat_hard_efforts_total).toBe(7); // 2 + 5

      const dist = JSON.parse(rollup.stress_dist);
      expect(dist.endurance).toBe(1);
      expect(dist.threshold).toBe(1);

      expect(rollup.stochastic_sessions).toBe(1);
      expect(rollup.sprint_spikes).toBe(4);
    });

    it('should persist non-null fields to athlete_weekly via upsert', async () => {
      const weekStart = '2026-02-16';

      insertActivity('test:persist-1', '2026-02-16T08:00:00Z', { durationS: 5400 });
      insertNormalised('test:persist-1', { tizPower: { Z2: 3000, Z4: 600 } });
      insertDurability('test:persist-1', {
        fadePowerPct: 0.10,
        efficiencyDropPct: 0.06,
        lateThresholdScore: 0.92,
        repeatHardEfforts: 1,
        hasSufficientDuration: 1,
        hasPowerData: 1
      });
      insertStress('test:persist-1', { primaryStressType: 'endurance' });

      const result = await computeAndStoreWeeklyRollup(TEST_USER_ID, weekStart);
      expect(result.ok).toBe(true);

      const row = getWeeklyRollup(TEST_USER_ID, weekStart);

      // Stored row must have non-null fields
      expect(row.tiz_power).not.toBeNull();
      expect(row.threshold_minutes).toBeGreaterThan(0);
      expect(row.avg_power_fade).not.toBeNull();
      expect(row.avg_efficiency_drop).not.toBeNull();
      expect(row.best_late_threshold_score).not.toBeNull();
      expect(row.stress_dist).not.toBeNull();

      // Parse stored JSON
      const tiz = JSON.parse(row.tiz_power);
      expect(tiz.Z4).toBe(600);

      const dist = JSON.parse(row.stress_dist);
      expect(dist.endurance).toBe(1);
    });
  });
});
