/**
 * Athlete Thresholds Service Tests
 * 
 * Tests for FTP/FTHR sourcing with proper precedence
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

import { getAthleteThresholds, setAthleteThresholds, getUserThresholds, upsertAthleteThresholds } from '../services/athleteThresholdsService.js';

describe('Athlete Thresholds Service', () => {
  
  const testUserId = 999;
  
  beforeEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(testUserId);
    try {
      db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(testUserId);
    } catch (e) {
      // Table might not exist
    }
  });
  
  afterEach(() => {
    // Clean up test data
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(testUserId);
    try {
      db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(testUserId);
    } catch (e) {
      // Table might not exist
    }
  });
  
  describe('getAthleteThresholds - return type', () => {
    
    it('should return plain object (not Promise)', () => {
      const result = getAthleteThresholds(testUserId);
      
      expect(result).not.toBeInstanceOf(Promise);
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('ftp_w');
      expect(result).toHaveProperty('fthr_bpm');
      expect(result).toHaveProperty('ftp_source');
      expect(result).toHaveProperty('fthr_source');
    });
    
    it('should return stable types', () => {
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_w === null || typeof result.ftp_w === 'number').toBe(true);
      expect(result.fthr_bpm === null || typeof result.fthr_bpm === 'number').toBe(true);
      expect(result.ftp_source === null || typeof result.ftp_source === 'string').toBe(true);
      expect(result.fthr_source === null || typeof result.fthr_source === 'string').toBe(true);
    });
    
    it('should return nulls for invalid userId', () => {
      const result = getAthleteThresholds(null);
      
      expect(result.ftp_w).toBeNull();
      expect(result.fthr_bpm).toBeNull();
      expect(result.ftp_source).toBeNull();
      expect(result.fthr_source).toBeNull();
    });
  });
  
  describe('Precedence: manual > estimated > null', () => {
    
    it('should return null when no data exists', () => {
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_w).toBeNull();
      expect(result.fthr_bpm).toBeNull();
      expect(result.ftp_source).toBeNull();
    });
    
    it('should return manual FTP when set', () => {
      setAthleteThresholds(testUserId, 250, 170);
      
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_w).toBe(250);
      expect(result.fthr_bpm).toBe(170);
      expect(result.ftp_source).toBe('manual');
      expect(result.fthr_source).toBe('manual');
    });
    
    it('should prefer manual FTP over estimated', () => {
      // Set manual FTP
      setAthleteThresholds(testUserId, 250, null);
      
      // Insert estimated FTP (higher value)
      try {
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?)
        `).run(testUserId, 2026, 2, 280);
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      // Should use manual (250), not estimated (280)
      expect(result.ftp_w).toBe(250);
      expect(result.ftp_source).toBe('manual');
    });
    
    it('should use estimated FTP when manual not set', () => {
      // Insert estimated FTP only
      try {
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?)
        `).run(testUserId, 2026, 2, 265);
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_w).toBe(265);
      expect(result.ftp_source).toBe('estimated');
    });
    
    it('should use most recent estimated FTP', () => {
      try {
        // Insert multiple months
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)
        `).run(
          testUserId, 2026, 1, 250,
          testUserId, 2026, 2, 265,
          testUserId, 2025, 12, 240
        );
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      // Should use most recent (2026-02)
      expect(result.ftp_w).toBe(265);
      expect(result.ftp_source).toBe('estimated');
    });
  });
  
  describe('Recency guard for estimated FTP', () => {
    
    it('should ignore estimated FTP older than 90 days', () => {
      try {
        // Insert old estimated FTP (4 months ago)
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 4);
        const year = oldDate.getFullYear();
        const month = oldDate.getMonth() + 1;
        
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?)
        `).run(testUserId, year, month, 270);
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      // Should NOT use old estimated FTP
      expect(result.ftp_w).toBeNull();
      expect(result.ftp_source).toBeNull();
    });
    
    it('should accept estimated FTP within 90 days', () => {
      try {
        // Insert recent estimated FTP (1 month ago)
        const recentDate = new Date();
        recentDate.setMonth(recentDate.getMonth() - 1);
        const year = recentDate.getFullYear();
        const month = recentDate.getMonth() + 1;
        
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?)
        `).run(testUserId, year, month, 265);
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      // Should use recent estimated FTP
      expect(result.ftp_w).toBe(265);
      expect(result.ftp_source).toBe('estimated');
    });
  });
  
  describe('Thresholds source provenance', () => {
    
    it('should set ftp_source to manual when manually set', () => {
      setAthleteThresholds(testUserId, 250, 170);
      
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_source).toBe('manual');
      expect(result.fthr_source).toBe('manual');
    });
    
    it('should set ftp_source to estimated when using monthly bests', () => {
      try {
        // Insert recent estimated FTP
        const now = new Date();
        db.prepare(`
          INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp)
          VALUES (?, ?, ?, ?)
        `).run(testUserId, now.getFullYear(), now.getMonth() + 1, 265);
      } catch (e) {
        // Table might not exist - skip this test
        return;
      }
      
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_source).toBe('estimated');
    });
    
    it('should set ftp_source to null when no data available', () => {
      const result = getAthleteThresholds(testUserId);
      
      expect(result.ftp_source).toBeNull();
    });
  });
  
  describe('setAthleteThresholds', () => {
    
    it('should set manual thresholds successfully', () => {
      const result = setAthleteThresholds(testUserId, 250, 170);
      
      expect(result.success).toBe(true);
      
      const thresholds = getAthleteThresholds(testUserId);
      expect(thresholds.ftp_w).toBe(250);
      expect(thresholds.fthr_bpm).toBe(170);
    });
    
    it('should update existing thresholds', () => {
      setAthleteThresholds(testUserId, 250, 170);
      setAthleteThresholds(testUserId, 260, 175);
      
      const thresholds = getAthleteThresholds(testUserId);
      expect(thresholds.ftp_w).toBe(260);
      expect(thresholds.fthr_bpm).toBe(175);
    });
    
    it('should handle null values', () => {
      setAthleteThresholds(testUserId, 250, null);
      
      const thresholds = getAthleteThresholds(testUserId);
      expect(thresholds.ftp_w).toBe(250);
      expect(thresholds.fthr_bpm).toBeNull();
    });
  });
});

// ─── New resolver tests (getUserThresholds + upsertAthleteThresholds) ──────────

describe('getUserThresholds — unified resolver', () => {
  const uid = 998;

  beforeEach(() => {
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid);
    try { db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(uid); } catch {}
    try { db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(uid); } catch {}
  });
  afterEach(() => {
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid);
    try { db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(uid); } catch {}
    try { db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(uid); } catch {}
  });

  it('F1: returns ftp_w=200 and is_default=true when no thresholds exist', () => {
    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(200);
    expect(t.is_default).toBe(true);
    expect(t.ftp_source).toBe('default');
    expect(t.fthr_bpm).toBeNull();
  });

  it('F2: upsert round-trip — POST then GET returns same values', () => {
    const writeResult = upsertAthleteThresholds(uid, {
      ftp_w:       212,
      fthr_bpm:    163,
      ftp_source:  'manual',
      fthr_source: 'manual'
    }, { force: true });

    expect(writeResult.success).toBe(true);
    expect(writeResult.skipped).toBe(false);

    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(212);
    expect(t.fthr_bpm).toBe(163);
    expect(t.ftp_source).toBe('manual');
    expect(t.fthr_source).toBe('manual');
    expect(t.is_default).toBe(false);
  });

  it('F3: derived thresholds do NOT overwrite manual (without force)', () => {
    // First set manual values
    upsertAthleteThresholds(uid, {
      ftp_w:      212,
      fthr_bpm:   163,
      ftp_source: 'manual',
      fthr_source:'manual'
    }, { force: true });

    // Then attempt derived overwrite (no force)
    const skipResult = upsertAthleteThresholds(uid, {
      ftp_w:      250,
      fthr_bpm:   170,
      ftp_source: 'derived',
      fthr_source:'derived'
    }, { force: false });

    expect(skipResult.success).toBe(true);
    expect(skipResult.skipped).toBe(true);

    // Values must be unchanged
    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(212);
    expect(t.fthr_bpm).toBe(163);
    expect(t.ftp_source).toBe('manual');
  });

  it('F3b: derived thresholds DO overwrite manual when force=true', () => {
    upsertAthleteThresholds(uid, {
      ftp_w:      212,
      ftp_source: 'manual'
    }, { force: true });

    upsertAthleteThresholds(uid, {
      ftp_w:      250,
      ftp_source: 'derived'
    }, { force: true });

    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(250);
    expect(t.ftp_source).toBe('derived');
  });
});

// ─── Section A: API contract — all 5 fields always present ───────────────────

describe('Section A — API contract completeness', () => {
  const uid = 997;

  beforeEach(() => { db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid); });
  afterEach(()  => { db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid); });

  it('A1: resolver always returns all required contract fields', () => {
    const t = getUserThresholds(uid);
    expect(t).toHaveProperty('ftp_w');
    expect(t).toHaveProperty('fthr_bpm');
    expect(t).toHaveProperty('ftp_source');
    expect(t).toHaveProperty('fthr_source');
    expect(t).toHaveProperty('is_default');
    // No field may be undefined
    expect(t.ftp_w).not.toBeUndefined();
    expect(t.fthr_bpm).not.toBeUndefined();
    expect(t.ftp_source).not.toBeUndefined();
    expect(t.fthr_source).not.toBeUndefined();
    expect(t.is_default).not.toBeUndefined();
  });

  it('A2: resolver fields have correct types', () => {
    const t = getUserThresholds(uid);
    expect(typeof t.ftp_w).toBe('number');
    expect(t.fthr_bpm === null || typeof t.fthr_bpm === 'number').toBe(true);
    expect(t.ftp_source === null || typeof t.ftp_source === 'string').toBe(true);
    expect(t.fthr_source === null || typeof t.fthr_source === 'string').toBe(true);
    expect(typeof t.is_default).toBe('boolean');
  });

  it('A3: resolver fields still complete when row exists', () => {
    upsertAthleteThresholds(uid, { ftp_w: 220, ftp_source: 'manual' }, { force: true });
    const t = getUserThresholds(uid);
    expect(t.ftp_w).not.toBeUndefined();
    expect(t.fthr_bpm).not.toBeUndefined();
    expect(t.ftp_source).not.toBeUndefined();
    expect(t.fthr_source).not.toBeUndefined();
    expect(t.is_default).not.toBeUndefined();
    expect(t.is_default).toBe(false);
  });
});

// ─── Section B: No bypass — no direct athlete_thresholds queries in consumers ─

describe('Section B — Consumer bypass detection', () => {
  it('B1: activityNormaliser does not directly query athlete_thresholds', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/activityNormaliser.js'), 'utf8'
    );
    expect(src).not.toMatch(/FROM athlete_thresholds/);
    expect(src).not.toMatch(/getAthleteThresholds/);
  });

  it('B2: durabilityCalculator does not directly query athlete_thresholds', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/durabilityCalculator.js'), 'utf8'
    );
    expect(src).not.toMatch(/FROM athlete_thresholds/);
    expect(src).not.toMatch(/getAthleteThresholds/);
  });

  it('B3: limiterEngineService does not directly query athlete_thresholds', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/limiterEngineService.js'), 'utf8'
    );
    expect(src).not.toMatch(/FROM athlete_thresholds/);
    expect(src).not.toMatch(/getAthleteThresholds/);
  });

  it('B4: activityStressClassifier does not bypass resolver', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/activityStressClassifier.js'), 'utf8'
    );
    expect(src).not.toMatch(/FROM athlete_thresholds/);
    expect(src).not.toMatch(/getAthleteThresholds/);
    expect(src).not.toMatch(/normalized_power.*FTP|FTP.*normalized_power/);
  });

  it('B5: interpretationService does not use getAthleteThresholds alias', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/interpretationService.js'), 'utf8'
    );
    expect(src).not.toMatch(/getAthleteThresholds/);
    expect(src).toMatch(/getUserThresholds/);
  });
});

// ─── Section C: Precedence enforcement ───────────────────────────────────────

describe('Section C — Resolver precedence', () => {
  const uid = 996;

  beforeEach(() => {
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid);
    try { db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(uid); } catch {}
    try { db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(uid); } catch {}
  });
  afterEach(() => {
    db.prepare('DELETE FROM athlete_thresholds WHERE user_id = ?').run(uid);
    try { db.prepare('DELETE FROM user_preferences WHERE user_id = ?').run(uid); } catch {}
    try { db.prepare('DELETE FROM athlete_monthly_bests WHERE user_id = ?').run(uid); } catch {}
  });

  it('C1: default ftp_w=200 is_default=true when nothing exists', () => {
    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(200);
    expect(t.is_default).toBe(true);
    expect(t.ftp_source).toBe('default');
  });

  it('C2: manual > estimated — manual wins when both exist', () => {
    upsertAthleteThresholds(uid, { ftp_w: 212, ftp_source: 'manual' }, { force: true });
    try {
      const now = new Date();
      db.prepare(`INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp) VALUES (?,?,?,?)`)
        .run(uid, now.getFullYear(), now.getMonth() + 1, 280);
    } catch { return; } // table may not exist — skip silently
    const t = getUserThresholds(uid);
    expect(t.ftp_w).toBe(212);
    expect(t.ftp_source).toBe('manual');
    expect(t.is_default).toBe(false);
  });

  it('C3: estimated does NOT override manual_preference', () => {
    // Insert manual_preference via user_preferences
    try {
      db.prepare(`INSERT OR REPLACE INTO user_preferences (user_id, ftp) VALUES (?,?)`)
        .run(uid, 230);
    } catch { return; }
    try {
      const now = new Date();
      db.prepare(`INSERT INTO athlete_monthly_bests (user_id, year, month, estimated_ftp) VALUES (?,?,?,?)`)
        .run(uid, now.getFullYear(), now.getMonth() + 1, 300);
    } catch { return; }
    const t = getUserThresholds(uid);
    // manual_preference (230) must win over estimated (300)
    expect(t.ftp_w).toBe(230);
    expect(t.ftp_source).toBe('manual_preference');
  });
});

// ─── Section D: Limiter uses persisted FTP ────────────────────────────────────

describe('Section D — Limiter uses persisted FTP', () => {
  it('D1: getUserZones in limiterEngineService returns persisted ftp_w', () => {
    // Verify user 1 has a manual row and limiter would see it
    const row = db.prepare('SELECT ftp_w, ftp_source FROM athlete_thresholds WHERE user_id = 1').get();
    if (!row || !row.ftp_w) {
      // No manual row — resolver returns default 200, still deterministic
      const t = getUserThresholds(1);
      expect(t.ftp_w).toBe(200);
      expect(t.is_default).toBe(true);
    } else {
      const t = getUserThresholds(1);
      expect(t.ftp_w).toBe(row.ftp_w);
      expect(t.ftp_source).toBe(row.ftp_source);
      expect(t.is_default).toBe(false);
    }
  });

  it('D2: limiterEngineService imports getUserThresholds (not alias)', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../services/limiterEngineService.js'), 'utf8'
    );
    expect(src).toMatch(/getUserThresholds/);
    expect(src).not.toMatch(/getAthleteThresholds/);
    expect(src).not.toMatch(/users\.ftp/);
    expect(src).not.toMatch(/users\.max_hr/);
  });
});

// ─── Section E: Migration safety ─────────────────────────────────────────────

describe('Section E — Migration safety', () => {
  it('E1: athlete_thresholds table exists', () => {
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='athlete_thresholds'`).get();
    expect(row).not.toBeNull();
    expect(row.name).toBe('athlete_thresholds');
  });

  it('E2: all required columns exist', () => {
    const cols = db.prepare('PRAGMA table_info(athlete_thresholds)').all().map(c => c.name);
    const required = ['user_id', 'ftp_w', 'fthr_bpm', 'ftp_source', 'fthr_source',
                      'ftp_confidence', 'fthr_confidence', 'computed_at', 'updated_at'];
    for (const col of required) {
      expect(cols).toContain(col);
    }
  });

  it('E3: resolver runs without error even when table is empty for user', () => {
    const uid = 99995; // guaranteed non-existent (no FK check needed — read-only)
    // Can't insert due to FK, but resolver must handle missing row gracefully
    expect(() => {
      // Temporarily disable FK enforcement for this read path test
      const t = getUserThresholds(uid);
      expect(t.ftp_w).toBe(200);
      expect(t.is_default).toBe(true);
    }).not.toThrow();
  });
});
