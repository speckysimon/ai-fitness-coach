import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertCircle, CheckCircle, Calendar, Zap, Brain, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import IllnessHistoryModal from './IllnessHistoryModal';

const AITrainingCoach = ({ onLogIllness, onViewAdjustments }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingAdjustments, setPendingAdjustments] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [coachPrompt, setCoachPrompt] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      console.log('🔄 AI Coach: Loading status...');
      const sessionToken = localStorage.getItem('session_token');
      
      // Get pending adjustments
      const response = await fetch('/api/adaptation/adjustments/pending', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Pending adjustments:', data.adjustments);
        console.log('Number of pending adjustments:', (data.adjustments || []).length);
        setPendingAdjustments(data.adjustments || []);
      } else {
        console.error('Failed to load pending adjustments:', response.status);
      }

      // Get active illnesses
      const activeResponse = await fetch('/api/adaptation/active', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        const hasActiveIllness = activeData.events && activeData.events.length > 0;
        
        console.log('🩺 Active illnesses:', activeData.events);
        
        setStatus({
          hasActiveIllness,
          activeEvent: hasActiveIllness ? activeData.events[0] : null
        });
      }
      
      // Also get recent history to show completed illnesses
      const historyResponse = await fetch('/api/adaptation/history', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        console.log('📜 History:', historyData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading AI coach status:', error);
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (pendingAdjustments.length > 0) {
      return <AlertCircle className="w-5 h-5 text-orange-600" />;
    }
    if (status?.hasActiveIllness) {
      return <Activity className="w-5 h-5 text-red-600" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusText = () => {
    if (pendingAdjustments.length > 0) {
      return 'Plan Adjustment Recommended';
    }
    if (status?.hasActiveIllness) {
      return 'Recovery Mode';
    }
    return 'On Track';
  };

  const getStatusColor = () => {
    if (pendingAdjustments.length > 0) {
      return 'text-orange-600';
    }
    if (status?.hasActiveIllness) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            AI Training Coach
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600" />
          AI Training Coach
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Pending Adjustments */}
        {pendingAdjustments.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-900 font-medium mb-2">
              🤖 Your plan needs adjustment
            </p>
            <p className="text-sm text-orange-800 mb-3">
              {pendingAdjustments[0].ai_reasoning}
            </p>
            <Button
              onClick={onViewAdjustments}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              View Recommendation
            </Button>
          </div>
        )}

        {/* Active Illness */}
        {status?.hasActiveIllness && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900 font-medium mb-1">
              Recovery Mode Active
            </p>
            <p className="text-sm text-red-800">
              {status.activeEvent.category} - {status.activeEvent.severity}
            </p>
            <p className="text-xs text-red-700 mt-2">
              Started: {new Date(status.activeEvent.start_date).toLocaleDateString()}
            </p>
            <Button
              onClick={async () => {
                try {
                  const sessionToken = localStorage.getItem('session_token');
                  const endDate = new Date().toISOString().split('T')[0];
                  
                  // Mark illness as ended
                  await fetch(`/api/adaptation/illness/${status.activeEvent.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionToken}`
                    },
                    body: JSON.stringify({ endDate })
                  });
                  
                  // Trigger AI analysis
                  const cachedActivities = localStorage.getItem('cached_activities');
                  const trainingPlan = localStorage.getItem('training_plan');
                  
                  if (cachedActivities && trainingPlan) {
                    const activities = JSON.parse(cachedActivities);
                    const plan = JSON.parse(trainingPlan);
                    
                    const response = await fetch('/api/adaptation/analyze', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionToken}`
                      },
                      body: JSON.stringify({
                        recentActivities: activities.slice(0, 14).map(a => {
                          let date;
                          try {
                            if (a.start_date_local) {
                              date = a.start_date_local.split('T')[0];
                            } else if (a.start_date) {
                              date = new Date(a.start_date).toISOString().split('T')[0];
                            } else {
                              date = new Date().toISOString().split('T')[0];
                            }
                          } catch (e) {
                            date = new Date().toISOString().split('T')[0];
                          }
                          return {
                            date,
                            actualTss: a.suffer_score || 0,
                            plannedTss: 0
                          };
                        }),
                        currentPlan: plan,
                        currentFitness: { ctl: 0, atl: 0, tsb: 0 },
                        upcomingRaces: []
                      })
                    });
                    
                    if (response.ok) {
                      const data = await response.json();
                      console.log('✅ Analysis triggered:', data);
                      
                      if (data.needsAdjustment && onViewAdjustments) {
                        onViewAdjustments();
                      }
                    }
                  }
                  
                  // Reload status
                  loadStatus();
                } catch (error) {
                  console.error('Error marking as recovered:', error);
                  alert('Failed to mark as recovered. Please try again.');
                }
              }}
              variant="outline"
              className="w-full mt-3 text-sm border-red-300 text-red-700 hover:bg-red-100"
            >
              Mark as Recovered & Analyze
            </Button>
          </div>
        )}

        {/* On Track */}
        {!pendingAdjustments.length && !status?.hasActiveIllness && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900 font-medium mb-1">
              ✅ Training plan is on track
            </p>
            <p className="text-sm text-green-800">
              Keep up the great work! Your consistency is paying off.
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t border-gray-200 space-y-2">
          <p className="text-xs text-gray-500 mb-2">Quick Actions</p>
          <Button
            onClick={onLogIllness}
            variant="outline"
            className="w-full text-sm"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Log Illness/Injury
          </Button>
          
          <Button
            onClick={() => setShowHistory(true)}
            variant="outline"
            className="w-full text-sm"
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
          
          {/* Coach Prompt Input */}
          <div className="space-y-2">
            <label htmlFor="coach-prompt" className="text-xs text-gray-600 font-medium">
              Talk to your AI Coach
            </label>
            <Textarea
              id="coach-prompt"
              placeholder="e.g., I've had to work late and only have 45 mins today for training, can you please adjust my plan accordingly and give me a good workout for today."
              value={coachPrompt}
              onChange={(e) => setCoachPrompt(e.target.value)}
              className="text-sm resize-none"
              rows={3}
            />
          </div>
          
          {/* Analyze Plan Button */}
          <Button
            onClick={async () => {
              try {
                const sessionToken = localStorage.getItem('session_token');
                const trainingPlan = localStorage.getItem('training_plan');
                
                if (!trainingPlan) {
                  alert('No training plan found. Please create a training plan first.');
                  return;
                }
                
                const plan = JSON.parse(trainingPlan);
                
                // Trigger analysis with minimal data and user prompt
                const response = await fetch('/api/adaptation/analyze', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sessionToken}`
                  },
                  body: JSON.stringify({
                    recentActivities: [],
                    currentPlan: plan,
                    currentFitness: { ctl: 0, atl: 0, tsb: 0 },
                    upcomingRaces: [],
                    userPrompt: coachPrompt || undefined // Include user prompt if provided
                  })
                });
                
                if (response.ok) {
                  const data = await response.json();
                  console.log('✅ Analysis result:', data);
                  
                  // Clear the prompt after successful submission
                  setCoachPrompt('');
                  
                  // Reload status to show pending adjustments
                  loadStatus();
                  
                  if (data.needsAdjustment) {
                    // Show the adjustment notification
                    if (onViewAdjustments) {
                      onViewAdjustments();
                    }
                  } else {
                    alert('Analysis complete! No adjustments needed.');
                  }
                } else {
                  const errorData = await response.json();
                  console.error('Analysis error:', errorData);
                  alert('Analysis failed: ' + (errorData.error || 'Unknown error'));
                }
              } catch (error) {
                console.error('Error analyzing plan:', error);
                alert('Error analyzing plan: ' + error.message);
              }
            }}
            variant="default"
            className="w-full text-sm bg-blue-600 hover:bg-blue-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Analyze & Adjust Plan
          </Button>
        </div>
      </CardContent>
      
      {/* Illness History Modal */}
      {showHistory && (
        <IllnessHistoryModal
          onClose={() => {
            setShowHistory(false);
            // Reload status after closing in case entries were deleted
            loadStatus();
          }}
        />
      )}
    </Card>
  );
};

export default AITrainingCoach;
