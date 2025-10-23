import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Clock, Mountain, Zap, Calendar as CalendarIcon, ArrowRight, Home, RefreshCw, LogOut, Bell, Trophy, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, formatDistance } from '../lib/utils';
import ActivityDetailModal from '../components/ActivityDetailModal';
import SessionHoverModal from '../components/SessionHoverModal';
import EditActivityModal from '../components/EditActivityModal';
import AITrainingCoach from '../components/AITrainingCoach';
import LogIllnessModal from '../components/LogIllnessModal';
import PlanAdjustmentNotification from '../components/PlanAdjustmentNotification';
import DashboardClock from '../components/DashboardClock';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ stravaTokens, onLogout }) => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showLogIllness, setShowLogIllness] = useState(false);
  const [pendingAdjustment, setPendingAdjustment] = useState(null);
  const [aiCoachKey, setAiCoachKey] = useState(0);
  const [editingActivity, setEditingActivity] = useState(null);
  const [error, setError] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [upcomingWorkout, setUpcomingWorkout] = useState(null);
  const [volumePeriod, setVolumePeriod] = useState(6); // weeks
  const [tssPeriod, setTssPeriod] = useState(6); // weeks for TSS chart
  const [currentTokens, setCurrentTokens] = useState(stravaTokens);
  const [raceActivities, setRaceActivities] = useState({});
  const [showStravaNotification, setShowStravaNotification] = useState(() => {
    // Initialize based on whether we have tokens and if notification was dismissed
    const dismissed = sessionStorage.getItem('strava_notification_dismissed');
    return !stravaTokens && !dismissed;
  });
  const [smartFTPContext, setSmartFTPContext] = useState(null);

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

  // Check notification on mount and when stravaTokens changes
  useEffect(() => {
    if (stravaTokens && stravaTokens.access_token) {
      setCurrentTokens(stravaTokens);
      loadDashboardData(false);
      setShowStravaNotification(false);
    } else {
      // Show notification if no Strava tokens and hasn't been dismissed
      const dismissed = sessionStorage.getItem('strava_notification_dismissed');
      if (!dismissed) {
        setShowStravaNotification(true);
      }
    }
  }, [stravaTokens]);

  // Load race tags when activities change
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
    
    if (activities.length > 0) {
      loadRaceTags();
    }
  }, [activities]);

  // Load upcoming workout when metrics are available
  useEffect(() => {
    loadUpcomingWorkout();
  }, [metrics]);

  // Refresh Strava access token if expired
  const refreshAccessToken = async () => {
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/strava/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: currentTokens.refresh_token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresReauth) {
          throw new Error('REAUTH_REQUIRED');
        }
        throw new Error(errorData.error || 'Failed to refresh token');
      }

      const data = await response.json();
      const newTokens = {
        ...currentTokens,
        ...data.tokens,
      };

      // Update tokens in state and localStorage
      setCurrentTokens(newTokens);
      localStorage.setItem('strava_tokens', JSON.stringify(newTokens));

      return newTokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  };

  const loadUpcomingWorkout = () => {
    const storedPlan = localStorage.getItem('training_plan');
    if (!storedPlan) {
      setUpcomingWorkout(null);
      return;
    }

    const plan = JSON.parse(storedPlan);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all sessions with dates
    const allSessions = plan.weeks.flatMap(week => week.sessions);
    
    // Find the next upcoming session (today or future)
    const upcomingSessions = allSessions
      .filter(session => {
        if (!session.date) return false;
        const sessionDate = new Date(session.date);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcomingSessions.length > 0) {
      const session = upcomingSessions[0];
      // Calculate estimated TSS for the session
      const estimatedTSS = calculateSessionTSS(session, metrics?.ftp);
      setUpcomingWorkout({ ...session, estimatedTSS });
    } else {
      setUpcomingWorkout(null);
    }
  };

  // Calculate estimated TSS for a planned session
  const calculateSessionTSS = (session, ftp) => {
    if (!session.duration) return 0;
    
    const durationHours = session.duration / 60; // session duration is in minutes
    
    // Estimate based on session type
    const typeIntensityFactors = {
      'Recovery': 0.5,
      'Endurance': 0.65,
      'Tempo': 0.85,
      'Threshold': 0.95,
      'VO2Max': 1.1,
      'Intervals': 1.0,
    };
    
    const intensityFactor = typeIntensityFactors[session.type] || 0.7;
    return Math.round(durationHours * intensityFactor * intensityFactor * 100);
  };

  // Get TSS badge color
  const getTSSBadgeColor = (tss) => {
    if (!tss) return 'bg-gray-100 text-gray-700';
    if (tss >= 150) return 'bg-red-100 text-red-700 border-red-300';
    if (tss >= 100) return 'bg-orange-100 text-orange-700 border-orange-300';
    if (tss >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  const loadDashboardData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    // Try to load from cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedActivities = localStorage.getItem('cached_activities');
      const cachedMetrics = localStorage.getItem('cached_metrics');
      const cachedTrends = localStorage.getItem('cached_trends');
      const cachedSmartFTP = localStorage.getItem('smart_ftp_context');
      const cacheTimestamp = localStorage.getItem('cache_timestamp');
      
      // Use cache if it's less than 5 minutes old
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
      if (cacheAge < 5 * 60 * 1000 && cachedActivities && cachedMetrics && cachedTrends) {
        setActivities(JSON.parse(cachedActivities));
        setMetrics(JSON.parse(cachedMetrics));
        setTrends(JSON.parse(cachedTrends));
        if (cachedSmartFTP) {
          setSmartFTPContext(JSON.parse(cachedSmartFTP));
        }
        setHasData(true);
        setLoading(false);
        return;
      }
    }
    
    try {
      let tokensToUse = currentTokens;

      // Check if token is expired (expires_at is in seconds)
      const now = Math.floor(Date.now() / 1000);
      if (tokensToUse.expires_at && tokensToUse.expires_at < now) {
        console.log('Token expired, refreshing...');
        try {
          tokensToUse = await refreshAccessToken();
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please log out and log in again.');
          }
          throw refreshError;
        }
      }

      // Fetch activities from last 6 weeks
      const sixWeeksAgo = Math.floor(Date.now() / 1000) - (6 * 7 * 24 * 60 * 60);
      const userId = localStorage.getItem('current_user') ? JSON.parse(localStorage.getItem('current_user')).email : 'anonymous';
      const activitiesResponse = await fetch(
        `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${sixWeeksAgo}&per_page=100&user_id=${encodeURIComponent(userId)}`
      );
      
      // Check if token is invalid or expired
      if (activitiesResponse.status === 401 || activitiesResponse.status === 403) {
        console.log('Got 401/403, attempting token refresh...');
        try {
          tokensToUse = await refreshAccessToken();
          // Retry the request with new token
          const retryResponse = await fetch(
            `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${sixWeeksAgo}&per_page=100&user_id=${encodeURIComponent(userId)}`
          );
          
          if (!retryResponse.ok) {
            throw new Error('Failed to fetch activities after token refresh');
          }
          
          const activitiesData = await retryResponse.json();
          if (activitiesData.error) {
            throw new Error(activitiesData.error);
          }
          
          // Continue with the rest of the function using activitiesData
          await processActivitiesData(activitiesData, tokensToUse);
          return;
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please log out and log in again.');
          }
          throw new Error('Failed to refresh your Strava connection. Please try logging out and back in.');
        }
      }
      
      if (!activitiesResponse.ok) {
        throw new Error(`Failed to fetch activities: ${activitiesResponse.statusText}`);
      }
      
      const activitiesData = await activitiesResponse.json();
      
      // Check if response is an error object
      if (activitiesData.error) {
        throw new Error(activitiesData.error);
      }
      
      await processActivitiesData(activitiesData, tokensToUse);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      // Keep hasData true if we had cached data before the error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processActivitiesData = async (activitiesData, tokensToUse) => {
    // Calculate FTP first (needed for TSS calculation)
    // Log activities for debugging FTP calculation
    const powerActivities = activitiesData.filter(a => a.avgPower && a.avgPower > 0 && a.duration >= 1200);
    const recentPowerActivities = powerActivities.filter(a => {
      const activityDate = new Date(a.date);
      const sixWeeksAgo = new Date();
      sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
      return activityDate >= sixWeeksAgo;
    });
    console.log('Dashboard - Total activities:', activitiesData.length);
    console.log('Dashboard - Power activities (>=20min):', powerActivities.length);
    console.log('Dashboard - Recent power activities (last 6 weeks):', recentPowerActivities.length);
    
    // Get last known FTP from cache
    const cachedMetrics = localStorage.getItem('cached_metrics');
    const lastKnownFTP = cachedMetrics ? JSON.parse(cachedMetrics).ftp : null;
    
    // Calculate Smart FTP (training-load aware)
    const smartFTPResponse = await fetch('/api/analytics/smart-ftp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        activities: activitiesData,
        lastKnownFTP 
      }),
    });
    
    if (!smartFTPResponse.ok) {
      throw new Error('Failed to calculate Smart FTP');
    }
    
    const smartFTPData = await smartFTPResponse.json();
    console.log('Dashboard - Smart FTP result:', smartFTPData);
    
    // Store smart FTP context for UI display
    setSmartFTPContext(smartFTPData);
    
    const ftpData = { ftp: smartFTPData.ftp };
    
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

    // Get trends - always fetch 6 weeks, we'll filter in UI, pass FTP for TSS calculation
    const trendsResponse = await fetch('/api/analytics/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: activitiesData, weeks: 6, ftp: ftpData.ftp }),
    });
    const trendsData = await trendsResponse.json();
    console.log('Trends data received:', trendsData);
    setTrends(trendsData);
    
    // Cache the data
    localStorage.setItem('cached_activities', JSON.stringify(sortedActivities));
    localStorage.setItem('cached_metrics', JSON.stringify({ ftp: ftpData.ftp, ...loadData }));
    localStorage.setItem('cached_trends', JSON.stringify(trendsData));
    localStorage.setItem('smart_ftp_context', JSON.stringify(smartFTPData));
    localStorage.setItem('cache_timestamp', Date.now().toString());
    setHasData(true);
  };

  const handleForceRefresh = () => {
    loadDashboardData(true);
  };

  // Get filtered trends based on selected period
  const getFilteredTrendsVolume = () => {
    if (!trends || trends.length === 0) return [];
    return trends.slice(-volumePeriod);
  };

  const getFilteredTrendsTSS = () => {
    if (!trends || trends.length === 0) return [];
    return trends.slice(-tssPeriod);
  };

  // Get color for load line based on TSS value
  const getLoadLineColor = (value) => {
    if (!value) return '#9ca3af'; // gray for no data
    if (value >= 600) return '#ef4444'; // red for very high
    if (value >= 400) return '#f97316'; // orange for high
    if (value >= 200) return '#eab308'; // yellow for moderate
    return '#22c55e'; // green for low
  };

  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          {!error && (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your training data...</p>
            </>
          )}
          {error && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-4">
                <p className="text-red-800 font-medium mb-2">⚠️ Unable to Load Data</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleForceRefresh} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                {error.includes('expired') && onLogout && (
                  <Button onClick={onLogout} variant="default">
                    <LogOut className="w-4 h-4 mr-2" />
                    Re-authenticate
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Strava Connection Notification */}
      {showStravaNotification && (!stravaTokens || !stravaTokens.access_token) ? (
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg p-4 shadow-md mb-6">
          <div className="flex items-start gap-3">
            <Activity className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-orange-900 font-semibold mb-1">Connect Strava to Get Started</h3>
              <p className="text-orange-800 text-sm mb-3">
                Connect your Strava account to import activities, track progress, and get personalized training insights.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/settings')} 
                  variant="default" 
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Connect Strava
                </Button>
                <Button 
                  onClick={() => {
                    setShowStravaNotification(false);
                    sessionStorage.setItem('strava_notification_dismissed', 'true');
                  }} 
                  variant="outline" 
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Error Banner */}
      {error && hasData && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-red-600">⚠️</div>
            <div>
              <p className="text-red-800 font-medium">Failed to refresh data</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleForceRefresh} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            {error.includes('expired') && onLogout && (
              <Button onClick={onLogout} variant="default" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Re-authenticate
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Your training overview and progress</p>
        </div>
        <div className="flex items-center gap-4">
          <DashboardClock />
          <Button
            onClick={handleForceRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>
      
      {/* Upcoming Workout Card - Centered */}
      {upcomingWorkout && (
        <Card 
          className="max-w-2xl mx-auto border-2 border-blue-200 shadow-lg cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all"
          onClick={() => setSelectedSession(upcomingWorkout)}
        >
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              {/* Notification Icon */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <Bell className="w-8 h-8 text-red-500" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
              </div>
              
              {/* Workout Details */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{upcomingWorkout.title}</h3>
                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                    upcomingWorkout.type === 'Recovery' ? 'bg-green-100 text-green-700' :
                    upcomingWorkout.type === 'Endurance' ? 'bg-blue-100 text-blue-700' :
                    upcomingWorkout.type === 'Tempo' ? 'bg-yellow-100 text-yellow-700' :
                    upcomingWorkout.type === 'Threshold' ? 'bg-orange-100 text-orange-700' :
                    upcomingWorkout.type === 'VO2Max' ? 'bg-red-100 text-red-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {upcomingWorkout.type}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{upcomingWorkout.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {upcomingWorkout.duration} min
                  </span>
                  <span className="flex items-center gap-1 font-medium text-blue-600">
                    <CalendarIcon className="w-4 h-4" />
                    {new Date(upcomingWorkout.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </span>
                  {upcomingWorkout.estimatedTSS > 0 && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded font-semibold border ${getTSSBadgeColor(upcomingWorkout.estimatedTSS)}`}>
                      <TrendingUp className="w-4 h-4" />
                      {upcomingWorkout.estimatedTSS} TSS
                    </span>
                  )}
                  <span className="text-blue-600 font-medium">Click for details</span>
                </div>
              </div>
              
              {/* Action Button */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/plan');
                }}
                variant="default"
                className="flex-shrink-0"
              >
                View Plan
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={smartFTPContext?.confidence === 'high' ? 'border-green-200 dark:border-green-800' : smartFTPContext?.confidence === 'medium' ? 'border-yellow-200 dark:border-yellow-800' : smartFTPContext?.confidence === 'low' ? 'border-orange-200 dark:border-orange-800' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Current FTP
              {smartFTPContext?.confidence && (
                <span 
                  className={`px-2 py-0.5 text-xs rounded-full cursor-help ${
                    smartFTPContext.confidence === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    smartFTPContext.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    smartFTPContext.confidence === 'low' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}
                  title={smartFTPContext.confidenceExplanation || 'FTP confidence level'}
                >
                  {smartFTPContext.confidence}
                </span>
              )}
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.ftp ? `${metrics.ftp}W` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {smartFTPContext?.method === 'hard_efforts' && smartFTPContext?.effortsUsed && (
                `From ${smartFTPContext.effortsUsed} hard effort${smartFTPContext.effortsUsed > 1 ? 's' : ''} (${smartFTPContext.avgDuration}min avg)`
              )}
              {smartFTPContext?.method === 'maintained_by_ctl' && (
                `Maintained by training load`
              )}
              {smartFTPContext?.method === 'estimated_decline' && smartFTPContext?.estimatedDecline && (
                `Est. ${Math.round(smartFTPContext.estimatedDecline * 100)}% decline`
              )}
              {!smartFTPContext && 'Functional Threshold Power'}
            </p>
            {smartFTPContext?.recommendation && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                💡 {smartFTPContext.recommendation}
              </p>
            )}
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

      {/* AI Training Coach & Charts - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Training Coach Widget */}
        <AITrainingCoach
          key={aiCoachKey}
          onLogIllness={() => setShowLogIllness(true)}
          onViewAdjustments={async () => {
            // Load pending adjustment
            const sessionToken = localStorage.getItem('session_token');
            const response = await fetch('/api/adaptation/adjustments/pending', {
              headers: { 'Authorization': `Bearer ${sessionToken}` }
            });
            if (response.ok) {
              const data = await response.json();
              if (data.adjustments && data.adjustments.length > 0) {
                setPendingAdjustment(data.adjustments[0]);
              }
            }
          }}
        />

        {/* Weekly Volume Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Training Volume</CardTitle>
                <CardDescription>Weekly training hours</CardDescription>
              </div>
              <div className="flex gap-1">
                {[1, 2, 4, 6].map((weeks) => (
                  <Button
                    key={weeks}
                    onClick={() => setVolumePeriod(weeks)}
                    variant={volumePeriod === weeks ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2 py-1 h-7"
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getFilteredTrendsVolume()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [`${value} hours`, 'Training Time']}
                />
                <Line 
                  type="monotone" 
                  dataKey="time" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Hours"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Training Load (TSS) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Training Load (TSS)</CardTitle>
                <CardDescription>Weekly training stress score</CardDescription>
              </div>
              <div className="flex gap-1">
                {[1, 2, 4, 6].map((weeks) => (
                  <Button
                    key={weeks}
                    onClick={() => setTssPeriod(weeks)}
                    variant={tssPeriod === weeks ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs px-2 py-1 h-7"
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Low (&lt;200)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Moderate (200-400)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600">High (400-600)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Very High (&gt;600)</span>
              </div>
            </div>
            {getFilteredTrendsTSS().length === 0 || !getFilteredTrendsTSS().some(t => t.tss > 0) ? (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                <p>No TSS data available. Complete more activities to see training load trends.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getFilteredTrendsTSS()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name, props) => {
                    const tss = props.payload.tss || 0;
                    let loadLevel = 'Low';
                    if (tss >= 600) loadLevel = 'Very High';
                    else if (tss >= 400) loadLevel = 'High';
                    else if (tss >= 200) loadLevel = 'Moderate';
                    return [`${value} TSS (${loadLevel})`, 'Training Load'];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tss" 
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="TSS"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload || payload.tss === undefined) return null;
                    const color = getLoadLineColor(payload.tss);
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={color}
                        stroke="white"
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
            )}
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
            {activities.slice(0, 10).map((activity) => {
              const isRace = raceActivities[activity.id];
              return (
                <div
                  key={activity.id}
                  className={`flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all border-l-4 ${getLoadColor(activity.tss)} ${isRace ? 'bg-yellow-50 border-yellow-300' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={() => setSelectedActivity(activity)}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isRace ? 'bg-yellow-100' : 'bg-blue-50'}`}>
                      {isRace ? (
                        <Trophy className="w-5 h-5 text-yellow-600" />
                      ) : (
                        getActivityIcon(activity)
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{activity.name}</h4>
                        {isRace && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                            RACE
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
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
      
      {/* Session Detail Modal */}
      {selectedSession && (
        <SessionHoverModal
          session={selectedSession}
          ftp={metrics?.ftp}
          onClose={() => setSelectedSession(null)}
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

      {/* Log Illness Modal */}
      {showLogIllness && (
        <LogIllnessModal
          onClose={() => setShowLogIllness(false)}
          onSave={() => {
            setShowLogIllness(false);
            // Force AI Training Coach to reload
            setAiCoachKey(prev => prev + 1);
            // Refresh dashboard data
            loadDashboardData(true);
          }}
        />
      )}

      {/* Plan Adjustment Notification */}
      {pendingAdjustment && (
        <PlanAdjustmentNotification
          adjustment={pendingAdjustment}
          onAccept={() => {
            setPendingAdjustment(null);
            // Refresh AI coach widget and reload data
            setAiCoachKey(prev => prev + 1);
            // Reload activities to reflect changes
            setTimeout(() => loadActivities(), 500);
          }}
          onReject={() => {
            setPendingAdjustment(null);
            // Refresh AI coach widget
            setAiCoachKey(prev => prev + 1);
          }}
          onClose={() => setPendingAdjustment(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
