/**
 * Smart Metrics Service
 * 
 * Provides training-load-aware FTP/FTHR calculations
 * Uses CTL (Chronic Training Load) and training gaps to adjust calculation windows
 * Research-backed approach based on Coggan, Friel, and Bannister TRIMP model
 */

class SmartMetricsService {
  
  /**
   * Calculate FTP with training load awareness
   * @param {Array} activities - Array of activity objects
   * @param {Number} lastKnownFTP - Previously calculated FTP (optional)
   * @returns {Object} - { ftp, confidence, method, context, recommendation }
   */
  calculateSmartFTP(activities, lastKnownFTP = null) {
    console.log('[Smart FTP] Starting calculation with', activities.length, 'activities');
    
    // 1. Analyze training context
    const context = this.analyzeTrainingContext(activities);
    
    console.log('[Smart FTP] Context:', {
      ctlTrend: context.ctlTrend,
      weeklyTSS: context.weeklyTSS,
      hasGaps: context.hasRecentGap,
      hardEfforts: context.hardEfforts
    });
    
    // 2. Determine calculation window based on context
    let windowDays = 42; // Default 6 weeks (research standard)
    
    if (context.hasRecentGap) {
      windowDays = 28; // 4 weeks if recent gap (>14 days off)
      console.log('[Smart FTP] Recent training gap detected, using 4-week window');
    } else if (context.ctlChange < -0.15) {
      windowDays = 28; // 4 weeks if CTL declining significantly
      console.log('[Smart FTP] CTL declining >15%, using 4-week window');
    }
    
    // 3. Find hard efforts in adaptive window
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - windowDays);
    
    const recentActivities = activities.filter(a => 
      new Date(a.date) >= cutoffDate && a.avgPower > 0
    );
    
    const hardEfforts = this.findHardEfforts(recentActivities);
    console.log('[Smart FTP] Found', hardEfforts.length, 'hard efforts in', windowDays, 'day window');
    
    // 4. Handle case: No hard efforts but training continues
    if (hardEfforts.length < 3 && context.trainingConsistent) {
      console.log('[Smart FTP] No hard efforts, but training consistent (TSS:', context.weeklyTSS, ')');
      return {
        ftp: lastKnownFTP,
        confidence: 'medium',
        method: 'maintained_by_ctl',
        message: `Training load stable (${Math.round(context.weeklyTSS)} TSS/week). FTP likely maintained.`,
        recommendation: 'Consider a 20-min FTP test to get an updated measurement',
        confidenceExplanation: 'Medium confidence: No recent hard efforts found, but consistent training suggests FTP is maintained',
        context,
        windowDays
      };
    }
    
    // 5. Handle case: No hard efforts and reduced training
    if (hardEfforts.length < 3 && !context.trainingConsistent) {
      const estimatedDecline = Math.min(Math.abs(context.ctlChange) * 0.7, 0.15); // Max 15% decline
      console.log('[Smart FTP] Reduced training, estimating decline:', (estimatedDecline * 100).toFixed(1) + '%');
      
      const hasRecentGap = context.gaps.length > 0;
      const recommendation = hasRecentGap 
        ? 'Training gap detected. Do a 20-min test when you resume consistent training'
        : 'Training load has declined. Consider a 20-min test to measure current FTP';
      
      return {
        ftp: lastKnownFTP ? Math.round(lastKnownFTP * (1 - estimatedDecline)) : null,
        confidence: 'low',
        method: 'estimated_decline',
        message: `Training load declined ${Math.round(Math.abs(context.ctlChange) * 100)}%. Estimated FTP decline of ${Math.round(estimatedDecline * 100)}%.`,
        recommendation,
        confidenceExplanation: `Low confidence: Training load declined and/or gaps detected. FTP estimated based on CTL change`,
        context,
        windowDays,
        estimatedDecline
      };
    }
    
    // 6. Normal calculation from hard efforts
    return this.calculateFromHardEfforts(hardEfforts, context, windowDays);
  }
  
  /**
   * Analyze training context (CTL, gaps, consistency)
   * @param {Array} activities - Array of activity objects
   * @returns {Object} - Training context metrics
   */
  analyzeTrainingContext(activities) {
    const last6Weeks = this.filterByDays(activities, 42);
    const last12Weeks = this.filterByDays(activities, 84);
    
    // Calculate current CTL (last 6 weeks)
    const currentCTL = this.calculateCTL(last6Weeks);
    
    // Calculate previous 6 weeks CTL (weeks 7-12)
    const previous6Weeks = last12Weeks.filter(a => {
      const daysAgo = (new Date() - new Date(a.date)) / (1000 * 60 * 60 * 24);
      return daysAgo >= 42 && daysAgo < 84;
    });
    const previous6WeeksCTL = this.calculateCTL(previous6Weeks);
    
    // Calculate CTL change
    const ctlChange = previous6WeeksCTL > 0 
      ? (currentCTL - previous6WeeksCTL) / previous6WeeksCTL 
      : 0;
    
    // Detect training gaps
    const gaps = this.detectGaps(last6Weeks);
    const hasRecentGap = gaps.some(g => g.days > 14);
    
    // Find hard efforts
    const hardEfforts = this.findHardEfforts(last6Weeks);
    
    // Calculate weekly TSS
    const weeklyTSS = this.calculateWeeklyTSS(last6Weeks);
    
    return {
      currentCTL: Math.round(currentCTL),
      previous6WeeksCTL: Math.round(previous6WeeksCTL),
      ctlChange: Math.round(ctlChange * 100) / 100,
      ctlTrend: ctlChange < -0.10 ? 'declining' : 
                ctlChange > 0.10 ? 'improving' : 'stable',
      hasRecentGap,
      gaps,
      hardEfforts: hardEfforts.length,
      weeklyTSS: Math.round(weeklyTSS),
      trainingConsistent: !hasRecentGap && weeklyTSS > 200
    };
  }
  
  /**
   * Calculate CTL (Chronic Training Load) - 42-day exponentially weighted average
   * @param {Array} activities - Array of activity objects
   * @returns {Number} - CTL value
   */
  calculateCTL(activities) {
    if (activities.length === 0) return 0;
    
    // Sort by date (oldest first)
    const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let ctl = 0;
    const decay = 2 / (42 + 1); // 42-day time constant
    
    sorted.forEach(activity => {
      const tss = this.calculateTSS(activity);
      ctl = ctl + decay * (tss - ctl);
    });
    
    return ctl;
  }
  
  /**
   * Detect training gaps (>7 days)
   * @param {Array} activities - Array of activity objects
   * @returns {Array} - Array of gap objects
   */
  detectGaps(activities) {
    if (activities.length < 2) return [];
    
    const sorted = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000 * 60 * 60 * 24);
      
      if (daysBetween > 7) {
        gaps.push({
          start: sorted[i-1].date,
          end: sorted[i].date,
          days: Math.round(daysBetween)
        });
      }
    }
    
    return gaps;
  }
  
  /**
   * Find hard efforts (20-60 min at high intensity)
   * @param {Array} activities - Array of activity objects
   * @returns {Array} - Array of hard effort activities
   */
  findHardEfforts(activities) {
    return activities.filter(a => {
      if (!a.avgPower || a.avgPower < 100) return false;
      if (a.duration < 1200 || a.duration > 3600) return false; // 20-60 min
      
      // High power relative to duration
      const power = a.normalizedPower || a.avgPower;
      return power > 200; // Minimum threshold for hard effort
    });
  }
  
  /**
   * Calculate weekly TSS average
   * @param {Array} activities - Array of activity objects
   * @returns {Number} - Average weekly TSS
   */
  calculateWeeklyTSS(activities) {
    if (activities.length === 0) return 0;
    
    const totalTSS = activities.reduce((sum, a) => sum + this.calculateTSS(a), 0);
    const dates = activities.map(a => new Date(a.date));
    const oldestDate = new Date(Math.min(...dates));
    const newestDate = new Date(Math.max(...dates));
    const daysSpan = (newestDate - oldestDate) / (1000 * 60 * 60 * 24);
    const weeks = Math.max(daysSpan / 7, 1); // At least 1 week
    
    return totalTSS / weeks;
  }
  
  /**
   * Calculate TSS for an activity
   * @param {Object} activity - Activity object
   * @param {Number} ftp - FTP value (optional)
   * @returns {Number} - TSS value
   */
  calculateTSS(activity, ftp = null) {
    if (!activity.duration) return 0;
    
    const durationHours = activity.duration / 3600;
    
    // Power-based TSS (most accurate)
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }
    
    // HR-based estimation
    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170; // Assume threshold ~170
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }
    
    // Duration-based fallback
    const typeMultipliers = {
      'Ride': 1.0, 
      'VirtualRide': 1.0, 
      'Run': 1.2, 
      'Workout': 0.8, 
      'default': 0.7
    };
    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  }
  
  /**
   * Calculate FTP from hard efforts
   * @param {Array} hardEfforts - Array of hard effort activities
   * @param {Object} context - Training context
   * @param {Number} windowDays - Calculation window in days
   * @returns {Object} - FTP calculation result
   */
  calculateFromHardEfforts(hardEfforts, context, windowDays) {
    if (hardEfforts.length === 0) {
      return { 
        ftp: null, 
        confidence: 'none',
        method: 'no_efforts',
        message: 'No hard efforts found',
        context,
        windowDays
      };
    }
    
    // Sort by power descending
    const sorted = [...hardEfforts].sort((a, b) => 
      (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
    );
    
    // Take top 3 (or all if less than 3)
    const topEfforts = sorted.slice(0, Math.min(3, sorted.length));
    const avgPower = topEfforts.reduce((sum, a) => sum + (a.normalizedPower || a.avgPower), 0) / topEfforts.length;
    const avgDuration = topEfforts.reduce((sum, a) => sum + a.duration, 0) / topEfforts.length;
    
    // Duration-based multiplier (research-backed - Coggan methodology)
    let multiplier = 0.95; // Default for 20-30 min
    if (avgDuration >= 3000) {
      multiplier = 1.00; // 50-60 min = true threshold
    } else if (avgDuration >= 2400) {
      multiplier = 0.99; // 40-50 min
    } else if (avgDuration >= 1800) {
      multiplier = 0.98; // 30-40 min
    }
    
    const ftp = Math.round(avgPower * multiplier);
    const confidence = topEfforts.length >= 3 ? 'high' : 'medium';
    
    // Better recommendations based on confidence
    let recommendation = null;
    if (confidence === 'medium') {
      recommendation = 'Good data, but consider another hard effort to increase confidence';
    }
    // High confidence doesn't need a recommendation
    
    const confidenceExplanation = confidence === 'high'
      ? `High confidence: Calculated from ${topEfforts.length} recent hard efforts with consistent power data`
      : `Medium confidence: Only ${topEfforts.length} hard effort${topEfforts.length > 1 ? 's' : ''} found. More data would improve accuracy`;
    
    return {
      ftp,
      confidence,
      method: 'hard_efforts',
      effortsUsed: topEfforts.length,
      avgDuration: Math.round(avgDuration / 60),
      avgPower: Math.round(avgPower),
      multiplier,
      message: `Calculated from ${topEfforts.length} hard effort${topEfforts.length > 1 ? 's' : ''} (avg ${Math.round(avgDuration / 60)} min)`,
      recommendation,
      confidenceExplanation,
      context,
      windowDays
    };
  }
  
  /**
   * Filter activities by days
   * @param {Array} activities - Array of activity objects
   * @param {Number} days - Number of days to filter
   * @returns {Array} - Filtered activities
   */
  filterByDays(activities, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return activities.filter(a => new Date(a.date) >= cutoff);
  }
}

export const smartMetricsService = new SmartMetricsService();
