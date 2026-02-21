import React, { useState, useRef } from 'react';
import { X, Clock, TrendingUp, Mountain, Zap, Heart, Activity as ActivityIcon, Trophy, Brain, Send, Target, Gauge, Upload, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { formatDuration, formatDistance } from '../lib/utils';
import { getRaceTypeLabel } from '../lib/raceUtils';
import RouteMap from './RouteMap';
import CoachingChart from './CoachingChart';
import ZoneAnalysis from './ZoneAnalysis';
import IntervalSummary from './IntervalSummary';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';

const ActivityDetailModal = ({ activity, onClose, onActivityUpdated, showAICoach = false }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAI, setShowAI] = useState(showAICoach);

  // FIT upload state for empty activities
  const [fitFile, setFitFile] = useState(null);
  const [fitUploading, setFitUploading] = useState(false);
  const [fitError, setFitError] = useState(null);
  const [fitSuccess, setFitSuccess] = useState(false);
  const fitInputRef = useRef(null);

  if (!activity) return null;

  // Detect "empty" activity — shell from Intervals with no real data
  const isEmptyActivity = (
    (!activity.duration || activity.duration === 0) &&
    (!activity.distance || activity.distance === 0) &&
    (!activity.avgPower) && (!activity.avgHeartRate)
  );

  const handleFitSelect = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.fit')) {
      setFitError('Only .fit files are accepted');
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setFitError('File exceeds 25 MB limit');
      return;
    }
    setFitFile(f);
    setFitError(null);
  };

  const handleFitUpload = async () => {
    if (!fitFile || fitUploading) return;
    setFitUploading(true);
    setFitError(null);
    try {
      const sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) throw new Error('Not logged in');
      const formData = new FormData();
      formData.append('file', fitFile);
      const response = await fetch('/api/activities/upload-fit', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error?.message || 'Upload failed');
      setFitSuccess(true);
      if (onActivityUpdated) setTimeout(() => onActivityUpdated(), 500);
    } catch (err) {
      setFitError(err.message || 'Upload failed');
    } finally {
      setFitUploading(false);
    }
  };

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
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{getActivityIcon(activity.type)}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{activity.name}</h2>
                  {activity.is_shell && (
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700">
                      Shell Activity
                    </span>
                  )}
                </div>
                {activity.is_shell && activity.shell_reason && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    No meaningful data ({activity.shell_reason.replace(/_/g, ' ')})
                  </p>
                )}
                {activity.isRace && (
                  <div className="flex items-center gap-2 mt-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      {getRaceTypeLabel(activity.raceType)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <p className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(activity.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
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

        {/* Empty Activity Banner — prompt user to upload FIT file */}
        {isEmptyActivity && !fitSuccess && (
          <div className="mx-6 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Missing Activity Data</p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  This intervals.icu activity was originally uploaded to Strava. Due to Strava API restrictions it was imported without detailed metrics. Upload the original .fit file to add power, heart rate, GPS route, and more. For the lite version connect your Strava account in <a href="/settings" className="underline font-medium hover:text-amber-800 dark:hover:text-amber-200">settings</a>.
                </p>
              </div>
            </div>
            <div
              onClick={() => fitInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); handleFitSelect(e.dataTransfer?.files?.[0]); }}
              onDragOver={(e) => e.preventDefault()}
              className={`flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                fitFile
                  ? 'border-green-400 bg-green-50 dark:bg-green-900/10'
                  : 'border-amber-300 dark:border-amber-700 hover:border-blue-400 hover:bg-amber-100/50 dark:hover:bg-amber-800/20'
              }`}
            >
              <input
                ref={fitInputRef}
                type="file"
                accept=".fit"
                onChange={(e) => handleFitSelect(e.target.files?.[0])}
                className="hidden"
              />
              {fitFile ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{fitFile.name}</span>
                  <span className="text-xs text-gray-500">({(fitFile.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-amber-400" />
                  <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Drop .fit file here or click to browse</p>
                </>
              )}
            </div>
            {fitFile && !fitUploading && (
              <button
                onClick={handleFitUpload}
                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Upload className="w-4 h-4" />
                Upload & Enrich Activity
              </button>
            )}
            {fitUploading && (
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading and parsing...</span>
              </div>
            )}
            {fitError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{fitError}</p>
            )}
          </div>
        )}
        {fitSuccess && (
          <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">Activity enriched!</p>
              <p className="text-sm text-green-600 dark:text-green-400">Close this modal and reopen the activity to see the updated data.</p>
            </div>
          </div>
        )}

        {/* Main Stats */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatDistance(activity.distance)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Distance</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{formatDuration(activity.duration)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Moving Time</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{Math.round(activity.elevation)}m</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Elevation</div>
          </div>
          {activity.tss > 0 && (
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{activity.tss}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Training Load</div>
            </div>
          )}
        </div>

        {/* Coaching Chart — Time-series overlay (Power, HR, Cadence, Elevation) */}
        {!activity.is_shell && activity.intervals_id && activity.stream_types?.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Activity Streams
            </h3>
            <CoachingChart activity={activity} />
          </div>
        )}

        {/* Route Map - works for Strava, Intervals.icu, and FIT uploads */}
        {!activity.is_shell && (activity.map?.summary_polyline || 
          activity.latlngs?.length > 1 ||
          (activity.source === 'intervals' && activity.stream_types?.includes('latlng'))) && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Route</h3>
            <RouteMap activity={activity} />
          </div>
        )}

        {/* Detailed Stats */}
        <div className="px-6 pb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Details</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Power Stats */}
            {activity.avgPower > 0 && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Power</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.avgPower)}W</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Power</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.maxPower)}W</span>
                </div>
              </>
            )}

            {activity.normalizedPower > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Normalized Power</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.normalizedPower)}W</span>
              </div>
            )}

            {/* Heart Rate Stats */}
            {activity.avgHeartRate > 0 && (
              <>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Avg Heart Rate</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.avgHeartRate)} bpm</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Max Heart Rate</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.maxHeartRate)} bpm</span>
                </div>
              </>
            )}

            {/* Speed Stats */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Avg Speed</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatSpeed(activity.avgSpeed)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Max Speed</span>
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatSpeed(activity.maxSpeed)}</span>
            </div>

            {/* Pace for running */}
            {activity.type === 'Run' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Pace</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPace(activity.avgSpeed)}</span>
              </div>
            )}

            {/* Energy */}
            {activity.kilojoules > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Energy</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.kilojoules)} kJ</span>
              </div>
            )}

            {activity.calories > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ActivityIcon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Calories</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.calories)} cal</span>
              </div>
            )}

            {/* Suffer Score */}
            {activity.sufferScore > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Suffer Score</span>
                </div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(activity.sufferScore)}</span>
              </div>
            )}
          </div>

          {/* Advanced Metrics */}
          {(
            activity.icu_variability_index || activity.icu_efficiency_factor || 
            activity.decoupling || activity.icu_power_hr
          ) && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Gauge className="w-4 h-4" />
                Advanced Metrics
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {activity.icu_variability_index && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Variability Index</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activity.icu_variability_index.toFixed(2)}
                    </div>
                  </div>
                )}
                {activity.icu_efficiency_factor && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Efficiency Factor</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activity.icu_efficiency_factor.toFixed(2)}
                    </div>
                  </div>
                )}
                {activity.decoupling && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Decoupling</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activity.decoupling.toFixed(1)}%
                    </div>
                  </div>
                )}
                {activity.icu_power_hr && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Power:HR Ratio</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {activity.icu_power_hr.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {activity.description && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
            </div>
          )}

          {/* Activity Type Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {activity.type}
            </span>
            {activity.trainer && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
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

        {/* Power Zones */}
        {activity.icu_zone_times && activity.icu_zone_times.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Power Zones
            </h3>
            <ZoneAnalysis zones={activity.icu_zone_times} type="power" />
          </div>
        )}

        {/* Heart Rate Zones */}
        {activity.icu_hr_zone_times && activity.icu_hr_zone_times.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600 dark:text-red-400" />
              Heart Rate Zones
            </h3>
            <div className="space-y-2">
              {activity.icu_hr_zone_times.map((seconds, index) => {
                const totalSeconds = activity.icu_hr_zone_times.reduce((sum, s) => sum + s, 0);
                const percentage = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
                if (seconds === 0) return null;
                
                const formatTime = (secs) => {
                  const mins = Math.floor(secs / 60);
                  const s = secs % 60;
                  return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
                };
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">Z{index + 1}</div>
                    <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center text-xs font-semibold text-white"
                        style={{ width: `${percentage}%` }}
                      >
                        {percentage > 10 && `${percentage.toFixed(0)}%`}
                      </div>
                    </div>
                    <div className="w-20 text-sm text-gray-600 dark:text-gray-400 text-right">
                      {formatTime(seconds)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interval Summary */}
        {activity.interval_summary && activity.interval_summary.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Key Intervals
            </h3>
            <IntervalSummary intervals={activity.interval_summary} />
          </div>
        )}

        {/* AI Coach Analysis Section */}
        <div className="px-6 pb-6">
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg hover:from-indigo-100 hover:to-blue-100 dark:hover:from-gray-700 dark:hover:to-gray-600 transition-all mb-4 border border-indigo-200 dark:border-gray-600"
          >
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-semibold text-gray-900 dark:text-white">AI Coach Analysis</span>
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
                    const selectedCoach = localStorage.getItem('selected_coach') || 'coach-alex';
                    const response = await fetch('/api/coach/chat', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionToken}`
                      },
                      body: JSON.stringify({
                        message: aiPrompt,
                        coachId: selectedCoach,
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
                <div className="p-4 bg-indigo-50 dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-gray-600">
                  <p className="font-medium text-indigo-900 dark:text-white mb-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    AI Coach Response:
                  </p>
                  <div className="text-sm text-indigo-900 dark:text-gray-100 whitespace-pre-wrap">
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
