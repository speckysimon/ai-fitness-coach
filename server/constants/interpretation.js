/**
 * Interpretation Engine Constants
 * 
 * Version control for activity interpretation schema and rules.
 * Increment version when payload structure or computation logic changes.
 */

export const INTERPRETATION_VERSION = 4;

/**
 * Decoupling calculation eligibility rules (v1)
 */
export const DECOUPLING_RULES = {
  MIN_DURATION_SECONDS: 30 * 60, // 30 minutes
  MIN_STEADY_TIME_SECONDS: 20 * 60, // 20 minutes in Z2
  MAX_HIGH_INTENSITY_SECONDS: 5 * 60, // Max 5 minutes in Z4+
  REQUIRES_POWER: true,
  REQUIRES_HR: true
};

/**
 * HR/Power mismatch thresholds (v1)
 * Used to flag when HR is disproportionately high relative to power intensity
 */
export const HR_POWER_MISMATCH_THRESHOLDS = {
  // If IF < 0.7 but avg HR > 85% max HR (proxy: >150 bpm for typical athlete)
  MODERATE_IF_THRESHOLD: 0.7,
  MODERATE_HR_THRESHOLD: 150
};

/**
 * Zone time keys (standard 7-zone model)
 */
export const ZONE_KEYS = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'];

/**
 * Interpretation flags (v1)
 */
export const FLAGS = {
  POWER_MISSING: 'power_missing',
  HR_MISSING: 'hr_missing',
  DECOUPLING_NOT_COMPUTABLE: 'decoupling_not_computable',
  DECOUPLING_PROXY: 'decoupling_proxy',
  DECOUPLING_REQUIRES_STREAMS: 'decoupling_requires_streams',
  HR_POWER_MISMATCH_MODERATE: 'hr_power_mismatch_moderate',
  // v4 stream-based flags
  STREAM_UNAVAILABLE: 'stream_unavailable',
  STEADY_BLOCK_NOT_FOUND: 'steady_block_not_found',
  INSUFFICIENT_STREAM_QUALITY: 'insufficient_stream_quality',
  MISSING_FTP_OR_FTHR: 'missing_ftp_or_fthr',
  HIGH_COASTING: 'high_coasting',
  HIGH_INTERVAL_DENSITY: 'high_interval_density'
};

export default {
  INTERPRETATION_VERSION,
  DECOUPLING_RULES,
  HR_POWER_MISMATCH_THRESHOLDS,
  ZONE_KEYS,
  FLAGS
};
