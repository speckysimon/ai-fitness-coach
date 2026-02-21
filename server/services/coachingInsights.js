/**
 * Coaching Insights Service
 * 
 * Generates deterministic, actionable coaching insights based on:
 * - Trend engine analysis (4w vs prior 4w)
 * - Recent weekly rollups
 * - Data coverage and quality
 * 
 * No AI. Fully explainable. Confidence based on data coverage.
 */

import { computeTrendSummary, getWeeklySeries } from './trendEngine.js';
import { getWeeklyRollups } from './weeklyAggregator.js';

/**
 * Calculate data coverage metrics
 * 
 * @param {Array} rollups - Weekly rollups
 * @returns {Object} Coverage metrics
 */
function calculateCoverage(rollups) {
  if (!rollups || rollups.length === 0) {
    return {
      avg_quality: 0,
      streams_rate: 0,
      power_rate: 0,
      hr_rate: 0,
      weeks_available: 0
    };
  }
  
  const totalActivities = rollups.reduce((sum, w) => sum + (w.activities_total || 0), 0);
  const totalStreams = rollups.reduce((sum, w) => sum + (w.activities_with_streams || 0), 0);
  const totalPower = rollups.reduce((sum, w) => sum + (w.activities_with_power || 0), 0);
  const totalHr = rollups.reduce((sum, w) => sum + (w.activities_with_hr || 0), 0);
  
  const qualityScores = rollups
    .map(w => w.avg_quality_score)
    .filter(q => q !== null && q !== undefined);
  
  const avgQuality = qualityScores.length > 0
    ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
    : 0;
  
  return {
    avg_quality: avgQuality,
    streams_rate: totalActivities > 0 ? totalStreams / totalActivities : 0,
    power_rate: totalActivities > 0 ? totalPower / totalActivities : 0,
    hr_rate: totalActivities > 0 ? totalHr / totalActivities : 0,
    weeks_available: rollups.length
  };
}

/**
 * Calculate base confidence from coverage
 * 
 * @param {Object} coverage - Coverage metrics
 * @returns {number} Base confidence (0-1)
 */
function calculateBaseConfidence(coverage) {
  // Start with quality score
  let confidence = Math.min(1, coverage.avg_quality);
  
  // Cap at 0.6 if insufficient weeks
  if (coverage.weeks_available < 8) {
    confidence = Math.min(confidence, 0.6);
  }
  
  // Boost slightly if good data coverage
  if (coverage.power_rate > 0.7 && coverage.streams_rate > 0.5) {
    confidence = Math.min(1, confidence * 1.1);
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Adjust confidence for specific insight type
 * 
 * @param {number} baseConfidence - Base confidence
 * @param {Object} coverage - Coverage metrics
 * @param {string} insightType - Type of insight
 * @returns {number} Adjusted confidence
 */
function adjustConfidenceForInsight(baseConfidence, coverage, insightType) {
  let confidence = baseConfidence;
  
  // Stream-heavy insights require good stream coverage
  if (['durability', 'power_fade'].includes(insightType)) {
    confidence *= Math.max(0.5, coverage.streams_rate);
  }
  
  // Power-based insights require power data
  if (['threshold', 'vo2', 'durability'].includes(insightType)) {
    confidence *= Math.max(0.5, coverage.power_rate);
  }
  
  // HR-based insights require HR data
  if (['hr_drift', 'aerobic'].includes(insightType)) {
    confidence *= Math.max(0.5, coverage.hr_rate);
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generate insights from trends and rollups
 * 
 * @param {number} userId - User ID
 * @param {Object} options - Options
 * @param {number} options.weeksBack - Weeks to analyze (default: 16)
 * @param {number} options.recentDays - Recent days to consider (default: 14)
 * @returns {Object} Insights result
 */
export function generateInsights(userId, options = {}) {
  const { weeksBack = 16, recentDays = 14 } = options;
  
  console.log(`[CoachingInsights] Generating insights for user ${userId}`);
  
  try {
    // Get weekly rollups and trends
    const rollups = getWeeklyRollups(userId, { limit: weeksBack });
    const trends = computeTrendSummary(userId, { weeksBack });
    
    // Calculate coverage
    const coverage = calculateCoverage(rollups);
    const baseConfidence = calculateBaseConfidence(coverage);
    
    console.log(`[CoachingInsights] Coverage: quality=${coverage.avg_quality.toFixed(2)}, streams=${coverage.streams_rate.toFixed(2)}, weeks=${coverage.weeks_available}`);
    
    const insights = [];
    
    // Get recent 4 weeks for additional checks
    const recent4w = rollups.slice(0, 4);
    
    // 1. DURABILITY IMPROVING/DECLINING
    if (trends.durability && trends.durability.status !== 'insufficient_data') {
      const { deltaPct, status, recent, prior } = trends.durability;
      
      if (deltaPct !== null) {
        // Improving: delta <= -10% (power fade decreasing)
        if (deltaPct <= -10) {
          insights.push({
            id: 'durability_improving',
            title: 'Durability Improving',
            message: `Your power fade has decreased by ${Math.abs(deltaPct).toFixed(1)}% over the last 4 weeks (${prior.toFixed(1)}% → ${recent.toFixed(1)}%). Your ability to sustain power late in rides is improving.`,
            severity: 'info',
            confidence: adjustConfidenceForInsight(baseConfidence, coverage, 'durability'),
            evidence: {
              metric: 'avg_power_fade',
              recent_4w: recent,
              prior_4w: prior,
              change_pct: deltaPct,
              trend: 'improving'
            }
          });
        }
        // Declining: delta >= +10% (power fade increasing)
        else if (deltaPct >= 10) {
          insights.push({
            id: 'durability_declining',
            title: 'Durability Declining',
            message: `Your power fade has increased by ${deltaPct.toFixed(1)}% over the last 4 weeks (${prior.toFixed(1)}% → ${recent.toFixed(1)}%). Consider adding more long endurance rides (2-3 hours) to rebuild durability.`,
            severity: 'warn',
            confidence: adjustConfidenceForInsight(baseConfidence, coverage, 'durability'),
            evidence: {
              metric: 'avg_power_fade',
              recent_4w: recent,
              prior_4w: prior,
              change_pct: deltaPct,
              trend: 'declining'
            }
          });
        }
      }
    }
    
    // 2. MISSING VO2 STIMULUS
    if (recent4w.length >= 4) {
      const avgVo2 = recent4w.reduce((sum, w) => sum + (w.vo2_minutes || 0), 0) / recent4w.length;
      const avgThreshold = recent4w.reduce((sum, w) => sum + (w.threshold_minutes || 0), 0) / recent4w.length;
      
      if (avgVo2 < 10 && avgThreshold >= 20) {
        insights.push({
          id: 'missing_vo2',
          title: 'Missing VO2 Stimulus',
          message: `You're averaging ${avgVo2.toFixed(0)} minutes/week in VO2 zone (Z5) but ${avgThreshold.toFixed(0)} minutes at threshold. Add 1-2 short VO2 intervals (4-6 × 3-5min) to develop top-end power.`,
          severity: 'action',
          confidence: adjustConfidenceForInsight(baseConfidence, coverage, 'vo2'),
          evidence: {
            vo2_minutes_avg: avgVo2,
            threshold_minutes_avg: avgThreshold,
            weeks_analyzed: recent4w.length
          }
        });
      }
    }
    
    // 3. TOO MUCH STOCHASTIC / NOT ENOUGH STEADY
    if (recent4w.length >= 4) {
      const avgStochastic = recent4w.reduce((sum, w) => sum + (w.stochastic_sessions || 0), 0) / recent4w.length;
      const avgThreshold = recent4w.reduce((sum, w) => sum + (w.threshold_minutes || 0), 0) / recent4w.length;
      
      if (avgStochastic >= 2 && avgThreshold < 15) {
        insights.push({
          id: 'too_much_stochastic',
          title: 'Balance Stochastic with Steady Work',
          message: `You're averaging ${avgStochastic.toFixed(1)} stochastic sessions/week but only ${avgThreshold.toFixed(0)} minutes of threshold work. Add 1-2 steady threshold efforts to build a stronger aerobic base.`,
          severity: 'action',
          confidence: adjustConfidenceForInsight(baseConfidence, coverage, 'threshold'),
          evidence: {
            stochastic_sessions_avg: avgStochastic,
            threshold_minutes_avg: avgThreshold,
            weeks_analyzed: recent4w.length
          }
        });
      }
    }
    
    // 4. THRESHOLD FOCUS PRESENT
    if (trends.threshold && trends.threshold.status !== 'insufficient_data') {
      const { deltaPct, recent, prior } = trends.threshold;
      
      if (deltaPct !== null && deltaPct >= 15) {
        insights.push({
          id: 'threshold_improving',
          title: 'Strong Threshold Development',
          message: `Your threshold time has increased by ${deltaPct.toFixed(1)}% over the last 4 weeks (${prior.toFixed(0)} → ${recent.toFixed(0)} min/week). Excellent progress on sustained power.`,
          severity: 'info',
          confidence: adjustConfidenceForInsight(baseConfidence, coverage, 'threshold'),
          evidence: {
            metric: 'threshold_minutes',
            recent_4w: recent,
            prior_4w: prior,
            change_pct: deltaPct,
            trend: 'improving'
          }
        });
      }
    }
    
    // 5. VOLUME DROP WARNING
    if (recent4w.length >= 4 && rollups.length >= 8) {
      const recentVolume = recent4w.reduce((sum, w) => sum + (w.total_duration_s || 0), 0) / recent4w.length;
      const priorVolume = rollups.slice(4, 8).reduce((sum, w) => sum + (w.total_duration_s || 0), 0) / 4;
      
      if (priorVolume > 0) {
        const volumeDelta = ((recentVolume - priorVolume) / priorVolume) * 100;
        
        if (volumeDelta <= -20) {
          insights.push({
            id: 'volume_drop',
            title: 'Training Volume Decreased',
            message: `Your weekly training volume has dropped by ${Math.abs(volumeDelta).toFixed(0)}% (${(priorVolume / 3600).toFixed(1)}h → ${(recentVolume / 3600).toFixed(1)}h/week). If unplanned, consider gradually rebuilding volume to maintain fitness.`,
            severity: 'warn',
            confidence: baseConfidence,
            evidence: {
              recent_volume_hours: recentVolume / 3600,
              prior_volume_hours: priorVolume / 3600,
              change_pct: volumeDelta,
              weeks_analyzed: 8
            }
          });
        }
      }
    }
    
    // 6. DATA QUALITY WARNING
    if (coverage.streams_rate < 0.5) {
      insights.push({
        id: 'data_quality_low',
        title: 'Limited Data Coverage',
        message: `Only ${(coverage.streams_rate * 100).toFixed(0)}% of your activities have detailed stream data. Insights are limited. Consider using a power meter or uploading FIT files for better analysis.`,
        severity: 'warn',
        confidence: 1.0, // High confidence in this observation
        evidence: {
          streams_rate: coverage.streams_rate,
          power_rate: coverage.power_rate,
          hr_rate: coverage.hr_rate,
          weeks_available: coverage.weeks_available
        }
      });
    }
    
    // 7. STOCHASTIC TOLERANCE IMPROVING
    if (trends.stochastic && trends.stochastic.status === 'improving') {
      const { deltaPct, recent, prior } = trends.stochastic;
      
      if (deltaPct !== null && deltaPct >= 50) {
        insights.push({
          id: 'stochastic_improving',
          title: 'Race Readiness Improving',
          message: `Your stochastic sessions have increased by ${deltaPct.toFixed(0)}% (${prior.toFixed(1)} → ${recent.toFixed(1)} sessions/week). You're building better tolerance for race-like efforts.`,
          severity: 'info',
          confidence: baseConfidence,
          evidence: {
            metric: 'stochastic_sessions',
            recent_4w: recent,
            prior_4w: prior,
            change_pct: deltaPct,
            trend: 'improving'
          }
        });
      }
    }
    
    // Sort by severity (action > warn > info) and confidence
    const severityOrder = { action: 0, warn: 1, info: 2 };
    insights.sort((a, b) => {
      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.confidence - a.confidence;
    });
    
    // Limit to 7 insights
    const limitedInsights = insights.slice(0, 7);
    
    console.log(`[CoachingInsights] ✅ Generated ${limitedInsights.length} insights (confidence: ${baseConfidence.toFixed(2)})`);
    
    return {
      ok: true,
      confidence: baseConfidence,
      coverage,
      insights: limitedInsights,
      generated_at: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('[CoachingInsights] Failed to generate insights:', error.message);
    return {
      ok: false,
      error: error.message,
      confidence: 0,
      coverage: {
        avg_quality: 0,
        streams_rate: 0,
        power_rate: 0,
        hr_rate: 0,
        weeks_available: 0
      },
      insights: []
    };
  }
}

export default {
  generateInsights
};
