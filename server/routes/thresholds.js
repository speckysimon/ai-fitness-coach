/**
 * Thresholds Routes
 *
 * GET  /api/thresholds        — return current FTP/FTHR for authenticated user
 * POST /api/thresholds        — manually set FTP and/or FTHR (always overwrites)
 */

import express from 'express';
import { sessionDb, userDb } from '../db.js';
import { getUserThresholds, upsertAthleteThresholds } from '../services/athleteThresholdsService.js';

const router = express.Router();

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  const session = sessionDb.findByToken(token);
  if (!session) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  const user = userDb.findById(session.user_id);
  if (!user) return res.status(401).json({ ok: false, error: { code: 'UNAUTHENTICATED' } });
  req.user = { id: user.id, email: user.email };
  next();
}

// ─── GET /api/thresholds ──────────────────────────────────────────────────────

router.get('/', requireAuth, (req, res) => {
  try {
    const raw = getUserThresholds(req.user.id);
    const thresholds = {
      ftp_w:           raw.ftp_w           ?? 200,
      fthr_bpm:        raw.fthr_bpm        ?? null,
      ftp_source:      raw.ftp_source      ?? null,
      fthr_source:     raw.fthr_source     ?? null,
      ftp_confidence:  raw.ftp_confidence  ?? null,
      fthr_confidence: raw.fthr_confidence ?? null,
      is_default:      raw.is_default      ?? false,
    };
    return res.json({ ok: true, thresholds });
  } catch (err) {
    console.error('[Thresholds API] GET error:', err);
    return res.status(500).json({ ok: false, error: { code: 'THRESHOLDS_ERROR', message: err.message } });
  }
});

// ─── POST /api/thresholds ─────────────────────────────────────────────────────
//
// Body (at least one required):
//   ftp_w    integer  50..600
//   fthr_bpm integer  80..220
//
// Always writes with source='manual' and force=true (user intent is explicit).

router.post('/', requireAuth, (req, res) => {
  const { ftp_w, fthr_bpm } = req.body || {};

  if (ftp_w === undefined && fthr_bpm === undefined) {
    return res.status(400).json({ ok: false, error: { code: 'MISSING_FIELDS', message: 'Provide ftp_w and/or fthr_bpm' } });
  }

  // Validate ranges
  if (ftp_w !== undefined) {
    const v = Number(ftp_w);
    if (!Number.isInteger(v) || v < 50 || v > 600) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_FTP', message: 'ftp_w must be an integer between 50 and 600' } });
    }
  }
  if (fthr_bpm !== undefined) {
    const v = Number(fthr_bpm);
    if (!Number.isInteger(v) || v < 80 || v > 220) {
      return res.status(400).json({ ok: false, error: { code: 'INVALID_FTHR', message: 'fthr_bpm must be an integer between 80 and 220' } });
    }
  }

  try {
    const result = upsertAthleteThresholds(
      req.user.id,
      {
        ftp_w:       ftp_w   !== undefined ? Number(ftp_w)   : undefined,
        fthr_bpm:    fthr_bpm !== undefined ? Number(fthr_bpm) : undefined,
        ftp_source:  ftp_w   !== undefined ? 'manual' : undefined,
        fthr_source: fthr_bpm !== undefined ? 'manual' : undefined,
      },
      { force: true }
    );

    if (!result.success) {
      return res.status(500).json({ ok: false, error: { code: 'UPSERT_FAILED', message: result.error } });
    }

    const thresholds = getUserThresholds(req.user.id);
    return res.json({ ok: true, thresholds });
  } catch (err) {
    console.error('[Thresholds API] POST error:', err);
    return res.status(500).json({ ok: false, error: { code: 'THRESHOLDS_ERROR', message: err.message } });
  }
});

export default router;
