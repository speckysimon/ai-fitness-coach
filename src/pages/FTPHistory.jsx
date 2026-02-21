import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, subWeeks, startOfWeek, endOfWeek, isWithinInterval, startOfYear, differenceInWeeks } from 'date-fns';
import logger from '../lib/logger';
import { MetricTooltip } from '../components/MetricTooltip';

const FTPHistory = ({ stravaTokens }) => {
  const [ftpHistory, setFtpHistory] = useState([]);
  const [currentFTP, setCurrentFTP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // weeks
  const [debugInfo, setDebugInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFTPHistory();
  }, []);

  const loadFTPHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Calculate weeks to fetch (either 24 weeks or from Jan 1st, whichever is more)
      const now = new Date();
      const yearStart = startOfYear(now);
      const weeksFromYearStart = differenceInWeeks(now, yearStart) + 1;
      const maxWeeks = Math.max(24, weeksFromYearStart);
      
      // Load activities from Dashboard cache (already includes Strava + Intervals + Manual)
      const cachedActivities = localStorage.getItem('cached_activities_recent');
      
      if (!cachedActivities) {
        logger.warn('[FTP History] No cached activities. Please visit Dashboard first.');
        setLoading(false);
        return;
      }

      const activities = JSON.parse(cachedActivities);
      logger.info('[FTP History] Using cached activities:', activities.length);
      
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

      // Use backend /ftp-history endpoint - single source of truth
      // No frontend calculation, no gap-filling (honest data)
      let currentFTPValue = null;
      let historyData = [];
      
      if (activities.length > 0) {
        try {
          const ftpHistoryResponse = await fetch('/api/analytics/ftp-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activities, weeks: maxWeeks }),
          });
          
          if (ftpHistoryResponse.ok) {
            const data = await ftpHistoryResponse.json();
            currentFTPValue = data.currentFTP?.ftp || null;
            
            // Transform backend history to display format
            // NO gap-filling - show honest data with nulls
            historyData = data.history
              .filter(h => h.ftp !== null) // Only show weeks with actual data
              .map(h => ({
                week: format(new Date(h.weekStart), 'MMM d'),
                weekFull: format(new Date(h.weekStart), 'MMM d, yyyy'),
                ftp: h.ftp,
                confidence: h.confidence,
                confidenceLevel: h.confidenceLevel,
                date: h.weekStart,
              }));
            
            logger.info('[FTP History] Loaded', historyData.length, 'weeks with data from backend');
          } else {
            logger.error('FTP History - Backend request failed:', ftpHistoryResponse.status);
          }
        } catch (error) {
          logger.error('Error fetching FTP history from backend:', error);
        }
      }

      setFtpHistory(historyData);
      setCurrentFTP(currentFTPValue);
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

  // Show message if no Strava tokens
  if (!stravaTokens || !stravaTokens.access_token) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FTP History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your Functional Threshold Power over time</p>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading FTP history...</p>
        </div>
      </div>
    );
  }

  // Show error if API call failed
  if (error) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">FTP History</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your Functional Threshold Power over time</p>
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">FTP History</h1>
        <p className="text-gray-600 mt-1">Track your Functional Threshold Power over time</p>
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

      {/* Current FTP Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              Current FTP
              <MetricTooltip type="ftp" iconClassName="text-yellow-500 dark:text-yellow-400" />
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentFTP ? `${currentFTP}W` : <span className="text-gray-400 dark:text-gray-500">Insufficient data</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentFTP ? 'Most recent estimate' : 'Needs 20-60 min steady effort'}
            </p>
          </CardContent>
        </Card>

        {change && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{timeRange}-Week Change</CardTitle>
                <TrendingUp className={`h-4 w-4 ${change.change >= 0 ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${change.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
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
                <Calendar className="h-4 w-4 text-blue-500 dark:text-blue-400" />
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
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
        <div className="flex gap-2 flex-wrap">
          {[8, 12, 16, 24].map((weeks) => (
            <button
              key={weeks}
              onClick={() => setTimeRange(weeks)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900 dark:text-white">{data.weekFull}</p>
                          <p className="text-blue-600 dark:text-blue-400 font-bold text-lg">{data.ftp}W</p>
                          {data.confidenceLevel && (
                            <p className={`text-xs ${data.confidenceLevel === 'high' ? 'text-green-600 dark:text-green-400' : data.confidenceLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              {data.confidenceLevel.charAt(0).toUpperCase() + data.confidenceLevel.slice(1)} confidence
                            </p>
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

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            How FTP is Calculated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
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
            <p className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <strong>Tip:</strong> Regular FTP tests or hard sustained efforts will give you the most accurate tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FTPHistory;
