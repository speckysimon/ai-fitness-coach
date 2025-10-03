import React, { useState, useEffect } from 'react';
import { Target, Calendar as CalendarIcon, Sparkles, Send, CheckCircle, Circle, TrendingUp, Clock, RefreshCw, CalendarPlus, Award, Info, Zap as ZapIcon, ChevronDown, ChevronUp, X, AlertCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import SessionHoverModal from '../components/SessionHoverModal';
import ConfirmModal from '../components/ConfirmModal';
import ActivityMatchModal from '../components/ActivityMatchModal';
import { 
  calculateTrainingFocus, 
  calculateRiderTypeProgress, 
  getProgressStatus, 
  getMotivationalMessage 
} from '../lib/trainingPlanMapping';
import {
  matchActivitiesToPlan,
  mergeCompletions,
  getCompletionStatus
} from '../lib/activityMatching';
import confetti from 'canvas-confetti';

const PlanGenerator = ({ stravaTokens, googleTokens, userProfile }) => {
  const [activities, setActivities] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ftp, setFtp] = useState(null);
  const [completedSessions, setCompletedSessions] = useState({});
  const [automaticMatches, setAutomaticMatches] = useState({});
  const [hoveredSession, setHoveredSession] = useState(null);
  const [matchModalSession, setMatchModalSession] = useState(null);
  const [matchModalSessionKey, setMatchModalSessionKey] = useState(null);
  const [planLoadedFromStorage, setPlanLoadedFromStorage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [showMissedDropdown, setShowMissedDropdown] = useState(null);
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startDate: new Date().toISOString().split('T')[0], // Today's date
    eventType: 'Endurance',
    priority: 'High',
    daysPerWeek: 5,
    maxHoursPerWeek: 10,
    preference: 'Both',
  });

  useEffect(() => {
    if (stravaTokens) {
      loadActivities();
    }
    // Load completed sessions from localStorage
    const saved = localStorage.getItem('completed_sessions');
    if (saved) {
      setCompletedSessions(JSON.parse(saved));
    }
    
    // Load existing plan from localStorage
    const savedPlan = localStorage.getItem('training_plan');
    if (savedPlan) {
      setPlan(JSON.parse(savedPlan));
      setPlanLoadedFromStorage(true);
    }
  }, [stravaTokens]);

  // Auto-match activities to plan when either changes
  useEffect(() => {
    if (plan && activities.length > 0) {
      const matches = matchActivitiesToPlan(plan, activities);
      setAutomaticMatches(matches);
    }
  }, [plan, activities]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showMissedDropdown) {
        setShowMissedDropdown(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMissedDropdown]);

  const toggleSessionComplete = (weekNum, sessionIdx) => {
    const key = `${weekNum}-${sessionIdx}`;
    const currentCompletion = completedSessions[key];
    const match = automaticMatches[key];
    
    // Toggle completion with new object format
    const newCompleted = {
      ...completedSessions,
      [key]: currentCompletion && currentCompletion.completed ? null : {
        completed: true,
        automatic: false,
        manualOverride: false,
        activity: match && match.matched ? match.activity : null,
        alignmentScore: match && match.matched ? match.alignmentScore : 100,
        reason: 'Manually marked complete'
      }
    };
    
    setCompletedSessions(newCompleted);
    localStorage.setItem('completed_sessions', JSON.stringify(newCompleted));
    
    // Check if plan is now 100% complete and trigger confetti
    if (plan) {
      const total = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
      const completed = Object.values(newCompleted).filter(c => c && c.completed).length;
      if (completed === total && newCompleted[key]) {
        triggerConfetti();
      }
    }
  };

  const handleManualActivitySelect = (sessionKey, activity) => {
    const newCompleted = {
      ...completedSessions,
      [sessionKey]: {
        completed: true,
        automatic: false,
        manualOverride: true,
        activity: activity,
        alignmentScore: 70, // Manual overrides get 70% weight
        reason: 'Manually selected activity'
      }
    };
    
    setCompletedSessions(newCompleted);
    localStorage.setItem('completed_sessions', JSON.stringify(newCompleted));
  };

  const handleRemoveMatch = (sessionKey) => {
    const newCompleted = {
      ...completedSessions,
      [sessionKey]: null
    };
    
    setCompletedSessions(newCompleted);
    localStorage.setItem('completed_sessions', JSON.stringify(newCompleted));
  };

  const markSessionMissed = (sessionKey, reason) => {
    const newCompleted = {
      ...completedSessions,
      [sessionKey]: {
        completed: false,
        missed: true,
        missedReason: reason,
        missedDate: new Date().toISOString().split('T')[0],
        activity: null,
        alignmentScore: 0
      }
    };
    
    setCompletedSessions(newCompleted);
    localStorage.setItem('completed_sessions', JSON.stringify(newCompleted));
    setShowMissedDropdown(null);
  };

  const undoMissed = (sessionKey) => {
    const newCompleted = {
      ...completedSessions,
      [sessionKey]: null
    };
    
    setCompletedSessions(newCompleted);
    localStorage.setItem('completed_sessions', JSON.stringify(newCompleted));
  };

  const openMatchModal = (session, sessionKey) => {
    setMatchModalSession(session);
    setMatchModalSessionKey(sessionKey);
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const calculateProgress = () => {
    if (!plan) return { completed: 0, total: 0, percentage: 0, autoMatched: 0, manual: 0 };
    
    const total = plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0);
    
    // Merge manual and automatic completions
    const merged = mergeCompletions(completedSessions, automaticMatches);
    const completed = Object.values(merged).filter(c => c && c.completed).length;
    const autoMatched = Object.values(merged).filter(c => c && c.completed && c.automatic).length;
    const manual = Object.values(merged).filter(c => c && c.completed && !c.automatic).length;
    
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage, autoMatched, manual };
  };

  const loadActivities = async () => {
    try {
      const sixWeeksAgo = Math.floor(Date.now() / 1000) - (6 * 7 * 24 * 60 * 60);
      const response = await fetch(
        `/api/strava/activities?access_token=${stravaTokens.access_token}&after=${sixWeeksAgo}&per_page=100`
      );
      const data = await response.json();
      setActivities(data);

      // Calculate FTP for power targets
      const ftpResponse = await fetch('/api/analytics/ftp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities: data }),
      });
      const ftpData = await ftpResponse.json();
      setFtp(ftpData.ftp);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addDatesToSessions = (planData, startDate) => {
    const start = new Date(startDate + 'T00:00:00'); // Ensure proper date parsing
    const dayMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };

    planData.weeks.forEach((week, weekIdx) => {
      // Calculate the start of this week (Monday)
      const weekStartDate = new Date(start);
      weekStartDate.setDate(start.getDate() + (weekIdx * 7));
      
      // Adjust to Monday of this week if start date isn't Monday
      const startDayOfWeek = weekStartDate.getDay();
      const daysUntilMonday = startDayOfWeek === 0 ? 1 : (1 - startDayOfWeek + 7) % 7;
      if (weekIdx === 0 && startDayOfWeek !== 1) {
        // For first week, keep the start date as-is
      } else if (weekIdx > 0) {
        weekStartDate.setDate(weekStartDate.getDate() + daysUntilMonday);
      }
      
      week.sessions.forEach(session => {
        const targetDay = dayMap[session.day];
        const sessionDate = new Date(weekStartDate);
        
        // Calculate days from Monday (1) to target day
        const daysFromMonday = targetDay === 0 ? 6 : targetDay - 1; // Sunday is 6 days from Monday
        sessionDate.setDate(weekStartDate.getDate() + daysFromMonday);
        
        session.date = sessionDate.toISOString().split('T')[0];
        session.dateObj = sessionDate;
      });
    });

    return planData;
  };

  const generatePlan = async (skipConfirmation = false) => {
    // Check if a plan already exists and prompt user
    if (plan && !skipConfirmation) {
      setShowConfirmModal(true);
      return; // Wait for user confirmation via modal
    }
    
    setLoading(true);
    try {
      // Calculate duration in weeks from start date to event date
      const start = new Date(formData.startDate);
      const end = new Date(formData.eventDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.ceil(diffDays / 7)); // At least 1 week
      
      const response = await fetch('/api/training/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities,
          goals: {
            eventName: formData.eventName,
            eventDate: formData.eventDate,
            eventType: formData.eventType,
            priority: formData.priority,
            duration, // Pass calculated duration
          },
          constraints: {
            daysPerWeek: parseInt(formData.daysPerWeek),
            maxHoursPerWeek: parseInt(formData.maxHoursPerWeek),
            preference: formData.preference,
          },
          userProfile, // Pass user profile for personalized training
        }),
      });

      const planData = await response.json();
      
      // Add dates to all sessions
      const planWithDates = addDatesToSessions(planData, formData.startDate);
      
      // Add event type to plan for rider type tracking
      planWithDates.eventType = formData.eventType;
      
      setPlan(planWithDates);
      
      // Save plan to localStorage for persistence
      localStorage.setItem('training_plan', JSON.stringify(planWithDates));
      setPlanLoadedFromStorage(false); // This is a newly generated plan
      
      // Clear completed sessions for new plan
      setCompletedSessions({});
      localStorage.removeItem('completed_sessions');
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncToCalendar = async () => {
    if (!googleTokens) {
      alert('❌ Google Calendar not connected\n\nPlease connect your Google Calendar in Settings first to sync your training plan.');
      return;
    }
    
    if (!plan) {
      alert('❌ No training plan available\n\nPlease generate a training plan first before syncing to calendar.');
      return;
    }

    setSyncing(true);
    try {
      // Convert plan sessions to calendar events with proper dates
      const events = plan.weeks.flatMap((week) =>
        week.sessions.map((session) => {
          // Use the calculated date from the session
          const startTime = new Date(session.date + 'T07:00:00'); // 7 AM local time
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + session.duration);

          // Build detailed description with zone info
          const description = `${session.description}

📊 Training Details:
• Type: ${session.type}
• Duration: ${session.duration} minutes
• Targets: ${session.targets}
• Day: ${session.day}

💡 Click for full workout details in AI Fitness Coach app`;

          return {
            title: `🚴 ${session.title}`,
            description: description,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };
        })
      );

      const response = await fetch('/api/google/calendar/events/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens: googleTokens, events }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully added ${events.length} training sessions to Google Calendar!\n\nCheck your calendar to see all scheduled workouts.`);
      } else {
        throw new Error(result.error || 'Unknown error occurred while syncing');
      }
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      alert(`❌ Failed to sync to calendar\n\n${error.message}\n\nPlease try again or check your Google Calendar permissions in Settings.`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Training Plan Generator</h1>
        <p className="text-gray-600 mt-1">Create a personalized training plan based on your goals and history</p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsFormExpanded(!isFormExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Training Goals
              </CardTitle>
              <CardDescription>Tell us about your target event and preferences</CardDescription>
            </div>
            {isFormExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </CardHeader>
        {isFormExpanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleInputChange}
                placeholder="e.g., Spring Century Ride"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Date
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Endurance">Endurance</option>
                <option value="Gran Fondo">Gran Fondo</option>
                <option value="Criterium">Criterium</option>
                <option value="Time Trial">Time Trial</option>
                <option value="General Fitness">General Fitness</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="High">High (A-race)</option>
                <option value="Medium">Medium (B-race)</option>
                <option value="Low">Low (C-race)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days per Week
              </label>
              <input
                type="number"
                name="daysPerWeek"
                value={formData.daysPerWeek}
                onChange={handleInputChange}
                min="3"
                max="7"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Hours per Week
              </label>
              <input
                type="number"
                name="maxHoursPerWeek"
                value={formData.maxHoursPerWeek}
                onChange={handleInputChange}
                min="3"
                max="20"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Indoor/Outdoor Preference
              </label>
              <select
                name="preference"
                value={formData.preference}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Both">Both</option>
                <option value="Outdoor">Outdoor Only</option>
                <option value="Indoor">Indoor Only</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <Button
              onClick={generatePlan}
              disabled={loading || !formData.eventName}
              className="w-full md:w-auto"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Training Plan
                </>
              )}
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Generated Plan */}
      {plan && (
        <>
        {/* Progress Tracker */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Training Plan Progress
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {calculateProgress().completed} of {calculateProgress().total} sessions completed
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                    <ZapIcon className="w-3 h-3" />
                    {calculateProgress().autoMatched} auto-matched
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded">
                    {calculateProgress().manual} manual
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {calculateProgress().percentage}%
                </div>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${calculateProgress().percentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Working Towards Rider Type */}
        {(() => {
          const merged = mergeCompletions(completedSessions, automaticMatches);
          const trainingFocus = calculateTrainingFocus(plan, merged);
          const eventType = plan.eventType || formData.eventType; // Use saved event type if available
          const riderProgress = calculateRiderTypeProgress(eventType, trainingFocus);
          
          if (!riderProgress) return null;
          
          const progressStatus = getProgressStatus(riderProgress.progress);
          const motivationalMsg = getMotivationalMessage(riderProgress.progress, riderProgress.targetType);
          
          return (
            <Card className="mb-6 border-2 border-purple-200 overflow-hidden">
              <div className={`bg-gradient-to-r ${riderProgress.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{riderProgress.icon}</div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">
                        Working Towards: {riderProgress.targetType}
                      </h3>
                      <p className="text-white/90">{riderProgress.description}</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold">{riderProgress.progress}%</div>
                    <p className="text-white/80 text-sm mt-1">Progress</p>
                  </div>
                </div>
              </div>
              
              <CardContent className="pt-6">
                {/* Status Badge */}
                <div className="mb-6">
                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${progressStatus.bgColor} ${progressStatus.color} font-semibold`}>
                    <Award className="w-4 h-4" />
                    {progressStatus.status} Level
                  </span>
                </div>

                {/* Motivational Message */}
                <div className="mb-6 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <p className="text-purple-900 font-medium">{motivationalMsg}</p>
                </div>

                {/* Target Characteristics */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    Target Characteristics
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {riderProgress.characteristics.map((char, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-purple-600 font-bold">✓</span>
                        <span>{char}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Training Focus Breakdown */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-600" />
                    Training Focus Distribution
                  </h4>
                  <div className="space-y-3">
                    {Object.keys(trainingFocus.plannedPercentages).filter(type => trainingFocus.plannedPercentages[type] > 0).map((sessionType) => {
                      const plannedPct = trainingFocus.plannedPercentages[sessionType];
                      const completedPct = trainingFocus.completedPercentages[sessionType] || 0;
                      const completionRatio = plannedPct > 0 ? (completedPct / plannedPct) * 100 : 0;
                      
                      return (
                        <div key={sessionType}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{sessionType}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Planned: {plannedPct}%</span>
                              <span className="text-sm font-bold text-purple-600">
                                {completedPct}% completed
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(completionRatio, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Completion Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{riderProgress.completionRate}%</div>
                    <div className="text-xs text-gray-600 mt-1">Plan Completion</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{riderProgress.alignmentScore}%</div>
                    <div className="text-xs text-gray-600 mt-1">Training Alignment</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Your Training Plan</CardTitle>
                  {planLoadedFromStorage && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Saved Plan
                    </span>
                  )}
                </div>
                <CardDescription>{plan.planSummary}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={syncToCalendar} 
                  disabled={syncing} 
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {syncing ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="w-4 h-4 mr-2" />
                      Add to Calendar
                    </>
                  )}
                </Button>
                <Button onClick={() => {
                  generatePlan(false); // Will show confirmation since plan exists
                }} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate Plan
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {plan.weeks.map((week) => (
                <div key={week.weekNumber} className="border-l-4 border-blue-500 pl-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      Week {week.weekNumber}: {week.focus}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Total: {week.totalHours}h
                    </p>
                  </div>
                  <div className="space-y-2">
                    {week.sessions.map((session, idx) => {
                      const sessionKey = `${week.weekNumber}-${idx}`;
                      const merged = mergeCompletions(completedSessions, automaticMatches);
                      const completion = merged[sessionKey];
                      const completionStatus = getCompletionStatus(sessionKey, merged, automaticMatches);
                      const isCompleted = completion && completion.completed;
                      const isMissed = completion && completion.missed;
                      
                      // Check if session date has passed (compare date only, not time)
                      const isPastSession = session.date && (() => {
                        const sessionDate = new Date(session.date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        sessionDate.setHours(0, 0, 0, 0);
                        return sessionDate < today;
                      })();
                      
                      return (
                        <div
                          key={idx}
                          className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                            isCompleted 
                              ? `${completionStatus.borderColor} ${completionStatus.bgColor}` 
                              : isMissed
                              ? 'border-red-200 bg-red-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                          }`}
                          onClick={() => setHoveredSession(session)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-2 h-12 rounded ${
                                session.type === 'Recovery' ? 'bg-green-500' :
                                session.type === 'Endurance' ? 'bg-blue-500' :
                                session.type === 'Tempo' ? 'bg-yellow-500' :
                                session.type === 'Threshold' ? 'bg-orange-500' :
                                session.type === 'VO2Max' ? 'bg-red-500' :
                                'bg-purple-500'
                              }`} />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className={`font-semibold ${
                                    isCompleted ? `${completionStatus.color} line-through` : 
                                    isMissed ? 'text-red-700 line-through' :
                                    'text-gray-900'
                                  }`}>
                                    {session.title}
                                  </h4>
                                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                    session.type === 'Recovery' ? 'bg-green-100 text-green-700' :
                                    session.type === 'Endurance' ? 'bg-blue-100 text-blue-700' :
                                    session.type === 'Tempo' ? 'bg-yellow-100 text-yellow-700' :
                                    session.type === 'Threshold' ? 'bg-orange-100 text-orange-700' :
                                    session.type === 'VO2Max' ? 'bg-red-100 text-red-700' :
                                    'bg-purple-100 text-purple-700'
                                  }`}>
                                    {session.type}
                                  </span>
                                  {isMissed && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                                      <X className="w-3 h-3" />
                                      Missed: {completion.missedReason}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm mt-1 ${
                                  isCompleted ? 'text-green-700' : 
                                  isMissed ? 'text-red-700' :
                                  'text-gray-600'
                                }`}>
                                  {session.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {session.duration} min
                                  </span>
                                  <span className="text-gray-500">{session.day}</span>
                                  {session.date && (
                                    <span className="font-medium text-gray-500">
                                      {new Date(session.date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  )}
                                  {isCompleted && completion.automatic && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
                                      <ZapIcon className="w-3 h-3" />
                                      Auto-matched ({completion.alignmentScore}%)
                                    </span>
                                  )}
                                  {isCompleted && completion.manualOverride && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold">
                                      Manual Override ({completion.alignmentScore}%)
                                    </span>
                                  )}
                                  {isCompleted && !completion.automatic && !completion.manualOverride && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-semibold">
                                      Manual
                                    </span>
                                  )}
                                  {!isCompleted && automaticMatches[sessionKey] && automaticMatches[sessionKey].matched && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded font-semibold">
                                      <ZapIcon className="w-3 h-3" />
                                      Activity found ({automaticMatches[sessionKey].alignmentScore}%)
                                    </span>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMatchModal(session, sessionKey);
                                    }}
                                    className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
                                  >
                                    View Match
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4 flex gap-2">
                              {isMissed ? (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    undoMissed(sessionKey);
                                  }}
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50"
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Undo Missed
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSessionComplete(week.weekNumber, idx);
                                    }}
                                    variant={isCompleted ? "default" : "outline"}
                                    className={isCompleted ? 'bg-green-600 hover:bg-green-700' : ''}
                                  >
                                    {isCompleted ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Completed
                                      </>
                                    ) : (
                                      <>
                                        <Circle className="w-4 h-4 mr-2" />
                                        Mark Complete
                                      </>
                                    )}
                                  </Button>
                                  
                                  {isPastSession && !isCompleted && (
                                    <div className="relative">
                                      <Button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowMissedDropdown(showMissedDropdown === sessionKey ? null : sessionKey);
                                        }}
                                        variant="outline"
                                        className="border-red-300 text-red-700 hover:bg-red-50"
                                      >
                                        <X className="w-4 h-4 mr-2" />
                                        Mark Missed
                                      </Button>
                                      
                                      {showMissedDropdown === sessionKey && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border-2 border-gray-200 z-10">
                                          <div className="p-2">
                                            <div className="text-xs font-semibold text-gray-500 px-3 py-2">
                                              Reason for missing:
                                            </div>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markSessionMissed(sessionKey, 'Illness');
                                              }}
                                              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded flex items-center gap-2 text-sm"
                                            >
                                              <AlertCircle className="w-4 h-4 text-red-600" />
                                              Illness
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markSessionMissed(sessionKey, 'Schedule Conflict');
                                              }}
                                              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded flex items-center gap-2 text-sm"
                                            >
                                              <Calendar className="w-4 h-4 text-red-600" />
                                              Schedule Conflict
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                markSessionMissed(sessionKey, 'Other');
                                              }}
                                              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded flex items-center gap-2 text-sm"
                                            >
                                              <User className="w-4 h-4 text-red-600" />
                                              Other
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {plan.notes && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Coach Notes</h4>
                <p className="text-sm text-blue-700">{plan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Detail Modal */}
        {hoveredSession && (
          <SessionHoverModal
            session={hoveredSession}
            ftp={ftp}
            onClose={() => setHoveredSession(null)}
          />
        )}

        {/* Activity Match Modal */}
        <ActivityMatchModal
          isOpen={matchModalSession !== null}
          onClose={() => {
            setMatchModalSession(null);
            setMatchModalSessionKey(null);
          }}
          session={matchModalSession}
          sessionKey={matchModalSessionKey}
          activities={activities}
          currentMatch={matchModalSessionKey ? automaticMatches[matchModalSessionKey] : null}
          onManualSelect={handleManualActivitySelect}
          onRemoveMatch={handleRemoveMatch}
        />
        </>
      )}

      {/* Confirm Replace Plan Modal */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => generatePlan(true)}
        title="Replace Existing Plan?"
        message={`You already have a training plan. Generating a new plan will:

• Replace your current plan
• Clear all progress tracking
• Remove completed session markers

Are you sure you want to continue?`}
        confirmText="Yes, Replace Plan"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default PlanGenerator;
