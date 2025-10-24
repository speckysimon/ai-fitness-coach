import React from 'react';

/**
 * Zwift Attribution Component
 * Displays Zwift logo with proper trademark attribution
 */
const ZwiftAttribution = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold text-orange-600">Z</span>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Zwift®</span>
      </div>
      <span className="text-xs text-muted-foreground">Workouts</span>
    </div>
  );
};

export default ZwiftAttribution;
