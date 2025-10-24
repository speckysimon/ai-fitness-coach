import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import logger from '../lib/logger';

const Form = ({ stravaTokens }) => {
  const [formData, setFormData] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(42); // 6 weeks default
  const [currentTokens, setCurrentTokens] = useState(stravaTokens);

  useEffect(() => {
    if (stravaTokens && stravaTokens.access_token) {
      setCurrentTokens(stravaTokens);
      loadFormData();
    } else {
      setLoading(false);
    }
  }, [stravaTokens, timeRange]);

  // Refresh Strava access token if expired
  const refreshAccessToken = async () => {
    if (!currentTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

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
    
    return newTokens;
  };

  const calculateTSS = (activity, ftp) => {
    if (!activity.duration) return 0;
    const durationHours = activity.duration / 3600;

    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }

    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170;
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }

    const typeMultipliers = {
      'Ride': 1.0, 'VirtualRide': 1.0, 'Run': 1.2, 'Workout': 0.8, 'default': 0.7,
    };
    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  };

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Try to load from cache first (much faster and avoids API rate limits)
      const cachedActivities = localStorage.getItem('cached_activities');
      const cacheTimestamp = localStorage.getItem('cache_timestamp');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
      const cacheValid = cacheAge < 30 * 60 * 1000; // 30 minutes

      if (cachedActivities && cacheValid) {
        const activities = JSON.parse(cachedActivities);
        await processFormData(activities, currentTokens);
        return;
      }

      let tokensToUse = currentTokens;

      // Check if token is expired
      const now = Math.floor(Date.now() / 1000);
      if (tokensToUse.expires_at && tokensToUse.expires_at < now) {
        try {
          tokensToUse = await refreshAccessToken();
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please reconnect in Settings.');
          }
          throw refreshError;
        }
      }

      // Fetch 90 days of activities for proper baseline
      const ninetyDaysAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
      
      const response = await fetch(
        `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${ninetyDaysAgo}&per_page=200`
      );

      // Handle 401/403
      if (response.status === 401 || response.status === 403) {
        try {
          tokensToUse = await refreshAccessToken();
          const retryResponse = await fetch(
            `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${ninetyDaysAgo}&per_page=200`
          );
          
          if (!retryResponse.ok) {
            throw new Error('Failed to fetch activities after token refresh');
          }
          
          const activities = await retryResponse.json();
          await processFormData(activities, tokensToUse);
          return;
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            throw new Error('Your Strava session has expired. Please reconnect in Settings.');
          }
          throw new Error('Failed to refresh your Strava connection. Please try reconnecting in Settings.');
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }

      const activities = await response.json();
      await processFormData(activities, tokensToUse);
    } catch (error) {
      logger.error('Form - Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processFormData = async (activities, tokensToUse) => {
    try {
      // Get FTP
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities }),
      });
      const ftpData = await ftpResponse.json();
      const ftp = ftpData.ftp;

      // Use the activities we already have (already 90 days from loadFormData)
      const baselineActivities = activities;

      // Calculate daily metrics from 90 days ago to build proper baseline
      const allDailyData = [];
      const today = startOfDay(new Date());
      const startDay = 89; // 90 days of history

      for (let i = startDay; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get activities for this day
        const dayActivities = baselineActivities.filter(a => {
          const activityDate = format(new Date(a.date), 'yyyy-MM-dd');
          return activityDate === dateStr;
        });

        // Calculate daily TSS
        const dailyTSS = dayActivities.reduce((sum, a) => sum + calculateTSS(a, ftp), 0);

        // Calculate ATL (Acute Training Load) - 7-day exponentially weighted average
        const atlDecay = 2 / (7 + 1);
        const prevATL = allDailyData.length > 0 ? allDailyData[allDailyData.length - 1].atl : 0;
        const atl = prevATL + atlDecay * (dailyTSS - prevATL);

        // Calculate CTL (Chronic Training Load) - 42-day exponentially weighted average
        const ctlDecay = 2 / (42 + 1);
        const prevCTL = allDailyData.length > 0 ? allDailyData[allDailyData.length - 1].ctl : 0;
        const ctl = prevCTL + ctlDecay * (dailyTSS - prevCTL);

        // Calculate TSB (Training Stress Balance) = CTL - ATL
        const tsb = ctl - atl;

        allDailyData.push({
          date: dateStr,
          dateLabel: format(date, 'MMM d'),
          tss: dailyTSS,
          atl: Math.round(atl * 10) / 10,
          ctl: Math.round(ctl * 10) / 10,
          tsb: Math.round(tsb * 10) / 10,
          fitness: Math.round(ctl),
          fatigue: Math.round(atl),
          form: Math.round(tsb),
        });
      }

      // Extract only the requested time range for display
      const displayData = allDailyData.slice(-timeRange);

      setFormData(displayData);
      
      // Set current metrics (today's values)
      const current = displayData[displayData.length - 1];
      setCurrentMetrics(current);
    } catch (error) {
      logger.error('Form - Error processing data:', error);
      throw error;
    }
  };

  const getFormStatus = (tsb) => {
    if (tsb > 25) return { status: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', description: 'Overreached - high injury/illness risk' };
    if (tsb > 5) return { status: 'Optimal', color: 'text-green-600', bg: 'bg-green-50', description: 'Fresh and ready to race' };
    if (tsb > -10) return { status: 'Grey Zone', color: 'text-gray-600', bg: 'bg-gray-50', description: 'Neutral - maintaining fitness' };
    if (tsb > -30) return { status: 'Fresh', color: 'text-blue-600', bg: 'bg-blue-50', description: 'Building fitness, slight fatigue' };
    return { status: 'High Risk', color: 'text-red-600', bg: 'bg-red-50', description: 'Overtrained - need recovery' };
  };

  // Get form line color based on TSB value
  const getFormLineColor = (tsb) => {
    if (tsb > 25) return '#ef4444'; // red - overreached
    if (tsb > 5) return '#22c55e'; // green - optimal
    if (tsb > -10) return '#6b7280'; // gray - neutral
    if (tsb > -30) return '#f59e0b'; // yellow/orange - building
    return '#ef4444'; // red - overtrained
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Calculating your fitness metrics...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Fetching 90 days of training data for accurate baseline...</p>
        </div>
      </div>
    );
  }

  // No Strava connection
  if (!currentTokens?.access_token) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect Strava to View Fitness & Form</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This page requires your Strava activities to calculate fitness metrics.
              </p>
              <p className="text-sm text-gray-500">
                Go to Settings to connect your Strava account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No data available
  if (!loading && formData.length === 0) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Fitness & Form</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track your training load, fitness, and freshness using Joe Friel's TSB methodology</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Activity className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Training Data Available</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                We need at least a few weeks of training data to calculate your fitness metrics.
              </p>
              <p className="text-sm text-gray-500">
                Keep training and sync your activities from Strava!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formStatus = currentMetrics ? getFormStatus(currentMetrics.form) : null;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fitness & Form</h1>
        <p className="text-gray-600 mt-1">Track your training load, fitness, and freshness using Joe Friel's TSB methodology</p>
      </div>

      {/* Current Metrics */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Fitness (CTL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{currentMetrics.fitness}</div>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">42-day average training load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Fatigue (ATL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{currentMetrics.fatigue}</div>
              <p className="text-xs text-gray-500 mt-1">7-day average training load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Form (TSB)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${formStatus.color}`}>{currentMetrics.form}</div>
              <p className="text-xs text-gray-500 mt-1">Fitness - Fatigue</p>
            </CardContent>
          </Card>

          <Card className={formStatus.bg}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${formStatus.color}`}>{formStatus.status}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formStatus.description}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Time Range:</span>
        <div className="flex gap-2">
          {[42, 90, 180].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Fitness & Form Chart</CardTitle>
          <CardDescription>
            Blue: Fitness (CTL) | Purple: Fatigue (ATL) | Form (TSB): Green (optimal), Gray (neutral), Yellow (building), Red (risk)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={formData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="dateLabel" 
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const status = getFormStatus(data.form);
                    return (
                      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{data.dateLabel}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-blue-600">Fitness: {data.fitness}</p>
                          <p className="text-sm text-purple-600">Fatigue: {data.fatigue}</p>
                          <p className={`text-sm ${status.color}`}>Form: {data.form}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Daily TSS: {data.tss}</p>
                        </div>
                        <p className={`text-xs mt-2 ${status.color} font-medium`}>{status.status}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <ReferenceLine y={5} stroke="#22c55e" strokeDasharray="2 2" label="Optimal" />
              <ReferenceLine y={25} stroke="#ef4444" strokeDasharray="2 2" label="High Risk" />
              <Line type="monotone" dataKey="fitness" stroke="#3b82f6" strokeWidth={2} name="Fitness (CTL)" />
              <Line type="monotone" dataKey="fatigue" stroke="#a855f7" strokeWidth={2} name="Fatigue (ATL)" />
              {/* Form line with color-coded dots */}
              <Line 
                type="monotone" 
                dataKey="form" 
                stroke="#6b7280"
                strokeWidth={2}
                name="Form (TSB)"
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (!payload) return null;
                  const color = getFormLineColor(payload.form);
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={color}
                      stroke="white"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* TSS Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Training Stress Score (TSS)</CardTitle>
          <CardDescription>Your daily training load over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={formData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area type="monotone" dataKey="tss" stroke="#f59e0b" fill="#fef3c7" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Understanding Fitness & Form
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">The Three Metrics:</h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">CTL (Fitness):</span>
                <span>Chronic Training Load - 42-day exponentially weighted average of daily TSS. Represents your fitness level.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold">ATL (Fatigue):</span>
                <span>Acute Training Load - 7-day exponentially weighted average of daily TSS. Represents your current fatigue.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">TSB (Form):</span>
                <span>Training Stress Balance = CTL - ATL. Represents your freshness and readiness to perform.</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Form Zones:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <span className="font-bold text-red-600">TSB &gt; 25:</span>
                <span className="text-gray-700 dark:text-gray-300">High Risk - Detraining or overreached</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <span className="font-bold text-green-600">TSB 5-25:</span>
                <span className="text-gray-700 dark:text-gray-300">Optimal - Fresh and ready to race</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <span className="font-bold text-gray-600">TSB -10 to 5:</span>
                <span className="text-gray-700 dark:text-gray-300">Grey Zone - Neutral state</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="font-bold text-blue-600">TSB -30 to -10:</span>
                <span className="text-gray-700 dark:text-gray-300">Fresh - Building fitness</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <span className="font-bold text-red-600">TSB &lt; -30:</span>
                <span className="text-gray-700 dark:text-gray-300">High Risk - Overtrained, need recovery</span>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📚 Methodology Source</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Based on <strong>Joe Friel's Training Stress Balance</strong> methodology from "The Cyclist's Training Bible" 
              and his blog post "Managing Training Using TSB". This approach is used by professional coaches worldwide 
              and implemented in TrainingPeaks, intervals.icu, and other leading platforms.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Form;
