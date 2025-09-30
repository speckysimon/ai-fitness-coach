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

  useEffect(() => {
    if (stravaTokens) {
      loadFTPHistory();
    }
  }, [stravaTokens]); // Only reload when tokens change, not when timeRange changes

  const calculateWeeklyFTP = (activities, weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    
    const weekActivities = activities.filter(a => {
      const activityDate = new Date(a.date);
      return isWithinInterval(activityDate, { start: weekStart, end: weekEnd }) &&
             a.avgPower > 0 && 
             a.duration >= 1200; // At least 20 min
    });

    if (weekActivities.length === 0) return null;

    // Find best effort for the week
    const sortedByPower = weekActivities.sort((a, b) => 
      (b.normalizedPower || b.avgPower) - (a.normalizedPower || a.avgPower)
    );

    const bestEffort = sortedByPower.find(a => a.duration >= 1200 && a.duration <= 3600);
    
    if (bestEffort) {
      const power = bestEffort.normalizedPower || bestEffort.avgPower;
      const durationMin = bestEffort.duration / 60;
      
      if (durationMin <= 30) {
        return Math.round(power * 0.95);
      } else {
        return Math.round(power);
      }
    }

    return null;
  };

  const loadFTPHistory = async () => {
    setLoading(true);
    
    try {
      // Calculate weeks to fetch (either 24 weeks or from Jan 1st, whichever is more)
      const now = new Date();
      const yearStart = startOfYear(now);
      const weeksFromYearStart = differenceInWeeks(now, yearStart) + 1;
      const maxWeeks = Math.max(24, weeksFromYearStart);
      
      let activities = [];

      if (stravaTokens) {
        // Fetch from Jan 1st or 24 weeks ago, whichever is earlier
        const fetchFrom = Math.min(
          Math.floor(yearStart.getTime() / 1000),
          Math.floor(Date.now() / 1000) - (24 * 7 * 24 * 60 * 60)
        );
        
        const response = await fetch(
          `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${fetchFrom}&per_page=200`
        );
        activities = await response.json();
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
      setCurrentFTP(filledHistory.length > 0 ? filledHistory[filledHistory.length - 1].ftp : null);
    } catch (error) {
      console.error('Error loading FTP history:', error);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">FTP History</h1>
        <p className="text-gray-600 mt-1">Track your Functional Threshold Power over time</p>
      </div>

      {/* Current FTP Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current FTP</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {currentFTP ? `${currentFTP}W` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most recent estimate
            </p>
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
                <div className="text-3xl font-bold text-gray-900">
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
