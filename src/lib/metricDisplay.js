/**
 * Centralised UI helper for FTP/FTHR metric display
 * Single source of truth for how metrics are rendered across all pages
 * 
 * This prevents the classic bug: RiderProfile says one thing, PerformanceMetrics says another.
 */

// Reason code to user-friendly message mapping
const REASON_CODE_MESSAGES = {
  // FTP reason codes
  NO_POWER_ACTIVITIES_IN_WINDOW: 'No power data in last 6 weeks',
  NO_POWER_EFFORTS_20_60: 'No 20-60 minute power efforts found',
  NO_STEADY_EFFORTS: 'No steady efforts found (power too variable)',
  NO_QUALIFYING_EFFORTS: 'No qualifying efforts found',
  UNKNOWN_CV_ON_TOP_EFFORTS: 'Steadiness could not be verified',
  NO_EFFORT_40_PLUS: 'No effort over 40 minutes',
  SINGLE_EFFORT_ONLY: 'Based on single effort only',
  
  // FTHR reason codes
  NO_ACTIVITIES: 'No activities found',
  NO_HR_ACTIVITIES_IN_WINDOW: 'No HR data in last 6 weeks',
  NO_HR_EFFORTS_30_60: 'No 30-60 minute HR efforts found',
  NO_DRIFT_DATA: 'HR drift could not be measured',
  NO_HR_EFFORT_40_PLUS: 'No HR effort over 40 minutes',
  NO_EFFORT_50_PLUS: 'No effort over 50 minutes',
};

// Reason code to CTA (call-to-action) mapping
const REASON_CODE_CTAS = {
  NO_POWER_ACTIVITIES_IN_WINDOW: 'Complete a ride with a power meter',
  NO_POWER_EFFORTS_20_60: 'Do a 20-60 min steady effort',
  NO_STEADY_EFFORTS: 'Do a steady-state effort (avoid intervals)',
  NO_QUALIFYING_EFFORTS: 'Do a 20-60 min steady effort',
  UNKNOWN_CV_ON_TOP_EFFORTS: 'Do a steady-state effort for better accuracy',
  NO_EFFORT_40_PLUS: 'Do a 40-60 min steady effort',
  SINGLE_EFFORT_ONLY: 'Do more threshold efforts for better accuracy',
  
  NO_ACTIVITIES: 'Connect Strava and sync activities',
  NO_HR_ACTIVITIES_IN_WINDOW: 'Complete a ride with HR monitor',
  NO_HR_EFFORTS_30_60: 'Do a 30-60 min steady effort',
  NO_DRIFT_DATA: 'Ensure HR strap is connected during rides',
  NO_HR_EFFORT_40_PLUS: 'Do a 40+ min steady effort',
  NO_EFFORT_50_PLUS: 'Do a 50+ min steady effort for higher confidence',
};

/**
 * Get display state for a metric response
 * @param {Object} metricResponse - Response from /api/analytics/ftp or /api/analytics/fthr
 * @param {string} metricType - 'ftp' or 'fthr'
 * @returns {Object} - { label, subtext, severity, cta, value, confidence, confidenceLevel }
 */
export function getMetricDisplayState(metricResponse, metricType = 'ftp') {
  const isFTP = metricType === 'ftp';
  const value = isFTP ? metricResponse?.ftp : metricResponse?.fthr;
  const unit = isFTP ? 'W' : 'bpm';
  const confidence = metricResponse?.confidence || 0;
  const confidenceLevel = metricResponse?.confidenceLevel || 'none';
  const reasonCodes = metricResponse?.reasonCodes || [];
  const method = metricResponse?.method || 'unknown';
  
  // Determine if this is a manual override
  const isManual = method === 'manual_override';
  
  // Build the display state
  let label, subtext, severity, cta;
  
  if (value !== null && value !== undefined) {
    // We have a value
    label = `${value}${unit}`;
    
    if (isManual) {
      subtext = 'Manual override';
      severity = 'info';
      cta = null;
    } else if (confidenceLevel === 'high') {
      subtext = isFTP ? 'Functional Threshold Power' : 'Functional Threshold Heart Rate';
      severity = 'success';
      cta = null;
    } else if (confidenceLevel === 'medium') {
      subtext = reasonCodes.length > 0 
        ? REASON_CODE_MESSAGES[reasonCodes[0]] || 'Medium confidence'
        : 'Medium confidence';
      severity = 'info';
      cta = reasonCodes.length > 0 ? REASON_CODE_CTAS[reasonCodes[0]] : null;
    } else {
      subtext = reasonCodes.length > 0 
        ? REASON_CODE_MESSAGES[reasonCodes[0]] || 'Low confidence'
        : 'Low confidence';
      severity = 'warn';
      cta = reasonCodes.length > 0 ? REASON_CODE_CTAS[reasonCodes[0]] : null;
    }
  } else {
    // No value - show appropriate message based on metric type
    if (isFTP) {
      label = 'Insufficient data';
      subtext = reasonCodes.length > 0 
        ? REASON_CODE_MESSAGES[reasonCodes[0]] || 'Needs 20-60 min steady effort'
        : 'Needs 20-60 min steady effort';
      cta = reasonCodes.length > 0 
        ? REASON_CODE_CTAS[reasonCodes[0]] 
        : 'Do a 20-60 min steady effort';
    } else {
      label = 'Not established';
      subtext = reasonCodes.length > 0 
        ? REASON_CODE_MESSAGES[reasonCodes[0]] || 'Needs ≥40 min steady effort'
        : 'Needs ≥40 min steady effort';
      cta = reasonCodes.length > 0 
        ? REASON_CODE_CTAS[reasonCodes[0]] 
        : 'Do a 40+ min steady effort';
    }
    severity = 'warn';
  }
  
  return {
    label,
    subtext,
    severity,
    cta,
    value,
    confidence,
    confidenceLevel,
    reasonCodes,
    isManual,
    hasValue: value !== null && value !== undefined,
  };
}

/**
 * Get CSS classes for severity
 * @param {string} severity - 'success', 'info', 'warn'
 * @returns {Object} - { text, bg, border }
 */
export function getSeverityClasses(severity) {
  switch (severity) {
    case 'success':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800',
      };
    case 'info':
      return {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800',
      };
    case 'warn':
    default:
      return {
        text: 'text-gray-400 dark:text-gray-500',
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-700',
      };
  }
}

/**
 * Format confidence as a badge
 * @param {string} confidenceLevel - 'high', 'medium', 'low', 'none'
 * @returns {Object} - { label, className }
 */
export function getConfidenceBadge(confidenceLevel) {
  switch (confidenceLevel) {
    case 'high':
      return {
        label: 'High confidence',
        className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      };
    case 'medium':
      return {
        label: 'Medium confidence',
        className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      };
    case 'low':
      return {
        label: 'Low confidence',
        className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      };
    case 'manual':
      return {
        label: 'Manual',
        className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      };
    default:
      return {
        label: 'No data',
        className: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
      };
  }
}

export default {
  getMetricDisplayState,
  getSeverityClasses,
  getConfidenceBadge,
};
