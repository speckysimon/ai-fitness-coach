// Automatic activity matching and alignment verification for training plans

// Match activities to planned sessions based on date and characteristics
export const matchActivitiesToPlan = (plan, activities) => {
  if (!plan || !plan.weeks || !activities) return {};

  const matches = {};
  const activityMap = new Map();

  // Create a map of activities by date for quick lookup
  activities.forEach(activity => {
    // Handle different date field names from Strava API
    const dateStr = activity.start_date_local || activity.start_date || activity.date;
    if (!dateStr) return;
    
    const activityDate = new Date(dateStr).toISOString().split('T')[0];
    if (!activityMap.has(activityDate)) {
      activityMap.set(activityDate, []);
    }
    activityMap.get(activityDate).push(activity);
  });

  // Match each planned session to activities
  plan.weeks.forEach((week) => {
    week.sessions.forEach((session, sessionIdx) => {
      const sessionKey = `${week.weekNumber}-${sessionIdx}`;
      const sessionDate = session.date;

      if (!sessionDate) return;

      // Check for activities on the planned date and ±2 days
      let dayActivities = activityMap.get(sessionDate) || [];
      let dateOffset = 0;
      
      // If no exact match, check nearby dates (±2 days)
      if (dayActivities.length === 0) {
        for (let offset = 1; offset <= 2; offset++) {
          // Check day before
          const dateBefore = new Date(sessionDate);
          dateBefore.setDate(dateBefore.getDate() - offset);
          const beforeStr = dateBefore.toISOString().split('T')[0];
          const activitiesBefore = activityMap.get(beforeStr) || [];
          
          // Check day after
          const dateAfter = new Date(sessionDate);
          dateAfter.setDate(dateAfter.getDate() + offset);
          const afterStr = dateAfter.toISOString().split('T')[0];
          const activitiesAfter = activityMap.get(afterStr) || [];
          
          if (activitiesBefore.length > 0) {
            dayActivities = activitiesBefore;
            dateOffset = -offset;
            break;
          } else if (activitiesAfter.length > 0) {
            dayActivities = activitiesAfter;
            dateOffset = offset;
            break;
          }
        }
      }
      
      if (dayActivities.length === 0) {
        matches[sessionKey] = {
          matched: false,
          activity: null,
          alignmentScore: 0,
          reason: 'No activity found within ±2 days'
        };
        return;
      }

      // Find best matching activity for this session
      let bestMatch = null;
      let bestScore = 0;

      dayActivities.forEach(activity => {
        const score = calculateMatchScore(session, activity);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = activity;
        }
      });

      // Consider it a match if score is above threshold (50%)
      if (bestScore >= 50) {
        let reason = getMatchReason(bestScore);
        if (dateOffset !== 0) {
          const dayText = dateOffset === 1 ? '1 day later' : dateOffset === -1 ? '1 day earlier' : 
                         dateOffset > 0 ? `${dateOffset} days later` : `${Math.abs(dateOffset)} days earlier`;
          reason = `${reason} (done ${dayText})`;
        }
        
        matches[sessionKey] = {
          matched: true,
          activity: bestMatch,
          alignmentScore: bestScore,
          dateOffset: dateOffset,
          reason: reason
        };
      } else {
        matches[sessionKey] = {
          matched: false,
          activity: bestMatch,
          alignmentScore: bestScore,
          dateOffset: dateOffset,
          reason: 'Activity found but does not match session requirements'
        };
      }
    });
  });

  return matches;
};

// Calculate how well an activity matches a planned session
const calculateMatchScore = (session, activity) => {
  let score = 0;
  let maxScore = 0;

  // 1. Duration match (30 points)
  maxScore += 30;
  if (session.duration && activity.duration) {
    const plannedDuration = session.duration * 60; // Convert to seconds
    const actualDuration = activity.duration;
    const durationDiff = Math.abs(plannedDuration - actualDuration) / plannedDuration;
    
    if (durationDiff <= 0.1) score += 30; // Within 10%
    else if (durationDiff <= 0.2) score += 20; // Within 20%
    else if (durationDiff <= 0.3) score += 10; // Within 30%
  }

  // 2. Intensity match (40 points) - most important
  maxScore += 40;
  if (session.type && activity.avgPower) {
    const intensityScore = matchIntensity(session.type, activity);
    score += intensityScore;
  } else if (session.type && activity.avgHeartRate) {
    // Fallback to HR-based intensity
    const intensityScore = matchIntensityByHR(session.type, activity);
    score += intensityScore;
  }

  // 3. Activity type match (20 points)
  maxScore += 20;
  if (activity.type === 'Ride' || activity.type === 'VirtualRide') {
    score += 20; // Cycling activity
  }

  // 4. TSS/effort match (10 points)
  maxScore += 10;
  if (session.type && activity.tss) {
    const expectedTSS = estimateExpectedTSS(session);
    const tssDiff = Math.abs(activity.tss - expectedTSS) / expectedTSS;
    
    if (tssDiff <= 0.2) score += 10;
    else if (tssDiff <= 0.4) score += 5;
  }

  // Normalize to 0-100 scale
  return maxScore > 0 ? (score / maxScore) * 100 : 0;
};

// Match intensity based on power data
const matchIntensity = (sessionType, activity) => {
  const ftp = getFTPFromCache();
  if (!ftp || !activity.avgPower) return 0;

  const intensityFactor = activity.avgPower / ftp;

  const intensityRanges = {
    'Recovery': { min: 0, max: 0.55, score: 40 },
    'Endurance': { min: 0.55, max: 0.75, score: 40 },
    'Tempo': { min: 0.75, max: 0.90, score: 40 },
    'Threshold': { min: 0.90, max: 1.05, score: 40 },
    'VO2Max': { min: 1.05, max: 1.20, score: 40 },
    'Intervals': { min: 1.05, max: 1.30, score: 40 }
  };

  const range = intensityRanges[sessionType];
  if (!range) return 0;

  if (intensityFactor >= range.min && intensityFactor <= range.max) {
    return range.score; // Perfect match
  } else if (intensityFactor >= range.min - 0.05 && intensityFactor <= range.max + 0.05) {
    return range.score * 0.7; // Close match
  } else if (intensityFactor >= range.min - 0.10 && intensityFactor <= range.max + 0.10) {
    return range.score * 0.4; // Partial match
  }

  return 0;
};

// Match intensity based on heart rate (fallback)
const matchIntensityByHR = (sessionType, activity) => {
  const thresholdHR = 170; // Assumed threshold HR
  const hrIntensity = activity.avgHeartRate / thresholdHR;

  const hrRanges = {
    'Recovery': { min: 0, max: 0.65, score: 40 },
    'Endurance': { min: 0.65, max: 0.80, score: 40 },
    'Tempo': { min: 0.80, max: 0.90, score: 40 },
    'Threshold': { min: 0.90, max: 1.00, score: 40 },
    'VO2Max': { min: 1.00, max: 1.10, score: 40 },
    'Intervals': { min: 1.00, max: 1.10, score: 40 }
  };

  const range = hrRanges[sessionType];
  if (!range) return 0;

  if (hrIntensity >= range.min && hrIntensity <= range.max) {
    return range.score;
  } else if (hrIntensity >= range.min - 0.05 && hrIntensity <= range.max + 0.05) {
    return range.score * 0.7;
  }

  return 0;
};

// Estimate expected TSS for a session
const estimateExpectedTSS = (session) => {
  const durationHours = (session.duration || 60) / 60;
  
  const intensityFactors = {
    'Recovery': 0.5,
    'Endurance': 0.65,
    'Tempo': 0.85,
    'Threshold': 0.95,
    'VO2Max': 1.10,
    'Intervals': 1.05
  };

  const if_value = intensityFactors[session.type] || 0.7;
  return durationHours * if_value * if_value * 100;
};

// Get FTP from cache
const getFTPFromCache = () => {
  try {
    const cachedMetrics = localStorage.getItem('cached_metrics');
    if (cachedMetrics) {
      const metrics = JSON.parse(cachedMetrics);
      return metrics.ftp || null;
    }
  } catch (error) {
    console.error('Error getting FTP from cache:', error);
  }
  return null;
};

// Get human-readable match reason
const getMatchReason = (score) => {
  if (score >= 90) return 'Excellent match - activity closely matches planned session';
  if (score >= 80) return 'Very good match - activity aligns well with plan';
  if (score >= 70) return 'Good match - activity meets most requirements';
  if (score >= 60) return 'Acceptable match - activity partially aligns with plan';
  if (score >= 50) return 'Fair match - activity found but does not match session requirements';
  return 'Poor match - activity does not meet session requirements';
};

// Merge manual completions with automatic matches
export const mergeCompletions = (manualCompletions, automaticMatches) => {
  const merged = { ...manualCompletions };

  Object.keys(automaticMatches).forEach(sessionKey => {
    const match = automaticMatches[sessionKey];
    
    // Only auto-complete if:
    // 1. Not manually marked
    // 2. Has a good match (>= 50%)
    if (!merged[sessionKey] && match.matched && match.alignmentScore >= 50) {
      merged[sessionKey] = {
        completed: true,
        automatic: true,
        manualOverride: false,
        activity: match.activity,
        alignmentScore: match.alignmentScore,
        reason: match.reason
      };
    } else if (merged[sessionKey] && typeof merged[sessionKey] === 'boolean') {
      // Convert old boolean format to new object format
      merged[sessionKey] = {
        completed: true,
        automatic: false,
        manualOverride: false,
        activity: match.matched ? match.activity : null,
        alignmentScore: match.matched ? match.alignmentScore : 100,
        reason: 'Manually marked complete'
      };
    }
  });

  return merged;
};

// Calculate quality-adjusted completion rate
export const calculateQualityAdjustedCompletion = (completedSessions) => {
  if (!completedSessions || Object.keys(completedSessions).length === 0) {
    return { rate: 0, qualityScore: 0 };
  }

  let totalSessions = 0;
  let totalQualityScore = 0;

  Object.values(completedSessions).forEach(session => {
    if (session.completed) {
      totalSessions++;
      
      if (session.automatic && session.alignmentScore) {
        // Automatic matches contribute based on alignment score
        totalQualityScore += session.alignmentScore / 100;
      } else {
        // Manual completions get full credit
        totalQualityScore += 1;
      }
    }
  });

  const averageQuality = totalSessions > 0 ? (totalQualityScore / totalSessions) * 100 : 0;

  return {
    rate: totalSessions,
    qualityScore: Math.round(averageQuality)
  };
};

// Get completion status with details
export const getCompletionStatus = (sessionKey, completedSessions, automaticMatches) => {
  const completion = completedSessions[sessionKey];
  const match = automaticMatches[sessionKey];

  if (!completion || !completion.completed) {
    if (match && match.matched) {
      return {
        status: 'auto-suggested',
        message: `Activity found with ${match.alignmentScore}% match`,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300'
      };
    }
    return {
      status: 'incomplete',
      message: 'Not completed',
      color: 'text-gray-600',
      bgColor: 'bg-white',
      borderColor: 'border-gray-200'
    };
  }

  if (completion.automatic) {
    return {
      status: 'auto-completed',
      message: `Auto-matched (${completion.alignmentScore}% alignment)`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300'
    };
  }

  return {
    status: 'manual',
    message: 'Manually completed',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300'
  };
};
