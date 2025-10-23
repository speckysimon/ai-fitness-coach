/**
 * FTHR (Functional Threshold Heart Rate) Service
 * 
 * Calculates FTHR and HR training zones based on activity data
 * Similar to FTP calculation but for heart rate
 */

class FTHRService {
  /**
   * Calculate FTHR from recent activities
   * Uses a 6-week rolling window for best accuracy
   * 
   * @param {Array} activities - Array of activity objects with HR data
   * @returns {Object} - { fthr, confidence, method, zones, recentActivities }
   */
  calculateFTHR(activities, manualFTHR = null) {
    // If user has manually set FTHR, use that
    if (manualFTHR && manualFTHR > 0) {
      return {
        fthr: manualFTHR,
        confidence: 'manual',
        method: 'user_provided',
        zones: this.calculateHRZones(manualFTHR),
        recentActivities: 0,
        hardEffortsFound: 0
      };
    }

    if (!activities || activities.length === 0) {
      return {
        fthr: null,
        confidence: 'none',
        method: 'insufficient_data',
        zones: null,
        recentActivities: 0
      };
    }

    // Filter activities from last 12 weeks with HR data (expanded from 6 weeks)
    // Research shows FTHR doesn't decline significantly in 12 weeks
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const recentActivitiesWithHR = activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return (
        activityDate >= twelveWeeksAgo &&
        activity.avgHeartRate &&
        activity.avgHeartRate > 0 &&
        activity.duration >= 1200 // At least 20 minutes
      );
    });

    if (recentActivitiesWithHR.length === 0) {
      return {
        fthr: null,
        confidence: 'none',
        method: 'no_hr_data',
        zones: null,
        recentActivities: 0
      };
    }

    // Method 1: Look for hard efforts (race or hard training)
    // Expanded criteria: 82%+ of max HR, 20-60 min duration
    // Research: threshold efforts typically 82-95% of max HR
    const hardEfforts = recentActivitiesWithHR.filter(activity => {
      const estimatedMaxHR = this.estimateMaxHR(activity);
      const hrIntensity = activity.avgHeartRate / estimatedMaxHR;
      return (
        hrIntensity > 0.82 && // Lowered from 0.85 to catch more threshold efforts
        activity.duration >= 1200 && // 20+ minutes
        activity.duration <= 3600 // Up to 60 minutes (sustained efforts)
      );
    });

    let fthr = null;
    let method = 'none';
    let confidence = 'none';

    if (hardEfforts.length >= 3) {
      // Take the top 3 highest average HR efforts
      const topEfforts = hardEfforts
        .sort((a, b) => b.avgHeartRate - a.avgHeartRate)
        .slice(0, 3);
      
      const avgTopHR = topEfforts.reduce((sum, a) => sum + a.avgHeartRate, 0) / topEfforts.length;
      const avgDuration = topEfforts.reduce((sum, a) => sum + a.duration, 0) / topEfforts.length;
      
      // Research-backed duration adjustments (Coggan methodology)
      if (avgDuration >= 3000) {  // 50-60 min efforts
        fthr = Math.round(avgTopHR * 1.00);  // Already at threshold
      } else if (avgDuration >= 2400) {  // 40-50 min
        fthr = Math.round(avgTopHR * 0.99);
      } else if (avgDuration >= 1800) {  // 30-40 min
        fthr = Math.round(avgTopHR * 0.98);
      } else {  // 20-30 min (standard 20-min test)
        fthr = Math.round(avgTopHR * 0.95);  // Coggan 20-min test standard
      }
      
      method = 'hard_efforts';
      confidence = 'high';
    } 
    else if (hardEfforts.length > 0) {
      // Use available hard efforts but lower confidence
      const avgHR = hardEfforts.reduce((sum, a) => sum + a.avgHeartRate, 0) / hardEfforts.length;
      fthr = Math.round(avgHR * 0.95);  // Conservative for limited data
      method = 'limited_hard_efforts';
      confidence = 'medium';
    }
    else {
      // Method 2: Estimate from max HR in recent activities
      const maxHRObserved = Math.max(...recentActivitiesWithHR.map(a => a.maxHeartRate || a.avgHeartRate));
      
      if (maxHRObserved > 0) {
        // Research-backed: 90% of max HR for trained cyclists (Karvonen, Friel, TrainingPeaks)
        fthr = Math.round(maxHRObserved * 0.90);  // Updated from 0.87
        method = 'max_hr_estimate';
        confidence = 'low';
      }
    }

    // Calculate HR zones if we have FTHR
    const zones = fthr ? this.calculateHRZones(fthr) : null;

    return {
      fthr,
      confidence,
      method,
      zones,
      recentActivities: recentActivitiesWithHR.length,
      hardEffortsFound: hardEfforts.length
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
