import React from 'react';
import { Zap } from 'lucide-react';

const IntervalSummary = ({ intervals }) => {
  if (!intervals || intervals.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <Zap className="w-4 h-4" />
        <span>Key Intervals</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {intervals.map((interval, index) => {
          // Parse interval string (e.g., "1x 54s 219w" or "2x 5m 250w")
          const match = interval.match(/(\d+)x\s+(\d+[smh])\s+(\d+)w?/i);
          
          if (!match) {
            // Fallback for unparseable format
            return (
              <div
                key={index}
                className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {interval}
                </p>
              </div>
            );
          }

          const [, reps, duration, power] = match;

          return (
            <div
              key={index}
              className="p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">
                  Interval {index + 1}
                </span>
                <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 text-xs font-bold rounded">
                  {reps}x
                </span>
              </div>
              
              <div className="flex items-baseline gap-3">
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {duration}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Duration</div>
                </div>
                
                <div className="text-gray-300 dark:text-gray-600 text-2xl">@</div>
                
                <div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {power}W
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Power</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntervalSummary;
