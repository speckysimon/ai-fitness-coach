import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Calendar, Award, ArrowRight, X, ChevronLeft, Check, Loader2, Zap, Target, Users, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';
import { fetchCoachPersonas, setUserCoach, getUserCoach } from '../lib/coachPersonas';
import { planService } from '../services/planService';

const OnboardingModal = ({ isOpen, onClose, stravaTokens, userProfile }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [formData, setFormData] = useState({
    eventName: '',
    eventDate: '',
    startDate: new Date().toISOString().split('T')[0],
    eventType: 'Endurance',
    priority: 'High Priority',
    daysPerWeek: 5,
    maxHoursPerWeek: 10,
    preference: 'Both',
  });
  const [formErrors, setFormErrors] = useState({});

  console.log('🎭 OnboardingModal received isOpen:', isOpen, 'currentStep:', currentStep);

  // Initialize modal when it opens
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      console.log('🚀 Initializing onboarding modal');
      loadCoaches();
      
      // Check if returning from Strava OAuth during onboarding
      const onboardingInProgress = localStorage.getItem('onboarding_in_progress');
      const savedStep = localStorage.getItem('onboarding_step');
      
      console.log('🔍 Onboarding check:', { 
        onboardingInProgress, 
        savedStep, 
        hasStrava: !!stravaTokens?.access_token 
      });
      
      if (onboardingInProgress === 'true' && savedStep) {
        console.log('🔄 Resuming onboarding at step:', savedStep);
        const stepNumber = parseInt(savedStep);
        setCurrentStep(stepNumber);
        // Clear flags after setting step
        localStorage.removeItem('onboarding_in_progress');
        localStorage.removeItem('onboarding_step');
      } else if (stravaTokens?.access_token) {
        // Skip to coach selection if Strava is already connected
        console.log('⏭️ Skipping to coach selection (Strava already connected)');
        setCurrentStep(3);
      } else {
        // Start at step 1
        console.log('▶️ Starting at step 1');
        setCurrentStep(1);
      }
      
      setHasInitialized(true);
    } else if (!isOpen && hasInitialized) {
      // Reset when modal closes
      console.log('🔄 Resetting modal state');
      setHasInitialized(false);
      setCurrentStep(1);
    }
  }, [isOpen, stravaTokens, hasInitialized]);

  const loadCoaches = async () => {
    const personas = await fetchCoachPersonas();
    setCoaches(personas);
    // Pre-select current coach if any
    const currentCoach = getUserCoach();
    if (currentCoach) {
      setSelectedCoach(currentCoach);
    }
  };

  if (!isOpen) {
    console.log('⛔ OnboardingModal returning null because isOpen is false');
    return null;
  }

  console.log('✅ OnboardingModal rendering! Step:', currentStep);

  const handleConnectStrava = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Session expired. Please login again.');
        return;
      }
      // Set flag to resume onboarding after Strava connection
      localStorage.setItem('onboarding_in_progress', 'true');
      localStorage.setItem('onboarding_step', '3'); // Resume at coach selection
      
      // Initiate Strava OAuth with onboarding state
      const response = await fetch(`/api/strava/auth?session_token=${sessionToken}&state=onboarding`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      // Redirect to Strava OAuth
      window.location.href = data.authUrl;
    } catch (err) {
      console.error('Failed to initiate Strava authentication:', err);
      alert('Failed to connect to Strava');
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSelectCoach = (coachId) => {
    setSelectedCoach(coachId);
    setUserCoach(coachId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.eventName.trim()) errors.eventName = 'Event name is required';
    if (!formData.eventDate) errors.eventDate = 'Event date is required';
    if (!formData.startDate) errors.startDate = 'Start date is required';
    
    // Validate dates
    const start = new Date(formData.startDate);
    const end = new Date(formData.eventDate);
    if (end <= start) {
      errors.eventDate = 'Event date must be after start date';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGeneratePlan = async () => {
    if (!validateForm()) {
      return;
    }

    setGeneratingPlan(true);
    try {
      // Calculate duration in weeks
      const start = new Date(formData.startDate);
      const end = new Date(formData.eventDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const duration = Math.max(1, Math.ceil(diffDays / 7));

      // Call the actual plan generation API
      const response = await fetch('/api/training/plan/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activities: [], // Empty for new users
          goals: {
            eventName: formData.eventName,
            eventDate: formData.eventDate,
            eventType: formData.eventType,
            priority: formData.priority,
            duration,
          },
          constraints: {
            daysPerWeek: parseInt(formData.daysPerWeek),
            maxHoursPerWeek: parseInt(formData.maxHoursPerWeek),
            preference: formData.preference,
            weekStartDay: 'Monday',
          },
          userProfile: userProfile || {},
          illnessHistory: [],
          athleteMetrics: {},
          raceHistory: [],
          trainingPriorities: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate plan');
      }

      const planData = await response.json();
      
      // Add dates to sessions
      const planWithDates = addDatesToSessions(planData, formData.startDate);
      
      // Add metadata
      planWithDates.eventType = formData.eventType;
      planWithDates.goals = {
        eventName: formData.eventName,
        eventDate: formData.eventDate,
        startDate: formData.startDate,
        eventType: formData.eventType,
        priority: formData.priority,
        daysPerWeek: parseInt(formData.daysPerWeek),
        maxHoursPerWeek: parseInt(formData.maxHoursPerWeek),
        preference: formData.preference,
        duration: duration,
      };

      // Save plan to backend
      if (userProfile?.id) {
        await planService.savePlan(userProfile.id, planWithDates);
      } else {
        // Fallback to localStorage
        localStorage.setItem('training_plan', JSON.stringify(planWithDates));
      }

      setPlanGenerated(true);
      setCurrentStep(5);
    } catch (error) {
      console.error('Error generating plan:', error);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const addDatesToSessions = (planData, startDate) => {
    const start = new Date(startDate + 'T00:00:00');
    const dayMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
      'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };

    planData.weeks.forEach((week, weekIdx) => {
      const weekStartDate = new Date(start);
      weekStartDate.setDate(start.getDate() + (weekIdx * 7));
      
      week.sessions.forEach(session => {
        const targetDay = dayMap[session.day];
        const sessionDate = new Date(weekStartDate);
        const daysFromMonday = targetDay === 0 ? 6 : targetDay - 1;
        sessionDate.setDate(weekStartDate.getDate() + daysFromMonday);
        
        session.date = sessionDate.toISOString().split('T')[0];
        session.dateObj = sessionDate;
      });
    });

    return planData;
  };

  const handleComplete = () => {
    onClose();
    navigate('/plan');
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderStravaStep();
      case 3:
        return renderCoachStep();
      case 4:
        return renderPlanStep();
      case 5:
        return renderSuccessStep();
      default:
        return null;
    }
  };

  // Step 1: Welcome
  const renderWelcomeStep = () => (
    <>
      <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Activity className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center mb-2">
            Welcome to RiderLabs! 🎉
          </h1>
          <p className="text-center text-white/90 text-lg">
            Let's get you set up in 3 easy steps
          </p>
        </div>
      </div>
      <div className="p-8">
          {/* Main message */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Connect Strava to Unlock Full Power
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Get AI-powered training plans based on your actual performance data
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Smart Training Plans</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    AI analyzes your activities to create personalized plans
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Auto-Sync Activities</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Your rides automatically import and match to your plan
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Progress Tracking</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    See your FTP, training load, and performance trends
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Race Analysis</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Get detailed insights on your race performance
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleConnectStrava}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-lg py-6"
            >
              <Activity className="w-5 h-5 mr-2" />
              Connect Strava Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>

            <Button
              onClick={handleSkip}
              variant="outline"
              size="lg"
              className="w-full"
            >
              I'll Do This Later
            </Button>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleNext}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold text-lg py-6"
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </>
  );

  // Step 2: Connect Strava
  const renderStravaStep = () => (
    <>
      <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-6 text-white">
        <h2 className="text-2xl font-bold text-center">Step 1: Connect Strava</h2>
      </div>
      <div className="p-8">
        <div className="text-center mb-6">
          <Activity className="w-16 h-16 mx-auto mb-4 text-orange-600" />
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
            Connect your Strava account to unlock AI-powered training
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your activities will automatically sync and match to your plan
          </p>
        </div>
        <div className="space-y-3">
          <Button
            onClick={handleConnectStrava}
            size="lg"
            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-semibold"
          >
            <Activity className="w-5 h-5 mr-2" />
            Connect Strava Now
          </Button>
          <Button
            onClick={handleNext}
            variant="outline"
            size="lg"
            className="w-full"
          >
            Skip for Now
          </Button>
        </div>
      </div>
    </>
  );

  // Step 3: Choose Coach
  const renderCoachStep = () => (
    <>
      <div className="relative bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 p-6 text-white">
        <h2 className="text-2xl font-bold text-center">Step 2: Choose Your Coach</h2>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-1 gap-3 mb-6">
          {coaches.map((coach) => (
            <button
              key={coach.id}
              onClick={() => handleSelectCoach(coach.id)}
              className={`p-4 rounded-xl border-2 transition-all text-left ${
                selectedCoach === coach.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="text-3xl">{coach.avatar || coach.avatarUrl}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{coach.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{coach.style}</p>
                </div>
                {selectedCoach === coach.id && <Check className="w-5 h-5 text-purple-600" />}
              </div>
            </button>
          ))}
        </div>
        <Button
          onClick={handleNext}
          disabled={!selectedCoach}
          size="lg"
          className="w-full"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </>
  );

  // Step 4: Generate Plan
  const renderPlanStep = () => (
    <>
      <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 text-white">
        <h2 className="text-2xl font-bold text-center">Step 3: Create Your Training Plan</h2>
      </div>
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        <div className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              name="eventName"
              value={formData.eventName}
              onChange={handleInputChange}
              placeholder="e.g., Spring Century Ride"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                formErrors.eventName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {formErrors.eventName && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formErrors.eventName}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.startDate && (
                <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Date *
              </label>
              <input
                type="date"
                name="eventDate"
                value={formData.eventDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white ${
                  formErrors.eventDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.eventDate && (
                <p className="text-red-500 text-xs mt-1">{formErrors.eventDate}</p>
              )}
            </div>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Event Type
            </label>
            <select
              name="eventType"
              value={formData.eventType}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="Endurance">Endurance (Gran Fondo, Century)</option>
              <option value="Climbing">Climbing (Hilly/Mountain)</option>
              <option value="Time Trial">Time Trial</option>
              <option value="Criterium">Criterium</option>
              <option value="Road Race">Road Race</option>
              <option value="General Fitness">General Fitness</option>
            </select>
          </div>

          {/* Training Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Days per Week
              </label>
              <select
                name="daysPerWeek"
                value={formData.daysPerWeek}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                {[3, 4, 5, 6, 7].map(days => (
                  <option key={days} value={days}>{days} days</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Hours/Week
              </label>
              <select
                name="maxHoursPerWeek"
                value={formData.maxHoursPerWeek}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                {[5, 6, 7, 8, 9, 10, 12, 15, 20].map(hours => (
                  <option key={hours} value={hours}>{hours} hours</option>
                ))}
              </select>
            </div>
          </div>

          {/* Training Preference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Training Preference
            </label>
            <select
              name="preference"
              value={formData.preference}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="Both">Both Indoor & Outdoor</option>
              <option value="Indoor Only">Indoor Only (Trainer)</option>
              <option value="Outdoor Only">Outdoor Only</option>
            </select>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            size="lg"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 mt-4"
          >
            {generatingPlan ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Your Plan...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Generate My Training Plan
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );

  // Step 5: Success
  const renderSuccessStep = () => (
    <>
      <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-6 text-white">
        <h2 className="text-2xl font-bold text-center">You're All Set! 🎉</h2>
      </div>
      <div className="p-8 text-center">
        <Check className="w-20 h-20 mx-auto mb-4 text-green-600" />
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to RiderLabs!
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Your personalized training plan is ready
        </p>
        <Button
          onClick={handleComplete}
          size="lg"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
        >
          View My Training Plan
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden relative max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* Back button (not on first step) */}
        {currentStep > 1 && currentStep < 5 && (
          <button
            onClick={handleBack}
            className="absolute top-4 left-4 z-10 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        {/* Progress indicator */}
        {currentStep < 5 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-2 rounded-full">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step <= currentStep ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Step content */}
        {renderStepContent()}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default OnboardingModal;
