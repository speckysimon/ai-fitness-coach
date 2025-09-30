import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';

const Setup = ({ onStravaAuth, onGoogleAuth, stravaTokens, googleTokens }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Handle OAuth callbacks
    const stravaData = searchParams.get('strava_data');
    const googleData = searchParams.get('google_data');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (stravaData) {
      try {
        const data = JSON.parse(decodeURIComponent(stravaData));
        if (data.success) {
          onStravaAuth(data.tokens);
          // Clear the URL parameters
          navigate('/setup', { replace: true });
        }
      } catch (err) {
        setError('Failed to process Strava authentication');
      }
    }

    if (googleData) {
      try {
        const data = JSON.parse(decodeURIComponent(googleData));
        if (data.success) {
          onGoogleAuth(data.tokens);
          // Clear the URL parameters
          navigate('/setup', { replace: true });
        }
      } catch (err) {
        setError('Failed to process Google authentication');
      }
    }
  }, [searchParams]);

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
      const response = await fetch('/api/strava/auth');
      const data = await response.json();
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
        {stravaTokens && (
          <div className="text-center">
            <Button
              onClick={continueToApp}
              size="lg"
              className="px-12"
            >
              Continue to Dashboard
            </Button>
          </div>
        )}

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
