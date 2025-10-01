// Advanced analytics for rider profiling and insights

// Calculate power curve (best power for different durations)
export const calculatePowerCurve = (activities) => {
  const durations = [5, 10, 30, 60, 300, 600, 1200, 3600]; // seconds
  const powerCurve = {};

  durations.forEach(duration => {
    let maxPower = 0;
    
    activities.forEach(activity => {
      if (activity.avgPower && activity.duration >= duration) {
        // Estimate power for duration (simplified - in reality would need stream data)
        const estimatedPower = activity.avgPower * (1 + (0.1 * Math.log(activity.duration / duration)));
        maxPower = Math.max(maxPower, estimatedPower);
      }
    });

    powerCurve[duration] = Math.round(maxPower);
  });

  return powerCurve;
};

// Classify rider type based on power curve and activity patterns
export const classifyRiderType = (activities, powerCurve, ftp) => {
  if (!ftp || activities.length < 10) {
    return { type: 'Insufficient Data', confidence: 0, description: 'Need more activities to classify' };
  }

  const scores = {
    sprinter: 0,
    climber: 0,
    rouleur: 0,
    timeTrial: 0,
    allRounder: 0,
    puncheur: 0
  };

  // Analyze power curve shape
  const sprint5s = powerCurve[5] || 0;
  const sprint30s = powerCurve[30] || 0;
  const vo2max5min = powerCurve[300] || 0;
  const threshold20min = powerCurve[1200] || 0;
  const endurance60min = powerCurve[3600] || 0;

  // Sprinter: High 5s and 30s power relative to FTP
  if (sprint5s > ftp * 3) scores.sprinter += 3;
  if (sprint30s > ftp * 2) scores.sprinter += 2;
  if (sprint5s / (threshold20min || ftp) > 3.5) scores.sprinter += 2;

  // Time Trialist: High sustained power, low variability
  if (threshold20min > ftp * 0.95) scores.timeTrial += 3;
  if (endurance60min > ftp * 0.85) scores.timeTrial += 2;
  const avgVariability = activities.reduce((sum, a) => sum + (a.normalizedPower ? a.normalizedPower / a.avgPower : 1), 0) / activities.length;
  if (avgVariability < 1.05) scores.timeTrial += 2;

  // Climber: High power-to-weight, lots of elevation
  const totalElevation = activities.reduce((sum, a) => sum + (a.elevation || 0), 0);
  const avgElevationPerKm = totalElevation / (activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000);
  if (avgElevationPerKm > 15) scores.climber += 3;
  if (vo2max5min > ftp * 1.15) scores.climber += 2;
  
  // Analyze climb-heavy activities
  const climbActivities = activities.filter(a => (a.elevation || 0) / ((a.distance || 1) / 1000) > 20);
  if (climbActivities.length / activities.length > 0.3) scores.climber += 2;

  // Rouleur: Consistent power, moderate everything
  if (threshold20min > ftp * 0.92 && threshold20min < ftp * 1.05) scores.rouleur += 2;
  if (avgElevationPerKm > 5 && avgElevationPerKm < 15) scores.rouleur += 2;
  const avgDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0) / activities.length;
  if (avgDistance > 50000) scores.rouleur += 2; // Long rides

  // Puncheur: Strong 1-5 minute power, moderate climbing
  if (vo2max5min > ftp * 1.2) scores.puncheur += 3;
  if (avgElevationPerKm > 10 && avgElevationPerKm < 20) scores.puncheur += 2;
  if (sprint30s > ftp * 1.8) scores.puncheur += 1;

  // All-Rounder: Balanced across all metrics
  const powerBalance = Math.abs(sprint5s / ftp - 3) + Math.abs(vo2max5min / ftp - 1.2) + Math.abs(threshold20min / ftp - 1);
  if (powerBalance < 1.5) scores.allRounder += 3;

  // Find highest score
  const maxScore = Math.max(...Object.values(scores));
  const topType = Object.keys(scores).find(key => scores[key] === maxScore);

  const typeDescriptions = {
    sprinter: 'Explosive power in short efforts, excels in final sprints',
    climber: 'High power-to-weight ratio, thrives on steep gradients',
    rouleur: 'Consistent power output, strong on flat and rolling terrain',
    timeTrial: 'Sustained high power, excellent aerodynamic efficiency',
    allRounder: 'Balanced abilities across all terrains and durations',
    puncheur: 'Strong on short, steep climbs and punchy efforts'
  };

  const confidence = Math.min(100, (maxScore / 7) * 100);

  return {
    type: topType.charAt(0).toUpperCase() + topType.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    confidence: Math.round(confidence),
    description: typeDescriptions[topType],
    scores: scores
  };
};

// Calculate training zone distribution
export const calculateZoneDistribution = (activities, ftp) => {
  if (!ftp) return null;

  const zones = {
    recovery: { min: 0, max: ftp * 0.55, time: 0, name: 'Recovery', color: '#22c55e' },
    endurance: { min: ftp * 0.55, max: ftp * 0.75, time: 0, name: 'Endurance', color: '#3b82f6' },
    tempo: { min: ftp * 0.75, max: ftp * 0.90, time: 0, name: 'Tempo', color: '#eab308' },
    threshold: { min: ftp * 0.90, max: ftp * 1.05, time: 0, name: 'Threshold', color: '#f97316' },
    vo2max: { min: ftp * 1.05, max: ftp * 1.20, time: 0, name: 'VO2 Max', color: '#ef4444' },
    anaerobic: { min: ftp * 1.20, max: Infinity, time: 0, name: 'Anaerobic', color: '#a855f7' }
  };

  activities.forEach(activity => {
    if (!activity.avgPower || !activity.duration) return;

    const power = activity.avgPower;
    const duration = activity.duration / 3600; // hours

    // Assign to zone
    Object.keys(zones).forEach(zoneKey => {
      const zone = zones[zoneKey];
      if (power >= zone.min && power < zone.max) {
        zone.time += duration;
      }
    });
  });

  const totalTime = Object.values(zones).reduce((sum, z) => sum + z.time, 0);

  return Object.keys(zones).map(key => ({
    name: zones[key].name,
    time: zones[key].time,
    percentage: totalTime > 0 ? (zones[key].time / totalTime) * 100 : 0,
    color: zones[key].color
  }));
};

// Detect training insights and recommendations
export const generateSmartInsights = (activities, ftp, riderType) => {
  const insights = [];

  // Check for FTP test recommendation
  const daysSinceLastHardEffort = getDaysSinceLastHardEffort(activities);
  if (daysSinceLastHardEffort > 30) {
    insights.push({
      type: 'ftp_test',
      priority: 'high',
      icon: 'Zap',
      title: 'Time for an FTP Test',
      message: `It's been ${daysSinceLastHardEffort} days since your last hard effort. Consider testing your FTP to ensure accurate training zones.`,
      action: 'Schedule FTP Test'
    });
  }

  // Check training load
  const recentLoad = calculateRecentLoad(activities);
  if (recentLoad.weeklyTSS > 800) {
    insights.push({
      type: 'recovery',
      priority: 'high',
      icon: 'AlertTriangle',
      title: 'High Training Load Detected',
      message: `Your weekly TSS is ${Math.round(recentLoad.weeklyTSS)}. Consider adding a recovery day to prevent overtraining.`,
      action: 'Plan Recovery'
    });
  } else if (recentLoad.weeklyTSS < 200 && activities.length > 10) {
    insights.push({
      type: 'increase_load',
      priority: 'medium',
      icon: 'TrendingUp',
      title: 'Room for More Training',
      message: `Your weekly TSS is ${Math.round(recentLoad.weeklyTSS)}. You have capacity to increase training volume.`,
      action: 'Add Workouts'
    });
  }

  // Check for consistency
  const consistency = calculateConsistency(activities);
  if (consistency < 50) {
    insights.push({
      type: 'consistency',
      priority: 'medium',
      icon: 'Calendar',
      title: 'Improve Consistency',
      message: `You're training ${consistency}% of planned days. Consistency is key to improvement.`,
      action: 'View Schedule'
    });
  }

  // Rider-specific recommendations
  if (riderType.type.includes('Climber')) {
    const climbingActivities = activities.filter(a => (a.elevation || 0) / ((a.distance || 1) / 1000) > 20);
    if (climbingActivities.length < activities.length * 0.3) {
      insights.push({
        type: 'training_focus',
        priority: 'low',
        icon: 'Mountain',
        title: 'Add More Climbing',
        message: 'As a climber, consider adding more hill work to your training.',
        action: 'Find Climbs'
      });
    }
  }

  if (riderType.type.includes('Sprinter')) {
    insights.push({
      type: 'training_focus',
      priority: 'low',
      icon: 'Zap',
      title: 'Sprint Training',
      message: 'Include regular sprint intervals to maintain your explosive power.',
      action: 'View Sprint Workouts'
    });
  }

  // Check for personal records
  const recentPRs = checkForRecentPRs(activities);
  if (recentPRs.length > 0) {
    insights.push({
      type: 'achievement',
      priority: 'low',
      icon: 'Trophy',
      title: 'Recent Personal Records!',
      message: `You set ${recentPRs.length} PR${recentPRs.length > 1 ? 's' : ''} recently. Great progress!`,
      action: 'View PRs'
    });
  }

  return insights;
};

// Helper functions
const getDaysSinceLastHardEffort = (activities) => {
  const hardEfforts = activities.filter(a => a.tss && a.tss > 100);
  if (hardEfforts.length === 0) return 999;
  
  const mostRecent = hardEfforts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const daysDiff = Math.floor((Date.now() - new Date(mostRecent.date)) / (1000 * 60 * 60 * 24));
  return daysDiff;
};

const calculateRecentLoad = (activities) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const recentActivities = activities.filter(a => new Date(a.date) >= oneWeekAgo);
  const weeklyTSS = recentActivities.reduce((sum, a) => sum + (a.tss || 0), 0);
  
  return { weeklyTSS, activityCount: recentActivities.length };
};

const calculateConsistency = (activities) => {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentActivities = activities.filter(a => new Date(a.date) >= fourWeeksAgo);
  const daysWithActivities = new Set(recentActivities.map(a => new Date(a.date).toDateString())).size;
  
  return Math.round((daysWithActivities / 28) * 100);
};

const checkForRecentPRs = (activities) => {
  // Simplified - would need more sophisticated PR detection
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentActivities = activities.filter(a => new Date(a.date) >= twoWeeksAgo);
  return recentActivities.filter(a => a.tss && a.tss > 150); // Placeholder for PR detection
};

// Calculate efficiency metrics
export const calculateEfficiencyMetrics = (activities, ftp) => {
  if (activities.length < 5) return null;

  const metricsActivities = activities.filter(a => a.avgPower && a.avgHeartRate && a.duration > 1800);
  
  if (metricsActivities.length < 3) return null;

  // Calculate aerobic decoupling (power vs HR drift)
  const decouplingData = metricsActivities.map(activity => {
    const efficiency = activity.avgPower / activity.avgHeartRate;
    return {
      date: activity.date,
      efficiency: efficiency,
      name: activity.name
    };
  }).sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate trend
  const recentEfficiency = decouplingData.slice(-5).reduce((sum, d) => sum + d.efficiency, 0) / 5;
  const olderEfficiency = decouplingData.slice(0, 5).reduce((sum, d) => sum + d.efficiency, 0) / 5;
  const efficiencyTrend = ((recentEfficiency - olderEfficiency) / olderEfficiency) * 100;

  return {
    currentEfficiency: recentEfficiency.toFixed(2),
    trend: efficiencyTrend.toFixed(1),
    data: decouplingData
  };
};

// Calculate race day form predictor
export const calculateRaceDayForm = (activities, ftp, raceDate = new Date()) => {
  if (activities.length < 10) {
    return {
      readinessScore: 0,
      status: 'insufficient_data',
      message: 'Need at least 10 activities to predict form'
    };
  }

  const sortedActivities = [...activities].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate CTL (Chronic Training Load - 42 day rolling average)
  const ctl = calculateCTL(sortedActivities, raceDate);
  
  // Calculate ATL (Acute Training Load - 7 day rolling average)
  const atl = calculateATL(sortedActivities, raceDate);
  
  // Calculate TSB (Training Stress Balance)
  const tsb = ctl - atl;
  
  // Calculate recent performance trends
  const performanceTrend = calculatePerformanceTrend(sortedActivities, ftp, raceDate);
  
  // Calculate recovery status
  const recoveryStatus = calculateRecoveryStatus(sortedActivities, raceDate);
  
  // Calculate training consistency
  const consistency = calculateTrainingConsistency(sortedActivities, raceDate);
  
  // Calculate composite readiness score (0-100)
  const readinessScore = calculateReadinessScore({
    tsb,
    ctl,
    atl,
    performanceTrend,
    recoveryStatus,
    consistency
  });
  
  // Determine form status
  const formStatus = getFormStatus(tsb, readinessScore);
  
  // Generate recommendations
  const recommendations = generateFormRecommendations(tsb, ctl, atl, performanceTrend, recoveryStatus, readinessScore);
  
  // Calculate optimal taper
  const taperAdvice = calculateTaperAdvice(ctl, atl, tsb, raceDate);
  
  return {
    readinessScore: Math.round(readinessScore),
    status: formStatus.status,
    statusColor: formStatus.color,
    statusMessage: formStatus.message,
    metrics: {
      fitness: Math.round(ctl),
      fatigue: Math.round(atl),
      form: Math.round(tsb),
      performanceTrend: performanceTrend.trend,
      recoveryScore: recoveryStatus.score,
      consistencyScore: consistency.score
    },
    chartData: {
      fitnessHistory: calculateFitnessHistory(sortedActivities, raceDate),
      formHistory: calculateFormHistory(sortedActivities, raceDate)
    },
    recommendations,
    taperAdvice,
    breakdown: {
      fitnessContribution: calculateContribution(ctl, 100),
      formContribution: calculateContribution(tsb + 25, 50), // TSB typically ranges -25 to +25
      performanceContribution: performanceTrend.contribution,
      recoveryContribution: recoveryStatus.contribution,
      consistencyContribution: consistency.contribution
    }
  };
};

// Helper: Calculate CTL (42-day exponentially weighted average)
const calculateCTL = (activities, targetDate) => {
  const fortyTwoDaysAgo = new Date(targetDate);
  fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 42);
  
  const recentActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    return activityDate >= fortyTwoDaysAgo && activityDate <= targetDate;
  });
  
  if (recentActivities.length === 0) return 0;
  
  // Exponentially weighted average with decay constant
  const decayConstant = 42;
  let ctl = 0;
  
  recentActivities.forEach((activity, index) => {
    const tss = activity.tss || estimateTSS(activity);
    const weight = Math.exp(-index / decayConstant);
    ctl += tss * weight;
  });
  
  return ctl / recentActivities.length;
};

// Helper: Calculate ATL (7-day exponentially weighted average)
const calculateATL = (activities, targetDate) => {
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentActivities = activities.filter(a => {
    const activityDate = new Date(a.date);
    return activityDate >= sevenDaysAgo && activityDate <= targetDate;
  });
  
  if (recentActivities.length === 0) return 0;
  
  const totalTSS = recentActivities.reduce((sum, a) => sum + (a.tss || estimateTSS(a)), 0);
  return totalTSS / 7; // Daily average
};

// Helper: Estimate TSS if not available
const estimateTSS = (activity) => {
  if (!activity.duration) return 0;
  
  const hours = activity.duration / 3600;
  const intensityFactor = activity.avgPower ? 0.7 : 0.6; // Lower if no power data
  
  return hours * intensityFactor * 100;
};

// Helper: Calculate performance trend
const calculatePerformanceTrend = (activities, ftp, targetDate) => {
  const twoWeeksAgo = new Date(targetDate);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const fourWeeksAgo = new Date(targetDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentActivities = activities.filter(a => {
    const date = new Date(a.date);
    return date >= twoWeeksAgo && date <= targetDate;
  });
  
  const olderActivities = activities.filter(a => {
    const date = new Date(a.date);
    return date >= fourWeeksAgo && date < twoWeeksAgo;
  });
  
  if (recentActivities.length === 0 || olderActivities.length === 0) {
    return { trend: 0, contribution: 50 };
  }
  
  const recentAvgPower = recentActivities.reduce((sum, a) => sum + (a.avgPower || 0), 0) / recentActivities.length;
  const olderAvgPower = olderActivities.reduce((sum, a) => sum + (a.avgPower || 0), 0) / olderActivities.length;
  
  if (olderAvgPower === 0) return { trend: 0, contribution: 50 };
  
  const trendPercent = ((recentAvgPower - olderAvgPower) / olderAvgPower) * 100;
  const contribution = Math.min(100, Math.max(0, 50 + trendPercent * 5));
  
  return {
    trend: Math.round(trendPercent * 10) / 10,
    contribution: Math.round(contribution)
  };
};

// Helper: Calculate recovery status
const calculateRecoveryStatus = (activities, targetDate) => {
  const threeDaysAgo = new Date(targetDate);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const recentActivities = activities.filter(a => {
    const date = new Date(a.date);
    return date >= threeDaysAgo && date <= targetDate;
  });
  
  if (recentActivities.length === 0) {
    return { score: 100, contribution: 100, status: 'Well Rested' };
  }
  
  // Calculate recovery based on recent load
  const recentLoad = recentActivities.reduce((sum, a) => sum + (a.tss || estimateTSS(a)), 0);
  const avgDailyLoad = recentLoad / 3;
  
  // Score inversely proportional to load
  let score = 100;
  if (avgDailyLoad > 150) score = 30;
  else if (avgDailyLoad > 100) score = 50;
  else if (avgDailyLoad > 50) score = 70;
  else score = 90;
  
  // Check for rest days
  const restDays = 3 - recentActivities.length;
  score += restDays * 5;
  score = Math.min(100, score);
  
  let status = 'Well Rested';
  if (score < 50) status = 'Fatigued';
  else if (score < 70) status = 'Moderate';
  
  return {
    score: Math.round(score),
    contribution: Math.round(score),
    status
  };
};

// Helper: Calculate training consistency
const calculateTrainingConsistency = (activities, targetDate) => {
  const fourWeeksAgo = new Date(targetDate);
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  
  const recentActivities = activities.filter(a => {
    const date = new Date(a.date);
    return date >= fourWeeksAgo && date <= targetDate;
  });
  
  if (recentActivities.length === 0) {
    return { score: 0, contribution: 0, daysActive: 0 };
  }
  
  const daysWithActivities = new Set(recentActivities.map(a => new Date(a.date).toDateString())).size;
  const score = (daysWithActivities / 28) * 100;
  
  return {
    score: Math.round(score),
    contribution: Math.round(score),
    daysActive: daysWithActivities
  };
};

// Helper: Calculate composite readiness score
const calculateReadinessScore = ({ tsb, ctl, performanceTrend, recoveryStatus, consistency }) => {
  // Weights for each component
  const weights = {
    form: 0.30,        // TSB is most important
    fitness: 0.20,     // CTL baseline
    performance: 0.20, // Recent performance
    recovery: 0.20,    // Recovery status
    consistency: 0.10  // Training consistency
  };
  
  // Normalize TSB to 0-100 scale (optimal TSB is +5 to +15)
  let formScore = 50;
  if (tsb >= 5 && tsb <= 15) formScore = 100;
  else if (tsb >= 0 && tsb < 5) formScore = 70 + (tsb * 6);
  else if (tsb > 15 && tsb <= 25) formScore = 100 - ((tsb - 15) * 3);
  else if (tsb < 0 && tsb >= -10) formScore = 70 + (tsb * 3);
  else if (tsb < -10) formScore = Math.max(0, 40 + (tsb + 10) * 2);
  else formScore = Math.max(0, 70 - (tsb - 25) * 2);
  
  // Normalize CTL to 0-100 scale (higher is better, up to a point)
  const fitnessScore = Math.min(100, (ctl / 100) * 100);
  
  // Calculate weighted score
  const readiness = 
    (formScore * weights.form) +
    (fitnessScore * weights.fitness) +
    (performanceTrend.contribution * weights.performance) +
    (recoveryStatus.contribution * weights.recovery) +
    (consistency.contribution * weights.consistency);
  
  return Math.max(0, Math.min(100, readiness));
};

// Helper: Get form status
const getFormStatus = (tsb, readinessScore) => {
  if (readinessScore >= 85) {
    return {
      status: 'peak',
      color: 'from-green-400 to-emerald-600',
      message: '🎯 Peak Form - Ready to Race!'
    };
  } else if (readinessScore >= 70) {
    return {
      status: 'good',
      color: 'from-blue-400 to-blue-600',
      message: '💪 Good Form - Race Ready'
    };
  } else if (readinessScore >= 50) {
    return {
      status: 'moderate',
      color: 'from-yellow-400 to-orange-500',
      message: '⚠️ Moderate Form - Consider More Rest'
    };
  } else if (readinessScore >= 30) {
    return {
      status: 'low',
      color: 'from-orange-400 to-red-500',
      message: '⚡ Low Form - Need Recovery'
    };
  } else {
    return {
      status: 'poor',
      color: 'from-red-400 to-red-600',
      message: '🚫 Poor Form - Not Race Ready'
    };
  }
};

// Helper: Generate recommendations
const generateFormRecommendations = (tsb, ctl, atl, performanceTrend, recoveryStatus, readinessScore) => {
  const recommendations = [];
  
  // TSB-based recommendations
  if (tsb < -10) {
    recommendations.push({
      type: 'recovery',
      priority: 'high',
      title: 'High Fatigue Detected',
      message: 'Your fatigue is significantly higher than fitness. Take 2-3 easy days or rest completely.',
      icon: 'AlertTriangle'
    });
  } else if (tsb < 0) {
    recommendations.push({
      type: 'recovery',
      priority: 'medium',
      title: 'Slight Fatigue',
      message: 'Consider an easy day or active recovery to improve form.',
      icon: 'AlertTriangle'
    });
  } else if (tsb > 20) {
    recommendations.push({
      type: 'training',
      priority: 'medium',
      title: 'Form May Be Fading',
      message: 'TSB is very high. If race is soon, do a short intensity session to maintain sharpness.',
      icon: 'Zap'
    });
  }
  
  // Performance trend recommendations
  if (performanceTrend.trend < -5) {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Performance Declining',
      message: 'Recent power outputs are down. Prioritize recovery and check for illness or overtraining.',
      icon: 'TrendingDown'
    });
  } else if (performanceTrend.trend > 5) {
    recommendations.push({
      type: 'performance',
      priority: 'low',
      title: 'Performance Improving',
      message: 'Great progress! Your recent efforts show strong improvement.',
      icon: 'TrendingUp'
    });
  }
  
  // Recovery recommendations
  if (recoveryStatus.score < 50) {
    recommendations.push({
      type: 'recovery',
      priority: 'high',
      title: 'Poor Recovery Status',
      message: 'Your recent training load is high. Take at least 1 full rest day.',
      icon: 'Moon'
    });
  }
  
  // Fitness recommendations
  if (ctl < 40 && readinessScore < 60) {
    recommendations.push({
      type: 'fitness',
      priority: 'medium',
      title: 'Low Fitness Base',
      message: 'Your chronic training load is low. Build more base fitness before racing.',
      icon: 'Activity'
    });
  }
  
  // Optimal form
  if (readinessScore >= 85) {
    recommendations.push({
      type: 'optimal',
      priority: 'low',
      title: 'Optimal Race Form',
      message: 'You\'re in peak condition! Maintain current routine and stay confident.',
      icon: 'Trophy'
    });
  }
  
  return recommendations;
};

// Helper: Calculate taper advice
const calculateTaperAdvice = (ctl, atl, tsb, raceDate) => {
  const daysToRace = Math.floor((new Date(raceDate) - new Date()) / (1000 * 60 * 60 * 24));
  
  if (daysToRace < 0) {
    return {
      phase: 'post-race',
      message: 'Race has passed. Focus on recovery.',
      recommendations: []
    };
  }
  
  if (daysToRace > 14) {
    return {
      phase: 'build',
      daysToRace,
      message: 'Continue building fitness. Focus on quality training.',
      recommendations: [
        'Maintain consistent training volume',
        'Include 2-3 high-intensity sessions per week',
        'Prioritize recovery between hard efforts'
      ]
    };
  }
  
  if (daysToRace > 7) {
    return {
      phase: 'pre-taper',
      daysToRace,
      message: 'Begin reducing volume while maintaining intensity.',
      recommendations: [
        'Reduce training volume by 20-30%',
        'Keep intensity high but reduce duration',
        'Increase sleep and focus on nutrition'
      ]
    };
  }
  
  if (daysToRace > 3) {
    return {
      phase: 'taper',
      daysToRace,
      message: 'Active taper phase. Reduce volume significantly.',
      recommendations: [
        'Reduce volume by 40-60%',
        'Include short, sharp efforts to maintain sharpness',
        'Prioritize sleep and stress management'
      ]
    };
  }
  
  return {
    phase: 'final-prep',
    daysToRace,
    message: 'Final preparation. Keep it easy and stay fresh.',
    recommendations: [
      'Very light spinning only',
      'Focus on mental preparation',
      'Ensure equipment is race-ready',
      'Stay hydrated and well-fed'
    ]
  };
};

// Helper: Calculate fitness history (last 90 days)
const calculateFitnessHistory = (activities, targetDate) => {
  const ninetyDaysAgo = new Date(targetDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const history = [];
  const currentDate = new Date(ninetyDaysAgo);
  
  while (currentDate <= targetDate) {
    const ctl = calculateCTL(activities, currentDate);
    const atl = calculateATL(activities, currentDate);
    
    history.push({
      date: new Date(currentDate).toISOString(),
      fitness: Math.round(ctl),
      fatigue: Math.round(atl)
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return history.filter((_, index) => index % 3 === 0); // Sample every 3 days for performance
};

// Helper: Calculate form history (TSB over time)
const calculateFormHistory = (activities, targetDate) => {
  const ninetyDaysAgo = new Date(targetDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  const history = [];
  const currentDate = new Date(ninetyDaysAgo);
  
  while (currentDate <= targetDate) {
    const ctl = calculateCTL(activities, currentDate);
    const atl = calculateATL(activities, currentDate);
    const tsb = ctl - atl;
    
    history.push({
      date: new Date(currentDate).toISOString(),
      form: Math.round(tsb)
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return history.filter((_, index) => index % 3 === 0); // Sample every 3 days
};

// Helper: Calculate contribution percentage
const calculateContribution = (value, maxValue) => {
  return Math.round((value / maxValue) * 100);
};
