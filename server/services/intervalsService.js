import axios from 'axios';

const INTERVALS_API_BASE = 'https://intervals.icu/api/v1';

class IntervalsService {
  constructor() {
    this.rateLimitDelay = 1000; // 1 req/sec (lenient - Intervals.icu has no strict limits)
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting - simple delay between requests
   */
  async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get activities for date range
   * @param {string} accessToken - User's access token
   * @param {string} oldest - ISO date (YYYY-MM-DD)
   * @param {string} newest - ISO date (YYYY-MM-DD)
   * @returns {Promise<Array>} Normalized activities
   */
  async getActivities(accessToken, oldest, newest) {
    await this.rateLimitDelay();

    try {
      console.log(`📥 Fetching Intervals.icu activities: ${oldest} to ${newest}`);
      
      const response = await axios.get(
        `${INTERVALS_API_BASE}/athlete/0/activities`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: { oldest, newest }
        }
      );

      console.log(`✅ Fetched ${response.data.length} activities from Intervals.icu`);
      return response.data.map(activity => this.normalizeActivity(activity));
    } catch (error) {
      console.error('❌ Intervals.icu API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Intervals.icu authentication failed. Please reconnect.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Get single activity details
   * @param {string} accessToken - User's access token
   * @param {string} activityId - Intervals.icu activity ID
   * @returns {Promise<Object>} Normalized activity
   */
  async getActivity(accessToken, activityId) {
    await this.rateLimitDelay();

    try {
      const response = await axios.get(
        `${INTERVALS_API_BASE}/athlete/0/activities/${activityId}`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return this.normalizeActivity(response.data);
    } catch (error) {
      console.error('❌ Intervals.icu activity fetch error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Normalize Intervals.icu activity to app schema
   * Maps Intervals.icu fields to match Strava activity structure
   * @param {Object} activity - Raw Intervals.icu activity
   * @returns {Object} Normalized activity
   */
  normalizeActivity(activity) {
    return {
      // Source identification
      source: 'intervals',
      source_id: activity.id?.toString(),
      
      // Basic info
      name: activity.name || 'Untitled Activity',
      type: activity.type || 'Ride',
      start_date: activity.start_date_local,
      start_date_local: activity.start_date_local,
      
      // Distance and time (convert to meters and seconds if needed)
      distance: activity.distance || 0,
      moving_time: activity.moving_time || 0,
      elapsed_time: activity.elapsed_time || 0,
      
      // Elevation
      total_elevation_gain: activity.elevation_gain || 0,
      
      // Speed (m/s)
      average_speed: activity.average_speed || 0,
      max_speed: activity.max_speed || 0,
      
      // Heart rate
      average_heartrate: activity.average_hr || null,
      max_heartrate: activity.max_hr || null,
      
      // Power
      average_watts: activity.average_watts || null,
      max_watts: activity.max_watts || null,
      weighted_average_watts: activity.weighted_average_watts || null,
      kilojoules: activity.kilojoules || null,
      
      // Cadence
      average_cadence: activity.average_cadence || null,
      
      // Training metrics
      suffer_score: activity.tss || null, // Training Stress Score
      intensity_factor: activity.intensity || null,
      
      // Additional Intervals.icu specific fields
      icu_training_load: activity.icu_training_load || null,
      icu_intensity: activity.icu_intensity || null,
      icu_pm_cp: activity.icu_pm_cp || null,
      icu_pm_w_prime: activity.icu_pm_w_prime || null,
      
      // Flags
      trainer: activity.trainer || false,
      commute: false, // Intervals.icu doesn't have commute flag
      
      // Description
      description: activity.description || null,
      
      // Calories
      calories: activity.calories || null
    };
  }

  /**
   * Get athlete profile
   * @param {string} accessToken - User's access token
   * @returns {Promise<Object>} Athlete data
   */
  async getAthlete(accessToken) {
    await this.rateLimitDelay();

    try {
      const response = await axios.get(
        `${INTERVALS_API_BASE}/athlete/0`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Intervals.icu athlete fetch error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new IntervalsService();
