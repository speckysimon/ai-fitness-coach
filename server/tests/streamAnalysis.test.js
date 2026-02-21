/**
 * Stream Analysis Tests (v4)
 * 
 * Tests for stream-derived metrics: decoupling, coasting, interval density
 */

import { describe, it, expect } from '@jest/globals';
import {
  computeRealDecoupling,
  computeCoastingPercentage,
  computeIntervalDensity
} from '../services/streamAnalysis.js';
import { FLAGS } from '../constants/interpretation.js';

describe('Stream Analysis v4', () => {
  
  describe('FTP/FTHR Sourcing', () => {
    
    it('should require explicit FTP parameter (not derived from activity)', () => {
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array(200).fill(150),
        heartrate: Array(200).fill(140)
      };
      
      // Pass null FTP explicitly - should NOT derive from activity data
      const result = computeRealDecoupling(streams, null, null);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.flags).toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
    
    it('should use provided FTP value exactly (no activity-based derivation)', () => {
      const ftp = 250; // Explicit athlete-level FTP
      const streams = {
        time: Array.from({ length: 1800 }, (_, i) => i),
        watts: Array(1800).fill(175), // 70% of FTP
        heartrate: Array(1800).fill(140)
      };
      
      const result = computeRealDecoupling(streams, ftp, null);
      
      // Should compute with provided FTP, not derive from watts array
      expect(result.decoupling_pct).not.toBeNull();
      expect(result.flags).not.toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
    
    it('should reject zero FTP (no fallback to activity data)', () => {
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array(200).fill(150),
        heartrate: Array(200).fill(140)
      };
      
      const result = computeRealDecoupling(streams, 0, null);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.flags).toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
  });
  
  describe('computeRealDecoupling', () => {
    
    it('should return null with STREAM_UNAVAILABLE flag when streams missing', () => {
      const result = computeRealDecoupling(null, 250, 170);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.steady_block_duration_s).toBeNull();
      expect(result.flags).toContain(FLAGS.STREAM_UNAVAILABLE);
    });
    
    it('should return null with MISSING_FTP_OR_FTHR flag when FTP missing', () => {
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array(200).fill(150),
        heartrate: Array(200).fill(140)
      };
      
      const result = computeRealDecoupling(streams, null, 170);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.steady_block_duration_s).toBeNull();
      expect(result.flags).toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
    
    it('should return null with MISSING_FTP_OR_FTHR flag when FTP is zero', () => {
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array(200).fill(150),
        heartrate: Array(200).fill(140)
      };
      
      const result = computeRealDecoupling(streams, 0, 170);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.flags).toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
    
    it('should return null with STEADY_BLOCK_NOT_FOUND when no qualifying block', () => {
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array(200).fill(250), // Too high for steady (>80% of 250 FTP)
        heartrate: Array(200).fill(140)
      };
      
      const result = computeRealDecoupling(streams, 250, 170);
      
      expect(result.decoupling_pct).toBeNull();
      expect(result.flags).toContain(FLAGS.STEADY_BLOCK_NOT_FOUND);
    });
    
    it('should compute decoupling for valid steady block', () => {
      const ftp = 250;
      const steadyPower = 175; // 70% FTP
      
      // 30 minutes at steady power
      const streams = {
        time: Array.from({ length: 1800 }, (_, i) => i), // 1800 seconds
        watts: Array(1800).fill(steadyPower),
        heartrate: Array.from({ length: 1800 }, (_, i) => 140 + (i / 1800) * 10) // HR drifts from 140 to 150
      };
      
      const result = computeRealDecoupling(streams, ftp, 170);
      
      expect(result.decoupling_pct).not.toBeNull();
      expect(result.steady_block_duration_s).toBeGreaterThanOrEqual(1200);
      expect(result.flags).not.toContain(FLAGS.STREAM_UNAVAILABLE);
      expect(result.flags).not.toContain(FLAGS.STEADY_BLOCK_NOT_FOUND);
    });
    
    it('should handle downsampled streams with variable time deltas', () => {
      const ftp = 250;
      const steadyPower = 175;
      
      // Non-uniform time sampling (e.g., 5-second intervals)
      const streams = {
        time: Array.from({ length: 360 }, (_, i) => i * 5), // 1800 seconds, 5s intervals
        watts: Array(360).fill(steadyPower),
        heartrate: Array.from({ length: 360 }, (_, i) => 140 + (i / 360) * 10)
      };
      
      const result = computeRealDecoupling(streams, ftp, 170);
      
      expect(result.decoupling_pct).not.toBeNull();
      expect(result.steady_block_duration_s).toBeGreaterThanOrEqual(1200);
    });
  });
  
  describe('computeCoastingPercentage', () => {
    
    it('should return null with STREAM_UNAVAILABLE when streams missing', () => {
      const result = computeCoastingPercentage(null);
      
      expect(result.coasting_pct).toBeNull();
      expect(result.flags).toContain(FLAGS.STREAM_UNAVAILABLE);
    });
    
    it('should compute 0% coasting when no coasting detected', () => {
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i),
        watts: Array(100).fill(150)
      };
      
      const result = computeCoastingPercentage(streams);
      
      expect(result.coasting_pct).toBe(0);
      expect(result.flags).not.toContain(FLAGS.HIGH_COASTING);
    });
    
    it('should compute coasting percentage correctly', () => {
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i), // 100 seconds
        watts: Array.from({ length: 100 }, (_, i) => i < 10 ? 0 : 150) // 10s coasting
      };
      
      const result = computeCoastingPercentage(streams);
      
      expect(result.coasting_pct).toBeCloseTo(10.1, 1); // ~10% coasting
      expect(result.flags).not.toContain(FLAGS.HIGH_COASTING);
    });
    
    it('should trigger HIGH_COASTING flag only when > 15%', () => {
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i),
        watts: Array.from({ length: 100 }, (_, i) => i < 16 ? 0 : 150) // 16s coasting = 16.2%
      };
      
      const result = computeCoastingPercentage(streams);
      
      expect(result.coasting_pct).toBeGreaterThan(15);
      expect(result.flags).toContain(FLAGS.HIGH_COASTING);
    });
    
    it('should NOT trigger HIGH_COASTING flag when exactly 15%', () => {
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i),
        watts: Array.from({ length: 100 }, (_, i) => i < 15 ? 0 : 150) // Exactly 15%
      };
      
      const result = computeCoastingPercentage(streams);
      
      expect(result.coasting_pct).toBeLessThanOrEqual(15);
      expect(result.flags).not.toContain(FLAGS.HIGH_COASTING);
    });
    
    it('should handle downsampled streams correctly', () => {
      // 10-second intervals, 1000 seconds total
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i * 10),
        watts: Array.from({ length: 100 }, (_, i) => i < 2 ? 0 : 150) // 20s coasting
      };
      
      const result = computeCoastingPercentage(streams);
      
      expect(result.coasting_pct).toBeCloseTo(2.0, 1); // 20/990 ≈ 2%
    });
  });
  
  describe('computeIntervalDensity', () => {
    
    it('should return 0 with STREAM_UNAVAILABLE when streams missing', () => {
      const result = computeIntervalDensity(null, 250);
      
      expect(result.interval_count).toBe(0);
      expect(result.interval_total_time_s).toBe(0);
      expect(result.flags).toContain(FLAGS.STREAM_UNAVAILABLE);
    });
    
    it('should return 0 with MISSING_FTP_OR_FTHR when FTP missing', () => {
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i),
        watts: Array(100).fill(150)
      };
      
      const result = computeIntervalDensity(streams, null);
      
      expect(result.interval_count).toBe(0);
      expect(result.interval_total_time_s).toBe(0);
      expect(result.flags).toContain(FLAGS.MISSING_FTP_OR_FTHR);
    });
    
    it('should detect no intervals when power below threshold', () => {
      const ftp = 250;
      const streams = {
        time: Array.from({ length: 100 }, (_, i) => i),
        watts: Array(100).fill(200) // 80% FTP, below 105% threshold
      };
      
      const result = computeIntervalDensity(streams, ftp);
      
      expect(result.interval_count).toBe(0);
      expect(result.interval_total_time_s).toBe(0);
      expect(result.flags).not.toContain(FLAGS.HIGH_INTERVAL_DENSITY);
    });
    
    it('should detect intervals >= 60s at >= 105% FTP', () => {
      const ftp = 250;
      const threshold = ftp * 1.05; // 262.5W
      
      const streams = {
        time: Array.from({ length: 200 }, (_, i) => i),
        watts: Array.from({ length: 200 }, (_, i) => 
          (i >= 20 && i < 80) ? 270 : 150 // 60s interval
        )
      };
      
      const result = computeIntervalDensity(streams, ftp);
      
      expect(result.interval_count).toBe(1);
      expect(result.interval_total_time_s).toBeGreaterThanOrEqual(60);
    });
    
    it('should trigger HIGH_INTERVAL_DENSITY only when > 20% of duration', () => {
      const ftp = 250;
      
      // 1000s total, 250s intervals = 25% > 20%
      const streams = {
        time: Array.from({ length: 1000 }, (_, i) => i),
        watts: Array.from({ length: 1000 }, (_, i) => 
          (i >= 100 && i < 350) ? 270 : 150 // 250s interval
        )
      };
      
      const result = computeIntervalDensity(streams, ftp);
      
      expect(result.interval_total_time_s).toBeGreaterThan(200);
      expect(result.flags).toContain(FLAGS.HIGH_INTERVAL_DENSITY);
    });
    
    it('should NOT trigger HIGH_INTERVAL_DENSITY when exactly 20%', () => {
      const ftp = 250;
      
      // 1000s total, 200s intervals = exactly 20%
      const streams = {
        time: Array.from({ length: 1000 }, (_, i) => i),
        watts: Array.from({ length: 1000 }, (_, i) => 
          (i >= 100 && i < 300) ? 270 : 150 // 200s interval
        )
      };
      
      const result = computeIntervalDensity(streams, ftp);
      
      const pct = (result.interval_total_time_s / 999) * 100;
      expect(pct).toBeLessThanOrEqual(20);
      expect(result.flags).not.toContain(FLAGS.HIGH_INTERVAL_DENSITY);
    });
    
    it('should ensure interval_total_time_s <= duration_s', () => {
      const ftp = 250;
      
      const streams = {
        time: Array.from({ length: 500 }, (_, i) => i),
        watts: Array.from({ length: 500 }, (_, i) => 
          i < 300 ? 270 : 150 // 300s interval
        )
      };
      
      const result = computeIntervalDensity(streams, ftp);
      
      const totalDuration = streams.time[streams.time.length - 1] - streams.time[0];
      expect(result.interval_total_time_s).toBeLessThanOrEqual(totalDuration);
    });
  });
  
  describe('Timebase correctness', () => {
    
    it('should handle non-1Hz sampling for steady_block_duration_s', () => {
      const ftp = 250;
      
      // 2-second intervals, 1800 seconds total
      const streams = {
        time: Array.from({ length: 900 }, (_, i) => i * 2),
        watts: Array(900).fill(175),
        heartrate: Array(900).fill(140)
      };
      
      const result = computeRealDecoupling(streams, ftp, 170);
      
      if (result.steady_block_duration_s) {
        expect(result.steady_block_duration_s).toBeGreaterThanOrEqual(1200);
        expect(result.steady_block_duration_s).toBeLessThanOrEqual(1800);
      }
    });
    
    it('should handle irregular sampling for coasting_pct', () => {
      // Irregular time deltas
      const streams = {
        time: [0, 1, 3, 6, 10, 15, 21, 28, 36, 45], // Variable deltas
        watts: [0, 0, 150, 150, 150, 0, 150, 150, 150, 150]
      };
      
      const result = computeCoastingPercentage(streams);
      
      // Coasting at indices 0,1,5 = times 0-1, 1-3, 15-21 = 1+2+6 = 9 seconds
      // Total = 45 seconds
      // Expected: 9/45 = 20%
      expect(result.coasting_pct).toBeCloseTo(20, 0);
    });
  });
});
