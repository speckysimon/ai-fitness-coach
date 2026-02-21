import React, { useState, useEffect } from 'react';
import SyncProgressPanel from '../components/SyncProgressPanel';
import { Activity, Filter, Search, Calendar, TrendingUp, Trophy, Plus, Trash2, RefreshCw, Edit2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ActivityDetailModal from '../components/ActivityDetailModal';
import ActivityCard from '../components/ActivityCard';
import EditActivityModal from '../components/EditActivityModal';
import ManualActivityModal from '../components/ManualActivityModal';
import FitUploadModal from '../components/FitUploadModal';
import { fetchManualActivities, mergeActivities, isManualActivity } from '../lib/manualActivityUtils';
import { mergeMultiSourceActivities, checkIntervalsConnection, fetchIntervalsActivities } from '../lib/activityMerger';
import { fetchUnifiedActivities, getIncrementalDateRange, getStravaAfterTimestamp, setLastSyncTime } from '../lib/activitySync';
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
  const [showFitUploadModal, setShowFitUploadModal] = useState(false);
  const [manualActivities, setManualActivities] = useState([]);
  const [intervalsConnected, setIntervalsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');  // Detailed sync progress message
  const [includeShells, setIncludeShells] = useState(false);  // Shell visibility toggle
  const [shellCount, setShellCount] = useState(0);  // Count of shell activities
  const [fullSyncResult, setFullSyncResult] = useState(null);  // Summary from last full sync
  const [syncPanelStatus, setSyncPanelStatus] = useState('idle'); // 'idle'|'running'|'complete'|'error'|'cooldown'

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

  // Check Intervals.icu connection status on mount
  useEffect(() => {
    const checkConnections = async () => {
      const hasIntervals = await checkIntervalsConnection();
      setIntervalsConnected(hasIntervals);
      
      const hasStrava = stravaTokens && stravaTokens.access_token;
      
      if (hasStrava || hasIntervals) {
        loadAllActivities();
      } else {
        setLoading(false);
      }
    };
    
    checkConnections();
  }, [stravaTokens]);

  useEffect(() => {
    if (stravaTokens && stravaTokens.access_token) {
      setCurrentTokens(stravaTokens);
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

  /**
   * Load activities.
   * @param {'none'|'incremental'|'full'} syncMode
   *   - 'none': DB only (initial page load when DB has data)
   *   - 'incremental': server-side incremental sync (Refresh button)
   *   - 'full': server-side full historical sync (Full Sync button)
   */
  const loadAllActivities = async (syncMode = 'none') => {
    setLoading(true);
    setFullSyncResult(null);
    try {
      // If no sync requested, try DB first — if empty, auto-upgrade to incremental
      if (syncMode === 'none') {
        console.log('📊 [All Activities] Checking database...');
        const quickResult = await fetchUnifiedActivities({ windowDays: 365 });
        if (quickResult.ok && quickResult.data?.length > 0) {
          console.log(`✅ [All Activities] Found ${quickResult.data.length} activities in DB`);
          await processActivitiesData(quickResult.data);
          return;
        }
        console.log('📭 [All Activities] DB empty — upgrading to incremental sync...');
        syncMode = 'incremental';
      }

      const isFullSync = syncMode === 'full';
      console.log(`🔄 [All Activities] ${isFullSync ? 'Full' : 'Incremental'} sync starting (server-side)...`);
      setSyncPanelStatus('running');
      setSyncStatus(isFullSync
        ? 'Full sync — fetching all historical activities from providers...'
        : 'Syncing recent activities...');

      // Call server-side sync endpoint
      const sessionToken = localStorage.getItem('session_token');
      const endpoint = isFullSync ? '/api/providers/full-sync' : '/api/providers/sync';

      const syncResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ providers: ['strava', 'intervals'] })
      });

      const syncResult = await syncResponse.json();

      if (syncResponse.status === 429 && syncResult.error === 'COOLDOWN') {
        setSyncPanelStatus('cooldown');
        setSyncStatus(`Full sync cooldown: ${syncResult.message}`);
        console.warn('[All Activities] Full sync cooldown:', syncResult.message);
        // Still load from DB below
      } else if (!syncResult.ok) {
        setSyncPanelStatus('error');
        console.error('[All Activities] Sync failed:', syncResult);
        setSyncStatus('Sync encountered errors — loading cached data...');
      } else {
        setSyncPanelStatus('complete');
        const t = syncResult.totals || {};
        console.log(`[All Activities] Sync complete:`, t);
        setSyncStatus(
          `Fetched ${t.fetched} activities, ${t.canonicals_created} new, ${t.canonicals_updated} updated`
        );

        setFullSyncResult(syncResult);

        // Update client-side sync timestamps for Dashboard compatibility
        setLastSyncTime('strava');
        setLastSyncTime('intervals');
      }

      // Reload from unified database
      setSyncStatus('Loading activities from database...');
      console.log('📊 [All Activities] Fetching from unified database...');
      const result = await fetchUnifiedActivities({ windowDays: 365, includeShells });

      if (!result.ok) {
        logger.error('[All Activities] Failed to fetch:', result.error);
        setActivities([]);
        setFilteredActivities([]);
        setLoading(false);
        return;
      }

      const dbActivities = result.data || [];
      console.log(`✅ [All Activities] Loaded ${dbActivities.length} activities from database`);

      const shells = result.meta?.shellCount || 0;
      setShellCount(shells);

      await processActivitiesData(dbActivities);
      setSyncStatus('');
    } catch (error) {
      setSyncPanelStatus('error');
      logger.error('[All Activities] Error:', error);
      setActivities([]);
      setFilteredActivities([]);
      setLoading(false);
      setSyncStatus('');
    }
  };

  const processActivitiesData = async (data) => {
    try {
      // Data from unified DB already includes all sources (Strava, Intervals, Manual)
      // and already has TSS calculated - no need to merge or recalculate
      
      // Calculate FTP for display purposes (non-blocking)
      try {
        const ftpResponse = await fetch('/api/analytics/ftp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: data }),
        });

        if (ftpResponse.ok) {
          const ftpData = await ftpResponse.json();
          setFtp(ftpData.ftp);
        }
      } catch (ftpError) {
        // Continue without FTP
      }

      // Activities from DB already have TSS - only calculate if missing
      const activitiesWithTSS = data.map(activity => ({
        ...activity,
        tss: activity.tss || calculateTSS(activity, ftp)
      }));

      // Sort by date, most recent first
      const sortedData = activitiesWithTSS.sort((a, b) => {
        const dateA = new Date(a.start_time || a.date);
        const dateB = new Date(b.start_time || b.date);
        return dateB - dateA;
      });

      // Track manual activities for UI (filter by source)
      const manual = sortedData.filter(a => a.source === 'manual' || a.primary_source === 'manual');
      setManualActivities(manual);

      setActivities(sortedData);
      setFilteredActivities(sortedData);
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

  // Show connect buttons if neither Strava nor Intervals.icu is connected
  const hasStrava = stravaTokens && stravaTokens.access_token;
  const hasIntervals = intervalsConnected;

  if (!hasStrava && !hasIntervals) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <Activity className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Connect an Activity Source
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect Strava or Intervals.icu to view your activities here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.location.href = '/settings'}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Connect Strava
            </Button>
            <Button 
              onClick={() => window.location.href = '/settings'}
              variant="outline"
              className="border-purple-500 text-purple-600 hover:bg-purple-50"
            >
              Connect Intervals.icu
            </Button>
          </div>
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
            {/* Search Bar - Full width on mobile */}
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                />
              </div>
            </div>

            {/* Filter and Sort - Stack on mobile, side by side on tablet+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Type Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  {getActivityTypes().map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="date">Date (Newest)</option>
                  <option value="distance">Distance</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>

            {/* Action Buttons - Stack on mobile, wrap on desktop */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowRacesOnly(!showRacesOnly)}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all min-h-[44px] ${showRacesOnly
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

              {/* Refresh Activities Button (incremental — fast) */}
              <button
                onClick={() => loadAllActivities('incremental')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                title="Fetch recent activities since last sync"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              {/* Full Sync Button (re-pull everything — slow) */}
              <button
                onClick={() => loadAllActivities('full')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                title="Full historical sync — paginates all Strava + Intervals history (server-side)"
              >
                <Download className="w-5 h-5" />
                <span>Full Sync</span>
              </button>

              {/* Upload FIT File Button */}
              <button
                onClick={() => setShowFitUploadModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all font-medium min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Upload .fit File</span>
              </button>

              {/* Add Manual Activity Button */}
              <button
                onClick={() => setShowManualActivityModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 bg-gradient-to-r from-indigo-600 to-pink-600 text-white border-indigo-700 hover:from-indigo-700 hover:to-pink-700 transition-all font-medium min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Add Manual Activity</span>
              </button>
            </div>

            {/* Results count */}
            {showRacesOnly && (
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                Showing {filteredActivities.length} race{filteredActivities.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sync Progress Panel */}
      <SyncProgressPanel
        syncStatus={syncPanelStatus}
        syncResult={fullSyncResult}
        onFullSync={() => loadAllActivities('full')}
        onRefresh={() => loadAllActivities('incremental')}
        isLoading={loading}
      />

      {/* Sync Report Panel (detailed verification — kept for debug) */}
      {fullSyncResult && !loading && (() => {
        const v = fullSyncResult.verification || {};
        const t = fullSyncResult.totals || {};
        const sq = v.shell_quarantine || {};
        const ig = v.incremental_guardrails;
        const rc = v.reconciliation || {};
        const wi = v.weekly_integrity || {};
        const overallPass = v.verification_pass !== false;
        const borderColor = overallPass
          ? 'border-green-200 dark:border-green-800'
          : 'border-red-200 dark:border-red-800';
        const bgColor = overallPass
          ? 'bg-green-50 dark:bg-green-900/20'
          : 'bg-red-50 dark:bg-red-900/20';

        return (
          <div className={`${bgColor} border ${borderColor} rounded-xl p-4 space-y-3`}>
            {/* Header */}
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Sync Report — {fullSyncResult.mode === 'full' ? 'Full' : 'Incremental'} ({Math.round((fullSyncResult.durationMs || 0) / 1000)}s)
              </p>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold ${overallPass ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200'}`}>
                {overallPass ? 'PASS' : 'FAIL'}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(fullSyncResult, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sync-report-${new Date().toISOString().slice(0,19)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => setFullSyncResult(null)}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Provider Totals */}
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Provider Totals</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">Fetched:</span> {t.fetched || 0}</div>
                <div><span className="font-medium">Sources upserted:</span> {t.sources_upserted || 0}</div>
                <div><span className="font-medium">Canonicals new:</span> {t.canonicals_created || 0}</div>
                <div><span className="font-medium">Canonicals updated:</span> {t.canonicals_updated || 0}</div>
              </div>
              {fullSyncResult.providers && (
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  {fullSyncResult.providers.strava && (
                    <span>Strava: {fullSyncResult.providers.strava.fetched || 0} ({fullSyncResult.providers.strava.pages || 0} pg){fullSyncResult.providers.strava.error ? ` — ${fullSyncResult.providers.strava.error}` : ''}</span>
                  )}
                  {fullSyncResult.providers.intervals && (
                    <span>Intervals: {fullSyncResult.providers.intervals.fetched || 0}{fullSyncResult.providers.intervals.error ? ` — ${fullSyncResult.providers.intervals.error}` : ''}</span>
                  )}
                </div>
              )}
            </div>

            {/* Sources & Canonicals Breakdown */}
            {v.sources_by_provider && (
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sources by Provider</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {Object.entries(v.sources_by_provider).map(([k, n]) => (
                    <span key={k}><span className="font-medium">{k}:</span> {n}</span>
                  ))}
                  <span className="font-medium">Canonicals total: {v.canonicals_total || 0}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Physiology:</span>
                  {Object.entries(v.canonicals_by_physiology_source || {}).map(([k, n]) => (
                    <span key={k}>{k}: {n}</span>
                  ))}
                  <span className="ml-2 font-medium">Metadata:</span>
                  {Object.entries(v.canonicals_by_metadata_source || {}).map(([k, n]) => (
                    <span key={k}>{k}: {n}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Shell Quarantine */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Shell Quarantine:</span>
              <span className={sq.shell_canonicals_count === 0 ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                {sq.shell_canonicals_count === 0 ? '0 shell canonicals' : `${sq.shell_canonicals_count} SHELL CANONICALS`}
              </span>
              <span className="text-gray-500 dark:text-gray-400">({sq.shell_sources_count || 0} shell sources)</span>
              {sq.verification_pass === false && sq.offenders && (
                <span className="text-red-500 text-xs ml-1">Top offenders: {sq.offenders.slice(0, 3).map(o => o.id).join(', ')}</span>
              )}
            </div>

            {/* Incremental Guardrails (only for incremental) */}
            {ig && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">Incremental Window:</span>
                {ig.strava_fetch_window?.after_date ? (
                  <span className="text-gray-600 dark:text-gray-400">
                    since {ig.strava_fetch_window.after_date.slice(0, 10)} ({ig.strava_fetch_window.days_covered}d)
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">{ig.is_first_sync ? 'first sync (no window)' : 'all history'}</span>
                )}
                <span className="text-gray-600 dark:text-gray-400">{ig.pages_fetched} pg, {ig.activities_fetched} fetched</span>
                {ig.incremental_suspect && (
                  <span className="text-orange-600 dark:text-orange-400 font-bold">SUSPECT: &gt;1000 fetched</span>
                )}
              </div>
            )}

            {/* Reconciliation */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Reconciliation:</span>
              <span className="text-gray-600 dark:text-gray-400">{rc.canonicals_created || 0} created, {rc.canonicals_updated || 0} updated, {rc.sources_upserted || 0} sources</span>
              <span className={rc.merge_collisions_detected > 0 ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-gray-500 dark:text-gray-400'}>
                {rc.merge_collisions_detected || 0} collisions
              </span>
            </div>

            {/* Weekly Integrity */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300">Weekly Integrity:</span>
              <span className={wi.verification_pass !== false ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400 font-bold'}>
                {wi.verification_pass !== false ? 'PASS' : 'FAIL'}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {wi.weeks_count_last_12w || 0} weeks (12w), null={wi.null_duration_weeks || 0}, neg={wi.negative_metric_weeks || 0}
              </span>
              {fullSyncResult.weekly_recomputed && (
                <span className="text-gray-500 dark:text-gray-400">| {fullSyncResult.weekly_weeks || 0} recomputed</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Shell Activity Debug Banner (Admin/Dev Only) */}
      {(process.env.NODE_ENV !== 'production') && !loading && shellCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-medium">Shell activities {includeShells ? 'shown' : 'hidden'}</span>
              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                (last 365d: {shellCount})
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setIncludeShells(!includeShells);
              loadAllActivities();
            }}
            className="px-3 py-1 text-xs font-medium rounded-md bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-700 transition-colors"
          >
            {includeShells ? 'Hide shells' : 'Show shells'}
          </button>
        </div>
      )}

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
              
              // Manual activities need special handling for edit/delete
              if (isManualActivity(activity)) {
                return (
                  <div key={activity.id} className="relative">
                    <ActivityCard
                      activity={activity}
                      isRace={isRace}
                      onClick={() => setSelectedActivity({
                        ...activity,
                        isRace: isRace?.isRace,
                        raceType: isRace?.raceType
                      })}
                      showActions={false}
                    />
                    {/* Manual activity actions overlay */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingManualActivity(activity);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
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
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                        title="Delete manual activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              }
              
              // Regular activities use standard ActivityCard
              return (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isRace={isRace}
                  onClick={() => setSelectedActivity({
                    ...activity,
                    isRace: isRace?.isRace,
                    raceType: isRace?.raceType
                  })}
                  onTagRace={(activity) => setEditingActivity(activity)}
                  onDelete={async (activity) => {
                    if (!window.confirm(`Delete "${activity.name || 'this activity'}"? This cannot be undone.`)) return;
                    try {
                      const sessionToken = localStorage.getItem('session_token');
                      const resp = await fetch(`/api/activities/${activity.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${sessionToken}` }
                      });
                      if (resp.ok) {
                        loadAllActivities();
                      } else {
                        const data = await resp.json();
                        alert(data.error?.message || 'Failed to delete');
                      }
                    } catch (err) {
                      logger.error('Delete activity error:', err);
                    }
                  }}
                />
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
          onActivityUpdated={() => {
            setSelectedActivity(null);
            loadAllActivities();
          }}
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

      {/* FIT Upload Modal */}
      <FitUploadModal
        isOpen={showFitUploadModal}
        onClose={() => setShowFitUploadModal(false)}
        onSuccess={() => {
          loadAllActivities();
          setShowFitUploadModal(false);
        }}
      />
    </div>
  );
};

export default AllActivities;
