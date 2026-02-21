/**
 * Limiter Engine v1 — deterministic, no AI.
 * See spec for full rules.
 */

import db from '../db.js';
import { getUserThresholds } from './athleteThresholdsService.js';

const ALGO_VERSION = 'limiter_v1';

export const LIMITERS = [
  'ACCELERATION_REPEATABILITY',
  'THRESHOLD_UNDER_STRESS',
  'LATE_RACE_RESILIENCE',
  'VO2_CAPACITY_CEILING',
  'EXPOSURE_SENSITIVITY',
];

const TIEBREAK_ORDER = {
  ACCELERATION_REPEATABILITY: 0,
  THRESHOLD_UNDER_STRESS:     1,
  LATE_RACE_RESILIENCE:       2,
  VO2_CAPACITY_CEILING:       3,
  EXPOSURE_SENSITIVITY:       4,
};

const RACE_IMPACT_WEIGHT = {
  ACCELERATION_REPEATABILITY: 1.00,
  THRESHOLD_UNDER_STRESS:     0.95,
  LATE_RACE_RESILIENCE:       0.90,
  VO2_CAPACITY_CEILING:       0.85,
  EXPOSURE_SENSITIVITY:       0.70,
};

const FLAG_THRESHOLD            = 0.25;
const STRONG_REAPPEAR_THRESHOLD = 0.55;
const ABSOLUTE_SECONDARY_THRESHOLD = 0.15;
const DECAY_WINDOW              = 3;

// ─── DB helpers ───────────────────────────────────────────────────────────────

function clamp01(v) { return Math.max(0, Math.min(1, v ?? 0)); }

function getActivity(activityId) {
  return db.prepare(`
    SELECT a.*, rt.is_race, rt.race_type
    FROM activities a
    LEFT JOIN race_tags rt ON rt.activity_id = a.id AND rt.user_id = a.user_id
    WHERE a.id = ?
  `).get(activityId);
}

function getUserZones(userId) {
  const t = getUserThresholds(userId);
  return { ftp: t.ftp_w, maxHr: t.fthr_bpm ? Math.round(t.fthr_bpm / 0.92) : null };
}

function getCurrentProfile(athleteId) {
  const row = db.prepare(`SELECT profile_json FROM limiter_profile_current WHERE athlete_id = ?`).get(athleteId);
  if (!row) return null;
  try { return JSON.parse(row.profile_json); } catch { return null; }
}

function getLast3RaceActivityIds(athleteId) {
  return db.prepare(`
    SELECT activity_id FROM limiter_race_updates
    WHERE athlete_id = ? ORDER BY created_at DESC LIMIT ?
  `).all(athleteId, DECAY_WINDOW).map(r => r.activity_id);
}

// ─── computeLimiterSignals ────────────────────────────────────────────────────

export function computeLimiterSignals(activityId) {
  const activity   = getActivity(activityId);
  const normalised = db.prepare(`SELECT * FROM activity_normalised WHERE activity_id = ?`).get(activityId);
  const durability = db.prepare(`SELECT * FROM activity_durability WHERE activity_id = ?`).get(activityId);
  const stress     = db.prepare(`SELECT * FROM activity_stress WHERE activity_id = ?`).get(activityId);
  const zones      = activity?.user_id ? getUserZones(activity.user_id) : { ftp: null, maxHr: null };

  function zero(reason) { return { severity_raw: 0, confidence: 0, evidence: { missing: reason } }; }

  const signals = {};

  // ACCELERATION_REPEATABILITY
  {
    let sev = 0, conf = 0;
    const ev = {};
    let factors = 0;
    if (stress) {
      const spikes = stress.sprint_spikes ?? 0;
      sev  += clamp01(1 - spikes / 8) * 0.4;
      conf += 0.4;
      if (stress.is_stochastic === 1) { sev += 0.2; conf += 0.1; }
      ev.sprint_spikes = spikes;
      ev.is_stochastic = stress.is_stochastic === 1;
      factors++;
    } else { ev.missing_stress = true; }
    if (durability) {
      const surges = (durability.surge_count ?? 0) + (durability.repeat_hard_efforts ?? 0);
      sev  += clamp01(1 - surges / 10) * 0.4;
      conf += 0.4;
      ev.surge_count = durability.surge_count ?? 0;
      ev.repeat_hard_efforts = durability.repeat_hard_efforts ?? 0;
      factors++;
    } else { ev.missing_durability = true; }
    if (normalised?.vi != null) {
      sev  += clamp01((normalised.vi - 1.0) / 0.3) * 0.2;
      conf += 0.2;
      ev.vi = normalised.vi;
    }
    signals.ACCELERATION_REPEATABILITY = factors === 0 ? zero('no_stress_or_durability_data')
      : { severity_raw: clamp01(sev), confidence: clamp01(conf), evidence: ev };
  }

  // THRESHOLD_UNDER_STRESS
  {
    let sev = 0, conf = 0;
    const ev = {};
    let factors = 0;
    if (stress) {
      const blocks = stress.sustained_threshold_blocks ?? 0;
      const longestS = stress.longest_threshold_block_s ?? 0;
      sev  += (clamp01(1 - blocks / 4) * 0.5 + clamp01(1 - longestS / 600) * 0.5) * 0.5;
      conf += 0.5;
      ev.threshold_blocks = blocks;
      ev.longest_threshold_block_s = longestS;
      factors++;
    } else { ev.missing_stress = true; }
    if (normalised && zones.ftp) {
      const np = normalised.np ?? normalised.avg_power ?? 0;
      const ratio = np / zones.ftp;
      sev  += clamp01(1 - ratio / 0.85) * 0.3;
      conf += 0.3;
      ev.np_ftp_ratio = Math.round(ratio * 100) / 100;
      factors++;
    } else if (!zones.ftp) { ev.missing_ftp = true; }
    if (normalised?.hr_drift_pct != null) {
      sev  += clamp01(Math.abs(normalised.hr_drift_pct) / 15) * 0.2;
      conf += 0.2;
      ev.hr_drift_pct = normalised.hr_drift_pct;
    }
    signals.THRESHOLD_UNDER_STRESS = factors === 0 ? zero('no_stress_or_power_data')
      : { severity_raw: clamp01(sev), confidence: clamp01(conf), evidence: ev };
  }

  // LATE_RACE_RESILIENCE
  {
    let sev = 0, conf = 0;
    const ev = {};
    let factors = 0;
    const fadePct = normalised?.power_fade_pct ?? durability?.fade_power_pct ?? null;
    if (fadePct != null) {
      sev  += clamp01(fadePct / 20) * 0.5;
      conf += 0.5;
      ev.power_fade_pct = fadePct;
      factors++;
    } else { ev.missing_power_fade = true; }
    if (durability) {
      if (durability.efficiency_drop_pct != null) {
        sev  += clamp01(durability.efficiency_drop_pct / 20) * 0.25;
        conf += 0.25;
        ev.efficiency_drop_pct = durability.efficiency_drop_pct;
      }
      if (durability.late_threshold_score != null) {
        sev  += clamp01(1 - durability.late_threshold_score / 0.3) * 0.25;
        conf += 0.25;
        ev.late_threshold_score = durability.late_threshold_score;
      }
      factors++;
    } else { ev.missing_durability = true; }
    if (normalised?.hr_drift_pct != null) {
      sev  += clamp01(Math.abs(normalised.hr_drift_pct) / 12) * 0.1;
      conf += 0.1;
      ev.hr_drift_pct = normalised.hr_drift_pct;
    }
    signals.LATE_RACE_RESILIENCE = factors === 0 ? zero('no_fade_or_durability_data')
      : { severity_raw: clamp01(sev), confidence: clamp01(conf), evidence: ev };
  }

  // VO2_CAPACITY_CEILING
  {
    let sev = 0, conf = 0;
    const ev = {};
    let factors = 0;
    if (stress) {
      const vo2 = stress.vo2_blocks ?? 0;
      const longestVo2 = stress.longest_vo2_block_s ?? 0;
      sev  += (clamp01(1 - vo2 / 3) * 0.5 + clamp01(1 - longestVo2 / 300) * 0.5) * 0.6;
      conf += 0.6;
      ev.vo2_blocks = vo2;
      ev.longest_vo2_block_s = longestVo2;
      factors++;
    } else { ev.missing_stress = true; }
    if (normalised && zones.maxHr && normalised.avg_hr) {
      const hrRatio = normalised.avg_hr / zones.maxHr;
      sev  += clamp01(1 - hrRatio / 0.90) * 0.4;
      conf += 0.4;
      ev.avg_hr_pct_max = Math.round(hrRatio * 100);
      factors++;
    } else if (!zones.maxHr) { ev.missing_max_hr = true; }
    signals.VO2_CAPACITY_CEILING = factors === 0 ? zero('no_stress_or_hr_data')
      : { severity_raw: clamp01(sev), confidence: clamp01(conf), evidence: ev };
  }

  // EXPOSURE_SENSITIVITY (context modifier only, never Primary)
  {
    let sev = 0, conf = 0;
    const ev = {};
    let factors = 0;
    if (stress?.is_stochastic === 1) { sev += 0.3; conf += 0.3; ev.is_stochastic = true; factors++; }
    if (normalised?.vi != null) {
      sev  += clamp01((normalised.vi - 1.0) / 0.4) * 0.3;
      conf += 0.3;
      ev.vi = normalised.vi;
      factors++;
    }
    if (normalised?.hr_drift_pct != null) {
      sev  += clamp01(Math.abs(normalised.hr_drift_pct) / 20) * 0.4;
      conf += 0.4;
      ev.hr_drift_pct = normalised.hr_drift_pct;
      factors++;
    }
    signals.EXPOSURE_SENSITIVITY = factors === 0 ? zero('no_stochastic_or_hr_data')
      : { severity_raw: clamp01(sev), confidence: clamp01(conf), evidence: ev };
  }

  return signals;
}

// ─── applyDebriefWeighting ────────────────────────────────────────────────────

export function applyDebriefWeighting(signals, debriefJson) {
  if (!debriefJson) return signals;
  let answers;
  try { answers = typeof debriefJson === 'string' ? JSON.parse(debriefJson) : debriefJson; }
  catch { return signals; }

  const out = {};
  for (const k of LIMITERS) out[k] = { ...signals[k], evidence: { ...signals[k].evidence } };

  if (answers.felt_limited_by && LIMITERS.includes(answers.felt_limited_by)) {
    out[answers.felt_limited_by].confidence = clamp01(out[answers.felt_limited_by].confidence + 0.25);
    out[answers.felt_limited_by].evidence.debrief_felt_limited_by = true;
  }
  if (answers.felt_strong_in && LIMITERS.includes(answers.felt_strong_in)) {
    out[answers.felt_strong_in].confidence = clamp01(out[answers.felt_strong_in].confidence - 0.15);
    out[answers.felt_strong_in].evidence.debrief_felt_strong_in = true;
  }
  if ((answers.perceived_exertion ?? 0) >= 9) {
    out.LATE_RACE_RESILIENCE.confidence = clamp01(out.LATE_RACE_RESILIENCE.confidence + 0.15);
    out.LATE_RACE_RESILIENCE.evidence.debrief_high_rpe = answers.perceived_exertion;
  }
  if (answers.legs_felt_heavy === true) {
    out.ACCELERATION_REPEATABILITY.confidence = clamp01(out.ACCELERATION_REPEATABILITY.confidence + 0.15);
    out.ACCELERATION_REPEATABILITY.evidence.debrief_legs_heavy = true;
  }
  if (answers.breathing_limited === true) {
    out.VO2_CAPACITY_CEILING.confidence = clamp01(out.VO2_CAPACITY_CEILING.confidence + 0.20);
    out.VO2_CAPACITY_CEILING.evidence.debrief_breathing_limited = true;
  }
  if (answers.couldnt_follow_attacks === true) {
    out.ACCELERATION_REPEATABILITY.confidence = clamp01(out.ACCELERATION_REPEATABILITY.confidence + 0.20);
    out.ACCELERATION_REPEATABILITY.evidence.debrief_couldnt_follow_attacks = true;
  }
  if (answers.struggled_to_hold_pace === true) {
    out.THRESHOLD_UNDER_STRESS.confidence = clamp01(out.THRESHOLD_UNDER_STRESS.confidence + 0.20);
    out.THRESHOLD_UNDER_STRESS.evidence.debrief_struggled_pace = true;
  }
  return out;
}

// ─── computeDecayFromLast3 ────────────────────────────────────────────────────

export function computeDecayFromLast3(athleteId) {
  const last3Ids = getLast3RaceActivityIds(athleteId);
  const result = {};
  for (const l of LIMITERS) result[l] = { flaggedCount: 0, totalRaces: last3Ids.length };

  for (const actId of last3Ids) {
    const row = db.prepare(`SELECT update_json FROM limiter_race_updates WHERE activity_id = ?`).get(actId);
    if (!row) continue;
    try {
      const update = JSON.parse(row.update_json);
      for (const l of LIMITERS) {
        const ls = update.signals?.[l];
        if (ls && ls.severity_raw * ls.confidence >= FLAG_THRESHOLD) result[l].flaggedCount++;
      }
    } catch { /* skip */ }
  }
  return result;
}

// ─── rankLimiters ─────────────────────────────────────────────────────────────

export function rankLimiters(profile) {
  const scored = LIMITERS.map(name => {
    const e = profile[name] || { severity: 0, confidence: 0 };
    const finalScore = (e.severity || 0) * (e.confidence || 0) * RACE_IMPACT_WEIGHT[name];
    return { name, finalScore, severity: e.severity || 0, confidence: e.confidence || 0 };
  });

  scored.sort((a, b) => {
    const fd = b.finalScore - a.finalScore;
    if (Math.abs(fd) > 1e-9) return fd;
    const wd = RACE_IMPACT_WEIGHT[b.name] - RACE_IMPACT_WEIGHT[a.name];
    if (Math.abs(wd) > 1e-9) return wd;
    const cd = b.confidence - a.confidence;
    if (Math.abs(cd) > 1e-9) return cd;
    return TIEBREAK_ORDER[a.name] - TIEBREAK_ORDER[b.name];
  });

  let primary = null;
  for (const s of scored) {
    if (s.name === 'EXPOSURE_SENSITIVITY') continue;
    if ((profile[s.name]?.absent_count || 0) >= DECAY_WINDOW) continue;
    primary = s;
    break;
  }
  if (!primary) primary = scored.find(s => s.name !== 'EXPOSURE_SENSITIVITY') || scored[0];

  let secondary = null;
  for (const s of scored) {
    if (s.name === primary.name) continue;
    if (s.finalScore >= primary.finalScore * 0.75 && s.finalScore >= ABSOLUTE_SECONDARY_THRESHOLD) {
      secondary = s;
      break;
    }
  }

  return { primary: primary?.name || null, secondary: secondary?.name || null, ranked: scored };
}

// ─── Recommendation builder ───────────────────────────────────────────────────

const FOCUS_TYPE_MAP = {
  ACCELERATION_REPEATABILITY: 'ACCEL_REPEAT_BLOCK',
  THRESHOLD_UNDER_STRESS:     'THRESHOLD_STRESS_BLOCK',
  LATE_RACE_RESILIENCE:       'LATE_RACE_BLOCK',
  VO2_CAPACITY_CEILING:       'VO2_CEILING_BLOCK',
  EXPOSURE_SENSITIVITY:       'EXPOSURE_BLOCK',
};

const WHAT_CHANGED_MAP = {
  ACCELERATION_REPEATABILITY: ['Sprint repeatability identified as primary limiter', 'Surge count and stochasticity below race threshold', 'Variability index elevated during race effort'],
  THRESHOLD_UNDER_STRESS:     ['Sustained threshold output under race stress is limiting', 'Threshold block count and duration below target', 'NP/FTP ratio indicates pacing conservatism under pressure'],
  LATE_RACE_RESILIENCE:       ['Power fade in final third exceeds acceptable range', 'Late-race efficiency drop detected', 'HR drift indicates cardiac fatigue accumulation'],
  VO2_CAPACITY_CEILING:       ['VO2max zone exposure limited during race', 'Aerobic ceiling preventing higher sustained output', 'HR ceiling not reached — VO2 capacity underutilised'],
  EXPOSURE_SENSITIVITY:       ['Race-condition sensitivity detected as secondary factor', 'High variability and HR drift suggest context sensitivity', 'Tactical exposure to race dynamics needs development'],
};

const TACTICAL_NOTES_MAP = {
  ACCELERATION_REPEATABILITY: ['Include 8–12 sprint efforts with 30–60s recovery in weekly sessions', 'Prioritise group rides with repeated surges over steady-state work'],
  THRESHOLD_UNDER_STRESS:     ['Add race-simulation blocks: 2×20min at 90–95% FTP with race-pace surges', 'Practice holding threshold power after VO2 efforts'],
  LATE_RACE_RESILIENCE:       ['Build durability with 3h+ rides at 70–75% FTP before adding intensity', 'Include "fade-resistance" sets: hard effort in final 20% of long ride'],
  VO2_CAPACITY_CEILING:       ['Add 3–5min VO2max intervals (2–4 reps) twice per week', 'Short hill repeats (3–5min) at maximal aerobic power'],
  EXPOSURE_SENSITIVITY:       ['Increase race-simulation exposure: criteriums, group rides, mass-start events', 'Practice tactical positioning and surge response in training races', 'Note: this is a context modifier — address primary limiter first'],
};

function buildRecommendation(primary, secondary) {
  if (!primary) return null;
  const tacticalNotes = [...TACTICAL_NOTES_MAP[primary]];
  if (secondary === 'EXPOSURE_SENSITIVITY') tacticalNotes.push(...TACTICAL_NOTES_MAP.EXPOSURE_SENSITIVITY);
  return {
    primary_limiter:   primary,
    secondary_limiter: secondary || null,
    focus_type:        FOCUS_TYPE_MAP[primary],
    what_changed:      WHAT_CHANGED_MAP[primary].slice(0, 3),
    tactical_notes:    tacticalNotes,
    algo_version:      ALGO_VERSION,
  };
}

// ─── updateFromRace ───────────────────────────────────────────────────────────

export function updateFromRace(athleteId, activityId) {
  const activity = getActivity(activityId);
  if (!activity) return { ok: false, error: 'ACTIVITY_NOT_FOUND' };
  if (!activity.is_race) return { ok: false, error: 'NOT_RACE_TAGGED' };

  const now = new Date().toISOString();

  // 1. Compute signals
  const rawSignals = computeLimiterSignals(activityId);

  // 2. Apply debrief weighting (confidence only)
  const debriefRow = db.prepare(`SELECT answers_json FROM race_debrief WHERE activity_id = ?`).get(activityId);
  const signals = applyDebriefWeighting(rawSignals, debriefRow?.answers_json || null);

  // 3. Load current profile (or build empty)
  const currentProfile = getCurrentProfile(athleteId) || {};
  const profile = {};
  for (const l of LIMITERS) {
    profile[l] = currentProfile[l] || { severity: 0, confidence: 0, absent_count: 0, last_flagged_race_id: null, last_flagged_date: null };
  }

  // 4. Apply decay from last 3 races (before merging new signals)
  const decayStats = computeDecayFromLast3(athleteId);
  for (const l of LIMITERS) {
    const { flaggedCount, totalRaces } = decayStats[l];
    if (totalRaces >= DECAY_WINDOW && flaggedCount === 0) {
      profile[l].confidence = clamp01(profile[l].confidence * 0.6);
      profile[l].severity   = clamp01(profile[l].severity   * 0.7);
      profile[l].absent_count = (profile[l].absent_count || 0) + 1;
    } else if (flaggedCount > 0) {
      profile[l].absent_count = 0;
    }
  }

  // 5. Merge new signals into profile
  for (const l of LIMITERS) {
    const sig = signals[l];
    const newScore = sig.severity_raw * sig.confidence;

    // Strong reappearance: immediately override
    if (newScore >= STRONG_REAPPEAR_THRESHOLD) {
      profile[l].severity   = sig.severity_raw;
      profile[l].confidence = sig.confidence;
      profile[l].absent_count = 0;
    } else {
      // Weighted merge: new signal gets 60% weight, existing 40%
      profile[l].severity   = clamp01(sig.severity_raw * 0.6 + profile[l].severity   * 0.4);
      profile[l].confidence = clamp01(sig.confidence   * 0.6 + profile[l].confidence * 0.4);
    }

    profile[l].evidence_json = JSON.stringify(sig.evidence);

    // Update flag tracking
    if (newScore >= FLAG_THRESHOLD) {
      profile[l].last_flagged_race_id = activityId;
      profile[l].last_flagged_date    = activity.start_time || now;
      profile[l].absent_count         = 0;
    }
  }

  // 6. Rank
  const { primary, secondary, ranked } = rankLimiters(profile);
  profile.primary_limiter   = primary;
  profile.secondary_limiter = secondary;
  profile.as_of_date        = now;
  profile.algo_version      = ALGO_VERSION;

  // 7. Build recommendation
  const recommendation = buildRecommendation(primary, secondary);

  // 8. Persist — all idempotent via UNIQUE(activity_id)
  const profileJson = JSON.stringify(profile);

  // Upsert current profile
  db.prepare(`
    INSERT INTO limiter_profile_current (athlete_id, profile_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(athlete_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at
  `).run(athleteId, profileJson, now);

  // Snapshot (idempotent via UNIQUE source_activity_id)
  db.prepare(`
    INSERT OR IGNORE INTO limiter_profile_snapshots (athlete_id, source_activity_id, profile_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(athleteId, activityId, profileJson, now);

  // Race update record (idempotent via UNIQUE activity_id)
  const updateJson = JSON.stringify({ signals, ranked, primary, secondary, algo_version: ALGO_VERSION });
  db.prepare(`
    INSERT OR IGNORE INTO limiter_race_updates (athlete_id, activity_id, update_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(athleteId, activityId, updateJson, now);

  return {
    ok: true,
    profile,
    recommendation,
    summary: {
      primary_limiter:   primary,
      secondary_limiter: secondary,
      signals_computed:  Object.fromEntries(LIMITERS.map(l => [l, {
        severity_raw: signals[l].severity_raw,
        confidence:   signals[l].confidence,
        final_score:  signals[l].severity_raw * signals[l].confidence * RACE_IMPACT_WEIGHT[l],
        flagged:      signals[l].severity_raw * signals[l].confidence >= FLAG_THRESHOLD,
      }])),
    },
  };
}

export default {
  LIMITERS,
  ALGO_VERSION,
  computeLimiterSignals,
  applyDebriefWeighting,
  computeDecayFromLast3,
  rankLimiters,
  updateFromRace,
};
