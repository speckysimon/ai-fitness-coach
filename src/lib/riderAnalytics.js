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
