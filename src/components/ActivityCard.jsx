import React from 'react';
import { Activity, Clock, TrendingUp, Mountain } from 'lucide-react';
import { formatDuration, formatDistance, formatDate } from '../lib/utils';

const ActivityCard = ({ activity }) => {
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

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
          {getActivityIcon(activity.type)}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{activity.name}</h4>
          <p className="text-sm text-gray-500">{formatDate(activity.date)}</p>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm text-gray-600">
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="font-medium">{formatDuration(activity.duration)}</span>
          </div>
          <div className="text-xs text-gray-500">Duration</div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">{formatDistance(activity.distance)}</span>
          </div>
          <div className="text-xs text-gray-500">Distance</div>
        </div>
        {activity.elevation > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Mountain className="w-3 h-3" />
              <span className="font-medium">{Math.round(activity.elevation)}m</span>
            </div>
            <div className="text-xs text-gray-500">Elevation</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;
