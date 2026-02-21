/**
 * Activity Utilities
 * Shared helper functions for activity display and styling
 */

import React from 'react';
import { Home, Mountain, Activity, Trophy } from 'lucide-react';

/**
 * Get the appropriate icon for an activity
 * @param {Object} activity - Activity object
 * @returns {JSX.Element} Icon component
 */
export function getActivityIcon(activity) {
  const isZwift = activity.name?.toLowerCase().includes('zwift');
  const isIndoor = activity.trainer || activity.type === 'VirtualRide';

  // Zwift activities get special treatment
  if (isZwift) {
    return (
      <div className="relative">
        <div className="text-orange-600 font-bold text-lg">Z</div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"></div>
      </div>
    );
  }

  // Indoor activities
  if (isIndoor) {
    return <Home className="w-5 h-5 text-indigo-600" />;
  }

  // Outdoor activities by type
  switch (activity.type) {
    case 'Ride':
      return <Mountain className="w-5 h-5 text-[var(--color-primary)]" />;
    case 'Run':
      return <Activity className="w-5 h-5 text-green-600" />;
    case 'Swim':
      return <div className="text-cyan-600 text-xl">🏊</div>;
    case 'Workout':
      return <div className="text-red-600 text-xl">💪</div>;
    default:
      return <Activity className="w-5 h-5 text-gray-600" />;
  }
}

/**
 * Get color classes based on TSS (Training Stress Score)
 * Traffic light system: green (easy) -> yellow (moderate) -> orange (hard) -> red (very hard)
 * @param {number} tss - Training Stress Score
 * @returns {string} Tailwind CSS classes for border and background
 */
export function getLoadColor(tss) {
  if (tss >= 150) return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
  if (tss >= 100) return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10';
  if (tss >= 50) return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
  if (tss > 0) return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
  return 'border-l-gray-300 bg-white dark:bg-gray-800';
}

/**
 * Get background color for activity icon container
 * @param {boolean} isRace - Whether activity is tagged as a race
 * @returns {string} Tailwind CSS classes for background
 */
export function getIconBackground(isRace) {
  if (isRace) {
    return 'bg-yellow-100 dark:bg-yellow-900/40';
  }
  return 'bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary-dark)]/20';
}

/**
 * Get card background color classes
 * @param {boolean} isRace - Whether activity is tagged as a race
 * @returns {string} Tailwind CSS classes for card background
 */
export function getCardBackground(isRace) {
  if (isRace) {
    return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
  }
  return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
}
