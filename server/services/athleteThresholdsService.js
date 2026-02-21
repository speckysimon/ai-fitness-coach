/**
 * Athlete Thresholds Service
 *
 * Single source of truth for FTP and FTHR across all analytics consumers.
 *
 * Precedence (getUserThresholds):
 *   1. athlete_thresholds row (any source)
 *   2. user_preferences.ftp (if table exists)
 *   3. athlete_monthly_bests estimated_ftp within 90 days (if table exists)
 *   4. Hardcoded default: ftp_w=200, is_default=true
 *
 * Manual values (source='manual') are NEVER overwritten by derived/computed
 * unless force=true is passed to upsertAthleteThresholds.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const db = require('../db.js').default || require('../db.js');

const DEFAULT_FTP = 200;

/**
 * Unified resolver — used by ALL analytics consumers.
 *
 * @param {number} userId
 * @returns {{
 *   ftp_w: number,
 *   fthr_bpm: number|null,
 *   ftp_source: string,
 *   fthr_source: string|null,
 *   ftp_confidence: number|null,
 *   fthr_confidence: number|null,
 *   is_default: boolean
 * }}
 */
export function getUserThresholds(userId) {
  if (!userId) {
    return { ftp_w: DEFAULT_FTP, fthr_bpm: null, ftp_source: 'default', fthr_source: null, ftp_confidence: null, fthr_confidence: null, is_default: true };
  }

  // 1. athlete_thresholds (primary store)
  const row = db.prepare(`
    SELECT ftp_w, fthr_bpm, ftp_source, fthr_source, ftp_confidence, fthr_confidence
    FROM athlete_thresholds WHERE user_id = ?
  `).get(userId);

  if (row?.ftp_w) {
    return {
      ftp_w:           row.ftp_w,
      fthr_bpm:        row.fthr_bpm || null,
      ftp_source:      row.ftp_source || 'stored',
      fthr_source:     row.fthr_source || null,
      ftp_confidence:  row.ftp_confidence ?? null,
      fthr_confidence: row.fthr_confidence ?? null,
      is_default:      false
    };
  }

  // 2. user_preferences.ftp (manual preference table)
  try {
    const pref = db.prepare(`SELECT ftp FROM user_preferences WHERE user_id = ?`).get(userId);
    if (pref?.ftp) {
      return {
        ftp_w:           pref.ftp,
        fthr_bpm:        row?.fthr_bpm || null,
        ftp_source:      'manual_preference',
        fthr_source:     row?.fthr_source || null,
        ftp_confidence:  null,
        fthr_confidence: null,
        is_default:      false
      };
    }
  } catch { /* table may not exist */ }

  // 3. athlete_monthly_bests estimated_ftp within 90 days
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const estimated = db.prepare(`
      SELECT estimated_ftp, year, month
      FROM athlete_monthly_bests
      WHERE user_id = ? AND estimated_ftp IS NOT NULL AND estimated_ftp > 0
      ORDER BY year DESC, month DESC LIMIT 1
    `).get(userId);
    if (estimated?.estimated_ftp) {
      const estimateDate = new Date(estimated.year, estimated.month - 1, 1);
      if (estimateDate >= cutoff) {
        return {
          ftp_w:           estimated.estimated_ftp,
          fthr_bpm:        row?.fthr_bpm || null,
          ftp_source:      'estimated',
          fthr_source:     row?.fthr_source || null,
          ftp_confidence:  null,
          fthr_confidence: null,
          is_default:      false
        };
      }
    }
  } catch { /* table may not exist */ }

  // 4. Hardcoded default
  return {
    ftp_w:           DEFAULT_FTP,
    fthr_bpm:        row?.fthr_bpm || null,
    ftp_source:      'default',
    fthr_source:     row?.fthr_source || null,
    ftp_confidence:  null,
    fthr_confidence: null,
    is_default:      true
  };
}

/**
 * Persist thresholds to athlete_thresholds.
 *
 * @param {number} userId
 * @param {{ ftp_w?: number, fthr_bpm?: number, ftp_source?: string, fthr_source?: string, ftp_confidence?: number, fthr_confidence?: number }} values
 * @param {{ force?: boolean }} opts  force=true overwrites manual values
 * @returns {{ success: boolean, skipped?: boolean, error?: string }}
 */
export function upsertAthleteThresholds(userId, values, opts = {}) {
  if (!userId) return { success: false, error: 'Invalid user ID' };

  try {
    const existing = db.prepare(`SELECT ftp_source, fthr_source FROM athlete_thresholds WHERE user_id = ?`).get(userId);
    const force = opts.force === true;

    // Protect manual FTP from being overwritten by derived/computed
    const ftpIsManual = existing?.ftp_source === 'manual';
    const fthrIsManual = existing?.fthr_source === 'manual';

    const newFtp  = (!ftpIsManual  || force) ? (values.ftp_w   ?? null) : undefined;
    const newFthr = (!fthrIsManual || force) ? (values.fthr_bpm ?? null) : undefined;

    if (newFtp === undefined && newFthr === undefined) {
      return { success: true, skipped: true };
    }

    const now = new Date().toISOString();

    // Merge: start from existing row, apply new values where not protected
    const merged = {
      ftp_w:           newFtp  !== undefined ? newFtp  : (existing?.ftp_w   ?? null),
      fthr_bpm:        newFthr !== undefined ? newFthr : (existing?.fthr_bpm ?? null),
      ftp_source:      newFtp  !== undefined ? (values.ftp_source  || 'derived') : (existing?.ftp_source  ?? null),
      fthr_source:     newFthr !== undefined ? (values.fthr_source || 'derived') : (existing?.fthr_source ?? null),
      ftp_confidence:  values.ftp_confidence  ?? (existing?.ftp_confidence  ?? null),
      fthr_confidence: values.fthr_confidence ?? (existing?.fthr_confidence ?? null),
    };

    db.prepare(`
      INSERT INTO athlete_thresholds
        (user_id, ftp_w, fthr_bpm, ftp_source, fthr_source, ftp_confidence, fthr_confidence, computed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        ftp_w           = excluded.ftp_w,
        fthr_bpm        = excluded.fthr_bpm,
        ftp_source      = excluded.ftp_source,
        fthr_source     = excluded.fthr_source,
        ftp_confidence  = excluded.ftp_confidence,
        fthr_confidence = excluded.fthr_confidence,
        computed_at     = excluded.computed_at,
        updated_at      = excluded.updated_at
    `).run(
      userId,
      merged.ftp_w, merged.fthr_bpm,
      merged.ftp_source, merged.fthr_source,
      merged.ftp_confidence, merged.fthr_confidence,
      now, now
    );

    return { success: true, skipped: false };
  } catch (err) {
    console.error('[AthleteThresholds] upsert error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Backward-compat alias for setAthleteThresholds (manual write, always overwrites).
 */
export function setAthleteThresholds(userId, ftp_w = null, fthr_bpm = null) {
  return upsertAthleteThresholds(
    userId,
    { ftp_w, fthr_bpm, ftp_source: ftp_w ? 'manual' : null, fthr_source: fthr_bpm ? 'manual' : null },
    { force: true }
  );
}

/**
 * Backward-compat alias — returns same shape as before.
 */
export function getAthleteThresholds(userId) {
  const t = getUserThresholds(userId);
  return {
    ftp_w:       t.is_default ? null : t.ftp_w,
    fthr_bpm:    t.fthr_bpm,
    ftp_source:  t.is_default ? null : t.ftp_source,
    fthr_source: t.fthr_source
  };
}

export default {
  getUserThresholds,
  upsertAthleteThresholds,
  getAthleteThresholds,
  setAthleteThresholds
};
