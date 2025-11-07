import React from 'react';

/**
 * Zwift Attribution Component
 * Displays Zwift logo with proper trademark attribution
 */
const ZwiftAttribution = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`} title="Zwift® Workouts">
      <div className="flex items-center gap-1">
        <span className="text-xl font-bold text-orange-600">Z</span>
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">®</span>
      </div>
    </div>
  );
};

export default ZwiftAttribution;
