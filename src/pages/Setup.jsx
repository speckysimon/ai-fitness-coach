import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Setup = ({ onStravaAuth, onGoogleAuth, stravaTokens, googleTokens }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processingOAuth, setProcessingOAuth] = useState(false);
  const processedRef = useRef(new Set());

  // Handle OAuth callbacks - only run once when URL params change
  useEffect(() => {
    const stravaSuccess = searchParams.get('strava_success');
    const googleData = searchParams.get('google_data');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setSearchParams({}); // Clear URL params
      return;
    }

    if (stravaSuccess && !processedRef.current.has('strava_success')) {
      processedRef.current.add('strava_success');
      setProcessingOAuth(true);
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
          if (data.success && data.user.stravaTokens) {
            await onStravaAuth(data.user.stravaTokens);
            console.log('✅ Tokens loaded successfully');
          }
          // Clear URL params after successful save
          setSearchParams({});
          setProcessingOAuth(false);
        } catch (err) {
          console.error('❌ Error processing Strava auth:', err);
          setError('Failed to process Strava authentication');
          setSearchParams({});
          setProcessingOAuth(false);
        }
      })();
    }

    if (googleData && !processedRef.current.has(googleData)) {
      processedRef.current.add(googleData);
      setProcessingOAuth(true);
      (async () => {
        try {
          const data = JSON.parse(decodeURIComponent(googleData));
          if (data.success) {
            await onGoogleAuth(data.tokens);
            setSearchParams({});
            setProcessingOAuth(false);
          }
        } catch (err) {
          setError('Failed to process Google authentication');
          setSearchParams({});
          setProcessingOAuth(false);
        }
      })();
    }
  }, [searchParams, setSearchParams, onStravaAuth, onGoogleAuth]);

  const handleGoogleCallback = async (code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/google/callback?code=${code}`);
      const data = await response.json();

      if (data.success) {
        onGoogleAuth(data.tokens);
        navigate('/setup');
      } else {
        setError('Failed to authenticate with Google');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const connectStrava = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        setError('Session expired. Please login again.');
        navigate('/login');
        return;
      }
      const response = await fetch(`/api/strava/auth?session_token=${sessionToken}&state=setup`);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      window.location.href = data.authUrl;
    } catch (err) {
      setError('Failed to initiate Strava authentication');
    }
  };

  const connectGoogle = async () => {
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (err) {
      setError('Failed to initiate Google authentication');
    }
  };

  const continueToApp = () => {
    if (stravaTokens) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <span className="text-5xl">🎯</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome to AI Fitness Coach
          </h1>
          <p className="text-lg text-gray-600">
            Connect your accounts to start training smarter
          </p>
        </div>

        {/* Processing OAuth message */}
        {processingOAuth && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
            <span>Connecting your account...</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Connection cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Strava */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-8 h-8 text-orange-500" />
                {stravaTokens && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
              <CardTitle>Strava</CardTitle>
              <CardDescription>
                Connect your Strava account to import your training history and track progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stravaTokens ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Connected</span>
                </div>
              ) : (
                <Button
                  onClick={connectStrava}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? 'Connecting...' : 'Connect Strava'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Google Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Calendar className="w-8 h-8 text-blue-500" />
                {googleTokens && (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                )}
              </div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Sync your training plan to Google Calendar for easy scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              {googleTokens ? (
                <div className="flex items-center gap-2 text-green-600 font-medium">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Connected</span>
                </div>
              ) : (
                <Button
                  onClick={connectGoogle}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  {loading ? 'Connecting...' : 'Connect Google Calendar (Optional)'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Continue button */}
        <div className="text-center space-y-4">
          {stravaTokens && (
            <Button
              onClick={continueToApp}
              size="lg"
              className="px-12"
            >
              Continue to Dashboard
            </Button>
          )}
          
          {/* Skip button - allow users to continue without Strava */}
          {!stravaTokens && (
            <div>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                size="lg"
                className="px-12"
              >
                Skip for Now
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                You can connect Strava later in Settings
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Your data is stored locally and only used to generate personalized training plans.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Setup;
