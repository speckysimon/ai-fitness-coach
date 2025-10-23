import React, { useState, useEffect } from 'react';
import { X, Trophy, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { setActivityRace, fetchRaceTags, RACE_TYPES } from '../lib/raceUtils';

const EditActivityModal = ({ activity, onClose, onSave }) => {
  const [isRace, setIsRace] = useState(false);
  const [raceType, setRaceType] = useState('');

  useEffect(() => {
    // Load race tags from backend
    const loadRaceTag = async () => {
      const raceTags = await fetchRaceTags();
      const raceData = raceTags[activity.id];
      if (raceData) {
        setIsRace(raceData.isRace || false);
        setRaceType(raceData.raceType || '');
      } else {
        setIsRace(false);
        setRaceType('');
      }
    };
    loadRaceTag();
  }, [activity.id]);

  const handleSave = async () => {
    // Save race tag to backend
    const success = await setActivityRace(activity.id, isRace, raceType);
    
    if (success) {
      if (onSave) {
        onSave({ ...activity, isRace, raceType });
      }
      onClose();
    } else {
      alert('Failed to save race tag. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Activity</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Activity Name */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{activity.name}</h3>
            <p className="text-sm text-gray-500">
              {new Date(activity.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Race Toggle */}
          <div className="border border-gray-200 rounded-lg p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isRace ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  <Trophy className={`w-5 h-5 ${isRace ? 'text-yellow-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Mark as Race</p>
                  <p className="text-sm text-gray-500">
                    Display this activity with a race trophy icon
                  </p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRace}
                  onChange={(e) => setIsRace(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
              </div>
            </label>
          </div>

          {/* Race Type Dropdown */}
          {isRace && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Race Type
                </label>
                <select
                  value={raceType}
                  onChange={(e) => setRaceType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  {RACE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  This activity will be displayed with a race trophy icon and type badge on your dashboard, activities list, and calendar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditActivityModal;
