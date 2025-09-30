import axios from 'axios';

class StravaService {
  constructor() {
    this.baseUrl = 'https://www.strava.com/api/v3';
  }

  async getActivities(accessToken, params = {}) {
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

  async getActivity(accessToken, activityId) {
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

  async getAthleteStats(accessToken, athleteId) {
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
