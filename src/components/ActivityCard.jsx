/**
 * ActivityCard Component
 * Reusable activity card with consistent styling and responsive breakpoints
 * Used across Dashboard, All Activities, and other pages
 */

import React from 'react';
import { Trophy, Brain, Edit2, Trash2 } from 'lucide-react';
import { formatDuration, formatDistance } from '../lib/utils';
import { getActivityIcon, getLoadColor, getIconBackground, getCardBackground } from '../lib/activityUtils.jsx';
import ActivitySourceBadge from './ActivitySourceBadge';

/**
 * ActivityCard Component
 * @param {Object} props
 * @param {Object} props.activity - Activity data
 * @param {boolean} props.isRace - Whether activity is tagged as race
 * @param {Function} props.onClick - Handler for card click
 * @param {Function} props.onTagRace - Handler for race tag button
 * @param {Function} props.onAICoach - Handler for AI coach button
 * @param {Function} props.onEdit - Handler for edit button
 * @param {Function} props.onDelete - Handler for delete button
 * @param {boolean} props.showActions - Whether to show action buttons (default: true)
 */
const ActivityCard = ({
  activity,
  isRace = false,
  onClick,
  onTagRace,
  onAICoach,
  onEdit,
  onDelete,
  showActions = true
}) => {
  return (
    <div
      className={`p-3 sm:p-4 border rounded-lg hover:shadow-md transition-all border-l-4 ${getLoadColor(activity.tss)} ${getCardBackground(isRace)}`}
    >
      {/* Responsive layout: Stack on mobile/tablet (< lg), horizontal on desktop (>= lg) */}
      <div className="lg:flex lg:items-center lg:justify-between lg:gap-4">
        {/* Left side: Icon, Title, Actions, Metrics */}
        <div className="flex-1">
          {/* Icon and Title */}
          <div 
            className="flex items-start gap-3 sm:gap-4 mb-2 lg:mb-0 cursor-pointer" 
            onClick={onClick}
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBackground(isRace)}`}>
              {isRace ? (
                <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              ) : (
                getActivityIcon(activity)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate max-w-[280px] sm:max-w-[400px] lg:max-w-[500px]">
                  {activity.name}
                </h4>
                {isRace && (
                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded flex-shrink-0">
                    RACE
                  </span>
                )}
                <ActivitySourceBadge activity={activity} size="xs" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(activity.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          
          {/* Action buttons - below title on mobile, hidden on desktop */}
          {showActions && (
            <div className="flex items-center gap-1 sm:gap-2 pl-[52px] sm:pl-[64px] mb-2 lg:hidden">
              {onTagRace && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagRace(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Tag as race"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              )}
              {onAICoach && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAICoach(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Analyze with AI Coach"
                >
                  <Brain className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/10 dark:hover:bg-[var(--color-primary-dark)]/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Edit activity"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Delete activity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          
          {/* Metrics - below on mobile, hidden on desktop */}
          <div 
            className="flex items-center gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm text-gray-600 dark:text-gray-400 pl-[52px] sm:pl-[64px] lg:hidden cursor-pointer" 
            onClick={onClick}
          >
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {formatDuration(activity.duration)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {formatDistance(activity.distance)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
            </div>
            {activity.elevation > 0 && (
              <div className="text-left">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {Math.round(activity.elevation)}m
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Elevation</div>
              </div>
            )}
            {activity.tss > 0 && (
              <div className="text-left">
                <div className="font-medium text-sm text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">
                  {activity.tss}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">TSS</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right side: Metrics and Actions - desktop only (>= lg) */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Metrics */}
          <div 
            className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 cursor-pointer" 
            onClick={onClick}
          >
            <div className="text-right">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {formatDuration(activity.duration)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {formatDistance(activity.distance)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Distance</div>
            </div>
            {activity.elevation > 0 && (
              <div className="text-right">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                  {Math.round(activity.elevation)}m
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Elevation</div>
              </div>
            )}
            {activity.tss > 0 && (
              <div className="text-right">
                <div className="font-medium text-sm text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">
                  {activity.tss}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">TSS</div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          {showActions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {onTagRace && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagRace(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Tag as race"
                >
                  <Trophy className="w-4 h-4" />
                </button>
              )}
              {onAICoach && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAICoach(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Analyze with AI Coach"
                >
                  <Brain className="w-4 h-4" />
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary)]/10 dark:hover:bg-[var(--color-primary-dark)]/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Edit activity"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity);
                  }}
                  className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                  title="Delete activity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
