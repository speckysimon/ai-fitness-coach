/**
 * Interpretation Service Tests
 * 
 * Minimal unit tests for interpretation engine v1
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { 
  computeInterpretation, 
  upsertInterpretation,
  getInterpretation 
} from '../services/interpretationService.js';
import { INTERPRETATION_VERSION, FLAGS } from '../constants/interpretation.js';

describe('Interpretation Service v1', () => {
  
  describe('Payload Schema', () => {
    it('should always return valid v1 schema structure', () => {
      // Create a minimal test activity
      const testActivityId = 'test_activity_schema';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power, normalized_power, avg_hr, max_hr
        ) VALUES (?, 1, 'Test Ride', 'Ride', datetime('now'), 3600, 30000, 500, 1, 200, 210, 140, 165)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      // Required keys
      expect(payload).toHaveProperty('duration_s');
      expect(payload).toHaveProperty('distance_m');
      expect(payload).toHaveProperty('elevation_gain_m');
      expect(payload).toHaveProperty('has_power');
      expect(payload).toHaveProperty('has_hr');
      expect(payload).toHaveProperty('avg_power_w');
      expect(payload).toHaveProperty('normalized_power_w');
      expect(payload).toHaveProperty('variability_index');
      expect(payload).toHaveProperty('intensity_factor');
      expect(payload).toHaveProperty('avg_hr_bpm');
      expect(payload).toHaveProperty('max_hr_bpm');
      expect(payload).toHaveProperty('power_zone_seconds');
      expect(payload).toHaveProperty('hr_zone_seconds');
      expect(payload).toHaveProperty('decoupling_pct');
      expect(payload).toHaveProperty('power_hr_ratio');
      expect(payload).toHaveProperty('key_efforts');
      expect(payload).toHaveProperty('flags');

      // Zone structure
      expect(payload.power_zone_seconds).toHaveProperty('z1');
      expect(payload.power_zone_seconds).toHaveProperty('z7');
      expect(payload.hr_zone_seconds).toHaveProperty('z1');
      expect(payload.hr_zone_seconds).toHaveProperty('z7');

      // Arrays
      expect(Array.isArray(payload.key_efforts)).toBe(true);
      expect(Array.isArray(payload.flags)).toBe(true);

      // Boolean types (v2 fix)
      expect(typeof payload.has_power).toBe('boolean');
      expect(typeof payload.has_hr).toBe('boolean');

      // Verify has_hr is true when avg_hr is present (v3 fix)
      expect(payload.has_hr).toBe(true);
      // has_power uses activity.has_power column (1 = true)
      expect(payload.has_power).toBe(true);

      // Verify JSON serialization preserves booleans
      const serialized = JSON.parse(JSON.stringify(payload));
      expect(serialized.has_power).toBe(true);
      expect(serialized.has_hr).toBe(true);
      expect(typeof serialized.has_power).toBe('boolean');
      expect(typeof serialized.has_hr).toBe('boolean');

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });
  });

  describe('Null Handling', () => {
    it('should handle missing power data gracefully', () => {
      const testActivityId = 'test_no_power';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_hr, max_hr
        ) VALUES (?, 1, 'Test Run', 'Run', datetime('now'), 1800, 10000, 100, 0, 150, 170)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.has_power).toBe(false);
      expect(payload.avg_power_w).toBeNull();
      expect(payload.normalized_power_w).toBeNull();
      expect(payload.variability_index).toBeNull();
      expect(payload.intensity_factor).toBeNull();
      expect(payload.flags).toContain(FLAGS.POWER_MISSING);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });

    it('should handle missing HR data gracefully', () => {
      const testActivityId = 'test_no_hr';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power, normalized_power
        ) VALUES (?, 1, 'Test Ride', 'Ride', datetime('now'), 3600, 40000, 600, 1, 220, 230)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.has_hr).toBe(false);
      expect(payload.avg_hr_bpm).toBeNull();
      expect(payload.max_hr_bpm).toBeNull();
      expect(payload.flags).toContain(FLAGS.HR_MISSING);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });
  });

  describe('Decoupling Eligibility', () => {
    it('should not compute decoupling for short rides (<30min)', () => {
      const testActivityId = 'test_short_ride';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power, normalized_power, avg_hr, max_hr
        ) VALUES (?, 1, 'Short Ride', 'Ride', datetime('now'), 1200, 10000, 100, 1, 200, 210, 140, 160)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.decoupling_pct).toBeNull();
      expect(payload.flags).toContain(FLAGS.DECOUPLING_NOT_COMPUTABLE);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });

    it('should return null with decoupling_requires_streams flag when eligible but no streams (v2)', () => {
      const testActivityId = 'test_eligible_no_streams';
      
      // Create activity that meets all eligibility criteria
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power, normalized_power, avg_hr, max_hr
        ) VALUES (?, 1, 'Long Z2 Ride', 'Ride', datetime('now'), 3600, 40000, 400, 1, 180, 190, 140, 160)
      `).run(testActivityId);

      // Add zone times to make it eligible (20+ min in Z2, <5min in Z4+)
      db.prepare(`
        INSERT OR REPLACE INTO activity_sources (
          activity_id, provider, provider_id, raw_json
        ) VALUES (?, 'intervals', 'i123', ?)
      `).run(testActivityId, JSON.stringify({
        icu_zone_times: [0, 0, 1500, 0, 0, 0, 0], // 25 min in Z2
        icu_hr_zone_times: [0, 0, 1500, 0, 0, 0, 0]
      }));

      const payload = computeInterpretation(testActivityId);

      // v2: Should return null, not fabricated value
      expect(payload.decoupling_pct).toBeNull();
      expect(payload.flags).toContain(FLAGS.DECOUPLING_NOT_COMPUTABLE);
      expect(payload.flags).toContain(FLAGS.DECOUPLING_REQUIRES_STREAMS);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
      db.prepare('DELETE FROM activity_sources WHERE activity_id = ?').run(testActivityId);
    });

    it('should not compute decoupling without power or HR', () => {
      const testActivityId = 'test_no_data';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power
        ) VALUES (?, 1, 'No Data Ride', 'Ride', datetime('now'), 3600, 30000, 400, 0)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.decoupling_pct).toBeNull();
      expect(payload.flags).toContain(FLAGS.DECOUPLING_NOT_COMPUTABLE);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });
  });

  describe('Versioning', () => {
    it('should store correct interpretation version', () => {
      const testActivityId = 'test_version';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power
        ) VALUES (?, 1, 'Version Test', 'Ride', datetime('now'), 3600, 30000, 400, 1, 200)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);
      const result = upsertInterpretation(testActivityId, payload, 'test');

      expect(result.success).toBe(true);

      const stored = getInterpretation(testActivityId);
      expect(stored).not.toBeNull();
      expect(stored.version).toBe(INTERPRETATION_VERSION);
      expect(stored.source).toBe('test');

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
      db.prepare('DELETE FROM activity_interpretation WHERE activity_id = ?').run(testActivityId);
    });
  });

  describe('Power/HR Ratio', () => {
    it('should compute power_hr_ratio when both available', () => {
      const testActivityId = 'test_ratio';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power, avg_hr
        ) VALUES (?, 1, 'Ratio Test', 'Ride', datetime('now'), 3600, 30000, 400, 1, 200, 140)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.power_hr_ratio).not.toBeNull();
      expect(payload.power_hr_ratio).toBeCloseTo(200 / 140, 2);

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });

    it('should not compute power_hr_ratio when data missing', () => {
      const testActivityId = 'test_no_ratio';
      db.prepare(`
        INSERT OR REPLACE INTO activities (
          id, user_id, name, type, start_time, duration_s, distance_m, elevation_m,
          has_power, avg_power
        ) VALUES (?, 1, 'No Ratio Test', 'Ride', datetime('now'), 3600, 30000, 400, 1, 200)
      `).run(testActivityId);

      const payload = computeInterpretation(testActivityId);

      expect(payload.power_hr_ratio).toBeNull();

      // Cleanup
      db.prepare('DELETE FROM activities WHERE id = ?').run(testActivityId);
    });
  });
});
