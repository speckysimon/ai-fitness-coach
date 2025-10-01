import React, { useState, useEffect } from 'react';
import { User, Zap, TrendingUp, Mountain, AlertTriangle, Calendar, Trophy, Target, X, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  calculatePowerCurve, 
  classifyRiderType, 
  calculateZoneDistribution,
  generateSmartInsights,
  calculateEfficiencyMetrics
} from '../lib/riderAnalytics';

const RiderProfile = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ftp, setFtp] = useState(null);
  const [riderProfile, setRiderProfile] = useState(null);
  const [recentProfile, setRecentProfile] = useState(null);
  const [powerCurve, setPowerCurve] = useState(null);
  const [zoneDistribution, setZoneDistribution] = useState(null);
  const [insights, setInsights] = useState([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (stravaTokens) {
      loadProfileData();
    }
  }, [stravaTokens]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      let allActivities = [];
      const cachedActivities = localStorage.getItem('cached_activities');
      
      if (cachedActivities) {
        allActivities = JSON.parse(cachedActivities);
      } else {
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const after = Math.floor(yearStart.getTime() / 1000);
        
        const response = await fetch(
          `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${after}&per_page=200`
        );
        allActivities = await response.json();
      }

      setActivities(allActivities);
      const cachedMetrics = localStorage.getItem('cached_metrics');
      let currentFtp = null;
      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        currentFtp = metrics.ftp;
      }

      // Calculate power curve for full season
      const curve = calculatePowerCurve(allActivities);
      setPowerCurve(curve);

      // Classify rider type for full season
      const profile = classifyRiderType(allActivities, curve, currentFtp);
      setRiderProfile(profile);

      // Calculate recent profile (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const recentActivities = allActivities.filter(a => new Date(a.date) >= threeMonthsAgo);
      
      if (recentActivities.length >= 10) {
        const recentCurve = calculatePowerCurve(recentActivities);
        const recentProfileData = classifyRiderType(recentActivities, recentCurve, currentFtp);
        setRecentProfile(recentProfileData);
      }

      const zones = calculateZoneDistribution(allActivities, currentFtp);
      setZoneDistribution(zones);

      const smartInsights = generateSmartInsights(allActivities, currentFtp, profile);
      setInsights(smartInsights);

      // Calculate efficiency metrics
      const efficiency = calculateEfficiencyMetrics(allActivities, currentFtp);
      setEfficiencyMetrics(efficiency);

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiderTypeIcon = (type) => {
    if (type.includes('Sprinter')) return '⚡';
    if (type.includes('Climber')) return '⛰️';
    if (type.includes('Rouleur')) return '🚴';
    if (type.includes('Time Trial')) return '⏱️';
    if (type.includes('Puncheur')) return '💥';
    return '🏆';
  };

  const getRiderTypeColor = (type) => {
    if (type.includes('Sprinter')) return 'from-yellow-400 to-orange-500';
    if (type.includes('Climber')) return 'from-green-400 to-emerald-600';
    if (type.includes('Rouleur')) return 'from-blue-400 to-blue-600';
    if (type.includes('Time Trial')) return 'from-purple-400 to-purple-600';
    if (type.includes('Puncheur')) return 'from-red-400 to-red-600';
    return 'from-gray-400 to-gray-600';
  };

  const getInsightIcon = (iconName) => {
    const icons = {
      Zap, AlertTriangle, TrendingUp, Calendar, Mountain, Trophy
    };
    return icons[iconName] || Zap;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const powerCurveData = powerCurve ? [
    { duration: '5s', power: powerCurve[5], label: '5 sec' },
    { duration: '10s', power: powerCurve[10], label: '10 sec' },
    { duration: '30s', power: powerCurve[30], label: '30 sec' },
    { duration: '1m', power: powerCurve[60], label: '1 min' },
    { duration: '5m', power: powerCurve[300], label: '5 min' },
    { duration: '10m', power: powerCurve[600], label: '10 min' },
    { duration: '20m', power: powerCurve[1200], label: '20 min' },
    { duration: '60m', power: powerCurve[3600], label: '60 min' }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your rider profile...</p>
        </div>
      </div>
    );
  }

  if (activities.length < 10) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            Rider Profile
          </h1>
          <p className="text-gray-600 mt-1">Discover your rider type and training insights</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Not Enough Data Yet</h3>
              <p className="text-gray-600 mb-6">
                We need at least 10 activities to analyze your rider profile and generate insights.
              </p>
              <p className="text-sm text-gray-500">
                Keep training and check back soon! Current activities: {activities.length}/10
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <User className="w-8 h-8 text-blue-600" />
          Rider Profile
        </h1>
        <p className="text-gray-600 mt-1">Your unique strengths and training insights</p>
      </div>

      {riderProfile && (
        <Card className="border-2 border-blue-200 overflow-hidden">
          <div 
            className={`bg-gradient-to-r ${getRiderTypeColor(riderProfile.type)} p-8 text-white cursor-pointer hover:opacity-95 transition-opacity`}
            onClick={() => setShowProfileModal(true)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-6xl">{getRiderTypeIcon(riderProfile.type)}</div>
                <div>
                  <h2 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    You are a {riderProfile.type}
                    <Info className="w-6 h-6 text-white/80" />
                  </h2>
                  <p className="text-white/90 text-lg">{riderProfile.description}</p>
                  <p className="text-white/70 text-sm mt-2">Click for detailed analysis</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{riderProfile.confidence}%</div>
                <p className="text-white/80 text-sm">Confidence</p>
              </div>
            </div>
          </div>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Strengths Profile</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(riderProfile.scores).map(([type, score]) => (
                <div key={type} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-lg font-bold text-blue-600">{score}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(score / 7) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insights.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Smart Insights & Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, idx) => {
              const Icon = getInsightIcon(insight.icon);
              return (
                <Card key={idx} className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${insight.priority === 'high' ? 'bg-red-100' : insight.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                        <Icon className={`w-6 h-6 ${insight.priority === 'high' ? 'text-red-600' : insight.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityBadge(insight.priority)}`}>
                            {insight.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{insight.message}</p>
                        <Button variant="outline" size="sm">
                          {insight.action}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {powerCurve && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Power Curve Analysis
            </CardTitle>
            <CardDescription>Your best power outputs across different durations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={powerCurveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis label={{ value: 'Watts', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value}W`, 'Power']} />
                <Bar dataKey="power" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-4 gap-4">
              {powerCurveData.slice(0, 4).map((item, idx) => (
                <div key={idx} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{item.power}W</div>
                  <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Efficiency Metrics Dashboard */}
      {efficiencyMetrics && (
        <Card className="border-2 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Aerobic Efficiency
            </CardTitle>
            <CardDescription>Your training effectiveness over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Current Efficiency */}
              <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="text-4xl font-bold text-green-600">{efficiencyMetrics.currentEfficiency}</div>
                <div className="text-sm text-gray-600 mt-1">Current Efficiency</div>
                <div className="text-xs text-gray-500 mt-1">Watts per BPM</div>
              </div>

              {/* Trend */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className={`text-4xl font-bold ${parseFloat(efficiencyMetrics.trend) > 0 ? 'text-green-600' : parseFloat(efficiencyMetrics.trend) < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {parseFloat(efficiencyMetrics.trend) > 0 ? '+' : ''}{efficiencyMetrics.trend}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Trend</div>
                <div className="text-xs text-gray-500 mt-1">
                  {parseFloat(efficiencyMetrics.trend) > 0 ? 'Improving ↗' : parseFloat(efficiencyMetrics.trend) < 0 ? 'Declining ↘' : 'Stable →'}
                </div>
              </div>

              {/* Data Points */}
              <div className="text-center p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="text-4xl font-bold text-purple-600">{efficiencyMetrics.data.length}</div>
                <div className="text-sm text-gray-600 mt-1">Activities</div>
                <div className="text-xs text-gray-500 mt-1">With power & HR data</div>
              </div>
            </div>

            {/* Efficiency Chart */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-900 mb-3">Efficiency Progression</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={efficiencyMetrics.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis label={{ value: 'Efficiency (W/bpm)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    formatter={(value) => [value.toFixed(2), 'Efficiency']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="efficiency" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Explanation */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-green-600" />
                What is Aerobic Efficiency?
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                Aerobic efficiency measures how much power you produce per heartbeat (Watts/BPM). 
                Higher efficiency means you're producing more power with less cardiovascular effort - 
                a key indicator of improved fitness.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Improving trend:</strong> Your training is working! You're getting more efficient.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>Stable trend:</strong> You're maintaining your fitness level consistently.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600 font-bold">!</span>
                  <span><strong>Declining trend:</strong> May indicate fatigue or need for recovery.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span><strong>Use this to:</strong> Track training effectiveness and prevent overtraining.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {zoneDistribution && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                Training Zone Distribution
              </CardTitle>
              <CardDescription>How your training time is distributed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={zoneDistribution}
                    dataKey="percentage"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.name}: ${entry.percentage.toFixed(0)}%`}
                  >
                    {zoneDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Zone Breakdown</CardTitle>
              <CardDescription>Time spent in each training zone</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {zoneDistribution.map((zone, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{zone.name}</span>
                        <span className="text-sm text-gray-600">{zone.time.toFixed(1)}h ({zone.percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${zone.percentage}%`,
                            backgroundColor: zone.color
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Analysis Modal */}
      {showProfileModal && riderProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-4xl">{getRiderTypeIcon(riderProfile.type)}</span>
                  Rider Profile Analysis
                </h2>
                <p className="text-gray-600 mt-1">Understanding your classification</p>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Season vs Recent Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Season Profile */}
                <div className={`bg-gradient-to-br ${getRiderTypeColor(riderProfile.type)} p-6 rounded-lg text-white`}>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Season Profile
                  </h3>
                  <p className="text-white/80 text-sm mb-4">Based on all activities since Jan 1st</p>
                  <div className="text-5xl font-bold mb-2">{getRiderTypeIcon(riderProfile.type)}</div>
                  <div className="text-2xl font-bold mb-2">{riderProfile.type}</div>
                  <div className="text-white/90 mb-4">{riderProfile.description}</div>
                  <div className="flex items-center justify-between bg-white/20 rounded p-3">
                    <span>Confidence</span>
                    <span className="text-2xl font-bold">{riderProfile.confidence}%</span>
                  </div>
                </div>

                {/* Recent Profile (Last 3 Months) */}
                {recentProfile ? (
                  <div className={`bg-gradient-to-br ${getRiderTypeColor(recentProfile.type)} p-6 rounded-lg text-white`}>
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Recent Form (3 Months)
                    </h3>
                    <p className="text-white/80 text-sm mb-4">Your current training focus</p>
                    <div className="text-5xl font-bold mb-2">{getRiderTypeIcon(recentProfile.type)}</div>
                    <div className="text-2xl font-bold mb-2">{recentProfile.type}</div>
                    <div className="text-white/90 mb-4">{recentProfile.description}</div>
                    <div className="flex items-center justify-between bg-white/20 rounded p-3">
                      <span>Confidence</span>
                      <span className="text-2xl font-bold">{recentProfile.confidence}%</span>
                    </div>
                    {recentProfile.type !== riderProfile.type && (
                      <div className="mt-3 bg-yellow-500/30 border border-yellow-300/50 rounded p-3">
                        <p className="text-sm font-semibold">⚡ Training Shift Detected!</p>
                        <p className="text-xs mt-1">Your recent training differs from your season profile</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-100 p-6 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-600">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-semibold">Not Enough Recent Data</p>
                      <p className="text-sm mt-1">Need 10+ activities in last 3 months</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Why This Classification */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Why You're Classified as a {riderProfile.type}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                    <div>
                      <p className="font-semibold text-gray-900">Power Curve Analysis</p>
                      <p className="text-sm text-gray-700">Your best power outputs across 8 different durations (5s to 60min) show strengths in {riderProfile.type.toLowerCase()} efforts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Terrain Preference</p>
                      <p className="text-sm text-gray-700">Your activity patterns show a preference for terrain that suits {riderProfile.type.toLowerCase()} characteristics</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Consistency Metrics</p>
                      <p className="text-sm text-gray-700">Your power variability and sustained effort patterns align with {riderProfile.type.toLowerCase()} profiles</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Scores */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Strength Scores</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(riderProfile.scores).map(([type, score]) => (
                    <div key={type} className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {type.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="text-2xl font-bold text-blue-600">{score}/7</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all"
                          style={{ width: `${(score / 7) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {score >= 5 ? 'Strong' : score >= 3 ? 'Moderate' : 'Developing'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Recommendations */}
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">💡 Training Recommendations</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Play to your strengths:</strong> Focus on events and training that suit your {riderProfile.type.toLowerCase()} profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Maintain balance:</strong> Don't neglect other areas - well-rounded fitness prevents weaknesses</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    <span><strong>Track changes:</strong> Your profile may evolve with focused training - check back regularly</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderProfile;
