/**
 * Timezone utility for consistent date/time handling across the app
 */

// Get user's timezone from settings or browser
export const getUserTimezone = () => {
  const stored = localStorage.getItem('user_timezone');
  if (stored) {
    return stored;
  }
  // Auto-detect from browser
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Save user's timezone preference
export const setUserTimezone = (timezone) => {
  localStorage.setItem('user_timezone', timezone);
};

// Get current date/time in user's timezone
export const getCurrentDateTime = () => {
  const timezone = getUserTimezone();
  const now = new Date();
  
  return {
    date: now.toLocaleDateString('en-US', { 
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }),
    time: now.toLocaleTimeString('en-US', { 
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }),
    timezone: timezone,
    isoDate: now.toLocaleDateString('en-CA', { timeZone: timezone }), // YYYY-MM-DD format
    timestamp: now.toISOString()
  };
};

// Format date in user's timezone
export const formatDateInTimezone = (date, format = 'full') => {
  const timezone = getUserTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const formats = {
    full: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone
    },
    date: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: timezone
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      hour12: false
    },
    iso: null // Will use toLocaleDateString with 'en-CA'
  };
  
  if (format === 'iso') {
    return dateObj.toLocaleDateString('en-CA', { timeZone: timezone });
  }
  
  return dateObj.toLocaleString('en-US', formats[format] || formats.full);
};

// Get AI context string with current date/time
export const getAIDateTimeContext = () => {
  const dt = getCurrentDateTime();
  return `Current Date/Time: ${dt.date} at ${dt.time} (${dt.timezone})
ISO Date: ${dt.isoDate}`;
};

// Parse relative dates like "today", "yesterday", "tomorrow"
export const parseRelativeDate = (relativeDate) => {
  const timezone = getUserTimezone();
  const now = new Date();
  
  // Get today's date at midnight in user's timezone
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: timezone });
  const today = new Date(todayStr + 'T00:00:00');
  
  const relative = relativeDate.toLowerCase().trim();
  
  switch (relative) {
    case 'today':
      return today;
    case 'yesterday':
      return new Date(today.getTime() - 24 * 60 * 60 * 1000);
    case 'tomorrow':
      return new Date(today.getTime() + 24 * 60 * 60 * 1000);
    default:
      // Try to parse as date string
      return new Date(relativeDate);
  }
};

// Get list of common timezones for settings dropdown
export const getCommonTimezones = () => {
  return [
    { value: 'auto', label: 'Auto-detect (Browser)' },
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    { value: 'Europe/Rome', label: 'Rome (CET/CEST)' },
    { value: 'Europe/Amsterdam', label: 'Amsterdam (CET/CEST)' },
    { value: 'Europe/Brussels', label: 'Brussels (CET/CEST)' },
    { value: 'Europe/Zurich', label: 'Zurich (CET/CEST)' },
    { value: 'America/New_York', label: 'New York (EST/EDT)' },
    { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
    { value: 'America/Denver', label: 'Denver (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
    { value: 'America/Toronto', label: 'Toronto (EST/EDT)' },
    { value: 'America/Vancouver', label: 'Vancouver (PST/PDT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEDT/AEST)' },
    { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
  ];
};
