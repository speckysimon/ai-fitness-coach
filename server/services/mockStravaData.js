const { subDays, format, addMinutes } = require('date-fns');

/**
 * Service to generate realistic mock Strava data for demo users
 */
const mockStravaService = {
    /**
     * Generate a list of mock activities for the last 90 days
     * @param {Object} userProfile - User profile for customizing data (ftp, weight, etc.)
     * @returns {Array} List of mock Strava activities
     */
    generateMockActivities(userProfile = {}) {
        const activities = [];
        const today = new Date();
        const daysToGenerate = 90;

        // Default profile values if not provided
        const ftp = userProfile.ftp || 250;
        const weight = userProfile.weight || 75; // kg

        // Activity types distribution
        // 0: Recovery/Easy (40%)
        // 1: Endurance/Zone 2 (30%)
        // 2: Tempo/Sweet Spot (15%)
        // 3: Threshold/VO2 Max (10%)
        // 4: Long Ride (5%)

        for (let i = 0; i < daysToGenerate; i++) {
            const date = subDays(today, i);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

            // Skip some days (rest days) - usually Mon/Fri or random
            // 3-4 rides per week average
            const isRestDay = Math.random() > 0.6 && dayOfWeek !== 0 && dayOfWeek !== 6;

            if (isRestDay) continue;

            const activityType = this._determineActivityType(dayOfWeek);
            const activity = this._createActivity(date, activityType, ftp, weight);

            activities.push(activity);
        }

        // Sort by date descending (newest first)
        return activities.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    },

    /**
     * Get mock athlete stats
     */
    getMockAthleteStats(activities) {
        const currentYear = new Date().getFullYear();
        const ytdActivities = activities.filter(a => new Date(a.start_date).getFullYear() === currentYear);

        const totalDistance = ytdActivities.reduce((sum, a) => sum + a.distance, 0);
        const totalTime = ytdActivities.reduce((sum, a) => sum + a.moving_time, 0);
        const totalElevation = ytdActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0);

        return {
            recent_ride_totals: this._calculateRecentTotals(activities),
            ytd_ride_totals: {
                count: ytdActivities.length,
                distance: totalDistance,
                moving_time: totalTime,
                elapsed_time: totalTime * 1.1,
                elevation_gain: totalElevation,
            },
            all_ride_totals: {
                count: activities.length + 150, // Fake previous history
                distance: totalDistance + 5000000,
                moving_time: totalTime + 200000,
                elevation_gain: totalElevation + 40000,
            }
        };
    },

    /**
     * Get mock athlete profile
     */
    getMockAthlete() {
        return {
            id: 12345678,
            username: "demo_athlete",
            firstname: "Demo",
            lastname: "Athlete",
            city: "San Francisco",
            state: "CA",
            country: "United States",
            sex: "M",
            premium: true,
            summit: true,
            created_at: "2020-01-01T00:00:00Z",
            updated_at: new Date().toISOString(),
            profile: "https://d3nn82uaxijpm6.cloudfront.net/assets/avatar/athlete/large.png",
            profile_medium: "https://d3nn82uaxijpm6.cloudfront.net/assets/avatar/athlete/medium.png",
        };
    },

    // --- Helper Methods ---

    _determineActivityType(dayOfWeek) {
        // Weekends are usually longer rides
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return Math.random() > 0.5 ? 'LONG_RIDE' : 'ENDURANCE';
        }

        // Weekdays mixed
        const rand = Math.random();
        if (rand < 0.4) return 'RECOVERY';
        if (rand < 0.7) return 'ENDURANCE';
        if (rand < 0.9) return 'TEMPO';
        return 'THRESHOLD';
    },

    _createActivity(date, type, ftp, weight) {
        const id = date.getTime();

        // Base duration in minutes
        let duration;
        let intensityFactor;
        let name;

        switch (type) {
            case 'RECOVERY':
                duration = 30 + Math.random() * 30; // 30-60 min
                intensityFactor = 0.55;
                name = "Recovery Spin";
                break;
            case 'ENDURANCE':
                duration = 60 + Math.random() * 30; // 60-90 min
                intensityFactor = 0.65;
                name = "Zone 2 Endurance";
                break;
            case 'TEMPO':
                duration = 60 + Math.random() * 30; // 60-90 min
                intensityFactor = 0.8;
                name = "Tempo Intervals";
                break;
            case 'THRESHOLD':
                duration = 45 + Math.random() * 30; // 45-75 min
                intensityFactor = 0.95;
                name = "Threshold Workout";
                break;
            case 'LONG_RIDE':
                duration = 120 + Math.random() * 120; // 2-4 hours
                intensityFactor = 0.7;
                name = "Long Weekend Ride";
                break;
            default:
                duration = 60;
                intensityFactor = 0.6;
                name = "Morning Ride";
        }

        // Add some randomness to intensity
        intensityFactor = intensityFactor * (0.9 + Math.random() * 0.2);

        const movingTime = Math.floor(duration * 60);
        const averageWatts = Math.floor(ftp * intensityFactor);
        const weightedAverageWatts = Math.floor(averageWatts * 1.05); // Normalized power usually higher
        const kilojoules = (averageWatts * movingTime) / 1000;

        // Speed estimation (very rough physics)
        // Power = Speed * (AirResistance + RollingResistance + Gravity)
        // Simplified: Speed ~ CubeRoot(Power)
        const speedKph = 20 + (averageWatts / weight) * 4; // Rough approximation
        const distance = (speedKph * (duration / 60)) * 1000; // meters

        const elevationGain = distance * 0.01; // 1% grade average

        // Set start time (usually morning or evening)
        const startHour = Math.random() > 0.5 ? 7 : 17;
        date.setHours(startHour, Math.floor(Math.random() * 60), 0);

        return {
            id: id,
            resource_state: 2,
            external_id: `demo-${id}`,
            upload_id: id,
            athlete: { id: 12345678 },
            name: name,
            distance: distance,
            moving_time: movingTime,
            elapsed_time: Math.floor(movingTime * 1.1),
            total_elevation_gain: elevationGain,
            type: "Ride",
            sport_type: "Ride",
            start_date: date.toISOString(),
            start_date_local: date.toISOString(), // Simplified timezone
            timezone: "(GMT-08:00) America/Los_Angeles",
            utc_offset: -28800,
            start_latlng: [37.77, -122.41],
            end_latlng: [37.77, -122.41],
            location_city: "San Francisco",
            location_state: "California",
            location_country: "United States",
            achievement_count: Math.floor(Math.random() * 5),
            kudos_count: Math.floor(Math.random() * 10),
            comment_count: 0,
            athlete_count: 1,
            photo_count: 0,
            map: {
                id: `a${id}`,
                summary_polyline: "mock_polyline_string",
                resource_state: 2
            },
            trainer: false,
            commute: false,
            manual: false,
            private: false,
            visibility: "everyone",
            flagged: false,
            gear_id: "g12345",
            from_accepted_tag: false,
            average_speed: distance / movingTime,
            max_speed: (distance / movingTime) * 1.5,
            average_cadence: 85 + Math.floor(Math.random() * 10),
            average_temp: 20,
            average_watts: averageWatts,
            weighted_average_watts: weightedAverageWatts,
            kilojoules: kilojoules,
            device_watts: true,
            has_heartrate: true,
            average_heartrate: 130 + (intensityFactor * 40),
            max_heartrate: 170 + (intensityFactor * 20),
            elev_high: 100 + elevationGain,
            elev_low: 100,
            pr_count: 0,
            total_photo_count: 0,
            has_kudoed: false,
            suffer_score: Math.floor(intensityFactor * duration)
        };
    },

    _calculateRecentTotals(activities) {
        // Last 4 weeks (28 days)
        const fourWeeksAgo = subDays(new Date(), 28);
        const recentActivities = activities.filter(a => new Date(a.start_date) >= fourWeeksAgo);

        const distance = recentActivities.reduce((sum, a) => sum + a.distance, 0);
        const time = recentActivities.reduce((sum, a) => sum + a.moving_time, 0);
        const elevation = recentActivities.reduce((sum, a) => sum + a.total_elevation_gain, 0);

        return {
            count: recentActivities.length,
            distance: distance,
            moving_time: time,
            elapsed_time: time * 1.1,
            elevation_gain: elevation,
            achievement_count: 0
        };
    }
};

module.exports = mockStravaService;
