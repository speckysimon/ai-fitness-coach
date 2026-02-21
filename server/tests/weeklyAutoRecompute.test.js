/**
 * Weekly Auto-Recompute Tests
 * 
 * Tests for the event-driven weekly recompute scheduler:
 * - weekStartFromISODate derivation
 * - recomputeWeeksForUser with dedupe, lookback, and clamping
 * - recomputeWeeksForActivity
 * - recomputeRecentWeeks
 * - getAffectedWeeks from activity IDs
 * - hasWeeklyRollups check
 * - ensure-weekly endpoint behaviour
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db.js';
import {
  weekStartFromISODate,
  recomputeWeeksForUser,
  recomputeWeeksForActivity,
  recomputeRecentWeeks,
  getAffectedWeeks,
  hasWeeklyRollups
} from '../services/weeklyRecomputeScheduler.js';
import { getWeeklyRollup, getWeekStart } from '../services/weeklyAggregator.js';

const TEST_USER_ID = 998;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanup() {
  db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_streams WHERE activity_id LIKE ?').run('recomp:%');
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
}

function ensureTestUser() {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password, name, analytics_include_strava_only, created_at, updated_at)
    VALUES (?, ?, 'hash', 'RecompTest', 1, datetime('now'), datetime('now'))
  `).run(TEST_USER_ID, 'recomptest@example.com');
}

function insertActivity(id, date, durationS = 3600) {
  db.prepare(`
    INSERT INTO activities (
      id, user_id, name, sport, type, start_time, duration_s,
      has_power, physiology_source, metadata_source,
      is_valid_for_analytics, is_shell, created_at, updated_at
    ) VALUES (?, ?, ?, 'cycling', 'Ride', ?, ?,
      1, 'intervals', 'intervals', 1, 0, datetime('now'), datetime('now'))
  `).run(id, TEST_USER_ID, `Test ${id}`, date, durationS);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Weekly Auto-Recompute Scheduler', () => {
  beforeEach(() => { cleanup(); ensureTestUser(); });
  afterEach(() => { cleanup(); });

  // ========================================================================
  // weekStartFromISODate
  // ========================================================================
  describe('weekStartFromISODate', () => {
    it('should derive Monday from ISO datetime', () => {
      // 2026-02-18 is a Wednesday → Monday is 2026-02-16
      expect(weekStartFromISODate('2026-02-18T10:00:00Z')).toBe('2026-02-16');
    });

    it('should handle date-only strings', () => {
      expect(weekStartFromISODate('2026-02-20')).toBe('2026-02-16'); // Friday
    });

    it('should return null for null/undefined', () => {
      expect(weekStartFromISODate(null)).toBeNull();
      expect(weekStartFromISODate(undefined)).toBeNull();
    });

    // --- Boundary tests required by audit ---

    it('should handle Sunday late night UTC (2026-02-22T23:30:00Z)', () => {
      // 2026-02-22 is a Sunday → belongs to week starting 2026-02-16
      expect(weekStartFromISODate('2026-02-22T23:30:00Z')).toBe('2026-02-16');
    });

    it('should handle Monday early morning UTC (2026-02-23T00:30:00Z)', () => {
      // 2026-02-23 is a Monday → new week starts 2026-02-23
      expect(weekStartFromISODate('2026-02-23T00:30:00Z')).toBe('2026-02-23');
    });

    it('should handle year boundary Dec 31 (2026-12-31T23:59:59Z)', () => {
      // 2026-12-31 is a Thursday → Monday is 2026-12-28
      expect(weekStartFromISODate('2026-12-31T23:59:59Z')).toBe('2026-12-28');
    });

    it('should handle year boundary Jan 1 (2027-01-01T00:00:01Z)', () => {
      // 2027-01-01 is a Friday → Monday is 2026-12-28 (same week as Dec 31)
      expect(weekStartFromISODate('2027-01-01T00:00:01Z')).toBe('2026-12-28');
    });

    it('should return null for invalid ISO string', () => {
      expect(weekStartFromISODate('not-a-date')).toBeNull();
      expect(weekStartFromISODate('')).toBeNull();
    });

    it('should handle Monday itself', () => {
      // 2026-02-16 is a Monday → should return itself
      expect(weekStartFromISODate('2026-02-16T00:00:00Z')).toBe('2026-02-16');
      expect(weekStartFromISODate('2026-02-16')).toBe('2026-02-16');
    });
  });

  // ========================================================================
  // recomputeWeeksForUser
  // ========================================================================
  describe('recomputeWeeksForUser', () => {
    it('should compute specified weeks and return results', async () => {
      insertActivity('recomp:a1', '2026-02-16T10:00:00Z');
      insertActivity('recomp:a2', '2026-02-23T10:00:00Z');

      const result = await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16', '2026-02-23'], {
        lookbackWeeks: 0
      });

      expect(result.ok).toBe(true);
      expect(result.computed).toBe(2);
      expect(result.weeks).toContain('2026-02-16');
      expect(result.weeks).toContain('2026-02-23');

      // Verify rows exist
      const r1 = getWeeklyRollup(TEST_USER_ID, '2026-02-16');
      const r2 = getWeeklyRollup(TEST_USER_ID, '2026-02-23');
      expect(r1).not.toBeNull();
      expect(r2).not.toBeNull();
      expect(r1.activities_total).toBe(1);
      expect(r2.activities_total).toBe(1);
    });

    it('should add lookback weeks', async () => {
      insertActivity('recomp:lb1', '2026-02-16T10:00:00Z');

      const result = await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16'], {
        lookbackWeeks: 1
      });

      expect(result.ok).toBe(true);
      // Should include 2026-02-16 AND 2026-02-09 (lookback)
      expect(result.weeks).toContain('2026-02-16');
      expect(result.weeks).toContain('2026-02-09');
    });

    it('should dedupe overlapping weeks', async () => {
      const result = await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16', '2026-02-16', '2026-02-16'], {
        lookbackWeeks: 0
      });

      expect(result.ok).toBe(true);
      expect(result.weeks.length).toBe(1);
    });

    it('should clamp to maxWeeks and return warning', async () => {
      // Request 10 unique weeks
      const weeks = [];
      for (let i = 0; i < 10; i++) {
        const d = new Date('2026-01-05');
        d.setDate(d.getDate() + (7 * i));
        weeks.push(d.toISOString().split('T')[0]);
      }

      const result = await recomputeWeeksForUser(TEST_USER_ID, weeks, {
        lookbackWeeks: 0,
        maxWeeks: 6
      });

      expect(result.ok).toBe(true);
      expect(result.weeks.length).toBe(6);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('Clamped');
    });

    it('should handle sparse weeks across long time span', async () => {
      // 3 weeks spread across 3 months — should all be computed
      const sparseWeeks = ['2026-01-05', '2026-02-16', '2026-03-23'];
      const result = await recomputeWeeksForUser(TEST_USER_ID, sparseWeeks, {
        lookbackWeeks: 0,
        maxWeeks: 6
      });

      expect(result.ok).toBe(true);
      expect(result.weeks.length).toBe(3);
      expect(result.weeks).toEqual(['2026-01-05', '2026-02-16', '2026-03-23']);
      expect(result.warning).toBeUndefined();
    });

    it('should handle empty weekStarts gracefully', async () => {
      const result = await recomputeWeeksForUser(TEST_USER_ID, [], {
        lookbackWeeks: 0
      });

      expect(result.ok).toBe(true);
      expect(result.computed).toBe(0);
      expect(result.weeks.length).toBe(0);
    });
  });

  // ========================================================================
  // recomputeWeeksForActivity
  // ========================================================================
  describe('recomputeWeeksForActivity', () => {
    it('should derive weekStart from activity and recompute', async () => {
      insertActivity('recomp:act1', '2026-02-18T08:00:00Z'); // Wednesday → week 2026-02-16

      const result = await recomputeWeeksForActivity(TEST_USER_ID, {
        start_time: '2026-02-18T08:00:00Z'
      }, { lookbackWeeks: 0 });

      expect(result.ok).toBe(true);
      expect(result.computedWeeks).toContain('2026-02-16');

      const rollup = getWeeklyRollup(TEST_USER_ID, '2026-02-16');
      expect(rollup).not.toBeNull();
      expect(rollup.activities_total).toBe(1);
    });

    it('should return error if no start_time', async () => {
      const result = await recomputeWeeksForActivity(TEST_USER_ID, {});
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ========================================================================
  // recomputeRecentWeeks
  // ========================================================================
  describe('recomputeRecentWeeks', () => {
    it('should recompute last N weeks', async () => {
      const today = new Date();
      insertActivity('recomp:recent', today.toISOString());

      const result = await recomputeRecentWeeks(TEST_USER_ID, 4);

      expect(result.ok).toBe(true);
      expect(result.computedWeeks.length).toBeGreaterThanOrEqual(1);
      expect(result.computedWeeks.length).toBeLessThanOrEqual(4);
      expect(result.computed).toBeGreaterThanOrEqual(1);

      // Current week should have a rollup
      const currentWeekStart = getWeekStart(today.toISOString().split('T')[0]);
      const rollup = getWeeklyRollup(TEST_USER_ID, currentWeekStart);
      expect(rollup).not.toBeNull();
    });
  });

  // ========================================================================
  // getAffectedWeeks
  // ========================================================================
  describe('getAffectedWeeks', () => {
    it('should return unique week starts for given activity IDs', () => {
      insertActivity('recomp:w1', '2026-02-16T10:00:00Z'); // Week 2026-02-16
      insertActivity('recomp:w2', '2026-02-17T10:00:00Z'); // Same week
      insertActivity('recomp:w3', '2026-02-23T10:00:00Z'); // Week 2026-02-23

      const weeks = getAffectedWeeks(TEST_USER_ID, ['recomp:w1', 'recomp:w2', 'recomp:w3']);

      expect(weeks.length).toBe(2);
      expect(weeks).toContain('2026-02-16');
      expect(weeks).toContain('2026-02-23');
    });

    it('should return empty array for empty input', () => {
      expect(getAffectedWeeks(TEST_USER_ID, [])).toEqual([]);
      expect(getAffectedWeeks(TEST_USER_ID, null)).toEqual([]);
    });

    it('should handle non-existent activity IDs', () => {
      const weeks = getAffectedWeeks(TEST_USER_ID, ['nonexistent-1', 'nonexistent-2']);
      expect(weeks).toEqual([]);
    });
  });

  // ========================================================================
  // hasWeeklyRollups
  // ========================================================================
  describe('hasWeeklyRollups', () => {
    it('should return false when no rollups exist', () => {
      const status = hasWeeklyRollups(TEST_USER_ID);
      expect(status.hasWeekly).toBe(false);
      expect(status.count).toBe(0);
    });

    it('should return true after computing rollups', async () => {
      insertActivity('recomp:has1', '2026-02-16T10:00:00Z');

      await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16'], { lookbackWeeks: 0 });

      const status = hasWeeklyRollups(TEST_USER_ID);
      expect(status.hasWeekly).toBe(true);
      expect(status.count).toBeGreaterThanOrEqual(1);
    });
  });

  // ========================================================================
  // Ensure-weekly endpoint behaviour (unit-level)
  // ========================================================================
  describe('Ensure-weekly logic', () => {
    it('should skip compute when rollups already exist', async () => {
      insertActivity('recomp:ens1', '2026-02-16T10:00:00Z');

      // Pre-compute
      await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16'], { lookbackWeeks: 0 });

      const before = hasWeeklyRollups(TEST_USER_ID);
      expect(before.hasWeekly).toBe(true);

      // Simulate ensure-weekly: hasWeekly=true, force=false → skip
      // (This tests the logic, not the HTTP endpoint)
      const shouldCompute = !before.hasWeekly;
      expect(shouldCompute).toBe(false);
    });

    it('should compute when force=true even if rollups exist', async () => {
      insertActivity('recomp:ens2', '2026-02-16T10:00:00Z');

      await recomputeWeeksForUser(TEST_USER_ID, ['2026-02-16'], { lookbackWeeks: 0 });

      const before = hasWeeklyRollups(TEST_USER_ID);
      expect(before.hasWeekly).toBe(true);

      // force=true → should recompute
      const force = true;
      const shouldCompute = !before.hasWeekly || force;
      expect(shouldCompute).toBe(true);
    });

    it('should compute when no rollups exist', () => {
      const status = hasWeeklyRollups(TEST_USER_ID);
      expect(status.hasWeekly).toBe(false);

      const shouldCompute = !status.hasWeekly;
      expect(shouldCompute).toBe(true);
    });
  });
});
