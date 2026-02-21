/**
 * Canonical Streams Tests
 * 
 * Tests for stream storage, retrieval, compression, and integration.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import {
  encodeStreamArray,
  decodeStreamArray,
  detectGaps,
  calculateCompleteness,
  validateStream
} from '../services/streamCodec.js';

import {
  upsertCanonicalStreams,
  getCanonicalStreams,
  hasCanonicalStreams,
  getStreamStatistics,
  deleteStreamsForUser
} from '../services/canonicalStreamService.js';

import {
  extractStreams,
  extractIntervalsStreams,
  extractStravaStreams
} from '../services/streamExtractor.js';

const TEST_USER_ID = 998;

describe('Stream Codec - Encoding/Decoding', () => {
  it('should encode and decode small arrays as JSON', async () => {
    const original = [100, 150, 200, 180, 160];
    
    const { data, format } = await encodeStreamArray(original);
    
    expect(format).toBe('json');
    expect(data).toBe(JSON.stringify(original));
    
    const decoded = await decodeStreamArray(data, format);
    expect(decoded).toEqual(original);
  });
  
  it('should encode and decode large arrays with compression', async () => {
    // Create large array (>1KB when JSON-stringified)
    const original = Array(1000).fill(0).map((_, i) => 150 + Math.sin(i / 10) * 50);
    
    const { data, format } = await encodeStreamArray(original);
    
    expect(format).toBe('json_gzip_base64');
    expect(data).not.toBe(JSON.stringify(original)); // Should be compressed
    
    const decoded = await decodeStreamArray(data, format);
    expect(decoded).toEqual(original);
  });
  
  it('should handle null/empty arrays', async () => {
    const { data, format } = await encodeStreamArray(null);
    expect(data).toBeNull();
    expect(format).toBe('json');
    
    const decoded = await decodeStreamArray(null);
    expect(decoded).toBeNull();
  });
  
  it('should handle arrays with null values', async () => {
    const original = [100, null, 200, null, 150];
    
    const { data, format } = await encodeStreamArray(original);
    const decoded = await decodeStreamArray(data, format);
    
    expect(decoded).toEqual(original);
  });
});

describe('Stream Codec - Gap Detection', () => {
  it('should detect no gaps in continuous data', () => {
    const time_s = [0, 1, 2, 3, 4, 5];
    
    const gaps = detectGaps(time_s, 1);
    
    expect(gaps.hasGaps).toBe(false);
    expect(gaps.gapCount).toBe(0);
  });
  
  it('should detect gaps in time series', () => {
    const time_s = [0, 1, 2, 5, 6, 10]; // Gaps at 2->5 and 6->10
    
    const gaps = detectGaps(time_s, 1);
    
    expect(gaps.hasGaps).toBe(true);
    expect(gaps.gapCount).toBe(2);
    expect(gaps.largestGap).toBe(4);
    expect(gaps.totalMissingSamples).toBe(5); // 2 + 3
  });
  
  it('should handle irregular sampling', () => {
    const time_s = [0, 0.5, 1, 1.5, 2]; // 0.5s intervals
    
    const gaps = detectGaps(time_s, 0.5);
    
    expect(gaps.hasGaps).toBe(false);
  });
});

describe('Stream Codec - Validation', () => {
  it('should validate power stream', () => {
    const power = [150, 180, 200, 190, 160];
    
    const result = validateStream(power, {
      minValue: 0,
      maxValue: 2000,
      name: 'power'
    });
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.stats.minValue).toBe(150);
    expect(result.stats.maxValue).toBe(200);
  });
  
  it('should warn about high null percentage', () => {
    const power = [150, null, null, null, null, 160];
    
    const result = validateStream(power, { name: 'power' });
    
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('null values');
  });
  
  it('should detect invalid values', () => {
    const power = [150, 'invalid', 200, NaN, 160];
    
    const result = validateStream(power, { name: 'power' });
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Canonical Stream Service - Storage', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    // Create test user
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should store and retrieve streams', async () => {
    const activityId = 'test:stream-1';
    
    // Create activity
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Stream Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Store streams
    const streams = {
      power: [150, 180, 200, 190, 160],
      hr: [140, 150, 160, 155, 145],
      cadence: [80, 85, 90, 88, 82],
      time_s: [0, 1, 2, 3, 4]
    };
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      streams
    );
    
    expect(result.ok).toBe(true);
    expect(result.source).toBe('intervals');
    
    // Retrieve streams
    const retrieved = await getCanonicalStreams(TEST_USER_ID, activityId);
    
    expect(retrieved).not.toBeNull();
    expect(retrieved.power).toEqual(streams.power);
    expect(retrieved.hr).toEqual(streams.hr);
    expect(retrieved.cadence).toEqual(streams.cadence);
    expect(retrieved.meta.source).toBe('intervals');
  });
  
  it('should enforce physiology_source rule - Strava cannot overwrite Intervals', async () => {
    const activityId = 'test:stream-2';
    
    // Create activity with Intervals as physiology source
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Source Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Try to store streams from Strava (should be rejected)
    const streams = {
      power: [150, 180, 200],
      hr: [140, 150, 160],
      time_s: [0, 1, 2]
    };
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals', // physiology_source
      'strava', // incoming provider
      streams
    );
    
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('PHYSIOLOGY_SOURCE_MISMATCH');
    expect(result.incomingProvider).toBe('strava');
    expect(result.physiologySource).toBe('intervals');
    
    // Verify no streams were stored
    const retrieved = await getCanonicalStreams(TEST_USER_ID, activityId);
    expect(retrieved).toBeNull();
  });
  
  it('should allow FIT to overwrite when physiology_source upgraded to fit', async () => {
    const activityId = 'test:stream-upgrade';
    
    // Create activity with Intervals as initial physiology source
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Upgrade Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Store initial Intervals streams
    const intervalsStreams = {
      power: [150, 180, 200],
      hr: [140, 150, 160],
      time_s: [0, 1, 2]
    };
    
    await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      'intervals',
      intervalsStreams
    );
    
    // Upgrade physiology_source to FIT
    db.prepare(`
      UPDATE activities
      SET physiology_source = 'fit'
      WHERE id = ?
    `).run(activityId);
    
    // Now FIT can overwrite streams
    const fitStreams = {
      power: [160, 190, 210],
      hr: [145, 155, 165],
      cadence: [85, 90, 95],
      time_s: [0, 1, 2]
    };
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'fit', // physiology_source
      'garmin_fit', // incoming provider (maps to 'fit')
      fitStreams
    );
    
    expect(result.ok).toBe(true);
    expect(result.source).toBe('garmin_fit');
    
    // Verify FIT streams were stored
    const retrieved = await getCanonicalStreams(TEST_USER_ID, activityId);
    expect(retrieved).not.toBeNull();
    expect(retrieved.power).toEqual([160, 190, 210]);
    expect(retrieved.cadence).toEqual([85, 90, 95]);
    expect(retrieved.meta.source).toBe('garmin_fit');
  });
  
  it('should reject streams without time_s', async () => {
    const activityId = 'test:no-time';
    
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'No Time Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Try to store streams without time_s (should be rejected)
    const streams = {
      power: [150, 180, 200],
      hr: [140, 150, 160]
      // time_s is missing!
    };
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      'intervals',
      streams
    );
    
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('TIME_S_REQUIRED');
    
    // Verify no streams were stored
    const retrieved = await getCanonicalStreams(TEST_USER_ID, activityId);
    expect(retrieved).toBeNull();
  });
  
  it('should handle compression for large streams', async () => {
    const activityId = 'test:stream-3';
    
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Large Stream', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Create large stream (3600 samples = 1 hour at 1Hz)
    const power = Array(3600).fill(0).map((_, i) => 150 + Math.sin(i / 100) * 50);
    const hr = Array(3600).fill(0).map((_, i) => 140 + Math.sin(i / 120) * 20);
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      { power, hr }
    );
    
    expect(result.ok).toBe(true);
    expect(result.streamFormat).toBe('json_gzip_base64');
    
    // Verify retrieval
    const retrieved = await getCanonicalStreams(TEST_USER_ID, activityId);
    expect(retrieved.power).toEqual(power);
    expect(retrieved.hr).toEqual(hr);
  });
  
  it('should calculate completeness metrics', async () => {
    const activityId = 'test:stream-4';
    
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Completeness Test', '2026-02-17T10:00:00Z',
      100, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Partial streams (50% complete)
    const power = Array(50).fill(180);
    const hr = Array(50).fill(150);
    
    const result = await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      { power, hr }
    );
    
    expect(result.ok).toBe(true);
    expect(result.flags.completeness.power).toBeCloseTo(50, 0);
    expect(result.flags.completeness.hr).toBeCloseTo(50, 0);
  });
});

describe('Canonical Stream Service - Queries', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should check if streams exist', async () => {
    const activityId = 'test:exists';
    
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Exists Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    expect(hasCanonicalStreams(TEST_USER_ID, activityId)).toBe(false);
    
    await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      { power: [150, 180, 200] }
    );
    
    expect(hasCanonicalStreams(TEST_USER_ID, activityId)).toBe(true);
  });
  
  it('should get stream statistics', async () => {
    // Create multiple activities with streams
    for (let i = 1; i <= 3; i++) {
      const activityId = `test:stats-${i}`;
      
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          physiology_source, metadata_source, is_valid_for_analytics,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, `Activity ${i}`, `2026-02-${10 + i}T10:00:00Z`,
        3600, 185, 1, 'intervals', 'intervals', 1
      );
      
      await upsertCanonicalStreams(
        TEST_USER_ID,
        activityId,
        'intervals',
        {
          power: [150, 180, 200],
          hr: [140, 150, 160]
        }
      );
    }
    
    const stats = getStreamStatistics(TEST_USER_ID);
    
    expect(stats.total).toBe(3);
    expect(stats.bySource.intervals).toBe(3);
    expect(stats.streamTypes.power).toBe(3);
    expect(stats.streamTypes.hr).toBe(3);
  });
  
  it('should delete streams', async () => {
    const activityId = 'test:delete';
    
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Delete Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      { power: [150, 180, 200] }
    );
    
    expect(hasCanonicalStreams(TEST_USER_ID, activityId)).toBe(true);
    
    const result = deleteStreamsForUser(TEST_USER_ID, { activityId });
    
    expect(result.ok).toBe(true);
    expect(result.deleted).toBe(1);
    expect(hasCanonicalStreams(TEST_USER_ID, activityId)).toBe(false);
  });
});

describe('Stream Extractor', () => {
  it('should extract Intervals streams with time_s', () => {
    const intervalsActivity = {
      _raw: {
        streams: [
          { type: 'watts', data: [150, 180, 200] },
          { type: 'heartrate', data: [140, 150, 160] },
          { type: 'cadence', data: [80, 85, 90] },
          { type: 'time', data: [0, 1, 2] }
        ]
      }
    };
    
    const streams = extractIntervalsStreams(intervalsActivity);
    
    expect(streams).not.toBeNull();
    expect(streams.power).toEqual([150, 180, 200]);
    expect(streams.hr).toEqual([140, 150, 160]);
    expect(streams.cadence).toEqual([80, 85, 90]);
    expect(streams.time_s).toEqual([0, 1, 2]);
  });
  
  it('should generate time_s when missing from Intervals', () => {
    const intervalsActivity = {
      _raw: {
        streams: [
          { type: 'watts', data: [150, 180, 200] },
          { type: 'heartrate', data: [140, 150, 160] }
        ]
      }
    };
    
    const streams = extractIntervalsStreams(intervalsActivity, { duration_s: 3 });
    
    expect(streams).not.toBeNull();
    expect(streams.time_s).toEqual([0, 1, 2]);
    expect(streams._time_s_generated).toBe(true);
    expect(streams._sample_interval_inferred).toBe(1);
  });
  
  it('should extract Strava streams with time_s', () => {
    const stravaActivity = {};
    const stravaStreams = {
      watts: { data: [150, 180, 200] },
      heartrate: { data: [140, 150, 160] },
      cadence: { data: [80, 85, 90] },
      time: { data: [0, 1, 2] }
    };
    
    const streams = extractStravaStreams(stravaActivity, stravaStreams);
    
    expect(streams).not.toBeNull();
    expect(streams.power).toEqual([150, 180, 200]);
    expect(streams.hr).toEqual([140, 150, 160]);
    expect(streams.cadence).toEqual([80, 85, 90]);
    expect(streams.time_s).toEqual([0, 1, 2]);
  });
  
  it('should generate time_s when missing from Strava', () => {
    const stravaActivity = {};
    const stravaStreams = {
      watts: { data: [150, 180, 200] },
      heartrate: { data: [140, 150, 160] }
    };
    
    const streams = extractStravaStreams(stravaActivity, stravaStreams, { duration_s: 3 });
    
    expect(streams).not.toBeNull();
    expect(streams.time_s).toEqual([0, 1, 2]);
    expect(streams._time_s_generated).toBe(true);
    expect(streams._sample_interval_inferred).toBe(1);
  });
  
  it('should generate deterministic time_s with inferred sample interval', () => {
    const stravaActivity = {};
    const stravaStreams = {
      watts: { data: Array(120).fill(150) } // 120 samples
    };
    
    // 600 seconds / 120 samples = 5 second interval
    const streams = extractStravaStreams(stravaActivity, stravaStreams, { duration_s: 600 });
    
    expect(streams).not.toBeNull();
    expect(streams.time_s).toHaveLength(120);
    expect(streams.time_s[0]).toBe(0);
    expect(streams.time_s[1]).toBe(5);
    expect(streams.time_s[119]).toBe(595);
    expect(streams._sample_interval_inferred).toBe(5);
  });
  
  it('should return null for missing streams', () => {
    const intervalsActivity = { _raw: {} };
    const streams = extractIntervalsStreams(intervalsActivity);
    
    expect(streams).toBeNull();
  });
});

describe('Integration - Normaliser with Streams', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr)
      VALUES (?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_streams WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should use real streams when available', async () => {
    const activityId = 'test:integration';
    
    // Create activity
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        physiology_source, metadata_source, is_valid_for_analytics,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Integration Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 'intervals', 'intervals', 1
    );
    
    // Store streams
    const power = Array(3600).fill(0).map((_, i) => 150 + Math.sin(i / 100) * 50);
    const hr = Array(3600).fill(0).map((_, i) => 140 + Math.sin(i / 120) * 20);
    
    await upsertCanonicalStreams(
      TEST_USER_ID,
      activityId,
      'intervals',
      { power, hr }
    );
    
    // Retrieve streams (simulating normaliser)
    const streams = await getCanonicalStreams(TEST_USER_ID, activityId);
    
    expect(streams).not.toBeNull();
    expect(streams.power).toHaveLength(3600);
    expect(streams.hr).toHaveLength(3600);
    expect(streams.meta.flags.completeness.power).toBeGreaterThan(90);
  });
});
