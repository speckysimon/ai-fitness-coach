import React, { useState, useEffect } from 'react';
import { Activity, Filter, Search, Calendar, TrendingUp, Home, Mountain, Trophy, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import EditActivityModal from '../components/EditActivityModal';
import { formatDuration, formatDistance, formatDate } from '../lib/utils';
import { getRaceTypeLabel } from '../lib/raceUtils';

const AllActivities = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showRacesOnly, setShowRacesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, distance, duration
  const [ftp, setFtp] = useState(null);
  const [raceActivities, setRaceActivities] = useState({});
  const [currentTokens, setCurrentTokens] = useState(stravaTokens);

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
    console.log('AllActivities - stravaTokens:', stravaTokens);
    if (stravaTokens && stravaTokens.access_token) {
      console.log('AllActivities - Loading activities...');
      setCurrentTokens(stravaTokens);
      loadAllActivities();
    } else {
      console.log('AllActivities - No valid Strava tokens');
      setLoading(false);
    }
  }, [stravaTokens]);

  // Refresh Strava access token if expired
  const refreshAccessToken = async () => {
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    console.log('AllActivities - Refreshing access token...');
    const response = await fetch('/api/strava/refresh-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: currentTokens.refresh_token }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.requiresReauth) {
        throw new Error('REAUTH_REQUIRED');
      }
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    const newTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || currentTokens.refresh_token,
      expires_at: data.expires_at,
    };

    setCurrentTokens(newTokens);
    localStorage.setItem('strava_tokens', JSON.stringify(newTokens));
    console.log('AllActivities - Token refreshed successfully');
    
    return newTokens;
  };

  // Load race tags when component mounts
  useEffect(() => {
    const loadRaceTags = async () => {
      try {
        const sessionToken = localStorage.getItem('session_token');
        if (!sessionToken) return;

        const response = await fetch('/api/race-tags', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          setRaceActivities(data.raceTags || {});
        }
      } catch (error) {
        console.error('Error loading race tags:', error);
      }
    };
    loadRaceTags();
  }, []);

  useEffect(() => {
    filterAndSortActivities();
  }, [activities, searchTerm, filterType, sortBy, showRacesOnly, raceActivities]);

  const loadAllActivities = async () => {
    setLoading(true);
    try {
      // Check cache version - if old cache format, clear it
      const cacheVersion = localStorage.getItem('cache_version');
      if (cacheVersion !== '2.0') {
        console.log('AllActivities - Old cache detected, clearing...');
        localStorage.removeItem('cached_activities');
        localStorage.removeItem('cache_timestamp');
        localStorage.setItem('cache_version', '2.0');
      }

      // Try to load from cache first (much faster and avoids API rate limits)
      const cachedActivities = localStorage.getItem('cached_activities');
      const cacheTimestamp = localStorage.getItem('cache_timestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
      const cacheValid = cacheAge < 30 * 60 * 1000; // 30 minutes

      if (cachedActivities && cacheValid) {
        console.log('AllActivities - Using cached activities');
        const activities = JSON.parse(cachedActivities);
        await processActivitiesData(activities, currentTokens);
        return;
      }

      console.log('AllActivities - Cache miss or expired, fetching from Strava...');
      let tokensToUse = currentTokens;

      // Check if token is expired (expires_at is in seconds)
      const now = Math.floor(Date.now() / 1000);
      if (tokensToUse.expires_at && tokensToUse.expires_at < now) {
        console.log('AllActivities - Token expired, refreshing...');
        try {
          tokensToUse = await refreshAccessToken();
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please reconnect in Settings.');
          }
          throw refreshError;
        }
      }

      // Fetch all activities (no date restriction)
      console.log('AllActivities - Fetching all activities...');
      console.log('AllActivities - Access token present:', !!tokensToUse.access_token);
      
      const url = `/api/strava/activities?access_token=${tokensToUse.access_token}&per_page=200`;
      console.log('AllActivities - Fetching from:', url.replace(tokensToUse.access_token, 'TOKEN'));
      
      const response = await fetch(url);
      
      console.log('AllActivities - Response status:', response.status);
      console.log('AllActivities - Response ok:', response.ok);
      
      // Handle 401/403 - token might be expired
      if (response.status === 401 || response.status === 403) {
        console.log('AllActivities - Got 401/403, attempting token refresh...');
        try {
          tokensToUse = await refreshAccessToken();
          // Retry the request with new token
          const retryResponse = await fetch(
            `/api/strava/activities?access_token=${tokensToUse.access_token}&per_page=200`
          );
          
          if (!retryResponse.ok) {
            throw new Error('Failed to fetch activities after token refresh');
          }
          
          const data = await retryResponse.json();
          console.log('AllActivities - Received activities after refresh:', data.length);
          
          if (!data || data.length === 0) {
            console.log('AllActivities - No activities returned from API');
            setActivities([]);
            setFilteredActivities([]);
            setLoading(false);
            return;
          }
          
          // Process the data
          await processActivitiesData(data, tokensToUse);
          return;
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please reconnect in Settings.');
          }
          throw new Error('Failed to refresh your Strava connection. Please try reconnecting in Settings.');
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AllActivities - API error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AllActivities - Received activities:', data.length);
      console.log('AllActivities - First activity:', data[0]);
      
      if (!data || data.length === 0) {
        console.log('AllActivities - No activities returned from API');
        setActivities([]);
        setFilteredActivities([]);
        setLoading(false);
        return;
      }
      
      // Cache the fetched data
      localStorage.setItem('cached_activities', JSON.stringify(data));
      localStorage.setItem('cache_timestamp', Date.now().toString());
      console.log('AllActivities - Cached', data.length, 'activities');
      
      // Process the data
      await processActivitiesData(data, tokensToUse);
    } catch (error) {
      console.error('AllActivities - Error loading activities:', error);
      setActivities([]);
      setFilteredActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const processActivitiesData = async (data, tokensToUse) => {
    try {
      // Calculate FTP (non-blocking - don't fail if this errors)
      let currentFtp = null;
      try {
        const ftpResponse = await fetch('/api/analytics/ftp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: data }),
        });
        
        if (ftpResponse.ok) {
          const ftpData = await ftpResponse.json();
          currentFtp = ftpData.ftp;
          setFtp(ftpData.ftp);
        } else {
          console.warn('AllActivities - FTP calculation failed, continuing without it');
        }
      } catch (ftpError) {
        console.warn('AllActivities - FTP calculation error:', ftpError);
        // Continue without FTP
      }
      
      // Add TSS to each activity
      const activitiesWithTSS = data.map(activity => ({
        ...activity,
        tss: calculateTSS(activity, currentFtp)
      }));
      
      // Sort by date, most recent first
      const sortedData = activitiesWithTSS.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('AllActivities - Setting activities:', sortedData.length);
      setActivities(sortedData);
      setFilteredActivities(sortedData); // Set initial filtered activities immediately
    } catch (error) {
      console.error('AllActivities - Error processing activities:', error);
      throw error;
    }
  };

  const filterAndSortActivities = () => {
    console.log('Filtering activities. Total:', activities.length);
    let filtered = [...activities];

    // Apply race filter
    if (showRacesOnly) {
      console.log('Race filter ON');
      filtered = filtered.filter(activity => raceActivities[activity.id]);
    }

    // Apply search filter
    if (searchTerm) {
      console.log('Search filter:', searchTerm);
      filtered = filtered.filter(activity =>
        activity.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'All') {
      console.log('Type filter:', filterType);
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

    console.log('Filtered activities:', filtered.length);
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

  if (!stravaTokens || !stravaTokens.access_token) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Strava to View Activities</h3>
          <p className="text-gray-600 mb-4">You need to connect your Strava account to see your activities here.</p>
          <Button onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
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
          <div className="flex flex-col gap-4">
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

            {/* Race Filter Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRacesOnly(!showRacesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  showRacesOnly
                    ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-500 hover:bg-yellow-50'
                }`}
              >
                <Trophy className="w-5 h-5" />
                <span className="font-medium">
                  {showRacesOnly ? 'Showing Races Only' : 'Show Races Only'}
                </span>
                {showRacesOnly && Object.keys(raceActivities).length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-yellow-600 text-white text-xs rounded-full">
                    {Object.keys(raceActivities).length}
                  </span>
                )}
              </button>
              {showRacesOnly && (
                <span className="text-sm text-gray-600">
                  Showing {filteredActivities.length} race{filteredActivities.length !== 1 ? 's' : ''}
                </span>
              )}
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
            {filteredActivities.map((activity) => {
              const isRace = raceActivities[activity.id];
              return (
                <div
                  key={activity.id}
                  className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all border-l-4 ${getLoadColor(activity.tss)} ${isRace ? 'bg-yellow-50 border-yellow-300' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setSelectedActivity({
                    ...activity,
                    isRace: isRace?.isRace,
                    raceType: isRace?.raceType
                  })}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isRace ? 'bg-yellow-100' : 'bg-blue-50'}`}>
                      {isRace ? (
                        <Trophy className="w-6 h-6 text-yellow-600" />
                      ) : (
                        getActivityIcon(activity)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">{activity.name}</h4>
                        {isRace && (
                          <>
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                              RACE
                            </span>
                            {isRace.raceType && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                {getRaceTypeLabel(isRace.raceType)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
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
                  <div className="flex items-center gap-4">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingActivity(activity);
                      }}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit activity"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

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

      {/* Edit Activity Modal */}
      {editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onClose={() => setEditingActivity(null)}
          onSave={async () => {
            // Reload race tags from backend
            try {
              const sessionToken = localStorage.getItem('session_token');
              if (sessionToken) {
                const response = await fetch('/api/race-tags', {
                  headers: { 'Authorization': `Bearer ${sessionToken}` }
                });
                if (response.ok) {
                  const data = await response.json();
                  setRaceActivities(data.raceTags || {});
                }
              }
            } catch (error) {
              console.error('Error reloading race tags:', error);
            }
          }}
        />
      )}
    </div>
  );
};

export default AllActivities;
