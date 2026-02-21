import React, { useState } from 'react';
import { Info, X, AlertCircle } from 'lucide-react';

/**
 * Styled tooltip component for metric cards
 * Provides detailed explanations for FTP, FTHR, W/kg, and BMI
 * Includes reason-code mapping and manual override behavior
 */

// Reason code to user-friendly message mapping
const REASON_CODE_MESSAGES = {
  // FTP reason codes
  NO_POWER_ACTIVITIES_IN_WINDOW: 'No rides with power data in the last 42 days.',
  NO_POWER_EFFORTS_20_60: 'No steady 20–60 min efforts found.',
  NO_STEADY_EFFORTS: 'Efforts were too variable to treat as steady.',
  UNKNOWN_CV_ON_TOP_EFFORTS: 'Steadiness couldn\'t be verified for key efforts (lower confidence).',
  SINGLE_EFFORT_ONLY: 'Only one qualifying effort found (lower confidence).',
  NO_QUALIFYING_EFFORTS: 'No qualifying efforts found in the analysis window.',
  NO_EFFORT_40_PLUS: 'No effort over 40 minutes found.',
  
  // FTHR reason codes
  NO_ACTIVITIES: 'No activities found in the analysis window.',
  NO_HR_ACTIVITIES_IN_WINDOW: 'No HR data in the last 42 days.',
  NO_HR_EFFORTS_30_60: 'No steady 30–60 min efforts found.',
  NO_DRIFT_DATA: 'We couldn\'t confirm HR steadiness for the efforts found.',
  NO_HR_EFFORT_40_PLUS: 'No steady effort ≥40 min (required to establish FTHR).',
  NO_EFFORT_50_PLUS: 'No effort over 50 minutes found.',
};

// One-line action tips per metric type
const ACTION_TIPS = {
  ftp: 'Try a steady 40–60 min effort.',
  fthr: 'Try a steady 40–60 min hard effort with HR recorded.',
};

const TOOLTIP_CONTENT = {
  ftp: {
    title: 'FTP (Functional Threshold Power)',
    body: 'Your best estimate of sustainable power for ~1 hour, used to set training zones and pacing.',
    howWeCalculate: [
      'Looks at the last 42 days of rides with power',
      'Uses your best steady 20–60 min efforts',
      'Converts each effort to an FTP estimate using duration rules',
      'Final FTP is the median of your top 3 estimates',
      'Confidence improves with more steady efforts and longer durations',
    ],
  },
  fthr: {
    title: 'FTHR (Functional Threshold Heart Rate)',
    body: 'A steady hard-effort heart rate benchmark used to build HR training zones.',
    howWeCalculate: [
      'Looks at the last 42 days of rides with HR',
      'Uses steady 30–60 min efforts only',
      'Requires at least one ≥40 min steady effort',
      'No multipliers or guesses — we only use valid steady data',
      'Final FTHR is the median of your top 3 steady efforts',
    ],
  },
  wkg: {
    title: 'Power-to-Weight (W/kg)',
    body: 'Your FTP divided by your current weight. Useful for climbing comparisons.',
    formula: 'W/kg = FTP ÷ weight (kg)',
    note: 'Changes if either FTP or weight changes.',
  },
  bmi: {
    title: 'BMI (Body Mass Index)',
    body: 'A general body-mass indicator. Not a performance metric on its own.',
    formula: 'BMI = weight ÷ (height in metres)²',
  },
};

export function MetricTooltip({ 
  type, 
  windowDays = 42, 
  updatedAt, 
  confidence,
  confidenceLevel,
  reasonCodes = [],
  className = '',
  iconClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const content = TOOLTIP_CONTENT[type];
  
  if (!content) return null;

  const isManualOverride = confidenceLevel === 'manual';
  const hasReasonCodes = reasonCodes && reasonCodes.length > 0 && !isManualOverride;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${iconClassName}`}
        aria-label={`Learn more about ${content.title}`}
      >
        <Info className="w-3.5 h-3.5 opacity-60 hover:opacity-100 transition-opacity" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Tooltip Panel */}
          <div className="absolute z-50 top-full left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                {content.title}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* Manual override notice */}
              {isManualOverride && (
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    ✓ Manual override active
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Auto-estimation will resume if manual override is cleared.
                  </p>
                </div>
              )}

              {/* Main description */}
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {content.body}
              </p>

              {/* How we calculate (for FTP/FTHR) - hide if manual override */}
              {content.howWeCalculate && !isManualOverride && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    How we calculate it
                  </h4>
                  <ul className="space-y-1.5">
                    {content.howWeCalculate.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 mt-1.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formula (for W/kg, BMI) */}
              {content.formula && (
                <div className="p-2.5 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Formula</p>
                  <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                    {content.formula}
                  </code>
                </div>
              )}

              {/* Note (for W/kg) */}
              {content.note && (
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  {content.note}
                </p>
              )}

              {/* Why? section - reason codes (for FTP/FTHR when not manual) */}
              {hasReasonCodes && (
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Why?
                    </p>
                  </div>
                  <ul className="space-y-1">
                    {reasonCodes.map((code, idx) => (
                      <li key={idx} className="text-xs text-amber-600 dark:text-amber-300">
                        • {REASON_CODE_MESSAGES[code] || code}
                      </li>
                    ))}
                  </ul>
                  {ACTION_TIPS[type] && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 font-medium border-t border-amber-200 dark:border-amber-700 pt-2">
                      💡 {ACTION_TIPS[type]}
                    </p>
                  )}
                </div>
              )}

              {/* Details line (for FTP/FTHR) */}
              {(type === 'ftp' || type === 'fthr') && (updatedAt || confidence !== undefined) && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                    Window: {windowDays} days
                    {updatedAt && ` • Updated: ${formatDate(updatedAt)}`}
                    {confidence !== undefined && ` • Confidence: ${confidence}%`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MetricTooltip;
