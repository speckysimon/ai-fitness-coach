import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Clock, Mountain, Zap, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, formatDistance } from '../lib/utils';

const Dashboard = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (stravaTokens) {
      loadDashboardData();
    }
  }, [stravaTokens]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch activities from last 6 weeks
      const sixWeeksAgo = Math.floor(Date.now() / 1000) - (6 * 7 * 24 * 60 * 60);
      const activitiesResponse = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${sixWeeksAgo}&per_page=100`
      );
      const activitiesData = await activitiesResponse.json();
      
      // Sort activities by date, most recent first
      const sortedActivities = activitiesData.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setActivities(sortedActivities);

      // Calculate FTP
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activitiesData }),
      });
      const ftpData = await ftpResponse.json();

      // Calculate training load
      const loadResponse = await fetch('/api/analytics/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activitiesData, ftp: ftpData.ftp }),
      });
      const loadData = await loadResponse.json();

      setMetrics({ ftp: ftpData.ftp, ...loadData });

      // Get trends
      const trendsResponse = await fetch('/api/analytics/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activitiesData, weeks: 6 }),
      });
      const trendsData = await trendsResponse.json();
      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your training data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Your training overview and progress</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current FTP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.ftp ? `${metrics.ftp}W` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Functional Threshold Power
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Load</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.currentWeek.tss || 0} TSS
            </div>
            <p className="text-xs text-muted-foreground">
              Training Stress Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Time</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.currentWeek.time || 0}h
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.currentWeek.activities || 0} activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Distance</CardTitle>
            <Mountain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.currentWeek.distance || 0} km
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.currentWeek.elevation || 0}m elevation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Volume Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Training Volume (6 weeks)</CardTitle>
            <CardDescription>Weekly training hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Count (6 weeks)</CardTitle>
            <CardDescription>Number of workouts per week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar 
                  dataKey="activities" 
                  fill="#8b5cf6" 
                  name="Activities"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
          <CardDescription>Your last 10 workouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{activity.name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="text-right">
                    <div className="font-medium">{formatDuration(activity.duration)}</div>
                    <div className="text-xs text-gray-500">Duration</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatDistance(activity.distance)}</div>
                    <div className="text-xs text-gray-500">Distance</div>
                  </div>
                  {activity.elevation > 0 && (
                    <div className="text-right">
                      <div className="font-medium">{Math.round(activity.elevation)}m</div>
                      <div className="text-xs text-gray-500">Elevation</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
