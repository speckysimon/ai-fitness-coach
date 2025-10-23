import React, { useState } from 'react';
import { X, AlertCircle, Save } from 'lucide-react';
import { Button } from './ui/Button';

const LogIllnessModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    type: 'illness',
    category: 'cold',
    severity: 'moderate',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    ongoing: false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate dates
    if (!formData.startDate) {
      alert('Please select a start date');
      return;
    }
    
    if (!formData.ongoing && formData.endDate && formData.endDate < formData.startDate) {
      alert('End date must be after start date');
      return;
    }
    
    setSaving(true);

    try {
      const sessionToken = localStorage.getItem('session_token');
      
      const payload = {
        type: formData.type,
        category: formData.category,
        severity: formData.severity,
        startDate: formData.startDate,
        endDate: formData.ongoing ? null : formData.endDate || null,
        notes: formData.notes
      };
      
      console.log('📝 Logging illness:', payload);
      
      const response = await fetch('/api/adaptation/illness', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to log illness/injury');
      }

      const data = await response.json();
      console.log('✅ Illness logged:', data);
      
      // If illness has ended, trigger AI analysis
      if (data.shouldAnalyze) {
        console.log('🤖 Triggering AI analysis for completed illness...');
        
        // Get current training data
        const cachedActivities = localStorage.getItem('cached_activities');
        const trainingPlan = localStorage.getItem('training_plan');
        
        if (cachedActivities && trainingPlan) {
          try {
            const activities = JSON.parse(cachedActivities);
            const plan = JSON.parse(trainingPlan);
            
            // Trigger analysis
            const analysisResponse = await fetch('/api/adaptation/analyze', {
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
                currentFitness: {
                  ctl: 0, // Would need to calculate
                  atl: 0,
                  tsb: 0
                },
                upcomingRaces: []
              })
            });
            
            if (analysisResponse.ok) {
              const analysisData = await analysisResponse.json();
              console.log('✅ AI analysis complete:', analysisData);
            }
          } catch (error) {
            console.error('Error triggering analysis:', error);
          }
        }
      }
      
      if (onSave) {
        onSave(data);
      }
      
      onClose();
    } catch (error) {
      console.error('Error logging illness:', error);
      alert('Failed to log illness/injury. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-bold text-gray-900">Log Time Off</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="illness"
                  checked={formData.type === 'illness'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mr-2"
                />
                Illness
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="injury"
                  checked={formData.type === 'injury'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mr-2"
                />
                Injury
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="type"
                  value="other"
                  checked={formData.type === 'other'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="mr-2"
                />
                Other
              </label>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="cold">Cold</option>
              <option value="flu">Flu</option>
              <option value="covid">COVID</option>
              <option value="injury">Injury</option>
              <option value="fatigue">Fatigue</option>
              <option value="work">Work</option>
              <option value="family">Family</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="minor"
                  checked={formData.severity === 'minor'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="mr-2"
                />
                Minor
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="moderate"
                  checked={formData.severity === 'moderate'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="mr-2"
                />
                Moderate
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="severity"
                  value="severe"
                  checked={formData.severity === 'severe'}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="mr-2"
                />
                Severe
              </label>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                disabled={formData.ongoing}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Ongoing checkbox */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ongoing}
                onChange={(e) => setFormData({ ...formData, ongoing: e.target.checked, endDate: '' })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Still ongoing</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="How are you feeling? Any symptoms?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              ℹ️ AI will automatically adjust your training plan based on this time off
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button onClick={onClose} variant="outline" type="button">
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="default" 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Log & Adjust Plan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogIllnessModal;
