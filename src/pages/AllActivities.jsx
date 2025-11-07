import React, { useState, useEffect } from 'react';
import { Activity, Filter, Search, Calendar, TrendingUp, Home, Mountain, Trophy, Edit2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import EditActivityModal from '../components/EditActivityModal';
import ManualActivityModal from '../components/ManualActivityModal';
import { fetchManualActivities, mergeActivities, isManualActivity } from '../lib/manualActivityUtils';
import { formatDuration, formatDistance, formatDate } from '../lib/utils';
import { getRaceTypeLabel } from '../lib/raceUtils';
import logger from '../lib/logger';

const AllActivities = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);
  const [editingManualActivity, setEditingManualActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showRacesOnly, setShowRacesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, distance, duration
  const [ftp, setFtp] = useState(null);
  const [raceActivities, setRaceActivities] = useState({});
  const [currentTokens, setCurrentTokens] = useState(stravaTokens);
  const [showManualActivityModal, setShowManualActivityModal] = useState(false);
  const [manualActivities, setManualActivities] = useState([]);

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
    if (stravaTokens && stravaTokens.access_token) {
      setCurrentTokens(stravaTokens);
      loadAllActivities();
    } else {
      setLoading(false);
    }
  }, [stravaTokens]);

  // Refresh Strava access token if expired
  const refreshAccessToken = async () => {
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/strava/refresh', {
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
        logger.error('Error loading race tags:', error);
      }
    };
    loadRaceTags();
  }, []);

  useEffect(() => {
    filterAndSortActivities();
  }, [activities, searchTerm, filterType, sortBy, showRacesOnly, raceActivities]);

  const loadAllActivities = async (forceRefresh = false) => {
    setLoading(true);
    try {
      // If force refresh, redirect to Dashboard to refresh the cache
      if (forceRefresh) {
        console.log('🔄 [All Activities] Force refresh requested - please use Dashboard refresh');
        alert('Please use the Dashboard refresh button to fetch new activities');
        setLoading(false);
        return;
      }

      // Read from Dashboard's cache (never fetch independently)
      const cachedActivities = localStorage.getItem('cached_activities_recent');
      
      if (cachedActivities) {
        const activities = JSON.parse(cachedActivities);
        console.log(`📦 [All Activities] Using Dashboard cache (${activities.length} activities)`);
        await processActivitiesData(activities, currentTokens);
        return;
      } else {
        // No cache - user needs to visit Dashboard first
        console.warn('⚠️ [All Activities] No cache found. Please visit Dashboard first.');
        setActivities([]);
        setFilteredActivities([]);
        setLoading(false);
        return;
      }

      // This should never be reached since we return above
      throw new Error('Unexpected code path');
    } catch (error) {
      logger.error('[All Activities] Error:', error);
      setActivities([]);
      setFilteredActivities([]);
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
        }
      } catch (ftpError) {
        // Continue without FTP
      }
      
      // Add TSS to each Strava activity
      const activitiesWithTSS = data.map(activity => ({
        ...activity,
        tss: calculateTSS(activity, currentFtp)
      }));
      
      // Load manual activities and merge
      try {
        const currentUser = localStorage.getItem('current_user');
        const userId = currentUser ? JSON.parse(currentUser).id || 1 : 1;
        
        console.log('📥 [All Activities] Fetching manual activities for user:', userId);
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Manual activities fetch timeout')), 5000)
        );
        
        const manual = await Promise.race([
          fetchManualActivities({ userId, limit: 200 }),
          timeoutPromise
        ]);
        
        console.log('✅ [All Activities] Loaded', manual.length, 'manual activities');
        setManualActivities(manual);
        
        // Merge Strava and manual activities
        const allActivities = mergeActivities(activitiesWithTSS, manual);
        
        // Sort by date, most recent first
        const sortedData = allActivities.sort((a, b) => {
          const dateA = new Date(a.start_date_local || a.start_date || a.date);
          const dateB = new Date(b.start_date_local || b.start_date || b.date);
          return dateB - dateA;
        });
        
        setActivities(sortedData);
        setFilteredActivities(sortedData);
      } catch (manualError) {
        logger.error('Error loading manual activities:', manualError);
        // Fall back to just Strava activities
        const sortedData = activitiesWithTSS.sort((a, b) => new Date(b.date) - new Date(a.date));
        setActivities(sortedData);
        setFilteredActivities(sortedData);
      }
    } catch (error) {
      logger.error('[All Activities] Error processing activities:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortActivities = () => {
    let filtered = [...activities];

    // Apply race filter
    if (showRacesOnly) {
      filtered = filtered.filter(activity => raceActivities[activity.id]);
    }

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
        return <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
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
          <p className="text-gray-600 dark:text-gray-400">Loading all activities...</p>
        </div>
      </div>
    );
  }

  if (!stravaTokens || !stravaTokens.access_token) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect Strava to View Activities</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">You need to connect your Strava account to see your activities here.</p>
          <Button onClick={() => window.location.href = '/settings'}>
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">All Activities</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Complete history of your workouts this year</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(stats.totalDistance / 1000)} km
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total Distance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(stats.totalTime / 3600)}h
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(stats.totalElevation)} m
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Total Elevation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search activities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base flex-1 sm:flex-initial"
                >
                  {getActivityTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base flex-1 sm:flex-initial"
                >
                  <option value="date">Date (Newest)</option>
                  <option value="distance">Distance</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>

            {/* Race Filter Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowRacesOnly(!showRacesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  showRacesOnly
                    ? 'bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
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
              
              {/* Refresh Activities Button */}
              <button
                onClick={() => loadAllActivities(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh activities from Strava"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              {/* Add Manual Activity Button */}
              <button
                onClick={() => setShowManualActivityModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-700 hover:from-purple-700 hover:to-pink-700 transition-all font-medium"
              >
                <Plus className="w-5 h-5" />
                <span>Add Manual Activity</span>
              </button>
              
              {showRacesOnly && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
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
                  className={`flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all border-l-4 ${getLoadColor(activity.tss)} ${isRace ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                >
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setSelectedActivity({
                    ...activity,
                    isRace: isRace?.isRace,
                    raceType: isRace?.raceType
                  })}>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isRace ? 'bg-yellow-100 dark:bg-yellow-900/40' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
                      {isRace ? (
                        <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        getActivityIcon(activity)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{activity.name}</h4>
                        {isManualActivity(activity) && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 text-purple-700 dark:text-purple-300 text-xs font-medium rounded flex items-center gap-1">
                            {activity.icon} Manual
                          </span>
                        )}
                        {isRace && (
                          <>
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
                              RACE
                            </span>
                            {isRace.raceType && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
                                {getRaceTypeLabel(isRace.raceType)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(activity.date)}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                          {activity.type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{formatDuration(activity.duration)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{formatDistance(activity.distance)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
                      </div>
                      {activity.elevation > 0 && (
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{Math.round(activity.elevation)}m</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Elevation</div>
                        </div>
                      )}
                      {activity.tss > 0 && (
                        <div className="text-right">
                          <div className="font-medium text-blue-600 dark:text-blue-400">{activity.tss}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">TSS</div>
                        </div>
                      )}
                    </div>
                    {isManualActivity(activity) ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingManualActivity(activity);
                          }}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Edit manual activity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this manual activity?')) {
                              try {
                                const currentUser = localStorage.getItem('current_user');
                                const userId = currentUser ? JSON.parse(currentUser).id || 1 : 1;
                                const numericId = String(activity.id).startsWith('manual_') ? activity.id.split('_')[1] : activity.id;
                                const response = await fetch(`/api/manual-activities/${numericId}?userId=${userId}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  loadAllActivities();
                                }
                              } catch (error) {
                                logger.error('Error deleting manual activity:', error);
                              }
                            }
                          }}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete manual activity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingActivity(activity);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                        title="Tag as race"
                      >
                        <Trophy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredActivities.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
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
              logger.error('Error reloading race tags:', error);
            }
          }}
        />
      )}

      {/* Manual Activity Modal - Add New */}
      <ManualActivityModal
        isOpen={showManualActivityModal}
        onClose={() => setShowManualActivityModal(false)}
        onSave={() => {
          // Reload all activities after saving
          loadAllActivities();
          setShowManualActivityModal(false);
        }}
      />

      {/* Manual Activity Modal - Edit Existing */}
      {editingManualActivity && (
        <ManualActivityModal
          isOpen={true}
          editActivity={editingManualActivity}
          onClose={() => setEditingManualActivity(null)}
          onSave={() => {
            // Reload all activities after saving
            loadAllActivities();
            setEditingManualActivity(null);
          }}
        />
      )}
    </div>
  );
};

export default AllActivities;
