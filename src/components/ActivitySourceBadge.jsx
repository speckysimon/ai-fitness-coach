import React from 'react';
import { getActivitySourceInfo } from '../lib/activityMerger';

/**
 * Activity Source Badge Component
 * Displays a colored badge indicating the source of an activity
 * (Strava, Intervals.icu, or Manual)
 */
const ActivitySourceBadge = ({ activity, size = 'sm', showIcon = false }) => {
  if (!activity) return null;

  const sourceInfo = getActivitySourceInfo(activity);
  
  // Size variants
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${sourceInfo.bgColor} ${sourceInfo.textColor} ${sourceInfo.borderColor} border`}
      title={`Source: ${sourceInfo.name}`}
    >
      {showIcon && (
        <span className="w-2 h-2 rounded-full bg-current opacity-75"></span>
      )}
      {sourceInfo.name}
    </span>
  );
};

export default ActivitySourceBadge;
