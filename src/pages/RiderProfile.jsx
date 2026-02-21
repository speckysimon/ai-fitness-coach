import React, { useState, useEffect } from 'react';
import { User, Zap, TrendingUp, Mountain, AlertTriangle, Calendar, Trophy, Target, X, Info, Heart, Activity as ActivityIcon, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import logger from '../lib/logger';
import { getCoachPersona, getUserCoach } from '../lib/coachPersonas';
import { MetricTooltip } from '../components/MetricTooltip';
import { fetchUnifiedActivities } from '../lib/activitySync';

const RiderProfile = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ftp, setFtp] = useState(null);
  const [ftpContext, setFtpContext] = useState(null); // Full FTP context from backend
  const [manualFTP, setManualFTP] = useState('');
  const [fthr, setFthr] = useState(null);
  const [fthrContext, setFthrContext] = useState(null); // Full FTHR context from backend
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
  const [hrZonesExpanded, setHrZonesExpanded] = useState(false);
  const [riderTypeExpanded, setRiderTypeExpanded] = useState(false);

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
        logger.error('Error loading user profile:', error);
      }
    }
  }, []);

  // Load manual overrides and preferences from localStorage
  // NOTE: Cache is for SPEED only, not truth. Backend null overrides cached values.
  useEffect(() => {
    // Load manual FTP override (user-set value takes precedence)
    const savedManualFTP = localStorage.getItem('manual_ftp');
    if (savedManualFTP) {
      setManualFTP(savedManualFTP);
      setFtp(parseInt(savedManualFTP));
    }
    // NOTE: We do NOT load FTP from cached_metrics here.
    // FTP will be fetched fresh from backend when activities load.
    // Cache is for speed, not truth.

    // Load manual FTHR override
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
    // Load from Dashboard cache (already includes Strava + Intervals + Manual)
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      // Reload user profile to get latest weight/height
      const savedProfile = localStorage.getItem('current_user');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          setUserProfile({
            weight: profile.weight || 0,
            height: profile.height || 0
          });
        } catch (error) {
          logger.error('Error loading user profile:', error);
        }
      }
      
      logger.info('[Rider Profile] Fetching activities from unified database...');
      
      // Fetch from unified database
      const result = await fetchUnifiedActivities({ windowDays: 90 });
      
      if (!result.ok) {
        logger.error('[Rider Profile] Failed to fetch from database:', result.error);
        setLoading(false);
        return;
      }

      const allActivities = result.data || [];
      logger.info('[Rider Profile] Loaded activities from database:', allActivities.length);
      
      if (allActivities.length === 0) {
        logger.warn('[Rider Profile] No activities found');
        setLoading(false);
        return;
      }

      setActivities(allActivities);

      // Fetch FTP from backend (single source of truth)
      const manualFtpValue = localStorage.getItem('manual_ftp');
      let currentFtp = null;
      
      try {
        const ftpResponse = await fetch('/api/analytics/ftp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            activities: allActivities,
            manualFTP: manualFtpValue ? parseInt(manualFtpValue) : null
          }),
        });
        
        if (ftpResponse.ok) {
          const ftpContextData = await ftpResponse.json();
          currentFtp = ftpContextData.ftp;
          setFtpContext(ftpContextData);
        }
      } catch (error) {
        logger.error('Error fetching FTP from backend:', error);
      }

      setFtp(currentFtp);

      // Fetch power curve from backend (42d current window)
      try {
        const powerCurveResponse = await fetch('/api/analytics/power-curve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: allActivities, windowDays: 42 }),
        });
        
        if (powerCurveResponse.ok) {
          const curveData = await powerCurveResponse.json();
          setPowerCurve(curveData.powerCurve);
        }
      } catch (error) {
        logger.error('Error fetching power curve from backend:', error);
      }

      // Fetch rider type from backend (42d current window)
      try {
        const riderTypeResponse = await fetch('/api/analytics/rider-type', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: allActivities, ftp: currentFtp, windowDays: 42 }),
        });
        
        if (riderTypeResponse.ok) {
          const profileData = await riderTypeResponse.json();
          setRiderProfile(profileData);
        }
      } catch (error) {
        logger.error('Error fetching rider type from backend:', error);
      }

      // Fetch baseline rider type from backend (180d baseline window)
      try {
        const baselineResponse = await fetch('/api/analytics/rider-type', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: allActivities, ftp: currentFtp, windowDays: 180 }),
        });
        
        if (baselineResponse.ok) {
          const baselineData = await baselineResponse.json();
          setRecentProfile(baselineData);
        }
      } catch (error) {
        logger.error('Error fetching baseline rider type from backend:', error);
      }

      // Fetch AI-powered smart insights from backend
      try {
        const coachId = getUserCoach();
        const coach = getCoachPersona(coachId);

        const insightsResponse = await fetch('/api/analytics/smart-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activities: allActivities,
            ftp: currentFtp,
            riderType: null,
            coachPersona: coach
          })
        });

        if (insightsResponse.ok) {
          const aiInsights = await insightsResponse.json();
          setInsights(aiInsights);
        }
      } catch (error) {
        logger.error('Error loading AI insights:', error);
      }

    } catch (error) {
      logger.error('Error loading profile data:', error);
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
        setFthrContext(data); // Store full context for tooltips
        setHrZones(data.zones);
        console.log('📊 [Rider Profile] FTHR context from backend:', data);
      }
    } catch (error) {
      logger.error('Error calculating FTHR:', error);
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
    if (type.includes('Time Trial')) return 'from-indigo-400 to-indigo-600';
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

  // Check if we have any activities (from any source)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading rider profile...</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
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
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Activities Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please visit the Dashboard first to load your activities from Strava, Intervals.icu, or add manual activities.
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
                <MetricTooltip 
                  type="ftp" 
                  iconClassName="text-yellow-600 dark:text-yellow-400"
                  windowDays={ftpContext?.windowDays}
                  updatedAt={ftpContext?.updatedAt}
                  confidence={ftpContext?.confidence}
                  confidenceLevel={ftpContext?.confidenceLevel}
                  reasonCodes={ftpContext?.reasonCodes}
                />
              </div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                {ftp ? `${ftp}W` : 'Insufficient data'}
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Functional Threshold Power</p>
            </div>

            {/* FTHR */}
            <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-900 dark:text-red-100 uppercase tracking-wide">FTHR</span>
                <MetricTooltip 
                  type="fthr" 
                  iconClassName="text-red-600 dark:text-red-400"
                  windowDays={fthrContext?.windowDays}
                  updatedAt={fthrContext?.updatedAt}
                  confidence={fthrContext?.confidence}
                  confidenceLevel={fthrContext?.confidenceLevel}
                  reasonCodes={fthrContext?.reasonCodes}
                />
              </div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                {fthr ? `${fthr} BPM` : 'Not established'}
              </div>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">Functional Threshold HR</p>
            </div>

            {/* Power-to-Weight */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide">W/kg</span>
                <MetricTooltip type="wkg" iconClassName="text-blue-600 dark:text-blue-400" />
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
                <MetricTooltip type="bmi" iconClassName="text-green-600 dark:text-green-400" />
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

      {/* HR Zones & Rider Type - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HR Training Zones - Left Half */}
        {hrZones && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
                    HR Training Zones
                  </CardTitle>
                  <CardDescription>Based on your 6-week FTHR</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowZoneInfoModal(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                    title="Learn about zone models"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setHrZonesExpanded(!hrZonesExpanded)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    title="Toggle zone details"
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-200 ${hrZonesExpanded ? 'transform rotate-180' : ''
                        }`}
                    />
                  </button>
                </div>
              </div>

              {/* Zone Model Selector - Always Visible */}
              <div className="mb-0">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  HR Zone Model
                </label>
                <select
                  value={zoneModel}
                  onChange={(e) => handleZoneModelChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="3-zone">3-Zone (Polarized Training)</option>
                  <option value="5-zone">5-Zone (Coggan/Friel) ⭐ Recommended</option>
                  <option value="7-zone">7-Zone (British Cycling)</option>
                </select>
              </div>
            </CardHeader>
            {hrZonesExpanded && (
              <CardContent className="pt-4">

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
            )}
          </Card>
        )}

        {/* Rider Type - Right Half */}
        {riderProfile && riderProfile.scores && (
          <Card className="border-2 border-blue-200 dark:border-blue-800 overflow-hidden">
            <div
              className={`bg-gradient-to-r ${getRiderTypeColor(riderProfile.type)} p-6 text-white`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="text-5xl">{getRiderTypeIcon(riderProfile.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      {riderProfile.type}
                      <button
                        onClick={() => setShowProfileModal(true)}
                        className="hover:opacity-80 transition-opacity"
                        title="View detailed analysis"
                      >
                        <Info className="w-5 h-5 text-white/80" />
                      </button>
                    </h3>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                      Current ({riderProfile.windowDays || 42}d)
                    </span>
                  </div>
                  <p className="text-white/90 text-sm">{riderProfile.description}</p>
                </div>
                <button
                  onClick={() => setRiderTypeExpanded(!riderTypeExpanded)}
                  className="hover:opacity-80 transition-opacity"
                  title="Toggle strengths profile"
                >
                  <ChevronDown
                    className={`w-6 h-6 text-white transition-transform duration-200 ${riderTypeExpanded ? 'transform rotate-180' : ''
                      }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
                <span className="text-sm font-medium">Confidence</span>
                <span className="text-3xl font-bold">{riderProfile.confidence}%</span>
              </div>
            </div>
            {riderTypeExpanded && (
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
                  Click Info icon for detailed analysis
                </p>
              </CardContent>
            )}
          </Card>
        )}
      </div>

      {/* Manual Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

      {/* Power Curve Analysis */}
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
