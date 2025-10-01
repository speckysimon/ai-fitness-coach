import { startOfWeek, endOfWeek, isWithinInterval, subWeeks, differenceInDays } from 'date-fns';

class AnalyticsService {
  // Calculate estimated FTP from recent power data
  calculateFTP(activities) {
    const powerActivities = activities.filter(a => 
      a.avgPower && a.avgPower > 0 && a.duration >= 1200 // At least 20 min
    );

    if (powerActivities.length === 0) {
      return null;
    }

    // Sort by normalized power (or avg power) descending
    const sortedByPower = powerActivities
      .sort((a, b) => (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower));

    // Take best 20-60 min effort in last 6 weeks
    const recentBest = sortedByPower.find(a => {
      const activityDate = new Date(a.date);
      const sixWeeksAgo = subWeeks(new Date(), 6);
      return activityDate >= sixWeeksAgo && a.duration >= 1200 && a.duration <= 3600;
    });

    if (recentBest) {
      // FTP is approximately 95% of 20-min power or 100% of 60-min power
      const power = recentBest.normalizedPower || recentBest.avgPower;
      const durationMin = recentBest.duration / 60;
      
      if (durationMin <= 30) {
        return Math.round(power * 0.95);
      } else {
        return Math.round(power);
      }
    }

    // Fallback: use average of top 3 normalized powers
    const topThree = sortedByPower.slice(0, 3);
    const avgPower = topThree.reduce((sum, a) => sum + (a.normalizedPower || a.avgPower), 0) / topThree.length;
    return Math.round(avgPower * 0.95);
  }

  // Calculate TSS (Training Stress Score) for an activity
  calculateTSS(activity, ftp) {
    if (!activity.duration) return 0;

    const durationHours = activity.duration / 3600;

    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }

    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
      // Rough estimation: assume max HR ~190, threshold HR ~170
      const estimatedIntensity = activity.avgHeartRate / 170;
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }

    // Fallback: estimate from duration and type
    const typeMultipliers = {
      'Ride': 1.0,
      'VirtualRide': 1.0,
      'Run': 1.2,
      'Workout': 0.8,
      'default': 0.7,
    };

    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  }

  // Calculate training load metrics
  calculateTrainingLoad(activities, ftp) {
    const now = new Date();
    const oneWeekAgo = subWeeks(now, 1);
    const fourWeeksAgo = subWeeks(now, 4);

    const weekActivities = activities.filter(a => new Date(a.date) >= oneWeekAgo);
    const fourWeekActivities = activities.filter(a => new Date(a.date) >= fourWeeksAgo);

    const weeklyTSS = weekActivities.reduce((sum, a) => sum + this.calculateTSS(a, ftp), 0);
    const weeklyTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const weeklyDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const weeklyElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);

    // Calculate 4-week average
    const avgWeeklyTSS = fourWeekActivities.reduce((sum, a) => sum + this.calculateTSS(a, ftp), 0) / 4;
    const avgWeeklyTime = fourWeekActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 4;

    return {
      currentWeek: {
        tss: Math.round(weeklyTSS),
        time: Math.round(weeklyTime / 3600), // hours
        distance: Math.round(weeklyDistance / 1000), // km
        elevation: Math.round(weeklyElevation),
        activities: weekActivities.length,
      },
      fourWeekAverage: {
        tss: Math.round(avgWeeklyTSS),
        time: Math.round(avgWeeklyTime / 3600),
      },
      loadRatio: avgWeeklyTSS > 0 ? (weeklyTSS / avgWeeklyTSS).toFixed(2) : 0,
    };
  }

  // Get weekly summary
  getWeeklySummary(activities, weekStart) {
    const start = weekStart ? new Date(weekStart) : startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });

    const weekActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      return isWithinInterval(activityDate, { start, end });
    });

    const totalTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    const totalElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);

    const byType = weekActivities.reduce((acc, a) => {
      const type = a.type || 'Other';
      if (!acc[type]) {
        acc[type] = { count: 0, time: 0, distance: 0 };
      }
      acc[type].count++;
      acc[type].time += a.duration || 0;
      acc[type].distance += a.distance || 0;
      return acc;
    }, {});

    return {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      totalActivities: weekActivities.length,
      totalTime: Math.round(totalTime / 3600), // hours
      totalDistance: Math.round(totalDistance / 1000), // km
      totalElevation: Math.round(totalElevation),
      byType,
    };
  }

  // Get trend analysis over multiple weeks
  getTrends(activities, weeks = 6, ftp = null) {
    const now = new Date();
    const trends = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const weekActivities = activities.filter(a => {
        const activityDate = new Date(a.date);
        return isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      });

      const totalTime = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0);
      const totalDistance = weekActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
      const totalElevation = weekActivities.reduce((sum, a) => sum + (a.elevation || 0), 0);
      
      // Calculate TSS for the week if FTP is provided
      let totalTSS = 0;
      if (ftp) {
        totalTSS = weekActivities.reduce((sum, a) => {
          return sum + this.calculateActivityTSS(a, ftp);
        }, 0);
      }

      trends.unshift({
        week: weekStart.toISOString().split('T')[0],
        activities: weekActivities.length,
        time: Math.round(totalTime / 3600),
        distance: Math.round(totalDistance / 1000),
        elevation: Math.round(totalElevation),
        tss: Math.round(totalTSS),
      });
    }

    return trends;
  }
  
  // Calculate TSS for a single activity
  calculateActivityTSS(activity, ftp) {
    if (!activity.duration) return 0;
    
    const durationHours = activity.duration / 3600;
    
    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return durationHours * intensityFactor * intensityFactor * 100;
    }
    
    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170;
      return durationHours * estimatedIntensity * estimatedIntensity * 100;
    }
    
    // Fallback: estimate from duration and type
    const typeMultipliers = {
      'Ride': 1.0,
      'VirtualRide': 1.0,
      'Run': 1.2,
      'Workout': 0.8,
    };
    
    const multiplier = typeMultipliers[activity.type] || 0.7;
    return durationHours * 60 * multiplier;
  }

  // Calculate days until goal event
  daysUntilGoal(goalDate) {
    const now = new Date();
    const goal = new Date(goalDate);
    return differenceInDays(goal, now);
  }
}

export const analyticsService = new AnalyticsService();
