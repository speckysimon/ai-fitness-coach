/**
 * Durability Calculator Tests
 * 
 * Tests for deterministic durability and fatigue resistance metrics.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  computeDurabilityForActivity,
  computePowerFade,
  computeHrFade,
  computeEfficiencyDrop,
  computeLateThresholdScore,
  computeLateZoneDistribution,
  computeStochasticity,
  computeRepeatHardEfforts,
  computeSurgeCount
} from '../services/durabilityCalculator.js';

import {
  runDurabilityForUser,
  getDurabilityStatus,
  clearDurabilityData
} from '../services/durabilityRunner.js';

const TEST_USER_ID = 998;

describe('Durability Calculator - Power Fade', () => {
  it('should compute power fade correctly', () => {
    // First third: 200W, Final third: 180W (10% fade)
    const powerStream = [
      ...Array(1200).fill(200),  // First third
      ...Array(1200).fill(190),  // Middle third
      ...Array(1200).fill(180)   // Final third (10% drop)
    ];
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeCloseTo(10, 1);  // (200-180)/200 * 100 = 10%
  });
  
  it('should handle negative fade (power increase)', () => {
    // Power increases (negative fade)
    const powerStream = [
      ...Array(1200).fill(180),
      ...Array(1200).fill(190),
      ...Array(1200).fill(200)
    ];
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeLessThan(0);  // Negative fade
    expect(fade).toBeCloseTo(-11.1, 1);  // (180-200)/180 * 100
  });
  
  it('should return null for short activities', () => {
    const powerStream = Array(100).fill(200);  // Too short
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeNull();
  });
  
  it('should handle null values in stream', () => {
    const powerStream = [
      ...Array(1200).fill(200),
      null, null, null,  // Gaps
      ...Array(1200).fill(190),
      ...Array(1200).fill(180)
    ];
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeCloseTo(10, 1);
  });
});

describe('Durability Calculator - HR Fade', () => {
  it('should compute HR fade correctly', () => {
    // First third: 140 bpm, Final third: 150 bpm (7.14% increase)
    const hrStream = [
      ...Array(1200).fill(140),
      ...Array(1200).fill(145),
      ...Array(1200).fill(150)
    ];
    
    const fade = computeHrFade(hrStream);
    
    expect(fade).toBeCloseTo(7.14, 1);  // (150-140)/140 * 100
  });
  
  it('should handle HR decrease (negative fade)', () => {
    const hrStream = [
      ...Array(1200).fill(150),
      ...Array(1200).fill(145),
      ...Array(1200).fill(140)
    ];
    
    const fade = computeHrFade(hrStream);
    
    expect(fade).toBeLessThan(0);
  });
  
  it('should return null for empty stream', () => {
    const fade = computeHrFade([]);
    expect(fade).toBeNull();
  });
});

describe('Durability Calculator - Efficiency Drop', () => {
  it('should compute efficiency drop correctly', () => {
    // First third: 200W @ 140 HR = 1.43 W/bpm
    // Final third: 180W @ 150 HR = 1.20 W/bpm
    // Drop: (1.43 - 1.20) / 1.43 * 100 = 16%
    
    const powerStream = [
      ...Array(1200).fill(200),
      ...Array(1200).fill(190),
      ...Array(1200).fill(180)
    ];
    
    const hrStream = [
      ...Array(1200).fill(140),
      ...Array(1200).fill(145),
      ...Array(1200).fill(150)
    ];
    
    const drop = computeEfficiencyDrop(powerStream, hrStream);
    
    expect(drop).toBeCloseTo(16, 0);
  });
  
  it('should return null if streams different length', () => {
    const powerStream = Array(3600).fill(200);
    const hrStream = Array(1800).fill(140);
    
    const drop = computeEfficiencyDrop(powerStream, hrStream);
    
    expect(drop).toBeNull();
  });
  
  it('should return null if no power stream', () => {
    const hrStream = Array(3600).fill(140);
    
    const drop = computeEfficiencyDrop(null, hrStream);
    
    expect(drop).toBeNull();
  });
});

describe('Durability Calculator - Late Threshold Score', () => {
  it('should compute late threshold score correctly', () => {
    // Final third: 50% above threshold, 50% below
    const powerStream = [
      ...Array(1200).fill(150),  // First third (below)
      ...Array(1200).fill(180),  // Middle third (below)
      ...Array(600).fill(210),   // Final third: 50% above 200W
      ...Array(600).fill(180)    // Final third: 50% below 200W
    ];
    
    const score = computeLateThresholdScore(powerStream, 200);
    
    expect(score).toBeCloseTo(50, 1);
  });
  
  it('should return 100 if all final third above threshold', () => {
    const powerStream = [
      ...Array(1200).fill(150),
      ...Array(1200).fill(180),
      ...Array(1200).fill(220)  // All above 200W
    ];
    
    const score = computeLateThresholdScore(powerStream, 200);
    
    expect(score).toBeCloseTo(100, 1);
  });
  
  it('should return 0 if all final third below threshold', () => {
    const powerStream = [
      ...Array(1200).fill(220),
      ...Array(1200).fill(210),
      ...Array(1200).fill(150)  // All below 200W
    ];
    
    const score = computeLateThresholdScore(powerStream, 200);
    
    expect(score).toBeCloseTo(0, 1);
  });
  
  it('should return null if no threshold provided', () => {
    const powerStream = Array(3600).fill(200);
    
    const score = computeLateThresholdScore(powerStream, null);
    
    expect(score).toBeNull();
  });
});

describe('Durability Calculator - Late Zone Distribution', () => {
  it('should compute zone distribution in final third', () => {
    // Final third: 600s in Z2, 600s in Z3
    const powerStream = [
      ...Array(1200).fill(100),  // First third: Z1
      ...Array(1200).fill(140),  // Middle third: Z2
      ...Array(600).fill(140),   // Final third: 600s Z2 (70% of 200W FTP)
      ...Array(600).fill(170)    // Final third: 600s Z3 (85% of 200W FTP)
    ];
    
    const distribution = computeLateZoneDistribution(powerStream, 200);
    
    expect(distribution.z2).toBe(600);
    expect(distribution.z3).toBe(600);
    expect(distribution.z1).toBe(0);
  });
  
  it('should return null if no FTP provided', () => {
    const powerStream = Array(3600).fill(200);
    
    const distribution = computeLateZoneDistribution(powerStream, null);
    
    expect(distribution).toBeNull();
  });
});

describe('Durability Calculator - Stochasticity', () => {
  it('should compute stochasticity for steady power', () => {
    // Very steady power (low CV)
    const powerStream = Array(3600).fill(200);
    
    const stochasticity = computeStochasticity(powerStream);
    
    expect(stochasticity).toBe(0);  // No variation
  });
  
  it('should compute stochasticity for variable power', () => {
    // Variable power
    const powerStream = [
      ...Array(1200).fill(150),
      ...Array(1200).fill(200),
      ...Array(1200).fill(250)
    ];
    
    const stochasticity = computeStochasticity(powerStream);
    
    expect(stochasticity).toBeGreaterThan(0);
    expect(stochasticity).toBeLessThan(1);  // CV typically < 1 for cycling
  });
  
  it('should return null for empty stream', () => {
    const stochasticity = computeStochasticity([]);
    expect(stochasticity).toBeNull();
  });
  
  it('should return null for very short stream', () => {
    const powerStream = Array(30).fill(200);  // Too short
    
    const stochasticity = computeStochasticity(powerStream);
    
    expect(stochasticity).toBeNull();
  });
});

describe('Durability Calculator - Repeat Hard Efforts', () => {
  it('should count repeat hard efforts correctly', () => {
    // 3 efforts of 90s each in Z5 (210W+), with 120s recovery between
    const powerStream = [
      ...Array(90).fill(220),   // Effort 1 (Z5)
      ...Array(120).fill(100),  // Recovery
      ...Array(90).fill(230),   // Effort 2 (Z5)
      ...Array(120).fill(100),  // Recovery
      ...Array(90).fill(225),   // Effort 3 (Z5)
      ...Array(300).fill(150)   // Cool down
    ];
    
    const ftp = 200;
    const count = computeRepeatHardEfforts(powerStream, ftp, {
      minSec: 60,
      zone: 'z5',
      minRecoverySec: 60
    });
    
    expect(count).toBe(3);
  });
  
  it('should not count efforts without sufficient recovery', () => {
    // 2 efforts with only 30s recovery (too short)
    const powerStream = [
      ...Array(90).fill(220),   // Effort 1
      ...Array(30).fill(100),   // Recovery too short
      ...Array(90).fill(230),   // Effort 2 (not counted)
      ...Array(300).fill(150)
    ];
    
    const count = computeRepeatHardEfforts(powerStream, 200, {
      minSec: 60,
      minRecoverySec: 60
    });
    
    expect(count).toBe(1);  // Only first effort counts
  });
  
  it('should not count efforts below minimum duration', () => {
    // Efforts only 30s each (too short)
    const powerStream = [
      ...Array(30).fill(220),   // Too short
      ...Array(120).fill(100),
      ...Array(30).fill(230),   // Too short
      ...Array(300).fill(150)
    ];
    
    const count = computeRepeatHardEfforts(powerStream, 200, {
      minSec: 60
    });
    
    expect(count).toBe(0);
  });
  
  it('should return 0 for no FTP', () => {
    const powerStream = Array(3600).fill(200);
    
    const count = computeRepeatHardEfforts(powerStream, null);
    
    expect(count).toBe(0);
  });
  
  it('should handle gaps in stream', () => {
    const powerStream = [
      ...Array(90).fill(220),
      ...Array(120).fill(100),
      null, null, null,  // Gap
      ...Array(90).fill(230),
      ...Array(300).fill(150)
    ];
    
    const count = computeRepeatHardEfforts(powerStream, 200, {
      minSec: 60,
      minRecoverySec: 60
    });
    
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

describe('Durability Calculator - Surge Count', () => {
  it('should count surges correctly', () => {
    // Average: 200W, Surge threshold: 240W (20% above)
    // 3 surges
    const powerStream = [
      ...Array(600).fill(200),   // Steady
      ...Array(60).fill(250),    // Surge 1
      ...Array(600).fill(200),   // Steady
      ...Array(60).fill(260),    // Surge 2
      ...Array(600).fill(200),   // Steady
      ...Array(60).fill(245),    // Surge 3
      ...Array(600).fill(200)    // Steady
    ];
    
    const count = computeSurgeCount(powerStream);
    
    expect(count).toBe(3);
  });
  
  it('should not double-count continuous surges', () => {
    // One continuous surge (not multiple)
    const powerStream = [
      ...Array(600).fill(200),
      ...Array(300).fill(250),  // One long surge
      ...Array(600).fill(200)
    ];
    
    const count = computeSurgeCount(powerStream);
    
    expect(count).toBe(1);
  });
  
  it('should return 0 for steady power', () => {
    const powerStream = Array(3600).fill(200);
    
    const count = computeSurgeCount(powerStream);
    
    expect(count).toBe(0);
  });
  
  it('should return 0 for empty stream', () => {
    const count = computeSurgeCount([]);
    expect(count).toBe(0);
  });
});

describe('Durability Calculator - Integration', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    // Create test user with FTP
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should compute durability for activity with power', async () => {
    // Create test activity (60 minutes)
    const activityId = 'test:durability-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Durability Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    const result = await computeDurabilityForActivity(TEST_USER_ID, activityId);
    
    expect(result.ok).toBe(true);
    expect(result.hasSufficientDuration).toBe(true);
    
    // Verify stored in database
    const durability = db.prepare(`
      SELECT * FROM activity_durability WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(durability).toBeDefined();
    expect(durability.algo_version).toBe('dur_v1');
    expect(durability.has_sufficient_duration).toBe(1);
  });
  
  it('should handle short activity', async () => {
    // Create short activity (15 minutes)
    const activityId = 'test:durability-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Short Ride', '2026-02-17T11:00:00Z',
      900, 185, 1, 1, 'intervals', 'intervals'
    );
    
    const result = await computeDurabilityForActivity(TEST_USER_ID, activityId);
    
    expect(result.ok).toBe(true);
    expect(result.hasSufficientDuration).toBe(false);
    expect(result.notes).toContain('TOO_SHORT');
    
    const durability = db.prepare(`
      SELECT * FROM activity_durability WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(durability.has_sufficient_duration).toBe(0);
  });
  
  it('should handle missing power data', async () => {
    const activityId = 'test:durability-3';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'No Power', '2026-02-17T12:00:00Z',
      3600, 0, 1, 'strava', 'strava'
    );
    
    const result = await computeDurabilityForActivity(TEST_USER_ID, activityId);
    
    expect(result.ok).toBe(true);
    expect(result.hasPowerData).toBe(false);
    expect(result.notes).toContain('NO_POWER_STREAM');
    
    const durability = db.prepare(`
      SELECT * FROM activity_durability WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(durability.has_power_data).toBe(0);
    expect(durability.fade_power_pct).toBeNull();
    expect(durability.stochasticity_score).toBeNull();
  });
});

describe('Durability Runner', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr, analytics_include_strava_only)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180, 1);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should compute durability for all valid activities', async () => {
    // Create test activities
    for (let i = 1; i <= 3; i++) {
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        `test:runner-${i}`, TEST_USER_ID, `Activity ${i}`,
        `2026-02-${10 + i}T10:00:00Z`, 3600, 185, 1, 1, 'intervals', 'intervals'
      );
    }
    
    const result = await runDurabilityForUser(TEST_USER_ID, {
      ensureNormalised: false  // Skip normalisation for speed
    });
    
    expect(result.ok).toBe(true);
    expect(result.stats.total).toBe(3);
    expect(result.stats.computed).toBe(3);
  });
  
  it('should skip already computed activities', async () => {
    const activityId = 'test:runner-skip';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Skip Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    // Compute once
    await computeDurabilityForActivity(TEST_USER_ID, activityId);
    
    // Run again
    const result = await runDurabilityForUser(TEST_USER_ID, {
      ensureNormalised: false
    });
    
    expect(result.ok).toBe(true);
    expect(result.stats.skipped).toBe(1);
    expect(result.stats.computed).toBe(0);
  });
  
  it('should get durability status', async () => {
    // Create and compute activities
    for (let i = 1; i <= 5; i++) {
      const activityId = `test:status-${i}`;
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, `Activity ${i}`,
        `2026-02-${10 + i}T10:00:00Z`, 3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      await computeDurabilityForActivity(TEST_USER_ID, activityId);
    }
    
    const status = getDurabilityStatus(TEST_USER_ID);
    
    expect(status.totalActivities).toBe(5);
    expect(status.durabilityActivities).toBe(5);
    expect(parseFloat(status.coverage)).toBeCloseTo(100, 0);
    expect(status.algoVersion).toBe('dur_v1');
  });
  
  it('should clear durability data', async () => {
    const activityId = 'test:clear';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Clear Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    await computeDurabilityForActivity(TEST_USER_ID, activityId);
    
    const result = clearDurabilityData(TEST_USER_ID);
    
    expect(result.ok).toBe(true);
    expect(result.cleared).toBe(1);
    
    const status = getDurabilityStatus(TEST_USER_ID);
    expect(status.durabilityActivities).toBe(0);
  });
});
