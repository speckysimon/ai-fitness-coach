import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Zap, Calendar, Clock, TrendingUp, Activity as ActivityIcon } from 'lucide-react';
import { Button } from './ui/Button';

const ActivityMatchModal = ({ isOpen, onClose, session, sessionKey, activities, currentMatch, onManualSelect, onRemoveMatch }) => {
  const [selectedActivity, setSelectedActivity] = useState(currentMatch?.activity?.id || null);

  if (!isOpen || !session) return null;

  // Filter activities for the same date
  const sessionDate = session.date;
  const dayActivities = activities.filter(activity => {
    const activityDate = new Date(activity.date).toISOString().split('T')[0];
    return activityDate === sessionDate;
  });

  const getMatchQuality = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-300' };
    if (score >= 80) return { label: 'Very Good', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-300' };
    if (score >= 70) return { label: 'Good', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300' };
    if (score >= 60) return { label: 'Acceptable', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-300' };
    return { label: 'Poor', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-300' };
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters) => {
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  const handleConfirm = () => {
    if (selectedActivity) {
      const activity = dayActivities.find(a => a.id === selectedActivity);
      onManualSelect(sessionKey, activity);
    } else {
      onRemoveMatch(sessionKey);
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Activity Matching</h2>
              <p className="text-gray-600">{session.title} - {session.day}, {new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              <div className="flex items-center gap-2 mt-2">
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
                <span className="text-sm text-gray-600">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {session.duration} min
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {currentMatch && currentMatch.matched && (
            <div className={`mb-6 p-4 rounded-lg border-2 ${getMatchQuality(currentMatch.alignmentScore).borderColor} ${getMatchQuality(currentMatch.alignmentScore).bgColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className={`w-5 h-5 ${getMatchQuality(currentMatch.alignmentScore).color}`} />
                <h3 className="font-semibold text-gray-900">Current Auto-Match</h3>
                <span className={`ml-auto px-3 py-1 rounded-full text-sm font-bold ${getMatchQuality(currentMatch.alignmentScore).color}`}>
                  {currentMatch.alignmentScore}% {getMatchQuality(currentMatch.alignmentScore).label}
                </span>
              </div>
              <p className="text-sm text-gray-700">{currentMatch.reason}</p>
            </div>
          )}

          <h3 className="font-semibold text-gray-900 mb-3">
            {dayActivities.length > 0 ? `Activities on ${new Date(sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No Activities Found'}
          </h3>

          {dayActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activities recorded on this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Option to clear selection */}
              <div
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedActivity === null
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => setSelectedActivity(null)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      selectedActivity === null
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    } flex items-center justify-center`}>
                      {selectedActivity === null && <CheckCircle className="w-4 h-4 text-white" />}
                    </div>
                    <span className="font-medium text-gray-900">No Match (Mark as incomplete)</span>
                  </div>
                </div>
              </div>

              {/* Activity options */}
              {dayActivities.map((activity) => {
                const isSelected = selectedActivity === activity.id;
                const isCurrentMatch = currentMatch?.activity?.id === activity.id;
                
                return (
                  <div
                    key={activity.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : isCurrentMatch
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedActivity(activity.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-5 h-5 rounded-full border-2 mt-1 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        } flex items-center justify-center`}>
                          {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                            {isCurrentMatch && (
                              <span className="px-2 py-0.5 bg-green-200 text-green-800 text-xs rounded font-bold">
                                AUTO-MATCHED
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600 mt-2">
                            <div>
                              <div className="text-xs text-gray-500">Duration</div>
                              <div className="font-medium">{formatDuration(activity.duration)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Distance</div>
                              <div className="font-medium">{formatDistance(activity.distance)}</div>
                            </div>
                            {activity.avgPower && (
                              <div>
                                <div className="text-xs text-gray-500">Avg Power</div>
                                <div className="font-medium">{Math.round(activity.avgPower)}W</div>
                              </div>
                            )}
                            {activity.tss && (
                              <div>
                                <div className="text-xs text-gray-500">TSS</div>
                                <div className="font-medium">{Math.round(activity.tss)}</div>
                              </div>
                            )}
                          </div>
                          {currentMatch && activity.id === currentMatch.activity?.id && (
                            <div className="mt-2 text-xs text-gray-600">
                              <strong>Match Score:</strong> {currentMatch.alignmentScore}% - {currentMatch.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {dayActivities.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <strong>Manual Override:</strong> Selecting an activity manually will override the automatic match. 
                  Manual selections have a lower weight (70%) in training alignment calculations compared to auto-matches (100%).
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ActivityMatchModal;
