/**
 * Source-of-Truth Rules Regression Tests
 * 
 * CRITICAL: These tests enforce the source-of-truth rules:
 * - Physiology: FIT > Intervals-native > Strava > Shell
 * - Metadata: Strava > Intervals > FIT
 * - Intervals-native physiology is PROTECTED from Strava overwrites
 * - Shells never become canonical without enrichment
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  selectOrCreateCanonicalActivity,
  sourceExists,
  getPhysiologyPriority,
  getMetadataPriority,
  REASON_CODES
} from '../services/canonicalActivitySelector.js';

import {
  verifyActivityIntegrity,
  guardIntervalsPhysiology,
  guardShellValidity,
  getIntegritySummary
} from '../services/activityIntegrityGuard.js';

describe('Canonical Activity Selection', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should create canonical for Intervals-native activity', () => {
    const result = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000
      },
      incomingType: 'intervals_native'
    });
    
    expect(result.action).toBe('create_canonical');
    expect(result.physiologySource).toBe('intervals');
    expect(result.metadataSource).toBe('intervals');
  });
  
  it('should create source only for Intervals shell', () => {
    const result = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: '12345678',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 0,
        distance_m: 0
      },
      incomingType: 'intervals_shell'
    });
    
    expect(result.action).toBe('create_source_only');
    expect(result.reason).toBe(REASON_CODES.SHELL_PENDING_ENRICHMENT);
    expect(result.shouldEnrich).toBe(true);
  });
  
  it('should create canonical for Strava-only activity', () => {
    const result = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000
      },
      incomingType: 'strava'
    });
    
    expect(result.action).toBe('create_canonical');
    expect(result.physiologySource).toBe('strava');
    expect(result.metadataSource).toBe('strava');
  });
});

describe('Intervals-Native Protection', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should protect Intervals-native physiology from Strava overwrite', () => {
    // Create Intervals-native canonical
    const activityId = 'test-intervals-native';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s, distance_m,
        avg_power, tss, physiology_source, metadata_source,
        is_valid_for_analytics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600, 45000,
      185, 85, 'intervals', 'intervals', 1
    );
    
    // Try to select with Strava
    const result = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000,
        avg_power: 200  // Different power
      },
      incomingType: 'strava'
    });
    
    expect(result.action).toBe('attach_source_only');
    expect(result.reason).toBe(REASON_CODES.INTERVALS_NATIVE_PROTECTED);
    expect(result.upgradePhysiology).toBe(false);
  });
  
  it('should allow FIT to upgrade Intervals-native physiology', () => {
    // Create Intervals-native canonical
    const activityId = 'test-intervals-native-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600,
      'intervals', 'intervals', 1
    );
    
    // Try to select with FIT
    const result = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'fit',
      providerId: 'fit-12345',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600
      },
      incomingType: 'fit'
    });
    
    expect(result.action).toBe('upgrade_both');
    expect(result.upgradePhysiology).toBe(true);
    expect(result.physiologySource).toBe('fit');
  });
});

describe('Shell Activity Rules', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should mark shell as invalid for analytics', () => {
    const activityId = 'test-shell';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        is_shell, is_valid_for_analytics, physiology_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Shell Activity', '2026-02-17T10:00:00Z', 0,
      1, 0, null
    );
    
    const integrity = verifyActivityIntegrity(testUserId);
    
    expect(integrity.ok).toBe(true);
    expect(integrity.issueCount).toBe(0);
  });
  
  it('should detect shell marked as valid (integrity violation)', () => {
    const activityId = 'test-shell-invalid';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        is_shell, is_valid_for_analytics, physiology_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Shell Activity', '2026-02-17T10:00:00Z', 0,
      1, 1, null  // INVALID: shell marked as valid
    );
    
    const integrity = verifyActivityIntegrity(testUserId);
    
    expect(integrity.ok).toBe(false);
    expect(integrity.errorCount).toBeGreaterThan(0);
    expect(integrity.issues.some(i => i.type === 'SHELL_MARKED_VALID')).toBe(true);
  });
  
  it('should allow enriched shell to become valid', () => {
    const activityId = 'test-enriched-shell';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, distance_m,
        is_shell, is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Enriched Activity', '2026-02-17T10:00:00Z', 3600, 45000,
      0, 1, 'strava', 'strava'  // No longer a shell after enrichment
    );
    
    const integrity = verifyActivityIntegrity(testUserId);
    
    expect(integrity.ok).toBe(true);
  });
});

describe('Source Priority', () => {
  
  it('should have correct physiology priority order', () => {
    expect(getPhysiologyPriority('fit')).toBeGreaterThan(getPhysiologyPriority('intervals'));
    expect(getPhysiologyPriority('intervals')).toBeGreaterThan(getPhysiologyPriority('strava'));
    expect(getPhysiologyPriority('strava')).toBeGreaterThan(0);
  });
  
  it('should have correct metadata priority order', () => {
    expect(getMetadataPriority('strava')).toBeGreaterThan(getMetadataPriority('intervals'));
    expect(getMetadataPriority('intervals')).toBeGreaterThan(getMetadataPriority('fit'));
    expect(getMetadataPriority('fit')).toBeGreaterThan(0);
  });
});

describe('Integrity Guards', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  it('should block Strava from overwriting Intervals-native physiology', () => {
    const activityId = 'test-guard-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Activity', '2026-02-17T10:00:00Z', 3600,
      'intervals', 1
    );
    
    const guard = guardIntervalsPhysiology(activityId, 'strava', {
      duration_s: 3700,
      avg_power: 200
    });
    
    expect(guard.allowed).toBe(false);
    expect(guard.reason).toBe('INTERVALS_NATIVE_PROTECTED');
  });
  
  it('should allow FIT to overwrite Intervals-native physiology', () => {
    const activityId = 'test-guard-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Activity', '2026-02-17T10:00:00Z', 3600,
      'intervals', 1
    );
    
    const guard = guardIntervalsPhysiology(activityId, 'fit', {
      duration_s: 3700,
      avg_power: 200
    });
    
    expect(guard.allowed).toBe(true);
  });
  
  it('should block shell from being marked valid', () => {
    const activityId = 'test-guard-3';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        is_shell, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Shell Activity', '2026-02-17T10:00:00Z', 0,
      1, 0
    );
    
    const guard = guardShellValidity(activityId, true);
    
    expect(guard.allowed).toBe(false);
    expect(guard.reason).toBe('SHELL_CANNOT_BE_VALID');
  });
});

describe('Reimport Idempotency', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should produce same result when importing same activity twice', () => {
    // First import
    const result1 = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000
      },
      incomingType: 'intervals_native'
    });
    
    expect(result1.action).toBe('create_canonical');
    
    // Create the activity
    const activityId = 'test-idempotent';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, distance_m,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Activity', '2026-02-17T10:00:00Z', 3600, 45000,
      'intervals', 'intervals', 1
    );
    
    // Create source
    db.prepare(`
      INSERT INTO activity_sources (
        id, activity_id, user_id, provider, provider_id,
        imported_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('intervals:i-12345', activityId, testUserId, 'intervals', 'i-12345');
    
    // Second import (should match existing)
    const result2 = selectOrCreateCanonicalActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000
      },
      incomingType: 'intervals_native'
    });
    
    expect(result2.action).toBe('attach_source_only');
    expect(result2.canonicalActivityId).toBe(activityId);
  });
});

describe('Integrity Summary', () => {
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  it('should report correct source distribution', () => {
    // Create test activities
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES 
        ('test-1', ?, 'Activity 1', '2026-02-17T10:00:00Z', 3600, 'intervals', 'intervals', 1, datetime('now'), datetime('now')),
        ('test-2', ?, 'Activity 2', '2026-02-17T11:00:00Z', 3600, 'strava', 'strava', 1, datetime('now'), datetime('now')),
        ('test-3', ?, 'Activity 3', '2026-02-17T12:00:00Z', 3600, 'fit', 'strava', 1, datetime('now'), datetime('now'))
    `).run(testUserId, testUserId, testUserId);
    
    const summary = getIntegritySummary(testUserId);
    
    expect(summary.totalActivities).toBe(3);
    expect(summary.validActivities).toBe(3);
    expect(summary.byPhysiologySource.intervals).toBe(1);
    expect(summary.byPhysiologySource.strava).toBe(1);
    expect(summary.byPhysiologySource.fit).toBe(1);
  });
});
