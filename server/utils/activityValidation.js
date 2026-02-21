/**
 * Activity Validation Utilities
 * 
 * Defines rules for determining if an activity is valid (has meaningful data)
 * vs a shell activity (placeholder with no metrics).
 */

/**
 * Check if an activity is valid (has meaningful data)
 * 
 * Valid cycling activity must have:
 * - Duration >= 60 seconds (1 minute minimum)
 * - At least one meaningful metric: distance, power, or HR
 * 
 * @param {Object} activity - Activity object with metrics
 * @returns {boolean} True if valid, false if shell
 */
export function isValidActivity(activity) {
  // Must have minimum duration
  const hasDuration = activity.duration_s && activity.duration_s >= 60;
  
  // Must have at least one meaningful metric
  const hasDistance = activity.distance_m && activity.distance_m > 0;
  const hasPower = activity.avg_power && activity.avg_power > 0;
  const hasHR = activity.avg_hr && activity.avg_hr > 0;
  
  return hasDuration && (hasDistance || hasPower || hasHR);
}

/**
 * Determine why an activity is considered a shell
 * 
 * @param {Object} activity - Activity object
 * @returns {string|null} Reason string or null if valid
 */
export function getShellReason(activity) {
  if (isValidActivity(activity)) {
    return null;
  }
  
  const hasDuration = activity.duration_s && activity.duration_s >= 60;
  const hasDistance = activity.distance_m && activity.distance_m > 0;
  const hasPower = activity.avg_power && activity.avg_power > 0;
  const hasHR = activity.avg_hr && activity.avg_hr > 0;
  const hasMetrics = hasDistance || hasPower || hasHR;
  
  // Determine specific reason
  if (!hasDuration && !hasMetrics) {
    return 'no_duration,no_metrics';
  }
  if (!hasDuration) {
    return 'no_duration';
  }
  if (!hasMetrics) {
    return 'has_duration_but_no_metrics';
  }
  
  return 'unknown';
}

export default {
  isValidActivity,
  getShellReason
};
