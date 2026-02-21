/**
 * Import Integration Tests
 * 
 * CRITICAL: These tests verify the complete import integration:
 * - All imports go through canonical selector
 * - Strava never changes Intervals-native physiology
 * - Shell recovery uses exact Strava ID
 * - FIT upgrades physiology regardless
 * - Metadata does not churn across repeated imports
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { importActivity, enrichShellFromStrava, verifyPostImport } from '../services/activityImportOrchestrator.js';
import { verifyActivityIntegrity } from '../services/activityIntegrityGuard.js';

describe('Import Integration - Intervals Native Protection', () => {
  const testUserId = 999;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should create Intervals-native canonical with correct physiology', async () => {
    const result = await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        id: 'i-12345',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000,
        avg_power: 185,
        tss: 85
      },
      incomingType: 'intervals_native'
    });
    
    expect(result.ok).toBe(true);
    expect(result.created).toBe(true);
    
    // Verify activity created with Intervals physiology
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.activityId);
    expect(activity.physiology_source).toBe('intervals');
    expect(activity.metadata_source).toBe('intervals');
    expect(activity.avg_power).toBe(185);
    expect(activity.tss).toBe(85);
  });
  
  it('should BLOCK Strava from changing Intervals-native physiology', async () => {
    // First: Import Intervals-native
    const intervalsResult = await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        id: 'i-12345',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000,
        avg_power: 185,
        tss: 85
      },
      incomingType: 'intervals_native'
    });
    
    expect(intervalsResult.ok).toBe(true);
    const activityId = intervalsResult.activityId;
    
    // Second: Try to import Strava for same ride
    const stravaResult = await importActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        name: 'Morning Ride (Strava)',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000,
        avg_power: 200,  // Different power!
        tss: 90          // Different TSS!
      },
      incomingType: 'strava'
    });
    
    expect(stravaResult.ok).toBe(true);
    expect(stravaResult.action).toBe('attach_source_only');
    expect(stravaResult.reason).toBe('INTERVALS_NATIVE_PROTECTED');
    
    // Verify physiology UNCHANGED
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.physiology_source).toBe('intervals');
    expect(activity.avg_power).toBe(185);  // Still Intervals value!
    expect(activity.tss).toBe(85);         // Still Intervals value!
    
    // Metadata may upgrade to Strava
    expect(activity.metadata_source).toBe('strava');
  });
  
  it('should allow FIT to upgrade Intervals-native physiology', async () => {
    // First: Import Intervals-native
    const intervalsResult = await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        id: 'i-12345',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        avg_power: 185
      },
      incomingType: 'intervals_native'
    });
    
    const activityId = intervalsResult.activityId;
    
    // Second: Import FIT for same ride
    const fitResult = await importActivity({
      userId: testUserId,
      provider: 'fit',
      providerId: 'fit-12345',
      providerActivity: {
        id: 'fit-12345',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3605,
        avg_power: 190
      },
      incomingType: 'fit'
    });
    
    expect(fitResult.ok).toBe(true);
    expect(fitResult.upgraded).toBe(true);
    
    // Verify physiology UPGRADED to FIT
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.physiology_source).toBe('fit');
    expect(activity.avg_power).toBe(190);  // FIT value!
    expect(activity.duration_s).toBe(3605); // FIT value!
  });
});

describe('Import Integration - Shell Recovery', () => {
  const testUserId = 999;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should create source-only for shell activity', async () => {
    const result = await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        name: '',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 0,
        distance_m: 0
      },
      incomingType: 'intervals_shell',
      options: {
        shell_strava_id: '12345678'
      }
    });
    
    expect(result.ok).toBe(true);
    expect(result.action).toBe('source_only');
    expect(result.activityId).toBeNull();
    expect(result.shouldEnrich).toBe(true);
    
    // Verify source created
    const source = db.prepare(`
      SELECT * FROM activity_sources 
      WHERE user_id = ? AND provider_id = ?
    `).get(testUserId, '12345678');
    
    expect(source).toBeTruthy();
    expect(source.is_shell).toBe(1);
    expect(source.shell_strava_id).toBe('12345678');
    expect(source.activity_id).toBeNull();
  });
  
  it('should enrich shell using EXACT Strava ID match', async () => {
    // First: Create shell
    await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 0
      },
      incomingType: 'intervals_shell',
      options: {
        shell_strava_id: '12345678'
      }
    });
    
    // Second: Enrich from Strava
    const enrichResult = await enrichShellFromStrava(
      testUserId,
      '12345678',
      {
        id: '12345678',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000,
        avg_power: 200
      }
    );
    
    expect(enrichResult.ok).toBe(true);
    expect(enrichResult.created).toBe(true);
    expect(enrichResult.action).toBe('shell_enriched');
    
    // Verify canonical created from Strava
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(enrichResult.activityId);
    expect(activity.physiology_source).toBe('strava');
    expect(activity.is_shell).toBe(0);
    expect(activity.is_valid_for_analytics).toBe(1);
    expect(activity.avg_power).toBe(200);
  });
  
  it('should NOT use fuzzy matching for shell enrichment', async () => {
    // Create shell with one time
    await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 0
      },
      incomingType: 'intervals_shell',
      options: {
        shell_strava_id: '12345678'
      }
    });
    
    // Try to enrich with DIFFERENT Strava ID but similar time
    const enrichResult = await enrichShellFromStrava(
      testUserId,
      '87654321',  // Different ID!
      {
        id: '87654321',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:02:00Z',  // 2 min later
        duration_s: 3600,
        avg_power: 200
      }
    );
    
    // Should create NEW activity, not link to shell
    expect(enrichResult.ok).toBe(true);
    expect(enrichResult.created).toBe(true);
    
    // Verify shell still has no canonical
    const shell = db.prepare(`
      SELECT * FROM activity_sources 
      WHERE user_id = ? AND provider_id = ?
    `).get(testUserId, '12345678');
    
    expect(shell.activity_id).toBeNull();
  });
});

describe('Import Integration - Metadata Stability', () => {
  const testUserId = 999;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should not churn metadata on repeated imports', async () => {
    // First import
    const result1 = await importActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600
      },
      incomingType: 'strava'
    });
    
    const activityId = result1.activityId;
    const activity1 = db.prepare('SELECT updated_at FROM activities WHERE id = ?').get(activityId);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Second import (same data)
    const result2 = await importActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600
      },
      incomingType: 'strava'
    });
    
    expect(result2.ok).toBe(true);
    expect(result2.action).toBe('attach_source_only');
    
    // Verify updated_at did NOT change (no churn)
    const activity2 = db.prepare('SELECT updated_at FROM activities WHERE id = ?').get(activityId);
    expect(activity2.updated_at).toBe(activity1.updated_at);
  });
});

describe('Import Integration - FIT Matching', () => {
  const testUserId = 999;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should match FIT with tighter tolerances (±3min, ±15%)', async () => {
    // First: Import Strava
    const stravaResult = await importActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        name: 'Morning Ride',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600,
        distance_m: 45000
      },
      incomingType: 'strava'
    });
    
    const activityId = stravaResult.activityId;
    
    // Second: Import FIT within tolerances
    const fitResult = await importActivity({
      userId: testUserId,
      provider: 'fit',
      providerId: 'fit-12345',
      providerActivity: {
        id: 'fit-12345',
        start_time: '2026-02-17T10:02:00Z',  // +2 min (within ±3)
        duration_s: 3700,                     // +100s = +2.8% (within ±15%)
        distance_m: 46000                     // +1000m = +2.2% (within ±15%)
      },
      incomingType: 'fit'
    });
    
    expect(fitResult.ok).toBe(true);
    expect(fitResult.activityId).toBe(activityId);
    expect(fitResult.upgraded).toBe(true);
    
    // Verify physiology upgraded to FIT
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    expect(activity.physiology_source).toBe('fit');
    expect(activity.duration_s).toBe(3700);
  });
  
  it('should NOT match FIT outside tolerances', async () => {
    // First: Import Strava
    await importActivity({
      userId: testUserId,
      provider: 'strava',
      providerId: '12345678',
      providerActivity: {
        id: '12345678',
        start_time: '2026-02-17T10:00:00Z',
        duration_s: 3600
      },
      incomingType: 'strava'
    });
    
    // Second: Import FIT OUTSIDE tolerances
    const fitResult = await importActivity({
      userId: testUserId,
      provider: 'fit',
      providerId: 'fit-12345',
      providerActivity: {
        id: 'fit-12345',
        start_time: '2026-02-17T10:05:00Z',  // +5 min (outside ±3)
        duration_s: 3600
      },
      incomingType: 'fit'
    });
    
    expect(fitResult.ok).toBe(true);
    expect(fitResult.created).toBe(true);  // Created NEW activity
    
    // Verify two separate activities exist
    const activities = db.prepare(`
      SELECT COUNT(*) as count FROM activities WHERE user_id = ?
    `).get(testUserId);
    
    expect(activities.count).toBe(2);
  });
});

describe('Import Integration - Post-Import Verification', () => {
  const testUserId = 999;
  
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
    db.prepare('DELETE FROM activity_sources WHERE user_id = ?').run(testUserId);
  });
  
  it('should pass integrity verification after valid import', async () => {
    await importActivity({
      userId: testUserId,
      provider: 'intervals',
      providerId: 'i-12345',
      providerActivity: {
        id: 'i-12345',
        name: 'Morning Ride',
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
    // Manually create invalid activity (bypass orchestrator for test)
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
