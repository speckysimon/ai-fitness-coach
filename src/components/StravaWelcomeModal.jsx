import React, { useState, useEffect } from 'react';
import { Activity, Zap, TrendingUp, Award, CheckCircle } from 'lucide-react';
import { trackEngagement } from '../lib/analytics';

const StravaWelcomeModal = ({ isOpen, onClose }) => {
  const [pedalClicks, setPedalClicks] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [speed, setSpeed] = useState(0);

  const REQUIRED_CLICKS = 20;
  const progressPercent = Math.min((pedalClicks / REQUIRED_CLICKS) * 100, 100);

  useEffect(() => {
    if (pedalClicks >= REQUIRED_CLICKS && !showSuccess) {
      setShowSuccess(true);
      trackEngagement.welcomeModalCompleted(pedalClicks);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [pedalClicks, showSuccess, onClose]);

  const handlePedalClick = () => {
    if (showSuccess) return;

    setPedalClicks(prev => prev + 1);
    setIsAnimating(true);
    
    // Rotate the bike wheel
    setRotation(prev => prev + 30);
    
    // Increase speed effect
    setSpeed(prev => Math.min(prev + 5, 100));
    
    setTimeout(() => {
      setIsAnimating(false);
      setSpeed(prev => Math.max(prev - 3, 0));
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-8 text-white overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-300 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center animate-bounce">
                <Activity className="w-10 h-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-center mb-2">
              Welcome Aboard! 🎉
            </h1>
            <p className="text-center text-white/90 text-lg">
              Your Strava account is now connected
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {!showSuccess ? (
            <>
              {/* Inspirational message */}
              <div className="text-center mb-8">
                <p className="text-xl text-gray-700 dark:text-gray-300 font-medium mb-2">
                  "Every pedal stroke is progress"
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Let's get your training started!
                </p>
              </div>

              {/* Bike animation */}
              <div className="relative mb-8 flex justify-center">
                <div className="relative">
                  {/* Speed lines */}
                  {speed > 20 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-1 bg-orange-500 rounded-full animate-speedLine"
                          style={{
                            left: `${-20 - i * 10}px`,
                            animationDelay: `${i * 0.1}s`,
                            opacity: speed / 100,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bike illustration */}
                  <div className="relative w-64 h-32">
                    {/* Bike frame (simplified) */}
                    <svg viewBox="0 0 200 100" className="w-full h-full">
                      {/* Back wheel */}
                      <g transform="translate(40, 60)">
                        <circle
                          cx="0"
                          cy="0"
                          r="25"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-gray-700 dark:text-gray-300"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        />
                        <line
                          x1="-15"
                          y1="-15"
                          x2="15"
                          y2="15"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-700 dark:text-gray-300"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        />
                        <line
                          x1="-15"
                          y1="15"
                          x2="15"
                          y2="-15"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-700 dark:text-gray-300"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        />
                      </g>

                      {/* Front wheel */}
                      <g transform="translate(160, 60)">
                        <circle
                          cx="0"
                          cy="0"
                          r="25"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-gray-700 dark:text-gray-300"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        />
                        <line
                          x1="-15"
                          y1="-15"
                          x2="15"
                          y2="15"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray-700 dark:text-gray-300"
                          style={{
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin: 'center',
                          }}
                        />
                      </g>

                      {/* Frame */}
                      <line x1="40" y1="60" x2="100" y2="30" stroke="currentColor" strokeWidth="4" className="text-gray-700 dark:text-gray-300" />
                      <line x1="100" y1="30" x2="160" y2="60" stroke="currentColor" strokeWidth="4" className="text-gray-700 dark:text-gray-300" />
                      <line x1="40" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth="4" className="text-gray-700 dark:text-gray-300" />
                      <line x1="100" y1="30" x2="100" y2="60" stroke="currentColor" strokeWidth="4" className="text-gray-700 dark:text-gray-300" />
                      
                      {/* Seat */}
                      <ellipse cx="100" cy="25" rx="15" ry="5" fill="currentColor" className="text-gray-700 dark:text-gray-300" />
                      
                      {/* Handlebars */}
                      <line x1="160" y1="60" x2="160" y2="40" stroke="currentColor" strokeWidth="3" className="text-gray-700 dark:text-gray-300" />
                      <line x1="150" y1="40" x2="170" y2="40" stroke="currentColor" strokeWidth="3" className="text-gray-700 dark:text-gray-300" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pedal button */}
              <div className="text-center mb-6">
                <button
                  onClick={handlePedalClick}
                  className={`
                    relative px-12 py-6 rounded-2xl font-bold text-xl
                    bg-gradient-to-r from-orange-500 to-pink-500
                    text-white shadow-lg hover:shadow-xl
                    transform transition-all duration-100
                    ${isAnimating ? 'scale-95' : 'scale-100 hover:scale-105'}
                    active:scale-95
                  `}
                >
                  <span className="flex items-center gap-3">
                    <Zap className="w-6 h-6" />
                    PEDAL!
                    <Zap className="w-6 h-6" />
                  </span>
                  
                  {/* Click counter badge */}
                  <div className="absolute -top-3 -right-3 bg-white text-orange-500 rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg border-4 border-orange-500">
                    {pedalClicks}
                  </div>
                </button>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Keep pedaling!
                  </span>
                  <span className="text-sm font-bold text-orange-500">
                    {pedalClicks} / {REQUIRED_CLICKS}
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Motivational messages */}
              <div className="text-center">
                {pedalClicks === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 animate-pulse">
                    Click the pedal button to start! 🚴
                  </p>
                )}
                {pedalClicks > 0 && pedalClicks < 10 && (
                  <p className="text-gray-600 dark:text-gray-300 font-medium">
                    Great start! Keep going! 💪
                  </p>
                )}
                {pedalClicks >= 10 && pedalClicks < 15 && (
                  <p className="text-orange-600 dark:text-orange-400 font-medium">
                    You're halfway there! 🔥
                  </p>
                )}
                {pedalClicks >= 15 && pedalClicks < REQUIRED_CLICKS && (
                  <p className="text-pink-600 dark:text-pink-400 font-bold">
                    Almost there! Sprint finish! 🚀
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Awesome! 🎉
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
                You're all set to start training!
              </p>
              
              {/* Features preview */}
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">AI Plans</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Track Progress</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Race Ready</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes speedLine {
          0% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-100px); opacity: 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-speedLine {
          animation: speedLine 0.5s ease-out infinite;
        }
      `}</style>
    </div>
  );
};

export default StravaWelcomeModal;
