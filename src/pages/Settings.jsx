import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Activity, Calendar, Trash2, CheckCircle2, User, ChevronRight, Clock, ChevronDown, Package } from 'lucide-react';
import packageJson from '../../package.json';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import StravaAttribution from '../components/StravaAttribution';
import CoachAvatarSelector from '../components/CoachAvatarSelector';
import NotificationSettings from '../components/NotificationSettings';
import StravaWelcomeModal from '../components/StravaWelcomeModal';
import { getUserTimezone, setUserTimezone, getCommonTimezones, getCurrentDateTime } from '../lib/timezone';
import { preferencesService } from '../services/preferencesService';

const Settings = ({ stravaTokens, googleTokens, onLogout, onStravaAuth, onGoogleAuth }) => {
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(new Set());
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [currentTime, setCurrentTime] = useState(getCurrentDateTime());
  const [weekStartDay, setWeekStartDay] = useState(localStorage.getItem('week_start_day') || 'Monday');
  const [coachSectionExpanded, setCoachSectionExpanded] = useState(false);
  const [remindersSectionExpanded, setRemindersSectionExpanded] = useState(false);
  const [showStravaWelcomeModal, setShowStravaWelcomeModal] = useState(false);

  // Handle OAuth callbacks
  useEffect(() => {
    const stravaSuccess = searchParams.get('strava_success');
    const googleSuccess = searchParams.get('google_success');
    const error = searchParams.get('error');

    // Show error if present
    if (error && !processedRef.current.has('error')) {
      processedRef.current.add('error');
      alert(decodeURIComponent(error));
      navigate('/settings', { replace: true });
      return;
    }

    if (stravaSuccess && !processedRef.current.has('strava_success')) {
      processedRef.current.add('strava_success');
      (async () => {
        try {
          console.log('✅ Strava OAuth callback received');
          // Fetch updated user data from backend
          const sessionToken = localStorage.getItem('session_token');
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          const data = await response.json();
          if (data.success && data.user.stravaTokens && onStravaAuth) {
            await onStravaAuth(data.user.stravaTokens);
            console.log('✅ Strava tokens loaded from Settings');
            // Show success modal
            setShowStravaWelcomeModal(true);
          }
          // Clear URL params to prevent re-processing
          navigate('/settings', { replace: true });
        } catch (err) {
          console.error('Error processing Strava auth:', err);
        }
      })();
    }

    if (googleSuccess && !processedRef.current.has('google_success')) {
      processedRef.current.add('google_success');
      (async () => {
        try {
          console.log('✅ Google OAuth callback received');
          // Fetch updated user data from backend
          const sessionToken = localStorage.getItem('session_token');
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${sessionToken}`
            }
          });
          const data = await response.json();
          if (data.success && data.user.googleTokens && onGoogleAuth) {
            await onGoogleAuth(data.user.googleTokens);
            console.log('✅ Google tokens loaded from Settings');
          }
          // Clear URL params to prevent re-processing
          navigate('/settings', { replace: true });
        } catch (err) {
          console.error('Error processing Google auth:', err);
        }
      })();
    }
  }, [searchParams, onStravaAuth, onGoogleAuth, navigate]);

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentDateTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  const handleTimezoneChange = async (e) => {
    const newTimezone = e.target.value;
    if (newTimezone === 'auto') {
      localStorage.removeItem('user_timezone');
      const autoDetected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(autoDetected);
      
      // Save to backend
      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      if (userProfile.id) {
        await preferencesService.updateField(userProfile.id, 'timezone', autoDetected);
      }
    } else {
      setUserTimezone(newTimezone);
      setTimezone(newTimezone);
      
      // Save to backend
      const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
      if (userProfile.id) {
        await preferencesService.updateField(userProfile.id, 'timezone', newTimezone);
      }
    }
    setCurrentTime(getCurrentDateTime());
  };

  const handleWeekStartDayChange = async (e) => {
    const newStartDay = e.target.value;
    localStorage.setItem('week_start_day', newStartDay);
    setWeekStartDay(newStartDay);
    
    // Save to backend
    const userProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    if (userProfile.id) {
      await preferencesService.updateField(userProfile.id, 'week_start_day', newStartDay);
    }
  };

  const clearData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      alert('All local data has been cleared.');
    }
  };

  const connectStrava = async () => {
    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Session expired. Please login again.');
        navigate('/login');
        return;
      }
      const response = await fetch(`/api/strava/auth?session_token=${sessionToken}&state=settings`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setConnecting(false);
        return;
      }
      window.location.href = data.authUrl;
    } catch (err) {
      alert('Failed to initiate Strava authentication');
      setConnecting(false);
    }
  };

  const connectGoogle = async () => {
    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Session expired. Please login again.');
        navigate('/login');
        return;
      }
      const response = await fetch(`/api/google/auth?session_token=${sessionToken}&state=settings`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setConnecting(false);
        return;
      }
      window.location.href = data.authUrl;
    } catch (err) {
      alert('Failed to initiate Google authentication');
      setConnecting(false);
    }
  };

  const disconnectStrava = async () => {
    if (!confirm('Are you sure you want to disconnect Strava? Your activities will no longer sync.')) {
      return;
    }

    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('/api/auth/strava-tokens', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Clear tokens from state and localStorage
        if (onStravaAuth) {
          onStravaAuth(null);
        }
        localStorage.removeItem('strava_tokens');
        alert('Strava disconnected successfully');
        // Refresh page to update UI
        window.location.reload();
      } else {
        alert('Failed to disconnect Strava');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      alert('Failed to disconnect Strava');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
      return;
    }

    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch('/api/auth/google-tokens', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      const data = await response.json();
      if (data.success) {
        // Clear tokens from state and localStorage
        if (onGoogleAuth) {
          onGoogleAuth(null);
        }
        localStorage.removeItem('google_tokens');
        alert('Google Calendar disconnected successfully');
        // Refresh page to update UI
        window.location.reload();
      } else {
        alert('Failed to disconnect Google Calendar');
      }
    } catch (err) {
      console.error('Disconnect error:', err);
      alert('Failed to disconnect Google Calendar');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your connections and preferences</p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your third-party integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strava */}
          <div className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="#FC4C02">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Strava</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Activity tracking and history</p>
                {stravaTokens && (
                  <StravaAttribution className="mt-1" />
                )}
              </div>
            </div>
            {stravaTokens ? (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={disconnectStrava}
                  disabled={connecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={connectStrava}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>

          {/* Google Calendar */}
          <div className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M19.5 3.5h-2V2h-2v1.5h-7V2h-2v1.5h-2C3.67 3.5 3 4.17 3 5v14c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5V5c0-.83-.67-1.5-1.5-1.5zm0 15.5h-15V8.5h15V19z"/>
                  <path fill="#EA4335" d="M7 10h2v2H7z"/>
                  <path fill="#FBBC04" d="M11 10h2v2h-2z"/>
                  <path fill="#34A853" d="M15 10h2v2h-2z"/>
                  <path fill="#4285F4" d="M7 14h2v2H7z"/>
                  <path fill="#EA4335" d="M11 14h2v2h-2z"/>
                  <path fill="#FBBC04" d="M15 14h2v2h-2z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Google Calendar</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Training plan synchronization</p>
              </div>
            </div>
            {googleTokens ? (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={disconnectGoogle}
                  disabled={connecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={connectGoogle}
                disabled={connecting}
              >
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timezone & Data Management - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Timezone Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Timezone
            </CardTitle>
            <CardDescription>Configure your timezone for accurate AI adjustments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Time Display */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Time</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{currentTime.time}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{currentTime.date}</p>
                </div>
                <div className="px-3 py-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Timezone</p>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{timezone.split('/').pop().replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Timezone Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Timezone
              </label>
              <select
                value={localStorage.getItem('user_timezone') || 'auto'}
                onChange={handleTimezoneChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {getCommonTimezones().map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                💡 Used for AI date interpretation ("today", "yesterday", etc.)
              </p>
            </div>

            {/* Week Start Day Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Week Starts On
              </label>
              <select
                value={weekStartDay}
                onChange={handleWeekStartDayChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                📅 Used for training plan week structure
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Manage your local application data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Clear Local Data</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Remove all stored tokens and cached data</p>
              </div>
              <Button variant="outline" onClick={clearData}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <Link 
            to="/profile"
            className="flex items-center justify-between p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Edit Profile</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Update your name, age, weight, height, and gender</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
        </CardContent>
      </Card>

      {/* Coach Avatar Selector - Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setCoachSectionExpanded(!coachSectionExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <span className="text-xl sm:text-2xl">👤</span>
                Choose Your Coach
              </CardTitle>
              <CardDescription>
                Select a coaching style that resonates with you
              </CardDescription>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                coachSectionExpanded ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </CardHeader>
        {coachSectionExpanded && (
          <CardContent>
            <CoachAvatarSelector />
          </CardContent>
        )}
      </Card>

      {/* Notification Settings - Collapsible */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setRemindersSectionExpanded(!remindersSectionExpanded)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Workout Reminders
              </CardTitle>
              <CardDescription>
                Configure notifications for your training sessions
              </CardDescription>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                remindersSectionExpanded ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </CardHeader>
        {remindersSectionExpanded && (
          <CardContent>
            <NotificationSettings />
          </CardContent>
        )}
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p className="text-base"><strong className="text-gray-900 dark:text-gray-100">RiderLabs</strong> <span className="text-gray-500 dark:text-gray-500">v{packageJson.version}</span></p>
              <p>Data-driven cycling performance platform powered by AI. Integrates with Strava and Google Calendar.</p>
              <p className="pt-4 border-t border-gray-200 dark:border-gray-700">
                Built with React, Express, OpenAI, and modern web technologies.
              </p>
            </div>
            
            {/* Changelog Link */}
            <Link 
              to="/changelog"
              className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Changelog</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">View version history and updates</p>
              </div>
              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">v{packageJson.version}</span>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Strava Welcome Modal */}
      <StravaWelcomeModal 
        isOpen={showStravaWelcomeModal} 
        onClose={() => setShowStravaWelcomeModal(false)} 
      />
    </div>
  );
};

export default Settings;
