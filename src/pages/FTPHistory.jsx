import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, startOfYear, differenceInWeeks } from 'date-fns';

const FTPHistory = ({ stravaTokens }) => {
  const [ftpHistory, setFtpHistory] = useState([]);
  const [currentFTP, setCurrentFTP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // weeks
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (stravaTokens && stravaTokens.access_token) {
      console.log('FTP History - Loading data with tokens');
      loadFTPHistory();
    } else {
      console.log('FTP History - No valid tokens, setting loading to false');
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
      console.error('Token refresh error:', error);
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
          console.log('FTP History - Token expired, refreshing...');
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
        
        console.log('FTP History - Fetching activities after:', new Date(fetchFrom * 1000).toISOString());
        
        const userId = localStorage.getItem('current_user') ? JSON.parse(localStorage.getItem('current_user')).email : 'anonymous';
        const response = await fetch(
          `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${fetchFrom}&per_page=200&user_id=${encodeURIComponent(userId)}`
        );
        
        // Handle 401/403 by attempting token refresh
        if (response.status === 401 || response.status === 403) {
          console.log('FTP History - Got 401/403, attempting token refresh...');
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
          console.error('FTP History - API Error:', response.status, errorData);
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}: Failed to fetch activities`);
        } else {
          const data = await response.json();
          
          // Check if response is an error object
          if (data.error) {
            throw new Error(data.error);
          }
          
          activities = data;
        }
        
        console.log('FTP History - Fetched activities:', activities.length);
        
        // Collect debug info
        const debug = {
          totalActivities: activities.length,
          withPower: 0,
          longEnough: 0,
          suitable: 0,
        };
        
        // Log sample activity to see structure
        if (activities.length > 0) {
          console.log('FTP History - Sample activity:', activities[0]);
          
          // Count activities with power data
          const withPower = activities.filter(a => a.avgPower && a.avgPower > 0);
          debug.withPower = withPower.length;
          console.log('FTP History - Activities with power:', withPower.length);
          
          // Count activities long enough
          const longEnough = activities.filter(a => a.duration >= 1200);
          debug.longEnough = longEnough.length;
          console.log('FTP History - Activities >= 20min:', longEnough.length);
          
          // Count activities with both
          const suitable = activities.filter(a => a.avgPower && a.avgPower > 0 && a.duration >= 1200);
          debug.suitable = suitable.length;
          console.log('FTP History - Suitable for FTP calc:', suitable.length);
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
          console.log('FTP History - Total activities:', activities.length);
          console.log('FTP History - Power activities (>=20min):', powerActivities.length);
          console.log('FTP History - Recent power activities (last 6 weeks):', recentPowerActivities.length);
          if (recentPowerActivities.length > 0) {
            const best = recentPowerActivities.sort((a, b) => 
              (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
            )[0];
            console.log('FTP History - Best recent effort:', {
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
            console.log('FTP History - Current FTP from backend:', currentFTPValue);
            console.log('FTP History - Full response:', ftpData);
          } else {
            console.error('FTP History - Backend FTP request failed:', ftpResponse.status);
          }
        } catch (error) {
          console.error('Error fetching FTP from backend:', error);
        }
      } else {
        console.log('FTP History - No activities to send to backend');
      }

      // Calculate FTP for each week
      const history = [];
      console.log('FTP History - Processing', maxWeeks, 'weeks of data');

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
      
      console.log('FTP History - Calculated FTP for', history.length, 'weeks');

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
      console.log('FTP History - Setting currentFTP:', finalFTP, '(backend:', currentFTPValue, ', fallback:', fallbackFTP, ')');
      setCurrentFTP(finalFTP);
    } catch (error) {
      console.error('Error loading FTP history:', error);
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

  // Show message if no Strava tokens
  if (!stravaTokens || !stravaTokens.access_token) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FTP History</h1>
          <p className="text-gray-600 mt-1">Track your Functional Threshold Power over time</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <Zap className="w-16 h-16 mb-4 text-gray-300" />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading FTP history...</p>
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FTP History</h1>
          <p className="text-gray-600 mt-1">Track your Functional Threshold Power over time</p>
        </div>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-2">Error Loading FTP History</h3>
                <p className="text-sm text-red-800">{error}</p>
                <p className="text-sm text-red-700 mt-3">
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">FTP History</h1>
        <p className="text-gray-600 mt-1">Track your Functional Threshold Power over time</p>
      </div>

      {/* Debug Info Banner - only show when no FTP data */}
      {!loading && ftpHistory.length === 0 && debugInfo && debugInfo.totalActivities > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">No FTP Data Found</h3>
                <div className="text-sm text-yellow-800 space-y-1">
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

      {/* Current FTP Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current FTP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentFTP ? `${currentFTP}W` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most recent estimate
            </p>
            {/* Temporary debug info */}
            {!currentFTP && ftpHistory.length > 0 && (
              <p className="text-xs text-orange-600 mt-2">
                Debug: History has {ftpHistory.length} weeks, latest: {ftpHistory[ftpHistory.length - 1]?.ftp}W
              </p>
            )}
          </CardContent>
        </Card>

        {change && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{timeRange}-Week Change</CardTitle>
                <TrendingUp className={`h-4 w-4 ${change.change >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${change.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change.change >= 0 ? '+' : ''}{change.change}W
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {change.percentChange >= 0 ? '+' : ''}{change.percentChange}% change
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {ftpHistory.filter(h => !h.estimated).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Weeks with power data
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
        <div className="flex gap-2 flex-wrap">
          {[8, 12, 16, 24].map((weeks) => (
            <button
              key={weeks}
              onClick={() => setTimeRange(weeks)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === weeks
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange > 24
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            This Year
          </button>
        </div>
      </div>

      {/* FTP Chart */}
      <Card>
        <CardHeader>
          <CardTitle>FTP Progression</CardTitle>
          <CardDescription>Your estimated FTP over the last {timeRange} weeks ({displayData.length} data points)</CardDescription>
        </CardHeader>
        <CardContent>
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400} key={timeRange}>
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
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900">{data.weekFull}</p>
                          <p className="text-blue-600 font-bold text-lg">{data.ftp}W</p>
                          {data.estimated && (
                            <p className="text-xs text-gray-500 italic">Estimated (no new data)</p>
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
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-500">
              <Zap className="w-16 h-16 mb-4 text-gray-300" />
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            How FTP is Calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              <strong>FTP (Functional Threshold Power)</strong> is the highest average power you can sustain for approximately one hour.
            </p>
            <p>
              This app estimates your FTP weekly based on your best power efforts:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Looks for your best 20-60 minute efforts each week</li>
              <li>20-minute efforts: FTP = 95% of average power</li>
              <li>60-minute efforts: FTP = 100% of average power</li>
              <li>Uses Normalized Power when available for more accuracy</li>
            </ul>
            <p className="pt-2 border-t border-gray-200">
              <strong>Tip:</strong> Regular FTP tests or hard sustained efforts will give you the most accurate tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FTPHistory;
