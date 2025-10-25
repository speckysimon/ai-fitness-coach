import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Activity, Calendar, LogOut, Trash2, CheckCircle2, User, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import StravaAttribution from '../components/StravaAttribution';
import CoachAvatarSelector from '../components/CoachAvatarSelector';
import { getUserTimezone, setUserTimezone, getCommonTimezones, getCurrentDateTime } from '../lib/timezone';
import { preferencesService } from '../services/preferencesService';

const Settings = ({ stravaTokens, googleTokens, onLogout, onStravaAuth, onGoogleAuth }) => {
  const [connecting, setConnecting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(new Set());
  const [timezone, setTimezone] = useState(getUserTimezone());
  const [currentTime, setCurrentTime] = useState(getCurrentDateTime());

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
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your connections and preferences</p>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your third-party integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strava */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Strava</h3>
                <p className="text-sm text-gray-600">Activity tracking and history</p>
                {stravaTokens && (
                  <StravaAttribution className="mt-1" />
                )}
              </div>
            </div>
            {stravaTokens ? (
              <div className="flex items-center gap-3">
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
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Google Calendar</h3>
                <p className="text-sm text-gray-600">Training plan synchronization</p>
              </div>
            </div>
            {googleTokens ? (
              <div className="flex items-center gap-3">
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

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
          <CardDescription>Manage your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <Link 
            to="/profile"
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-4">
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

      {/* Coach Avatar Selector */}
      <CoachAvatarSelector />

      {/* Timezone Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timezone & Date Settings
          </CardTitle>
          <CardDescription>Configure your timezone for accurate AI training adjustments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Time Display */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Current Time</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums">{currentTime.time}</p>
                <p className="text-sm text-gray-600 mt-1">{currentTime.date}</p>
              </div>
              <div className="px-3 py-2 bg-blue-100 rounded-lg">
                <p className="text-xs text-gray-600">Timezone</p>
                <p className="text-sm font-semibold text-blue-700">{timezone.split('/').pop().replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Timezone Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Timezone
            </label>
            <select
              value={localStorage.getItem('user_timezone') || 'auto'}
              onChange={handleTimezoneChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {getCommonTimezones().map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              💡 This timezone is used when you tell the AI about "today", "yesterday", or specific dates. It ensures accurate plan adjustments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>Required API keys and credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Setup Required</h4>
            <p className="text-sm text-yellow-700 mb-4">
              To use this application, you need to configure the following API credentials in your <code className="bg-yellow-100 px-1 rounded">.env</code> file:
            </p>
            <ul className="text-sm text-yellow-700 space-y-2">
              <li>• <strong>Strava API:</strong> Get your credentials from <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener noreferrer" className="underline">Strava API Settings</a></li>
              <li>• <strong>OpenAI API:</strong> Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a></li>
              <li>• <strong>Google Calendar API:</strong> Set up OAuth credentials in <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
              <li>• <strong>OpenWeather API:</strong> Get your free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="underline">OpenWeather</a> (add as VITE_OPENWEATHER_API_KEY)</li>
            </ul>
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
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Clear Local Data</h3>
              <p className="text-sm text-gray-600">Remove all stored tokens and cached data</p>
            </div>
            <Button variant="outline" onClick={clearData}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>RiderLabs</strong> v2.5.0</p>
            <p>Data-driven cycling performance platform powered by AI. Integrates with Strava and Google Calendar.</p>
            <p className="pt-4 border-t border-gray-200">
              Built with React, Express, OpenAI, and modern web technologies.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
