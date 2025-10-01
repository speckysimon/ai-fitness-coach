// Map training plan event types to target rider types and characteristics

export const eventTypeToRiderType = {
  'Endurance': {
    targetType: 'Rouleur',
    icon: '🚴',
    color: 'from-blue-400 to-blue-600',
    description: 'Building consistent power output and aerobic endurance',
    characteristics: [
      'Sustained power over long distances',
      'Efficient aerobic system',
      'Strong on flat and rolling terrain',
      'High endurance capacity'
    ],
    focusAreas: {
      endurance: 35,
      tempo: 25,
      threshold: 20,
      vo2max: 10,
      recovery: 10
    }
  },
  'Gran Fondo': {
    targetType: 'All Rounder',
    icon: '🏆',
    color: 'from-purple-400 to-purple-600',
    description: 'Developing balanced abilities across all terrains',
    characteristics: [
      'Versatile across all terrains',
      'Strong endurance base',
      'Capable on climbs and flats',
      'Good sustained power'
    ],
    focusAreas: {
      endurance: 30,
      tempo: 20,
      threshold: 25,
      vo2max: 15,
      recovery: 10
    }
  },
  'Criterium': {
    targetType: 'Sprinter',
    icon: '⚡',
    color: 'from-yellow-400 to-orange-500',
    description: 'Developing explosive power and high-intensity efforts',
    characteristics: [
      'Explosive sprint power',
      'High anaerobic capacity',
      'Quick recovery between efforts',
      'Strong acceleration'
    ],
    focusAreas: {
      endurance: 20,
      tempo: 15,
      threshold: 20,
      vo2max: 30,
      recovery: 15
    }
  },
  'Time Trial': {
    targetType: 'Time Trialist',
    icon: '⏱️',
    color: 'from-purple-400 to-purple-600',
    description: 'Building sustained threshold power and aerodynamic efficiency',
    characteristics: [
      'High sustained power at threshold',
      'Excellent pacing ability',
      'Strong aerodynamic position',
      'Mental toughness for solo efforts'
    ],
    focusAreas: {
      endurance: 25,
      tempo: 25,
      threshold: 35,
      vo2max: 10,
      recovery: 5
    }
  },
  'General Fitness': {
    targetType: 'All Rounder',
    icon: '💪',
    color: 'from-green-400 to-emerald-600',
    description: 'Building overall fitness and health',
    characteristics: [
      'Improved cardiovascular health',
      'Balanced fitness development',
      'Sustainable training load',
      'General strength and endurance'
    ],
    focusAreas: {
      endurance: 40,
      tempo: 20,
      threshold: 15,
      vo2max: 10,
      recovery: 15
    }
  },
  'Climbing': {
    targetType: 'Climber',
    icon: '⛰️',
    color: 'from-green-400 to-emerald-600',
    description: 'Developing high power-to-weight ratio and climbing strength',
    characteristics: [
      'High power-to-weight ratio',
      'Strong on steep gradients',
      'Excellent VO2 max',
      'Efficient climbing technique'
    ],
    focusAreas: {
      endurance: 25,
      tempo: 20,
      threshold: 25,
      vo2max: 25,
      recovery: 5
    }
  }
};

// Calculate training focus distribution from completed sessions
export const calculateTrainingFocus = (plan, completedSessions) => {
  if (!plan || !plan.weeks) return null;

  const focusDistribution = {
    Recovery: 0,
    Endurance: 0,
    Tempo: 0,
    Threshold: 0,
    'VO2Max': 0,
    Intervals: 0
  };

  const plannedFocus = { ...focusDistribution };
  const completedFocus = { ...focusDistribution };
  let totalSessions = 0;
  let completedCount = 0;

  plan.weeks.forEach((week, weekIdx) => {
    week.sessions.forEach((session, sessionIdx) => {
      totalSessions++;
      const sessionType = session.type || 'Endurance';
      plannedFocus[sessionType] = (plannedFocus[sessionType] || 0) + 1;

      const key = `${week.weekNumber}-${sessionIdx}`;
      const completion = completedSessions[key];
      // Handle both old boolean format and new object format
      if (completion && (completion === true || completion.completed)) {
        completedCount++;
        
        // Apply weighting based on completion type
        let weight = 1.0;
        if (completion.manualOverride) {
          weight = 0.7; // Manual overrides count as 70%
        } else if (completion.automatic) {
          weight = completion.alignmentScore / 100; // Auto-matches use their score
        }
        // Manual marks without override count as 100%
        
        completedFocus[sessionType] = (completedFocus[sessionType] || 0) + weight;
      }
    });
  });

  // Convert to percentages of TOTAL plan (not just completed)
  const plannedPercentages = {};
  const completedPercentages = {};

  Object.keys(focusDistribution).forEach(type => {
    plannedPercentages[type] = totalSessions > 0 
      ? Math.round((plannedFocus[type] / totalSessions) * 100) 
      : 0;
    completedPercentages[type] = totalSessions > 0 
      ? Math.round((completedFocus[type] / totalSessions) * 100) 
      : 0;
  });

  return {
    plannedPercentages,
    completedPercentages,
    totalSessions,
    completedCount,
    completionRate: totalSessions > 0 ? Math.round((completedCount / totalSessions) * 100) : 0
  };
};

// Calculate progress towards target rider type
export const calculateRiderTypeProgress = (eventType, trainingFocus) => {
  const targetInfo = eventTypeToRiderType[eventType];
  if (!targetInfo || !trainingFocus) return null;

  const { focusAreas } = targetInfo;
  const { plannedPercentages, completedPercentages, completionRate } = trainingFocus;

  // Map session types to focus areas
  const typeMapping = {
    'Recovery': 'recovery',
    'Endurance': 'endurance',
    'Tempo': 'tempo',
    'Threshold': 'threshold',
    'VO2Max': 'vo2max',
    'Intervals': 'vo2max' // Map intervals to vo2max
  };

  // Calculate alignment: how well completed sessions match the PLANNED distribution
  // If you complete sessions as planned, alignment should be ~100%
  let alignmentScore = 0;
  let totalPlanned = 0;

  Object.keys(typeMapping).forEach(sessionType => {
    const plannedPercentage = plannedPercentages[sessionType] || 0;
    const completedPercentage = completedPercentages[sessionType] || 0;
    
    if (plannedPercentage > 0) {
      // Calculate how much of this session type has been completed
      const completionRatio = Math.min(completedPercentage / plannedPercentage, 1);
      alignmentScore += completionRatio * plannedPercentage;
      totalPlanned += plannedPercentage;
    }
  });

  // Normalize alignment score (should be ~100% if following plan correctly)
  const normalizedAlignment = totalPlanned > 0 ? (alignmentScore / totalPlanned) * 100 : 0;

  // Overall progress is a combination of completion rate and alignment
  // If you complete all sessions as planned: completionRate=100%, alignment=100%, progress=100%
  const overallProgress = (completionRate * 0.7) + (normalizedAlignment * 0.3);

  return {
    targetType: targetInfo.targetType,
    icon: targetInfo.icon,
    color: targetInfo.color,
    description: targetInfo.description,
    characteristics: targetInfo.characteristics,
    progress: Math.round(overallProgress),
    completionRate,
    alignmentScore: Math.round(normalizedAlignment),
    focusAreas: targetInfo.focusAreas,
    plannedPercentages // Include for display
  };
};

// Get status message based on progress
export const getProgressStatus = (progress) => {
  if (progress >= 90) return { status: 'Mastered', color: 'text-green-600', bgColor: 'bg-green-100' };
  if (progress >= 75) return { status: 'Advanced', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  if (progress >= 50) return { status: 'Developing', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
  if (progress >= 25) return { status: 'Building', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  return { status: 'Starting', color: 'text-gray-600', bgColor: 'bg-gray-100' };
};

// Get motivational message based on progress
export const getMotivationalMessage = (progress, targetType) => {
  if (progress >= 90) {
    return `Excellent work! You've mastered the ${targetType} training profile. Keep it up! 🎉`;
  } else if (progress >= 75) {
    return `You're making great progress towards becoming a ${targetType}. Stay consistent! 💪`;
  } else if (progress >= 50) {
    return `Halfway there! Your ${targetType} characteristics are developing nicely. 🚀`;
  } else if (progress >= 25) {
    return `Good start! Keep building your ${targetType} foundation. 📈`;
  } else {
    return `Welcome to your ${targetType} journey! Every session counts. 🎯`;
  }
};
