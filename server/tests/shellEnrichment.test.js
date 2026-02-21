/**
 * Shell Activity Enrichment Tests
 * 
 * Tests for shell detection, deduplication, and enrichment pipeline
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { 
  detectIntervalsShell, 
  resolveCanonicalActivity,
  isStravaConnected,
  SOURCE_PRIORITY,
  REASON_CODES
} from '../services/activityShellResolver.js';

describe('Shell Activity Detection', () => {
  
  it('should detect Intervals shell with numeric ID and missing duration', () => {
    const activity = {
      id: '12345678',
      duration: 0,
      distance: 0,
      start_date: '2026-02-17T10:00:00Z'
    };
    
    const result = detectIntervalsShell(activity);
    
    expect(result.isShell).toBe(true);
    expect(result.stravaId).toBe('12345678');
    expect(result.reason).toContain('missing_core_fields');
  });
  
  it('should detect Intervals shell with numeric ID and no metrics', () => {
    const activity = {
      id: '87654321',
      duration: 3600,
      distance: 45000,
      start_date: '2026-02-17T10:00:00Z',
      avgPower: 0,
      avgHeartRate: 0,
      tss: 0
    };
    
    const result = detectIntervalsShell(activity);
    
    expect(result.isShell).toBe(true);
    expect(result.stravaId).toBe('87654321');
    expect(result.reason).toBe('no_metrics');
  });
  
  it('should NOT detect shell for native Intervals activity (i-prefix)', () => {
    const activity = {
      id: 'i123456',
      duration: 3600,
      distance: 45000,
      start_date: '2026-02-17T10:00:00Z'
    };
    
    const result = detectIntervalsShell(activity);
    
    expect(result.isShell).toBe(false);
    expect(result.stravaId).toBeNull();
    expect(result.reason).toBe('native_intervals_id');
  });
  
  it('should NOT detect shell for numeric ID with valid data', () => {
    const activity = {
      id: '12345678',
      duration: 3600,
      distance: 45000,
      start_date: '2026-02-17T10:00:00Z',
      avgPower: 185,
      avgHeartRate: 142,
      tss: 85
    };
    
    const result = detectIntervalsShell(activity);
    
    expect(result.isShell).toBe(false);
    expect(result.stravaId).toBe('12345678');
    expect(result.reason).toBe('has_data');
  });
});

describe('Canonical Activity Resolution', () => {
  
  const testUserId = 999;
  
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM strava_tokens WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM strava_tokens WHERE user_id = ?').run(testUserId);
  });
  
  it('should create source only for shell when Strava connected', () => {
    // Set up Strava connection
    db.prepare(`
      INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, 'test_token', 'test_refresh', 9999999999, datetime('now'))
    `).run(testUserId);
    
    const activity = {
      start_time: '2026-02-17T10:00:00Z',
      duration: 0,
      distance: 0
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'intervals',
      providerId: '12345678',
      isShell: true,
      stravaId: '12345678',
      stravaConnected: true
    });
    
    expect(result.action).toBe('create_source_only');
    expect(result.reason).toBe(REASON_CODES.SHELL_DETECTED);
    expect(result.shouldEnrich).toBe(true);
    expect(result.stravaId).toBe('12345678');
  });
  
  it('should create source only (no enrich) for shell when Strava NOT connected', () => {
    const activity = {
      start_time: '2026-02-17T10:00:00Z',
      duration: 0,
      distance: 0
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'intervals',
      providerId: '12345678',
      isShell: true,
      stravaId: '12345678',
      stravaConnected: false
    });
    
    expect(result.action).toBe('create_source_only');
    expect(result.reason).toBe(REASON_CODES.STRAVA_ENRICH_SKIPPED_NOT_CONNECTED);
    expect(result.shouldEnrich).toBe(false);
  });
  
  it('should create canonical for native Intervals activity', () => {
    const activity = {
      start_time: '2026-02-17T10:00:00Z',
      duration: 3600,
      distance: 45000
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'intervals',
      providerId: 'i123456',
      isShell: false,
      stravaId: null,
      stravaConnected: false
    });
    
    expect(result.action).toBe('upsert_canonical');
    expect(result.reason).toBe('CREATED_CANONICAL_FROM_INTERVALS');
    expect(result.shouldEnrich).toBe(false);
  });
  
  it('should merge into existing canonical when Strava arrives after Intervals', () => {
    // Create existing Intervals canonical
    const activityId = 'test-activity-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s, distance_m,
        canonical_source, is_valid_for_analytics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600, 45000,
      'intervals', 1
    );
    
    // Strava activity arrives for same ride
    const activity = {
      start_time: '2026-02-17T10:01:00Z', // 1 min diff (within tolerance)
      duration: 3580, // 20s diff (within tolerance)
      distance: 45200
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'strava',
      providerId: '12345678',
      isShell: false,
      stravaId: '12345678',
      stravaConnected: true
    });
    
    expect(result.action).toBe('merge_into_existing');
    expect(result.canonicalActivityId).toBe(activityId);
    expect(result.shouldUpgrade).toBe(true); // Strava priority > Intervals
  });
  
  it('should upgrade canonical when FIT arrives after Strava', () => {
    // Create existing Strava canonical
    const activityId = 'test-activity-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s, distance_m,
        canonical_source, is_valid_for_analytics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600, 45000,
      'strava', 1
    );
    
    // FIT upload arrives for same ride
    const activity = {
      start_time: '2026-02-17T10:00:30Z', // 30s diff (within tolerance)
      duration: 3605, // 5s diff (within tolerance)
      distance: 45100
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'fit',
      providerId: 'fit-upload-123',
      isShell: false,
      stravaId: null,
      stravaConnected: true
    });
    
    expect(result.action).toBe('merge_into_existing');
    expect(result.canonicalActivityId).toBe(activityId);
    expect(result.shouldUpgrade).toBe(true); // FIT priority > Strava
  });
  
  it('should skip duplicate when same provider record already exists', () => {
    const activityId = 'test-activity-3';
    
    // Create canonical
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s,
        canonical_source, is_valid_for_analytics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600,
      'strava', 1
    );
    
    // Create source
    db.prepare(`
      INSERT INTO activity_sources (
        id, activity_id, user_id, provider, provider_id, is_shell,
        imported_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'strava:12345678', activityId, testUserId, 'strava', '12345678', 0
    );
    
    // Try to import same activity again
    const activity = {
      start_time: '2026-02-17T10:00:00Z',
      duration: 3600
    };
    
    const result = resolveCanonicalActivity({
      userId: testUserId,
      activity,
      provider: 'strava',
      providerId: '12345678',
      isShell: false,
      stravaId: '12345678',
      stravaConnected: true
    });
    
    expect(result.action).toBe('skip');
    expect(result.reason).toBe(REASON_CODES.SKIPPED_DUPLICATE);
    expect(result.canonicalActivityId).toBe(activityId);
  });
});

describe('Source Priority', () => {
  
  it('should have correct priority order: FIT > Strava > Intervals > Shell', () => {
    expect(SOURCE_PRIORITY.fit).toBeGreaterThan(SOURCE_PRIORITY.strava);
    expect(SOURCE_PRIORITY.strava).toBeGreaterThan(SOURCE_PRIORITY.intervals);
    expect(SOURCE_PRIORITY.intervals).toBeGreaterThan(SOURCE_PRIORITY.intervals_shell);
  });
});

describe('Strava Connection Check', () => {
  
  const testUserId = 998;
  
  beforeEach(() => {
    db.prepare('DELETE FROM strava_tokens WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM strava_tokens WHERE user_id = ?').run(testUserId);
  });
  
  it('should return true when Strava connected', () => {
    db.prepare(`
      INSERT INTO strava_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
      VALUES (?, 'test_token', 'test_refresh', 9999999999, datetime('now'))
    `).run(testUserId);
    
    const result = isStravaConnected(testUserId);
    
    expect(result).toBe(true);
  });
  
  it('should return false when Strava not connected', () => {
    const result = isStravaConnected(testUserId);
    
    expect(result).toBe(false);
  });
});
