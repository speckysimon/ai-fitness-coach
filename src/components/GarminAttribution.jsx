import React from 'react';

/**
 * Garmin Attribution Component
 * Displays "Works with Garmin Connect" badge as required by Garmin API Brand Guidelines
 * Reference: https://developer.garmin.com/brand-guidelines/connect/
 */
const GarminAttribution = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <img
        src="https://static.garmincdn.com/com.garmin.connect/content/images/developer/gc-app-tile/mdpi/gc-app-tile_@120.png"
        alt="Works with Garmin Connect"
        className="h-6 w-auto"
        loading="lazy"
      />
      <span className="text-gray-700">Works with Garmin Connect</span>
    </div>
  );
};

export default GarminAttribution;
