import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle, Loader2, Brain } from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { getCurrentDateTime } from '../lib/timezone';

const AdaptivePlanModal = ({ isOpen, onClose, onAdjust, plan, activities, completedSessions }) => {
  const [adjustmentRequest, setAdjustmentRequest] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [error, setError] = useState(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAdjustmentRequest('');
      setSuggestions(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const analyzeAndSuggest = async () => {
    if (!adjustmentRequest.trim()) {
      setError('Please describe what you need to adjust');
      return;
    }

    setLoading(true);
    setError(null);
    setSuggestions(null);

    try {
      const sessionToken = localStorage.getItem('session_token');
      const userDateTime = getCurrentDateTime(); // Get user's current date/time with timezone
      
      const response = await fetch('/api/training/plan/adjust', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          plan,
          activities,
          completedSessions,
          adjustmentRequest,
          userDateTime, // Include timezone-aware date/time
          context: {
            missedSessions: Object.values(completedSessions).filter(s => s?.missed).length,
            completedCount: Object.values(completedSessions).filter(s => s?.completed).length,
            totalSessions: plan.weeks.reduce((sum, week) => sum + week.sessions.length, 0)
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate adjustment suggestions');
      }

      const data = await response.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Error analyzing plan:', err);
      setError(err.message || 'Failed to analyze plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyAdjustments = () => {
    if (suggestions?.adjustedPlan) {
      onAdjust(suggestions.adjustedPlan, suggestions.explanation);
      onClose();
    }
  };

  const handleClose = () => {
    setAdjustmentRequest('');
    setSuggestions(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6" />
              <div>
                <h2 className="text-2xl font-bold">Adaptive Plan Adjustment</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Tell your AI coach what needs to change
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Request Input */}
          {!suggestions && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  What needs to be adjusted?
                </label>
                <Textarea
                  value={adjustmentRequest}
                  onChange={(e) => setAdjustmentRequest(e.target.value)}
                  placeholder="Examples:
• I did a ride today instead of a rest day. Please adjust accordingly.
• I'm feeling fatigued and need to reduce intensity this week.
• I missed sessions due to illness. Can you reschedule them?
• I have a work trip next week and can only train on weekends.
• The tempo sessions are too hard. Can you make them easier?

Note: Your AI coach automatically sees your recent activities and their dates - no need to specify them!"
                  rows={9}
                  className="text-sm"
                />
              </div>

              {/* Context Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-2">Your AI coach will consider:</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Your recent completed activities</li>
                      <li>• Missed sessions and their reasons</li>
                      <li>• Current training load and fatigue</li>
                      <li>• Remaining time until your event</li>
                      <li>• Your specific adjustment request</li>
                    </ul>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button onClick={handleClose} variant="outline">
                  Cancel
                </Button>
                <Button
                  onClick={analyzeAndSuggest}
                  disabled={loading || !adjustmentRequest.trim()}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze & Suggest
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Suggestions Display */}
          {suggestions && (
            <>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">
                      Adjustment Plan Ready
                    </h3>
                    <p className="text-sm text-green-800 whitespace-pre-line">
                      {suggestions.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Changes Summary */}
              {suggestions.changes && suggestions.changes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Proposed Changes:</h4>
                  <div className="space-y-2">
                    {suggestions.changes.map((change, idx) => (
                      <div
                        key={idx}
                        className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold mt-0.5">•</span>
                          <div className="flex-1">
                            <p className="text-purple-900 font-medium">{change.type}</p>
                            <p className="text-purple-700 mt-1">{change.description}</p>
                            {change.sessions && (
                              <p className="text-purple-600 text-xs mt-1">
                                Affects: {change.sessions.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning if significant changes */}
              {suggestions.significantChanges && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-900">
                      <p className="font-semibold mb-1">Significant Changes Detected</p>
                      <p className="text-orange-800">
                        This adjustment will modify multiple weeks of your plan. Make sure you're
                        comfortable with these changes before applying.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  onClick={() => {
                    setSuggestions(null);
                    setError(null);
                  }}
                  variant="outline"
                >
                  Back to Edit
                </Button>
                <Button
                  onClick={applyAdjustments}
                  className="bg-gradient-to-r from-purple-600 to-blue-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Adjustments
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdaptivePlanModal;
