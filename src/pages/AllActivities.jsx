import React, { useState, useEffect } from 'react';
import { Activity, Filter, Search, Calendar, TrendingUp, Home, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import { formatDuration, formatDistance, formatDate } from '../lib/utils';

const AllActivities = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortBy, setSortBy] = useState('date'); // date, distance, duration
  const [ftp, setFtp] = useState(null);

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

  useEffect(() => {
    if (stravaTokens) {
      loadAllActivities();
    }
  }, [stravaTokens]);

  useEffect(() => {
    filterAndSortActivities();
  }, [activities, searchTerm, filterType, sortBy]);

  const loadAllActivities = async () => {
    setLoading(true);
    try {
      // Fetch activities from the beginning of the year
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const after = Math.floor(yearStart.getTime() / 1000);
      
      const response = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${after}&per_page=200`
      );
      const data = await response.json();
      
      // Calculate FTP
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: data }),
      });
      const ftpData = await ftpResponse.json();
      setFtp(ftpData.ftp);
      
      // Add TSS to each activity
      const activitiesWithTSS = data.map(activity => ({
        ...activity,
        tss: calculateTSS(activity, ftpData.ftp)
      }));
      
      // Sort by date, most recent first
      const sortedData = activitiesWithTSS.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setActivities(sortedData);
      setFilteredActivities(sortedData);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortActivities = () => {
    let filtered = [...activities];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'All') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'distance':
          return (b.distance || 0) - (a.distance || 0);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'date':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

    setFilteredActivities(filtered);
  };

  const getActivityTypes = () => {
    const types = new Set(activities.map(a => a.type));
    return ['All', ...Array.from(types).sort()];
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

  const calculateStats = () => {
    return {
      total: filteredActivities.length,
      totalDistance: filteredActivities.reduce((sum, a) => sum + (a.distance || 0), 0),
      totalTime: filteredActivities.reduce((sum, a) => sum + (a.duration || 0), 0),
      totalElevation: filteredActivities.reduce((sum, a) => sum + (a.elevation || 0), 0),
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading all activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All Activities</h1>
        <p className="text-gray-600 mt-1">Complete history of your workouts this year</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">Total Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(stats.totalDistance / 1000)} km
            </div>
            <p className="text-xs text-gray-500 mt-1">Total Distance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(stats.totalTime / 3600)}h
            </div>
            <p className="text-xs text-gray-500 mt-1">Total Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(stats.totalElevation)} m
            </div>
            <p className="text-xs text-gray-500 mt-1">Total Elevation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getActivityTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date">Date (Newest)</option>
                <option value="distance">Distance</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredActivities.length} {filteredActivities.length === 1 ? 'Activity' : 'Activities'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer border-l-4 ${getLoadColor(activity.tss)}`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    {getActivityIcon(activity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{activity.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(activity.date)}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        {activity.type}
                      </span>
                    </div>
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

            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No activities found matching your filters</p>
              </div>
            )}
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

export default AllActivities;
