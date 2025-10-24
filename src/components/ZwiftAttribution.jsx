import React from 'react';

/**
 * Zwift Attribution Component
 * Displays Zwift logo with proper trademark attribution
 */
const ZwiftAttribution = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <img
        src="https://static.zwift.com/images/zwift-logo-horizontal-color-on-white.png"
        alt="Zwift®"
        className="h-5 w-auto"
        loading="lazy"
      />
      <span className="text-xs text-muted-foreground">Workout Recommendations</span>
    </div>
  );
};

export default ZwiftAttribution;
