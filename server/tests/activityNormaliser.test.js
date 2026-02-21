/**
 * Activity Normaliser Tests
 * 
 * Tests for deterministic activity normalisation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  normaliseActivity,
  normaliseActivitiesBatch,
  computeTimeInZones,
  computeLongestSustainedEfforts,
  computeHrDrift,
  computePowerFade,
  computeVariabilityIndex,
  computeQualityScore
} from '../services/activityNormaliser.js';

import {
  runNormalisationForUser,
  getNormalisationStatus,
  clearNormalisedData
} from '../services/normalisationRunner.js';

const TEST_USER_ID = 997;

describe('Activity Normaliser - Time in Zones', () => {
  it('should compute time in power zones correctly', () => {
    // Mock power stream: 30 seconds in each zone
    const powerStream = [
      ...Array(30).fill(100),  // Z1: 100W (50% of 200W FTP)
      ...Array(30).fill(140),  // Z2: 140W (70% of FTP)
      ...Array(30).fill(170),  // Z3: 170W (85% of FTP)
      ...Array(30).fill(200),  // Z4: 200W (100% of FTP)
      ...Array(30).fill(220)   // Z5: 220W (110% of FTP)
    ];
    
    const zones = {
      z1: { min: 0, max: 0.55 },
      z2: { min: 0.55, max: 0.75 },
      z3: { min: 0.75, max: 0.90 },
      z4: { min: 0.90, max: 1.05 },
      z5: { min: 1.05, max: 1.20 }
    };
    
    const ftp = 200;
    
    const result = computeTimeInZones(powerStream, zones, ftp);
    
    expect(result.z1).toBe(30);
    expect(result.z2).toBe(30);
    expect(result.z3).toBe(30);
    expect(result.z4).toBe(30);
    expect(result.z5).toBe(30);
  });
  
  it('should handle null values in stream', () => {
    const powerStream = [
      ...Array(30).fill(100),
      null, null, null,  // Gaps
      ...Array(30).fill(140)
    ];
    
    const zones = {
      z1: { min: 0, max: 0.55 },
      z2: { min: 0.55, max: 0.75 }
    };
    
    const result = computeTimeInZones(powerStream, zones, 200);
    
    expect(result.z1).toBe(30);
    expect(result.z2).toBe(30);
  });
  
  it('should return null for empty stream', () => {
    const result = computeTimeInZones([], {}, 200);
    expect(result).toBeNull();
  });
});

describe('Activity Normaliser - Longest Sustained Efforts', () => {
  it('should find longest continuous effort in zone', () => {
    // 10 min in Z2, 5 min break, 15 min in Z2
    const powerStream = [
      ...Array(600).fill(140),   // 10 min Z2
      ...Array(300).fill(50),    // 5 min recovery
      ...Array(900).fill(140)    // 15 min Z2 (longest)
    ];
    
    const zones = {
      z2: { min: 0.55, max: 0.75 }
    };
    
    const result = computeLongestSustainedEfforts(powerStream, zones, 200);
    
    expect(result.z2).toBeDefined();
    expect(result.z2.duration_s).toBe(900);  // 15 minutes
    expect(result.z2.avg_value).toBe(140);
  });
  
  it('should handle gaps in stream', () => {
    const powerStream = [
      ...Array(600).fill(140),
      null, null, null,  // Gap resets effort
      ...Array(300).fill(140)
    ];
    
    const zones = {
      z2: { min: 0.55, max: 0.75 }
    };
    
    const result = computeLongestSustainedEfforts(powerStream, zones, 200);
    
    expect(result.z2.duration_s).toBe(600);  // First effort is longest
  });
  
  it('should return null if no efforts meet minimum duration', () => {
    const powerStream = Array(60).fill(140);  // Only 1 minute
    
    const zones = {
      z2: { min: 0.55, max: 0.75 }
    };
    
    const result = computeLongestSustainedEfforts(powerStream, zones, 200, [300]);
    
    expect(result).toBeNull();
  });
});

describe('Activity Normaliser - HR Drift', () => {
  it('should compute HR drift with stable power', () => {
    // First half: 140 HR at 180W
    // Second half: 150 HR at 180W (7% drift)
    const hrStream = [
      ...Array(1800).fill(140),
      ...Array(1800).fill(150)
    ];
    
    const powerStream = Array(3600).fill(180);
    
    const drift = computeHrDrift(hrStream, powerStream, 3600);
    
    expect(drift).toBeCloseTo(7.14, 1);  // (150-140)/140 * 100
  });
  
  it('should return null if power varies too much', () => {
    const hrStream = [
      ...Array(1800).fill(140),
      ...Array(1800).fill(150)
    ];
    
    // Power varies significantly
    const powerStream = [
      ...Array(1800).fill(150),
      ...Array(1800).fill(220)  // 47% increase
    ];
    
    const drift = computeHrDrift(hrStream, powerStream, 3600);
    
    expect(drift).toBeNull();
  });
  
  it('should compute simple HR drift without power', () => {
    const hrStream = [
      ...Array(1800).fill(140),
      ...Array(1800).fill(150)
    ];
    
    const drift = computeHrDrift(hrStream, null, 3600);
    
    expect(drift).toBeCloseTo(7.14, 1);
  });
  
  it('should return null for empty HR stream', () => {
    const drift = computeHrDrift([], null, 3600);
    expect(drift).toBeNull();
  });
});

describe('Activity Normaliser - Power Fade', () => {
  it('should compute power fade (fatigue)', () => {
    // First third: 200W
    // Final third: 180W (10% fade)
    const powerStream = [
      ...Array(1200).fill(200),  // First third
      ...Array(1200).fill(190),  // Middle third
      ...Array(1200).fill(180)   // Final third
    ];
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeCloseTo(10, 1);  // (200-180)/200 * 100
  });
  
  it('should handle negative fade (pacing issue)', () => {
    // Power increases (negative fade)
    const powerStream = [
      ...Array(1200).fill(180),
      ...Array(1200).fill(190),
      ...Array(1200).fill(200)
    ];
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeLessThan(0);  // Negative fade
  });
  
  it('should return null for short activities', () => {
    const powerStream = Array(100).fill(200);  // Too short
    
    const fade = computePowerFade(powerStream);
    
    expect(fade).toBeNull();
  });
  
  it('should return null for empty stream', () => {
    const fade = computePowerFade([]);
    expect(fade).toBeNull();
  });
});

describe('Activity Normaliser - Variability Index', () => {
  it('should compute VI correctly', () => {
    const vi = computeVariabilityIndex(210, 200);
    expect(vi).toBe(1.05);
  });
  
  it('should return null for zero average power', () => {
    const vi = computeVariabilityIndex(210, 0);
    expect(vi).toBeNull();
  });
  
  it('should return null for null inputs', () => {
    const vi = computeVariabilityIndex(null, 200);
    expect(vi).toBeNull();
  });
});

describe('Activity Normaliser - Quality Score', () => {
  it('should give high score for complete data', () => {
    const result = computeQualityScore({
      hasPower: true,
      hasHr: true,
      hasCadence: true,
      hasStreams: true,
      streamCompleteness: 0.98,
      duration: 3600
    });
    
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.notes).toHaveLength(0);
  });
  
  it('should penalize missing sensors', () => {
    const result = computeQualityScore({
      hasPower: false,
      hasHr: false,
      hasCadence: false,
      hasStreams: true,
      streamCompleteness: 0.98,
      duration: 3600
    });
    
    expect(result.score).toBeLessThan(60);
    expect(result.notes).toContain('NO_POWER');
    expect(result.notes).toContain('NO_HR');
    expect(result.notes).toContain('NO_CADENCE');
  });
  
  it('should penalize stream gaps', () => {
    const result = computeQualityScore({
      hasPower: true,
      hasHr: true,
      hasCadence: true,
      hasStreams: true,
      streamCompleteness: 0.50,  // 50% gaps
      duration: 3600
    });
    
    expect(result.notes).toContain('MAJOR_GAPS');
  });
  
  it('should flag short activities', () => {
    const result = computeQualityScore({
      hasPower: true,
      hasHr: true,
      hasCadence: true,
      hasStreams: true,
      streamCompleteness: 0.98,
      duration: 120  // 2 minutes
    });
    
    expect(result.notes).toContain('SHORT_ACTIVITY');
  });
  
  it('should handle no streams', () => {
    const result = computeQualityScore({
      hasPower: true,
      hasHr: true,
      hasCadence: true,
      hasStreams: false,
      streamCompleteness: 0,
      duration: 3600
    });
    
    expect(result.notes).toContain('NO_STREAMS');
  });
});

describe('Activity Normaliser - Integration', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    // Create test user
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should normalise activity with power and HR', async () => {
    // Create test activity
    const activityId = 'test:normalise-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, normalized_power,
        avg_hr, max_hr, has_power, is_valid_for_analytics,
        physiology_source, metadata_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Test Ride', '2026-02-17T10:00:00Z',
      3600, 185, 195, 145, 175, 1, 1, 'intervals', 'intervals'
    );
    
    const result = await normaliseActivity(TEST_USER_ID, activityId);
    
    expect(result.ok).toBe(true);
    expect(result.hasPower).toBe(true);
    expect(result.hasHr).toBe(true);
    
    // Verify stored in database
    const normalised = db.prepare(`
      SELECT * FROM activity_normalised WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(normalised).toBeDefined();
    expect(normalised.algo_version).toBe('norm_v1');
    expect(normalised.has_power).toBe(1);
    expect(normalised.has_hr).toBe(1);
    expect(normalised.duration_s).toBe(3600);
    expect(normalised.avg_power).toBe(185);
    expect(normalised.np).toBe(195);
  });
  
  it('should normalise activity with only HR', async () => {
    const activityId = 'test:normalise-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_hr, max_hr,
        has_power, is_valid_for_analytics,
        physiology_source, metadata_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'HR Only Ride', '2026-02-17T11:00:00Z',
      3600, 145, 175, 0, 1, 'strava', 'strava'
    );
    
    const result = await normaliseActivity(TEST_USER_ID, activityId);
    
    expect(result.ok).toBe(true);
    expect(result.hasPower).toBe(false);
    expect(result.hasHr).toBe(true);
    
    // Verify power metrics are null
    const normalised = db.prepare(`
      SELECT * FROM activity_normalised WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(normalised.has_power).toBe(0);
    expect(normalised.time_in_zones_power).toBeNull();
    expect(normalised.power_fade_pct).toBeNull();
    expect(normalised.vi).toBeNull();
  });
  
  it('should be idempotent (same result on re-run)', async () => {
    const activityId = 'test:normalise-3';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, normalized_power,
        has_power, is_valid_for_analytics,
        physiology_source, metadata_source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Idempotent Test', '2026-02-17T12:00:00Z',
      3600, 185, 195, 1, 1, 'intervals', 'intervals'
    );
    
    // Run normalisation twice
    const result1 = await normaliseActivity(TEST_USER_ID, activityId);
    const normalised1 = db.prepare(`
      SELECT * FROM activity_normalised WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const result2 = await normaliseActivity(TEST_USER_ID, activityId);
    const normalised2 = db.prepare(`
      SELECT * FROM activity_normalised WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    // Results should be identical (except computed_at)
    expect(result1.ok).toBe(result2.ok);
    expect(normalised1.algo_version).toBe(normalised2.algo_version);
    expect(normalised1.quality_score).toBe(normalised2.quality_score);
    expect(normalised1.has_power).toBe(normalised2.has_power);
    expect(normalised1.has_hr).toBe(normalised2.has_hr);
  });
  
  it('should store algo_version', async () => {
    const activityId = 'test:normalise-4';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Version Test', '2026-02-17T13:00:00Z',
      3600, 0, 1, 'strava', 'strava'
    );
    
    await normaliseActivity(TEST_USER_ID, activityId);
    
    const normalised = db.prepare(`
      SELECT algo_version FROM activity_normalised WHERE user_id = ? AND activity_id = ?
    `).get(TEST_USER_ID, activityId);
    
    expect(normalised.algo_version).toBe('norm_v1');
  });
});

describe('Normalisation Runner', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr, analytics_include_strava_only)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180, 1);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should normalise all valid activities for user', async () => {
    // Create test activities
    for (let i = 1; i <= 3; i++) {
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        `test:runner-${i}`, TEST_USER_ID, `Activity ${i}`,
        `2026-02-${10 + i}T10:00:00Z`, 3600, 1, 1, 'intervals', 'intervals'
      );
    }
    
    const result = await runNormalisationForUser(TEST_USER_ID);
    
    expect(result.ok).toBe(true);
    expect(result.stats.total).toBe(3);
    expect(result.stats.computed).toBe(3);
    expect(result.stats.errors).toBe(0);
  });
  
  it('should skip already normalised activities', async () => {
    // Create and normalise one activity
    const activityId = 'test:runner-skip';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Skip Test', '2026-02-17T10:00:00Z',
      3600, 1, 1, 'intervals', 'intervals'
    );
    
    await normaliseActivity(TEST_USER_ID, activityId);
    
    // Run normalisation again
    const result = await runNormalisationForUser(TEST_USER_ID);
    
    expect(result.ok).toBe(true);
    expect(result.stats.skipped).toBe(1);
    expect(result.stats.computed).toBe(0);
  });
  
  it('should respect forceRecompute option', async () => {
    const activityId = 'test:runner-force';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Force Test', '2026-02-17T10:00:00Z',
      3600, 1, 1, 'intervals', 'intervals'
    );
    
    await normaliseActivity(TEST_USER_ID, activityId);
    
    // Force recompute
    const result = await runNormalisationForUser(TEST_USER_ID, {
      forceRecompute: true
    });
    
    expect(result.ok).toBe(true);
    expect(result.stats.computed).toBe(1);
  });
  
  it('should get normalisation status', async () => {
    // Create activities
    for (let i = 1; i <= 5; i++) {
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        `test:status-${i}`, TEST_USER_ID, `Activity ${i}`,
        `2026-02-${10 + i}T10:00:00Z`, 3600, 1, 1, 'intervals', 'intervals'
      );
    }
    
    // Normalise 3 of them
    await normaliseActivity(TEST_USER_ID, 'test:status-1');
    await normaliseActivity(TEST_USER_ID, 'test:status-2');
    await normaliseActivity(TEST_USER_ID, 'test:status-3');
    
    const status = getNormalisationStatus(TEST_USER_ID);
    
    expect(status.totalActivities).toBe(5);
    expect(status.normalisedActivities).toBe(3);
    expect(parseFloat(status.coverage)).toBeCloseTo(60, 0);
    expect(status.algoVersion).toBe('norm_v1');
  });
  
  it('should clear normalised data', async () => {
    const activityId = 'test:clear';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Clear Test', '2026-02-17T10:00:00Z',
      3600, 1, 1, 'intervals', 'intervals'
    );
    
    await normaliseActivity(TEST_USER_ID, activityId);
    
    const result = clearNormalisedData(TEST_USER_ID);
    
    expect(result.ok).toBe(true);
    expect(result.cleared).toBe(1);
    
    const status = getNormalisationStatus(TEST_USER_ID);
    expect(status.normalisedActivities).toBe(0);
  });
});
