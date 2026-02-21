import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Clock, Mountain, Zap, Calendar as CalendarIcon, ArrowRight, Home, RefreshCw, LogOut, Bell, Trophy, Edit2, AlertTriangle, X, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDuration, formatDistance } from '../lib/utils';
import { fetchManualActivities, mergeActivities, isManualActivity } from '../lib/manualActivityUtils';
import { mergeMultiSourceActivities, checkIntervalsConnection, fetchIntervalsActivities, fetchStravaActivities, generateSyncRunId } from '../lib/activityMerger';
import { syncProviderActivities, fetchUnifiedActivities, getIncrementalDateRange, getStravaAfterTimestamp, setLastSyncTime } from '../lib/activitySync';
import ActivityDetailModal from '../components/ActivityDetailModal';
import ActivityCard from '../components/ActivityCard';
import DataSourceWelcomeModal from '../components/DataSourceWelcomeModal';
import SessionHoverModal from '../components/SessionHoverModal';
import EditActivityModal from '../components/EditActivityModal';
import AITrainingCoach from '../components/AITrainingCoach';
import LogIllnessModal from '../components/LogIllnessModal';
import PlanAdjustmentNotification from '../components/PlanAdjustmentNotification';
import WeatherWidget from '../components/WeatherWidget';
import NotificationPrompt from '../components/NotificationPrompt';
import { useNavigate } from 'react-router-dom';
import { workoutReminderManager } from '../lib/workoutReminderManager';
import { MetricTooltip } from '../components/MetricTooltip';

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
  const [userProfile, setUserProfile] = useState(() => {
    // Load user profile from localStorage
    const currentUser = localStorage.getItem('current_user');
    return currentUser ? JSON.parse(currentUser) : null;
  });
  const [pendingAdjustment, setPendingAdjustment] = useState(null);
  const [aiCoachKey, setAiCoachKey] = useState(0);
  const [editingActivity, setEditingActivity] = useState(null);
  const [error, setError] = useState(null);
  const [providerErrors, setProviderErrors] = useState({}); // { strava: {code, message}, intervals: {code, message} }
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    // Check if we're returning from onboarding OAuth
    const onboardingInProgress = localStorage.getItem('onboarding_in_progress');
    if (onboardingInProgress === 'true') {
      console.log('🔄 Onboarding in progress - showing modal');
      return true;
    }
    // Show welcome modal for users WITHOUT Strava (only once)
    const hasSeenWelcome = localStorage.getItem('has_seen_welcome_modal');
    const hasStrava = stravaTokens && stravaTokens.access_token;
    console.log('🎯 Onboarding check:', { hasSeenWelcome, hasStrava, stravaTokens });
    return !hasSeenWelcome && !hasStrava;
  });
  const [showAlphaWarning, setShowAlphaWarning] = useState(() => {
    // Show alpha warning unless dismissed
    return !sessionStorage.getItem('alpha_warning_dismissed');
  });

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


  // Check notification and onboarding modal on mount and when stravaTokens changes
  useEffect(() => {
    // Check if returning from Strava OAuth during onboarding
    const onboardingInProgress = localStorage.getItem('onboarding_in_progress');
    const savedStep = localStorage.getItem('onboarding_step');

    console.log('📊 Dashboard effect:', {
      hasStrava: !!stravaTokens?.access_token,
      onboardingInProgress,
      savedStep,
      currentModalState: showWelcomeModal
    });

    if (stravaTokens && stravaTokens.access_token) {
      setCurrentTokens(stravaTokens);
      loadDashboardData(false);
      setShowStravaNotification(false);

      // If onboarding was in progress, reopen modal to continue
      if (onboardingInProgress === 'true') {
        console.log('🔄 Reopening onboarding modal after Strava connection (step:', savedStep, ')');
        setShowWelcomeModal(true);
      } else if (!showWelcomeModal) {
        // Only hide welcome modal if it's not already showing and not onboarding
        const hasSeenWelcome = localStorage.getItem('has_seen_welcome_modal');
        if (hasSeenWelcome) {
          console.log('✅ User has seen welcome, keeping modal closed');
          setShowWelcomeModal(false);
        }
      }
    } else {
      // No Strava - but still try to load data (might have Intervals.icu or manual activities)
      console.log('ℹ️ [Dashboard] No Strava tokens, checking for other sources...');
      loadDashboardData(false);
      
      // Show notification if no Strava tokens and hasn't been dismissed
      const dismissed = sessionStorage.getItem('strava_notification_dismissed');
      if (!dismissed) {
        setShowStravaNotification(true);
      }
      // Show onboarding modal if user hasn't seen it
      const hasSeenWelcome = localStorage.getItem('has_seen_welcome_modal');
      console.log('🔍 Modal check:', { hasSeenWelcome, willShow: !hasSeenWelcome });
      if (!hasSeenWelcome) {
        console.log('👋 Showing onboarding modal - setting state to true');
        setShowWelcomeModal(true);
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
      // Clear cache when force refreshing to ensure fresh data
      console.log('🗑️ [Dashboard] Force refresh - clearing cache');
      localStorage.removeItem('cached_activities_recent');
      localStorage.removeItem('cached_metrics');
      localStorage.removeItem('cached_trends');
      localStorage.removeItem('cache_timestamp_recent');
      localStorage.removeItem('smart_ftp_context');
    } else {
      setLoading(true);
    }
    setError(null);

    // CHECK FOR DEMO USER - Skip Strava and use mock data
    if (userProfile?.is_demo) {
      console.log('🎨 [Dashboard] Demo user detected - loading mock data');
      try {
        const userId = userProfile.id;

        // Fetch mock activities from demo endpoint
        const activitiesResponse = await fetch(`/api/strava/activities?user_id=${userId}`);

        if (!activitiesResponse.ok) {
          throw new Error('Failed to fetch demo activities');
        }

        const activitiesData = await activitiesResponse.json();
        console.log('✅ [Dashboard] Fetched', activitiesData.length, 'demo activities');

        // For demo users, set activities directly (no DB sync needed)
        setActivities(activitiesData);
        setHasData(true);

        setLoading(false);
        setRefreshing(false);
        return;
      } catch (error) {
        console.error('Error loading demo data:', error);
        setError(error.message || 'Failed to load demo data');
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    // If not force refresh, try to load from DB quickly (no provider sync)
    if (!forceRefresh) {
      console.log('� [Dashboard] Checking database for existing activities...');
      const dbResult = await fetchUnifiedActivities({ windowDays: 90 });
      
      if (dbResult.ok && dbResult.data?.length > 0) {
        console.log(`� [Dashboard] Found ${dbResult.data.length} activities in database, using those`);
        await processActivitiesFromDB('quick-load');
        setLoading(false);
        return;
      }
      console.log('📭 [Dashboard] No activities in database, will sync from providers');
    }

    // Generate sync run ID for correlated logging
    const syncRunId = generateSyncRunId();
    console.log(`🔄 [${syncRunId}] Starting activity sync`);
    
    // Clear previous provider errors
    setProviderErrors({});

    try {
      // Check which sources are connected
      const hasStrava = currentTokens?.access_token;
      const hasIntervals = await checkIntervalsConnection();

      console.log(`[${syncRunId}] 🔍 Connection status:`, { hasStrava, hasIntervals });

      if (!hasStrava && !hasIntervals) {
        console.log(`[${syncRunId}] ⚠️ No activity sources connected`);
        setError('Please connect Strava or Intervals.icu to view activities');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      let stravaActivities = [];
      let intervalsActivities = [];
      const errors = {};

      // Fetch from Strava if connected (using structured result)
      if (hasStrava) {
        const stravaAfter = getStravaAfterTimestamp();
        const stravaResult = await fetchStravaActivities({
          tokens: currentTokens,
          refreshTokenFn: refreshAccessToken,
          perPage: 200,
          after: stravaAfter,
          syncRunId
        });
        
        if (stravaResult.ok) {
          stravaActivities = stravaResult.data;
          console.log(`[${syncRunId}] ✅ Strava: ${stravaActivities.length} activities`);
          
          // Update tokens if they were refreshed
          if (stravaResult.tokensRefreshed && stravaResult.newTokens) {
            setCurrentTokens(stravaResult.newTokens);
            localStorage.setItem('strava_tokens', JSON.stringify(stravaResult.newTokens));
          }
        } else {
          console.error(`[${syncRunId}] ❌ Strava failed:`, stravaResult.error);
          errors.strava = stravaResult.error;
        }
      }

      // Fetch from Intervals.icu if connected (using structured result)
      if (hasIntervals) {
        // Incremental: only fetch since last sync (with 7-day overlap for safety)
        // First sync: full 365-day window
        const { oldest, newest, isIncremental } = getIncrementalDateRange('intervals', 365);
        console.log(`[${syncRunId}] 📅 Intervals range: ${oldest} → ${newest} (${isIncremental ? 'incremental' : 'full'})`);
        
        const intervalsResult = await fetchIntervalsActivities({ 
          oldest, 
          newest, 
          syncRunId 
        });
        
        if (intervalsResult.ok) {
          intervalsActivities = intervalsResult.data;
          console.log(`[${syncRunId}] ✅ Intervals: ${intervalsActivities.length} activities`);
        } else {
          console.error(`[${syncRunId}] ❌ Intervals failed:`, intervalsResult.error);
          errors.intervals = intervalsResult.error;
        }
      }

      // Update provider errors state (for UI display)
      if (Object.keys(errors).length > 0) {
        setProviderErrors(errors);
      }

      // Log sync summary
      console.log(`[${syncRunId}] 📊 Sync summary:`, {
        strava: stravaActivities.length,
        intervals: intervalsActivities.length,
        errors: Object.keys(errors)
      });

      // Import activities to unified database (two-table model)
      // Wait for imports to complete before reading back
      const importPromises = [];
      
      if (stravaActivities.length > 0) {
        importPromises.push(
          syncProviderActivities('strava', stravaActivities)
            .then(result => {
              if (result.ok) {
                console.log(`[${syncRunId}] 💾 Strava import: ${result.data.created} new, ${result.data.updated} updated`);
              } else {
                console.warn(`[${syncRunId}] ⚠️ Strava import failed:`, result.error);
              }
              return result;
            })
            .catch(err => {
              console.error(`[${syncRunId}] Strava import error:`, err);
              return { ok: false, error: err };
            })
        );
      }
      
      if (intervalsActivities.length > 0) {
        importPromises.push(
          (async () => {
            // Use staged sync with enrichment for Intervals
            const { syncIntervalsWithEnrichment } = await import('../lib/activitySync');
            const result = await syncIntervalsWithEnrichment(intervalsActivities, { 
              enrichLimit: 50,  // Cap at 50 per sync to avoid long waits
              skipEnrichment: false 
            });
            
            if (result.ok) {
              const stageA = result.data.stageA || {};
              const stageB = result.data.stageB;
              console.log(`[${syncRunId}] 💾 Intervals import: ${stageA.created || 0} new, ${stageA.updated || 0} updated`);
              
              if (stageB?.stats) {
                console.log(`[${syncRunId}] 🔄 Intervals enrichment: ${stageB.stats.enriched} enriched, ${stageB.stats.remaining} remaining`);
                if (stageB.stats.remaining > 0) {
                  console.log(`[${syncRunId}] ℹ️ ${stageB.stats.remaining} activities will be enriched on next sync`);
                }
              }
            } else {
              console.warn(`[${syncRunId}] ⚠️ Intervals import failed:`, result.error);
            }
            return result;
          })()
            .catch(err => {
              console.error(`[${syncRunId}] Intervals import error:`, err);
              return { ok: false, error: err };
            })
        );
      }

      // Wait for all imports to complete
      if (importPromises.length > 0) {
        await Promise.all(importPromises);
        console.log(`[${syncRunId}] ✅ All imports complete`);
        
        // Save sync timestamps so next refresh is incremental
        if (stravaActivities.length > 0) setLastSyncTime('strava');
        if (intervalsActivities.length > 0) setLastSyncTime('intervals');
      }

      // If both sources failed AND we have no data in DB, show error
      if (stravaActivities.length === 0 && intervalsActivities.length === 0) {
        // Check if we have any data in DB to fall back to
        const dbResult = await fetchUnifiedActivities({ windowDays: 90 });
        if (!dbResult.ok || dbResult.data?.length === 0) {
          const errorMessages = Object.entries(errors)
            .map(([provider, err]) => `${provider}: ${err.message}`)
            .join('; ');
          throw new Error(errorMessages || 'Failed to fetch activities from any source');
        } else {
          console.log(`[${syncRunId}] ⚠️ Using existing DB data due to sync failures`);
        }
      }

      // Read back from unified database (single source of truth)
      await processActivitiesFromDB(syncRunId);
    } catch (error) {
      console.error(`[${syncRunId}] Error loading dashboard data:`, error);
      setError(error.message || 'Failed to load dashboard data');
      // Keep hasData true if we had cached data before the error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Ensure weekly rollups exist (first-run / backfill).
   * Calls POST /api/analytics/ensure-weekly with a 10-minute cooldown.
   */
  const ensureWeeklyRollups = async (userId) => {
    const COOLDOWN_KEY = 'rl_lastEnsureWeeklyAt';
    const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

    const lastRun = localStorage.getItem(COOLDOWN_KEY);
    if (lastRun && (Date.now() - parseInt(lastRun, 10)) < COOLDOWN_MS) {
      console.log('[Dashboard] ensure-weekly: cooldown active, skipping');
      return null;
    }

    try {
      const resp = await fetch('/api/analytics/ensure-weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, weeksBack: 16 })
      });

      // Safe parse — handle non-JSON responses
      const contentType = resp.headers.get('content-type') || '';
      if (!resp.ok || !contentType.includes('application/json')) {
        console.warn('[Dashboard] ensure-weekly: non-ok or non-JSON response', resp.status);
        return null;
      }

      const data = await resp.json();
      localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
      console.log('[Dashboard] ensure-weekly result:', data);
      return data;
    } catch (err) {
      console.warn('[Dashboard] ensure-weekly failed (non-fatal):', err.message);
      return null;
    }
  };

  /**
   * Process activities from the unified database (single source of truth)
   * This is the new flow: fetch from DB after imports complete
   */
  const processActivitiesFromDB = async (syncRunId) => {
    console.log(`[${syncRunId}] 📥 Reading from unified database...`);
    
    // Fetch from unified database
    const dbResult = await fetchUnifiedActivities({ windowDays: 90 });
    
    if (!dbResult.ok) {
      throw new Error(dbResult.error?.message || 'Failed to fetch activities from database');
    }
    
    const allActivitiesData = dbResult.data || [];
    console.log(`[${syncRunId}] ✅ Loaded ${allActivitiesData.length} activities from database`);
    
    if (allActivitiesData.length === 0) {
      console.warn(`[${syncRunId}] ⚠️ No activities in database`);
      setActivities([]);
      setMetrics(null);
      setTrends([]);
      setHasData(false);
      return;
    }

    // Calculate FTP using canonical backend endpoint
    const ftpResponse = await fetch('/api/analytics/ftp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: allActivitiesData }),
    });

    if (!ftpResponse.ok) {
      throw new Error('Failed to calculate FTP');
    }

    const ftpResult = await ftpResponse.json();
    console.log(`[${syncRunId}] FTP result:`, ftpResult);
    setSmartFTPContext(ftpResult);

    const ftpData = { ftp: ftpResult.ftp };

    // Activities from DB already have TSS - only calculate if missing
    const activitiesWithTSS = allActivitiesData.map(activity => ({
      ...activity,
      tss: activity.tss || calculateTSS(activity, ftpData.ftp)
    }));

    // Sort activities by date, most recent first
    const sortedActivities = activitiesWithTSS.sort((a, b) =>
      new Date(b.start_time || b.date) - new Date(a.start_time || a.date)
    );

    setActivities(sortedActivities);

    // Calculate training load
    const loadResponse = await fetch('/api/analytics/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: allActivitiesData, ftp: ftpData.ftp }),
    });
    const loadData = await loadResponse.json();

    setMetrics({ ftp: ftpData.ftp, ...loadData });

    // Get trends
    const trendsResponse = await fetch('/api/analytics/trends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activities: allActivitiesData, weeks: 6, ftp: ftpData.ftp }),
    });
    const trendsData = await trendsResponse.json();
    console.log(`[${syncRunId}] Trends data received:`, trendsData);
    setTrends(trendsData);

    setHasData(true);
    console.log(`[${syncRunId}] ✅ Dashboard data loaded from unified database`);

    // Ensure weekly rollups exist — await once, retry weekly fetch if empty
    if (userProfile?.id) {
      try {
        const weeklyResp = await fetch(`/api/analytics/weekly?userId=${userProfile.id}&limit=12`);
        const weeklyContentType = weeklyResp.headers.get('content-type') || '';
        const weeklyEmpty =
          !weeklyResp.ok ||
          !weeklyContentType.includes('application/json') ||
          (await weeklyResp.clone().json().then(d => !d.data || d.data.length === 0).catch(() => true));

        if (weeklyEmpty) {
          console.log(`[${syncRunId}] Weekly rollups empty — calling ensure-weekly`);
          const ensureResult = await ensureWeeklyRollups(userProfile.id);
          if (ensureResult && ensureResult.computed > 0) {
            console.log(`[${syncRunId}] ensure-weekly computed ${ensureResult.computed} weeks, refetching weekly`);
            // Single retry — do NOT loop
            await fetch(`/api/analytics/weekly?userId=${userProfile.id}&limit=12`).catch(() => {});
          }
        }
      } catch (weeklyErr) {
        console.warn(`[${syncRunId}] Weekly ensure/fetch failed (non-fatal):`, weeklyErr.message);
      }
    }
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
      <>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            {!error && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
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

        {/* Data Source Welcome Modal - Show even during loading */}
        <DataSourceWelcomeModal
          isOpen={showWelcomeModal}
          onClose={() => {
            setShowWelcomeModal(false);
            localStorage.setItem('has_seen_welcome_modal', 'true');
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Notification Prompt */}
      <NotificationPrompt />

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

      {/* Provider Sync Error Banners */}
      {Object.keys(providerErrors).length > 0 && (
        <div className="space-y-2">
          {providerErrors.strava && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-orange-600 dark:text-orange-400">⚠️</div>
                <div>
                  <p className="text-orange-800 dark:text-orange-200 font-medium text-sm">Strava sync failed</p>
                  <p className="text-orange-600 dark:text-orange-400 text-xs">{providerErrors.strava.message}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {providerErrors.strava.code === 'REAUTH_REQUIRED' || providerErrors.strava.code === 'TOKEN_EXPIRED' ? (
                  <Button onClick={onLogout} variant="outline" size="sm" className="text-xs">
                    <LogOut className="w-3 h-3 mr-1" />
                    Reconnect
                  </Button>
                ) : (
                  <Button onClick={handleForceRefresh} variant="outline" size="sm" className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
          {providerErrors.intervals && (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-purple-600 dark:text-purple-400">⚠️</div>
                <div>
                  <p className="text-purple-800 dark:text-purple-200 font-medium text-sm">Intervals.icu sync failed</p>
                  <p className="text-purple-600 dark:text-purple-400 text-xs">{providerErrors.intervals.message}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {providerErrors.intervals.code === 'RECONNECT_REQUIRED' || providerErrors.intervals.code === 'TOKEN_EXPIRED' ? (
                  <Button onClick={() => navigate('/settings')} variant="outline" size="sm" className="text-xs">
                    Reconnect in Settings
                  </Button>
                ) : (
                  <Button onClick={handleForceRefresh} variant="outline" size="sm" className="text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4">
        {/* Title Section */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Your training overview and progress</p>
        </div>

        {/* Weather and Refresh - Stack on mobile, horizontal on desktop */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
          <WeatherWidget />
          <Button
            onClick={handleForceRefresh}
            disabled={refreshing}
            variant="outline"
            className="flex items-center justify-center gap-2 text-sm min-h-[44px] w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </Button>
        </div>
      </div>

      {/* Alpha Testing Warning & Today's Workout */}
      <div className={`grid grid-cols-1 ${showAlphaWarning && upcomingWorkout ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6 ${!showAlphaWarning && upcomingWorkout ? 'max-w-2xl' : 'max-w-7xl'} mx-auto`}>
        {/* Alpha Testing Warning Card */}
        {showAlphaWarning && (
          <Card className="border-2 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 relative">
            <button
              onClick={() => {
                setShowAlphaWarning(false);
                sessionStorage.setItem('alpha_warning_dismissed', 'true');
              }}
              className="absolute top-3 right-3 p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded transition-colors"
              aria-label="Dismiss warning"
            >
              <X className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </button>
            <CardContent className="pt-4 sm:pt-6 pr-10">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                    Alpha Testing Phase
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                    You're using an early version of RiderLabs. Some features may be incomplete or change without notice.
                    We appreciate your feedback as we build and improve the platform.
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    Found a bug or have suggestions? Let us know through Settings → About.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Workout Card */}
        {upcomingWorkout && (
          <Card
            className="border-2 border-[var(--color-primary)] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-lg cursor-pointer hover:shadow-xl hover:border-[var(--color-primary-hover)] transition-all"
            onClick={() => setSelectedSession(upcomingWorkout)}
          >
            <CardHeader className="pb-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white">
              <CardTitle className="text-lg sm:text-xl">Today's Workout</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                {/* Notification Icon */}
                <div className="flex-shrink-0 hidden sm:block">
                  <div className="relative">
                    <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </div>
                </div>

                {/* Workout Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{upcomingWorkout.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${upcomingWorkout.type === 'Recovery' ? 'bg-green-100 text-green-700' :
                      upcomingWorkout.type === 'Endurance' ? 'bg-[var(--color-endurance)]/20 text-[var(--color-endurance)]' :
                        upcomingWorkout.type === 'Tempo' ? 'bg-yellow-100 text-yellow-700' :
                          upcomingWorkout.type === 'Threshold' ? 'bg-orange-100 text-orange-700' :
                            upcomingWorkout.type === 'VO2Max' ? 'bg-red-100 text-red-700' :
                              'bg-indigo-100 text-indigo-700'
                      }`}>
                      {upcomingWorkout.type}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">{upcomingWorkout.description}</p>
                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {upcomingWorkout.duration} min
                    </span>
                    <span className="flex items-center gap-1 font-medium text-[var(--color-primary)]">
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
                    <span className="hidden sm:inline text-[var(--color-primary)] font-medium">Click for details</span>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/plan');
                  }}
                  variant="default"
                  className="flex-shrink-0 w-full sm:w-auto text-sm sm:text-base mt-3 sm:mt-0"
                >
                  View Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className={smartFTPContext?.confidenceLevel === 'high' ? 'border-green-200 dark:border-green-800' : smartFTPContext?.confidenceLevel === 'medium' ? 'border-yellow-200 dark:border-yellow-800' : smartFTPContext?.confidenceLevel === 'low' ? 'border-orange-200 dark:border-orange-800' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-1 sm:gap-2">
              <span className="hidden sm:inline">Current FTP</span>
              <span className="sm:hidden">FTP</span>
              <MetricTooltip 
                type="ftp" 
                iconClassName="text-yellow-500" 
                windowDays={smartFTPContext?.windowDays}
                updatedAt={smartFTPContext?.updatedAt}
                confidence={smartFTPContext?.confidence}
                confidenceLevel={smartFTPContext?.confidenceLevel}
                reasonCodes={smartFTPContext?.reasonCodes}
              />
              {smartFTPContext?.confidenceLevel && (
                <span
                  className={`px-1.5 sm:px-2 py-0.5 text-xs rounded-full cursor-help ${smartFTPContext.confidenceLevel === 'high' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    smartFTPContext.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      smartFTPContext.confidenceLevel === 'low' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  title={`Confidence: ${smartFTPContext.confidence}%`}
                >
                  {smartFTPContext.confidenceLevel}
                </span>
              )}
            </CardTitle>
            <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">
              {metrics?.ftp ? (
                `${metrics.ftp}W`
              ) : activities.length > 0 ? (
                <span className="text-gray-500 dark:text-gray-400">~210-215W</span>
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {metrics?.ftp && smartFTPContext?.method === 'hard_efforts' && smartFTPContext?.effortsUsed && (
                `From ${smartFTPContext.effortsUsed} hard effort${smartFTPContext.effortsUsed > 1 ? 's' : ''} (${smartFTPContext.avgDuration}min avg)`
              )}
              {metrics?.ftp && smartFTPContext?.method === 'maintained_by_ctl' && (
                `Maintained by training load`
              )}
              {metrics?.ftp && smartFTPContext?.method === 'estimated_decline' && smartFTPContext?.estimatedDecline && (
                `Est. ${Math.round(smartFTPContext.estimatedDecline * 100)}% decline`
              )}
              {!metrics?.ftp && activities.length > 0 && (
                `Based on recent work — do a hard 20min effort for accurate FTP`
              )}
              {!metrics?.ftp && activities.length === 0 && 'Functional Threshold Power'}
            </p>
            {smartFTPContext?.recommendation && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                💡 {smartFTPContext.recommendation}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium"><span className="hidden sm:inline">Weekly Load</span><span className="sm:hidden">Load</span></CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[var(--color-primary)]" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">
              {metrics?.currentWeek.tss || 0}<span className="hidden sm:inline"> TSS</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Training Stress Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium"><span className="hidden sm:inline">Weekly Time</span><span className="sm:hidden">Time</span></CardTitle>
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">
              {metrics?.currentWeek.time || 0}h
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {metrics?.currentWeek.activities || 0} activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium"><span className="hidden sm:inline">Weekly Distance</span><span className="sm:hidden">Distance</span></CardTitle>
            <Mountain className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold">
              {metrics?.currentWeek.distance || 0}<span className="hidden sm:inline"> km</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {metrics?.currentWeek.elevation || 0}m elevation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Training Coach & Charts - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                    className="text-xs px-2 sm:px-3 py-1 h-8 min-w-[44px]"
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {/* Coaching Context for Volume */}
            {getFilteredTrendsVolume().length >= 2 && (() => {
              const recentTrends = getFilteredTrendsVolume().slice(-2);
              const lastWeek = recentTrends[recentTrends.length - 1]?.time || 0;
              const previousWeek = recentTrends[recentTrends.length - 2]?.time || 0;
              const change = lastWeek - previousWeek;
              const percentChange = previousWeek > 0 ? Math.round((change / previousWeek) * 100) : 0;
              
              let contextMessage = '';
              if (lastWeek < 4) {
                contextMessage = 'Light week — recovery or life got busy. No worries.';
              } else if (lastWeek > 12) {
                contextMessage = 'Big volume week — make sure recovery is dialed in.';
              } else if (Math.abs(percentChange) < 10) {
                contextMessage = 'Volume steady — consistency is the foundation.';
              } else if (change > 2) {
                contextMessage = 'Volume jumped — watch for cumulative fatigue.';
              } else if (change < -2) {
                contextMessage = 'Volume dropped — good timing for adaptation.';
              } else {
                contextMessage = `${lastWeek}h this week — solid training rhythm.`;
              }
              
              return (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                    {contextMessage}
                  </p>
                </div>
              );
            })()}
            
            <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
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
                    className="text-xs px-2 sm:px-3 py-1 h-8 min-w-[44px]"
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {/* Coaching Context */}
            {getFilteredTrendsTSS().length >= 2 && (() => {
              const recentTrends = getFilteredTrendsTSS().slice(-2);
              const lastWeek = recentTrends[recentTrends.length - 1]?.tss || 0;
              const previousWeek = recentTrends[recentTrends.length - 2]?.tss || 0;
              const change = lastWeek - previousWeek;
              const percentChange = previousWeek > 0 ? Math.round((change / previousWeek) * 100) : 0;
              
              let contextMessage = '';
              if (Math.abs(percentChange) < 10) {
                contextMessage = 'Load holding steady — consistent week-to-week stress.';
              } else if (change < -100) {
                contextMessage = 'Load dipped last week — planned recovery, not a concern.';
              } else if (change > 100) {
                contextMessage = 'Load jumped this week — watch for fatigue signals.';
              } else if (change < 0) {
                contextMessage = 'Slight reduction — good timing for adaptation.';
              } else {
                contextMessage = 'Building load gradually — sustainable progression.';
              }
              
              return (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                    {contextMessage}
                  </p>
                </div>
              );
            })()}
            
            <div className="mb-3 flex items-center gap-2 sm:gap-3 md:gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600 dark:text-gray-400 text-xs">Low (&lt;200)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Moderate (200-400)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-gray-600 dark:text-gray-400">High (400-600)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600 dark:text-gray-400">Very High (&gt;600)</span>
              </div>
            </div>
            {getFilteredTrendsTSS().length === 0 || !getFilteredTrendsTSS().some(t => t.tss > 0) ? (
              <div className="flex items-center justify-center h-[200px] sm:h-[250px] text-gray-500 text-xs sm:text-sm text-center px-4">
                <p>No TSS data available. Complete more activities to see training load trends.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
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
                      const { cx, cy, payload, index } = props;
                      if (!payload || payload.tss === undefined) return null;
                      const color = getLoadLineColor(payload.tss);
                      return (
                        <circle
                          key={`tss-dot-${index}`}
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
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Recent Activities</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your last 10 workouts</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate('/activities')}
              className="flex items-center gap-2 text-sm min-h-[44px]"
            >
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="space-y-3 sm:space-y-4">
            {activities.slice(0, 20).map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isRace={raceActivities[activity.id]}
                onClick={() => setSelectedActivity(activity)}
                onTagRace={(activity) => setEditingActivity(activity)}
                onAICoach={(activity) => setSelectedActivity({ ...activity, showAICoach: true })}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          showAICoach={selectedActivity.showAICoach}
          onClose={() => setSelectedActivity(null)}
          onActivityUpdated={() => {
            setSelectedActivity(null);
            loadDashboardData(true);
          }}
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
            setTimeout(() => loadDashboardData(true), 500);
          }}
          onReject={() => {
            setPendingAdjustment(null);
            // Refresh AI coach widget
            setAiCoachKey(prev => prev + 1);
          }}
          onClose={() => setPendingAdjustment(null)}
        />
      )}

      {/* Data Source Welcome Modal */}
      <DataSourceWelcomeModal
        isOpen={showWelcomeModal}
        onClose={() => {
          setShowWelcomeModal(false);
          localStorage.setItem('has_seen_welcome_modal', 'true');
        }}
      />
    </div>
  );
};

export default Dashboard;
