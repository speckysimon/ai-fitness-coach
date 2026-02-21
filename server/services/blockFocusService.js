/**
 * Block Focus Resolver v1
 *
 * Determines the current training block focus with precedence:
 *   1) Limiter Engine  (limiter_profile_current, if recent)
 *   2) Season Planner  (next anchor race → mapped default focus)
 *   3) Global DEFAULT  (general build)
 *
 * Deterministic only. No AI. No plan generation.
 */

import db from '../db.js';

// ─── Config ───────────────────────────────────────────────────────────────────

const STALE_DAYS = 28;          // limiter profile older than this is considered stale
const NEVER_PRIMARY = new Set(['EXPOSURE_SENSITIVITY']);

// ─── Race type → focus mapping ────────────────────────────────────────────────

function mapRaceToFocus(race) {
  const type      = (race.race_type || '').toLowerCase();
  const notes     = (race.notes     || '').toLowerCase();
  const name      = (race.name      || '').toLowerCase();
  const elevation = race.elevation  || 0;

  const combined = `${type} ${notes} ${name}`;

  if (combined.includes('time_trial') || combined.includes('time trial') || combined.includes('tt')) {
    return {
      primary_limiter:   'THRESHOLD_UNDER_STRESS',
      secondary_limiter: 'VO2_CAPACITY_CEILING',
      rationale: ['Next anchor is a TT: focus on steady power output.'],
    };
  }

  if (elevation >= 1000 || combined.includes('hilly') || combined.includes('rolling') || combined.includes('climb')) {
    return {
      primary_limiter:   'THRESHOLD_UNDER_STRESS',
      secondary_limiter: 'LATE_RACE_RESILIENCE',
      rationale: ['Hilly/rolling race: climbing performance under fatigue.'],
    };
  }

  if (elevation < 400 && (combined.includes('crit') || combined.includes('criterium') || combined.includes('flat'))) {
    return {
      primary_limiter:   'ACCELERATION_REPEATABILITY',
      secondary_limiter: 'THRESHOLD_UNDER_STRESS',
      rationale: ['Flat/criterium-style race: repeated accelerations matter.'],
    };
  }

  // Generic road race fallback
  return {
    primary_limiter:   'THRESHOLD_UNDER_STRESS',
    secondary_limiter: 'LATE_RACE_RESILIENCE',
    rationale: ['General road race: threshold under fatigue is the key limiter.'],
  };
}

// ─── Global default ───────────────────────────────────────────────────────────

const GLOBAL_DEFAULT = {
  primary_limiter:   'THRESHOLD_UNDER_STRESS',
  secondary_limiter: 'LATE_RACE_RESILIENCE',
  source:            'DEFAULT',
  anchor_race:       null,
  rationale:         ['No race or limiter data: general build focus.'],
};

// ─── getLimiterEngineFocus ────────────────────────────────────────────────────

/**
 * Returns the limiter engine focus if it exists and is not stale.
 * Staleness: updated_at > STALE_DAYS ago, AND updated_at < last race-tagged activity.
 *
 * @param {number} athleteId
 * @param {string} asOfDate  YYYY-MM-DD
 * @returns {{ primary_limiter, secondary_limiter, updated_at } | null}
 */
export function getLimiterEngineFocus(athleteId, asOfDate) {
  const row = db.prepare(`
    SELECT profile_json, updated_at FROM limiter_profile_current WHERE athlete_id = ?
  `).get(athleteId);

  if (!row) return null;

  let profile;
  try { profile = JSON.parse(row.profile_json); } catch { return null; }

  if (!profile.primary_limiter) return null;

  // Staleness check
  const updatedAt  = new Date(row.updated_at || profile.as_of_date || 0);
  const asOf       = new Date(asOfDate + 'T00:00:00Z');
  const ageDays    = (asOf - updatedAt) / 86400000;

  if (ageDays > STALE_DAYS) {
    // Check if there's a newer race-tagged activity that post-dates the profile
    const lastRace = db.prepare(`
      SELECT MAX(DATE(start_time)) AS last_race_date
      FROM activities
      WHERE user_id = ? AND is_valid_for_analytics = 1
        AND (activity_type LIKE '%race%' OR activity_type LIKE '%Race%')
    `).get(athleteId);

    const lastRaceDate = lastRace?.last_race_date;
    if (!lastRaceDate || new Date(lastRaceDate) <= updatedAt) {
      // Profile is stale and no newer race → invalid
      return null;
    }
  }

  // Guard: EXPOSURE_SENSITIVITY must never be primary
  if (NEVER_PRIMARY.has(profile.primary_limiter)) return null;

  return {
    primary_limiter:   profile.primary_limiter,
    secondary_limiter: profile.secondary_limiter || null,
    updated_at:        row.updated_at || null,
  };
}

// ─── getNextAnchorRace ────────────────────────────────────────────────────────

/**
 * Returns the next upcoming anchor race (A/B preferred, then C).
 *
 * @param {number} athleteId
 * @param {string} asOfDate  YYYY-MM-DD
 * @returns {{ id, name, date, priority, race_type, elevation, distance } | null}
 */
export function getNextAnchorRace(athleteId, asOfDate) {
  // Try A or B first
  const anchor = db.prepare(`
    SELECT id, name, date, priority, race_type, elevation, distance, notes
    FROM season_races
    WHERE user_id = ?
      AND date >= ?
      AND priority IN ('A', 'B')
    ORDER BY
      CASE priority WHEN 'A' THEN 0 ELSE 1 END ASC,
      date ASC
    LIMIT 1
  `).get(athleteId, asOfDate);

  if (anchor) return anchor;

  // Fallback: next C race
  const fallback = db.prepare(`
    SELECT id, name, date, priority, race_type, elevation, distance, notes
    FROM season_races
    WHERE user_id = ?
      AND date >= ?
      AND priority = 'C'
    ORDER BY date ASC
    LIMIT 1
  `).get(athleteId, asOfDate);

  return fallback || null;
}

// ─── getResolvedBlockFocus ────────────────────────────────────────────────────

/**
 * Main resolver. Returns a stable focus object with source metadata.
 *
 * @param {number} athleteId
 * @param {string} [asOfDate]  YYYY-MM-DD (defaults to today)
 * @returns {{
 *   primary_limiter: string,
 *   secondary_limiter: string | null,
 *   source: "LIMITER_ENGINE" | "SEASON_PLANNER" | "DEFAULT",
 *   anchor_race: object | null,
 *   rationale: string[]
 * }}
 */
export function getResolvedBlockFocus(athleteId, asOfDate) {
  const today = asOfDate || new Date().toISOString().slice(0, 10);

  // ── 1) Limiter Engine ──────────────────────────────────────────────────────
  const limiterFocus = getLimiterEngineFocus(athleteId, today);
  if (limiterFocus) {
    return {
      primary_limiter:   limiterFocus.primary_limiter,
      secondary_limiter: limiterFocus.secondary_limiter,
      source:            'LIMITER_ENGINE',
      anchor_race:       null,
      rationale:         [
        `Limiter profile updated ${limiterFocus.updated_at ? limiterFocus.updated_at.slice(0, 10) : 'recently'}: using engine output.`,
      ],
    };
  }

  // ── 2) Season Planner ──────────────────────────────────────────────────────
  const anchor = getNextAnchorRace(athleteId, today);
  if (anchor) {
    const mapped = mapRaceToFocus(anchor);

    // Guard: EXPOSURE_SENSITIVITY must never be primary
    if (NEVER_PRIMARY.has(mapped.primary_limiter)) {
      mapped.primary_limiter = 'THRESHOLD_UNDER_STRESS';
    }

    return {
      primary_limiter:   mapped.primary_limiter,
      secondary_limiter: mapped.secondary_limiter,
      source:            'SEASON_PLANNER',
      anchor_race: {
        id:       anchor.id,
        name:     anchor.name,
        date:     anchor.date,
        priority: anchor.priority,
        type:     anchor.race_type || null,
      },
      rationale: mapped.rationale,
    };
  }

  // ── 3) Global default ──────────────────────────────────────────────────────
  return { ...GLOBAL_DEFAULT };
}

export default { getResolvedBlockFocus, getLimiterEngineFocus, getNextAnchorRace };
