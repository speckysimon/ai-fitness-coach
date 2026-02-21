/**
 * Coaching Insights Tests
 * 
 * Tests for deterministic coaching insights generation:
 * - Each insight triggers when criteria met
 * - Does not trigger when criteria not met
 * - Confidence drops with poor coverage
 * - Inverted metrics handled correctly
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import db from '../db.js';
import { generateInsights } from '../services/coachingInsights.js';

const TEST_USER_ID = 999;

describe('Coaching Insights', () => {
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
  
  describe('Durability Improving', () => {
    it('should trigger when power fade decreases by >= 10%', () => {
      // Create 12 weeks showing durability improvement
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        // Power fade: 15% → 10% (33% improvement)
        const powerFade = i < 4 ? 0.15 : (i < 8 ? 0.13 : 0.10);
        
        weeks.push({
          week_start: weekStart,
          avg_power_fade: powerFade,
          activities_total: 5,
          activities_with_power: 5,
          activities_with_streams: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            avg_power_fade, activities_total, activities_with_power,
            activities_with_streams, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.avg_power_fade,
          week.activities_total, week.activities_with_power,
          week.activities_with_streams, week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      expect(result.ok).toBe(true);
      
      const durabilityInsight = result.insights.find(i => i.id === 'durability_improving');
      expect(durabilityInsight).toBeDefined();
      expect(durabilityInsight.severity).toBe('info');
      expect(durabilityInsight.confidence).toBeGreaterThan(0.7);
      expect(durabilityInsight.evidence.trend).toBe('improving');
    });
    
    it('should not trigger when power fade change is small', () => {
      // Create weeks with minimal change
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          avg_power_fade: 0.12, // Stable
          activities_total: 5,
          activities_with_power: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            avg_power_fade, activities_total, activities_with_power,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.avg_power_fade,
          week.activities_total, week.activities_with_power,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      const durabilityInsight = result.insights.find(i => i.id === 'durability_improving');
      expect(durabilityInsight).toBeUndefined();
    });
  });
  
  describe('Durability Declining', () => {
    it('should trigger when power fade increases by >= 10%', () => {
      // Create weeks showing durability decline
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        // Power fade: 10% → 15% (50% decline)
        const powerFade = i < 4 ? 0.10 : (i < 8 ? 0.12 : 0.15);
        
        weeks.push({
          week_start: weekStart,
          avg_power_fade: powerFade,
          activities_total: 5,
          activities_with_power: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            avg_power_fade, activities_total, activities_with_power,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.avg_power_fade,
          week.activities_total, week.activities_with_power,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      const durabilityInsight = result.insights.find(i => i.id === 'durability_declining');
      expect(durabilityInsight).toBeDefined();
      expect(durabilityInsight.severity).toBe('warn');
      expect(durabilityInsight.message).toContain('long endurance rides');
      expect(durabilityInsight.evidence.trend).toBe('declining');
    });
  });
  
  describe('Missing VO2 Stimulus', () => {
    it('should trigger when VO2 < 10 and threshold >= 20', () => {
      // Create 4 recent weeks with low VO2, adequate threshold
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
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 4 });
      
      const vo2Insight = result.insights.find(i => i.id === 'missing_vo2');
      expect(vo2Insight).toBeDefined();
      expect(vo2Insight.severity).toBe('action');
      expect(vo2Insight.message).toContain('VO2 intervals');
      expect(vo2Insight.evidence.vo2_minutes_avg).toBeLessThan(10);
      expect(vo2Insight.evidence.threshold_minutes_avg).toBeGreaterThanOrEqual(20);
    });
    
    it('should not trigger when VO2 is adequate', () => {
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          vo2_minutes: 15, // Adequate
          threshold_minutes: 25,
          activities_total: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            vo2_minutes, threshold_minutes, activities_total,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.vo2_minutes,
          week.threshold_minutes, week.activities_total,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 4 });
      
      const vo2Insight = result.insights.find(i => i.id === 'missing_vo2');
      expect(vo2Insight).toBeUndefined();
    });
  });
  
  describe('Too Much Stochastic', () => {
    it('should trigger when stochastic >= 2/wk and threshold < 15/wk', () => {
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          stochastic_sessions: 2.5,
          threshold_minutes: 10,
          activities_total: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            stochastic_sessions, threshold_minutes, activities_total,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.stochastic_sessions,
          week.threshold_minutes, week.activities_total,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 4 });
      
      const stochasticInsight = result.insights.find(i => i.id === 'too_much_stochastic');
      expect(stochasticInsight).toBeDefined();
      expect(stochasticInsight.severity).toBe('action');
      expect(stochasticInsight.message).toContain('steady threshold');
    });
  });
  
  describe('Threshold Improving', () => {
    it('should trigger when threshold increases by >= 15%', () => {
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        // Threshold: 20 → 30 min (50% improvement)
        const threshold = i < 4 ? 20 : (i < 8 ? 25 : 30);
        
        weeks.push({
          week_start: weekStart,
          threshold_minutes: threshold,
          activities_total: 5,
          activities_with_power: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            threshold_minutes, activities_total, activities_with_power,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.threshold_minutes,
          week.activities_total, week.activities_with_power,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      const thresholdInsight = result.insights.find(i => i.id === 'threshold_improving');
      expect(thresholdInsight).toBeDefined();
      expect(thresholdInsight.severity).toBe('info');
      expect(thresholdInsight.message).toContain('Strong Threshold Development');
    });
  });
  
  describe('Volume Drop', () => {
    it('should trigger when volume drops by >= 20%', () => {
      const weeks = [];
      for (let i = 0; i < 8; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        // Volume: 10h/wk → 6h/wk (40% drop)
        const duration = i < 4 ? 36000 : 21600; // 10h → 6h
        
        weeks.push({
          week_start: weekStart,
          total_duration_s: duration,
          activities_total: 5,
          avg_quality_score: 0.9
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            total_duration_s, activities_total, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.total_duration_s,
          week.activities_total, week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 8 });
      
      const volumeInsight = result.insights.find(i => i.id === 'volume_drop');
      expect(volumeInsight).toBeDefined();
      expect(volumeInsight.severity).toBe('warn');
      expect(volumeInsight.message).toContain('volume has dropped');
      expect(volumeInsight.evidence.change_pct).toBeLessThan(-20);
    });
  });
  
  describe('Data Quality Warning', () => {
    it('should trigger when streams_rate < 0.5', () => {
      const weeks = [];
      for (let i = 0; i < 4; i++) {
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 10,
          activities_with_streams: 3, // 30% coverage
          activities_with_power: 4,
          avg_quality_score: 0.4
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, activities_with_power,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_streams, week.activities_with_power,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 4 });
      
      const qualityInsight = result.insights.find(i => i.id === 'data_quality_low');
      expect(qualityInsight).toBeDefined();
      expect(qualityInsight.severity).toBe('warn');
      expect(qualityInsight.message).toContain('Limited Data Coverage');
      expect(qualityInsight.evidence.streams_rate).toBeLessThan(0.5);
    });
  });
  
  describe('Confidence Scoring', () => {
    it('should have high confidence with good coverage', () => {
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 5,
          activities_with_streams: 5,
          activities_with_power: 5,
          activities_with_hr: 5,
          avg_quality_score: 0.95,
          threshold_minutes: 25
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, activities_with_power,
            activities_with_hr, avg_quality_score, threshold_minutes
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_streams, week.activities_with_power,
          week.activities_with_hr, week.avg_quality_score,
          week.threshold_minutes
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.coverage.avg_quality).toBeGreaterThan(0.9);
      expect(result.coverage.streams_rate).toBe(1.0);
    });
    
    it('should cap confidence at 0.6 with insufficient weeks', () => {
      const weeks = [];
      for (let i = 0; i < 4; i++) { // Only 4 weeks
        const date = new Date('2026-02-02');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 5,
          activities_with_streams: 5,
          avg_quality_score: 0.95
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_streams, week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 4 });
      
      expect(result.confidence).toBeLessThanOrEqual(0.6);
      expect(result.coverage.weeks_available).toBe(4);
    });
    
    it('should reduce confidence with poor data coverage', () => {
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 10,
          activities_with_streams: 2, // 20% coverage
          activities_with_power: 3,   // 30% coverage
          avg_quality_score: 0.3
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_streams, activities_with_power,
            avg_quality_score
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_streams, week.activities_with_power,
          week.avg_quality_score
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.coverage.streams_rate).toBeLessThan(0.3);
    });
  });
  
  describe('Insight Prioritization', () => {
    it('should prioritize action > warn > info', () => {
      // Create data that triggers multiple insights
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 5,
          activities_with_power: 5,
          activities_with_streams: 5,
          avg_quality_score: 0.9,
          vo2_minutes: 5,
          threshold_minutes: 25,
          stochastic_sessions: 2.5,
          avg_power_fade: i < 4 ? 0.15 : 0.10
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_power, activities_with_streams,
            avg_quality_score, vo2_minutes, threshold_minutes,
            stochastic_sessions, avg_power_fade
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_power, week.activities_with_streams,
          week.avg_quality_score, week.vo2_minutes, week.threshold_minutes,
          week.stochastic_sessions, week.avg_power_fade
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      expect(result.insights.length).toBeGreaterThan(0);
      
      // Check that action items come first
      const firstActionIndex = result.insights.findIndex(i => i.severity === 'action');
      const firstWarnIndex = result.insights.findIndex(i => i.severity === 'warn');
      const firstInfoIndex = result.insights.findIndex(i => i.severity === 'info');
      
      if (firstActionIndex >= 0 && firstWarnIndex >= 0) {
        expect(firstActionIndex).toBeLessThan(firstWarnIndex);
      }
      if (firstWarnIndex >= 0 && firstInfoIndex >= 0) {
        expect(firstWarnIndex).toBeLessThan(firstInfoIndex);
      }
    });
    
    it('should limit to 7 insights', () => {
      // Create data that triggers many insights
      const weeks = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date('2026-01-05');
        date.setDate(date.getDate() + (i * 7));
        const weekStart = date.toISOString().split('T')[0];
        
        weeks.push({
          week_start: weekStart,
          activities_total: 10,
          activities_with_power: 5,
          activities_with_streams: 3,
          avg_quality_score: 0.4,
          vo2_minutes: 5,
          threshold_minutes: i < 4 ? 20 : 30,
          stochastic_sessions: 2.5,
          avg_power_fade: i < 4 ? 0.15 : 0.10,
          total_duration_s: i < 4 ? 36000 : 21600
        });
      }
      
      for (const week of weeks) {
        db.prepare(`
          INSERT INTO athlete_weekly (
            user_id, week_start, computed_at, algo_version,
            activities_total, activities_with_power, activities_with_streams,
            avg_quality_score, vo2_minutes, threshold_minutes,
            stochastic_sessions, avg_power_fade, total_duration_s
          ) VALUES (?, ?, datetime('now'), 'week_v1', ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          TEST_USER_ID, week.week_start, week.activities_total,
          week.activities_with_power, week.activities_with_streams,
          week.avg_quality_score, week.vo2_minutes, week.threshold_minutes,
          week.stochastic_sessions, week.avg_power_fade, week.total_duration_s
        );
      }
      
      const result = generateInsights(TEST_USER_ID, { weeksBack: 12 });
      
      expect(result.insights.length).toBeLessThanOrEqual(7);
    });
  });
});
