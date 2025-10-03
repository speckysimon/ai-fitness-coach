import axios from 'axios';

class StravaService {
  constructor() {
    this.baseUrl = 'https://www.strava.com/api/v3';
    
    // Per-user rate limiting tracking
    this.userRateLimits = new Map(); // userId -> { lastRequestTime, count15Min, countDaily, reset15Min, resetDaily }
    
    // Global rate limits (Strava's limits are per application)
    this.globalRequestCount15Min = 0;
    this.globalRequestCountDaily = 0;
    this.globalResetTime15Min = Date.now();
    this.globalResetTimeDaily = Date.now();
    
    // Strava rate limits (per application)
    this.GLOBAL_RATE_LIMIT_15MIN = 100; // 100 requests per 15 minutes (application-wide)
    this.GLOBAL_RATE_LIMIT_DAILY = 1000; // 1000 requests per day (application-wide)
    
    // Per-user limits (to prevent single user from consuming all quota)
    this.USER_RATE_LIMIT_15MIN = 50; // Max 50 requests per user per 15 min
    this.USER_RATE_LIMIT_DAILY = 500; // Max 500 requests per user per day
    
    this.MIN_REQUEST_INTERVAL = 600; // 600ms between requests (safety buffer)
  }

  /**
   * Get or initialize user rate limit data
   */
  getUserRateLimit(userId) {
    if (!this.userRateLimits.has(userId)) {
      this.userRateLimits.set(userId, {
        lastRequestTime: 0,
        count15Min: 0,
        countDaily: 0,
        reset15Min: Date.now(),
        resetDaily: Date.now()
      });
    }
    return this.userRateLimits.get(userId);
  }

  /**
   * Rate limiting implementation (per-user and global)
   * Ensures compliance with Strava API limits:
   * - Global: 100 requests per 15 minutes (application-wide)
   * - Global: 1000 requests per day (application-wide)
   * - Per-user: 50 requests per 15 minutes (fair usage)
   * - Per-user: 500 requests per day (fair usage)
   * - Minimum 600ms between requests
   */
  async rateLimitDelay(userId = 'anonymous') {
    const now = Date.now();
    const userLimit = this.getUserRateLimit(userId);
    
    // Reset global counters if time windows have passed
    if (now - this.globalResetTime15Min > 15 * 60 * 1000) {
      this.globalRequestCount15Min = 0;
      this.globalResetTime15Min = now;
    }
    
    if (now - this.globalResetTimeDaily > 24 * 60 * 60 * 1000) {
      this.globalRequestCountDaily = 0;
      this.globalResetTimeDaily = now;
    }
    
    // Reset user counters if time windows have passed
    if (now - userLimit.reset15Min > 15 * 60 * 1000) {
      userLimit.count15Min = 0;
      userLimit.reset15Min = now;
    }
    
    if (now - userLimit.resetDaily > 24 * 60 * 60 * 1000) {
      userLimit.countDaily = 0;
      userLimit.resetDaily = now;
    }
    
    // Check GLOBAL rate limits (application-wide)
    if (this.globalRequestCount15Min >= this.GLOBAL_RATE_LIMIT_15MIN) {
      const waitTime = 15 * 60 * 1000 - (now - this.globalResetTime15Min);
      console.warn(`[GLOBAL] Strava rate limit (15min) reached. Waiting ${Math.ceil(waitTime / 1000)}s`);
      throw new Error('Application rate limit reached. Too many users are making requests. Please try again in a few minutes.');
    }
    
    if (this.globalRequestCountDaily >= this.GLOBAL_RATE_LIMIT_DAILY) {
      console.warn(`[GLOBAL] Strava daily rate limit reached`);
      throw new Error('Daily application rate limit reached. Please try again tomorrow.');
    }
    
    // Check PER-USER rate limits
    if (userLimit.count15Min >= this.USER_RATE_LIMIT_15MIN) {
      const waitTime = 15 * 60 * 1000 - (now - userLimit.reset15Min);
      console.warn(`[USER ${userId}] Rate limit (15min) reached. Waiting ${Math.ceil(waitTime / 1000)}s`);
      throw new Error(`You've made too many requests. Please wait ${Math.ceil(waitTime / 60000)} minutes before trying again.`);
    }
    
    if (userLimit.countDaily >= this.USER_RATE_LIMIT_DAILY) {
      console.warn(`[USER ${userId}] Daily rate limit reached`);
      throw new Error('You\'ve reached your daily request limit. Please try again tomorrow.');
    }
    
    // Ensure minimum interval between requests for this user
    const timeSinceLastRequest = now - userLimit.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => 
        setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest)
      );
    }
    
    // Update counters
    userLimit.lastRequestTime = Date.now();
    userLimit.count15Min++;
    userLimit.countDaily++;
    this.globalRequestCount15Min++;
    this.globalRequestCountDaily++;
    
    // Log usage for monitoring
    console.log(`[Rate Limit] User: ${userId} | User 15min: ${userLimit.count15Min}/${this.USER_RATE_LIMIT_15MIN} | Global 15min: ${this.globalRequestCount15Min}/${this.GLOBAL_RATE_LIMIT_15MIN}`);
  }

  async getActivities(accessToken, params = {}, userId = null) {
    await this.rateLimitDelay(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/athlete/activities`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          page: params.page || 1,
          per_page: params.per_page || 30,
          before: params.before,
          after: params.after,
        },
      });

      return response.data.map(activity => this.normalizeActivity(activity));
    } catch (error) {
      console.error('Strava API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getActivity(accessToken, activityId, userId = null) {
    await this.rateLimitDelay(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/activities/${activityId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return this.normalizeActivity(response.data);
    } catch (error) {
      console.error('Strava API error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAthleteStats(accessToken, athleteId, userId = null) {
    await this.rateLimitDelay(userId);
    
    try {
      const response = await axios.get(`${this.baseUrl}/athletes/${athleteId}/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data;
    } catch (error) {
      console.error('Strava API error:', error.response?.data || error.message);
      throw error;
    }
  }

  normalizeActivity(activity) {
    return {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      sport_type: activity.sport_type,
      date: activity.start_date,
      duration: activity.moving_time, // in seconds
      distance: activity.distance, // in meters
      elevation: activity.total_elevation_gain, // in meters
      avgHeartRate: activity.average_heartrate,
      maxHeartRate: activity.max_heartrate,
      avgPower: activity.average_watts,
      maxPower: activity.max_watts,
      normalizedPower: activity.weighted_average_watts,
      kilojoules: activity.kilojoules,
      avgSpeed: activity.average_speed,
      maxSpeed: activity.max_speed,
      calories: activity.calories,
      sufferScore: activity.suffer_score,
      description: activity.description,
      trainer: activity.trainer,
      commute: activity.commute,
      // Map data
      map: activity.map,
      startLatlng: activity.start_latlng,
      endLatlng: activity.end_latlng,
    };
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: response.data.expires_at,
      };
    } catch (error) {
      console.error('Token refresh error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export const stravaService = new StravaService();
