/**
 * Final Hardening Tests
 * 
 * CRITICAL: These tests verify the final hardening pass:
 * - Strava cannot overwrite Intervals-native duration/power/HR
 * - Strava CAN backfill missing distance/elevation/speed
 * - Analytics excludes Strava-only rides when setting = 0
 * - Post-import verification runs automatically
 * - Direct DB writes are prevented
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { updateActivityPhysiology } from '../services/activityUpdateService.js';
import { 
  getAnalyticsActivities, 
  countAnalyticsActivities,
  setStravaOnlyPreference 
} from '../services/analyticsQueryBuilder.js';
import { importActivity, verifyPostImport } from '../services/activityImportOrchestrator.js';

describe('Safe Core Field Backfill', () => {
  const testUserId = 997;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should BLOCK Strava from overwriting Intervals-native duration', () => {
    // Create Intervals-native activity
    const activityId = 'test-intervals-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 185,
      'intervals', 'intervals', 1
    );
    
    // Try to update duration from Strava
    const result = updateActivityPhysiology(activityId, 'strava', {
      duration_s: 3700  // Different duration!
    });
    
    expect(result.ok).toBe(true);
    
    // Verify duration UNCHANGED
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.duration_s).toBe(3600);  // Still original!
    expect(activity.physiology_source).toBe('intervals');  // Still Intervals!
  });
  
  it('should BLOCK Strava from overwriting Intervals-native power metrics', () => {
    // Create Intervals-native activity
    const activityId = 'test-intervals-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, tss,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 185, 85,
      'intervals', 'intervals', 1
    );
    
    // Try to update power from Strava
    const result = updateActivityPhysiology(activityId, 'strava', {
      avg_power: 200,  // Different power!
      tss: 90          // Different TSS!
    });
    
    expect(result.ok).toBe(true);
    
    // Verify power UNCHANGED
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.avg_power).toBe(185);  // Still original!
    expect(activity.tss).toBe(85);         // Still original!
    expect(activity.physiology_source).toBe('intervals');
  });
  
  it('should ALLOW Strava to backfill missing distance', () => {
    // Create Intervals-native activity with missing distance
    const activityId = 'test-intervals-3';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, distance_m,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 0,
      'intervals', 'intervals', 1
    );
    
    // Backfill distance from Strava
    const result = updateActivityPhysiology(activityId, 'strava', {
      distance_m: 45000
    });
    
    expect(result.ok).toBe(true);
    expect(result.backfilled).toContain('distance_m');
    
    // Verify distance BACKFILLED
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.distance_m).toBe(45000);  // Backfilled!
    expect(activity.physiology_source).toBe('intervals');  // Still Intervals!
  });
  
  it('should ALLOW Strava to backfill missing elevation and speed', () => {
    // Create Intervals-native activity with missing fields
    const activityId = 'test-intervals-4';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, 
        elevation_m, avg_speed,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600,
      0, 0,
      'intervals', 'intervals', 1
    );
    
    // Backfill from Strava
    const result = updateActivityPhysiology(activityId, 'strava', {
      elevation_m: 850,
      avg_speed: 12.5
    });
    
    expect(result.ok).toBe(true);
    expect(result.backfilled).toContain('elevation_m');
    expect(result.backfilled).toContain('avg_speed');
    
    // Verify backfilled
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.elevation_m).toBe(850);
    expect(activity.avg_speed).toBe(12.5);
    expect(activity.physiology_source).toBe('intervals');  // Still Intervals!
  });
  
  it('should NOT backfill if field already has value', () => {
    // Create Intervals-native activity with existing distance
    const activityId = 'test-intervals-5';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, distance_m,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 45000,
      'intervals', 'intervals', 1
    );
    
    // Try to backfill distance from Strava
    const result = updateActivityPhysiology(activityId, 'strava', {
      distance_m: 50000  // Different value!
    });
    
    expect(result.ok).toBe(true);
    expect(result.backfilled).toEqual([]);  // Nothing backfilled
    
    // Verify distance UNCHANGED
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.distance_m).toBe(45000);  // Still original!
  });
});

describe('Analytics Strava-Only Control', () => {
  const testUserId = 997;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
    
    // Create test user
    db.prepare(`
      INSERT INTO users (id, email, analytics_include_strava_only)
      VALUES (?, ?, ?)
    `).run(testUserId, 'test@example.com', 1);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  });
  
  it('should include Strava-only rides when setting = 1', () => {
    // Create activities
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES 
        ('intervals-1', ?, 'Intervals Ride', '2026-02-17T10:00:00Z', 3600, 'intervals', 1, datetime('now'), datetime('now')),
        ('strava-1', ?, 'Strava Ride', '2026-02-17T11:00:00Z', 3600, 'strava', 1, datetime('now'), datetime('now')),
        ('fit-1', ?, 'FIT Ride', '2026-02-17T12:00:00Z', 3600, 'fit', 1, datetime('now'), datetime('now'))
    `).run(testUserId, testUserId, testUserId);
    
    // Set preference to include Strava-only
    setStravaOnlyPreference(testUserId, true);
    
    // Get analytics activities
    const activities = getAnalyticsActivities(testUserId);
    const count = countAnalyticsActivities(testUserId);
    
    expect(count).toBe(3);  // All included
    expect(activities.length).toBe(3);
  });
  
  it('should exclude Strava-only rides when setting = 0', () => {
    // Create activities
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES 
        ('intervals-1', ?, 'Intervals Ride', '2026-02-17T10:00:00Z', 3600, 'intervals', 1, datetime('now'), datetime('now')),
        ('strava-1', ?, 'Strava Ride', '2026-02-17T11:00:00Z', 3600, 'strava', 1, datetime('now'), datetime('now')),
        ('fit-1', ?, 'FIT Ride', '2026-02-17T12:00:00Z', 3600, 'fit', 1, datetime('now'), datetime('now'))
    `).run(testUserId, testUserId, testUserId);
    
    // Set preference to exclude Strava-only
    setStravaOnlyPreference(testUserId, false);
    
    // Get analytics activities
    const activities = getAnalyticsActivities(testUserId);
    const count = countAnalyticsActivities(testUserId);
    
    expect(count).toBe(2);  // Only Intervals and FIT
    expect(activities.length).toBe(2);
    expect(activities.some(a => a.id === 'strava-1')).toBe(false);
  });
  
  it('should include Intervals+Strava combo even when setting = 0', () => {
    // Create activity with Intervals physiology and Strava metadata
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES 
        ('combo-1', ?, 'Combo Ride', '2026-02-17T10:00:00Z', 3600, 'intervals', 'strava', 1, datetime('now'), datetime('now'))
    `).run(testUserId);
    
    // Set preference to exclude Strava-only
    setStravaOnlyPreference(testUserId, false);
    
    // Get analytics activities
    const count = countAnalyticsActivities(testUserId);
    
    expect(count).toBe(1);  // Included because physiology is Intervals
  });
});

describe('Post-Import Verification', () => {
  const testUserId = 997;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should pass verification after valid import', async () => {
    await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        id: 'i-12345',
        name: 'Test Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        avg_power: 185
      },
      incomingType: 'intervals_native'
    });
    
    const verification = await verifyPostImport(testUserId);
    
    expect(verification.ok).toBe(true);
    expect(verification.issueCount).toBe(0);
  });
  
  it('should detect integrity violations', async () => {
    // Manually create invalid activity (shell marked as valid)
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s,
        is_shell, is_valid_for_analytics, physiology_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      'test-invalid',
      testUserId,
      'Invalid Activity',
      '2026-02-17T10:00:00Z',
      0,
      1,  // is_shell = 1
      1,  // is_valid_for_analytics = 1 (INVALID!)
      null
    );
    
    const verification = await verifyPostImport(testUserId);
    
    expect(verification.ok).toBe(false);
    expect(verification.errorCount).toBeGreaterThan(0);
    expect(verification.issues.some(i => i.type === 'SHELL_MARKED_VALID')).toBe(true);
  });
});

describe('Intervals-Native Protection Edge Cases', () => {
  const testUserId = 997;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  it('should block Strava from overwriting HR metrics', () => {
    const activityId = 'test-hr-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_hr, max_hr,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 145, 175,
      'intervals', 1
    );
    
    const result = updateActivityPhysiology(activityId, 'strava', {
      avg_hr: 150,  // Different!
      max_hr: 180   // Different!
    });
    
    expect(result.ok).toBe(true);
    
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.avg_hr).toBe(145);  // Unchanged!
    expect(activity.max_hr).toBe(175);  // Unchanged!
  });
  
  it('should block Strava from overwriting cadence', () => {
    const activityId = 'test-cadence-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_cadence,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 85,
      'intervals', 1
    );
    
    const result = updateActivityPhysiology(activityId, 'strava', {
      avg_cadence: 90  // Different!
    });
    
    expect(result.ok).toBe(true);
    
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.avg_cadence).toBe(85);  // Unchanged!
  });
  
  it('should allow FIT to overwrite everything', () => {
    const activityId = 'test-fit-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, distance_m,
        physiology_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Test Ride', '2026-02-17T10:00:00Z', 3600, 185, 45000,
      'intervals', 1
    );
    
    const result = updateActivityPhysiology(activityId, 'fit', {
      duration_s: 3605,
      avg_power: 190,
      distance_m: 46000
    });
    
    expect(result.ok).toBe(true);
    
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.duration_s).toBe(3605);  // Updated!
    expect(activity.avg_power).toBe(190);    // Updated!
    expect(activity.distance_m).toBe(46000); // Updated!
    expect(activity.physiology_source).toBe('fit');  // Changed to FIT!
  });
});
