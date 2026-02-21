/**
 * Weekly Analytics API Tests
 * 
 * Tests for weekly rollups, trends, and insights API endpoints:
 * - GET /api/analytics/weekly
 * - GET /api/analytics/trends
 * - GET /api/analytics/insights
 * - POST /api/analytics/recompute (weekly layer)
 * 
 * Tests standardized response shapes, structured warnings, and userId validation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import db from '../db.js';
import analyticsRouter from '../routes/analytics.js';
import { computeWeeklyRollups } from '../services/weeklyAggregator.js';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

const TEST_USER_ID = 999;

// Save original env var
const originalAllowQueryUserId = process.env.ALLOW_QUERY_USER_ID;

describe('Weekly Analytics API', () => {
  beforeEach(() => {
    // Enable query userId for tests
    process.env.ALLOW_QUERY_USER_ID = 'true';
    
    // Clean up test data
    db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    
    // Ensure test user exists
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, analytics_include_strava_only)
      VALUES (?, ?, 1)
    `).run(TEST_USER_ID, 'test@example.com');
  });
  
  afterEach(() => {
    // Restore original env var
    if (originalAllowQueryUserId !== undefined) {
      process.env.ALLOW_QUERY_USER_ID = originalAllowQueryUserId;
    } else {
      delete process.env.ALLOW_QUERY_USER_ID;
    }
    
    // Clean up
    db.prepare('DELETE FROM athlete_weekly WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
  });
  
  describe('UserId Validation', () => {
    it('should reject requests when ALLOW_QUERY_USER_ID is false and no req.user', async () => {
      process.env.ALLOW_QUERY_USER_ID = 'false';
      
      const response = await request(app)
        .get('/api/analytics/weekly');
      
      expect(response.status).toBe(400);
      expect(response.body.ok).toBe(false);
      expect(response.body.error.code).toBe('USER_ID_REQUIRED');
    });
    
    it('should allow requests when ALLOW_QUERY_USER_ID is true', async () => {
      process.env.ALLOW_QUERY_USER_ID = 'true';
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });
  });
  
  describe('GET /api/analytics/weekly', () => {
    it('should return weekly rollups for a user', async () => {
      // Create test rollups
      const weeks = [
        { week_start: '2026-02-02', threshold_minutes: 25, activities_total: 5 },
        { week_start: '2026-02-09', threshold_minutes: 30, activities_total: 6 },
        { week_start: '2026-02-16', threshold_minutes: 28, activities_total: 5 }
      ];
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes, activities_total, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, 0.9)
        `).run(TEST_USER_ID, week.week_start, week.threshold_minutes, week.activities_total);
      }
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.count).toBe(3);
      expect(response.body.meta.limit).toBe(12);
      expect(response.body.warnings).toBeDefined();
      expect(Array.isArray(response.body.warnings)).toBe(true);
      expect(response.body.data[0].week_start).toBe('2026-02-16');
      expect(response.body.data[0].threshold_minutes).toBe(28);
      expect(response.body.data[0].avg_quality_ratio).toBeDefined();
      expect(response.body.data[0].avg_quality_score).toBeUndefined();
    });
    
    it('should parse JSON fields correctly', async () => {
      const tizPower = { Z1: 1800, Z2: 900, Z3: 600, Z4: 300 };
      const stressDist = { steady: 3, intervals: 1, race: 1 };
      
      db.prepare(`
        INSERT INTO athlete_weekly (
          user_id, week_start, computed_at, algo_version,
          tiz_power, stress_dist, activities_total, avg_quality_score
        ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, 5, 0.9)
      `).run(TEST_USER_ID, '2026-02-16', JSON.stringify(tizPower), JSON.stringify(stressDist));
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.data[0].tiz_power).toEqual(tizPower);
      expect(response.body.data[0].stress_dist).toEqual(stressDist);
    });
    
    it('should return structured warnings for low quality', async () => {
      // Create rollups with low quality
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', 10, 3, 0.5)
        `).run(TEST_USER_ID, weekStart);
      }
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.warnings.length).toBeGreaterThan(0);
      const qualityWarning = response.body.warnings.find(w => w.code === 'LOW_WEEKLY_QUALITY');
      expect(qualityWarning).toBeDefined();
      expect(qualityWarning.severity).toBe('warn');
      expect(qualityWarning.value).toBeLessThan(0.9);
      expect(qualityWarning.threshold).toBe(0.9);
    });
    
    it('should filter by limit', async () => {
      // Create 5 weeks
      for (let i = 0; i < 5; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', 5, 0.9)
        `).run(TEST_USER_ID, weekStart);
      }
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID, limit: 3 });
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta.limit).toBe(3);
    });
  });
  
  describe('GET /api/analytics/trends', () => {
    it('should return trend summary with standardized response shape', async () => {
      // Create 12 weeks showing improvement
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          avg_power_fade: 0.15 - (i * 0.005),
          threshold_minutes: 20 + (i * 2),
          activities_total: 5,
          activities_with_power: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            avg_power_fade, threshold_minutes, activities_total,
            activities_with_power, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.avg_power_fade,
          week.threshold_minutes, week.activities_total,
          week.activities_with_power, week.avg_quality_score
        );
      }
      
      const response = await request(app)
        .get('/api/analytics/trends')
        .query({ userId: TEST_USER_ID, weeksBack: 12 });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.weeksBack).toBe(12);
      expect(response.body.meta.weeks_analyzed).toBeDefined();
      expect(response.body.warnings).toBeDefined();
      expect(Array.isArray(response.body.warnings)).toBe(true);
      expect(response.body.data.durability).toBeDefined();
      expect(response.body.data.threshold).toBeDefined();
      expect(response.body.data.durability.status).toBe('improving');
      expect(response.body.data.threshold.status).toBe('improving');
    });
    
    it('should use default weeksBack of 16', async () => {
      const response = await request(app)
        .get('/api/analytics/trends')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.meta.weeksBack).toBe(16);
    });
  });
  
  describe('GET /api/analytics/insights', () => {
    it('should return coaching insights for a user', async () => {
      // Create weeks with missing VO2 stimulus
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          vo2_minutes: 5,
          threshold_minutes: 25,
          activities_total: 5,
          activities_with_power: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            vo2_minutes, threshold_minutes, activities_total,
            activities_with_power, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.vo2_minutes,
          week.threshold_minutes, week.activities_total,
          week.activities_with_power, week.avg_quality_score
        );
      }
      
      const response = await request(app)
        .get('/api/analytics/insights')
        .query({ userId: TEST_USER_ID, weeksBack: 4 });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.confidence).toBeDefined();
      expect(response.body.data.coverage).toBeDefined();
      expect(response.body.data.coverage.avg_quality_ratio).toBeDefined();
      expect(response.body.data.insights).toBeDefined();
      expect(Array.isArray(response.body.data.insights)).toBe(true);
      expect(response.body.meta.weeksBack).toBe(4);
      expect(response.body.warnings).toBeDefined();
      
      // Should have missing VO2 insight
      const vo2Insight = response.body.data.insights.find(i => i.id === 'missing_vo2');
      expect(vo2Insight).toBeDefined();
      expect(vo2Insight.severity).toBe('action');
    });
  });
  
  describe('POST /api/analytics/recompute - weekly layer', () => {
    it('should recompute weekly rollups', async () => {
      // Create test activities
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const startTime = date.toISOString();
        
        db.prepare(`
          INSERT INTO activities (
            id, user_id, name, start_time, duration_s, has_power,
            physiology_source, metadata_source, is_valid_for_analytics,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          `test:act-${i}`, TEST_USER_ID, 'Test Activity', startTime,
          3600, 1, 'intervals', 'intervals', 1
        );
      }
      
      const response = await request(app)
        .post('/api/analytics/recompute')
        .query({ userId: TEST_USER_ID })
        .send({ layers: ['weekly'] });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.weekly).toBeDefined();
      expect(response.body.data.weekly.ok).toBe(true);
      expect(response.body.data.weekly.computed).toBeGreaterThan(0);
      expect(response.body.meta.layersRequested).toContain('weekly');
      expect(response.body.meta.layersExecuted).toContain('weekly');
      expect(response.body.meta.layerModeByLayer.weekly).toBe('stored');
      expect(response.body.warnings).toBeDefined();
      
      // Verify rollups were created
      const rollups = db.prepare(`
        SELECT * FROM athlete_weekly WHERE user_id = ?
      `).all(TEST_USER_ID);
      
      expect(rollups.length).toBeGreaterThan(0);
    });
    
    it('should compute trends on demand', async () => {
      // Create test rollups
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes, activities_total, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, 5, 0.9)
        `).run(TEST_USER_ID, weekStart, 20 + i);
      }
      
      const response = await request(app)
        .post('/api/analytics/recompute')
        .query({ userId: TEST_USER_ID })
        .send({ layers: ['trends'] });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.trends.ok).toBe(true);
      expect(response.body.data.trends.summary).toBeDefined();
      expect(response.body.meta.layerModeByLayer.trends).toBe('computed');
    });
    
    it('should generate insights on demand', async () => {
      // Create test rollups
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            vo2_minutes, threshold_minutes, activities_total,
            activities_with_power, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', 5, 25, 5, 5, 0.9)
        `).run(TEST_USER_ID, weekStart);
      }
      
      const response = await request(app)
        .post('/api/analytics/recompute')
        .query({ userId: TEST_USER_ID })
        .send({ layers: ['insights'] });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.insights).toBeDefined();
      expect(response.body.data.insights.ok).toBe(true);
      expect(response.body.data.insights.confidence).toBeDefined();
      expect(response.body.data.insights.count).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.layerModeByLayer.insights).toBe('computed');
    });
    
    it('should warn on low quality coverage', async () => {
      // Create rollups with low quality
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', 10, 3, 0.5)
        `).run(TEST_USER_ID, weekStart);
      }
      
      const response = await request(app)
        .post('/api/analytics/recompute')
        .query({ userId: TEST_USER_ID })
        .send({ layers: ['insights'] });
      
      expect(response.status).toBe(200);
      expect(response.body.warnings).toBeDefined();
      const qualityWarning = response.body.warnings.find(w => w.code === 'LOW_WEEKLY_QUALITY');
      expect(qualityWarning).toBeDefined();
      expect(qualityWarning.severity).toBe('warn');
    });
    
    it('should warn on low streams coverage', async () => {
      // Create rollups with low streams coverage
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', 10, 2, 0.9)
        `).run(TEST_USER_ID, weekStart);
      }
      
      const response = await request(app)
        .post('/api/analytics/recompute')
        .query({ userId: TEST_USER_ID })
        .send({ layers: ['weekly'] });
      
      expect(response.status).toBe(200);
      expect(response.body.warnings).toBeDefined();
      const streamsWarning = response.body.warnings.find(w => w.code === 'LOW_STREAMS');
      expect(streamsWarning).toBeDefined();
      expect(streamsWarning.severity).toBe('warn');
    });
  });
  
  describe('Analytics Query Builder Integration', () => {
    it('should respect analytics_include_strava_only setting', async () => {
      // Turn off Strava-only inclusion
      db.prepare('UPDATE users SET analytics_include_strava_only = 0 WHERE id = ?').run(TEST_USER_ID);
      
      // Create Strava-only activity
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s,
          physiology_source, metadata_source, is_valid_for_analytics,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        'test:strava-only', TEST_USER_ID, 'Strava Only', '2026-02-16T10:00:00Z',
        3600, 'strava', 'strava', 1
      );
      
      // Create Intervals activity
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s,
          physiology_source, metadata_source, is_valid_for_analytics,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        'test:intervals', TEST_USER_ID, 'Intervals', '2026-02-16T12:00:00Z',
        3600, 'intervals', 'intervals', 1
      );
      
      // Compute weekly rollups
      await computeWeeklyRollups(TEST_USER_ID, { weeksBack: 1 });
      
      const response = await request(app)
        .get('/api/analytics/weekly')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      
      // Should only count Intervals activity (Strava excluded)
      const week = response.body.weeks.find(w => w.week_start === '2026-02-16');
      expect(week).toBeDefined();
      expect(week.activities_total).toBe(1); // Only Intervals activity
    });
  });
});
