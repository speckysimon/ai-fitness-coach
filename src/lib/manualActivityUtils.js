// Utility functions for handling manual activities alongside Strava activities

/**
 * Fetch manual activities from the backend
 */
export const fetchManualActivities = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.userId) params.append('userId', options.userId);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.sportType) params.append('sportType', options.sportType);
    if (options.limit) params.append('limit', options.limit);

    const response = await fetch(`/api/manual-activities?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch manual activities');
    }

    const data = await response.json();
    return data.activities || [];
  } catch (error) {
    console.error('Error fetching manual activities:', error);
    return [];
  }
};

/**
 * Convert manual activity to Strava-compatible format
 */
export const convertManualToStravaFormat = (manualActivity) => {
  const sportTypeMap = {
    'Cycling - Road': { type: 'Ride', icon: '🚴' },
    'Cycling - MTB': { type: 'Ride', icon: '🚵' },
    'Cycling - Indoor': { type: 'VirtualRide', icon: '🚴' },
    'Running - Road': { type: 'Run', icon: '🏃' },
    'Running - Trail': { type: 'Run', icon: '🏃' },
    'Running - Treadmill': { type: 'Run', icon: '🏃' },
    'Swimming - Pool': { type: 'Swim', icon: '🏊' },
    'Swimming - Open Water': { type: 'Swim', icon: '🏊' },
    'Strength Training': { type: 'WeightTraining', icon: '💪' },
    'Yoga': { type: 'Yoga', icon: '🧘' },
    'Pilates': { type: 'Workout', icon: '🧘' },
    'Stretching': { type: 'Workout', icon: '🤸' },
    'Cross Training': { type: 'Workout', icon: '🏋️' },
    'Other': { type: 'Workout', icon: '⚡' }
  };

  const mapping = sportTypeMap[manualActivity.sport_type] || sportTypeMap['Other'];

  return {
    id: `manual_${manualActivity.id}`,
    name: manualActivity.activity_name,
    type: mapping.type,
    sport_type: manualActivity.sport_type,
    start_date_local: manualActivity.activity_date,
    start_date: manualActivity.activity_date,
    date: manualActivity.activity_date.split('T')[0],
    duration: manualActivity.duration * 60, // Convert minutes to seconds
    distance: manualActivity.distance ? manualActivity.distance * 1000 : 0, // Convert km to meters
    tss: manualActivity.estimated_tss,
    avgHeartRate: manualActivity.avg_heart_rate,
    avg_heart_rate: manualActivity.avg_heart_rate,
    calories: manualActivity.calories,
    totalElevationGain: manualActivity.elevation_gain,
    total_elevation_gain: manualActivity.elevation_gain,
    description: manualActivity.notes,
    manual: true, // Flag to identify manual activities
    manualId: manualActivity.id, // Store original manual activity ID
    intensityLevel: manualActivity.intensity_level,
    perceivedExertion: manualActivity.perceived_exertion,
    indoor: manualActivity.indoor === 1,
    trainer: manualActivity.indoor === 1,
    location: manualActivity.location,
    icon: mapping.icon
  };
};

/**
 * Merge manual activities with Strava activities and sort by date
 */
export const mergeActivities = (stravaActivities, manualActivities) => {
  // Convert manual activities to Strava format
  const convertedManual = manualActivities.map(convertManualToStravaFormat);

  // Combine both arrays
  const combined = [...stravaActivities, ...convertedManual];

  // Sort by date (most recent first)
  combined.sort((a, b) => {
    const dateA = new Date(a.start_date_local || a.start_date || a.date);
    const dateB = new Date(b.start_date_local || b.start_date || b.date);
    return dateB - dateA;
  });

  return combined;
};

/**
 * Get activity statistics including manual activities
 */
export const getActivityStats = (activities) => {
  const stats = {
    total: activities.length,
    manual: activities.filter(a => a.manual).length,
    strava: activities.filter(a => !a.manual).length,
    totalDuration: 0,
    totalDistance: 0,
    totalTSS: 0,
    byType: {}
  };

  activities.forEach(activity => {
    stats.totalDuration += activity.duration || 0;
    stats.totalDistance += activity.distance || 0;
    stats.totalTSS += activity.tss || 0;

    const type = activity.sport_type || activity.type;
    if (!stats.byType[type]) {
      stats.byType[type] = { count: 0, duration: 0, distance: 0, tss: 0 };
    }
    stats.byType[type].count++;
    stats.byType[type].duration += activity.duration || 0;
    stats.byType[type].distance += activity.distance || 0;
    stats.byType[type].tss += activity.tss || 0;
  });

  return stats;
};

/**
 * Filter activities by date range
 */
export const filterActivitiesByDateRange = (activities, startDate, endDate) => {
  return activities.filter(activity => {
    const activityDate = new Date(activity.start_date_local || activity.start_date || activity.date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return activityDate >= start && activityDate <= end;
  });
};

/**
 * Get recent activities for AI context (last N days)
 */
export const getRecentActivitiesForAI = (activities, days = 14) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return activities
    .filter(activity => {
      const activityDate = new Date(activity.start_date_local || activity.start_date || activity.date);
      return activityDate >= cutoffDate;
    })
    .map(activity => ({
      date: activity.date || activity.start_date_local?.split('T')[0],
      name: activity.name,
      type: activity.sport_type || activity.type,
      duration: Math.round((activity.duration || 0) / 60), // minutes
      distance: Math.round((activity.distance || 0) / 1000), // km
      tss: activity.tss || 0,
      manual: activity.manual || false,
      intensityLevel: activity.intensityLevel,
      perceivedExertion: activity.perceivedExertion
    }));
};

/**
 * Check if an activity is a manual activity
 */
export const isManualActivity = (activity) => {
  return activity.manual === true || String(activity.id).startsWith('manual_');
};

/**
 * Delete a manual activity
 */
export const deleteManualActivity = async (activityId) => {
  try {
    // Extract numeric ID if it's in format "manual_123"
    const numericId = String(activityId).startsWith('manual_') 
      ? activityId.split('_')[1] 
      : activityId;

    const response = await fetch(`/api/manual-activities/${numericId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete manual activity');
    }

    return true;
  } catch (error) {
    console.error('Error deleting manual activity:', error);
    throw error;
  }
};

/**
 * Update a manual activity
 */
export const updateManualActivity = async (activityId, updates) => {
  try {
    // Extract numeric ID if it's in format "manual_123"
    const numericId = String(activityId).startsWith('manual_') 
      ? activityId.split('_')[1] 
      : activityId;

    const response = await fetch(`/api/manual-activities/${numericId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update manual activity');
    }

    const data = await response.json();
    return data.activity;
  } catch (error) {
    console.error('Error updating manual activity:', error);
    throw error;
  }
};

export default {
  fetchManualActivities,
  convertManualToStravaFormat,
  mergeActivities,
  getActivityStats,
  filterActivitiesByDateRange,
  getRecentActivitiesForAI,
  isManualActivity,
  deleteManualActivity,
  updateManualActivity
};
