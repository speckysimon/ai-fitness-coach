import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Zap as ZapIcon, 
  Clock, 
  CheckCircle, 
  Circle,
  X, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  CalendarPlus, 
  Award, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  User,
  Target,
  Sparkles,
  Brain,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import SessionHoverModal from '../components/SessionHoverModal';
import ConfirmModal from '../components/ConfirmModal';
import ActivityMatchModal from '../components/ActivityMatchModal';
import AdaptivePlanModal from '../components/AdaptivePlanModal';
import SuccessModal from '../components/SuccessModal';
import { 
  calculateTrainingFocus, 
  calculateRiderTypeProgress, 
  getProgressStatus, 
  getMotivationalMessage 
} from '../lib/trainingPlanMapping';
import { getCoachPersona, getUserCoach } from '../lib/coachPersonas';
import {
  matchActivitiesToPlan,
  mergeCompletions,
  getCompletionStatus
} from '../lib/activityMatching';
import confetti from 'canvas-confetti';
import { planService } from '../services/planService';
import { migrationService } from '../services/migrationService';

const PlanGenerator = ({ stravaTokens, googleTokens, userProfile }) => {
  const [activities, setActivities] = useState([]);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ftp, setFtp] = useState(null);
  const [fthr, setFthr] = useState(null);
  const [hrZones, setHrZones] = useState(null);
  const [completedSessions, setCompletedSessions] = useState({});
  const [automaticMatches, setAutomaticMatches] = useState({});
  const [hoveredSession, setHoveredSession] = useState(null);
  const [matchModalSession, setMatchModalSession] = useState(null);
  const [matchModalSessionKey, setMatchModalSessionKey] = useState(null);
  const [planLoadedFromStorage, setPlanLoadedFromStorage] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(true);
  const [isCoachNotesExpanded, setIsCoachNotesExpanded] = useState(false);
  const [showMissedDropdown, setShowMissedDropdown] = useState(null);
  const [illnessHistory, setIllnessHistory] = useState([]);
  const [showAdaptiveModal, setShowAdaptiveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
  const [expandedWeeks, setExpandedWeeks] = useState({});
  const [isRiderTypeExpanded, setIsRiderTypeExpanded] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [backendSyncStatus, setBackendSyncStatus] = useState('idle'); // idle, syncing, synced, error
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startDate: new Date().toISOString().split('T')[0], // Today's date
    eventType: 'Endurance',
    priority: 'High Priority',
    daysPerWeek: 5,
    maxHoursPerWeek: 10,
    preference: 'Both',
    aiContext: '',
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
    
    // Load existing plan from backend (with localStorage fallback)
    loadPlanFromBackend();
    
    // Check if migration is needed
    checkMigrationStatus();
    
    // Load illness/injury history
    loadIllnessHistory();
  }, [stravaTokens]);

  const loadPlanFromBackend = async () => {
    if (!userProfile?.id) {
      // No user ID, fall back to localStorage
      const savedPlan = localStorage.getItem('training_plan');
      if (savedPlan) {
        setPlan(JSON.parse(savedPlan));
        setPlanLoadedFromStorage(true);
        setIsFormExpanded(false);
      }
      return;
    }

    try {
      const result = await planService.loadPlan(userProfile.id);
      
      if (result.plan) {
        setPlan(result.plan);
        setPlanLoadedFromStorage(true);
        setIsFormExpanded(false);
        
        if (result.planId) {
          setCurrentPlanId(result.planId);
        }
        
        if (result.needsMigration) {
          setMigrationNeeded(true);
        }
        
        setBackendSyncStatus(result.source === 'backend' ? 'synced' : 'localStorage');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      setBackendSyncStatus('error');
    }
  };

  const checkMigrationStatus = () => {
    const status = migrationService.getMigrationStatus();
    if (status.needsAnyMigration) {
      setMigrationNeeded(true);
    }
  };

  // Helper function to save plan with dual-write (localStorage + backend)
  const savePlanWithBackend = async (planData) => {
    if (!userProfile?.id) {
      // No user ID, just save to localStorage
      localStorage.setItem('training_plan', JSON.stringify(planData));
      return;
    }

    try {
      setBackendSyncStatus('syncing');
      
      if (currentPlanId) {
        // Update existing plan
        await planService.updatePlan(currentPlanId, planData);
      } else {
        // Save new plan
        const result = await planService.savePlan(userProfile.id, planData);
        if (result.planId) {
          setCurrentPlanId(result.planId);
        }
      }
      
      setBackendSyncStatus('synced');
    } catch (error) {
      console.error('Error saving plan to backend:', error);
      setBackendSyncStatus('error');
    }
  };

  const loadIllnessHistory = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) return;

      const response = await fetch('/api/adaptation/history', {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setIllnessHistory(data.events || []);
      }
    } catch (error) {
      logger.error('Error loading illness history:', error);
    }
  };

  const loadRaceHistory = () => {
    const storedAnalyses = localStorage.getItem('race_analyses');
    if (!storedAnalyses) return [];
    
    const analyses = JSON.parse(storedAnalyses);
    
    // Convert to array and sort by date (most recent first)
    return Object.entries(analyses)
      .map(([activityId, analysis]) => ({
        activityId,
        ...analysis
      }))
      .sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
      .slice(0, 3); // Last 3 races
  };

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

  // Initialize expanded weeks when plan changes - only expand current week
  useEffect(() => {
    if (plan) {
      const currentWeekNumber = getCurrentWeek(plan);
      const initialExpanded = {};
      plan.weeks.forEach(week => {
        initialExpanded[week.weekNumber] = week.weekNumber === currentWeekNumber;
      });
      setExpandedWeeks(initialExpanded);
    }
  }, [plan?.generatedAt, plan?.coachNotes?.length]); // Re-run when plan is regenerated or adjusted

  // Helper function to determine current week based on today's date
  const getCurrentWeek = (plan) => {
    if (!plan || !plan.weeks || plan.weeks.length === 0) return 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find which week contains today's date
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        if (session.date) {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          
          // Check if this session's week contains today
          const weekStart = new Date(sessionDate);
          weekStart.setDate(sessionDate.getDate() - sessionDate.getDay() + 1); // Monday of this week
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6); // Sunday of this week
          
          if (today >= weekStart && today <= weekEnd) {
            return week.weekNumber;
          }
        }
      }
    }
    
    // If no week contains today, return the first week with future sessions
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        if (session.date) {
          const sessionDate = new Date(session.date);
          sessionDate.setHours(0, 0, 0, 0);
          if (sessionDate >= today) {
            return week.weekNumber;
          }
        }
      }
    }
    
    // Default to first week
    return 1;
  };

  const toggleWeekExpanded = (weekNumber) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [weekNumber]: !prev[weekNumber]
    }));
  };

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

  const refreshAccessToken = async () => {
    if (!stravaTokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('/api/strava/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: stravaTokens.refresh_token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.requiresReauth) {
          throw new Error('REAUTH_REQUIRED');
        }
        throw new Error(errorData.error || 'Failed to refresh token');
      }

      const data = await response.json();
      
      // Backend returns { success: true, tokens: {...} }
      const tokenData = data.tokens || data;
      
      // Update tokens in localStorage
      const newTokens = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at,
      };
      localStorage.setItem('strava_tokens', JSON.stringify(newTokens));
      
      return newTokens;
    } catch (error) {
      logger.error('Token refresh error:', error);
      throw error;
    }
  };

  const loadActivities = async () => {
    if (!stravaTokens) {
      return;
    }

    try {
      let tokensToUse = { ...stravaTokens };
      
      // Check if token is expired and refresh if needed
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (tokensToUse.expires_at && tokensToUse.expires_at < nowSeconds) {
        try {
          tokensToUse = await refreshAccessToken();
        } catch (refreshError) {
          if (refreshError.message === 'REAUTH_REQUIRED') {
            alert('Your Strava session has expired. Please reconnect Strava in Settings.');
            return;
          }
          throw refreshError;
        }
      }

      const sixWeeksAgo = Math.floor(Date.now() / 1000) - (6 * 7 * 24 * 60 * 60);
      const response = await fetch(
        `/api/strava/activities?access_token=${tokensToUse.access_token}&after=${sixWeeksAgo}&per_page=100`
      );

      // Handle 401/403 errors by refreshing token and retrying
      if (response.status === 401 || response.status === 403) {
        try {
          const newTokens = await refreshAccessToken();
          
          // Wait a moment for token to propagate
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the request with new token
          const retryResponse = await fetch(
            `/api/strava/activities?access_token=${newTokens.access_token}&after=${sixWeeksAgo}&per_page=100`
          );
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            setActivities(data);

            // Calculate FTP for power targets
            const ftpResponse = await fetch('/api/analytics/ftp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activities: data }),
            });
            const ftpData = await ftpResponse.json();
            setFtp(ftpData.ftp);

            // Calculate FTHR and HR zones
            const fthrResponse = await fetch('/api/analytics/fthr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activities: data }),
            });
            const fthrData = await fthrResponse.json();
            setFthr(fthrData.fthr);
            setHrZones(fthrData.zones);
            return;
          } else {
            const errorText = await retryResponse.text();
            logger.error('Retry failed:', retryResponse.status, errorText);
          }
        } catch (refreshError) {
          logger.error('Token refresh error:', refreshError);
        }
      }

      // Try to parse response even if status isn't perfect
      if (response.ok) {
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

        // Calculate FTHR and HR zones
        const fthrResponse = await fetch('/api/analytics/fthr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activities: data }),
        });
        const fthrData = await fthrResponse.json();
        setFthr(fthrData.fthr);
        setHrZones(fthrData.zones);
      } else {
        logger.error('Failed to fetch activities:', response.status);
        setActivities([]);
        setFtp(null);
        setFthr(null);
        setHrZones(null);
      }
    } catch (error) {
      logger.error('Error loading activities:', error);
      setActivities([]);
      setFtp(null);
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
        
        // Fix day name to match actual date
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        session.day = dayNames[sessionDate.getDay()];
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
      
      // Calculate enhanced metrics
      const bmi = userProfile?.weight && userProfile?.height 
        ? (userProfile.weight / ((userProfile.height / 100) ** 2))
        : null;
      
      const powerToWeight = ftp && userProfile?.weight
        ? (ftp / userProfile.weight)
        : null;

      // Load race history for AI integration
      const raceHistory = loadRaceHistory();
      const latestRace = raceHistory[0];

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
            aiContext: formData.aiContext || undefined, // Pass AI context if provided
          },
          constraints: {
            daysPerWeek: parseInt(formData.daysPerWeek),
            maxHoursPerWeek: parseInt(formData.maxHoursPerWeek),
            preference: formData.preference,
          },
          userProfile, // Pass user profile for personalized training
          illnessHistory, // Pass illness/injury history for safer plan generation
          athleteMetrics: {
            ftp,
            fthr,
            hrZones,
            bmi,
            powerToWeight,
            weight: userProfile?.weight,
            height: userProfile?.height,
            age: userProfile?.age,
            gender: userProfile?.gender
          },
          // Include race history for AI learning loop
          raceHistory: raceHistory.map(race => ({
            date: race.activityDate,
            performanceScore: race.performanceScore,
            pacingScore: race.pacingScore,
            executionScore: race.executionScore,
            tacticalScore: race.tacticalScore,
            whatWentWell: race.whatWentWell,
            whatDidntGoWell: race.whatDidntGoWell,
            trainingFocus: race.trainingFocus,
            recommendations: race.recommendations
          })),
          // Training priorities from latest race
          trainingPriorities: latestRace ? {
            primary: latestRace.trainingFocus[0],
            weaknesses: latestRace.whatDidntGoWell.slice(0, 3),
            strengths: latestRace.whatWentWell.slice(0, 3),
            pacingScore: latestRace.pacingScore
          } : null
        }),
      });

      const planData = await response.json();
      
      // Add dates to all sessions
      const planWithDates = addDatesToSessions(planData, formData.startDate);
      
      // Add event type to plan for rider type tracking
      planWithDates.eventType = formData.eventType;
      
      // Add coach note if race history exists
      if (raceHistory.length > 0) {
        const raceNote = {
          message: `This plan has been customized based on your recent race analysis. Key focus: ${latestRace.trainingFocus[0]}. We're addressing your pacing (${latestRace.pacingScore}/100) and building on your strength in ${latestRace.whatWentWell[0]}.`,
          timestamp: new Date().toISOString(),
          type: 'Race Integration'
        };
        
        planWithDates.coachNotes = [raceNote, ...(planWithDates.coachNotes || [])];
      }
      
      setPlan(planWithDates);
      
      // Save plan with dual-write (localStorage + backend)
      await savePlanWithBackend(planWithDates);
      setPlanLoadedFromStorage(false); // This is a newly generated plan
      
      // Clear completed sessions for new plan
      setCompletedSessions({});
      localStorage.removeItem('completed_sessions');
    } catch (error) {
      logger.error('Error generating plan:', error);
      alert('Failed to generate training plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAdjustments = async (adjustedPlan, explanation) => {
    // Preserve plan metadata but recalculate dates if days changed
    const planWithPreservedDates = {
      ...adjustedPlan,
      eventType: plan.eventType || formData.eventType,
      goals: plan.goals, // Preserve original goals
      generatedAt: plan.generatedAt, // Preserve original generation time
    };

    // Helper to get day offset from week start (Monday = 0)
    const getDayOffset = (dayName) => {
      const days = {
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
      };
      return days[dayName] || 0;
    };

    // Map dates intelligently - preserve if day unchanged, recalculate if day changed
    planWithPreservedDates.weeks = planWithPreservedDates.weeks.map((week, weekIdx) => {
      const originalWeek = plan.weeks[weekIdx];
      if (!originalWeek) return week; // New week added, keep AI-generated dates

      // Get the Monday of this week by finding a session with matching day name
      // This is more reliable than calculating from any date
      let weekStartDate = null;
      
      // First, try to find a Monday in the original week
      const mondaySession = originalWeek.sessions.find(s => s.day === 'Monday' && s.date);
      if (mondaySession) {
        weekStartDate = new Date(mondaySession.date);
      } else {
        // If no Monday, calculate from any session with a known day
        for (const session of originalWeek.sessions) {
          if (session.date && session.day) {
            const sessionDate = new Date(session.date);
            const dayOffset = getDayOffset(session.day);
            weekStartDate = new Date(sessionDate);
            weekStartDate.setDate(sessionDate.getDate() - dayOffset);
            break;
          }
        }
      }

      return {
        ...week,
        sessions: week.sessions.map((session, sessionIdx) => {
          const originalSession = originalWeek.sessions[sessionIdx];
          if (!originalSession) return session; // New session added, keep AI-generated date

          // Check if the day of week changed
          const dayChanged = session.day !== originalSession.day;
          
          if (dayChanged && weekStartDate) {
            // Recalculate date based on new day of week
            const newDate = new Date(weekStartDate);
            newDate.setDate(weekStartDate.getDate() + getDayOffset(session.day));
            
            return {
              ...session,
              date: newDate.toISOString().split('T')[0],
              dateObj: newDate,
              dateFormatted: newDate.toISOString().split('T')[0],
            };
          } else {
            // Day unchanged, preserve the original date
            return {
              ...session,
              date: originalSession.date,
              dateObj: originalSession.dateObj,
              dateFormatted: originalSession.dateFormatted,
            };
          }
        })
      };
    });

    // Append new coach note to existing notes (don't overwrite)
    const existingNotes = plan.coachNotes || [];
    const newNotes = adjustedPlan.coachNotes || [];
    
    // Add the new adjustment note with current timestamp
    const adjustmentNote = {
      message: explanation,
      timestamp: new Date().toISOString(),
      type: 'Adjustment'
    };
    
    planWithPreservedDates.coachNotes = [...existingNotes, adjustmentNote];
    
    // Save adjusted plan with dual-write (localStorage + backend)
    setPlan(planWithPreservedDates);
    await savePlanWithBackend(planWithPreservedDates);
    
    // Re-run activity matching to match activities to adjusted sessions
    // This will automatically match the completed activity to the correct session
    if (activities.length > 0) {
      const matches = matchActivitiesToPlan(planWithPreservedDates, activities);
      setAutomaticMatches(matches);
    }
    
    // Show success modal
    setSuccessMessage({
      title: 'Plan Adjusted Successfully!',
      message: explanation
    });
    setShowSuccessModal(true);
  };

  const syncToCalendar = async () => {
    if (!googleTokens) {
      alert('Google Calendar not connected. Please connect in Settings first.');
      return;
    }
    
    if (!plan) {
      alert('No training plan available. Please generate a plan first.');
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

💡 Click for full workout details in RiderLabs app`;

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
        alert(`Successfully added ${events.length} training sessions to Google Calendar!`);
      } else {
        throw new Error(result.error || 'Unknown error occurred while syncing');
      }
    } catch (error) {
      logger.error('Error syncing to calendar:', error);
      alert(`Failed to sync to calendar: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Coach</h1>
        <p className="text-gray-600 mt-1">Your personal AI cycling coach - create and adapt training plans based on your goals</p>
      </div>

      {/* Race Integration Indicator */}
      {(() => {
        const raceHistory = loadRaceHistory();
        if (raceHistory.length === 0) return null;
        const latestRace = raceHistory[0];
        
        return (
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Brain className="w-6 h-6 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    AI Will Use Your Race Data
                    <Award className="w-5 h-5 text-purple-600" />
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Your training plan will be customized based on your recent race performance:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Addressing pacing issues (Score: {latestRace.pacingScore}/100)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Building on your strengths: {latestRace.whatWentWell[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Focus: {latestRace.trainingFocus[0]}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-200">
                    <Button
                      onClick={() => window.location.href = '/race-analysis'}
                      variant="outline"
                      size="sm"
                      className="text-purple-600 border-purple-300 hover:bg-purple-50"
                    >
                      View Full Race Analysis
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
              <label className="block text-sm font-medium text-foreground mb-2">
                Event Name
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleInputChange}
                placeholder="e.g., Spring Century Ride"
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Event Date {formData.eventType === 'Off-Season Training' && <span className="text-muted-foreground">(Optional)</span>}
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Event Type
              </label>
              <select
                name="eventType"
                value={formData.eventType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="Endurance">Endurance</option>
                <option value="Gran Fondo">Gran Fondo</option>
                <option value="Criterium">Criterium</option>
                <option value="Time Trial">Time Trial</option>
                <option value="General Fitness">General Fitness</option>
                <option value="Off-Season Training">Off-Season Training</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Priority
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="Peak Performance">Peak Performance - A-race, most important event</option>
                <option value="High Priority">High Priority - B-race, important event</option>
                <option value="Moderate Priority">Moderate Priority - C-race, tune-up event</option>
                <option value="Maintenance">Maintenance - Stay fit, no specific goal</option>
                <option value="Base Building">Base Building - Off-season foundation</option>
                <option value="Recovery/Comeback">Recovery/Comeback - Post-injury or break</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Days per Week
              </label>
              <input
                type="number"
                name="daysPerWeek"
                value={formData.daysPerWeek}
                onChange={handleInputChange}
                min="3"
                max="7"
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Hours per Week
              </label>
              <input
                type="number"
                name="maxHoursPerWeek"
                value={formData.maxHoursPerWeek}
                onChange={handleInputChange}
                min="3"
                max="20"
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Indoor/Outdoor Preference
              </label>
              <select
                name="preference"
                value={formData.preference}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
              >
                <option value="Both">Both</option>
                <option value="Outdoor">Outdoor Only</option>
                <option value="Indoor">Indoor Only</option>
              </select>
            </div>
          </div>

          {/* Athlete Metrics Indicator */}
          {(ftp || fthr || userProfile?.weight) && (
            <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    ✓ Athlete Metrics Detected
                  </h4>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mb-3">
                    Your AI coach has analyzed your performance data to create a plan matched to your current fitness level.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ftp && (
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded">
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">FTP</div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">{ftp}W</div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">Power Threshold</div>
                      </div>
                    )}
                    {fthr && (
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded">
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">FTHR</div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">{fthr} bpm</div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">HR Threshold</div>
                      </div>
                    )}
                    {ftp && userProfile?.weight && (
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded">
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Power/Weight</div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {(ftp / userProfile.weight).toFixed(2)}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">W/kg</div>
                      </div>
                    )}
                    {userProfile?.weight && userProfile?.height && (
                      <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded">
                        <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">BMI</div>
                        <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
                          {((userProfile.weight / ((userProfile.height / 100) ** 2))).toFixed(1)}
                        </div>
                        <div className="text-xs text-purple-700 dark:text-purple-300">Body Mass Index</div>
                      </div>
                    )}
                  </div>
                  {hrZones && (
                    <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                        💓 HR Training Zones (based on 6-week FTHR)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                        {Object.entries(hrZones).map(([key, zone]) => (
                          <div key={key} className="p-2 rounded" style={{ backgroundColor: `${zone.color}20`, borderLeft: `3px solid ${zone.color}` }}>
                            <div className="font-semibold" style={{ color: zone.color }}>
                              Z{key.replace('zone', '')} - {zone.name}
                            </div>
                            <div className="text-purple-700 dark:text-purple-300 mt-1">
                              {zone.min}-{zone.max} bpm
                            </div>
                            <div className="text-purple-600 dark:text-purple-400 mt-1">
                              {zone.percentage}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Illness/Injury History Indicator */}
          {illnessHistory.length > 0 && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    ✓ Health History Detected
                  </h4>
                  <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                    Your AI coach is aware of {illnessHistory.length} recorded health {illnessHistory.length === 1 ? 'event' : 'events'} and will create a safer, more personalized plan.
                  </p>
                  <div className="space-y-2">
                    {illnessHistory.slice(0, 3).map((event, idx) => {
                      const startDate = new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing';
                      const isRecent = event.end_date && (new Date() - new Date(event.end_date)) < (30 * 24 * 60 * 60 * 1000); // Within 30 days
                      
                      return (
                        <div key={idx} className={`text-xs p-2 rounded ${isRecent ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700' : 'bg-green-100 dark:bg-green-900/30'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-green-900 dark:text-green-100">
                              {event.category} - {event.severity}
                            </span>
                            {isRecent && (
                              <span className="text-orange-700 dark:text-orange-300 text-xs font-semibold">
                                Recent
                              </span>
                            )}
                          </div>
                          <div className="text-green-700 dark:text-green-300 mt-1">
                            {startDate} → {endDate}
                          </div>
                          {event.notes && (
                            <div className="text-green-600 dark:text-green-400 mt-1 italic">
                              "{event.notes}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {illnessHistory.length > 3 && (
                      <p className="text-xs text-green-600 dark:text-green-400 italic">
                        + {illnessHistory.length - 3} more {illnessHistory.length - 3 === 1 ? 'event' : 'events'} in history
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Coaching Context Section */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label htmlFor="aiContext" className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Tell Your AI Coach More (Optional)
                </label>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  Share additional context about your training history, goals, constraints, 
                  or preferences to help create a more personalized plan. This information will be used when you press <span className="font-semibold">"Generate Training Plan"</span> below.
                </p>
                {plan && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mb-3 italic">
                    💡 Already have a plan? Use the <span className="font-semibold">"Adjust Plan"</span> button below to modify your existing plan instead.
                  </p>
                )}
                <Textarea
                  id="aiContext"
                  name="aiContext"
                  value={formData.aiContext}
                  onChange={handleInputChange}
                  placeholder="e.g., I'm coming back from a knee injury and need to build back gradually. I prefer morning workouts and have limited time on weekdays but more flexibility on weekends. I've been cycling for 3 years and my best FTP was 280W..."
                  className="text-sm resize-none"
                  rows={5}
                />
              </div>
            </div>
            
            {/* Helpful Prompts */}
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                💡 Helpful things to mention:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700 dark:text-blue-300">
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Training history & experience level</span>
                </div>
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Time constraints & schedule preferences</span>
                </div>
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Equipment available (trainer, power meter, etc.)</span>
                </div>
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Specific weaknesses to address</span>
                </div>
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Past performance goals or PRs</span>
                </div>
                <div className="flex items-start gap-1">
                  <span>•</span>
                  <span>Preferred training style or philosophy</span>
                </div>
              </div>
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
                  Generate Training Plan
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
                  Your Training Progress
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
              <button
                onClick={() => setIsRiderTypeExpanded(!isRiderTypeExpanded)}
                className={`w-full bg-gradient-to-r ${riderProgress.color} p-6 text-white cursor-pointer hover:opacity-95 transition-opacity`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{riderProgress.icon}</div>
                    <div className="text-left">
                      <h3 className="text-2xl font-bold mb-1">
                        Working Towards: {riderProgress.targetType}
                      </h3>
                      <p className="text-white/90">{riderProgress.description}</p>
                      {/* Starting Level Badge in Header */}
                      <div className="mt-2">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm font-semibold text-sm`}>
                          <Award className="w-4 h-4" />
                          Starting Level: {progressStatus.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold">{riderProgress.progress}%</div>
                    <p className="text-white/80 text-sm mt-1">Progress</p>
                    <div className="mt-2">
                      {isRiderTypeExpanded ? (
                        <ChevronUp className="w-6 h-6 mx-auto" />
                      ) : (
                        <ChevronDown className="w-6 h-6 mx-auto" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
              
              {isRiderTypeExpanded && (
                <CardContent className="pt-6">
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
              )}
            </Card>
          );
        })()}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle>Your Plan</CardTitle>
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
                  onClick={() => setShowAdaptiveModal(true)}
                  variant="default"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Adjust Plan
                </Button>
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
            <div className="space-y-4">
              {plan.weeks.map((week) => {
                const isExpanded = expandedWeeks[week.weekNumber];
                const isCurrentWeek = getCurrentWeek(plan) === week.weekNumber;
                
                // Calculate week completion stats
                const weekSessions = week.sessions.length;
                const merged = mergeCompletions(completedSessions, automaticMatches);
                const weekCompleted = week.sessions.filter((_, idx) => {
                  const sessionKey = `${week.weekNumber}-${idx}`;
                  const completion = merged[sessionKey];
                  return completion && completion.completed;
                }).length;
                const weekCompletionPct = weekSessions > 0 ? Math.round((weekCompleted / weekSessions) * 100) : 0;
                
                return (
                <div key={week.weekNumber} className={`border-2 rounded-lg overflow-hidden ${
                  isCurrentWeek ? 'border-blue-500 shadow-md' : 'border-gray-200'
                }`}>
                  <div 
                    className={`p-4 cursor-pointer transition-colors ${
                      isCurrentWeek 
                        ? 'bg-blue-50 hover:bg-blue-100' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleWeekExpanded(week.weekNumber)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            Week {week.weekNumber}: {week.focus}
                            {isCurrentWeek && (
                              <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                                Current Week
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Total: {week.totalHours}h • {weekCompleted}/{weekSessions} sessions completed ({weekCompletionPct}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {weekCompletionPct === 100 && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                  <div className="p-4 bg-white space-y-2">
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
                            session.status === 'cancelled'
                              ? 'border-red-300 bg-red-50 opacity-60'
                              : session.modified
                              ? 'border-orange-300 bg-orange-50'
                              : isCompleted 
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
                                    session.status === 'cancelled' ? 'text-red-700 line-through' :
                                    session.modified ? 'text-orange-700' :
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
                                  {session.status === 'cancelled' && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded font-semibold border border-red-300">
                                      <X className="w-3 h-3" />
                                      Cancelled
                                    </span>
                                  )}
                                  {session.modified && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold border border-orange-300">
                                      <AlertCircle className="w-3 h-3" />
                                      Modified
                                    </span>
                                  )}
                                </div>
                                <p className={`text-sm mt-1 ${
                                  isCompleted ? 'text-green-700' : 
                                  isMissed ? 'text-red-700' :
                                  session.status === 'cancelled' ? 'text-red-600 line-through' :
                                  session.modified ? 'text-orange-600' :
                                  'text-gray-600'
                                }`}>
                                  {session.description}
                                </p>
                                {session.cancellationReason && (
                                  <p className="text-xs text-red-600 mt-1 italic">
                                    Reason: {session.cancellationReason}
                                  </p>
                                )}
                                {session.modificationReason && (
                                  <p className="text-xs text-orange-600 mt-1 italic">
                                    Adjustment: {session.modificationReason}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <Clock className="w-3 h-3" />
                                    {session.duration} min
                                  </span>
                                  {session.date && (
                                    <span className="font-medium text-gray-500">
                                      {new Date(session.date).toLocaleDateString('en-US', { 
                                        weekday: 'short',
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
                                      Activity found ({Math.round(automaticMatches[sessionKey].alignmentScore)}%)
                                    </span>
                                  )}
                                  {!isCompleted && automaticMatches[sessionKey] && !automaticMatches[sessionKey].matched && automaticMatches[sessionKey].activity && automaticMatches[sessionKey].activity.id && automaticMatches[sessionKey].alignmentScore > 0 && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-semibold">
                                      <AlertCircle className="w-3 h-3" />
                                      Low match ({Math.round(automaticMatches[sessionKey].alignmentScore)}%)
                                    </span>
                                  )}
                                  {automaticMatches[sessionKey] && automaticMatches[sessionKey].activity && automaticMatches[sessionKey].activity.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openMatchModal(session, sessionKey);
                                      }}
                                      className="text-blue-600 font-medium hover:text-blue-800 transition-colors"
                                    >
                                      View Match
                                    </button>
                                  )}
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
                                              <CalendarIcon className="w-4 h-4 text-red-600" />
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
                  )}
                </div>
                );
              })}
            </div>

            {plan.coachNotes && plan.coachNotes.length > 0 && (() => {
              const coach = getCoachPersona(getUserCoach());
              return (
                <div className="mt-6 border border-blue-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setIsCoachNotesExpanded(!isCoachNotesExpanded)}
                    className="w-full p-4 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
                  >
                    <h4 className="font-medium text-blue-900 flex items-center gap-2">
                      <span className="text-xl">{coach.avatar}</span>
                      Coach Notes ({plan.coachNotes.length})
                    </h4>
                    {isCoachNotesExpanded ? (
                      <ChevronUp className="w-5 h-5 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-blue-600" />
                    )}
                  </button>
                  {isCoachNotesExpanded && (
                    <div className="p-4 bg-white space-y-3">
                      {[...plan.coachNotes].reverse().map((note, idx) => (
                        <div key={idx} className="border-l-4 border-blue-400 pl-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{coach.avatar}</span>
                            <span className="text-xs font-semibold text-blue-600">
                              {note.timestamp ? new Date(note.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              }) : 'Initial Plan'}
                            </span>
                            {note.type && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                {note.type}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-blue-700">{note.message || note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Legacy support for old plans with single notes field */}
            {plan.notes && !plan.coachNotes && (
              <div className="mt-6 border border-blue-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setIsCoachNotesExpanded(!isCoachNotesExpanded)}
                  className="w-full p-4 bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-between"
                >
                  <h4 className="font-medium text-blue-900 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Coach Notes
                  </h4>
                  {isCoachNotesExpanded ? (
                    <ChevronUp className="w-5 h-5 text-blue-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-blue-600" />
                  )}
                </button>
                {isCoachNotesExpanded && (
                  <div className="p-4 bg-white">
                    <p className="text-sm text-blue-700">{plan.notes}</p>
                  </div>
                )}
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

      {/* Adaptive Plan Adjustment Modal */}
      <AdaptivePlanModal
        isOpen={showAdaptiveModal}
        onClose={() => setShowAdaptiveModal(false)}
        onAdjust={handleApplyAdjustments}
        plan={plan}
        activities={activities}
        completedSessions={completedSessions}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successMessage.title}
        message={successMessage.message}
      />
    </div>
  );
};

export default PlanGenerator;
