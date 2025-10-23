import React, { useState, useEffect } from 'react';
import { User, Zap, TrendingUp, Mountain, AlertTriangle, Calendar, Trophy, Target, X, Info, Heart, Activity as ActivityIcon } from 'lucide-react';
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
  const [manualFTP, setManualFTP] = useState('');
  const [fthr, setFthr] = useState(null);
  const [manualFTHR, setManualFTHR] = useState('');
  const [hrZones, setHrZones] = useState(null);
  const [userProfile, setUserProfile] = useState({ weight: 0, height: 0 });
  const [riderProfile, setRiderProfile] = useState(null);
  const [recentProfile, setRecentProfile] = useState(null);
  const [powerCurve, setPowerCurve] = useState(null);
  const [zoneDistribution, setZoneDistribution] = useState(null);
  const [insights, setInsights] = useState([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [zoneModel, setZoneModel] = useState('5-zone'); // HR zone model
  const [maxHR, setMaxHR] = useState(''); // Optional max HR for 7-zone
  const [showZoneInfoModal, setShowZoneInfoModal] = useState(false);

  // Load user profile data (weight, height)
  useEffect(() => {
    const savedProfile = localStorage.getItem('current_user');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        setUserProfile({
          weight: profile.weight || 0,
          height: profile.height || 0
        });
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    }
  }, []);

  // Load FTP and FTHR from cached metrics
  useEffect(() => {
    // Check for manual FTP first
    const savedManualFTP = localStorage.getItem('manual_ftp');
    if (savedManualFTP) {
      setManualFTP(savedManualFTP);
      setFtp(parseInt(savedManualFTP));
    } else {
      // Otherwise load from cached metrics
      const cachedMetrics = localStorage.getItem('cached_metrics');
      if (cachedMetrics) {
        try {
          const metrics = JSON.parse(cachedMetrics);
          setFtp(metrics.ftp || null);
        } catch (error) {
          console.error('Error loading cached metrics:', error);
        }
      }
    }

    // Load manual FTHR from localStorage
    const savedManualFTHR = localStorage.getItem('manual_fthr');
    if (savedManualFTHR) {
      setManualFTHR(savedManualFTHR);
    }

    // Load HR zone model preference
    const savedZoneModel = localStorage.getItem('hr_zone_model');
    if (savedZoneModel) {
      setZoneModel(savedZoneModel);
    }

    // Load max HR
    const savedMaxHR = localStorage.getItem('max_hr');
    if (savedMaxHR) {
      setMaxHR(savedMaxHR);
    }
  }, []);

  // Calculate FTHR when activities, manual FTHR, or zone model changes
  useEffect(() => {
    if (activities.length > 0) {
      calculateFTHR(activities, manualFTHR);
    }
  }, [activities, manualFTHR, zoneModel, maxHR]);

  useEffect(() => {
    if (stravaTokens) {
      loadProfileData();
    } else {
      // No Strava tokens, stop loading
      setLoading(false);
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
      
      // Get FTP for classification - check manual override first, then cached metrics
      let currentFtp = null;
      const manualFtpValue = localStorage.getItem('manual_ftp');
      if (manualFtpValue) {
        currentFtp = parseInt(manualFtpValue);
        console.log('🔧 Using manual FTP for classification:', currentFtp);
      } else {
        const cachedMetrics = localStorage.getItem('cached_metrics');
        if (cachedMetrics) {
          const metrics = JSON.parse(cachedMetrics);
          currentFtp = metrics.ftp;
          console.log('📊 Using cached FTP for classification:', currentFtp);
        }
      }
      console.log('⚡ Final FTP for rider type classification:', currentFtp);

      // Calculate power curve for full season
      const curve = calculatePowerCurve(allActivities);
      setPowerCurve(curve);

      // Classify rider type for full season
      const profile = classifyRiderType(allActivities, curve, currentFtp);
      console.log('🚴 Rider Profile calculated:', profile);
      console.log('🚴 Has scores?', profile?.scores);
      console.log('🚴 Profile type:', profile?.type);
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

  const calculateFTHR = async (acts, manual) => {
    try {
      const manualValue = manual && !isNaN(parseInt(manual)) ? parseInt(manual) : null;
      const maxHRValue = maxHR && !isNaN(parseInt(maxHR)) ? parseInt(maxHR) : null;
      
      const response = await fetch('/api/analytics/fthr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          activities: acts,
          manualFTHR: manualValue,
          zoneModel: zoneModel,
          maxHR: maxHRValue
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setFthr(data.fthr);
        setHrZones(data.zones);
      }
    } catch (error) {
      console.error('Error calculating FTHR:', error);
    }
  };

  const handleZoneModelChange = (newModel) => {
    setZoneModel(newModel);
    localStorage.setItem('hr_zone_model', newModel);
    
    // Recalculate zones with new model
    if (activities.length > 0) {
      calculateFTHR(activities, manualFTHR);
    }
  };

  const handleMaxHRChange = (e) => {
    const value = e.target.value;
    setMaxHR(value);
    
    if (value) {
      localStorage.setItem('max_hr', value);
    } else {
      localStorage.removeItem('max_hr');
    }
  };

  const handleManualFTPChange = (e) => {
    const value = e.target.value;
    setManualFTP(value);
    
    // Save to localStorage and update current FTP
    if (value) {
      localStorage.setItem('manual_ftp', value);
      setFtp(parseInt(value));
    } else {
      localStorage.removeItem('manual_ftp');
      // Reload from cached metrics
      const cachedMetrics = localStorage.getItem('cached_metrics');
      if (cachedMetrics) {
        const metrics = JSON.parse(cachedMetrics);
        setFtp(metrics.ftp || null);
      }
    }
  };

  const handleManualFTHRChange = (e) => {
    const value = e.target.value;
    setManualFTHR(value);
    
    // Save to localStorage
    if (value) {
      localStorage.setItem('manual_fthr', value);
    } else {
      localStorage.removeItem('manual_fthr');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing your rider profile...</p>
        </div>
      </div>
    );
  }

  if (!stravaTokens) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Rider Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your complete performance dashboard</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-orange-400 dark:text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect Strava to Continue</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                To view your rider profile and performance metrics, please connect your Strava account.
              </p>
              <a 
                href="/settings" 
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Go to Settings
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (activities.length < 10) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Rider Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Discover your rider type and training insights</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Not Enough Data Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                We need at least 10 activities to analyze your rider profile and generate insights.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          Rider Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Your complete performance dashboard</p>
      </div>

      {/* Performance Metrics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Your current fitness indicators and training zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* FTP */}
            <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/30 dark:to-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-900 dark:text-yellow-100 uppercase tracking-wide">FTP</span>
              </div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                {ftp ? `${ftp}W` : 'N/A'}
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Functional Threshold Power</p>
            </div>

            {/* FTHR */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-900 dark:text-red-100 uppercase tracking-wide">FTHR</span>
              </div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                {fthr ? `${fthr} BPM` : 'N/A'}
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">Functional Threshold HR</p>
            </div>

            {/* Power-to-Weight */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">W/kg</span>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {ftp && userProfile.weight > 0 ? (ftp / userProfile.weight).toFixed(2) : 'N/A'}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Power-to-Weight Ratio</p>
            </div>

            {/* BMI */}
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <ActivityIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-semibold text-green-900 dark:text-green-100 uppercase tracking-wide">BMI</span>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {userProfile.weight > 0 && userProfile.height > 0 
                  ? (userProfile.weight / Math.pow(userProfile.height / 100, 2)).toFixed(1) 
                  : 'N/A'}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">Body Mass Index</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug logging */}
      {console.log('🔍 Render check - riderProfile:', riderProfile)}
      {console.log('🔍 Render check - riderProfile.scores:', riderProfile?.scores)}
      {console.log('🔍 Render check - condition result:', !!(riderProfile && riderProfile.scores))}

      {/* HR Zones & Rider Type - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HR Training Zones - Left Half */}
        {hrZones && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                    HR Training Zones
                  </CardTitle>
                  <CardDescription>Based on your 6-week FTHR</CardDescription>
                </div>
                <button
                  onClick={() => setShowZoneInfoModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                  title="Learn about zone models"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>

              {/* Zone Model Selector */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  HR Zone Model
                </label>
                <select
                  value={zoneModel}
                  onChange={(e) => handleZoneModelChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="3-zone">3-Zone (Polarized Training)</option>
                  <option value="5-zone">5-Zone (Coggan/Friel) ⭐ Recommended</option>
                  <option value="7-zone">7-Zone (British Cycling)</option>
                </select>
              </div>

              {/* Optional: Max HR input for 7-zone model */}
              {zoneModel === '7-zone' && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Max HR (Optional for 7-Zone)
                  </label>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                    For more accurate Zone 6 & 7 calculations. Leave blank to estimate from FTHR.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={maxHR}
                      onChange={handleMaxHRChange}
                      placeholder="e.g., 190"
                      min="140"
                      max="220"
                      className="w-32 px-3 py-2 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-foreground rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-blue-700 dark:text-blue-300">BPM</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(hrZones).map(([zoneKey, zone], index, allEntries) => {
                  // Extract zone number from key (e.g., "zone1" -> 1)
                  const zoneNumber = parseInt(zoneKey.replace('zone', ''));
                  
                  // Calculate min and max HR across all zones for positioning
                  const allZones = allEntries.map(([, z]) => z);
                  const minHR = Math.min(...allZones.map(z => z.min));
                  const maxHR = Math.max(...allZones.map(z => z.max));
                  const totalRange = maxHR - minHR;
                  
                  // Calculate position and width as percentage of total range
                  const startPercent = ((zone.min - minHR) / totalRange) * 100;
                  const widthPercent = ((zone.max - zone.min) / totalRange) * 100;
                  
                  // Color mapping based on zone number
                  const zoneColorMap = {
                    1: { 
                      bgColor: '#f0fdf4',       // green-50
                      textColor: '#15803d',     // green-700
                      darkBgColor: 'rgba(20, 83, 45, 0.2)' // green-900/20
                    },
                    2: { 
                      bgColor: '#eff6ff',       // blue-50
                      textColor: '#1d4ed8',     // blue-700
                      darkBgColor: 'rgba(30, 58, 138, 0.2)' // blue-900/20
                    },
                    3: { 
                      bgColor: '#fefce8',       // yellow-50
                      textColor: '#a16207',     // yellow-700
                      darkBgColor: 'rgba(113, 63, 18, 0.2)' // yellow-900/20
                    },
                    4: { 
                      bgColor: '#fff7ed',       // orange-50
                      textColor: '#c2410c',     // orange-700
                      darkBgColor: 'rgba(124, 45, 18, 0.2)' // orange-900/20
                    },
                    5: { 
                      bgColor: '#fef2f2',       // red-50
                      textColor: '#b91c1c',     // red-700
                      darkBgColor: 'rgba(127, 29, 29, 0.2)' // red-900/20
                    }
                  };
                  const colors = zoneColorMap[zoneNumber] || zoneColorMap[1];
                  
                  return (
                    <div 
                      key={zoneKey} 
                      className="p-3 rounded-lg border-l-4 dark:bg-opacity-20"
                      style={{ 
                        backgroundColor: colors.bgColor,
                        borderLeftColor: zone.color
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold dark:text-gray-100" style={{ color: colors.textColor }}>
                            Zone {zoneNumber}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{zone.name}</span>
                        </div>
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{zone.min}-{zone.max} BPM</span>
                      </div>
                      <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                        <div 
                          className="h-3 rounded-full transition-all absolute"
                          style={{ 
                            left: `${startPercent}%`,
                            width: `${widthPercent}%`,
                            backgroundColor: zone.color
                          }}
                        />
                      </div>
                      
                      {/* Description */}
                      <p className="text-xs text-gray-600 dark:text-gray-400">{zone.description}</p>
                      
                      {/* Training time recommendation (for 3-zone only) */}
                      {zone.trainingTime && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                          💡 {zone.trainingTime}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rider Type - Right Half */}
        {riderProfile && riderProfile.scores && (
          <Card className="border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
            <div 
              className={`bg-gradient-to-r ${getRiderTypeColor(riderProfile.type)} p-6 text-white cursor-pointer hover:opacity-95 transition-opacity`}
              onClick={() => setShowProfileModal(true)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-5xl">{getRiderTypeIcon(riderProfile.type)}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                    {riderProfile.type}
                    <Info className="w-5 h-5 text-white/80" />
                  </h3>
                  <p className="text-white/90 text-sm">{riderProfile.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-3xl font-bold">{riderProfile.confidence}%</span>
              </div>
            </div>
            <CardContent className="pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Strengths Profile</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(riderProfile.scores).map(([type, score]) => (
                  <div key={type} className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                        {type.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{score}/7</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${(score / 7) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Click card for detailed analysis
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Smart Insights & Manual Overrides - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Insights - Left Half */}
        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                Smart Insights & Recommendations
              </CardTitle>
              <CardDescription>Personalized training guidance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight, idx) => {
                  const Icon = getInsightIcon(insight.icon);
                  const priorityColors = {
                    high: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
                    medium: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700',
                    low: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                  };
                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-lg border-2 ${priorityColors[insight.priority] || priorityColors.low}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase font-medium">
                              {insight.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Overrides - Right Half */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Manual Overrides
            </CardTitle>
            <CardDescription>Override automatic calculations if needed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Manual FTP Override */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <label htmlFor="manualFTP" className="block text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    Manual FTP Override
                  </label>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                    Enter your FTP from a recent test to override automatic calculation.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      id="manualFTP"
                      type="number"
                      value={manualFTP}
                      onChange={handleManualFTPChange}
                      placeholder="e.g., 250"
                      min="50"
                      max="600"
                      className="w-32 px-3 py-2 border border-yellow-300 dark:border-yellow-700 bg-white dark:bg-gray-800 text-foreground rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                    <span className="text-sm text-yellow-700 dark:text-yellow-300">Watts</span>
                    {manualFTP && (
                      <button
                        onClick={() => {
                          setManualFTP('');
                          localStorage.removeItem('manual_ftp');
                          const cachedMetrics = localStorage.getItem('cached_metrics');
                          if (cachedMetrics) {
                            const metrics = JSON.parse(cachedMetrics);
                            setFtp(metrics.ftp || null);
                          }
                        }}
                        className="text-xs text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Manual FTHR Override */}
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <Heart className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <label htmlFor="manualFTHR" className="block text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                    Manual FTHR Override
                  </label>
                  <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                    Enter your FTHR from a recent test to override automatic calculation.
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      id="manualFTHR"
                      type="number"
                      value={manualFTHR}
                      onChange={handleManualFTHRChange}
                      placeholder="e.g., 162"
                      min="100"
                      max="220"
                      className="w-32 px-3 py-2 border border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-foreground rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                    <span className="text-sm text-red-700 dark:text-red-300">BPM</span>
                    {manualFTHR && (
                      <button
                        onClick={() => {
                          setManualFTHR('');
                          localStorage.removeItem('manual_fthr');
                        }}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Insights - Show remaining insights if more than 2 */}
      {insights.length > 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              Additional Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.slice(2).map((insight, idx) => {
                const Icon = getInsightIcon(insight.icon);
                const priorityColors = {
                  high: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
                  medium: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700',
                  low: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                };
                return (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border-2 ${priorityColors[insight.priority] || priorityColors.low}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase font-medium">
                            {insight.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
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
      {showProfileModal && riderProfile && riderProfile.scores && (
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
      {/* Zone Info Modal */}
      {showZoneInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowZoneInfoModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                HR Zone Models Explained
              </h2>
              <button onClick={() => setShowZoneInfoModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 3-Zone Model */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">3-Zone (Polarized Training)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Based on Dr. Stephen Seiler's research on elite endurance athletes.
                </p>
                <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg mb-3">
                  <p className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    80/20 Rule: 80% easy, 20% hard
                  </p>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Minimize time in the "grey zone" (Zone 2) - it's too hard to build base, too easy to improve fitness.
                  </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Best for:</strong> Endurance athletes, marathon runners, long-distance cyclists</p>
              </div>

              {/* 5-Zone Model */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">5-Zone (Coggan/Friel) ⭐ Recommended</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Adapted from Dr. Andrew Coggan's power zones by Joe Friel.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg mb-3">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Most widely used model
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Each zone targets a specific energy system. Good balance between simplicity and granularity.
                  </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Best for:</strong> Most athletes, structured training, periodization</p>
              </div>

              {/* 7-Zone Model */}
              <div className="border-l-4 border-red-500 pl-4">
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">7-Zone (British Cycling)</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Used by British Cycling and Team GB Olympic cyclists.
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg mb-3">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Maximum granularity for elite athletes
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-200">
                    Fine-tuned control for specific race demands. Includes anaerobic and neuromuscular zones.
                  </p>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Best for:</strong> Advanced/elite athletes, professional coaching</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderProfile;
