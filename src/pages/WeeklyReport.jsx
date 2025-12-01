import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Zap, AlertTriangle, Calendar, Trophy, Target, Info, Activity as ActivityIcon, MessageCircle, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import logger from '../lib/logger';
import {
  calculateZoneDistribution,
  generateSmartInsights,
  calculateEfficiencyMetrics
} from '../lib/riderAnalytics';
import { getCoachPersona, getUserCoach } from '../lib/coachPersonas';

const WeeklyReport = ({ stravaTokens }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ftp, setFtp] = useState(null);
  const [weeklyMetrics, setWeeklyMetrics] = useState(null);
  const [lastWeekMetrics, setLastWeekMetrics] = useState(null);
  const [zoneDistribution, setZoneDistribution] = useState(null);
  const [insights, setInsights] = useState([]);
  const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);
  const [question, setQuestion] = useState('');
  const [coachAnswer, setCoachAnswer] = useState(null);
  const [askingCoach, setAskingCoach] = useState(false);

  useEffect(() => {
    if (stravaTokens) {
      loadWeeklyData();
    } else {
      setLoading(false);
    }
  }, [stravaTokens]);

  const loadWeeklyData = async () => {
    setLoading(true);
    try {
      // Load cached activities
      const cachedActivities = localStorage.getItem('cached_activities_recent');
      if (!cachedActivities) {
        console.warn('⚠️ [Weekly Report] No cached activities found. Please visit Dashboard first.');
        setLoading(false);
        return;
      }

      const allActivities = JSON.parse(cachedActivities);
      setActivities(allActivities);

      // Get FTP
      let currentFtp = null;
      const manualFtpValue = localStorage.getItem('manual_ftp');
      if (manualFtpValue) {
        currentFtp = parseInt(manualFtpValue);
      } else {
        const cachedMetrics = localStorage.getItem('cached_metrics');
        if (cachedMetrics) {
          const metrics = JSON.parse(cachedMetrics);
          currentFtp = metrics.ftp;
        }
      }
      setFtp(currentFtp);

      // Calculate 7-day metrics
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7Days = allActivities.filter(a => new Date(a.date) >= sevenDaysAgo);

      const weekMetrics = calculateWeekMetrics(last7Days);
      setWeeklyMetrics(weekMetrics);

      // Calculate previous 7-day metrics for comparison
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const previous7Days = allActivities.filter(a => {
        const date = new Date(a.date);
        return date >= fourteenDaysAgo && date < sevenDaysAgo;
      });
      const prevMetrics = calculateWeekMetrics(previous7Days);
      setLastWeekMetrics(prevMetrics);

      // Calculate zone distribution for last 7 days
      const zones = calculateZoneDistribution(last7Days, currentFtp);
      setZoneDistribution(zones);

      // Generate AI insights for last 7 days
      try {
        const coachId = getUserCoach();
        const coach = getCoachPersona(coachId);

        const insightsResponse = await fetch('/api/analytics/smart-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            activities: last7Days,
            ftp: currentFtp,
            riderType: null, // Not needed for weekly insights
            coachPersona: coach
          })
        });

        if (insightsResponse.ok) {
          const aiInsights = await insightsResponse.json();
          setInsights(aiInsights);
        } else {
          const smartInsights = generateSmartInsights(last7Days, currentFtp, null);
          setInsights(smartInsights);
        }
      } catch (error) {
        logger.error('Error loading AI insights:', error);
        const smartInsights = generateSmartInsights(last7Days, currentFtp, null);
        setInsights(smartInsights);
      }

      // Calculate efficiency metrics for last 4 weeks
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
      const last4Weeks = allActivities.filter(a => new Date(a.date) >= fourWeeksAgo);
      const efficiency = calculateEfficiencyMetrics(last4Weeks, currentFtp);
      setEfficiencyMetrics(efficiency);

    } catch (error) {
      logger.error('Error loading weekly data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWeekMetrics = (activities) => {
    const activityCount = activities.length;
    const totalTime = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    const totalTimeHours = (totalTime / 3600).toFixed(1);
    const totalTSS = activities.reduce((sum, a) => sum + (a.tss || 0), 0);
    const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0);

    // Calculate intensity (IF - Intensity Factor)
    const powerActivities = activities.filter(a => a.avgPower && a.avgPower > 0);
    let avgIntensity = 0;
    if (powerActivities.length > 0 && ftp) {
      avgIntensity = powerActivities.reduce((sum, a) => sum + (a.avgPower / ftp), 0) / powerActivities.length;
    }

    return {
      activityCount,
      totalTimeHours,
      totalTSS: Math.round(totalTSS),
      totalDistance: (totalDistance / 1000).toFixed(0), // km
      avgIntensity: avgIntensity.toFixed(2)
    };
  };

  const getChangeIndicator = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, direction: '→', color: 'text-gray-600' };
    const change = ((current - previous) / previous) * 100;
    const direction = change > 0 ? '↑' : change < 0 ? '↓' : '→';
    const color = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
    return { value: Math.abs(change).toFixed(0), direction, color };
  };

  const getInsightIcon = (iconName) => {
    const icons = {
      Zap, AlertTriangle, TrendingUp, Calendar, Trophy
    };
    return icons[iconName] || Zap;
  };

  const askCoachQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || askingCoach) return;

    setAskingCoach(true);
    setCoachAnswer(null);

    try {
      const coachId = getUserCoach();
      const coach = getCoachPersona(coachId);

      // Get last 7 days activities
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const last7Days = activities.filter(a => new Date(a.date) >= sevenDaysAgo);

      const response = await fetch('/api/analytics/ask-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          activities: last7Days,
          weeklyMetrics,
          ftp,
          zoneDistribution,
          efficiencyMetrics,
          coachPersona: coach
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCoachAnswer(data.answer);
      } else {
        setCoachAnswer('Sorry, I had trouble processing your question. Please try again.');
      }
    } catch (error) {
      logger.error('Error asking coach:', error);
      setCoachAnswer('Sorry, I encountered an error. Please try again later.');
    } finally {
      setAskingCoach(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your weekly report...</p>
        </div>
      </div>
    );
  }

  if (!stravaTokens) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Weekly Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your training performance over the last 7 days</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-orange-400 dark:text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connect Strava to Continue</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                To view your weekly report, please connect your Strava account.
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

  if (!weeklyMetrics || weeklyMetrics.activityCount === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Weekly Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your training performance over the last 7 days</p>
        </div>

        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <ActivityIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Activities This Week</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You haven't logged any activities in the last 7 days. Get out there and ride!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
          <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
          Weekly Report
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Your training performance over the last 7 days</p>
      </div>

      {/* 7-Day Summary Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            Last 7 Days Summary
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your training load and volume</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Activities */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Activities</div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100">{weeklyMetrics.activityCount}</div>
              {lastWeekMetrics && (
                <div className={`text-xs mt-1 ${getChangeIndicator(weeklyMetrics.activityCount, lastWeekMetrics.activityCount).color}`}>
                  {getChangeIndicator(weeklyMetrics.activityCount, lastWeekMetrics.activityCount).direction} {getChangeIndicator(weeklyMetrics.activityCount, lastWeekMetrics.activityCount).value}% vs last week
                </div>
              )}
            </div>

            {/* Hours */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium mb-1">Hours</div>
              <div className="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100">{weeklyMetrics.totalTimeHours}</div>
              {lastWeekMetrics && (
                <div className={`text-xs mt-1 ${getChangeIndicator(parseFloat(weeklyMetrics.totalTimeHours), parseFloat(lastWeekMetrics.totalTimeHours)).color}`}>
                  {getChangeIndicator(parseFloat(weeklyMetrics.totalTimeHours), parseFloat(lastWeekMetrics.totalTimeHours)).direction} {getChangeIndicator(parseFloat(weeklyMetrics.totalTimeHours), parseFloat(lastWeekMetrics.totalTimeHours)).value}% vs last week
                </div>
              )}
            </div>

            {/* TSS */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">TSS</div>
              <div className="text-2xl sm:text-3xl font-bold text-indigo-900 dark:text-indigo-100">{weeklyMetrics.totalTSS}</div>
              {lastWeekMetrics && (
                <div className={`text-xs mt-1 ${getChangeIndicator(weeklyMetrics.totalTSS, lastWeekMetrics.totalTSS).color}`}>
                  {getChangeIndicator(weeklyMetrics.totalTSS, lastWeekMetrics.totalTSS).direction} {getChangeIndicator(weeklyMetrics.totalTSS, lastWeekMetrics.totalTSS).value}% vs last week
                </div>
              )}
            </div>

            {/* Distance */}
            <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">Distance</div>
              <div className="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100">{weeklyMetrics.totalDistance}<span className="text-base sm:text-lg">km</span></div>
              {lastWeekMetrics && (
                <div className={`text-xs mt-1 ${getChangeIndicator(parseFloat(weeklyMetrics.totalDistance), parseFloat(lastWeekMetrics.totalDistance)).color}`}>
                  {getChangeIndicator(parseFloat(weeklyMetrics.totalDistance), parseFloat(lastWeekMetrics.totalDistance)).direction} {getChangeIndicator(parseFloat(weeklyMetrics.totalDistance), parseFloat(lastWeekMetrics.totalDistance)).value}% vs last week
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Insights & Ask Your Coach - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Coach's Comment & Smart Insights */}
        {insights && (insights.insights?.length > 0 || insights.coachComment) && (() => {
          const coachId = getUserCoach();
          const coach = getCoachPersona(coachId);
          const coachComment = insights.coachComment || "Keep up the great work! Your training is on track.";
          const coachName = insights.coachName || coach.name;
          const insightsList = insights.insights || insights;

          return (
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                  {coach.avatar_url ? (
                    <img
                      src={coach.avatar_url}
                      alt={coach.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-yellow-400 dark:border-yellow-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="text-3xl sm:text-4xl flex-shrink-0">{coach.avatar || '👤'}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="truncate">Weekly Insights</span>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">Personalized guidance from {coachName}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {/* Coach Comment */}
                <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="text-xl sm:text-2xl flex-shrink-0">💬</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm sm:text-base text-yellow-900 dark:text-yellow-100 mb-1">Coach's Comment</h4>
                      <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 italic">"{coachComment}"</p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">— {coachName}</p>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                <div className="space-y-2 sm:space-y-3">
                  {(Array.isArray(insightsList) ? insightsList : []).slice(0, 3).map((insight, idx) => {
                    const Icon = getInsightIcon(insight.icon);
                    const priorityColors = {
                      high: 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700',
                      medium: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700',
                      low: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700'
                    };
                    return (
                      <div
                        key={idx}
                        className={`p-3 sm:p-4 rounded-lg border-2 ${priorityColors[insight.priority] || priorityColors.low}`}
                      >
                        <div className="flex items-start gap-2 sm:gap-3">
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">{insight.title}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase font-medium flex-shrink-0">
                                {insight.priority}
                              </span>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{insight.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Ask Your Coach */}
        <Card className="border-2 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
              Ask Your Coach
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Have questions about this week's training? Ask your AI coach!</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={askCoachQuestion} className="space-y-3 sm:space-y-4">
              <div>
                <label htmlFor="coach-question" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Question
                </label>
                <textarea
                  id="coach-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Why was my TSS higher this week? Should I add more recovery rides?"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-h-[100px]"
                  rows="3"
                  disabled={askingCoach}
                />
              </div>

              <button
                type="submit"
                disabled={!question.trim() || askingCoach}
                className="w-full flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg text-sm sm:text-base font-medium transition-colors disabled:cursor-not-allowed min-h-[44px]"
              >
                {askingCoach ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Asking Coach...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Ask Coach
                  </>
                )}
              </button>
            </form>

            {/* Coach's Answer */}
            {coachAnswer && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  {(() => {
                    const coachId = getUserCoach();
                    const coach = getCoachPersona(coachId);
                    return coach.avatar_url ? (
                      <img
                        src={coach.avatar_url}
                        alt={coach.name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-indigo-400 dark:border-indigo-600 flex-shrink-0"
                      />
                    ) : (
                      <div className="text-2xl sm:text-3xl flex-shrink-0">{coach.avatar || '👤'}</div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-indigo-900 dark:text-indigo-100 mb-2 flex items-center gap-2">
                      <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                      Coach's Response
                    </h4>
                    <p className="text-xs sm:text-sm text-indigo-800 dark:text-indigo-200 whitespace-pre-wrap">{coachAnswer}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Example Questions */}
            {!coachAnswer && !askingCoach && (
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Example Questions:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• "Why was my TSS higher/lower this week compared to last week?"</li>
                  <li>• "Should I add more recovery rides based on my current training load?"</li>
                  <li>• "How can I improve my zone 2 endurance training?"</li>
                  <li>• "Am I training too hard or not hard enough?"</li>
                  <li>• "What should I focus on next week to improve?"</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Training Zone Distribution & Aerobic Efficiency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Zone Distribution */}
        {zoneDistribution && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
                Training Zone Distribution
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Last 7 days - How your training time is distributed</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
              <div className="mt-3 sm:mt-4 space-y-2">
                {zoneDistribution.map((zone, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{zone.name}</span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 flex-shrink-0">{zone.time.toFixed(1)}h ({zone.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aerobic Efficiency */}
        {efficiencyMetrics && efficiencyMetrics.data.length > 0 && (
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 dark:text-green-400" />
                Aerobic Efficiency Trend
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Last 4 weeks - Power per heartbeat</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="text-center p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{efficiencyMetrics.currentEfficiency}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Current (W/bpm)</div>
                </div>
                <div className="text-center p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className={`text-xl sm:text-2xl font-bold ${parseFloat(efficiencyMetrics.trend) > 0 ? 'text-green-600 dark:text-green-400' : parseFloat(efficiencyMetrics.trend) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {parseFloat(efficiencyMetrics.trend) > 0 ? '+' : ''}{efficiencyMetrics.trend}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {parseFloat(efficiencyMetrics.trend) > 0 ? 'Improving ↗' : parseFloat(efficiencyMetrics.trend) < 0 ? 'Declining ↘' : 'Stable →'}
                  </div>
                </div>
              </div>
              <div className="h-[150px] sm:h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={efficiencyMetrics.data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      formatter={(value) => [value.toFixed(2), 'Efficiency']}
                    />
                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: '#10b981', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  <Info className="w-3 h-3 inline mr-1" />
                  Higher efficiency = more power with less cardiovascular effort. Improving trend indicates better fitness.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WeeklyReport;
