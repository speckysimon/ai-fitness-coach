import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

const PlanAdjustmentNotification = ({ adjustment, onAccept, onReject, onClose }) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      // 1. Get current training plan from localStorage
      const storedPlan = localStorage.getItem('training_plan');
      let trainingPlan = null;
      
      if (storedPlan) {
        try {
          trainingPlan = JSON.parse(storedPlan);
        } catch (e) {
          console.error('Error parsing training plan:', e);
        }
      }
      
      // 2. If we have a plan, apply the adjustment
      if (trainingPlan) {
        const applyResponse = await fetch('/api/adaptation/apply-adjustment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
          },
          body: JSON.stringify({
            adjustmentId: adjustment.id,
            trainingPlan
          })
        });
        
        if (applyResponse.ok) {
          const applyData = await applyResponse.json();
          
          // Save modified plan back to localStorage
          localStorage.setItem('training_plan', JSON.stringify(applyData.modifiedPlan));
          
          console.log('✅ Plan modified:', applyData.summary);
          setSummary(applyData.summary);
        } else {
          const errorData = await applyResponse.json();
          throw new Error(errorData.error || 'Failed to apply adjustment to plan');
        }
      }
      
      // 3. Mark adjustment as accepted
      const response = await fetch(`/api/adaptation/adjustments/${adjustment.id}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        // Show success state
        setSuccess(true);
        
        // Wait a moment before closing to show success message
        setTimeout(() => {
          if (onAccept) {
            onAccept(adjustment);
          }
          onClose();
        }, 2000);
      } else {
        throw new Error('Failed to accept adjustment');
      }
    } catch (error) {
      console.error('Error accepting adjustment:', error);
      alert(`❌ Failed to apply changes: ${error.message}\n\nPlease check the console for details and try again.`);
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`/api/adaptation/adjustments/${adjustment.id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (response.ok) {
        if (onReject) {
          onReject(adjustment);
        }
        onClose();
      } else {
        throw new Error('Failed to reject adjustment');
      }
    } catch (error) {
      console.error('Error rejecting adjustment:', error);
      alert('Failed to reject adjustment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const changes = typeof adjustment.changes === 'string' 
    ? JSON.parse(adjustment.changes) 
    : adjustment.changes;

  // Success state
  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Changes Applied!</h2>
          <p className="text-gray-600 mb-4">Your training plan has been updated successfully.</p>
          
          {summary && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
              <p className="text-sm text-gray-700">
                <strong>{summary.cancelledSessions}</strong> sessions cancelled<br />
                <strong>{summary.modifiedSessions}</strong> sessions adjusted<br />
                Total TSS: <strong>{summary.originalTss}</strong> → <strong>{summary.newTss}</strong>
              </p>
            </div>
          )}
          
          <Button
            onClick={() => {
              onClose();
              navigate('/plan-generator');
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            View Updated Plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Training Plan Adjusted</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Reason */}
          {adjustment.event_type && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Reason:</p>
              <p className="text-sm text-gray-600 capitalize">
                {adjustment.event_type.replace('_', ' ')}
                {adjustment.event_date && ` (${new Date(adjustment.event_date).toLocaleDateString()})`}
              </p>
            </div>
          )}

          {/* AI Reasoning */}
          {adjustment.ai_reasoning && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">AI Analysis:</p>
              <p className="text-sm text-gray-600">{adjustment.ai_reasoning}</p>
            </div>
          )}

          {/* Changes */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Changes to Your Plan:</p>
            <div className="space-y-2">
              {changes && changes.map((change, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-sm font-medium text-gray-900 capitalize mb-1">
                    {change.week === 'current' ? 'This Week' : 
                     change.week === 'next' ? 'Next Week' : 
                     `Week ${change.week}`}
                  </p>
                  <p className="text-sm text-gray-600">{change.adjustment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Race Impact (if available) */}
          {adjustment.race_impact && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Impact on Your Race Goal:
              </p>
              <p className="text-sm text-blue-800">
                {adjustment.race_impact.message || 'Your race goal is still achievable with these adjustments.'}
              </p>
            </div>
          )}

          {/* Motivational Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              💪 {adjustment.user_message || 'Stay consistent and trust the process. You\'ve got this!'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handleReject}
            variant="outline"
            disabled={processing}
            className="border-gray-300"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Keep Current Plan
          </Button>
          <Button
            onClick={handleAccept}
            variant="default"
            disabled={processing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlanAdjustmentNotification;
