import React, { useState } from 'react';
import { Activity, Database, Zap, CheckCircle, AlertCircle, TrendingUp, Heart, Award } from 'lucide-react';
import { Button } from './ui/Button';

const DataSourceWelcomeModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [connecting, setConnecting] = useState(false);

  if (!isOpen) return null;

  const handleConnectIntervals = async () => {
    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Session expired. Please login again.');
        return;
      }
      const response = await fetch(`/api/intervals/auth?session_token=${sessionToken}`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setConnecting(false);
        return;
      }
      // Mark as seen before redirecting
      localStorage.setItem('has_seen_welcome_modal', 'true');
      window.location.href = data.authUrl;
    } catch (err) {
      alert('Failed to initiate Intervals.icu authentication');
      setConnecting(false);
    }
  };

  const handleConnectStrava = async () => {
    setConnecting(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        alert('Session expired. Please login again.');
        return;
      }
      const response = await fetch(`/api/strava/auth?session_token=${sessionToken}&state=onboarding`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
        setConnecting(false);
        return;
      }
      // Mark as seen before redirecting
      localStorage.setItem('has_seen_welcome_modal', 'true');
      window.location.href = data.authUrl;
    } catch (err) {
      alert('Failed to initiate Strava authentication');
      setConnecting(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('has_seen_welcome_modal', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-8 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-300 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                <Database className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-center mb-2">
              Welcome to RiderLabs! 🎉
            </h1>
            <p className="text-center text-white/90 text-lg">
              Connect your training data to unlock AI-powered insights
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 ? (
            <>
              {/* Data source selection */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Choose Your Data Source
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Connect your training platform to get started
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {/* Intervals.icu - Recommended */}
                <div className="relative border-2 border-blue-500 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      ⭐ RECOMMENDED
                    </span>
                  </div>
                  
                  <div className="flex items-start gap-4 mt-2">
                    <div className="w-16 h-16 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Database className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Intervals.icu
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        The most comprehensive data source for serious athletes
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Power curve analysis</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Heart rate zones</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Detailed lap data</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Training load metrics</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Interval breakdowns</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Better AI insights</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleConnectIntervals}
                        disabled={connecting}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                      >
                        {connecting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Database className="w-5 h-5 mr-2" />
                            Connect Intervals.icu
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Strava - Basic option */}
                <div className="border-2 border-gray-300 dark:border-gray-600 rounded-xl p-6 bg-white dark:bg-gray-800">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Activity className="w-8 h-8 text-white" />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Strava
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        Basic activity tracking - limited data for AI analysis
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Activity summaries</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Basic metrics</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          <span>Limited power data</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                          <AlertCircle className="w-4 h-4 text-gray-400" />
                          <span>No interval details</span>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleConnectStrava}
                        disabled={connecting}
                        variant="outline"
                        className="w-full border-2 border-gray-300 dark:border-gray-600 font-semibold py-3"
                      >
                        {connecting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Activity className="w-5 h-5 mr-2" />
                            Connect Strava
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why it matters */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  Why More Data = Better AI Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Smarter Training Plans</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      AI analyzes your power curve, intervals, and training load to create personalized plans
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-red-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Better Race Analysis</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Detailed lap data helps AI identify pacing mistakes and tactical opportunities
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-yellow-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Accurate Predictions</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      More data points = more accurate race day form predictions and readiness scores
                    </p>
                  </div>
                </div>
              </div>

              {/* Skip option */}
              <div className="text-center">
                <button
                  onClick={handleSkip}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
                >
                  Skip for now (you can connect later in Settings)
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <style jsx>{`
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

export default DataSourceWelcomeModal;
