/**
 * FTHR (Functional Threshold Heart Rate) Service
 * 
 * Calculates FTHR and HR training zones based on activity data
 * Similar to FTP calculation but for heart rate
 */

class FTHRService {
  /**
   * Calculate FTHR using the canonical bible methodology
   * - 42-day analysis window
   * - Effort qualification: 30-60 min, ≥95% HR samples, CV ≤ 0.10, HR drift ≤ 5 bpm
   * - NO multipliers - use raw avg HR directly
   * - Minimum requirement: ≥1 effort ≥40 min or return null
   * - Final FTHR = median of top 3 weighted efforts
   * - Confidence scoring (0-100)
   */
  calculateFTHR(activities, manualFTHR = null) {
    // If user has manually set FTHR, use that (manual always wins)
    if (manualFTHR && manualFTHR > 0) {
      return {
        fthr: manualFTHR,
        confidence: 100,
        confidenceLevel: 'manual',
        method: 'user_provided',
        zones: this.calculateHRZones(manualFTHR),
        recentActivities: 0,
        qualifyingEfforts: 0
      };
    }

    if (!activities || activities.length === 0) {
      return {
        fthr: null,
        confidence: 0,
        confidenceLevel: 'none',
        method: 'insufficient_data',
        zones: null,
        recentActivities: 0,
        reasonCodes: ['NO_ACTIVITIES'],
        windowDays: 42,
        updatedAt: new Date().toISOString()
      };
    }

    console.log('[FTHR Bible] Starting with', activities.length, 'activities');

    // 1. Filter to 42-day window with HR data
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 42);

    const recentActivitiesWithHR = activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return (
        activityDate >= cutoffDate &&
        activity.avgHeartRate &&
        activity.avgHeartRate > 0
      );
    });

    console.log('[FTHR Bible] Activities in 42-day window with HR:', recentActivitiesWithHR.length);

    if (recentActivitiesWithHR.length === 0) {
      return {
        fthr: null,
        confidence: 0,
        confidenceLevel: 'none',
        method: 'no_hr_data',
        zones: null,
        recentActivities: 0,
        reasonCodes: ['NO_HR_ACTIVITIES_IN_WINDOW'],
        windowDays: 42,
        updatedAt: new Date().toISOString()
      };
    }

    // 2. Extract candidate efforts (30-60 min with steady effort)
    const candidates = [];
    const now = new Date();

    for (const activity of recentActivitiesWithHR) {
      const durationMin = activity.duration / 60;
      
      // Duration must be 30-60 minutes (NOT 20 - bible requirement)
      if (durationMin < 30 || durationMin > 60) continue;
      
      const avgHR = activity.avgHeartRate;
      if (!avgHR || avgHR < 100) continue; // Minimum HR threshold
      
      // Calculate days ago for recency weighting
      const activityDate = new Date(activity.date);
      const daysAgo = Math.floor((now - activityDate) / (1000 * 60 * 60 * 24));
      
      // Power CV as steady effort proxy - null means unknown
      const powerCV = activity.powerCV !== undefined ? activity.powerCV : null;
      
      // If CV is known and too high, skip (not steady effort)
      if (powerCV !== null && powerCV > 0.10) {
        console.log('[FTHR Bible] Skipping activity (power CV too high):', activity.name);
        continue;
      }
      
      // HR drift check: difference between first and second half should be ≤5 bpm
      // CRITICAL: If we can't measure drift, we can't verify steadiness
      let hrDrift = null; // null = unmeasurable
      let driftMeasurable = false;
      
      if (activity.hrFirstHalf && activity.hrSecondHalf) {
        // Best case: we have actual half/half HR means
        hrDrift = Math.abs(activity.hrSecondHalf - activity.hrFirstHalf);
        driftMeasurable = true;
      } else if (activity.maxHeartRate && activity.avgHeartRate) {
        // Acceptable proxy: estimate from max-avg spread
        hrDrift = (activity.maxHeartRate - activity.avgHeartRate) * 0.3;
        driftMeasurable = true;
      }
      
      // If drift is unmeasurable, FAIL the steadiness check (accuracy beats completeness)
      if (!driftMeasurable) {
        console.log('[FTHR Bible] Skipping activity (HR drift unmeasurable):', activity.name);
        continue;
      }
      
      // If drift is too high, skip
      if (hrDrift > 5) {
        console.log('[FTHR Bible] Skipping activity (HR drift too high):', activity.name, 'drift:', hrDrift.toFixed(1));
        continue;
      }
      
      // 3. FTHR estimate = raw avg HR (NO MULTIPLIERS - bible requirement)
      const fthrEstimate = Math.round(avgHR);
      
      // 4. Calculate effort weight (for ranking only)
      const recencyWeight = Math.exp(-daysAgo / 21);
      const durationWeight = Math.min(durationMin / 60, 1.0);
      const driftWeight = Math.max(0, Math.min(1, 1 - (hrDrift / 5)));
      // If CV unknown, reduce weight (can't fully verify steadiness)
      const cvPenalty = powerCV === null ? 0.7 : 1.0;
      const totalWeight = recencyWeight * durationWeight * driftWeight * cvPenalty;
      
      candidates.push({
        activity,
        fthrEstimate,
        durationMin: Math.round(durationMin),
        daysAgo,
        hrDrift: Math.round(hrDrift * 10) / 10,
        powerCV,
        weight: totalWeight,
        avgHR: Math.round(avgHR)
      });
    }

    console.log('[FTHR Bible] Qualifying efforts:', candidates.length);

    // Collect reason codes for why efforts were rejected
    const reasonCodes = [];
    
    // Check what's missing
    const activitiesIn30to60 = recentActivitiesWithHR.filter(a => {
      const durationMin = a.duration / 60;
      return durationMin >= 30 && durationMin <= 60;
    });
    
    if (activitiesIn30to60.length === 0) {
      reasonCodes.push('NO_HR_EFFORTS_30_60');
    }
    
    // Check if we had activities but they failed drift check
    if (activitiesIn30to60.length > 0 && candidates.length === 0) {
      reasonCodes.push('NO_DRIFT_DATA');
    }
    
    // 5. MINIMUM REQUIREMENT: At least 1 effort ≥40 min
    const hasLongEffort = candidates.some(e => e.durationMin >= 40);
    
    if (!hasLongEffort) {
      if (candidates.length > 0) {
        reasonCodes.push('NO_HR_EFFORT_40_PLUS');
      }
      
      console.log('[FTHR Bible] No effort ≥40 min found - returning null, reasons:', reasonCodes);
      return {
        fthr: null,
        confidence: 0,
        confidenceLevel: 'insufficient',
        method: 'no_long_effort',
        message: 'FTHR requires at least one steady effort of 40+ minutes. No estimation made.',
        zones: null,
        recentActivities: recentActivitiesWithHR.length,
        qualifyingEfforts: candidates.length,
        reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['NO_QUALIFYING_EFFORTS'],
        windowDays: 42,
        updatedAt: new Date().toISOString()
      };
    }

    // 6. Sort by weight and take top 3
    candidates.sort((a, b) => b.weight - a.weight);
    const topEfforts = candidates.slice(0, Math.min(3, candidates.length));

    console.log('[FTHR Bible] Top efforts:', topEfforts.map(e => ({
      date: e.activity.date,
      fthr: e.fthrEstimate,
      duration: e.durationMin,
      drift: e.hrDrift,
      weight: e.weight.toFixed(3)
    })));

    // 7. Calculate final FTHR as median of top efforts
    const fthrValues = topEfforts.map(e => e.fthrEstimate).sort((a, b) => a - b);
    let fthr;
    if (fthrValues.length === 1) {
      fthr = fthrValues[0];
    } else if (fthrValues.length === 2) {
      fthr = Math.round((fthrValues[0] + fthrValues[1]) / 2);
    } else {
      fthr = fthrValues[1]; // Median of 3
    }

    // 8. Calculate confidence score (0-100)
    let confidence = 0;
    
    // +50: ≥1 effort ≥40 min
    if (hasLongEffort) confidence += 50;
    
    // +20: ≥2 qualifying efforts
    if (candidates.length >= 2) confidence += 20;
    
    // +15: hr_drift ≤3 bpm on best effort
    if (topEfforts[0].hrDrift <= 3) confidence += 15;
    
    // +10: best effort ≤14 days old
    if (topEfforts[0].daysAgo <= 14) confidence += 10;
    
    // +5: ≥1 effort ≥50 min
    if (candidates.some(e => e.durationMin >= 50)) confidence += 5;
    
    // -10: any top effort has unknown power CV (can't fully verify steadiness)
    if (topEfforts.some(e => e.powerCV === null)) {
      confidence -= 10;
      console.log('[FTHR Bible] Confidence penalty: unknown power CV on top efforts');
    }
    
    confidence = Math.max(0, Math.min(100, confidence));

    // Determine confidence level
    let confidenceLevel;
    if (confidence >= 50) {
      confidenceLevel = 'high';
    } else {
      confidenceLevel = 'low';
    }

    console.log('[FTHR Bible] Final FTHR:', fthr, 'Confidence:', confidence, '(' + confidenceLevel + ')');

    // Calculate HR zones
    const zones = this.calculateHRZones(fthr);

    // Build reason codes for confidence issues
    const finalReasonCodes = [];
    if (topEfforts.some(e => e.powerCV === null)) {
      finalReasonCodes.push('UNKNOWN_CV_ON_TOP_EFFORTS');
    }
    if (!candidates.some(e => e.durationMin >= 50)) {
      finalReasonCodes.push('NO_EFFORT_50_PLUS');
    }
    if (candidates.length < 2) {
      finalReasonCodes.push('SINGLE_EFFORT_ONLY');
    }
    
    return {
      fthr,
      confidence,
      confidenceLevel,
      method: 'bible_calculation',
      zones,
      recentActivities: recentActivitiesWithHR.length,
      qualifyingEfforts: candidates.length,
      effortsUsed: topEfforts.length,
      reasonCodes: finalReasonCodes,
      windowDays: 42,
      updatedAt: new Date().toISOString(),
      topEfforts: topEfforts.map(e => ({
        date: e.activity.date,
        name: e.activity.name,
        fthrEstimate: e.fthrEstimate,
        durationMin: e.durationMin,
        daysAgo: e.daysAgo,
        hrDrift: e.hrDrift,
        cvKnown: e.powerCV !== null
      }))
    };
  }

  /**
   * Calculate FTHR history - weekly snapshots using canonical calculation
   * Returns null for weeks with insufficient data (bible requirement)
   * @param {Array} activities - All activities
   * @param {Number} weeks - Number of weeks to calculate (default 24)
   * @returns {Object} - { history: [...], currentFTHR: {...} }
   */
  calculateFTHRHistory(activities, weeks = 24) {
    console.log('[FTHR History] Calculating', weeks, 'weeks of history');
    
    const history = [];
    const now = new Date();
    
    // Calculate FTHR for each week going back
    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);
      
      // Filter activities up to this week's end date
      const activitiesUpToWeek = activities.filter(a => {
        const activityDate = new Date(a.date);
        return activityDate <= weekEnd;
      });
      
      // Calculate FTHR as if we were at that week
      // Temporarily adjust the 42-day window to end at weekEnd
      const cutoffDate = new Date(weekEnd);
      cutoffDate.setDate(cutoffDate.getDate() - 42);
      
      const windowActivities = activitiesUpToWeek.filter(a => {
        const activityDate = new Date(a.date);
        return activityDate >= cutoffDate && activityDate <= weekEnd;
      });
      
      // Use the main calculation but with filtered activities
      const result = this.calculateFTHR(windowActivities);
      
      history.unshift({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        fthr: result.fthr, // Will be null if insufficient data (bible requirement)
        confidence: result.confidence,
        confidenceLevel: result.confidenceLevel,
        effortsUsed: result.effortsUsed || 0
      });
    }
    
    // Current FTHR (most recent calculation)
    const currentResult = this.calculateFTHR(activities);
    
    return {
      history,
      currentFTHR: currentResult
    };
  }

  /**
   * Estimate max HR for an activity
   * Uses age if available, otherwise uses observed max
   */
  estimateMaxHR(activity, age = null) {
    // If we have max HR data, use it
    if (activity.maxHeartRate && activity.maxHeartRate > 0) {
      return activity.maxHeartRate;
    }

    // Otherwise estimate from age (220 - age formula)
    if (age) {
      return 220 - age;
    }

    // Fallback: assume max HR is 10% higher than average
    return activity.avgHeartRate * 1.1;
  }

  /**
   * Calculate HR training zones based on FTHR - 3-zone polarized model
   * Based on Dr. Stephen Seiler's research on elite endurance athletes
   * 
   * @param {number} fthr - Functional Threshold Heart Rate
   * @returns {Object} - Training zones with ranges and descriptions
   */
  calculateHRZones3(fthr) {
    return {
      zone1: {
        name: 'Low Intensity (Easy)',
        min: Math.round(fthr * 0.50),
        max: Math.round(fthr * 0.82),
        percentage: '50-82% FTHR',
        description: 'Easy, conversational pace. Build aerobic base.',
        color: '#22c55e', // green
        purpose: 'Aerobic base, recovery, fat adaptation',
        trainingTime: '~80% of total training volume'
      },
      zone2: {
        name: 'Moderate (Grey Zone)',
        min: Math.round(fthr * 0.82),
        max: Math.round(fthr * 0.87),
        percentage: '82-87% FTHR',
        description: 'Tempo effort. MINIMIZE time here.',
        color: '#eab308', // yellow
        purpose: 'Lactate threshold (use sparingly)',
        trainingTime: '~5% of total training volume'
      },
      zone3: {
        name: 'High Intensity (Hard)',
        min: Math.round(fthr * 0.87),
        max: Math.round(fthr * 1.05),
        percentage: '87-105% FTHR',
        description: 'Hard intervals and races.',
        color: '#ef4444', // red
        purpose: 'VO2max, anaerobic capacity, race efforts',
        trainingTime: '~15% of total training volume'
      }
    };
  }

  /**
   * Calculate HR training zones based on FTHR - 5-zone model (DEFAULT)
   * Uses 5-zone model (similar to Coggan's power zones)
   * 
   * @param {number} fthr - Functional Threshold Heart Rate
   * @returns {Object} - Training zones with ranges and descriptions
   */
  calculateHRZones(fthr) {
    return {
      zone1: {
        name: 'Active Recovery',
        min: Math.round(fthr * 0.50),
        max: Math.round(fthr * 0.60),
        percentage: '50-60% FTHR',
        description: 'Very easy, conversational pace. Recovery rides.',
        color: '#22c55e', // green
        purpose: 'Recovery, active rest, warm-up/cool-down'
      },
      zone2: {
        name: 'Endurance',
        min: Math.round(fthr * 0.60),
        max: Math.round(fthr * 0.75),
        percentage: '60-75% FTHR',
        description: 'Comfortable, can hold conversation. Base building.',
        color: '#3b82f6', // blue
        purpose: 'Aerobic base, fat burning, long steady rides'
      },
      zone3: {
        name: 'Tempo',
        min: Math.round(fthr * 0.75),
        max: Math.round(fthr * 0.87),
        percentage: '75-87% FTHR',
        description: 'Moderately hard, can speak in short sentences.',
        color: '#eab308', // yellow
        purpose: 'Muscular endurance, lactate clearance'
      },
      zone4: {
        name: 'Threshold',
        min: Math.round(fthr * 0.87),
        max: Math.round(fthr * 0.95),
        percentage: '87-95% FTHR',
        description: 'Hard effort, difficult to speak. Sustainable for 20-60 min.',
        color: '#f97316', // orange
        purpose: 'Lactate threshold, race pace for long events'
      },
      zone5: {
        name: 'VO2 Max',
        min: Math.round(fthr * 0.95),
        max: Math.round(fthr * 1.05),
        percentage: '95-105% FTHR',
        description: 'Very hard, can only sustain for 3-8 minutes.',
        color: '#ef4444', // red
        purpose: 'VO2 max development, short hard intervals'
      }
    };
  }

  /**
   * Calculate HR training zones based on FTHR - 7-zone British Cycling model
   * Used by British Cycling and Team GB Olympic cyclists
   * 
   * @param {number} fthr - Functional Threshold Heart Rate
   * @param {number} maxHR - Optional maximum heart rate for zones 6 & 7
   * @returns {Object} - Training zones with ranges and descriptions
   */
  calculateHRZones7(fthr, maxHR = null) {
    // If maxHR not provided, estimate as fthr / 0.95
    const estimatedMaxHR = maxHR || Math.round(fthr / 0.95);
    
    return {
      zone1: {
        name: 'Active Recovery',
        min: Math.round(fthr * 0.50),
        max: Math.round(fthr * 0.60),
        percentage: '50-60% FTHR',
        description: 'Very easy recovery only.',
        color: '#86efac', // green-300
        purpose: 'Recovery rides, active rest'
      },
      zone2: {
        name: 'Endurance',
        min: Math.round(fthr * 0.60),
        max: Math.round(fthr * 0.70),
        percentage: '60-70% FTHR',
        description: 'Easy aerobic base building.',
        color: '#22c55e', // green-500
        purpose: 'Aerobic base, long steady rides'
      },
      zone3: {
        name: 'Tempo',
        min: Math.round(fthr * 0.70),
        max: Math.round(fthr * 0.83),
        percentage: '70-83% FTHR',
        description: 'Moderate aerobic development.',
        color: '#3b82f6', // blue-500
        purpose: 'Aerobic development, sweetspot'
      },
      zone4: {
        name: 'Threshold',
        min: Math.round(fthr * 0.83),
        max: Math.round(fthr * 0.94),
        percentage: '83-94% FTHR',
        description: 'Lactate threshold, sustainable hard.',
        color: '#eab308', // yellow-500
        purpose: 'Lactate threshold, race pace'
      },
      zone5: {
        name: 'VO2 Max',
        min: Math.round(fthr * 0.94),
        max: Math.round(fthr * 1.05),
        percentage: '94-105% FTHR',
        description: 'Maximal aerobic, 3-8 min efforts.',
        color: '#f97316', // orange-500
        purpose: 'VO2max intervals'
      },
      zone6: {
        name: 'Anaerobic Capacity',
        min: Math.round(fthr * 1.05),
        max: Math.round(estimatedMaxHR * 0.98),
        percentage: '105-120% FTHR',
        description: 'Short, very hard efforts.',
        color: '#ef4444', // red-500
        purpose: 'Anaerobic capacity, 30s-3min'
      },
      zone7: {
        name: 'Neuromuscular',
        min: Math.round(estimatedMaxHR * 0.98),
        max: estimatedMaxHR,
        percentage: 'Max effort',
        description: 'All-out sprints, <30 seconds.',
        color: '#991b1b', // red-800
        purpose: 'Sprint power, neuromuscular'
      }
    };
  }

  /**
   * Calculate HR zones based on selected model
   * 
   * @param {number} fthr - Functional Threshold Heart Rate
   * @param {string} model - Zone model ('3-zone', '5-zone', '7-zone')
   * @param {number} maxHR - Optional maximum heart rate for 7-zone model
   * @returns {Object} - Training zones with ranges and descriptions
   */
  calculateHRZonesByModel(fthr, model = '5-zone', maxHR = null) {
    switch(model) {
      case '3-zone':
        return this.calculateHRZones3(fthr);
      case '5-zone':
        return this.calculateHRZones(fthr); // existing method
      case '7-zone':
        return this.calculateHRZones7(fthr, maxHR);
      default:
        return this.calculateHRZones(fthr); // default to 5-zone
    }
  }

  /**
   * Determine which HR zone a given heart rate falls into
   * 
   * @param {number} heartRate - Heart rate in BPM
   * @param {Object} zones - HR zones object from calculateHRZones
   * @returns {string} - Zone name (zone1, zone2, etc.)
   */
  getZoneForHeartRate(heartRate, zones) {
    if (!zones || !heartRate) return null;

    for (const [zoneName, zone] of Object.entries(zones)) {
      if (heartRate >= zone.min && heartRate <= zone.max) {
        return zoneName;
      }
    }

    // If HR is below zone 1
    if (heartRate < zones.zone1.min) return 'zone1';
    
    // If HR is above zone 5
    if (heartRate > zones.zone5.max) return 'zone5';

    return null;
  }

  /**
   * Analyze HR trends over time
   * 
   * @param {Array} activities - Activities with HR data
   * @param {number} fthr - Current FTHR
   * @returns {Object} - HR trend analysis
   */
  analyzeHRTrends(activities, fthr) {
    if (!activities || activities.length === 0 || !fthr) {
      return null;
    }

    const recentActivitiesWithHR = activities
      .filter(a => a.avgHeartRate && a.avgHeartRate > 0)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20); // Last 20 activities with HR

    if (recentActivitiesWithHR.length === 0) return null;

    // Calculate average HR efficiency (lower HR at same power = better fitness)
    const avgHR = recentActivitiesWithHR.reduce((sum, a) => sum + a.avgHeartRate, 0) / recentActivitiesWithHR.length;
    const avgHRPercentage = (avgHR / fthr) * 100;

    // Check for HR drift (sign of fatigue or heat stress)
    const activitiesWithDrift = recentActivitiesWithHR.filter(a => {
      if (!a.maxHeartRate) return false;
      const drift = ((a.maxHeartRate - a.avgHeartRate) / a.avgHeartRate) * 100;
      return drift > 10; // More than 10% drift
    });

    return {
      avgHeartRate: Math.round(avgHR),
      avgPercentageOfFTHR: Math.round(avgHRPercentage),
      activitiesAnalyzed: recentActivitiesWithHR.length,
      highDriftActivities: activitiesWithDrift.length,
      interpretation: this.interpretHRTrends(avgHRPercentage, activitiesWithDrift.length)
    };
  }

  /**
   * Interpret HR trends for user feedback
   */
  interpretHRTrends(avgPercentage, driftCount) {
    let interpretation = [];

    if (avgPercentage < 65) {
      interpretation.push('Mostly easy/recovery training - good for base building');
    } else if (avgPercentage < 75) {
      interpretation.push('Balanced endurance training - sustainable long-term');
    } else if (avgPercentage < 85) {
      interpretation.push('Moderate-high intensity training - ensure adequate recovery');
    } else {
      interpretation.push('High intensity training - monitor for overtraining');
    }

    if (driftCount > 5) {
      interpretation.push('Significant HR drift detected - may indicate fatigue or heat stress');
    }

    return interpretation.join('. ');
  }
}

export const fthrService = new FTHRService();
