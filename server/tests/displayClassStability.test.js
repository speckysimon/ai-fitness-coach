/**
 * Display Class Stability Tests
 * 
 * CRITICAL: These tests lock the canonical display classes used by the UI.
 * Any refactoring MUST NOT change the output of display class functions.
 * 
 * Purpose:
 * - Ensure display classes remain stable across refactoring
 * - Prevent UI behavior changes from internal data model changes
 * - Verify shell activities don't leak into analytics
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  getDisplaySource,
  isValidForAnalytics,
  getActivityTypeClass,
  getDataQualityClass,
  getRideIntensityClass,
  shouldHideFromMainViews,
  mapToDisplayClass,
  getDisplayClassCounts
} from '../services/activityDisplayClassAdapter.js';

describe('Display Source Mapping', () => {
  
  it('should map strava to strava', () => {
    const activity = { primary_source: 'strava' };
    expect(getDisplaySource(activity)).toBe('strava');
  });
  
  it('should map intervals to intervals', () => {
    const activity = { primary_source: 'intervals' };
    expect(getDisplaySource(activity)).toBe('intervals');
  });
  
  it('should map manual to manual', () => {
    const activity = { primary_source: 'manual' };
    expect(getDisplaySource(activity)).toBe('manual');
  });
  
  it('should map fit_upload to fit', () => {
    const activity = { primary_source: 'fit_upload' };
    expect(getDisplaySource(activity)).toBe('fit');
  });
  
  it('should fallback to canonical_source if primary_source missing', () => {
    const activity = { canonical_source: 'strava' };
    expect(getDisplaySource(activity)).toBe('strava');
  });
  
  it('should return unknown for missing source', () => {
    const activity = {};
    expect(getDisplaySource(activity)).toBe('unknown');
  });
});

describe('Analytics Validity', () => {
  
  it('should mark shell activities as invalid', () => {
    const activity = {
      is_shell: 1,
      duration_s: 0,
      start_time: '2026-02-17T10:00:00Z',
      name: 'Shell Activity'
    };
    expect(isValidForAnalytics(activity)).toBe(false);
  });
  
  it('should mark activities with no duration as invalid', () => {
    const activity = {
      is_shell: 0,
      duration_s: 0,
      start_time: '2026-02-17T10:00:00Z',
      name: 'No Duration'
    };
    expect(isValidForAnalytics(activity)).toBe(false);
  });
  
  it('should mark valid activities as valid', () => {
    const activity = {
      is_shell: 0,
      is_valid_for_analytics: 1,
      duration_s: 3600,
      start_time: '2026-02-17T10:00:00Z',
      name: 'Morning Ride'
    };
    expect(isValidForAnalytics(activity)).toBe(true);
  });
  
  it('should use is_valid_for_analytics field when present', () => {
    const activity = {
      is_valid_for_analytics: 0,
      duration_s: 3600,
      start_time: '2026-02-17T10:00:00Z',
      name: 'Marked Invalid'
    };
    expect(isValidForAnalytics(activity)).toBe(false);
  });
});

describe('Activity Type Classification', () => {
  
  it('should classify cycling activities', () => {
    expect(getActivityTypeClass({ sport: 'cycling' })).toBe('cycling');
    expect(getActivityTypeClass({ type: 'Ride' })).toBe('cycling');
    expect(getActivityTypeClass({ type: 'VirtualRide' })).toBe('cycling');
  });
  
  it('should classify running activities', () => {
    expect(getActivityTypeClass({ sport: 'running' })).toBe('running');
    expect(getActivityTypeClass({ type: 'Run' })).toBe('running');
  });
  
  it('should classify swimming activities', () => {
    expect(getActivityTypeClass({ sport: 'swimming' })).toBe('swimming');
    expect(getActivityTypeClass({ type: 'Swim' })).toBe('swimming');
  });
  
  it('should classify other activities', () => {
    expect(getActivityTypeClass({ sport: 'yoga' })).toBe('other');
    expect(getActivityTypeClass({ type: 'Workout' })).toBe('other');
  });
});

describe('Data Quality Classification', () => {
  
  it('should detect high quality data (power + HR + streams)', () => {
    const activity = {
      has_power: 1,
      avg_power: 185,
      avg_hr: 142,
      raw_json: JSON.stringify({ streams: { watts: [], heartrate: [] } })
    };
    const quality = getDataQualityClass(activity);
    expect(quality.hasPower).toBe(true);
    expect(quality.hasHR).toBe(true);
    expect(quality.hasStreams).toBe(true);
    expect(quality.quality).toBe('high');
  });
  
  it('should detect medium quality data (power or HR)', () => {
    const activity = {
      has_power: 1,
      avg_power: 185,
      avg_hr: 0
    };
    const quality = getDataQualityClass(activity);
    expect(quality.hasPower).toBe(true);
    expect(quality.hasHR).toBe(false);
    expect(quality.quality).toBe('medium');
  });
  
  it('should detect low quality data (no power or HR)', () => {
    const activity = {
      has_power: 0,
      avg_power: 0,
      avg_hr: 0
    };
    const quality = getDataQualityClass(activity);
    expect(quality.hasPower).toBe(false);
    expect(quality.hasHR).toBe(false);
    expect(quality.quality).toBe('low');
  });
});

describe('Ride Intensity Classification', () => {
  
  it('should classify recovery rides', () => {
    const activity = { tss: 30, duration_s: 3600 }; // IF ~0.55
    expect(getRideIntensityClass(activity)).toBe('recovery');
  });
  
  it('should classify endurance rides', () => {
    const activity = { tss: 60, duration_s: 3600 }; // IF ~0.77
    expect(getRideIntensityClass(activity)).toBe('endurance');
  });
  
  it('should classify tempo rides', () => {
    const activity = { tss: 85, duration_s: 3600 }; // IF ~0.92
    expect(getRideIntensityClass(activity)).toBe('tempo');
  });
  
  it('should classify threshold rides', () => {
    const activity = { tss: 100, duration_s: 3600 }; // IF ~1.0
    expect(getRideIntensityClass(activity)).toBe('threshold');
  });
  
  it('should return unknown for zero duration', () => {
    const activity = { tss: 100, duration_s: 0 };
    expect(getRideIntensityClass(activity)).toBe('unknown');
  });
});

describe('Hide from Main Views', () => {
  
  it('should hide unenriched shells', () => {
    const activity = {
      is_shell: 1,
      is_valid_for_analytics: 0,
      duration_s: 0
    };
    expect(shouldHideFromMainViews(activity)).toBe(true);
  });
  
  it('should hide activities with no duration', () => {
    const activity = {
      is_shell: 0,
      duration_s: 0
    };
    expect(shouldHideFromMainViews(activity)).toBe(true);
  });
  
  it('should NOT hide valid activities', () => {
    const activity = {
      is_shell: 0,
      is_valid_for_analytics: 1,
      duration_s: 3600
    };
    expect(shouldHideFromMainViews(activity)).toBe(false);
  });
});

describe('Full Display Class Mapping', () => {
  
  it('should map complete activity to display class', () => {
    const activity = {
      primary_source: 'intervals',
      canonical_source: 'intervals',
      is_shell: 0,
      is_valid_for_analytics: 1,
      sport: 'cycling',
      type: 'Ride',
      duration_s: 3600,
      tss: 85,
      has_power: 1,
      avg_power: 185,
      avg_hr: 142,
      start_time: '2026-02-17T10:00:00Z',
      name: 'Morning Ride'
    };
    
    const displayClass = mapToDisplayClass(activity);
    
    expect(displayClass.source).toBe('intervals');
    expect(displayClass.isValid).toBe(true);
    expect(displayClass.typeClass).toBe('cycling');
    expect(displayClass.intensityClass).toBe('tempo');
    expect(displayClass.dataQuality.quality).toBe('medium');
    expect(displayClass.hideFromMain).toBe(false);
    expect(displayClass.isShell).toBe(false);
  });
  
  it('should map shell activity to display class', () => {
    const activity = {
      primary_source: 'intervals',
      is_shell: 1,
      is_valid_for_analytics: 0,
      duration_s: 0,
      shell_reason: 'missing_core_fields'
    };
    
    const displayClass = mapToDisplayClass(activity);
    
    expect(displayClass.source).toBe('intervals');
    expect(displayClass.isValid).toBe(false);
    expect(displayClass.hideFromMain).toBe(true);
    expect(displayClass.isShell).toBe(true);
  });
});

describe('Display Class Counts', () => {
  
  it('should count activities by display class', () => {
    const activities = [
      {
        primary_source: 'intervals',
        is_valid_for_analytics: 1,
        sport: 'cycling',
        duration_s: 3600,
        tss: 85,
        has_power: 1,
        avg_power: 185,
        avg_hr: 142
      },
      {
        primary_source: 'strava',
        is_valid_for_analytics: 1,
        sport: 'running',
        duration_s: 2400,
        tss: 60,
        has_power: 0,
        avg_hr: 155
      },
      {
        primary_source: 'intervals',
        is_shell: 1,
        is_valid_for_analytics: 0,
        duration_s: 0
      }
    ];
    
    const counts = getDisplayClassCounts(activities);
    
    expect(counts.total).toBe(3);
    expect(counts.valid).toBe(2);
    expect(counts.hidden).toBe(1);
    expect(counts.bySource.intervals).toBe(2);
    expect(counts.bySource.strava).toBe(1);
    expect(counts.byType.cycling).toBe(1);
    expect(counts.byType.running).toBe(1);
  });
});

describe('Display Class Stability After Refactoring', () => {
  
  const testUserId = 997;
  
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(testUserId);
  });
  
  it('should maintain display classes when internal flags change', () => {
    // Create activity with old schema (no canonical_source, no is_valid_for_analytics)
    const activityId = 'test-stability-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s, distance_m,
        primary_source, is_shell, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600, 45000,
      'intervals', 0
    );
    
    // Get display class before adding new fields
    const activityBefore = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    const displayClassBefore = mapToDisplayClass(activityBefore);
    
    // Simulate refactoring: add new internal fields
    db.prepare(`
      UPDATE activities 
      SET canonical_source = 'intervals',
          is_valid_for_analytics = 1
      WHERE id = ?
    `).run(activityId);
    
    // Get display class after adding new fields
    const activityAfter = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    const displayClassAfter = mapToDisplayClass(activityAfter);
    
    // Display classes should be identical
    expect(displayClassAfter.source).toBe(displayClassBefore.source);
    expect(displayClassAfter.isValid).toBe(displayClassBefore.isValid);
    expect(displayClassAfter.typeClass).toBe(displayClassBefore.typeClass);
    expect(displayClassAfter.hideFromMain).toBe(displayClassBefore.hideFromMain);
  });
  
  it('should not change display class when Strava attaches to Intervals-native', () => {
    // Create Intervals-native canonical
    const activityId = 'test-stability-2';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, sport, type, start_time, duration_s,
        primary_source, canonical_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, testUserId, 'Morning Ride', 'cycling', 'Ride',
      '2026-02-17T10:00:00Z', 3600,
      'intervals', 'intervals', 1
    );
    
    // Get display class before Strava attachment
    const activityBefore = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    const displayClassBefore = mapToDisplayClass(activityBefore);
    
    // Simulate Strava attachment (add source record, but don't change canonical)
    db.prepare(`
      INSERT INTO activity_sources (
        id, activity_id, user_id, provider, provider_id,
        imported_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('strava:12345678', activityId, testUserId, 'strava', '12345678');
    
    // Get display class after Strava attachment
    const activityAfter = db.prepare('SELECT * FROM activities WHERE id = ?').get(activityId);
    const displayClassAfter = mapToDisplayClass(activityAfter);
    
    // Display class should NOT change (still shows as intervals)
    expect(displayClassAfter.source).toBe(displayClassBefore.source);
    expect(displayClassAfter.source).toBe('intervals');
    expect(displayClassAfter.isValid).toBe(displayClassBefore.isValid);
  });
});

describe('Shell Activity Display Class Behavior', () => {
  
  it('should never show shells as valid for analytics', () => {
    const shell = {
      is_shell: 1,
      duration_s: 0,
      distance_m: 0,
      shell_reason: 'missing_core_fields'
    };
    
    const displayClass = mapToDisplayClass(shell);
    
    expect(displayClass.isValid).toBe(false);
    expect(displayClass.hideFromMain).toBe(true);
  });
  
  it('should show enriched shells as valid after enrichment', () => {
    const enrichedShell = {
      is_shell: 0, // No longer a shell after enrichment
      is_valid_for_analytics: 1,
      duration_s: 3600,
      distance_m: 45000,
      canonical_source: 'strava', // Enriched from Strava
      primary_source: 'strava'
    };
    
    const displayClass = mapToDisplayClass(enrichedShell);
    
    expect(displayClass.isValid).toBe(true);
    expect(displayClass.hideFromMain).toBe(false);
    expect(displayClass.source).toBe('strava');
  });
});
