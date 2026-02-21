import React from 'react';

const ZoneAnalysis = ({ zones, type = 'power' }) => {
  if (!zones || zones.length === 0) return null;

  // Calculate total time
  const totalSeconds = zones.reduce((sum, zone) => sum + (zone.secs || 0), 0);

  // Zone colors
  const zoneColors = {
    'Z1': 'bg-gray-400',
    'Z2': 'bg-blue-400',
    'Z3': 'bg-green-400',
    'Z4': 'bg-yellow-400',
    'Z5': 'bg-orange-400',
    'Z6': 'bg-red-400',
    'Z7': 'bg-purple-400',
    'SS': 'bg-pink-400' // Sweet Spot
  };

  const zoneLabels = {
    'Z1': 'Recovery',
    'Z2': 'Endurance',
    'Z3': 'Tempo',
    'Z4': 'Threshold',
    'Z5': 'VO2 Max',
    'Z6': 'Anaerobic',
    'Z7': 'Neuromuscular',
    'SS': 'Sweet Spot'
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-4">
      {/* Visual Bar Chart */}
      <div className="flex h-8 rounded-lg overflow-hidden">
        {zones.map((zone, index) => {
          const percentage = totalSeconds > 0 ? (zone.secs / totalSeconds) * 100 : 0;
          if (percentage === 0) return null;
          
          const zoneId = zone.id || `Z${index + 1}`;
          const color = zoneColors[zoneId] || 'bg-gray-300';
          
          return (
            <div
              key={zoneId}
              className={`${color} flex items-center justify-center text-xs font-semibold text-white`}
              style={{ width: `${percentage}%` }}
              title={`${zoneLabels[zoneId] || zoneId}: ${formatTime(zone.secs)} (${percentage.toFixed(1)}%)`}
            >
              {percentage > 5 && zoneId}
            </div>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {zones.map((zone, index) => {
          const zoneId = zone.id || `Z${index + 1}`;
          const percentage = totalSeconds > 0 ? (zone.secs / totalSeconds) * 100 : 0;
          if (zone.secs === 0) return null;
          
          const color = zoneColors[zoneId] || 'bg-gray-300';
          
          return (
            <div
              key={zoneId}
              className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded ${color}`}></div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {zoneLabels[zoneId] || zoneId}
                </span>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {formatTime(zone.secs)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {percentage.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Time */}
      <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Total Time: {formatTime(totalSeconds)}
      </div>
    </div>
  );
};

export default ZoneAnalysis;
