import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';

const Form = ({ stravaTokens }) => {
  const [formData, setFormData] = useState([]);
  const [currentMetrics, setCurrentMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(42); // 6 weeks default

  useEffect(() => {
    if (stravaTokens) {
      loadFormData();
    }
  }, [stravaTokens, timeRange]);

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
      const daysAgo = Math.floor(Date.now() / 1000) - (timeRange * 24 * 60 * 60);
      const response = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${daysAgo}&per_page=200`
      );
      const activities = await response.json();

      // Get FTP
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities }),
      });
      const ftpData = await ftpResponse.json();
      const ftp = ftpData.ftp;

      // Calculate daily metrics
      const dailyData = [];
      const today = startOfDay(new Date());

      for (let i = timeRange - 1; i >= 0; i--) {
        const date = subDays(today, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Get activities for this day
        const dayActivities = activities.filter(a => {
          const activityDate = format(new Date(a.date), 'yyyy-MM-dd');
          return activityDate === dateStr;
        });

        // Calculate daily TSS
        const dailyTSS = dayActivities.reduce((sum, a) => sum + calculateTSS(a, ftp), 0);

        // Calculate ATL (Acute Training Load) - 7-day exponentially weighted average
        const atlDecay = 2 / (7 + 1);
        const prevATL = i < timeRange - 1 ? dailyData[dailyData.length - 1]?.atl || 0 : 0;
        const atl = prevATL + atlDecay * (dailyTSS - prevATL);

        // Calculate CTL (Chronic Training Load) - 42-day exponentially weighted average
        const ctlDecay = 2 / (42 + 1);
        const prevCTL = i < timeRange - 1 ? dailyData[dailyData.length - 1]?.ctl || 0 : 0;
        const ctl = prevCTL + ctlDecay * (dailyTSS - prevCTL);

        // Calculate TSB (Training Stress Balance) = CTL - ATL
        const tsb = ctl - atl;

        dailyData.push({
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

      setFormData(dailyData);
      
      // Set current metrics (today's values)
      const current = dailyData[dailyData.length - 1];
      setCurrentMetrics(current);
    } catch (error) {
      console.error('Error loading form data:', error);
    } finally {
      setLoading(false);
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
          <p className="text-gray-600">Calculating your fitness metrics...</p>
        </div>
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
              <CardTitle className="text-sm font-medium text-gray-600">Fitness (CTL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{currentMetrics.fitness}</div>
              <p className="text-xs text-gray-500 mt-1">42-day average training load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Fatigue (ATL)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{currentMetrics.fatigue}</div>
              <p className="text-xs text-gray-500 mt-1">7-day average training load</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Form (TSB)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${formStatus.color}`}>{currentMetrics.form}</div>
              <p className="text-xs text-gray-500 mt-1">Fitness - Fatigue</p>
            </CardContent>
          </Card>

          <Card className={formStatus.bg}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${formStatus.color}`}>{formStatus.status}</div>
              <p className="text-xs text-gray-600 mt-1">{formStatus.description}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time Range Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Time Range:</span>
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
                      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-semibold text-gray-900">{data.dateLabel}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-blue-600">Fitness: {data.fitness}</p>
                          <p className="text-sm text-purple-600">Fatigue: {data.fatigue}</p>
                          <p className={`text-sm ${status.color}`}>Form: {data.form}</p>
                          <p className="text-sm text-gray-600">Daily TSS: {data.tss}</p>
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
            <h4 className="font-semibold text-gray-900 mb-2">The Three Metrics:</h4>
            <ul className="space-y-2 text-sm text-gray-700">
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
            <h4 className="font-semibold text-gray-900 mb-2">Form Zones:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <span className="font-bold text-red-600">TSB &gt; 25:</span>
                <span className="text-gray-700">High Risk - Detraining or overreached</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded">
                <span className="font-bold text-green-600">TSB 5-25:</span>
                <span className="text-gray-700">Optimal - Fresh and ready to race</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                <span className="font-bold text-gray-600">TSB -10 to 5:</span>
                <span className="text-gray-700">Grey Zone - Neutral state</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded">
                <span className="font-bold text-blue-600">TSB -30 to -10:</span>
                <span className="text-gray-700">Fresh - Building fitness</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-red-50 rounded">
                <span className="font-bold text-red-600">TSB &lt; -30:</span>
                <span className="text-gray-700">High Risk - Overtrained, need recovery</span>
              </div>
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 p-3 rounded">
            <h4 className="font-semibold text-blue-900 mb-2">📚 Methodology Source</h4>
            <p className="text-sm text-gray-700">
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
