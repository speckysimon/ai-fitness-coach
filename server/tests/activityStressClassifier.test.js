/**
 * Activity Stress Classifier Tests
 * 
 * Tests for deterministic stress classification using the full stress_v1 schema.
 * 
 * Validates:
 * - Migration creates correct columns
 * - Classifier produces all required fields
 * - Runner writes is_stochastic / block counts / algo_version
 * - Evidence is stored as JSON and parseable
 * - WeeklyAggregator integration query returns non-null stress fields
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { classifyActivityStress } from '../services/activityStressClassifier.js';

import {
  runStressClassificationForUser,
  getStressClassificationStatus
} from '../services/stressRunner.js';

const TEST_USER_ID = 999;

// Required columns in the activity_stress table (stress_v1 schema)
const REQUIRED_COLUMNS = [
  'user_id', 'activity_id', 'computed_at', 'algo_version',
  'primary_stress_type', 'is_stochastic',
  'sustained_threshold_blocks', 'longest_threshold_block_s',
  'vo2_blocks', 'longest_vo2_block_s', 'sprint_spikes',
  'recovery_score', 'evidence'
];

// Helper: create test user
function createTestUser() {
  db.prepare(`
    INSERT OR REPLACE INTO users (id, email, password, name, analytics_include_strava_only, created_at, updated_at)
    VALUES (?, ?, 'hash', 'Test', 1, datetime('now'), datetime('now'))
  `).run(TEST_USER_ID, 'stresstest@example.com');
}

// Helper: create test activity with normalised data
function createTestActivity(activityId, opts = {}) {
  const {
    avgPower = 185,
    normalizedPower = 195,
    durationS = 3600,
    vi = 1.05,
    hrDrift = null,
    tizPower = null,
    fadePowerPct = null,
    surgCount = null
  } = opts;

  db.prepare(`
    INSERT INTO activities (
      id, user_id, name, sport, type, start_time, duration_s,
      avg_power, normalized_power, has_power,
      is_valid_for_analytics, physiology_source, metadata_source,
      is_shell, created_at, updated_at
    ) VALUES (?, ?, ?, 'cycling', 'Ride', '2026-02-17T10:00:00Z', ?,
      ?, ?, 1, 1, 'intervals', 'intervals', 0,
      datetime('now'), datetime('now'))
  `).run(activityId, TEST_USER_ID, `Test ${activityId}`, durationS, avgPower, normalizedPower);

  db.prepare(`
    INSERT INTO activity_normalised (
      user_id, activity_id, computed_at, algo_version,
      has_power, has_hr, has_cadence, has_streams,
      duration_s, avg_power, np, vi, hr_drift_pct,
      time_in_zones_power, quality_score, notes
    ) VALUES (?, ?, datetime('now'), 'norm_v1',
      1, 1, 0, 0, ?, ?, ?, ?, ?, ?, 80, NULL)
  `).run(
    TEST_USER_ID, activityId, durationS, avgPower, normalizedPower,
    vi, hrDrift, tizPower
  );

  if (fadePowerPct !== null || surgCount !== null) {
    db.prepare(`
      INSERT INTO activity_durability (
        user_id, activity_id, computed_at, algo_version,
        fade_power_pct, fade_hr_pct, efficiency_drop_pct,
        late_threshold_score, stochasticity_score,
        repeat_hard_efforts, surge_count,
        has_sufficient_duration, has_power_data, has_hr_data
      ) VALUES (?, ?, datetime('now'), 'dur_v1',
        ?, NULL, NULL, NULL, NULL, 0, ?, 1, 1, 1)
    `).run(TEST_USER_ID, activityId, fadePowerPct, surgCount);
  }
}

// Helper: cleanup
function cleanup() {
  db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
  db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
}

// ============================================================
// PHASE 1: Schema Verification
// ============================================================

describe('Schema: activity_stress table', () => {
  it('should have all required columns', () => {
    const columns = db.prepare(`PRAGMA table_info(activity_stress)`).all();
    const columnNames = columns.map(c => c.name);

    for (const col of REQUIRED_COLUMNS) {
      expect(columnNames).toContain(col);
    }
  });

  it('should have PRIMARY KEY on (user_id, activity_id)', () => {
    const sql = db.prepare(
      `SELECT sql FROM sqlite_master WHERE name = 'activity_stress'`
    ).get();

    expect(sql.sql).toContain('PRIMARY KEY');
    expect(sql.sql).toContain('user_id');
    expect(sql.sql).toContain('activity_id');
  });

  it('should have algo_version default of stress_v1', () => {
    const columns = db.prepare(`PRAGMA table_info(activity_stress)`).all();
    const algoCol = columns.find(c => c.name === 'algo_version');

    expect(algoCol).toBeDefined();
    expect(algoCol.dflt_value).toBe("'stress_v1'");
  });

  it('should NOT have legacy columns (stress_type, confidence)', () => {
    const columns = db.prepare(`PRAGMA table_info(activity_stress)`).all();
    const columnNames = columns.map(c => c.name);

    expect(columnNames).not.toContain('stress_type');
    expect(columnNames).not.toContain('confidence');
  });
});

// ============================================================
// PHASE 2: Classifier Output Shape
// ============================================================

describe('Classifier: classifyActivityStress()', () => {
  beforeEach(() => { cleanup(); createTestUser(); });
  afterEach(() => { cleanup(); });

  it('should return all required fields', () => {
    createTestActivity('test:shape-1');
    const result = classifyActivityStress(TEST_USER_ID, 'test:shape-1');

    // Every required column must be present in the result
    for (const col of REQUIRED_COLUMNS) {
      expect(result).toHaveProperty(col);
    }
  });

  it('should set algo_version to stress_v1', () => {
    createTestActivity('test:algo-1');
    const result = classifyActivityStress(TEST_USER_ID, 'test:algo-1');

    expect(result.algo_version).toBe('stress_v1');
  });

  it('should return integer is_stochastic (0 or 1)', () => {
    createTestActivity('test:stoch-1', { vi: 1.02 });
    const r1 = classifyActivityStress(TEST_USER_ID, 'test:stoch-1');
    expect([0, 1]).toContain(r1.is_stochastic);
  });

  it('should return integer block counts >= 0', () => {
    createTestActivity('test:blocks-1');
    const result = classifyActivityStress(TEST_USER_ID, 'test:blocks-1');

    expect(result.sustained_threshold_blocks).toBeGreaterThanOrEqual(0);
    expect(result.longest_threshold_block_s).toBeGreaterThanOrEqual(0);
    expect(result.vo2_blocks).toBeGreaterThanOrEqual(0);
    expect(result.longest_vo2_block_s).toBeGreaterThanOrEqual(0);
    expect(result.sprint_spikes).toBeGreaterThanOrEqual(0);
  });

  it('should return evidence as JSON string', () => {
    createTestActivity('test:evidence-1');
    const result = classifyActivityStress(TEST_USER_ID, 'test:evidence-1');

    expect(typeof result.evidence).toBe('string');
    const parsed = JSON.parse(result.evidence);
    expect(parsed).toBeDefined();
    expect(typeof parsed).toBe('object');
  });

  it('should classify recovery for short easy ride', () => {
    createTestActivity('test:recovery-1', {
      avgPower: 100,
      normalizedPower: 105,
      durationS: 2400,
      vi: 1.02
    });
    const result = classifyActivityStress(TEST_USER_ID, 'test:recovery-1');

    expect(result.primary_stress_type).toBe('recovery');
  });

  it('should throw if activity not normalised', () => {
    // Create activity without normalised data
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s,
        avg_power, has_power, is_valid_for_analytics, physiology_source,
        metadata_source, is_shell, created_at, updated_at
      ) VALUES ('test:no-norm', ?, 'No Norm', 'cycling', 'Ride',
        '2026-02-17T10:00:00Z', 3600, 185, 1, 1, 'intervals', 'intervals',
        0, datetime('now'), datetime('now'))
    `).run(TEST_USER_ID);

    expect(() => {
      classifyActivityStress(TEST_USER_ID, 'test:no-norm');
    }).toThrow();
  });
});

// ============================================================
// PHASE 3: Runner writes full schema
// ============================================================

describe('Runner: runStressClassificationForUser()', () => {
  beforeEach(() => { cleanup(); createTestUser(); });
  afterEach(() => { cleanup(); });

  it('should write all schema columns to database', async () => {
    createTestActivity('test:runner-write-1');

    const result = await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    expect(result.ok).toBe(true);
    expect(result.stats.computed).toBe(1);

    // Read back from DB
    const row = db.prepare(`
      SELECT * FROM activity_stress WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, 'test:runner-write-1');

    expect(row).toBeDefined();
    expect(row.algo_version).toBe('stress_v1');
    expect(row.primary_stress_type).toBeDefined();
    expect(typeof row.is_stochastic).toBe('number');
    expect(typeof row.sustained_threshold_blocks).toBe('number');
    expect(typeof row.longest_threshold_block_s).toBe('number');
    expect(typeof row.vo2_blocks).toBe('number');
    expect(typeof row.longest_vo2_block_s).toBe('number');
    expect(typeof row.sprint_spikes).toBe('number');
    // recovery_score can be null
    expect(row.evidence).toBeDefined();
    expect(() => JSON.parse(row.evidence)).not.toThrow();
  });

  it('should classify multiple activities', async () => {
    for (let i = 1; i <= 3; i++) {
      createTestActivity(`test:multi-${i}`);
    }

    const result = await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    expect(result.ok).toBe(true);
    expect(result.stats.total).toBe(3);
    expect(result.stats.computed).toBe(3);
    expect(result.stats.errors).toBe(0);
  });

  it('should skip already classified (no forceRecompute)', async () => {
    createTestActivity('test:skip-1');

    // First run
    await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    // Second run
    const result = await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    expect(result.ok).toBe(true);
    expect(result.stats.skipped).toBe(1);
    expect(result.stats.computed).toBe(0);
  });

  it('should recompute with forceRecompute', async () => {
    createTestActivity('test:force-1');

    await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    const result = await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false,
      forceRecompute: true
    });

    expect(result.ok).toBe(true);
    expect(result.stats.computed).toBe(1);
    expect(result.stats.skipped).toBe(0);
  });
});

// ============================================================
// PHASE 4: Status reporting
// ============================================================

describe('Runner: getStressClassificationStatus()', () => {
  beforeEach(() => { cleanup(); createTestUser(); });
  afterEach(() => { cleanup(); });

  it('should report correct counts', async () => {
    for (let i = 1; i <= 3; i++) {
      createTestActivity(`test:status-${i}`);
    }

    await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    const status = getStressClassificationStatus(TEST_USER_ID);

    expect(status.total).toBe(3);
    expect(status.classified).toBe(3);
    expect(parseFloat(status.coverage)).toBeCloseTo(100, 0);
    expect(status.missing).toBe(0);
  });

  it('should report missing when not all classified', async () => {
    createTestActivity('test:partial-1');
    createTestActivity('test:partial-2');

    // Only classify one
    const c = classifyActivityStress(TEST_USER_ID, 'test:partial-1');
    db.prepare(`
      INSERT INTO activity_stress (
        user_id, activity_id, computed_at, algo_version,
        primary_stress_type, is_stochastic,
        sustained_threshold_blocks, longest_threshold_block_s,
        vo2_blocks, longest_vo2_block_s, sprint_spikes,
        recovery_score, evidence
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      c.user_id, c.activity_id, c.computed_at, c.algo_version,
      c.primary_stress_type, c.is_stochastic,
      c.sustained_threshold_blocks, c.longest_threshold_block_s,
      c.vo2_blocks, c.longest_vo2_block_s, c.sprint_spikes,
      c.recovery_score, c.evidence
    );

    const status = getStressClassificationStatus(TEST_USER_ID);

    expect(status.total).toBe(2);
    expect(status.classified).toBe(1);
    expect(status.missing).toBe(1);
  });
});

// ============================================================
// PHASE 5: WeeklyAggregator integration query
// ============================================================

describe('WeeklyAggregator: stress column alignment', () => {
  beforeEach(() => { cleanup(); createTestUser(); });
  afterEach(() => { cleanup(); });

  it('should return non-null stress fields from JOIN query', async () => {
    createTestActivity('test:weekly-stress-1');

    await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    // Run the exact query the weeklyAggregator uses
    const row = db.prepare(`
      SELECT
        s.primary_stress_type AS stress_type,
        s.is_stochastic,
        s.sprint_spikes
      FROM activity_stress s
      WHERE s.user_id = ? AND s.activity_id = ?
    `).get(TEST_USER_ID, 'test:weekly-stress-1');

    expect(row).toBeDefined();
    expect(row.stress_type).toBeDefined();
    expect(row.stress_type).not.toBeNull();
    expect(typeof row.is_stochastic).toBe('number');
    expect(typeof row.sprint_spikes).toBe('number');
  });

  it('should produce valid stress_dist from aggregation', async () => {
    // Create activities with different stress types
    createTestActivity('test:dist-1', { avgPower: 100, normalizedPower: 105, durationS: 2400, vi: 1.02 }); // recovery
    createTestActivity('test:dist-2', { avgPower: 185, normalizedPower: 195, durationS: 3600, vi: 1.03 }); // steady

    await runStressClassificationForUser(TEST_USER_ID, {
      ensureNormalised: false,
      ensureDurability: false
    });

    const rows = db.prepare(`
      SELECT primary_stress_type FROM activity_stress WHERE user_id = ?
    `).all(TEST_USER_ID);

    expect(rows.length).toBe(2);

    // Build stress distribution (same logic as weeklyAggregator)
    const dist = {};
    for (const row of rows) {
      dist[row.primary_stress_type] = (dist[row.primary_stress_type] || 0) + 1;
    }

    expect(Object.keys(dist).length).toBeGreaterThan(0);
    expect(JSON.stringify(dist)).toBeDefined();
  });
});
