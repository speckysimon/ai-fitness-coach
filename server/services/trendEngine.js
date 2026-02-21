/**
 * Trend Engine Service
 * 
 * Computes rolling trends and change detection over weekly rollups.
 * Identifies improvements, plateaus, and declines in key metrics.
 * 
 * Metrics tracked:
 * - Durability (power fade)
 * - Threshold time (Z4 minutes)
 * - Stochastic tolerance (stochastic sessions)
 * - Aerobic efficiency (HR drift)
 */

import { getWeeklyRollups } from './weeklyAggregator.js';

/**
 * Get weekly series for a specific metric
 * 
 * @param {number} userId - User ID
 * @param {string} metricKey - Metric key from athlete_weekly
 * @param {Object} options - Options
 * @param {number} options.weeksBack - Number of weeks to retrieve (default: 16)
 * @returns {Array<Object>} Series of { week_start, value }
 */
export function getWeeklySeries(userId, metricKey, options = {}) {
  const { weeksBack = 16 } = options;
  
  const rollups = getWeeklyRollups(userId, { limit: weeksBack });
  
  // Map to series format, filtering out null values
  const series = rollups
    .map(rollup => ({
      week_start: rollup.week_start,
      value: rollup[metricKey]
    }))
    .filter(point => point.value !== null && point.value !== undefined)
    .reverse(); // Oldest first
  
  return series;
}

/**
 * Compute rolling average over a window
 * 
 * @param {Array<Object>} series - Series of { week_start, value }
 * @param {number} window - Window size in weeks
 * @returns {Array<Object>} Rolling averages { week_start, value, rolling_avg }
 */
export function rollingAverage(series, window) {
  if (!series || series.length === 0) return [];
  if (window <= 0) return series;
  
  const result = [];
  
  for (let i = 0; i < series.length; i++) {
    // Calculate average of current window
    const windowStart = Math.max(0, i - window + 1);
    const windowValues = series.slice(windowStart, i + 1).map(p => p.value);
    const avg = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    
    result.push({
      week_start: series[i].week_start,
      value: series[i].value,
      rolling_avg: avg,
      window_size: windowValues.length
    });
  }
  
  return result;
}

/**
 * Compare two windows (recent vs prior)
 * 
 * @param {Array<Object>} series - Series of { week_start, value }
 * @param {number} recentWindow - Recent window size (default: 4)
 * @param {number} priorWindow - Prior window size (default: 4)
 * @returns {Object} Comparison { recent, prior, delta, deltaPct }
 */
export function compareWindows(series, recentWindow = 4, priorWindow = 4) {
  if (!series || series.length < recentWindow) {
    return {
      recent: null,
      prior: null,
      delta: null,
      deltaPct: null,
      insufficient_data: true
    };
  }
  
  // Get recent window (last N weeks)
  const recentValues = series.slice(-recentWindow).map(p => p.value);
  const recentAvg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  
  // Get prior window (N weeks before recent window)
  const priorStart = Math.max(0, series.length - recentWindow - priorWindow);
  const priorEnd = series.length - recentWindow;
  
  if (priorEnd <= priorStart) {
    return {
      recent: recentAvg,
      prior: null,
      delta: null,
      deltaPct: null,
      insufficient_data: true
    };
  }
  
  const priorValues = series.slice(priorStart, priorEnd).map(p => p.value);
  const priorAvg = priorValues.reduce((sum, val) => sum + val, 0) / priorValues.length;
  
  // Calculate delta and percentage change
  const delta = recentAvg - priorAvg;
  const deltaPct = priorAvg !== 0 ? (delta / Math.abs(priorAvg)) * 100 : null;
  
  return {
    recent: recentAvg,
    prior: priorAvg,
    delta,
    deltaPct,
    recent_window: recentWindow,
    prior_window: priorWindow,
    insufficient_data: false
  };
}

/**
 * Classify change based on delta percentage
 * 
 * @param {number} deltaPct - Delta percentage
 * @param {Object} thresholds - Thresholds { improve, decline }
 * @param {boolean} lowerIsBetter - If true, negative delta is improvement (default: false)
 * @returns {string} 'improving' | 'flat' | 'declining'
 */
export function classifyChange(deltaPct, thresholds = {}, lowerIsBetter = false) {
  if (deltaPct === null || deltaPct === undefined) return 'unknown';
  
  const { improve = 5, decline = -5 } = thresholds;
  
  // Adjust interpretation based on metric direction
  const effectiveDelta = lowerIsBetter ? -deltaPct : deltaPct;
  
  if (effectiveDelta >= improve) return 'improving';
  if (effectiveDelta <= decline) return 'declining';
  return 'flat';
}

/**
 * Compute comprehensive trend summary for a user
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {number} options.weeksBack - Number of weeks to analyze (default: 16)
 * @param {number} options.recentWindow - Recent window size (default: 4)
 * @param {number} options.priorWindow - Prior window size (default: 4)
 * @returns {Object} Trend summary for all key metrics
 */
export function computeTrendSummary(userId, options = {}) {
  const {
    weeksBack = 16,
    recentWindow = 4,
    priorWindow = 4
  } = options;
  
  console.log(`[TrendEngine] Computing trend summary for user ${userId} (${weeksBack} weeks)`);
  
  const summary = {};
  
  // 1. Durability (power fade - lower is better)
  try {
    const durSeries = getWeeklySeries(userId, 'avg_power_fade', { weeksBack });
    const durComparison = compareWindows(durSeries, recentWindow, priorWindow);
    
    if (!durComparison.insufficient_data) {
      summary.durability = {
        metric: 'avg_power_fade',
        recent: durComparison.recent,
        prior: durComparison.prior,
        delta: durComparison.delta,
        deltaPct: durComparison.deltaPct,
        status: classifyChange(durComparison.deltaPct, { improve: 5, decline: -5 }, true), // Lower is better
        rolling_4w: durComparison.recent,
        data_points: durSeries.length
      };
    } else {
      summary.durability = {
        metric: 'avg_power_fade',
        status: 'insufficient_data',
        data_points: durSeries.length
      };
    }
  } catch (error) {
    console.warn('[TrendEngine] Failed to compute durability trend:', error.message);
    summary.durability = { metric: 'avg_power_fade', status: 'error' };
  }
  
  // 2. Threshold time (Z4 minutes - higher is better)
  try {
    const thresholdSeries = getWeeklySeries(userId, 'threshold_minutes', { weeksBack });
    const thresholdComparison = compareWindows(thresholdSeries, recentWindow, priorWindow);
    
    if (!thresholdComparison.insufficient_data) {
      summary.threshold = {
        metric: 'threshold_minutes',
        recent: thresholdComparison.recent,
        prior: thresholdComparison.prior,
        delta: thresholdComparison.delta,
        deltaPct: thresholdComparison.deltaPct,
        status: classifyChange(thresholdComparison.deltaPct, { improve: 5, decline: -5 }, false), // Higher is better
        rolling_4w: thresholdComparison.recent,
        data_points: thresholdSeries.length
      };
    } else {
      summary.threshold = {
        metric: 'threshold_minutes',
        status: 'insufficient_data',
        data_points: thresholdSeries.length
      };
    }
  } catch (error) {
    console.warn('[TrendEngine] Failed to compute threshold trend:', error.message);
    summary.threshold = { metric: 'threshold_minutes', status: 'error' };
  }
  
  // 3. Stochastic tolerance (stochastic sessions - higher is better)
  try {
    const stochasticSeries = getWeeklySeries(userId, 'stochastic_sessions', { weeksBack });
    const stochasticComparison = compareWindows(stochasticSeries, recentWindow, priorWindow);
    
    if (!stochasticComparison.insufficient_data) {
      summary.stochastic = {
        metric: 'stochastic_sessions',
        recent: stochasticComparison.recent,
        prior: stochasticComparison.prior,
        delta: stochasticComparison.delta,
        deltaPct: stochasticComparison.deltaPct,
        status: classifyChange(stochasticComparison.deltaPct, { improve: 5, decline: -5 }, false), // Higher is better
        rolling_4w: stochasticComparison.recent,
        data_points: stochasticSeries.length
      };
    } else {
      summary.stochastic = {
        metric: 'stochastic_sessions',
        status: 'insufficient_data',
        data_points: stochasticSeries.length
      };
    }
  } catch (error) {
    console.warn('[TrendEngine] Failed to compute stochastic trend:', error.message);
    summary.stochastic = { metric: 'stochastic_sessions', status: 'error' };
  }
  
  // 4. Aerobic efficiency (HR drift - lower is better)
  try {
    const hrDriftSeries = getWeeklySeries(userId, 'avg_hr_drift', { weeksBack });
    const hrDriftComparison = compareWindows(hrDriftSeries, recentWindow, priorWindow);
    
    if (!hrDriftComparison.insufficient_data) {
      summary.aerobic = {
        metric: 'avg_hr_drift',
        recent: hrDriftComparison.recent,
        prior: hrDriftComparison.prior,
        delta: hrDriftComparison.delta,
        deltaPct: hrDriftComparison.deltaPct,
        status: classifyChange(hrDriftComparison.deltaPct, { improve: 5, decline: -5 }, true), // Lower is better
        rolling_4w: hrDriftComparison.recent,
        data_points: hrDriftSeries.length
      };
    } else {
      summary.aerobic = {
        metric: 'avg_hr_drift',
        status: 'insufficient_data',
        data_points: hrDriftSeries.length
      };
    }
  } catch (error) {
    console.warn('[TrendEngine] Failed to compute aerobic trend:', error.message);
    summary.aerobic = { metric: 'avg_hr_drift', status: 'error' };
  }
  
  // Add metadata
  summary.computed_at = new Date().toISOString();
  summary.weeks_analyzed = weeksBack;
  summary.recent_window = recentWindow;
  summary.prior_window = priorWindow;
  
  console.log('[TrendEngine] ✅ Trend summary computed');
  
  return summary;
}

/**
 * Get rolling averages for a metric (4w and 8w)
 * 
 * @param {number} userId - User ID
 * @param {string} metricKey - Metric key
 * @param {Object} options - Options
 * @returns {Object} { rolling_4w, rolling_8w, series }
 */
export function getRollingAverages(userId, metricKey, options = {}) {
  const { weeksBack = 16 } = options;
  
  const series = getWeeklySeries(userId, metricKey, { weeksBack });
  
  if (series.length === 0) {
    return {
      rolling_4w: null,
      rolling_8w: null,
      series: []
    };
  }
  
  const rolling4w = rollingAverage(series, 4);
  const rolling8w = rollingAverage(series, 8);
  
  // Get most recent values
  const latest4w = rolling4w.length > 0 ? rolling4w[rolling4w.length - 1].rolling_avg : null;
  const latest8w = rolling8w.length > 0 ? rolling8w[rolling8w.length - 1].rolling_avg : null;
  
  return {
    rolling_4w: latest4w,
    rolling_8w: latest8w,
    series_4w: rolling4w,
    series_8w: rolling8w,
    raw_series: series
  };
}

/**
 * Detect plateau (flat trend for extended period)
 * 
 * @param {Array<Object>} series - Series data
 * @param {number} window - Window to check
 * @param {number} threshold - Variation threshold (default: 5%)
 * @returns {boolean} True if plateau detected
 */
export function detectPlateau(series, window = 4, threshold = 5) {
  if (!series || series.length < window) return false;
  
  const recentValues = series.slice(-window).map(p => p.value);
  const avg = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
  
  // Check if all values are within threshold of average
  const allWithinThreshold = recentValues.every(val => {
    const pctDiff = Math.abs((val - avg) / avg) * 100;
    return pctDiff <= threshold;
  });
  
  return allWithinThreshold;
}

export default {
  getWeeklySeries,
  rollingAverage,
  compareWindows,
  classifyChange,
  computeTrendSummary,
  getRollingAverages,
  detectPlateau
};
