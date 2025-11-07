import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Calendar, Info, Heart, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, startOfYear, differenceInWeeks } from 'date-fns';
import logger from '../lib/logger';
import { calculateEfficiencyMetrics } from '../lib/riderAnalytics';

const PerformanceMetrics = ({ stravaTokens }) => {
  const [ftpHistory, setFtpHistory] = useState([]);
  const [fthrHistory, setFthrHistory] = useState([]);
  const [currentFTP, setCurrentFTP] = useState(null);
  const [currentFTHR, setCurrentFTHR] = useState(null);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // weeks
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    ftp: false,
    fthr: false,
    aerobic: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    if (stravaTokens && stravaTokens.access_token) {
      loadFTPHistory();
    } else {
      setLoading(false);
    }
  }, [stravaTokens]); // Only reload when tokens change, not when timeRange changes

  const calculateWeeklyFTP = (activities, weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    // Filter activities for this week with power data
    const weekActivities = activities.filter(a => {
      if (!a.date) return false;
      const activityDate = new Date(a.date);
      const inInterval = isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      const hasPower = a.avgPower && a.avgPower > 0;
      const longEnough = a.duration >= 1200; // At least 20 min
      
      return inInterval && hasPower && longEnough;
    });

    if (weekActivities.length === 0) return null;

    // Find best effort for the week (20-60 min activities)
    const sortedByPower = [...weekActivities].sort((a, b) => 
      (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
    );

    // Look for activities between 20-60 minutes
    const bestEffort = sortedByPower.find(a => a.duration >= 1200 && a.duration <= 3600);
    
    if (bestEffort) {
      const power = bestEffort.normalizedPower || bestEffort.avgPower;
      const durationMin = bestEffort.duration / 60;
      
      // 20-30 min efforts: use 95% of power
      if (durationMin <= 30) {
        return Math.round(power * 0.95);
      } else {
        // 30-60 min efforts: use 100% of power
        return Math.round(power);
      }
    }

    // If no ideal effort found, use the longest effort available
    if (sortedByPower.length > 0) {
      const longestEffort = [...weekActivities].sort((a, b) => b.duration - a.duration)[0];
      if (longestEffort && longestEffort.duration >= 1200) {
        const power = longestEffort.normalizedPower || longestEffort.avgPower;
        const durationMin = longestEffort.duration / 60;
        
        // Adjust based on duration
        if (durationMin <= 20) {
          return Math.round(power * 0.90); // Very short, more conservative
        } else if (durationMin <= 30) {
          return Math.round(power * 0.95);
        } else if (durationMin <= 60) {
          return Math.round(power);
        } else {
          return Math.round(power * 1.0); // Longer efforts, assume it's close to FTP
        }
      }
    }

    return null;
  };

  const calculateWeeklyFTHR = (activities, weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    // Filter activities for this week with HR data
    const weekActivities = activities.filter(a => {
      if (!a.date) return false;
      const activityDate = new Date(a.date);
      const inInterval = isWithinInterval(activityDate, { start: weekStart, end: weekEnd });
      const hasHR = a.avgHeartRate && a.avgHeartRate > 0;
      const longEnough = a.duration >= 1200; // At least 20 min
      
      return inInterval && hasHR && longEnough;
    });

    if (weekActivities.length === 0) return null;

    // Find best effort for the week (20-60 min activities)
    const sortedByHR = [...weekActivities].sort((a, b) => 
      b.avgHeartRate - a.avgHeartRate
    );

    // Look for activities between 20-60 minutes
    const bestEffort = sortedByHR.find(a => a.duration >= 1200 && a.duration <= 3600);
    
    if (bestEffort) {
      const hr = bestEffort.avgHeartRate;
      const durationMin = bestEffort.duration / 60;
      
      // 20-30 min efforts: use 95% of HR
      if (durationMin <= 30) {
        return Math.round(hr * 0.95);
      } else {
        // 30-60 min efforts: use 100% of HR
        return Math.round(hr);
      }
    }

    // If no ideal effort found, use the longest effort available
    if (sortedByHR.length > 0) {
      const longestEffort = [...weekActivities].sort((a, b) => b.duration - a.duration)[0];
      if (longestEffort && longestEffort.duration >= 1200) {
        const hr = longestEffort.avgHeartRate;
        const durationMin = longestEffort.duration / 60;
        
        // Adjust based on duration
        if (durationMin <= 20) {
          return Math.round(hr * 0.90);
        } else if (durationMin <= 30) {
          return Math.round(hr * 0.95);
        } else if (durationMin <= 60) {
          return Math.round(hr);
        } else {
          return Math.round(hr * 1.0);
        }
      }
    }

    return null;
  };

  const refreshAccessToken = async () => {
    if (!stravaTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/strava/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stravaTokens.refresh_token }),
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
        ...stravaTokens,
        ...data.tokens,
      };

      // Update tokens in localStorage
      localStorage.setItem('strava_tokens', JSON.stringify(newTokens));

      return newTokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  };

  const loadFTPHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate weeks to fetch (either 24 weeks or from Jan 1st, whichever is more)
      const now = new Date();
      const yearStart = startOfYear(now);
      const weeksFromYearStart = differenceInWeeks(now, yearStart) + 1;
      const maxWeeks = Math.max(24, weeksFromYearStart);
      
      let activities = [];

      if (stravaTokens && stravaTokens.access_token) {
        let tokensToUse = stravaTokens;

        // Check if token is expired (expires_at is in seconds)
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (tokensToUse.expires_at && tokensToUse.expires_at < nowSeconds) {
          try {
            tokensToUse = await refreshAccessToken();
          } catch (refreshError) {
            if (refreshError.message === 'REAUTH_REQUIRED') {
              throw new Error('Your Strava session has expired. Please reconnect Strava in Settings.');
            }
            throw refreshError;
          }
        }

        // Fetch from Jan 1st or 24 weeks ago, whichever is earlier
        const fetchFrom = Math.min(
          Math.floor(yearStart.getTime() / 1000),
          Math.floor(Date.now() / 1000) - (24 * 7 * 24 * 60 * 60)
        );
        
        const userId = localStorage.getItem('current_user') ? JSON.parse(localStorage.getItem('current_user')).email : 'anonymous';
        const response = await fetch(
          `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${fetchFrom}&per_page=200&user_id=${encodeURIComponent(userId)}`
        );
        
        // Handle 401/403 by attempting token refresh
        if (response.status === 401 || response.status === 403) {
          try {
            tokensToUse = await refreshAccessToken();
            // Retry the request with new token
            const retryResponse = await fetch(
              `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${fetchFrom}&per_page=200`
            );
            
            if (!retryResponse.ok) {
              const errorData = await retryResponse.json().catch(() => ({}));
              throw new Error(errorData.details || errorData.error || 'Failed to fetch activities after token refresh');
            }
            
            const retryData = await retryResponse.json();
            if (retryData.error) {
              throw new Error(retryData.error);
            }
            activities = retryData;
          } catch (refreshError) {
            if (refreshError.message === 'REAUTH_REQUIRED') {
              throw new Error('Your Strava session has expired. Please reconnect Strava in Settings.');
            }
            throw new Error('Failed to refresh your Strava connection. Please try reconnecting in Settings.');
          }
        } else if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('FTP History API Error:', response.status, errorData);
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to fetch activities`);
        } else {
          const data = await response.json();
          
          // Check if response is an error object
          if (data.error) {
            throw new Error(data.error);
          }
          
          activities = data;
        }
        
        // Collect debug info
        const debug = {
          totalActivities: activities.length,
          withPower: 0,
          longEnough: 0,
          suitable: 0,
        };
        
        // Collect debug info for display
        if (activities.length > 0) {
          const withPower = activities.filter(a => a.avgPower && a.avgPower > 0);
          debug.withPower = withPower.length;
          
          const longEnough = activities.filter(a => a.duration >= 1200);
          debug.longEnough = longEnough.length;
          
          const suitable = activities.filter(a => a.avgPower && a.avgPower > 0 && a.duration >= 1200);
          debug.suitable = suitable.length;
        }
        
        setDebugInfo(debug);
      }

      // Calculate current FTP using the same backend service as Dashboard
      let currentFTPValue = null;
      if (activities.length > 0) {
        try {
          // Log activities with power data for debugging
          const powerActivities = activities.filter(a => a.avgPower && a.avgPower > 0 && a.duration >= 1200);
          const recentPowerActivities = powerActivities.filter(a => {
            const activityDate = new Date(a.date);
            const sixWeeksAgo = new Date();
            sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);
            return activityDate >= sixWeeksAgo;
          });
          logger.debug('FTP History - Total activities:', activities.length);
          logger.debug('FTP History - Power activities (>=20min):', powerActivities.length);
          logger.debug('FTP History - Recent power activities (last 6 weeks):', recentPowerActivities.length);
          if (recentPowerActivities.length > 0) {
            const best = recentPowerActivities.sort((a, b) => 
              (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
            )[0];
            logger.debug('FTP History - Best recent effort:', {
              date: best.date,
              power: best.normalizedPower || best.avgPower,
              duration: best.duration,
              durationMin: Math.round(best.duration / 60)
            });
          }
          
          const ftpResponse = await fetch('/api/analytics/ftp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activities }),
          });
          
          if (ftpResponse.ok) {
            const ftpData = await ftpResponse.json();
            currentFTPValue = ftpData.ftp;
          } else {
            logger.error('FTP History - Backend FTP request failed:', ftpResponse.status);
          }
        } catch (error) {
          logger.error('Error fetching FTP from backend:', error);
        }
      }

      // Calculate FTP for each week
      const history = [];

      for (let i = 0; i < maxWeeks; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const ftp = calculateWeeklyFTP(activities, weekStart);
        
        if (ftp) {
          history.unshift({
            week: format(weekStart, 'MMM d'),
            weekFull: format(weekStart, 'MMM d, yyyy'),
            ftp: ftp,
            date: weekStart.toISOString(),
          });
        }
      }
      
      // Fill in gaps with previous FTP value (carry forward)
      const filledHistory = [];
      let lastFTP = null;
      
      for (let i = 0; i < maxWeeks; i++) {
        const weekStart = startOfWeek(subWeeks(now, maxWeeks - 1 - i), { weekStartsOn: 1 });
        const existingWeek = history.find(h => h.date === weekStart.toISOString());
        
        if (existingWeek) {
          lastFTP = existingWeek.ftp;
          filledHistory.push(existingWeek);
        } else if (lastFTP) {
          filledHistory.push({
            week: format(weekStart, 'MMM d'),
            weekFull: format(weekStart, 'MMM d, yyyy'),
            ftp: lastFTP,
            date: weekStart.toISOString(),
            estimated: true,
          });
        }
      }

      setFtpHistory(filledHistory);
      // Use backend FTP value if available, otherwise fall back to history
      const fallbackFTP = filledHistory.length > 0 ? filledHistory[filledHistory.length - 1].ftp : null;
      const finalFTP = currentFTPValue !== null && currentFTPValue !== undefined ? currentFTPValue : fallbackFTP;
      setCurrentFTP(finalFTP);

      // Calculate FTHR for each week
      const fthrHist = [];
      let currentFTHRValue = null;

      for (let i = 0; i < maxWeeks; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const fthr = calculateWeeklyFTHR(activities, weekStart);
        
        if (fthr) {
          fthrHist.unshift({
            week: format(weekStart, 'MMM d'),
            weekFull: format(weekStart, 'MMM d, yyyy'),
            fthr: fthr,
            date: weekStart.toISOString(),
          });
        }
      }
      
      // Fill in gaps with previous FTHR value (carry forward)
      const filledFTHRHistory = [];
      let lastFTHR = null;
      
      for (let i = 0; i < maxWeeks; i++) {
        const weekStart = startOfWeek(subWeeks(now, maxWeeks - 1 - i), { weekStartsOn: 1 });
        const existingWeek = fthrHist.find(h => h.date === weekStart.toISOString());
        
        if (existingWeek) {
          lastFTHR = existingWeek.fthr;
          filledFTHRHistory.push(existingWeek);
        } else if (lastFTHR) {
          filledFTHRHistory.push({
            week: format(weekStart, 'MMM d'),
            weekFull: format(weekStart, 'MMM d, yyyy'),
            fthr: lastFTHR,
            date: weekStart.toISOString(),
            estimated: true,
          });
        }
      }

      setFthrHistory(filledFTHRHistory);
      const fallbackFTHR = filledFTHRHistory.length > 0 ? filledFTHRHistory[filledFTHRHistory.length - 1].fthr : null;
      setCurrentFTHR(fallbackFTHR);

      // Calculate aerobic efficiency metrics
      if (activities.length > 0 && finalFTP) {
        const efficiency = calculateEfficiencyMetrics(activities, finalFTP);
        setEfficiencyMetrics(efficiency);
      }

    } catch (error) {
      logger.error('Error loading FTP history:', error);
      setError(error.message || 'Failed to load FTP history');
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = () => {
    if (ftpHistory.length < 2) return null;
    
    const oldest = ftpHistory[0].ftp;
    const newest = ftpHistory[ftpHistory.length - 1].ftp;
    const change = newest - oldest;
    const percentChange = ((change / oldest) * 100).toFixed(1);
    
    return { change, percentChange };
  };

  const change = calculateChange();

  // Filter data based on selected time range
  const displayData = ftpHistory.slice(-timeRange);
  const displayFTHRData = fthrHistory.slice(-timeRange);

  // Show message if no Strava tokens
  if (!stravaTokens || !stravaTokens.access_token) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Track your FTP, FTHR, and Aerobic Capacity over time</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
              <Zap className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">Connect Strava to View FTP History</p>
              <p className="text-sm mt-2 text-center max-w-md">
                Connect your Strava account in Settings to track your FTP progression based on your power data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Track your FTP, FTHR, and Aerobic Capacity over time</p>
        </div>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">Error Loading FTP History</h3>
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-3">
                  This is likely due to an expired or invalid Strava token. Try reconnecting Strava in Settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Performance Metrics</h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Track your FTP, FTHR, and Aerobic Capacity over time</p>
      </div>

      {/* Debug Info Banner - only show when no FTP data */}
      {!loading && ftpHistory.length === 0 && debugInfo && debugInfo.totalActivities > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">No FTP Data Found</h3>
                <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                  <p>• Total activities: <strong>{debugInfo.totalActivities}</strong></p>
                  <p>• Activities with power data: <strong>{debugInfo.withPower}</strong></p>
                  <p>• Activities ≥ 20 minutes: <strong>{debugInfo.longEnough}</strong></p>
                  <p>• Suitable for FTP: <strong>{debugInfo.suitable}</strong></p>
                  <p className="mt-2 pt-2 border-t border-yellow-300">
                    {debugInfo.withPower === 0 
                      ? "❌ Your activities don't contain power meter data. You need a power meter to track FTP."
                      : debugInfo.longEnough === 0
                      ? "❌ No activities are long enough (need 20+ minutes)."
                      : "❌ No activities have both power data AND 20+ minute duration."}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Current FTP */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Current FTP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              {currentFTP ? `${currentFTP}W` : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Functional Threshold Power
            </p>
          </CardContent>
        </Card>

        {/* Current FTHR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Current FTHR</CardTitle>
            <Heart className="h-4 w-4 text-red-500 dark:text-red-400" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              {currentFTHR ? `${currentFTHR} bpm` : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Functional Threshold Heart Rate
            </p>
          </CardContent>
        </Card>

        {/* Aerobic Efficiency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Aerobic Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              {efficiencyMetrics ? efficiencyMetrics.currentEfficiency : 'N/A'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Watts per heartbeat
            </p>
            {efficiencyMetrics && (
              <p className={`text-xs mt-1 font-medium ${parseFloat(efficiencyMetrics.trend) > 0 ? 'text-green-600 dark:text-green-400' : parseFloat(efficiencyMetrics.trend) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                {parseFloat(efficiencyMetrics.trend) > 0 ? '+' : ''}{efficiencyMetrics.trend}% trend
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
        <div className="flex gap-2 flex-wrap">
          {[8, 12, 16, 24].map((weeks) => (
            <button
              key={weeks}
              onClick={() => setTimeRange(weeks)}
              className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
                timeRange === weeks
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {weeks} weeks
            </button>
          ))}
          <button
            onClick={() => {
              const now = new Date();
              const yearStart = startOfYear(now);
              const weeksFromYearStart = differenceInWeeks(now, yearStart) + 1;
              setTimeRange(weeksFromYearStart);
            }}
            className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[44px] ${
              timeRange > 24
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* FTP Chart */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">FTP Progression</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your estimated FTP over the last {timeRange} weeks ({displayData.length} data points)</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {displayData.length > 0 ? (
            <div className="h-[250px] sm:h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%" key={timeRange}>
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="ftpGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="week" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Watts', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 dark:text-white">{data.weekFull}</p>
                          <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">{data.ftp}W</p>
                          {data.estimated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Estimated (no new data)</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ftp" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fill="url(#ftpGradient)"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500 dark:text-gray-400">
              <Zap className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No FTP data available</p>
              <p className="text-sm mt-2">Complete rides with a power meter to see your FTP history</p>
              {debugInfo && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left text-xs">
                  <p className="font-semibold mb-2">Debug Info:</p>
                  <p>Total activities fetched: {debugInfo.totalActivities}</p>
                  <p>Activities with power data: {debugInfo.withPower}</p>
                  <p>Activities ≥ 20 minutes: {debugInfo.longEnough}</p>
                  <p>Suitable for FTP calculation: {debugInfo.suitable}</p>
                  {debugInfo.suitable === 0 && debugInfo.totalActivities > 0 && (
                    <p className="mt-2 text-orange-600 font-medium">
                      ⚠️ No activities found with both power data and 20+ minute duration
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FTHR Chart */}
      {displayFTHRData.length > 0 && (
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 dark:text-red-400" />
              FTHR Progression
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your estimated FTHR over the last {timeRange} weeks ({displayFTHRData.length} data points)</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="h-[200px] sm:h-[250px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayFTHRData}>
                <defs>
                  <linearGradient id="fthrGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 12 }} label={{ value: 'BPM', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{data.weekFull}</p>
                          <p className="text-red-600 dark:text-red-400 font-bold text-lg">{data.fthr} bpm</p>
                          {data.estimated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">Estimated (no new data)</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="fthr" stroke="#ef4444" strokeWidth={3} fill="url(#fthrGradient)" dot={{ fill: '#ef4444', r: 4 }} activeDot={{ r: 6 }} />
              </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aerobic Efficiency Chart */}
      {efficiencyMetrics && efficiencyMetrics.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
              Aerobic Efficiency Trend
            </CardTitle>
            <CardDescription>Last 4 weeks - Power per heartbeat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{efficiencyMetrics.currentEfficiency}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Current (W/bpm)</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <div className={`text-2xl font-bold ${parseFloat(efficiencyMetrics.trend) > 0 ? 'text-green-600 dark:text-green-400' : parseFloat(efficiencyMetrics.trend) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {parseFloat(efficiencyMetrics.trend) > 0 ? '+' : ''}{efficiencyMetrics.trend}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {parseFloat(efficiencyMetrics.trend) > 0 ? 'Improving ↗' : parseFloat(efficiencyMetrics.trend) < 0 ? 'Declining ↘' : 'Stable →'}
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={efficiencyMetrics.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  formatter={(value) => [value.toFixed(2), 'Efficiency']}
                />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-xs text-gray-700 dark:text-gray-300">
                <Info className="w-3 h-3 inline mr-1" />
                Higher efficiency = more power with less cardiovascular effort. Improving trend indicates better fitness.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Info Cards - Collapsible */}
      <div className="space-y-4">
        {/* FTP Calculation */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleSection('ftp')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
                How FTP is Calculated
              </CardTitle>
              <ChevronDown 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.ftp ? 'rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
          {expandedSections.ftp && (
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-gray-900 dark:text-gray-100">FTP (Functional Threshold Power)</strong> is the highest average power you can sustain for approximately one hour. It represents your lactate threshold and is the cornerstone metric for power-based training.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Auto-Detection Method</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Analyzes activities from the last 6 weeks with power data</li>
                    <li>Identifies your best 20-60 minute sustained efforts</li>
                    <li>Applies standard FTP test protocols:
                      <ul className="ml-6 mt-1 space-y-1">
                        <li><strong>20-minute test:</strong> FTP = 95% of average power</li>
                        <li><strong>30-60 minute effort:</strong> FTP = 100% of average power</li>
                      </ul>
                    </li>
                    <li>Uses Normalized Power when available for more accuracy</li>
                    <li>Updates automatically as you complete new workouts</li>
                  </ul>
                </div>
                <p className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <strong>Tip:</strong> Regular FTP tests or hard sustained efforts (20-60 min) will give you the most accurate tracking.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  <strong>Reference:</strong> Allen, H., & Coggan, A. (2010). <em>Training and Racing with a Power Meter</em>. VeloPress.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* FTHR Calculation */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleSection('fthr')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 dark:text-red-400" />
                How FTHR is Calculated
              </CardTitle>
              <ChevronDown 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.fthr ? 'rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
          {expandedSections.fthr && (
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-gray-900 dark:text-gray-100">FTHR (Functional Threshold Heart Rate)</strong> is the highest average heart rate you can sustain for approximately one hour. It represents your lactate threshold heart rate and is used to set heart rate training zones.
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Auto-Detection Method</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Analyzes activities from the last 6 weeks with heart rate data</li>
                    <li>Identifies your best 20-60 minute sustained efforts</li>
                    <li>Applies standard FTHR test protocols:
                      <ul className="ml-6 mt-1 space-y-1">
                        <li><strong>20-30 minute test:</strong> FTHR = 95% of average HR</li>
                        <li><strong>30-60 minute effort:</strong> FTHR = 100% of average HR</li>
                      </ul>
                    </li>
                    <li>Filters for activities with consistent effort (no intervals)</li>
                    <li>Updates automatically as you complete new workouts</li>
                  </ul>
                </div>
                <p className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <strong>Tip:</strong> FTHR is best measured during steady-state efforts like time trials or tempo rides. Avoid using interval workouts for FTHR estimation.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  <strong>Reference:</strong> Friel, J. (2009). <em>The Cyclist's Training Bible</em>. VeloPress.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Aerobic Capacity/Efficiency Calculation */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            onClick={() => toggleSection('aerobic')}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400" />
                How Aerobic Efficiency is Calculated
              </CardTitle>
              <ChevronDown 
                className={`w-5 h-5 text-gray-500 transition-transform ${expandedSections.aerobic ? 'rotate-180' : ''}`}
              />
            </div>
          </CardHeader>
          {expandedSections.aerobic && (
            <CardContent>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-gray-900 dark:text-gray-100">Aerobic Efficiency</strong> (also called Cardiac Efficiency or Pw:HR ratio) measures how much power you produce per heartbeat. It's calculated as <strong>Power / Heart Rate</strong> and expressed in watts per beat per minute (W/bpm).
                </p>
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Calculation Method</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Analyzes activities with both power and heart rate data</li>
                    <li>Calculates efficiency ratio: <strong>Average Power ÷ Average Heart Rate</strong></li>
                    <li>Tracks trend over the last 4 weeks</li>
                    <li>Higher values indicate better aerobic fitness</li>
                    <li>Improving trend suggests training adaptations are occurring</li>
                  </ul>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">What It Means</h4>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Increasing efficiency:</strong> Your cardiovascular system is becoming more efficient at delivering oxygen to muscles</li>
                    <li><strong>Decreasing efficiency:</strong> May indicate fatigue, overtraining, or need for recovery</li>
                    <li><strong>Stable efficiency:</strong> Maintaining current fitness level</li>
                  </ul>
                </div>
                <p className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <strong>Tip:</strong> Aerobic efficiency improves with consistent endurance training and proper recovery. It's a key indicator of aerobic fitness development.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  <strong>Reference:</strong> Seiler, S. (2010). "What is best practice for training intensity and duration distribution in endurance athletes?" <em>International Journal of Sports Physiology and Performance</em>, 5(3), 276-291.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
