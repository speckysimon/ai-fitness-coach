// Service for managing manual activities (non-Strava activities like gym workouts)
import { getDb } from '../db.js';

class ManualActivityService {
  // Sport type configurations with TSS estimation multipliers
  static SPORT_TYPES = {
    'Cycling - Road': { category: 'cycling', tssMultiplier: 1.0, icon: '🚴' },
    'Cycling - MTB': { category: 'cycling', tssMultiplier: 1.1, icon: '🚵' },
    'Cycling - Indoor': { category: 'cycling', tssMultiplier: 0.95, icon: '🚴' },
    'Running - Road': { category: 'running', tssMultiplier: 1.2, icon: '🏃' },
    'Running - Trail': { category: 'running', tssMultiplier: 1.3, icon: '🏃' },
    'Running - Treadmill': { category: 'running', tssMultiplier: 1.1, icon: '🏃' },
    'Swimming - Pool': { category: 'swimming', tssMultiplier: 0.8, icon: '🏊' },
    'Swimming - Open Water': { category: 'swimming', tssMultiplier: 0.9, icon: '🏊' },
    'Strength Training': { category: 'strength', tssMultiplier: 0.6, icon: '💪' },
    'Yoga': { category: 'flexibility', tssMultiplier: 0.3, icon: '🧘' },
    'Pilates': { category: 'flexibility', tssMultiplier: 0.4, icon: '🧘' },
    'Stretching': { category: 'flexibility', tssMultiplier: 0.2, icon: '🤸' },
    'Cross Training': { category: 'other', tssMultiplier: 0.7, icon: '🏋️' },
    'Other': { category: 'other', tssMultiplier: 0.5, icon: '⚡' }
  };

  static INTENSITY_LEVELS = {
    'Recovery': { factor: 0.5, description: 'Very easy, conversational' },
    'Easy': { factor: 0.65, description: 'Comfortable, sustainable' },
    'Moderate': { factor: 0.75, description: 'Steady effort' },
    'Hard': { factor: 0.85, description: 'Challenging, focused' },
    'Very Hard': { factor: 0.95, description: 'Near maximum effort' },
    'Maximum': { factor: 1.1, description: 'All-out effort' }
  };

  // Calculate estimated TSS for manual activity
  static calculateEstimatedTSS(duration, sportType, intensityLevel, perceivedExertion) {
    const durationHours = duration / 60;
    
    const sportConfig = this.SPORT_TYPES[sportType] || this.SPORT_TYPES['Other'];
    const intensityConfig = this.INTENSITY_LEVELS[intensityLevel] || this.INTENSITY_LEVELS['Moderate'];
    
    // Base TSS calculation: duration * intensity * sport multiplier
    let baseTSS = durationHours * intensityConfig.factor * intensityConfig.factor * 100;
    baseTSS *= sportConfig.tssMultiplier;
    
    // Adjust based on perceived exertion if provided (RPE 1-10)
    if (perceivedExertion) {
      const rpeAdjustment = perceivedExertion / 10;
      baseTSS *= (0.7 + (rpeAdjustment * 0.6)); // Scale between 0.7x and 1.3x
    }
    
    return Math.round(baseTSS);
  }

  // Create a new manual activity
  async createActivity(userId, activityData) {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Calculate estimated TSS
    const estimatedTSS = ManualActivityService.calculateEstimatedTSS(
      activityData.duration,
      activityData.sportType,
      activityData.intensityLevel,
      activityData.perceivedExertion
    );
    
    const stmt = db.prepare(`
      INSERT INTO manual_activities (
        user_id, activity_date, sport_type, activity_name, duration, distance,
        intensity_level, perceived_exertion, avg_heart_rate, estimated_tss,
        calories, elevation_gain, notes, location, indoor, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      userId,
      activityData.activityDate,
      activityData.sportType,
      activityData.activityName,
      activityData.duration,
      activityData.distance || null,
      activityData.intensityLevel,
      activityData.perceivedExertion || null,
      activityData.avgHeartRate || null,
      estimatedTSS,
      activityData.calories || null,
      activityData.elevationGain || null,
      activityData.notes || null,
      activityData.location || null,
      activityData.indoor ? 1 : 0,
      now,
      now
    );
    
    return {
      id: result.lastInsertRowid,
      ...activityData,
      estimatedTSS,
      createdAt: now,
      updatedAt: now
    };
  }

  // Get all manual activities for a user
  async getActivities(userId, options = {}) {
    const db = getDb();
    let query = 'SELECT * FROM manual_activities WHERE user_id = ?';
    const params = [userId];
    
    // Add date range filter
    if (options.startDate) {
      query += ' AND activity_date >= ?';
      params.push(options.startDate);
    }
    if (options.endDate) {
      query += ' AND activity_date <= ?';
      params.push(options.endDate);
    }
    
    // Add sport type filter
    if (options.sportType) {
      query += ' AND sport_type = ?';
      params.push(options.sportType);
    }
    
    query += ' ORDER BY activity_date DESC';
    
    // Add limit
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  }

  // Get a single activity by ID
  async getActivity(userId, activityId) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM manual_activities WHERE id = ? AND user_id = ?');
    return stmt.get(activityId, userId);
  }

  // Update an existing manual activity
  async updateActivity(userId, activityId, updates) {
    const db = getDb();
    const now = new Date().toISOString();
    
    // Recalculate TSS if relevant fields changed
    let estimatedTSS = updates.estimatedTSS;
    if (updates.duration || updates.sportType || updates.intensityLevel || updates.perceivedExertion) {
      const existing = await this.getActivity(userId, activityId);
      estimatedTSS = ManualActivityService.calculateEstimatedTSS(
        updates.duration || existing.duration,
        updates.sportType || existing.sport_type,
        updates.intensityLevel || existing.intensity_level,
        updates.perceivedExertion || existing.perceived_exertion
      );
    }
    
    const fields = [];
    const values = [];
    
    const fieldMap = {
      activityDate: 'activity_date',
      sportType: 'sport_type',
      activityName: 'activity_name',
      duration: 'duration',
      distance: 'distance',
      intensityLevel: 'intensity_level',
      perceivedExertion: 'perceived_exertion',
      avgHeartRate: 'avg_heart_rate',
      calories: 'calories',
      elevationGain: 'elevation_gain',
      notes: 'notes',
      location: 'location',
      indoor: 'indoor'
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`);
        values.push(value);
      }
    });
    
    if (estimatedTSS !== undefined) {
      fields.push('estimated_tss = ?');
      values.push(estimatedTSS);
    }
    
    fields.push('updated_at = ?');
    values.push(now);
    
    values.push(activityId, userId);
    
    const stmt = db.prepare(`
      UPDATE manual_activities 
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
    `);
    
    stmt.run(...values);
    return this.getActivity(userId, activityId);
  }

  // Delete a manual activity
  async deleteActivity(userId, activityId) {
    const db = getDb();
    const stmt = db.prepare('DELETE FROM manual_activities WHERE id = ? AND user_id = ?');
    const result = stmt.run(activityId, userId);
    return result.changes > 0;
  }

  // Convert manual activity to Strava-like format for compatibility
  static toStravaFormat(manualActivity) {
    const sportConfig = this.SPORT_TYPES[manualActivity.sport_type] || this.SPORT_TYPES['Other'];
    
    return {
      id: `manual_${manualActivity.id}`,
      name: manualActivity.activity_name,
      type: this.mapToStravaType(manualActivity.sport_type),
      sport_type: manualActivity.sport_type,
      start_date_local: manualActivity.activity_date,
      start_date: manualActivity.activity_date,
      date: manualActivity.activity_date.split('T')[0],
      duration: manualActivity.duration * 60, // Convert minutes to seconds
      distance: manualActivity.distance ? manualActivity.distance * 1000 : 0, // Convert km to meters
      tss: manualActivity.estimated_tss,
      avgHeartRate: manualActivity.avg_heart_rate,
      calories: manualActivity.calories,
      totalElevationGain: manualActivity.elevation_gain,
      description: manualActivity.notes,
      manual: true, // Flag to identify manual activities
      intensityLevel: manualActivity.intensity_level,
      perceivedExertion: manualActivity.perceived_exertion,
      indoor: manualActivity.indoor === 1,
      icon: sportConfig.icon
    };
  }

  // Map sport types to Strava activity types for compatibility
  static mapToStravaType(sportType) {
    const mapping = {
      'Cycling - Road': 'Ride',
      'Cycling - MTB': 'Ride',
      'Cycling - Indoor': 'VirtualRide',
      'Running - Road': 'Run',
      'Running - Trail': 'Run',
      'Running - Treadmill': 'Run',
      'Swimming - Pool': 'Swim',
      'Swimming - Open Water': 'Swim',
      'Strength Training': 'WeightTraining',
      'Yoga': 'Yoga',
      'Pilates': 'Workout',
      'Stretching': 'Workout',
      'Cross Training': 'Workout',
      'Other': 'Workout'
    };
    return mapping[sportType] || 'Workout';
  }

  // Get activity statistics
  async getStatistics(userId, startDate, endDate) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT 
        sport_type,
        COUNT(*) as count,
        SUM(duration) as total_duration,
        SUM(distance) as total_distance,
        SUM(estimated_tss) as total_tss,
        AVG(perceived_exertion) as avg_rpe
      FROM manual_activities
      WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?
      GROUP BY sport_type
      ORDER BY count DESC
    `);
    
    return stmt.all(userId, startDate, endDate);
  }
}

export default new ManualActivityService();
