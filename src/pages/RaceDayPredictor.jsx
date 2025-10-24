import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, Activity, AlertTriangle, Calendar, Trophy, Zap, Info, Moon, Clock, Upload, MapPin, Mountain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, AreaChart } from 'recharts';
import { calculateRaceDayForm } from '../lib/riderAnalytics';
import { parseGPX, generateRouteProfile } from '../lib/gpxParser';
import logger from '../lib/logger';

const RaceDayPredictor = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(null);
  const [selectedRaceDate, setSelectedRaceDate] = useState(new Date().toISOString().split('T')[0]);
  const [ftp, setFtp] = useState(null);
  const [gpxRoute, setGpxRoute] = useState(null);
  const [routeProfile, setRouteProfile] = useState([]);
  const [racePlan, setRacePlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  useEffect(() => {
    if (stravaTokens) {
      loadFormData();
    }
  }, [stravaTokens]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      // Load activities from cache or API
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
        localStorage.setItem('cached_activities', JSON.stringify(allActivities));
      }

      setActivities(allActivities);

      // Get FTP from cache
      const cachedMetrics = localStorage.getItem('cached_metrics');
      let currentFtp = null;
      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        currentFtp = metrics.ftp;
        setFtp(currentFtp);
      }

      // Calculate form for today
      const form = calculateRaceDayForm(allActivities, currentFtp, new Date(selectedRaceDate));
      setFormData(form);

    } catch (error) {
      logger.error('Error loading form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedRaceDate(newDate);
    
    if (activities.length > 0) {
      const form = calculateRaceDayForm(activities, ftp, new Date(newDate));
      setFormData(form);
    }
  };

  const handleGPXUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const parsed = await parseGPX(file);
      setGpxRoute(parsed);
      
      // Generate profile for visualization
      const profile = generateRouteProfile(parsed.points);
      setRouteProfile(profile);
      
      // Clear previous race plan
      setRacePlan(null);
    } catch (error) {
      logger.error('Error parsing GPX:', error);
      alert(`Failed to parse GPX file: ${error.message}`);
    }
  };

  const generateRacePlan = async () => {
    if (!gpxRoute || !formData) {
      alert('Please upload a route and ensure form data is loaded');
      return;
    }

    setGeneratingPlan(true);
    try {
      // Get rider profile from localStorage
      const cachedProfile = localStorage.getItem('rider_profile');
      const riderProfile = cachedProfile ? JSON.parse(cachedProfile) : null;

      // Get training plan status
      const trainingPlan = localStorage.getItem('training_plan');
      const completedSessions = localStorage.getItem('completed_sessions');
      
      let trainingStatus = null;
      if (trainingPlan && completedSessions) {
        const plan = JSON.parse(trainingPlan);
        const completed = JSON.parse(completedSessions);
        const total = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
        const completedCount = Object.values(completed).filter(c => c && c.completed).length;
        
        trainingStatus = {
          completion: Math.round((completedCount / total) * 100),
          targetRiderType: plan.eventType || 'All Rounder',
          alignmentScore: 85 // This would come from actual calculation
        };
      }

      const response = await fetch('/api/race/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeAnalysis: gpxRoute.analysis,
          riderProfile: riderProfile ? {
            type: riderProfile.type,
            ftp: ftp,
            weight: riderProfile.weight,
            strengths: riderProfile.strengths
          } : null,
          currentForm: formData,
          trainingPlan: trainingStatus
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate race plan');
      }

      setRacePlan(data);
    } catch (error) {
      logger.error('Error generating race plan:', error);
      alert(`Failed to generate race plan:\n\n${error.message}\n\nPlease ensure your OpenAI API key is configured in the environment variables.`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const getInsightIcon = (iconName) => {
    const icons = {
      Zap, AlertTriangle, TrendingUp, TrendingDown, Calendar, Moon, Trophy, Activity
    };
    return icons[iconName] || Zap;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-700';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700';
      case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-600';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getTaperPhaseColor = (phase) => {
    switch (phase) {
      case 'build': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'pre-taper': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'taper': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'final-prep': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'post-race': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing your race day form...</p>
        </div>
      </div>
    );
  }

  if (!formData || formData.status === 'insufficient_data') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Race Day Form Predictor
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Predict your race readiness based on training load and recovery</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Not Enough Data Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We need at least 10 activities to predict your race day form.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Keep training and check back soon! Current activities: {activities.length}/10
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
};

const generateRacePlan = async () => {
  if (!gpxRoute || !formData) {
    alert('Please upload a route and ensure form data is loaded');
    return;
  }

  setGeneratingPlan(true);
  try {
    // Get rider profile from localStorage
    const cachedProfile = localStorage.getItem('rider_profile');
    const riderProfile = cachedProfile ? JSON.parse(cachedProfile) : null;

    // Get training plan status
    const trainingPlan = localStorage.getItem('training_plan');
    const completedSessions = localStorage.getItem('completed_sessions');
    
    let trainingStatus = null;
    if (trainingPlan && completedSessions) {
      const plan = JSON.parse(trainingPlan);
      const completed = JSON.parse(completedSessions);
      const total = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
      const completedCount = Object.values(completed).filter(c => c && c.completed).length;
      
      trainingStatus = {
        completion: Math.round((completedCount / total) * 100),
        targetRiderType: plan.eventType || 'All Rounder',
        alignmentScore: 85 // This would come from actual calculation
      };
    }

    const response = await fetch('/api/race/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeAnalysis: gpxRoute.analysis,
        riderProfile: riderProfile ? {
          type: riderProfile.type,
          ftp: ftp,
          weight: riderProfile.weight,
          strengths: riderProfile.strengths
        } : null,
        currentForm: formData,
        trainingPlan: trainingStatus
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.details || data.error || 'Failed to generate race plan');
    }

    setRacePlan(data);
  } catch (error) {
    logger.error('Error generating race plan:', error);
    alert(`Failed to generate race plan:\n\n${error.message}\n\nPlease ensure your OpenAI API key is configured in the environment variables.`);
  } finally {
    setGeneratingPlan(false);
  }
};

const getInsightIcon = (iconName) => {
  const icons = {
    Zap, AlertTriangle, TrendingUp, TrendingDown, Calendar, Moon, Trophy, Activity
  };
  return icons[iconName] || Zap;
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-700';
    case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700';
    case 'low': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700';
    default: return 'border-gray-500 bg-gray-50 dark:bg-gray-800 dark:border-gray-600';
  }
};

const getPriorityBadge = (priority) => {
  switch (priority) {
    case 'high': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    case 'medium': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};

const getTaperPhaseColor = (phase) => {
  switch (phase) {
    case 'build': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
    case 'pre-taper': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    case 'taper': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    case 'final-prep': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
    case 'post-race': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  }
};

if (loading) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Analyzing your race day form...</p>
      </div>
    </div>
  );
}

if (!formData || formData.status === 'insufficient_data') {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Target className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Race Day Form Predictor
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Predict your race readiness based on training load and recovery</p>
      </div>

      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <Target className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Not Enough Data Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We need at least 10 activities to predict your race day form.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keep training and check back soon! Current activities: {activities.length}/10
            </p>
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Race Date
              </label>
              <input
                type="date"
                value={selectedRaceDate}
                onChange={handleDateChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {formData.taperAdvice && formData.taperAdvice.daysToRace !== undefined && (
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formData.taperAdvice.daysToRace}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">days to race</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Readiness Score Card */}
      <Card className="border-2 border-blue-200 overflow-hidden">
        <div className={`bg-gradient-to-r ${formData.statusColor} p-8 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{formData.statusMessage}</h2>
              <p className="text-white/90 text-lg">
                Your predicted race day readiness
              </p>
            </div>
            <div className="text-center">
              <div className="text-7xl font-bold mb-2">{formData.readinessScore}</div>
              <div className="text-white/80 text-lg">Readiness Score</div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Fitness (CTL) */}
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fitness (CTL)</span>
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formData.metrics.fitness}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">42-day average load</div>
            </div>

            {/* Fatigue (ATL) */}
            <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fatigue (ATL)</span>
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="text-3xl font-bold text-orange-600">{formData.metrics.fatigue}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">7-day average load</div>
            </div>

            {/* Form (TSB) */}
            <div className={`p-4 rounded-lg border-2 ${formData.metrics.form >= 5 ? 'bg-green-50 border-green-200' : formData.metrics.form >= 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Form (TSB)</span>
                <TrendingUp className={`w-5 h-5 ${formData.metrics.form >= 5 ? 'text-green-600' : formData.metrics.form >= 0 ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div className={`text-3xl font-bold ${formData.metrics.form >= 5 ? 'text-green-600' : formData.metrics.form >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {formData.metrics.form > 0 ? '+' : ''}{formData.metrics.form}
              </div>
              <div className="text-xs text-gray-500 mt-1">Fitness - Fatigue</div>
            </div>

            {/* Performance Trend */}
            <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance</span>
                {formData.metrics.performanceTrend >= 0 ? 
                  <TrendingUp className="w-5 h-5 text-purple-600" /> : 
                  <TrendingDown className="w-5 h-5 text-purple-600" />
                }
              </div>
              <div className="text-3xl font-bold text-purple-600">
                {formData.metrics.performanceTrend > 0 ? '+' : ''}{formData.metrics.performanceTrend}%
              </div>
              <div className="text-xs text-gray-500 mt-1">2-week trend</div>
            </div>

            {/* Recovery Score */}
            <div className="p-4 bg-indigo-50 rounded-lg border-2 border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Recovery</span>
                <Moon className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="text-3xl font-bold text-indigo-600">{formData.metrics.recoveryScore}</div>
              <div className="text-xs text-gray-500 mt-1">Recovery status</div>
            </div>

            {/* Consistency Score */}
            <div className="p-4 bg-teal-50 rounded-lg border-2 border-teal-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Consistency</span>
                <Calendar className="w-5 h-5 text-teal-600" />
              </div>
              <div className="text-3xl font-bold text-teal-600">{formData.metrics.consistencyScore}%</div>
              <div className="text-xs text-gray-500 mt-1">4-week consistency</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitness & Fatigue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Fitness & Fatigue Progression
          </CardTitle>
          <CardDescription>CTL (Fitness) and ATL (Fatigue) over the last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={formData.chartData.fitnessHistory}>
              <defs>
                <linearGradient id="colorFitness" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorFatigue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis label={{ value: 'Training Load', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="fitness" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorFitness)"
                name="Fitness (CTL)"
              />
              <Area 
                type="monotone" 
                dataKey="fatigue" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorFatigue)"
                name="Fatigue (ATL)"
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              Understanding Fitness & Fatigue
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <strong className="text-blue-600">Fitness (CTL):</strong> Your chronic training load over 42 days. Higher is better, but takes time to build.
              </div>
              <div>
                <strong className="text-orange-600">Fatigue (ATL):</strong> Your acute training load over 7 days. Responds quickly to training and rest.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form (TSB) Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Form (TSB) Progression
          </CardTitle>
          <CardDescription>Training Stress Balance - your readiness to perform</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={formData.chartData.formHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              />
              <YAxis label={{ value: 'Form (TSB)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <ReferenceLine y={5} stroke="#10b981" strokeDasharray="2 2" label="Optimal Min" />
              <ReferenceLine y={15} stroke="#10b981" strokeDasharray="2 2" label="Optimal Max" />
              <Line 
                type="monotone" 
                dataKey="form" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={false}
                name="Form (TSB)"
              />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-green-600" />
              Optimal Form Range
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-700">
              <div>
                <strong className="text-green-600">+5 to +15:</strong> Peak form zone - ideal for racing
              </div>
              <div>
                <strong className="text-yellow-600">0 to +5:</strong> Good form - race ready with slight taper
              </div>
              <div>
                <strong className="text-red-600">Below 0:</strong> Fatigued - need more recovery
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Readiness Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Readiness Score Breakdown
          </CardTitle>
          <CardDescription>How each factor contributes to your overall readiness</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Form Contribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Form (TSB) - 30% weight</span>
                <span className="text-sm font-bold text-purple-600">{formData.breakdown.formContribution}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full transition-all"
                  style={{ width: `${formData.breakdown.formContribution}%` }}
                />
              </div>
            </div>

            {/* Fitness Contribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Fitness (CTL) - 20% weight</span>
                <span className="text-sm font-bold text-blue-600">{formData.breakdown.fitnessContribution}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${formData.breakdown.fitnessContribution}%` }}
                />
              </div>
            </div>

            {/* Performance Contribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Performance Trend - 20% weight</span>
                <span className="text-sm font-bold text-green-600">{formData.breakdown.performanceContribution}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${formData.breakdown.performanceContribution}%` }}
                />
              </div>
            </div>

            {/* Recovery Contribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Recovery Status - 20% weight</span>
                <span className="text-sm font-bold text-indigo-600">{formData.breakdown.recoveryContribution}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all"
                  style={{ width: `${formData.breakdown.recoveryContribution}%` }}
                />
              </div>
            </div>

            {/* Consistency Contribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Consistency - 10% weight</span>
                <span className="text-sm font-bold text-teal-600">{formData.breakdown.consistencyContribution}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-teal-600 h-3 rounded-full transition-all"
                  style={{ width: `${formData.breakdown.consistencyContribution}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taper Advice */}
      {formData.taperAdvice && (
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Taper Strategy
            </CardTitle>
            <CardDescription>Recommended approach based on days to race</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getTaperPhaseColor(formData.taperAdvice.phase)}`}>
                {formData.taperAdvice.phase.toUpperCase().replace('-', ' ')}
              </span>
            </div>
            <p className="text-gray-700 mb-4 font-medium">{formData.taperAdvice.message}</p>
            {formData.taperAdvice.recommendations && formData.taperAdvice.recommendations.length > 0 && (
              <ul className="space-y-2">
                {formData.taperAdvice.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {formData.recommendations && formData.recommendations.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.recommendations.map((rec, idx) => {
              const Icon = getInsightIcon(rec.icon);
              return (
                <Card key={idx} className={`border-l-4 ${getPriorityColor(rec.priority)}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${rec.priority === 'high' ? 'bg-red-100' : rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                        <Icon className={`w-6 h-6 ${rec.priority === 'high' ? 'text-red-600' : rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${getPriorityBadge(rec.priority)}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{rec.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* GPX Route Upload & Race Plan Generator */}
      <Card className="mt-8 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-purple-600" />
            AI Race Plan Generator
          </CardTitle>
          <CardDescription>
            Upload your race route (GPX file) to generate a personalized race strategy based on your current form, rider type, and training status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* GPX Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Race Route (GPX)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".gpx"
                  onChange={handleGPXUpload}
                  className="hidden"
                  id="gpx-upload"
                />
                <label
                  htmlFor="gpx-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {gpxRoute ? gpxRoute.name : 'Choose GPX File'}
                  </span>
                </label>
                {gpxRoute && (
                  <Button
                    onClick={generateRacePlan}
                    disabled={generatingPlan || !formData}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {generatingPlan ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate AI Race Plan
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Route Analysis */}
            {gpxRoute && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Route Stats */}
                <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Route Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Distance</span>
                        <span className="text-lg font-bold text-gray-900">
                          {gpxRoute.analysis.distance.toFixed(1)} km
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Elevation Gain</span>
                        <span className="text-lg font-bold text-gray-900">
                          {gpxRoute.analysis.elevation.gain}m
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Difficulty</span>
                        <span className={`text-lg font-bold ${
                          gpxRoute.analysis.difficulty.color === 'green' ? 'text-green-600' :
                          gpxRoute.analysis.difficulty.color === 'yellow' ? 'text-yellow-600' :
                          gpxRoute.analysis.difficulty.color === 'orange' ? 'text-orange-600' :
                          gpxRoute.analysis.difficulty.color === 'red' ? 'text-red-600' :
                          'text-purple-600'
                        }`}>
                          {gpxRoute.analysis.difficulty.level} ({gpxRoute.analysis.difficulty.score}/100)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Est. Time</span>
                        <span className="text-lg font-bold text-gray-900">
                          {gpxRoute.analysis.estimatedTime.formatted}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Climbs */}
                {gpxRoute.analysis.climbs && gpxRoute.analysis.climbs.length > 0 && (
                  <Card className="bg-gradient-to-br from-orange-50 to-red-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Mountain className="w-5 h-5 text-orange-600" />
                        Key Climbs
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {gpxRoute.analysis.climbs.slice(0, 3).map((climb, idx) => (
                          <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-gray-900">{climb.name}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                climb.category === 'HC' ? 'bg-red-600 text-white' :
                                climb.category === '1' ? 'bg-orange-600 text-white' :
                                climb.category === '2' ? 'bg-yellow-600 text-white' :
                                climb.category === '3' ? 'bg-green-600 text-white' :
                                'bg-gray-600 text-white'
                              }`}>
                                Cat {climb.category}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>{climb.distance.toFixed(1)}km @ {climb.avgGradient}% • {climb.elevationGain}m</div>
                              <div>Starts at {climb.startDistance}km</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Route Profile Chart */}
            {routeProfile.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Elevation Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={routeProfile}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="distance" 
                        label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Elevation (m)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="elevation" 
                        stroke="#8b5cf6" 
                        fill="#c4b5fd" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* AI Generated Race Plan */}
            {racePlan && (
              <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="w-7 h-7 text-green-600" />
                    Your Personalized Race Plan
                  </CardTitle>
                  <CardDescription>
                    AI-generated strategy based on your form, rider type, and the route profile
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {racePlan.overallStrategy && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Overall Strategy</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.overallStrategy}</p>
                      </div>
                    )}

                    {racePlan.preRace && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Pre-Race Preparation</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.preRace}</p>
                      </div>
                    )}

                    {racePlan.startStrategy && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Start Strategy</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.startStrategy}</p>
                      </div>
                    )}

                    {racePlan.segmentPlan && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Segment-by-Segment Plan</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.segmentPlan}</p>
                      </div>
                    )}

                    {racePlan.climbStrategy && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Climb Strategy</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.climbStrategy}</p>
                      </div>
                    )}

                    {racePlan.nutritionPlan && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Nutrition Plan</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.nutritionPlan}</p>
                      </div>
                    )}

                    {racePlan.pacingZones && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Pacing Zones</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.pacingZones}</p>
                      </div>
                    )}

                    {racePlan.contingencyPlans && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Contingency Plans</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.contingencyPlans}</p>
                      </div>
                    )}

                    {racePlan.finalPush && (
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 mb-2">Final Push Strategy</h3>
                        <p className="text-gray-700 whitespace-pre-line">{racePlan.finalPush}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RaceDayPredictor;
