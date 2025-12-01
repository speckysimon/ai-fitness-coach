import React, { useState, useEffect } from 'react';
import { X, Activity, Clock, Calendar, Zap, MapPin, Heart, MessageSquare } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const ManualActivityModal = ({ isOpen, onClose, onSave, editActivity = null }) => {
  const [formData, setFormData] = useState({
    activityDate: new Date().toISOString().split('T')[0],
    activityName: '',
    sportType: 'Cycling - Road',
    duration: 60,
    distance: '',
    intensityLevel: 'Moderate',
    perceivedExertion: 5,
    avgHeartRate: '',
    calories: '',
    elevationGain: '',
    notes: '',
    location: '',
    indoor: false
  });

  const [sportTypes, setSportTypes] = useState([]);
  const [intensityLevels, setIntensityLevels] = useState([]);
  const [intensityDescriptions, setIntensityDescriptions] = useState({});
  const [estimatedTSS, setEstimatedTSS] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load sport types and intensity levels
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/manual-activities/sport-types');
        const data = await response.json();
        setSportTypes(data.sportTypes);
        setIntensityLevels(data.intensityLevels);
        setIntensityDescriptions(data.intensityDescriptions);
      } catch (err) {
        console.error('Error loading sport types:', err);
      }
    };
    loadConfig();
  }, []);

  // Populate form if editing
  useEffect(() => {
    if (editActivity) {
      setFormData({
        activityDate: editActivity.activity_date?.split('T')[0] || editActivity.activityDate,
        activityName: editActivity.activity_name || editActivity.activityName,
        sportType: editActivity.sport_type || editActivity.sportType,
        duration: editActivity.duration,
        distance: editActivity.distance || '',
        intensityLevel: editActivity.intensity_level || editActivity.intensityLevel,
        perceivedExertion: editActivity.perceived_exertion || editActivity.perceivedExertion || 5,
        avgHeartRate: editActivity.avg_heart_rate || editActivity.avgHeartRate || '',
        calories: editActivity.calories || '',
        elevationGain: editActivity.elevation_gain || editActivity.elevationGain || '',
        notes: editActivity.notes || '',
        location: editActivity.location || '',
        indoor: editActivity.indoor === 1 || editActivity.indoor === true
      });
    }
  }, [editActivity]);

  // Calculate estimated TSS when relevant fields change
  useEffect(() => {
    const calculateTSS = () => {
      const durationHours = formData.duration / 60;
      const sportMultipliers = {
        'Cycling - Road': 1.0,
        'Cycling - MTB': 1.1,
        'Cycling - Indoor': 0.95,
        'Running - Road': 1.2,
        'Running - Trail': 1.3,
        'Running - Treadmill': 1.1,
        'Swimming - Pool': 0.8,
        'Swimming - Open Water': 0.9,
        'Strength Training': 0.6,
        'Yoga': 0.3,
        'Pilates': 0.4,
        'Stretching': 0.2,
        'Cross Training': 0.7,
        'Other': 0.5
      };

      const intensityFactors = {
        'Recovery': 0.5,
        'Easy': 0.65,
        'Moderate': 0.75,
        'Hard': 0.85,
        'Very Hard': 0.95,
        'Maximum': 1.1
      };

      const sportMult = sportMultipliers[formData.sportType] || 0.5;
      const intensityFactor = intensityFactors[formData.intensityLevel] || 0.75;

      let tss = durationHours * intensityFactor * intensityFactor * 100 * sportMult;

      // Adjust by RPE
      if (formData.perceivedExertion) {
        const rpeAdjustment = formData.perceivedExertion / 10;
        tss *= (0.7 + (rpeAdjustment * 0.6));
      }

      setEstimatedTSS(Math.round(tss));
    };

    calculateTSS();
  }, [formData.duration, formData.sportType, formData.intensityLevel, formData.perceivedExertion]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get userId from localStorage
      const currentUser = localStorage.getItem('current_user');
      const userId = currentUser ? JSON.parse(currentUser).id || 1 : 1; // Default to 1 for now

      const endpoint = editActivity
        ? `/api/manual-activities/${editActivity.id}`
        : '/api/manual-activities';

      const method = editActivity ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save activity');
      }

      const data = await response.json();
      onSave(data.activity);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {editActivity ? 'Edit Manual Activity' : 'Add Manual Activity'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Log activities not tracked in Strava (gym, cross-training, etc.)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date *
              </label>
              <input
                type="date"
                value={formData.activityDate}
                onChange={(e) => handleChange('activityDate', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Activity className="w-4 h-4 inline mr-2" />
                Activity Name *
              </label>
              <input
                type="text"
                value={formData.activityName}
                onChange={(e) => handleChange('activityName', e.target.value)}
                placeholder="e.g., Morning Gym Session, Yoga Class"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sport Type *
              </label>
              <select
                value={formData.sportType}
                onChange={(e) => handleChange('sportType', e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {sportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration and Distance */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Duration (minutes) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Distance (km)
              </label>
              <input
                type="number"
                value={formData.distance}
                onChange={(e) => handleChange('distance', e.target.value)}
                min="0"
                step="0.1"
                placeholder="Optional"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Zap className="w-4 h-4 inline mr-2" />
              Intensity Level *
            </label>
            <select
              value={formData.intensityLevel}
              onChange={(e) => handleChange('intensityLevel', e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              {intensityLevels.map(level => (
                <option key={level} value={level}>
                  {level} - {intensityDescriptions[level]?.description}
                </option>
              ))}
            </select>
          </div>

          {/* Perceived Exertion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Perceived Exertion (RPE 1-10)
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                value={formData.perceivedExertion}
                onChange={(e) => handleChange('perceivedExertion', parseInt(e.target.value))}
                min="1"
                max="10"
                className="flex-1"
              />
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 w-12 text-center">
                {formData.perceivedExertion}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              1 = Very easy, 10 = Maximum effort
            </p>
          </div>

          {/* Optional Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Heart className="w-4 h-4 inline mr-2" />
                Avg HR
              </label>
              <input
                type="number"
                value={formData.avgHeartRate}
                onChange={(e) => handleChange('avgHeartRate', e.target.value)}
                min="0"
                placeholder="bpm"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Calories
              </label>
              <input
                type="number"
                value={formData.calories}
                onChange={(e) => handleChange('calories', e.target.value)}
                min="0"
                placeholder="kcal"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Elevation
              </label>
              <input
                type="number"
                value={formData.elevationGain}
                onChange={(e) => handleChange('elevationGain', e.target.value)}
                min="0"
                placeholder="meters"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Location and Indoor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g., Local Gym, Home"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.indoor}
                  onChange={(e) => handleChange('indoor', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Indoor Activity
                </span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows="3"
              placeholder="How did it feel? Any observations?"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Estimated TSS Display */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Estimated Training Stress Score (TSS)
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Based on duration, intensity, and sport type
                </p>
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {estimatedTSS}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? 'Saving...' : editActivity ? 'Update Activity' : 'Add Activity'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ManualActivityModal;
