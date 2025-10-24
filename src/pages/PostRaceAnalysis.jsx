import React, { useState, useEffect } from 'react';
import { raceAnalysisService } from '../services/raceAnalysisService';
import { Trophy, TrendingUp, CheckCircle, AlertCircle, Brain, Loader2, Calendar, Clock, Zap, Heart, Target, Award, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';

const PostRaceAnalysis = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [raceActivities, setRaceActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  // Calculate TSS for a single activity
  const calculateTSS = (activity, ftp) => {
    if (!activity.duration) return 0;

    const durationHours = activity.duration / 3600;

    // If we have power data and FTP
    if (activity.normalizedPower && ftp) {
      const intensityFactor = activity.normalizedPower / ftp;
      return Math.round(durationHours * intensityFactor * intensityFactor * 100);
    }

    // Estimate from heart rate if available
    if (activity.avgHeartRate) {
      const estimatedIntensity = activity.avgHeartRate / 170;
      return Math.round(durationHours * estimatedIntensity * estimatedIntensity * 100);
    }

    // Fallback: estimate from duration and type
    const typeMultipliers = {
      'Ride': 1.0,
      'VirtualRide': 1.0,
      'Run': 1.2,
      'Workout': 0.8,
      'default': 0.7,
    };

    const multiplier = typeMultipliers[activity.type] || typeMultipliers.default;
    return Math.round(durationHours * 60 * multiplier);
  };
  
  // Feedback form state
  const [feedback, setFeedback] = useState({
    overallFeeling: 3,
    planAdherence: 'mostly',
    whatWentWell: '',
    whatDidntGoWell: '',
    lessons: '',
    placement: '',
    totalRiders: ''
  });

  useEffect(() => {
    if (stravaTokens) {
      loadActivities();
    } else {
      setLoading(false);
    }
  }, [stravaTokens]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // Load recent activities (last 3 months)
      const threeMonthsAgo = Math.floor(Date.now() / 1000) - (90 * 24 * 60 * 60);
      const response = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${threeMonthsAgo}&per_page=100`
      );
      const data = await response.json();
      setActivities(data);

      // Load race tags
      const sessionToken = localStorage.getItem('session_token');
      if (sessionToken) {
        const raceTagsResponse = await fetch('/api/race-tags', {
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        if (raceTagsResponse.ok) {
          const raceTagsData = await raceTagsResponse.json();
          const raceTags = raceTagsData.raceTags || {};
          
          // Filter for race activities and attach race type
          const races = data.filter(activity => raceTags[activity.id]?.isRace).map(activity => ({
            ...activity,
            raceType: raceTags[activity.id]?.raceType
          }));
          setRaceActivities(races);
        }
      }

      // Load existing analyses from localStorage
      const storedAnalyses = localStorage.getItem('race_analyses');
      if (storedAnalyses) {
        const analyses = JSON.parse(storedAnalyses);
        // Check if any activities have analyses
        data.forEach(activity => {
          if (analyses[activity.id]) {
            activity.analysis = analyses[activity.id];
          }
        });
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectPotentialRaces = () => {
    // Auto-detect potential races based on intensity
    return activities.filter(activity => {
      const hasHighIntensity = activity.normalizedPower && activity.avgPower && 
                               (activity.normalizedPower / activity.avgPower) > 1.05;
      const isLongEnough = activity.duration > 3600; // > 1 hour
      const hasRaceKeywords = activity.name.toLowerCase().match(/race|crit|gran fondo|championship|tt|time trial/);
      
      return hasHighIntensity || hasRaceKeywords || isLongEnough;
    }).slice(0, 10); // Show top 10 potential races
  };

  const handleMarkAsRace = async (activity) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      await fetch('/api/race-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          activityId: activity.id,
          isRace: true
        })
      });

      // Reload activities to update race tags
      loadActivities();
    } catch (error) {
      console.error('Error marking as race:', error);
    }
  };

  const handleStartAnalysis = (activity) => {
    setSelectedActivity(activity);
    setShowFeedbackForm(true);
    setAnalysis(activity.analysis || null);
  };

  const handleFeedbackChange = (field, value) => {
    setFeedback(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateAnalysis = async () => {
    if (!selectedActivity) return;

    setAnalyzing(true);
    try {
      // Get rider profile
      const cachedProfile = localStorage.getItem('rider_profile');
      const riderProfile = cachedProfile ? JSON.parse(cachedProfile) : null;

      // Get race plan if it exists
      const racePlans = JSON.parse(localStorage.getItem('race_plans') || '{}');
      const racePlan = racePlans[selectedActivity.id];

      // Get FTP
      const cachedMetrics = localStorage.getItem('cached_metrics');
      const ftp = cachedMetrics ? JSON.parse(cachedMetrics).ftp : null;

      // Get pre-race activities (14 days before race)
      const raceDate = new Date(selectedActivity.date);
      const fourteenDaysBefore = new Date(raceDate);
      fourteenDaysBefore.setDate(fourteenDaysBefore.getDate() - 14);
      
      const preRaceActivities = activities
        .filter(activity => {
          const activityDate = new Date(activity.date);
          return activityDate >= fourteenDaysBefore && activityDate < raceDate;
        })
        .map(activity => ({
          date: activity.date,
          name: activity.name,
          type: activity.type,
          duration: activity.duration,
          distance: activity.distance,
          avgPower: activity.avgPower,
          normalizedPower: activity.normalizedPower,
          avgHeartRate: activity.avgHeartRate,
          tss: calculateTSS(activity, ftp)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      console.log('Pre-race activities (14 days):', preRaceActivities);

      const response = await fetch('/api/race/analysis/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raceActivity: {
            ...selectedActivity,
            elevation: selectedActivity.totalElevationGain,
            tss: calculateTSS(selectedActivity, ftp)
          },
          racePlan,
          riderProfile: riderProfile ? {
            ...riderProfile,
            ftp
          } : null,
          feedback,
          preRaceActivities
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate analysis');
      }

      const analysisData = await response.json();
      
      // Store analysis with dual-write (localStorage + backend)
      const fullAnalysisData = {
        ...analysisData,
        feedback,
        analyzedAt: new Date().toISOString(),
        activityDate: selectedActivity.date,
        activityId: selectedActivity.id,
        raceName: selectedActivity.name,
        raceDate: selectedActivity.date,
        raceType: selectedActivity.type,
        scores: {
          overall: analysisData.performanceScore,
          pacing: analysisData.pacingScore,
          execution: analysisData.executionScore,
          tactical: analysisData.tacticalScore,
        }
      };
      
      // Save to backend (with localStorage fallback)
      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      if (userProfile.id) {
        await raceAnalysisService.saveAnalysis(
          userProfile.id,
          selectedActivity.id,
          fullAnalysisData
        );
      } else {
        // Fallback to localStorage only
        const storedAnalyses = JSON.parse(localStorage.getItem('race_analyses') || '[]');
        storedAnalyses.push(fullAnalysisData);
        localStorage.setItem('race_analyses', JSON.stringify(storedAnalyses));
      }

      setAnalysis(analysisData);
      setShowFeedbackForm(false);
    } catch (error) {
      console.error('Error generating analysis:', error);
      alert('Failed to generate analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreStars = (score) => {
    const stars = Math.round(score / 20);
    return '⭐'.repeat(stars);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show empty state if Strava not connected
  if (!stravaTokens) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Post-Race Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Analyze your race performance and get AI-powered insights</p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Strava Connection Required</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your Strava account to analyze your race activities.
              </p>
              <Button
                onClick={() => window.location.href = '/settings'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const potentialRaces = detectPotentialRaces();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post-Race Analysis</h1>
        <p className="text-gray-600 mt-1">Analyze your race performance and get AI-powered insights</p>
      </div>

      {/* Recent Races */}
      {raceActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Your Races
            </CardTitle>
            <CardDescription>
              Races you've tagged for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {raceActivities.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{activity.name}</h3>
                      {activity.analysis && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded font-medium">
                          Analyzed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(activity.duration / 60)} min
                      </span>
                      {activity.avgPower && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {Math.round(activity.avgPower)}W
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartAnalysis(activity)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {activity.analysis ? 'View Analysis' : 'Analyze Race'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Potential Races */}
      {potentialRaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Potential Races
            </CardTitle>
            <CardDescription>
              High-intensity activities that might be races
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {potentialRaces.map(activity => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{activity.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(activity.duration / 60)} min
                      </span>
                      {activity.avgPower && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {Math.round(activity.avgPower)}W
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleMarkAsRace(activity)}
                    variant="outline"
                  >
                    Mark as Race
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback Form Modal */}
      {showFeedbackForm && selectedActivity && !analysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Post-Race Feedback
              </h2>
              <p className="text-gray-600 mb-6">
                {selectedActivity.name} • {new Date(selectedActivity.date).toLocaleDateString()}
              </p>

              <div className="space-y-6">
                {/* Overall Feeling */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    How did you feel overall?
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => handleFeedbackChange('overallFeeling', star)}
                        className={`text-3xl ${
                          star <= feedback.overallFeeling ? 'text-yellow-500' : 'text-gray-300'
                        }`}
                      >
                        ⭐
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan Adherence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Did you follow your race plan?
                  </label>
                  <select
                    value={feedback.planAdherence}
                    onChange={(e) => handleFeedbackChange('planAdherence', e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="yes">Yes, closely</option>
                    <option value="mostly">Mostly, with some adjustments</option>
                    <option value="no">No, conditions changed</option>
                    <option value="no_plan">Didn't have a plan</option>
                  </select>
                </div>

                {/* What Went Well */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What went well? (Optional)
                  </label>
                  <Textarea
                    value={feedback.whatWentWell}
                    onChange={(e) => handleFeedbackChange('whatWentWell', e.target.value)}
                    placeholder="e.g., Felt strong on climbs, good positioning, hit nutrition timing..."
                    rows={3}
                  />
                </div>

                {/* What Didn't Go Well */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What didn't go well? (Optional)
                  </label>
                  <Textarea
                    value={feedback.whatDidntGoWell}
                    onChange={(e) => handleFeedbackChange('whatDidntGoWell', e.target.value)}
                    placeholder="e.g., Started too hard, faded in last 20km, missed breakaway..."
                    rows={3}
                  />
                </div>

                {/* Lessons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Any surprises or lessons? (Optional)
                  </label>
                  <Textarea
                    value={feedback.lessons}
                    onChange={(e) => handleFeedbackChange('lessons', e.target.value)}
                    placeholder="e.g., Course was hillier than expected, need more climbing practice..."
                    rows={3}
                  />
                </div>

                {/* Placement */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Placement (Optional)
                    </label>
                    <input
                      type="text"
                      value={feedback.placement}
                      onChange={(e) => handleFeedbackChange('placement', e.target.value)}
                      placeholder="e.g., 2nd"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Total Riders (Optional)
                    </label>
                    <input
                      type="text"
                      value={feedback.totalRiders}
                      onChange={(e) => handleFeedbackChange('totalRiders', e.target.value)}
                      placeholder="e.g., 50"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => setShowFeedbackForm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateAnalysis}
                  disabled={analyzing}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate AI Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Display Modal */}
      {analysis && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                    Race Analysis
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedActivity.name} • {new Date(selectedActivity.date).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAnalysis(null);
                    setSelectedActivity(null);
                  }}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              {/* Performance Scores */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${getScoreColor(analysis.performanceScore)}`}>
                  <div className="text-sm font-medium mb-1">Overall</div>
                  <div className="text-2xl font-bold">{analysis.performanceScore}/100</div>
                  <div className="text-xs mt-1">{getScoreStars(analysis.performanceScore)}</div>
                </div>
                <div className={`p-4 rounded-lg ${getScoreColor(analysis.pacingScore)}`}>
                  <div className="text-sm font-medium mb-1">Pacing</div>
                  <div className="text-2xl font-bold">{analysis.pacingScore}/100</div>
                  <div className="text-xs mt-1">{getScoreStars(analysis.pacingScore)}</div>
                </div>
                <div className={`p-4 rounded-lg ${getScoreColor(analysis.executionScore)}`}>
                  <div className="text-sm font-medium mb-1">Execution</div>
                  <div className="text-2xl font-bold">{analysis.executionScore}/100</div>
                  <div className="text-xs mt-1">{getScoreStars(analysis.executionScore)}</div>
                </div>
                <div className={`p-4 rounded-lg ${getScoreColor(analysis.tacticalScore)}`}>
                  <div className="text-sm font-medium mb-1">Tactical</div>
                  <div className="text-2xl font-bold">{analysis.tacticalScore}/100</div>
                  <div className="text-xs mt-1">{getScoreStars(analysis.tacticalScore)}</div>
                </div>
              </div>

              {/* AI Assessment */}
              <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">AI Coach Assessment</h3>
                    <p className="text-gray-700 leading-relaxed">{analysis.overallAssessment}</p>
                  </div>
                </div>
              </div>

              {/* What Went Well */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  What Went Well
                </h3>
                <ul className="space-y-2">
                  {analysis.whatWentWell.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-green-600 font-bold mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What Didn't Go Well */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  What Didn't Go Well
                </h3>
                <ul className="space-y-2">
                  {analysis.whatDidntGoWell.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-orange-600 font-bold mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Key Insights */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {analysis.keyInsights.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Recommendations for Next Race
                </h3>
                <ul className="space-y-2">
                  {analysis.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-purple-600 font-bold mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Training Focus */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-lg text-gray-900 mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  Training Focus Areas
                </h3>
                <ul className="space-y-2">
                  {analysis.trainingFocus.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <span className="text-blue-600 font-bold mt-1">•</span>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setAnalysis(null);
                    setSelectedActivity(null);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to plan generator with this analysis
                    window.location.href = '/plan';
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  Generate Training Plan
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {raceActivities.length === 0 && potentialRaces.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Races Found</h3>
            <p className="text-gray-600 mb-6">
              Mark your race activities to get AI-powered performance analysis
            </p>
            <Button onClick={() => window.location.href = '/activities'}>
              View All Activities
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PostRaceAnalysis;
