import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Clock, Mountain, Zap, Calendar as CalendarIcon, ArrowRight, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, formatDistance } from '../lib/utils';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ stravaTokens }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);

  // Calculate TSS for a single activity
  const calculateTSS = (activity, ftp) => {
    if (!activity.duration) return 0;

    const durationHours = activity.duration / 3600;

    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }

    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
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
  };

  const getActivityIcon = (activity) => {
    const isZwift = activity.name?.toLowerCase().includes('zwift');
    const isIndoor = activity.trainer || activity.type === 'VirtualRide';
    
    // Zwift activities get special treatment
    if (isZwift) {
      return (
        <div className="relative">
          <div className="text-orange-600 font-bold text-lg">Z</div>
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
        </div>
      );
    }
    
    // Indoor activities
    if (isIndoor) {
      return <Home className="w-5 h-5 text-purple-600" />;
    }
    
    // Outdoor activities by type
    switch (activity.type) {
      case 'Ride':
        return <Mountain className="w-5 h-5 text-blue-600" />;
      case 'Run':
        return <Activity className="w-5 h-5 text-green-600" />;
      case 'Swim':
        return <div className="text-cyan-600 text-xl">🏊</div>;
      case 'Workout':
        return <div className="text-red-600 text-xl">💪</div>;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getLoadColor = (tss) => {
    // Traffic light system based on TSS
    if (tss >= 150) return 'border-l-red-500 bg-red-50'; // Very hard
    if (tss >= 100) return 'border-l-orange-500 bg-orange-50'; // Hard
    if (tss >= 50) return 'border-l-yellow-500 bg-yellow-50'; // Moderate
    if (tss > 0) return 'border-l-green-500 bg-green-50'; // Easy
    return 'border-l-gray-300 bg-white'; // No TSS data
  };

  useEffect(() => {
    if (stravaTokens) {
      loadDashboardData();
    }
  }, [stravaTokens]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    // Try to load from cache first
    const cachedActivities = localStorage.getItem('cached_activities');
    const cachedMetrics = localStorage.getItem('cached_metrics');
    const cachedTrends = localStorage.getItem('cached_trends');
    const cacheTimestamp = localStorage.getItem('cache_timestamp');
    
    // Use cache if it's less than 5 minutes old
    const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
    if (cacheAge < 5 * 60 * 1000 && cachedActivities && cachedMetrics && cachedTrends) {
      setActivities(JSON.parse(cachedActivities));
      setMetrics(JSON.parse(cachedMetrics));
      setTrends(JSON.parse(cachedTrends));
      setLoading(false);
      return;
    }
    
    try {
      // Fetch activities from last 6 weeks
      const sixWeeksAgo = Math.floor(Date.now() / 1000) - (6 * 7 * 24 * 60 * 60);
      const activitiesResponse = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${sixWeeksAgo}&per_page=100`
      );
      const activitiesData = await activitiesResponse.json();
      
      // Calculate FTP first (needed for TSS calculation)
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: activitiesData }),
      });
      const ftpData = await ftpResponse.json();
      
      // Calculate TSS for each activity
      const activitiesWithTSS = activitiesData.map(activity => ({
        ...activity,
        tss: calculateTSS(activity, ftpData.ftp)
      }));
      
      // Sort activities by date, most recent first
      const sortedActivities = activitiesWithTSS.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      setActivities(sortedActivities);

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
      
      // Cache the data
      localStorage.setItem('cached_activities', JSON.stringify(sortedActivities));
      localStorage.setItem('cached_metrics', JSON.stringify({ ftp: ftpData.ftp, ...loadData }));
      localStorage.setItem('cached_trends', JSON.stringify(trendsData));
      localStorage.setItem('cache_timestamp', Date.now().toString());
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Your last 10 workouts</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/activities')}
              className="flex items-center gap-2"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.slice(0, 10).map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer border-l-4 ${getLoadColor(activity.tss)}`}
                onClick={() => setSelectedActivity(activity)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    {getActivityIcon(activity)}
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
                  {activity.tss > 0 && (
                    <div className="text-right">
                      <div className="font-medium text-blue-600">{activity.tss}</div>
                      <div className="text-xs text-gray-500">TSS</div>
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

export default Dashboard;
