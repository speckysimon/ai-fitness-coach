import React from 'react';

/**
 * Strava Attribution Component
 * Displays "Powered by Strava" badge as required by Strava API Agreement
 */
const StravaAttribution = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 text-sm text-gray-600 ${className}`}>
      <svg 
        className="h-5 w-5" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" 
          fill="#FC4C02"
        />
      </svg>
      <span className="text-gray-700">Powered by Strava</span>
    </div>
  );
};

export default StravaAttribution;
