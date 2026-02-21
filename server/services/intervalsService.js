import axios from 'axios';

const INTERVALS_API_BASE = 'https://intervals.icu/api/v1';

class IntervalsService {
  constructor() {
    this.rateLimitMs = 1000; // 1 req/sec (lenient - Intervals.icu has no strict limits)
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting - simple delay between requests
   */
  async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitMs) {
      const delay = this.rateLimitMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get activities for date range
   * TODO: /activities endpoint returns minimal data (distance=0, tss=null)
   * Need to check API cookbook: https://forum.intervals.icu/t/intervals-icu-api-integration-cookbook/80090
   * for correct endpoint to get full activity data
   * @param {string} accessToken - User's access token
   * @param {string} athleteId - Athlete ID from Intervals.icu
   * @param {string} oldest - ISO date (YYYY-MM-DD)
   * @param {string} newest - ISO date (YYYY-MM-DD)
   * @returns {Promise<Array>} Normalized activities
   */
  async getActivities(accessToken, athleteId, oldest, newest) {
    await this.rateLimitDelay();

    try {
      console.log(`📥 Fetching Intervals.icu activities for athlete ${athleteId}: ${oldest} to ${newest}`);
      
      // Reverted to /activities endpoint (returns minimal data but doesn't error)
      // TODO: Find correct endpoint for full data - see INTERVALS_API_FIX_TODO.md
      const response = await axios.get(
        `${INTERVALS_API_BASE}/athlete/${athleteId}/activities`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          params: { oldest, newest }
        }
      );

      console.log(`✅ Fetched ${response.data.length} activities from Intervals.icu`);
      
      // Debug: Log first 3 raw activities to see actual field names
      if (response.data.length > 0) {
        console.log('🔍 [IntervalsService] RAW activity samples from API:');
        response.data.slice(0, 3).forEach((act, i) => {
          console.log(`\nSample ${i + 1}:`, {
            id: act.id,
            name: act.name,
            type: act.type,
            start_date: act.start_date_local || act.start_date,
            moving_time: act.moving_time,
            movingTime: act.movingTime,
            distance: act.distance,
            icu_training_load: act.icu_training_load,
            tss: act.tss,
            icu_average_watts: act.icu_average_watts,
            avg_watts: act.avg_watts,
            average_watts: act.average_watts,
            avg_hr: act.avg_hr,
            average_hr: act.average_hr,
            avgHr: act.avgHr
          });
        });
        console.log('\n🔍 [IntervalsService] Full RAW activity #1:', JSON.stringify(response.data[0], null, 2));
      }
      
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
   * @param {string} athleteId - Athlete ID from Intervals.icu (use '0' for authenticated user)
   * @param {string} activityId - Intervals.icu activity ID (with 'i' prefix)
   * @returns {Promise<Object>} Normalized activity with full details
   */
  async getActivity(accessToken, athleteId, activityId) {
    await this.rateLimitDelay();

    try {
      // Ensure activity ID has 'i' prefix for Intervals.icu activities
      const fullActivityId = activityId.startsWith('i') ? activityId : `i${activityId}`;
      
      console.log(`📥 [IntervalsService] Fetching activity details for ${fullActivityId}`);
      
      // Use /activity/{id} endpoint (not /athlete/{id}/activities/{id})
      // This returns full activity data including all metrics
      const response = await axios.get(
        `${INTERVALS_API_BASE}/activity/${fullActivityId}`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ [IntervalsService] Fetched activity details for ${fullActivityId}`);
      
      // Check if activity has route data embedded
      const hasGPSData = response.data.latlngs || response.data.path || response.data.coordinates || response.data.latlng;
      if (hasGPSData) {
        console.log(`📍 [IntervalsService] Activity has embedded route data in field:`, 
          response.data.latlngs ? 'latlngs' : 
          response.data.path ? 'path' : 
          response.data.coordinates ? 'coordinates' : 'latlng'
        );
      }
      
      // Normalize activity but preserve GPS data
      const normalized = this.normalizeActivity(response.data);
      
      // Build _raw from API response (zones, intervals, advanced metrics)
      const rawData = { ...response.data };
      
      // Fetch GPS latlng stream if available (for route map display)
      const streamTypes = response.data.stream_types || [];
      if (streamTypes.includes('latlng')) {
        try {
          const streams = await this.getActivityStreams(accessToken, fullActivityId, ['latlng']);
          console.log(`🔍 [IntervalsService] Streams response type: ${typeof streams}, isArray: ${Array.isArray(streams)}`);
          if (streams) {
            console.log(`🔍 [IntervalsService] Streams keys: ${typeof streams === 'object' && !Array.isArray(streams) ? Object.keys(streams).join(', ') : 'N/A'}`);
            if (Array.isArray(streams)) {
              console.log(`🔍 [IntervalsService] Streams is array of length ${streams.length}, first item type: ${typeof streams[0]}, sample:`, JSON.stringify(streams[0])?.substring(0, 200));
            }
          }
          
          // Intervals.icu streams API returns an array with a single latlng object:
          //   [{ type:'latlng', data: [null, lat1, lat2, ...], data2: [null, lng1, lng2, ...] }]
          // data = latitudes, data2 = longitudes. We zip them into [[lat,lng], ...] pairs.
          let latlng = null;
          
          if (Array.isArray(streams)) {
            const latlngStream = streams.find(s => s.type === 'latlng');
            if (latlngStream?.data && latlngStream?.data2) {
              // Primary format: data=lats, data2=lngs
              const lats = latlngStream.data;
              const lngs = latlngStream.data2;
              const len = Math.min(lats.length, lngs.length);
              latlng = [];
              for (let i = 0; i < len; i++) {
                if (lats[i] != null && lngs[i] != null) {
                  latlng.push([lats[i], lngs[i]]);
                }
              }
              console.log(`📍 [IntervalsService] Zipped ${latlng.length} lat/lng pairs from ${len} points`);
            } else if (latlngStream?.data) {
              // Fallback: data might already be [[lat,lng], ...] pairs
              const data = latlngStream.data;
              if (data.length > 0 && Array.isArray(data[0])) {
                latlng = data;
              }
            }
          } else if (streams?.latlng) {
            latlng = streams.latlng.data || streams.latlng;
          }
          
          if (Array.isArray(latlng) && latlng.length > 1) {
            // Downsample to ~500 points for storage efficiency
            const step = Math.max(1, Math.floor(latlng.length / 500));
            const sampled = latlng.filter((_, i) => i % step === 0 || i === latlng.length - 1);
            rawData.latlngs = sampled;
            normalized.latlngs = sampled;
            console.log(`📍 [IntervalsService] Fetched GPS route: ${sampled.length} points (from ${latlng.length})`);
          } else {
            console.log(`⚠️ [IntervalsService] latlng stream returned but no usable data. latlng type: ${typeof latlng}, isArray: ${Array.isArray(latlng)}, length: ${latlng?.length}`);
          }
        } catch (streamErr) {
          console.log(`⚠️ [IntervalsService] Could not fetch latlng stream for ${fullActivityId}: ${streamErr.message}`);
        }
      } else {
        console.log(`ℹ️ [IntervalsService] Activity ${fullActivityId} stream_types: [${streamTypes.join(', ')}] — no latlng available`);
      }
      
      // Attach raw data for storage as raw_json
      normalized._raw = rawData;
      
      return normalized;
    } catch (error) {
      console.error('❌ Intervals.icu API error:', error.response?.data || error.message);
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
    // Intervals.icu uses different field names than Strava
    // Map them to our unified schema with multiple fallbacks
    
    return {
      // Source identification
      source: 'intervals',
      source_id: activity.id?.toString(),
      id: activity.id?.toString(), // Add id field for compatibility
      
      // Basic info
      name: activity.name || 'Untitled Activity',
      type: activity.type || 'Ride',
      
      // Date - ensure 'date' field is set (critical for sorting/display)
      date: activity.start_date_local || activity.start_date,
      start_date: activity.start_date_local || activity.start_date,
      start_date_local: activity.start_date_local || activity.start_date,
      
      // Distance and time
      // Intervals.icu returns distance in meters, moving_time in seconds
      distance: activity.distance || 0,
      moving_time: activity.moving_time || activity.movingTime || 0,
      elapsed_time: activity.elapsed_time || activity.elapsedTime || activity.moving_time || 0,
      duration: activity.moving_time || activity.movingTime || activity.elapsed_time || 0,
      
      // Elevation - Intervals.icu uses total_elevation_gain
      total_elevation_gain: activity.total_elevation_gain || activity.elevation_gain || activity.elevationGain || 0,
      elevation: activity.total_elevation_gain || activity.elevation_gain || activity.elevationGain || 0, // Alias for compatibility
      
      // Speed (m/s) - Intervals.icu uses average_speed and max_speed
      average_speed: activity.average_speed || activity.averageSpeed || 0,
      avgSpeed: activity.average_speed || activity.averageSpeed || 0, // Alias
      max_speed: activity.max_speed || activity.maxSpeed || 0,
      maxSpeed: activity.max_speed || activity.maxSpeed || 0, // Alias
      
      // Heart rate - Intervals.icu uses avg_hr, average_hr, or avgHr
      average_heartrate: activity.avg_hr || activity.average_hr || activity.avgHr || activity.average_heartrate || null,
      max_heartrate: activity.max_hr || activity.maxHr || activity.max_heartrate || null,
      avgHeartRate: activity.avg_hr || activity.average_hr || activity.avgHr || null, // Alternative field name
      
      // Power - Intervals.icu uses icu_average_watts (confirmed from API logs)
      average_watts: activity.icu_average_watts || activity.avg_watts || activity.average_watts || activity.avgWatts || activity.power || null,
      avgPower: activity.icu_average_watts || activity.avg_watts || activity.average_watts || activity.avgWatts || activity.power || null, // Alternative field name
      max_watts: activity.icu_max_watts || activity.max_watts || activity.maxWatts || activity.max_power || null,
      maxPower: activity.icu_max_watts || activity.max_watts || activity.maxWatts || activity.max_power || null, // Alias
      
      // Normalized/Weighted Power - Intervals.icu uses icu_weighted_avg_watts (confirmed from API logs)
      weighted_average_watts: activity.icu_weighted_avg_watts || activity.np || activity.normalized_power || activity.np_watts || activity.weighted_average_watts || null,
      normalizedPower: activity.icu_weighted_avg_watts || activity.np || activity.normalized_power || activity.np_watts || null, // Alternative field name
      
      kilojoules: activity.kilojoules || activity.work || null,
      
      // Cadence
      average_cadence: activity.avg_cadence || activity.average_cadence || activity.avgCadence || null,
      
      // Training metrics - Intervals.icu uses icu_training_load for TSS
      suffer_score: activity.icu_training_load || activity.tss || activity.training_load || null,
      tss: activity.icu_training_load || activity.tss || activity.training_load || null, // Alternative field name
      intensity_factor: activity.icu_intensity || activity.intensity || activity.if || null,
      
      // Additional Intervals.icu specific fields
      icu_training_load: activity.icu_training_load || null,
      icu_intensity: activity.icu_intensity || null,
      icu_pm_cp: activity.icu_pm_cp || null,
      icu_pm_w_prime: activity.icu_pm_w_prime || null,
      icu_average_watts: activity.icu_average_watts || null,
      icu_normalized_power: activity.icu_normalized_power || null,
      
      // Zone Analysis - Power zones (Z1-Z7, Sweet Spot)
      icu_zone_times: activity.icu_zone_times || null,
      icu_hr_zone_times: activity.icu_hr_zone_times || null,
      pace_zone_times: activity.pace_zone_times || null,
      
      // Interval Summary (e.g., "1x 54s 219w", "1x 69s 230w")
      interval_summary: activity.interval_summary || null,
      
      // Advanced Metrics
      icu_variability_index: activity.icu_variability_index || null,
      icu_efficiency_factor: activity.icu_efficiency_factor || null,
      icu_power_hr: activity.icu_power_hr || null,
      decoupling: activity.decoupling || null,
      icu_max_wbal_depletion: activity.icu_max_wbal_depletion || null,
      icu_joules_above_ftp: activity.icu_joules_above_ftp || null,
      
      // Power Analysis
      icu_ftp: activity.icu_ftp || null,
      icu_w_prime: activity.icu_w_prime || null,
      p_max: activity.p_max || null,
      
      // Heart Rate Analysis
      lthr: activity.lthr || null,
      icu_resting_hr: activity.icu_resting_hr || null,
      athlete_max_hr: activity.athlete_max_hr || null,
      trimp: activity.trimp || null,
      
      // Streams and Data Availability
      stream_types: activity.stream_types || null,
      has_segments: activity.has_segments || false,
      has_weather: activity.has_weather || false,
      
      // Route/Map Data
      route_id: activity.route_id || null,
      
      // Power Loads
      power_load: activity.power_load || null,
      hr_load: activity.hr_load || null,
      pace_load: activity.pace_load || null,
      
      // Flags
      trainer: activity.trainer || activity.indoor || false,
      commute: false, // Intervals.icu doesn't have commute flag
      
      // Description
      description: activity.description || null,
      
      // Calories
      calories: activity.calories || activity.cal || null
    };
  }

  /**
   * Get activity streams (second-by-second data)
   * @param {string} accessToken - User's access token
   * @param {string} activityId - Intervals.icu activity ID (with 'i' prefix, e.g., 'i120182759')
   * @param {Array<string>} streamTypes - Types of streams to fetch (e.g., ['latlng', 'watts', 'heartrate'])
   * @returns {Promise<Object>} Streams data
   */
  async getActivityStreams(accessToken, activityId, streamTypes = ['latlng', 'watts', 'heartrate', 'altitude', 'cadence']) {
    await this.rateLimitDelay();

    try {
      // Intervals.icu streams endpoint: /api/v1/activity/{id}/streams.json?types=latlng,watts,...
      // See: https://forum.intervals.icu/t/access-activities-streams-via-api/101065
      const types = streamTypes.join(',');
      
      // Ensure activity ID has 'i' prefix
      const fullActivityId = activityId.startsWith('i') ? activityId : `i${activityId}`;
      
      console.log(`📥 [IntervalsService] Fetching streams for activity ${fullActivityId}: ${types}`);
      
      const response = await axios.get(
        `${INTERVALS_API_BASE}/activity/${fullActivityId}/streams.json?types=${types}`,
        {
          headers: { 
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ [IntervalsService] Fetched streams for activity ${fullActivityId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [IntervalsService] Streams API error:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Request URL:', error.config?.url);
      
      if (error.response?.status === 404) {
        // Activity might not have streams data
        console.log(`⚠️  [IntervalsService] No streams available for activity ${activityId}`);
        return null;
      }
      
      throw error;
    }
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
