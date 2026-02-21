// Backend service for rider analytics with windowing and dual confidence model

/**
 * Calculate power curve with windowing
 * @param {Array} activities - Array of activities
 * @param {number} windowDays - Number of days to look back (default: 42)
 * @returns {Object} Power curve data
 */
export const calculatePowerCurve = (activities, windowDays = 42) => {
  const durations = [5, 10, 30, 60, 300, 600, 1200, 3600]; // seconds
  const powerCurve = {};
  
  // Filter activities by window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  
  const windowedActivities = activities.filter(a => {
    const activityDate = new Date(a.date || a.start_date_local || a.start_date);
    return activityDate >= cutoffDate;
  });

  durations.forEach(duration => {
    let maxPower = 0;
    
    windowedActivities.forEach(activity => {
      const avgPower = activity.avgPower || activity.average_watts || activity.icu_average_watts;
      const activityDuration = activity.duration || activity.moving_time || activity.elapsed_time;
      
      if (avgPower && activityDuration >= duration) {
        // Estimate power for duration (simplified - in reality would need stream data)
        const estimatedPower = avgPower * (1 + (0.1 * Math.log(activityDuration / duration)));
        maxPower = Math.max(maxPower, estimatedPower);
      }
    });

    powerCurve[duration] = Math.round(maxPower);
  });

  return {
    powerCurve,
    windowDays,
    activitiesAnalyzed: windowedActivities.length,
    updatedAt: new Date().toISOString()
  };
};

/**
 * Calculate evidence level based on data quality
 * @param {Array} activities - Windowed activities
 * @param {number} windowDays - Window size
 * @returns {Object} Evidence assessment
 */
const calculateEvidence = (activities, windowDays) => {
  const powerActivities = activities.filter(a => {
    const avgPower = a.avgPower || a.average_watts || a.icu_average_watts;
    return avgPower && avgPower > 0;
  });
  
  const effortCount = powerActivities.length;
  const coverage = activities.length / (windowDays / 7); // Activities per week
  
  // Evidence thresholds
  let level = 'low';
  let score = 0;
  const reasons = [];
  
  if (effortCount >= 15) {
    score += 40;
    reasons.push(`${effortCount} power-based efforts`);
  } else if (effortCount >= 10) {
    score += 25;
    reasons.push(`${effortCount} power-based efforts`);
  } else if (effortCount >= 5) {
    score += 10;
    reasons.push(`Only ${effortCount} power-based efforts`);
  } else {
    reasons.push(`Insufficient power data (${effortCount} efforts)`);
  }
  
  if (coverage >= 3) {
    score += 30;
    reasons.push(`Good coverage (${coverage.toFixed(1)} rides/week)`);
  } else if (coverage >= 2) {
    score += 20;
    reasons.push(`Moderate coverage (${coverage.toFixed(1)} rides/week)`);
  } else {
    score += 5;
    reasons.push(`Low coverage (${coverage.toFixed(1)} rides/week)`);
  }
  
  // Recency bonus
  const mostRecentDate = new Date(Math.max(...activities.map(a => new Date(a.date || a.start_date_local))));
  const daysSinceRecent = (new Date() - mostRecentDate) / (1000 * 60 * 60 * 24);
  
  if (daysSinceRecent <= 7) {
    score += 30;
    reasons.push('Recent data (within 7 days)');
  } else if (daysSinceRecent <= 14) {
    score += 20;
    reasons.push('Recent data (within 14 days)');
  } else {
    score += 5;
    reasons.push(`Stale data (${Math.round(daysSinceRecent)} days old)`);
  }
  
  // Determine level
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'medium';
  else level = 'low';
  
  return {
    level,
    score,
    reasons,
    effortCount,
    coverage: coverage.toFixed(1)
  };
};

/**
 * Calculate certainty level based on classification clarity
 * @param {Object} scores - Rider type scores
 * @returns {Object} Certainty assessment
 */
const calculateCertainty = (scores) => {
  const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const topScore = sortedScores[0][1];
  const secondScore = sortedScores[1][1];
  
  const separation = topScore - secondScore;
  
  let level = 'low';
  let score = 0;
  const reasons = [];
  
  // Separation scoring
  if (separation >= 3) {
    score += 60;
    reasons.push(`Clear winner (${separation} point lead)`);
  } else if (separation >= 2) {
    score += 40;
    reasons.push(`Moderate separation (${separation} point lead)`);
  } else if (separation >= 1) {
    score += 20;
    reasons.push(`Close race (${separation} point lead)`);
  } else {
    score += 5;
    reasons.push('Tied or very close scores');
  }
  
  // Top score strength
  if (topScore >= 5) {
    score += 40;
    reasons.push(`Strong classification (${topScore}/7 score)`);
  } else if (topScore >= 3) {
    score += 20;
    reasons.push(`Moderate classification (${topScore}/7 score)`);
  } else {
    score += 5;
    reasons.push(`Weak classification (${topScore}/7 score)`);
  }
  
  // Determine level
  if (score >= 70) level = 'high';
  else if (score >= 40) level = 'moderate';
  else level = 'low';
  
  return {
    level,
    score,
    separation,
    reasons
  };
};

/**
 * Classify rider type with windowing and dual confidence
 * @param {Array} activities - Array of activities
 * @param {Object} powerCurve - Pre-calculated power curve
 * @param {number} ftp - Functional Threshold Power
 * @param {number} windowDays - Number of days to look back
 * @returns {Object} Rider type classification with evidence and certainty
 */
export const classifyRiderType = (activities, powerCurve, ftp, windowDays = 42) => {
  // Filter activities by window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  
  const windowedActivities = activities.filter(a => {
    const activityDate = new Date(a.date || a.start_date_local || a.start_date);
    return activityDate >= cutoffDate;
  });
  
  if (!ftp || windowedActivities.length < 10) {
    return { 
      type: 'Insufficient Data', 
      confidence: 0,
      dataEvidence: { level: 'low', score: 0, reasons: ['Need at least 10 activities'] },
      modelCertainty: { level: 'low', score: 0, reasons: ['Insufficient data'] },
      description: 'Need more activities to classify',
      scores: {
        sprinter: 0,
        climber: 0,
        rouleur: 0,
        timeTrial: 0,
        allRounder: 0,
        puncheur: 0
      },
      windowDays,
      activitiesAnalyzed: windowedActivities.length
    };
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
  const avgVariability = windowedActivities.reduce((sum, a) => {
    const np = a.normalizedPower || a.normalized_power;
    const ap = a.avgPower || a.average_watts || a.icu_average_watts;
    return sum + (np && ap ? np / ap : 1);
  }, 0) / windowedActivities.length;
  if (avgVariability < 1.05) scores.timeTrial += 2;

  // Climber: High power-to-weight, lots of elevation
  const totalElevation = windowedActivities.reduce((sum, a) => sum + (a.elevation || a.total_elevation_gain || 0), 0);
  const totalDistance = windowedActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
  const avgElevationPerKm = totalDistance > 0 ? totalElevation / (totalDistance / 1000) : 0;
  
  if (avgElevationPerKm > 15) scores.climber += 3;
  if (vo2max5min > ftp * 1.15) scores.climber += 2;
  
  // Analyze climb-heavy activities
  const climbActivities = windowedActivities.filter(a => {
    const elev = a.elevation || a.total_elevation_gain || 0;
    const dist = a.distance || 1;
    return (elev / (dist / 1000)) > 20;
  });
  if (climbActivities.length / windowedActivities.length > 0.3) scores.climber += 2;

  // Rouleur: Consistent power, moderate everything
  if (threshold20min > ftp * 0.92 && threshold20min < ftp * 1.05) scores.rouleur += 2;
  if (avgElevationPerKm > 5 && avgElevationPerKm < 15) scores.rouleur += 2;
  const avgDistance = totalDistance / windowedActivities.length;
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

  // Calculate dual confidence
  const dataEvidence = calculateEvidence(windowedActivities, windowDays);
  const modelCertainty = calculateCertainty(scores);
  
  // Legacy confidence for backward compatibility
  const legacyConfidence = Math.min(100, (maxScore / 7) * 100);

  return {
    type: topType.charAt(0).toUpperCase() + topType.slice(1).replace(/([A-Z])/g, ' $1').trim(),
    confidence: Math.round(legacyConfidence),
    dataEvidence,
    modelCertainty,
    description: typeDescriptions[topType],
    scores,
    windowDays,
    activitiesAnalyzed: windowedActivities.length,
    updatedAt: new Date().toISOString()
  };
};
