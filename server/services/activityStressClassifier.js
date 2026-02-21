/**
 * Activity Stress Classifier
 * 
 * Single source of truth for stress classification logic.
 * Analyses normalised metrics, durability data, and canonical streams
 * to classify the stress profile of an activity.
 * 
 * Algorithm Version: stress_v1
 * 
 * Output schema matches activity_stress table:
 *   primary_stress_type, is_stochastic,
 *   sustained_threshold_blocks, longest_threshold_block_s,
 *   vo2_blocks, longest_vo2_block_s, sprint_spikes,
 *   recovery_score, evidence, algo_version
 */

import db from '../db.js';
import zlib from 'zlib';
import { getUserThresholds } from './athleteThresholdsService.js';

function decompressStream(val, format) {
  if (!val) return null;
  try {
    if (format === 'json_gzip_base64') {
      return JSON.parse(zlib.gunzipSync(Buffer.from(val, 'base64')).toString('utf8'));
    }
    return JSON.parse(val);
  } catch { return null; }
}

const ALGO_VERSION = 'stress_v1';

// Power zone thresholds as fraction of FTP (default FTP assumed if not available)
const ZONE_THRESHOLDS = {
  Z1: 0.55,   // Active Recovery
  Z2: 0.75,   // Endurance
  Z3: 0.90,   // Tempo
  Z4: 1.05,   // Threshold (0.90 - 1.05 FTP)
  Z5: 1.20,   // VO2max (1.05 - 1.20 FTP)
  Z6: 1.50    // Anaerobic (above 1.20)
};

// Minimum block duration to count as sustained (seconds)
const MIN_THRESHOLD_BLOCK_S = 120;  // 2 minutes
const MIN_VO2_BLOCK_S = 60;         // 1 minute
const SPRINT_MIN_POWER_RATIO = 1.5; // 150% of FTP
const SPRINT_MAX_DURATION_S = 30;   // Max 30s to count as sprint

/**
 * Detect sustained blocks in a power stream at a given zone
 * 
 * @param {Array<number>} powerStream - Power values
 * @param {number} sampleInterval - Seconds between samples
 * @param {number} lowerBound - Lower power bound (watts)
 * @param {number} upperBound - Upper power bound (watts, Infinity for no cap)
 * @param {number} minDurationS - Minimum block duration in seconds
 * @returns {{ count: number, longestS: number, blocks: Array<{startIdx: number, endIdx: number, durationS: number}> }}
 */
function detectBlocks(powerStream, sampleInterval, lowerBound, upperBound, minDurationS) {
  const blocks = [];
  let blockStart = null;

  for (let i = 0; i <= powerStream.length; i++) {
    const p = i < powerStream.length ? powerStream[i] : 0;
    const inZone = p >= lowerBound && p < upperBound;

    if (inZone && blockStart === null) {
      blockStart = i;
    } else if (!inZone && blockStart !== null) {
      const durationS = (i - blockStart) * sampleInterval;
      if (durationS >= minDurationS) {
        blocks.push({ startIdx: blockStart, endIdx: i - 1, durationS });
      }
      blockStart = null;
    }
  }

  const longestS = blocks.length > 0 ? Math.max(...blocks.map(b => b.durationS)) : 0;
  return { count: blocks.length, longestS, blocks };
}

/**
 * Count sprint spikes in a power stream
 * 
 * @param {Array<number>} powerStream - Power values
 * @param {number} sampleInterval - Seconds between samples
 * @param {number} sprintThreshold - Watts threshold for sprint
 * @returns {number} Number of sprint spikes
 */
function countSprintSpikes(powerStream, sampleInterval, sprintThreshold) {
  let spikes = 0;
  let inSpike = false;
  let spikeStart = null;

  for (let i = 0; i < powerStream.length; i++) {
    if (powerStream[i] >= sprintThreshold && !inSpike) {
      inSpike = true;
      spikeStart = i;
    } else if ((powerStream[i] < sprintThreshold || i === powerStream.length - 1) && inSpike) {
      const durationS = (i - spikeStart) * sampleInterval;
      if (durationS <= SPRINT_MAX_DURATION_S) {
        spikes++;
      }
      inSpike = false;
      spikeStart = null;
    }
  }

  return spikes;
}

/**
 * Calculate stochasticity from power stream (Variability Index approach)
 * 
 * @param {Array<number>} powerStream - Power values
 * @returns {boolean} True if stochastic
 */
function isStochasticLoad(powerStream) {
  if (!powerStream || powerStream.length < 10) return false;

  const avg = powerStream.reduce((a, b) => a + b, 0) / powerStream.length;
  if (avg === 0) return false;

  // Calculate coefficient of variation
  const variance = powerStream.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / powerStream.length;
  const cv = Math.sqrt(variance) / avg;

  // CV > 0.25 indicates stochastic load (typical threshold for cycling)
  return cv > 0.25;
}

/**
 * Determine primary stress type from block analysis
 * 
 * @param {Object} analysis - Block analysis results
 * @returns {string} Primary stress type
 */
function determinePrimaryStressType(analysis) {
  const { thresholdBlocks, vo2Blocks, sprintSpikes, isStochastic, hasRecoveryProfile, durationS } = analysis;

  // Short easy ride = recovery
  if (hasRecoveryProfile) return 'recovery';

  // Race detection: high sustained effort + high stochasticity
  if (thresholdBlocks.count >= 2 && vo2Blocks.count >= 1 && sprintSpikes >= 3) return 'race';

  // Intervals: multiple distinct blocks of threshold or VO2
  if (thresholdBlocks.count >= 3 || vo2Blocks.count >= 2) return 'intervals';

  // Mixed: some blocks + stochastic
  if ((thresholdBlocks.count >= 1 || vo2Blocks.count >= 1) && isStochastic) return 'mixed';

  // Steady: long duration, low variability, few blocks
  if (thresholdBlocks.count <= 1 && vo2Blocks.count === 0 && !isStochastic) return 'steady';

  // Default
  return 'mixed';
}

/**
 * Calculate recovery score (0-1)
 * Low intensity, low duration, low variability = high recovery score
 * 
 * @param {Object} normalised - Normalised activity data
 * @param {Object} durability - Durability data (optional)
 * @returns {number|null} Recovery score 0-1, or null if not computable
 */
function calculateRecoveryScore(normalised, durability) {
  if (!normalised) return null;

  let score = 0;
  let factors = 0;

  // Low power fade = good recovery
  if (durability && durability.fade_power_pct !== null) {
    const fadePenalty = Math.min(Math.abs(durability.fade_power_pct) / 0.20, 1);
    score += (1 - fadePenalty);
    factors++;
  }

  // Low VI = steady effort = recovery-friendly
  if (normalised.vi !== null && normalised.vi !== undefined) {
    const viPenalty = Math.min(Math.max(normalised.vi - 1.0, 0) / 0.15, 1);
    score += (1 - viPenalty);
    factors++;
  }

  // Low HR drift = good recovery
  if (normalised.hr_drift_pct !== null && normalised.hr_drift_pct !== undefined) {
    const driftPenalty = Math.min(Math.abs(normalised.hr_drift_pct) / 0.10, 1);
    score += (1 - driftPenalty);
    factors++;
  }

  if (factors === 0) return null;
  return Math.max(0, Math.min(1, score / factors));
}

/**
 * Classify activity stress profile
 * 
 * @param {number} userId - User ID
 * @param {string} activityId - Activity ID
 * @returns {Object} Classification result matching activity_stress schema
 */
export function classifyActivityStress(userId, activityId) {
  // Get normalised data
  const normalised = db.prepare(`
    SELECT * FROM activity_normalised WHERE user_id = ? AND activity_id = ?
  `).get(userId, activityId);

  if (!normalised) {
    throw new Error(`Activity ${activityId} not normalised — cannot classify stress`);
  }

  // Get durability data (optional)
  const durability = db.prepare(`
    SELECT * FROM activity_durability WHERE user_id = ? AND activity_id = ?
  `).get(userId, activityId);

  // Get canonical streams (optional — needed for block detection)
  const streams = db.prepare(`
    SELECT * FROM activity_streams WHERE user_id = ? AND activity_id = ?
  `).get(userId, activityId);

  // Get user FTP from canonical resolver (deterministic, persisted)
  const activity = db.prepare(`
    SELECT avg_power, normalized_power, duration_s FROM activities WHERE id = ? AND user_id = ?
  `).get(activityId, userId);

  const estimatedFtp = getUserThresholds(userId).ftp_w;

  // Zone boundaries in watts
  const z4Lower = estimatedFtp * ZONE_THRESHOLDS.Z3;  // 0.90 * FTP
  const z4Upper = estimatedFtp * ZONE_THRESHOLDS.Z4;   // 1.05 * FTP
  const z5Lower = estimatedFtp * ZONE_THRESHOLDS.Z4;   // 1.05 * FTP
  const z5Upper = estimatedFtp * ZONE_THRESHOLDS.Z5;   // 1.20 * FTP
  const sprintThreshold = estimatedFtp * SPRINT_MIN_POWER_RATIO;

  // Default analysis (no streams available)
  let thresholdBlocks = { count: 0, longestS: 0, blocks: [] };
  let vo2Blocks = { count: 0, longestS: 0, blocks: [] };
  let sprintSpikes = 0;
  let stochastic = false;

  // If we have power streams, do full block analysis
  if (streams && streams.power) {
    try {
      const powerArray = decompressStream(streams.power, streams.stream_format);

      if (Array.isArray(powerArray) && powerArray.length > 0) {
        const sampleInterval = streams.sample_interval_s || 1;

        thresholdBlocks = detectBlocks(powerArray, sampleInterval, z4Lower, z4Upper, MIN_THRESHOLD_BLOCK_S);
        vo2Blocks = detectBlocks(powerArray, sampleInterval, z5Lower, z5Upper, MIN_VO2_BLOCK_S);
        sprintSpikes = countSprintSpikes(powerArray, sampleInterval, sprintThreshold);
        stochastic = isStochasticLoad(powerArray);
      }
    } catch (err) {
      console.warn(`[StressClassifier] Failed to parse power stream for ${activityId}:`, err.message);
    }
  } else {
    // Fallback: use normalised metrics for rough classification
    if (normalised.vi !== null && normalised.vi > 1.05) {
      stochastic = true;
    }

    // Use time_in_zones_power if available
    if (normalised.time_in_zones_power) {
      try {
        const tiz = JSON.parse(normalised.time_in_zones_power);
        const z4Seconds = tiz.Z4 || tiz.z4 || 0;
        const z5Seconds = tiz.Z5 || tiz.z5 || 0;

        if (z4Seconds >= MIN_THRESHOLD_BLOCK_S) {
          thresholdBlocks = { count: Math.ceil(z4Seconds / 300), longestS: Math.min(z4Seconds, 600), blocks: [] };
        }
        if (z5Seconds >= MIN_VO2_BLOCK_S) {
          vo2Blocks = { count: Math.ceil(z5Seconds / 180), longestS: Math.min(z5Seconds, 300), blocks: [] };
        }
      } catch (err) {
        // Ignore parse errors
      }
    }

    // Estimate sprint spikes from durability surge_count
    if (durability && durability.surge_count) {
      sprintSpikes = durability.surge_count;
    }
  }

  // Detect recovery profile
  const durationS = activity?.duration_s || normalised.duration_s || 0;
  const avgPower = normalised.avg_power || 0;
  const hasRecoveryProfile = (
    durationS < 5400 &&                          // < 90 min
    avgPower < estimatedFtp * 0.60 &&             // < 60% FTP
    thresholdBlocks.count === 0 &&
    vo2Blocks.count === 0 &&
    sprintSpikes === 0
  );

  // Determine primary stress type
  const analysis = {
    thresholdBlocks,
    vo2Blocks,
    sprintSpikes,
    isStochastic: stochastic,
    hasRecoveryProfile,
    durationS
  };

  const primaryStressType = determinePrimaryStressType(analysis);

  // Calculate recovery score
  const recoveryScore = calculateRecoveryScore(normalised, durability);

  // Build evidence object
  const evidence = {
    estimated_ftp: Math.round(estimatedFtp),
    has_streams: !!streams,
    vi: normalised.vi,
    power_fade_pct: durability?.fade_power_pct ?? null,
    hr_drift_pct: normalised.hr_drift_pct ?? null,
    avg_power: normalised.avg_power,
    duration_s: durationS,
    threshold_blocks_detail: thresholdBlocks.blocks.length > 0
      ? thresholdBlocks.blocks.map(b => ({ duration_s: b.durationS }))
      : null,
    vo2_blocks_detail: vo2Blocks.blocks.length > 0
      ? vo2Blocks.blocks.map(b => ({ duration_s: b.durationS }))
      : null
  };

  return {
    user_id: userId,
    activity_id: activityId,
    computed_at: new Date().toISOString(),
    algo_version: ALGO_VERSION,
    primary_stress_type: primaryStressType,
    is_stochastic: stochastic ? 1 : 0,
    sustained_threshold_blocks: thresholdBlocks.count,
    longest_threshold_block_s: thresholdBlocks.longestS,
    vo2_blocks: vo2Blocks.count,
    longest_vo2_block_s: vo2Blocks.longestS,
    sprint_spikes: sprintSpikes,
    recovery_score: recoveryScore,
    evidence: JSON.stringify(evidence)
  };
}

export default {
  classifyActivityStress,
  ALGO_VERSION
};
