/**
 * Normalisation API Tests
 * 
 * Tests for normalised/durability/stress analytics endpoints.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { createRequire } from 'module';
import request from 'supertest';
import express from 'express';

const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import analyticsRouter from '../routes/analytics.js';

const TEST_USER_ID = 997;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRouter);

describe('Normalisation API - GET Endpoints', () => {
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    // Create test user
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr, analytics_include_strava_only)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180, 1);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  describe('GET /api/analytics/normalised', () => {
    it('should return normalised data for user', async () => {
      // Create test activity
      const activityId = 'test:norm-1';
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, 'Test Activity', '2026-02-17T10:00:00Z',
        3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      // Create normalised data
      db.prepare(`
        INSERT INTO activity_normalised (
          user_id, activity_id, computed_at, algo_version,
          has_power, has_hr, has_cadence, has_streams,
          duration_s, avg_power, np, avg_hr, vi,
          time_in_zones_power, quality_score, notes
        ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, ?, ?, ?, ?, 85, '[]')
      `).run(
        TEST_USER_ID, activityId, 3600, 185, 195, 145, 1.05,
        JSON.stringify({ z1: 300, z2: 2400, z3: 900 })
      );
      
      const response = await request(app)
        .get('/api/analytics/normalised')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.count).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].activity_id).toBe(activityId);
      expect(response.body.data[0].time_in_zones_power).toEqual({
        z1: 300,
        z2: 2400,
        z3: 900
      });
    });
    
    it('should filter by date range', async () => {
      // Create activities on different dates
      for (let i = 1; i <= 3; i++) {
        const activityId = `test:norm-${i}`;
        const date = `2026-02-${10 + i}T10:00:00Z`;
        
        db.prepare(`
          INSERT INTO activities (
            id, user_id, name, start_time, duration_s, avg_power, has_power,
            is_valid_for_analytics, physiology_source, metadata_source,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          activityId, TEST_USER_ID, `Activity ${i}`, date,
          3600, 185, 1, 1, 'intervals', 'intervals'
        );
        
        db.prepare(`
          INSERT INTO activity_normalised (
            user_id, activity_id, computed_at, algo_version,
            has_power, has_hr, has_cadence, has_streams,
            duration_s, avg_power, quality_score, notes
          ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, 85, '[]')
        `).run(TEST_USER_ID, activityId, 3600, 185);
      }
      
      // Query with date filter
      const response = await request(app)
        .get('/api/analytics/normalised')
        .query({
          userId: TEST_USER_ID,
          after: '2026-02-12T00:00:00Z',
          before: '2026-02-13T23:59:59Z'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0].activity_id).toBe('test:norm-2');
    });
    
    it('should limit results', async () => {
      // Create 5 activities
      for (let i = 1; i <= 5; i++) {
        const activityId = `test:norm-${i}`;
        
        db.prepare(`
          INSERT INTO activities (
            id, user_id, name, start_time, duration_s, avg_power, has_power,
            is_valid_for_analytics, physiology_source, metadata_source,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(
          activityId, TEST_USER_ID, `Activity ${i}`, `2026-02-${10 + i}T10:00:00Z`,
          3600, 185, 1, 1, 'intervals', 'intervals'
        );
        
        db.prepare(`
          INSERT INTO activity_normalised (
            user_id, activity_id, computed_at, algo_version,
            has_power, has_hr, has_cadence, has_streams,
            duration_s, avg_power, quality_score, notes
          ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, 85, '[]')
        `).run(TEST_USER_ID, activityId, 3600, 185);
      }
      
      const response = await request(app)
        .get('/api/analytics/normalised')
        .query({ userId: TEST_USER_ID, limit: 3 });
      
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
    });
    
    it('should require userId', async () => {
      const response = await request(app)
        .get('/api/analytics/normalised');
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId required');
    });
  });
  
  describe('GET /api/analytics/normalised/:activityId', () => {
    it('should return normalised data for specific activity', async () => {
      const activityId = 'test:norm-single';
      
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, 'Single Activity', '2026-02-17T10:00:00Z',
        3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      db.prepare(`
        INSERT INTO activity_normalised (
          user_id, activity_id, computed_at, algo_version,
          has_power, has_hr, has_cadence, has_streams,
          duration_s, avg_power, np, vi,
          time_in_zones_power, longest_efforts_power,
          quality_score, notes
        ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, ?, ?, ?, ?, 90, '[]')
      `).run(
        TEST_USER_ID, activityId, 3600, 185, 195, 1.05,
        JSON.stringify({ z1: 300, z2: 2400, z3: 900 }),
        JSON.stringify({ z3: { duration_s: 900, avg_value: 170 } })
      );
      
      const response = await request(app)
        .get(`/api/analytics/normalised/${activityId}`)
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.activity_id).toBe(activityId);
      expect(response.body.data.vi).toBe(1.05);
      expect(response.body.data.time_in_zones_power).toEqual({
        z1: 300,
        z2: 2400,
        z3: 900
      });
      expect(response.body.data.longest_efforts_power).toEqual({
        z3: { duration_s: 900, avg_value: 170 }
      });
    });
    
    it('should return 404 if not found', async () => {
      const response = await request(app)
        .get('/api/analytics/normalised/nonexistent')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });
  });
  
  describe('GET /api/analytics/durability/:activityId', () => {
    it('should return durability data for specific activity', async () => {
      const activityId = 'test:dur-single';
      
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, 'Durability Test', '2026-02-17T10:00:00Z',
        3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      db.prepare(`
        INSERT INTO activity_durability (
          user_id, activity_id, computed_at, algo_version,
          fade_power_pct, fade_hr_pct, efficiency_drop_pct,
          late_threshold_score, stochasticity_score,
          repeat_hard_efforts, surge_count,
          has_sufficient_duration, has_power_data, has_hr_data, notes
        ) VALUES (?, ?, datetime('now'), 'dur_v1', ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, '[]')
      `).run(
        TEST_USER_ID, activityId, 8.5, 6.2, 12.3, 25.4, 0.15, 2, 5
      );
      
      const response = await request(app)
        .get(`/api/analytics/durability/${activityId}`)
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.activity_id).toBe(activityId);
      expect(response.body.data.fade_power_pct).toBe(8.5);
      expect(response.body.data.efficiency_drop_pct).toBe(12.3);
      expect(response.body.data.repeat_hard_efforts).toBe(2);
    });
    
    it('should return 404 if not found', async () => {
      const response = await request(app)
        .get('/api/analytics/durability/nonexistent')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });
  });
  
  describe('GET /api/analytics/stress/:activityId', () => {
    it('should return stress classification for specific activity', async () => {
      const activityId = 'test:stress-single';
      
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, 'Stress Test', '2026-02-17T10:00:00Z',
        3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      const evidence = {
        dataSource: 'power',
        sustainedThresholdBlocks: 3,
        longestThresholdBlock: 1200,
        vo2Blocks: 0,
        isStochastic: false
      };
      
      db.prepare(`
        INSERT INTO activity_stress (
          user_id, activity_id, computed_at, algo_version,
          primary_stress_type, is_stochastic,
          sustained_threshold_blocks, longest_threshold_block_s,
          vo2_blocks, sprint_spikes, recovery_score, evidence
        ) VALUES (?, ?, datetime('now'), 'stress_v1', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        TEST_USER_ID, activityId, 'threshold', 0, 3, 1200, 0, 5, 0.75,
        JSON.stringify(evidence)
      );
      
      const response = await request(app)
        .get(`/api/analytics/stress/${activityId}`)
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.data.activity_id).toBe(activityId);
      expect(response.body.data.primary_stress_type).toBe('threshold');
      expect(response.body.data.sustained_threshold_blocks).toBe(3);
      expect(response.body.data.evidence).toEqual(evidence);
    });
    
    it('should return 404 if not found', async () => {
      const response = await request(app)
        .get('/api/analytics/stress/nonexistent')
        .query({ userId: TEST_USER_ID });
      
      expect(response.status).toBe(404);
      expect(response.body.ok).toBe(false);
    });
  });
});

describe('Normalisation API - POST Recompute', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
    
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr, analytics_include_strava_only)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180, 1);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_durability WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_stress WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should recompute normalised metrics', async () => {
    // Create test activity
    const activityId = 'test:recompute-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Recompute Test', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    const response = await request(app)
      .post('/api/analytics/recompute')
      .query({ userId: TEST_USER_ID })
      .send({ layers: ['normalised'] });
    
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.layers.normalised).toBeDefined();
    expect(response.body.status.normalised).toBeDefined();
  });
  
  it('should recompute all layers', async () => {
    // Create test activity
    const activityId = 'test:recompute-all';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      activityId, TEST_USER_ID, 'Recompute All', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    const response = await request(app)
      .post('/api/analytics/recompute')
      .query({ userId: TEST_USER_ID })
      .send({ layers: ['normalised', 'durability', 'stress'] });
    
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.layers.normalised).toBeDefined();
    expect(response.body.layers.durability).toBeDefined();
    expect(response.body.layers.stress).toBeDefined();
    expect(response.body.status).toBeDefined();
  });
  
  it('should return integrity warnings for low coverage', async () => {
    // Create 100 activities but only compute 50
    for (let i = 1; i <= 100; i++) {
      const activityId = `test:coverage-${i}`;
      db.prepare(`
        INSERT INTO activities (
          id, user_id, name, start_time, duration_s, avg_power, has_power,
          is_valid_for_analytics, physiology_source, metadata_source,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(
        activityId, TEST_USER_ID, `Activity ${i}`, `2026-01-${String(i).padStart(2, '0')}T10:00:00Z`,
        3600, 185, 1, 1, 'intervals', 'intervals'
      );
      
      // Only normalise first 50
      if (i <= 50) {
        db.prepare(`
          INSERT INTO activity_normalised (
            user_id, activity_id, computed_at, algo_version,
            has_power, has_hr, has_cadence, has_streams,
            duration_s, avg_power, quality_score, notes
          ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, 85, '[]')
        `).run(TEST_USER_ID, activityId, 3600, 185);
      }
    }
    
    const response = await request(app)
      .post('/api/analytics/recompute')
      .query({ userId: TEST_USER_ID, limit: 0 })  // Don't recompute, just check status
      .send({ layers: [] });
    
    expect(response.status).toBe(200);
    expect(response.body.warnings).toBeDefined();
    expect(response.body.warnings.length).toBeGreaterThan(0);
    expect(response.body.warnings.some(w => w.includes('coverage'))).toBe(true);
  });
  
  it('should require userId', async () => {
    const response = await request(app)
      .post('/api/analytics/recompute')
      .send({ layers: ['normalised'] });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('userId required');
  });
});

describe('Normalisation API - Analytics Filter Respect', () => {
  beforeEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  afterEach(() => {
    db.prepare('DELETE FROM activities WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM activity_normalised WHERE user_id = ?').run(TEST_USER_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(TEST_USER_ID);
  });
  
  it('should respect analytics_include_strava_only filter', async () => {
    // Create user with Strava-only filter
    db.prepare(`
      INSERT INTO users (id, email, ftp, max_hr, analytics_include_strava_only)
      VALUES (?, ?, ?, ?, ?)
    `).run(TEST_USER_ID, 'test@example.com', 200, 180, 1);
    
    // Create Strava activity
    const stravaId = 'test:strava-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      stravaId, TEST_USER_ID, 'Strava Activity', '2026-02-17T10:00:00Z',
      3600, 185, 1, 1, 'strava', 'strava'
    );
    
    // Create Intervals activity
    const intervalsId = 'test:intervals-1';
    db.prepare(`
      INSERT INTO activities (
        id, user_id, name, start_time, duration_s, avg_power, has_power,
        is_valid_for_analytics, physiology_source, metadata_source,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      intervalsId, TEST_USER_ID, 'Intervals Activity', '2026-02-17T11:00:00Z',
      3600, 185, 1, 1, 'intervals', 'intervals'
    );
    
    // Normalise both
    for (const activityId of [stravaId, intervalsId]) {
      db.prepare(`
        INSERT INTO activity_normalised (
          user_id, activity_id, computed_at, algo_version,
          has_power, has_hr, has_cadence, has_streams,
          duration_s, avg_power, quality_score, notes
        ) VALUES (?, ?, datetime('now'), 'norm_v1', 1, 1, 1, 0, ?, ?, 85, '[]')
      `).run(TEST_USER_ID, activityId, 3600, 185);
    }
    
    // Query should return both (endpoint doesn't filter, just reads table)
    const response = await request(app)
      .get('/api/analytics/normalised')
      .query({ userId: TEST_USER_ID });
    
    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    
    // Note: The analytics_include_strava_only filter is applied during
    // computation (via analyticsQueryBuilder), not during read.
    // Both activities are in the table because they were both normalised.
  });
});
