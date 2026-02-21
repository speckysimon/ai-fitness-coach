/**
 * Trend Engine Tests
 * 
 * Tests for rolling trend calculations and change detection:
 * - Rolling averages (4w, 8w)
 * - Window comparisons (recent vs prior)
 * - Change classification (improving, flat, declining)
 * - Missing data handling
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db.js';
import {
  getWeeklySeries,
  rollingAverage,
  compareWindows,
  classifyChange,
  computeTrendSummary,
  getRollingAverages,
  detectPlateau
} from '../services/trendEngine.js';

const TEST_USER_ID = 999;

describe('Trend Engine', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
    
    // Ensure test user exists
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, analytics_include_strava_only)
      VALUES (?, ?, 1)
    `).run(TEST_USER_ID, 'test@example.com');
  });
  
  afterEach(() => {
    // Clean up
    db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
  });
  
  describe('Rolling Averages', () => {
    it('should compute 4-week rolling average correctly', () => {
      const series = [
        { week_start: '2026-01-05', value: 10 },
        { week_start: '2026-01-12', value: 12 },
        { week_start: '2026-01-19', value: 14 },
        { week_start: '2026-01-26', value: 16 },
        { week_start: '2026-02-02', value: 18 }
      ];
      
      const rolling = rollingAverage(series, 4);
      
      expect(rolling).toHaveLength(5);
      
      // First point: only 1 value
      expect(rolling[0].rolling_avg).toBe(10);
      expect(rolling[0].window_size).toBe(1);
      
      // Second point: 2 values
      expect(rolling[1].rolling_avg).toBe(11); // (10 + 12) / 2
      expect(rolling[1].window_size).toBe(2);
      
      // Fourth point: 4 values
      expect(rolling[3].rolling_avg).toBe(13); // (10 + 12 + 14 + 16) / 4
      expect(rolling[3].window_size).toBe(4);
      
      // Fifth point: 4 values (sliding window)
      expect(rolling[4].rolling_avg).toBe(15); // (12 + 14 + 16 + 18) / 4
      expect(rolling[4].window_size).toBe(4);
    });
    
    it('should compute 8-week rolling average correctly', () => {
      const series = Array.from({ length: 10 }, (_, i) => ({
        week_start: `2026-01-${(i + 1) * 7}`,
        value: (i + 1) * 10
      }));
      
      const rolling = rollingAverage(series, 8);
      
      expect(rolling).toHaveLength(10);
      
      // 8th point: full window
      expect(rolling[7].rolling_avg).toBe(45); // (10+20+30+40+50+60+70+80) / 8
      expect(rolling[7].window_size).toBe(8);
      
      // 10th point: sliding window
      expect(rolling[9].rolling_avg).toBe(65); // (30+40+50+60+70+80+90+100) / 8
      expect(rolling[9].window_size).toBe(8);
    });
    
    it('should handle empty series', () => {
      const rolling = rollingAverage([], 4);
      expect(rolling).toEqual([]);
    });
    
    it('should handle window larger than series', () => {
      const series = [
        { week_start: '2026-01-05', value: 10 },
        { week_start: '2026-01-12', value: 20 }
      ];
      
      const rolling = rollingAverage(series, 10);
      
      expect(rolling).toHaveLength(2);
      expect(rolling[0].rolling_avg).toBe(10);
      expect(rolling[1].rolling_avg).toBe(15); // (10 + 20) / 2
    });
  });
  
  describe('Window Comparison', () => {
    it('should compare recent 4w vs prior 4w correctly', () => {
      const series = [
        // Prior 4 weeks: 10, 12, 14, 16 (avg: 13)
        { week_start: '2026-01-05', value: 10 },
        { week_start: '2026-01-12', value: 12 },
        { week_start: '2026-01-19', value: 14 },
        { week_start: '2026-01-26', value: 16 },
        // Recent 4 weeks: 18, 20, 22, 24 (avg: 21)
        { week_start: '2026-02-02', value: 18 },
        { week_start: '2026-02-09', value: 20 },
        { week_start: '2026-02-16', value: 22 },
        { week_start: '2026-02-23', value: 24 }
      ];
      
      const comparison = compareWindows(series, 4, 4);
      
      expect(comparison.recent).toBe(21); // (18+20+22+24) / 4
      expect(comparison.prior).toBe(13); // (10+12+14+16) / 4
      expect(comparison.delta).toBe(8); // 21 - 13
      expect(comparison.deltaPct).toBeCloseTo(61.54, 1); // (8 / 13) * 100
      expect(comparison.insufficient_data).toBe(false);
    });
    
    it('should handle insufficient data gracefully', () => {
      const series = [
        { week_start: '2026-01-05', value: 10 },
        { week_start: '2026-01-12', value: 12 }
      ];
      
      const comparison = compareWindows(series, 4, 4);
      
      expect(comparison.insufficient_data).toBe(true);
      expect(comparison.recent).toBeNull();
      expect(comparison.prior).toBeNull();
    });
    
    it('should handle partial prior window', () => {
      const series = [
        { week_start: '2026-01-05', value: 10 },
        { week_start: '2026-01-12', value: 12 },
        { week_start: '2026-01-19', value: 14 },
        { week_start: '2026-01-26', value: 16 },
        { week_start: '2026-02-02', value: 18 },
        { week_start: '2026-02-09', value: 20 }
      ];
      
      const comparison = compareWindows(series, 4, 4);
      
      // Only 2 weeks available for prior window
      expect(comparison.recent).toBe(17); // (14+16+18+20) / 4
      expect(comparison.prior).toBe(11); // (10+12) / 2
      expect(comparison.insufficient_data).toBe(false);
    });
    
    it('should calculate negative delta correctly', () => {
      const series = [
        { week_start: '2026-01-05', value: 20 },
        { week_start: '2026-01-12', value: 20 },
        { week_start: '2026-01-19', value: 20 },
        { week_start: '2026-01-26', value: 20 },
        { week_start: '2026-02-02', value: 15 },
        { week_start: '2026-02-09', value: 15 },
        { week_start: '2026-02-16', value: 15 },
        { week_start: '2026-02-23', value: 15 }
      ];
      
      const comparison = compareWindows(series, 4, 4);
      
      expect(comparison.recent).toBe(15);
      expect(comparison.prior).toBe(20);
      expect(comparison.delta).toBe(-5);
      expect(comparison.deltaPct).toBe(-25); // (-5 / 20) * 100
    });
  });
  
  describe('Change Classification', () => {
    it('should classify improving trend (higher is better)', () => {
      expect(classifyChange(10, { improve: 5, decline: -5 }, false)).toBe('improving');
      expect(classifyChange(5.1, { improve: 5, decline: -5 }, false)).toBe('improving');
    });
    
    it('should classify declining trend (higher is better)', () => {
      expect(classifyChange(-10, { improve: 5, decline: -5 }, false)).toBe('declining');
      expect(classifyChange(-5.1, { improve: 5, decline: -5 }, false)).toBe('declining');
    });
    
    it('should classify flat trend', () => {
      expect(classifyChange(3, { improve: 5, decline: -5 }, false)).toBe('flat');
      expect(classifyChange(-3, { improve: 5, decline: -5 }, false)).toBe('flat');
      expect(classifyChange(0, { improve: 5, decline: -5 }, false)).toBe('flat');
    });
    
    it('should classify improving trend (lower is better)', () => {
      // For metrics like power fade, negative delta is improvement
      expect(classifyChange(-10, { improve: 5, decline: -5 }, true)).toBe('improving');
      expect(classifyChange(-5.1, { improve: 5, decline: -5 }, true)).toBe('improving');
    });
    
    it('should classify declining trend (lower is better)', () => {
      expect(classifyChange(10, { improve: 5, decline: -5 }, true)).toBe('declining');
      expect(classifyChange(5.1, { improve: 5, decline: -5 }, true)).toBe('declining');
    });
    
    it('should handle null delta', () => {
      expect(classifyChange(null, { improve: 5, decline: -5 }, false)).toBe('unknown');
      expect(classifyChange(undefined, { improve: 5, decline: -5 }, false)).toBe('unknown');
    });
    
    it('should use default thresholds', () => {
      expect(classifyChange(6)).toBe('improving'); // Default: improve: 5
      expect(classifyChange(-6)).toBe('declining'); // Default: decline: -5
      expect(classifyChange(3)).toBe('flat');
    });
  });
  
  describe('Weekly Series Extraction', () => {
    it('should extract series from weekly rollups', () => {
      // Insert test rollups
      const weeks = [
        { week_start: '2026-01-05', threshold_minutes: 20 },
        { week_start: '2026-01-12', threshold_minutes: 25 },
        { week_start: '2026-01-19', threshold_minutes: 30 },
        { week_start: '2026-01-26', threshold_minutes: 35 }
      ];
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes);
      }
      
      const series = getWeeklySeries(TEST_USER_ID, 'threshold_minutes', { weeksBack: 10 });
      
      expect(series).toHaveLength(4);
      expect(series[0].week_start).toBe('2026-01-05');
      expect(series[0].value).toBe(20);
      expect(series[3].week_start).toBe('2026-01-26');
      expect(series[3].value).toBe(35);
    });
    
    it('should filter out null values', () => {
      const weeks = [
        { week_start: '2026-01-05', threshold_minutes: 20 },
        { week_start: '2026-01-12', threshold_minutes: null },
        { week_start: '2026-01-19', threshold_minutes: 30 }
      ];
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes);
      }
      
      const series = getWeeklySeries(TEST_USER_ID, 'threshold_minutes', { weeksBack: 10 });
      
      expect(series).toHaveLength(2);
      expect(series[0].value).toBe(20);
      expect(series[1].value).toBe(30);
    });
    
    it('should return empty array for no data', () => {
      const series = getWeeklySeries(TEST_USER_ID, 'threshold_minutes', { weeksBack: 10 });
      expect(series).toEqual([]);
    });
  });
  
  describe('Trend Summary', () => {
    it('should compute comprehensive trend summary', () => {
      // Insert 12 weeks of data showing improvement
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          avg_power_fade: 0.15 - (i * 0.005), // Improving (decreasing)
          threshold_minutes: 20 + (i * 2), // Improving (increasing)
          stochastic_sessions: i < 6 ? 1 : 2, // Improving (increasing)
          avg_hr_drift: 8 - (i * 0.2) // Improving (decreasing)
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            avg_power_fade, threshold_minutes, stochastic_sessions, avg_hr_drift
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start,
          week.avg_power_fade, week.threshold_minutes,
          week.stochastic_sessions, week.avg_hr_drift
        );
      }
      
      const summary = computeTrendSummary(TEST_USER_ID, { weeksBack: 12 });
      
      // Durability (lower is better)
      expect(summary.durability.metric).toBe('avg_power_fade');
      expect(summary.durability.status).toBe('improving');
      expect(summary.durability.recent).toBeLessThan(summary.durability.prior);
      
      // Threshold (higher is better)
      expect(summary.threshold.metric).toBe('threshold_minutes');
      expect(summary.threshold.status).toBe('improving');
      expect(summary.threshold.recent).toBeGreaterThan(summary.threshold.prior);
      
      // Stochastic (higher is better)
      expect(summary.stochastic.metric).toBe('stochastic_sessions');
      expect(summary.stochastic.status).toBe('improving');
      
      // Aerobic (lower is better)
      expect(summary.aerobic.metric).toBe('avg_hr_drift');
      expect(summary.aerobic.status).toBe('improving');
      
      // Metadata
      expect(summary.weeks_analyzed).toBe(12);
      expect(summary.recent_window).toBe(4);
      expect(summary.prior_window).toBe(4);
    });
    
    it('should handle insufficient data gracefully', () => {
      // Insert only 2 weeks (insufficient for 4w comparison)
      const weeks = [
        { week_start: '2026-02-02', threshold_minutes: 20 },
        { week_start: '2026-02-09', threshold_minutes: 25 }
      ];
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes);
      }
      
      const summary = computeTrendSummary(TEST_USER_ID, { weeksBack: 12 });
      
      expect(summary.threshold.status).toBe('insufficient_data');
      expect(summary.threshold.data_points).toBe(2);
    });
    
    it('should detect declining trends', () => {
      // Insert data showing decline
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          threshold_minutes: 40 - (i * 2) // Declining
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes);
      }
      
      const summary = computeTrendSummary(TEST_USER_ID, { weeksBack: 12 });
      
      expect(summary.threshold.status).toBe('declining');
      expect(summary.threshold.recent).toBeLessThan(summary.threshold.prior);
    });
  });
  
  describe('Rolling Averages Helper', () => {
    it('should return 4w and 8w rolling averages', () => {
      // Insert 12 weeks
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          threshold_minutes: 20 + i
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes);
      }
      
      const result = getRollingAverages(TEST_USER_ID, 'threshold_minutes', { weeksBack: 12 });
      
      expect(result.rolling_4w).not.toBeNull();
      expect(result.rolling_8w).not.toBeNull();
      expect(result.series_4w).toHaveLength(12);
      expect(result.series_8w).toHaveLength(12);
      expect(result.raw_series).toHaveLength(12);
    });
    
    it('should handle no data', () => {
      const result = getRollingAverages(TEST_USER_ID, 'threshold_minutes', { weeksBack: 12 });
      
      expect(result.rolling_4w).toBeNull();
      expect(result.rolling_8w).toBeNull();
      expect(result.series).toEqual([]);
    });
  });
  
  describe('Plateau Detection', () => {
    it('should detect plateau when values are stable', () => {
      const series = [
        { week_start: '2026-01-05', value: 100 },
        { week_start: '2026-01-12', value: 102 },
        { week_start: '2026-01-19', value: 98 },
        { week_start: '2026-01-26', value: 101 }
      ];
      
      const isPlateau = detectPlateau(series, 4, 5);
      expect(isPlateau).toBe(true);
    });
    
    it('should not detect plateau when values vary significantly', () => {
      const series = [
        { week_start: '2026-01-05', value: 100 },
        { week_start: '2026-01-12', value: 110 },
        { week_start: '2026-01-19', value: 95 },
        { week_start: '2026-01-26', value: 120 }
      ];
      
      const isPlateau = detectPlateau(series, 4, 5);
      expect(isPlateau).toBe(false);
    });
    
    it('should handle insufficient data', () => {
      const series = [
        { week_start: '2026-01-05', value: 100 }
      ];
      
      const isPlateau = detectPlateau(series, 4, 5);
      expect(isPlateau).toBe(false);
    });
  });
});
