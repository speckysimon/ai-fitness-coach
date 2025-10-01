import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Calendar, Clock, Zap, Heart, Activity as ActivityIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDuration, formatDistance } from '../lib/utils';
import ActivityDetailModal from '../components/ActivityDetailModal';

const RaceAnalytics = ({ stravaTokens }) => {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [ftp, setFtp] = useState(null);

  useEffect(() => {
    if (stravaTokens) {
      loadRaceData();
    }
  }, [stravaTokens]);

  const loadRaceData = async () => {
    setLoading(true);
    try {
      // Load race tags
      const raceTags = JSON.parse(localStorage.getItem('race_tags') || '{}');
      const raceIds = Object.keys(raceTags).filter(id => raceTags[id]);

      if (raceIds.length === 0) {
        setRaces([]);
        setLoading(false);
        return;
      }

      // Always fetch from API for current season (Jan 1st to now)
      const seasonStart = new Date(new Date().getFullYear(), 0, 1); // January 1st of current year
      const after = Math.floor(seasonStart.getTime() / 1000);
      
      console.log('Fetching race data from season start:', seasonStart.toLocaleDateString());
      
      const response = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${after}&per_page=200`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      
      const allActivities = await response.json();
      
      // Filter for race activities from this season
      const raceActivities = allActivities.filter(activity => raceIds.includes(String(activity.id)));
      
      // Sort by date, most recent first
      const sortedRaces = raceActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log(`Found ${sortedRaces.length} races in current season`);
      
      setRaces(sortedRaces);

      // Load FTP
      const cachedMetrics = localStorage.getItem('cached_metrics');
      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        setFtp(metrics.ftp);
      }
    } catch (error) {
      console.error('Error loading race data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate performance trends
  const calculateTrends = () => {
    if (races.length < 2) return null;

    // Group races by type
    const racesByType = races.reduce((acc, race) => {
      if (!acc[race.type]) acc[race.type] = [];
      acc[race.type].push(race);
      return acc;
    }, {});

    // Calculate trends for each metric
    const trends = {};
    Object.keys(racesByType).forEach(type => {
      const typeRaces = racesByType[type].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      if (typeRaces.length >= 2) {
        const first = typeRaces[0];
        const last = typeRaces[typeRaces.length - 1];
        
        trends[type] = {
          avgSpeed: {
            change: last.avgSpeed - first.avgSpeed,
            percent: ((last.avgSpeed - first.avgSpeed) / first.avgSpeed) * 100
          },
          avgPower: last.avgPower && first.avgPower ? {
            change: last.avgPower - first.avgPower,
            percent: ((last.avgPower - first.avgPower) / first.avgPower) * 100
          } : null,
          avgHeartRate: last.avgHeartRate && first.avgHeartRate ? {
            change: last.avgHeartRate - first.avgHeartRate,
            percent: ((last.avgHeartRate - first.avgHeartRate) / first.avgHeartRate) * 100
          } : null
        };
      }
    });

    return trends;
  };

  // Prepare chart data
  const getChartData = () => {
    return races
      .slice()
      .reverse() // Show oldest to newest in chart
      .map(race => ({
        date: new Date(race.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: race.date,
        name: race.name,
        speed: race.avgSpeed ? (race.avgSpeed * 3.6).toFixed(1) : 0, // Convert m/s to km/h
        power: race.avgPower || 0,
        heartRate: race.avgHeartRate || 0,
        distance: race.distance ? (race.distance / 1000).toFixed(1) : 0,
        duration: race.duration ? (race.duration / 60).toFixed(0) : 0 // minutes
      }));
  };

  // Calculate summary stats
  const getSummaryStats = () => {
    if (races.length === 0) return null;

    const totalDistance = races.reduce((sum, r) => sum + (r.distance || 0), 0);
    const totalTime = races.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgSpeed = races.filter(r => r.avgSpeed).reduce((sum, r) => sum + r.avgSpeed, 0) / races.filter(r => r.avgSpeed).length;
    const avgPower = races.filter(r => r.avgPower).reduce((sum, r) => sum + r.avgPower, 0) / races.filter(r => r.avgPower).length;
    const avgHR = races.filter(r => r.avgHeartRate).reduce((sum, r) => sum + r.avgHeartRate, 0) / races.filter(r => r.avgHeartRate).length;

    return {
      totalRaces: races.length,
      totalDistance: totalDistance / 1000, // km
      totalTime: totalTime / 3600, // hours
      avgSpeed: avgSpeed * 3.6, // km/h
      avgPower: avgPower || 0,
      avgHR: avgHR || 0
    };
  };

  const getTrendIcon = (value) => {
    if (!value) return <Minus className="w-4 h-4 text-gray-400" />;
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const trends = calculateTrends();
  const chartData = getChartData();
  const stats = getSummaryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading race analytics...</p>
        </div>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-600" />
            Race Analytics
          </h1>
          <p className="text-gray-600 mt-1">Track your race performance over time</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Races Tagged Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by tagging some of your activities as races to see performance analytics here.
              </p>
              <p className="text-sm text-gray-500">
                Go to <strong>All Activities</strong> and click the edit button on any activity to mark it as a race.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-600" />
          Race Analytics
        </h1>
        <p className="text-gray-600 mt-1">
          Track your race performance over time - Current Season ({new Date().getFullYear()})
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Showing all races from January 1st, {new Date().getFullYear()} to present
        </p>
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Races</CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRaces}</div>
              <p className="text-xs text-muted-foreground">Competitive events</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
              <ActivityIcon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDistance.toFixed(0)} km</div>
              <p className="text-xs text-muted-foreground">Race distance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgSpeed.toFixed(1)} km/h</div>
              <p className="text-xs text-muted-foreground">Average race speed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Power</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgPower > 0 ? `${stats.avgPower.toFixed(0)}W` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">Average race power</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Trends Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Speed Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Speed Progression</CardTitle>
            <CardDescription>Average speed across races</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'km/h', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.name;
                    }
                    return value;
                  }}
                  formatter={(value) => [`${value} km/h`, 'Speed']}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Power Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Power Progression</CardTitle>
            <CardDescription>Average power across races</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.some(d => d.power > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'Watts', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.name;
                      }
                      return value;
                    }}
                    formatter={(value) => [`${value}W`, 'Power']}
                  />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="#eab308"
                    strokeWidth={3}
                    dot={{ fill: '#eab308', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No power data available for races</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Heart Rate Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Heart Rate Progression</CardTitle>
            <CardDescription>Average heart rate across races</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.some(d => d.heartRate > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: 'BPM', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    labelFormatter={(value, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.name;
                      }
                      return value;
                    }}
                    formatter={(value) => [`${value} bpm`, 'Heart Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="heartRate"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: '#ef4444', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No heart rate data available for races</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Race Distances</CardTitle>
            <CardDescription>Distribution of race distances</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  labelFormatter={(value, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.name;
                    }
                    return value;
                  }}
                  formatter={(value) => [`${value} km`, 'Distance']}
                />
                <Bar dataKey="distance" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Races List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Races</CardTitle>
          <CardDescription>Your latest competitive performances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {races.slice(0, 10).map((race) => (
              <div
                key={race.id}
                onClick={() => setSelectedActivity(race)}
                className="flex items-center justify-between p-4 border-2 border-yellow-300 bg-yellow-50 rounded-lg hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{race.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(race.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                        {race.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="text-right">
                    <div className="font-medium">{formatDuration(race.duration)}</div>
                    <div className="text-xs text-gray-500">Duration</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatDistance(race.distance)}</div>
                    <div className="text-xs text-gray-500">Distance</div>
                  </div>
                  {race.avgSpeed && (
                    <div className="text-right">
                      <div className="font-medium">{(race.avgSpeed * 3.6).toFixed(1)} km/h</div>
                      <div className="text-xs text-gray-500">Avg Speed</div>
                    </div>
                  )}
                  {race.avgPower && (
                    <div className="text-right">
                      <div className="font-medium text-yellow-600">{Math.round(race.avgPower)}W</div>
                      <div className="text-xs text-gray-500">Avg Power</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default RaceAnalytics;
