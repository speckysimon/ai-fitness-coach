import React, { useState } from 'react';
import { X, Clock, TrendingUp, Mountain, Zap, Heart, Activity as ActivityIcon, Trophy, Brain, Send } from 'lucide-react';
import { formatDuration, formatDistance } from '../lib/utils';
import { getRaceTypeLabel } from '../lib/raceUtils';
import RouteMap from './RouteMap';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

const ActivityDetailModal = ({ activity, onClose, showAICoach = false }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(showAICoach);

  if (!activity) return null;

  const getActivityIcon = (type) => {
    switch (type) {
      case 'Ride':
      case 'VirtualRide':
        return '🚴';
      case 'Run':
        return '🏃';
      case 'Swim':
        return '🏊';
      case 'Workout':
        return '💪';
      default:
        return '⚡';
    }
  };

  const formatSpeed = (metersPerSecond) => {
    if (!metersPerSecond) return 'N/A';
    const kmh = (metersPerSecond * 3.6).toFixed(1);
    return `${kmh} km/h`;
  };

  const formatPace = (metersPerSecond) => {
    if (!metersPerSecond || metersPerSecond === 0) return 'N/A';
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              activity.isRace ? 'bg-yellow-100' : 'bg-blue-100'
            }`}>
              {activity.isRace ? (
                <Trophy className="w-6 h-6 text-yellow-600" />
              ) : (
                getActivityIcon(activity.type)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{activity.name}</h2>
                {activity.isRace && (
                  <>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                      RACE
                    </span>
                    {activity.raceType && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        {getRaceTypeLabel(activity.raceType)}
                      </span>
                    )}
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {new Date(activity.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Stats */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{formatDistance(activity.distance)}</div>
            <div className="text-sm text-gray-500 mt-1">Distance</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{formatDuration(activity.duration)}</div>
            <div className="text-sm text-gray-500 mt-1">Moving Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{Math.round(activity.elevation)}m</div>
            <div className="text-sm text-gray-500 mt-1">Elevation</div>
          </div>
          {activity.tss > 0 && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{activity.tss}</div>
              <div className="text-sm text-gray-500 mt-1">Training Load</div>
            </div>
          )}
        </div>

        {/* Route Map */}
        {activity.map?.summary_polyline && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Route</h3>
            <RouteMap activity={activity} />
          </div>
        )}

        {/* Detailed Stats */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Power Stats */}
            {activity.avgPower > 0 && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Avg Power</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round(activity.avgPower)}W</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Max Power</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round(activity.maxPower)}W</span>
                </div>
              </>
            )}

            {activity.normalizedPower > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600">Normalized Power</span>
                </div>
                <span className="font-semibold text-gray-900">{Math.round(activity.normalizedPower)}W</span>
              </div>
            )}

            {/* Heart Rate Stats */}
            {activity.avgHeartRate > 0 && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600">Avg Heart Rate</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round(activity.avgHeartRate)} bpm</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600">Max Heart Rate</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.round(activity.maxHeartRate)} bpm</span>
                </div>
              </>
            )}

            {/* Speed Stats */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Avg Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{formatSpeed(activity.avgSpeed)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600">Max Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{formatSpeed(activity.maxSpeed)}</span>
            </div>

            {/* Pace for running */}
            {activity.type === 'Run' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Avg Pace</span>
                </div>
                <span className="font-semibold text-gray-900">{formatPace(activity.avgSpeed)}</span>
              </div>
            )}

            {/* Energy */}
            {activity.kilojoules > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-600">Energy</span>
                </div>
                <span className="font-semibold text-gray-900">{Math.round(activity.kilojoules)} kJ</span>
              </div>
            )}

            {activity.calories > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600">Calories</span>
                </div>
                <span className="font-semibold text-gray-900">{Math.round(activity.calories)} cal</span>
              </div>
            )}

            {/* Suffer Score */}
            {activity.sufferScore > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">Suffer Score</span>
                </div>
                <span className="font-semibold text-gray-900">{Math.round(activity.sufferScore)}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {activity.description && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600">{activity.description}</p>
            </div>
          )}

          {/* Activity Type Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {activity.type}
            </span>
            {activity.trainer && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                Indoor
              </span>
            )}
            {activity.commute && (
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Commute
              </span>
            )}
          </div>
        </div>

        {/* AI Coach Analysis Section */}
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 transition-all mb-4"
          >
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">AI Coach Analysis</span>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {showAI ? 'Hide' : 'Show'}
            </span>
          </button>

          {showAI && (
            <div className="space-y-4">
              {/* Pre-filled activity summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Activity Summary:</p>
                <div className="text-gray-600 dark:text-gray-400 space-y-1">
                  <p>📊 {activity.name}</p>
                  <p>📅 {new Date(activity.date).toLocaleDateString()}</p>
                  <p>⏱️ Duration: {formatDuration(activity.duration)}</p>
                  <p>📏 Distance: {formatDistance(activity.distance)}</p>
                  <p>⛰️ Elevation: {Math.round(activity.elevation)}m</p>
                  {activity.tss > 0 && <p>💪 TSS: {activity.tss}</p>}
                  {activity.avgPower > 0 && <p>⚡ Avg Power: {Math.round(activity.avgPower)}W</p>}
                  {activity.normalizedPower > 0 && <p>⚡ Normalized Power: {Math.round(activity.normalizedPower)}W</p>}
                  {activity.avgHeartRate > 0 && <p>❤️ Avg HR: {Math.round(activity.avgHeartRate)} bpm</p>}
                  {activity.avgSpeed > 0 && <p>🚴 Avg Speed: {(activity.avgSpeed * 3.6).toFixed(1)} km/h</p>}
                </div>
              </div>

              {/* AI Prompt Input */}
              <div>
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask the AI coach about this activity... (e.g., 'How does this workout fit into my training?' or 'What should I focus on next?')"
                  className="min-h-[100px] dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                />
              </div>

              {/* Send Button */}
              <Button
                onClick={async () => {
                  if (!aiPrompt.trim()) return;
                  setAiLoading(true);
                  try {
                    const sessionToken = localStorage.getItem('session_token');
                    const response = await fetch('/api/coach/chat', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionToken}`
                      },
                      body: JSON.stringify({
                        message: aiPrompt,
                        context: {
                          activity: {
                            name: activity.name,
                            type: activity.type,
                            date: activity.date,
                            duration: activity.duration,
                            distance: activity.distance,
                            elevation: activity.elevation,
                            tss: activity.tss,
                            avgPower: activity.avgPower,
                            normalizedPower: activity.normalizedPower,
                            avgHeartRate: activity.avgHeartRate,
                            avgSpeed: activity.avgSpeed
                          }
                        }
                      })
                    });
                    const data = await response.json();
                    setAiResponse(data.response || 'No response from AI coach');
                  } catch (error) {
                    setAiResponse('Error: Unable to get AI coach response');
                  } finally {
                    setAiLoading(false);
                  }
                }}
                disabled={!aiPrompt.trim() || aiLoading}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {aiLoading ? 'Analyzing...' : 'Ask AI Coach'}
              </Button>

              {/* AI Response */}
              {aiResponse && (
                <div className="p-4 bg-purple-50 dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-gray-600">
                  <p className="font-medium text-purple-900 dark:text-white mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    AI Coach Response:
                  </p>
                  <div className="text-sm text-purple-900 dark:text-gray-100 whitespace-pre-wrap">
                    {aiResponse}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailModal;
